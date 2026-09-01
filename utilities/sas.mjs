#!/usr/bin/env node
/*
 * sas — the authoring utility.
 *
 * A local development tool. It is not part of the site, is never deployed, and
 * nothing in `src/` imports it. Its whole job is to remove the tedium between
 * "I want to add Thor" and "I am writing about Thor": the slug, the filename,
 * the directory, the strict schema, and the pile of reference ids.
 *
 * The division of labour, which is also why this file is thin: everything in
 * ./lib is pure and unit-tested; this file does the fetching, the asking and the
 * writing, and holds no logic worth testing that is not already covered there.
 *
 * It fetches facts and never prose. See ./README.md.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  characterStub,
  contentPath,
  entityStub,
  nextOrder,
  ORDER_TODO,
  PEOPLE_FILE,
  readingStub,
  WIKI_KINDS,
} from './lib/collections.mjs';
import { displayName, pageInfo, pageUrl, searchResults, searchUrl } from './lib/fandom.mjs';
import { episodeId, slugify } from './lib/slug.mjs';
import {
  castRows,
  directorIds,
  episodeDirectorIds,
  episodeFrontmatter,
  filmFrontmatter,
  mergePeople,
  pickOverview,
  seriesFrontmatter,
  TODO_BODY,
  url,
} from './lib/tmdb.mjs';
import { contentFile } from './lib/yaml.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* --- Terminal ------------------------------------------------------------- */

/*
 * Colour, switched off when the output is not a terminal — piping this into a
 * file or a pager should not fill it with escape codes. NO_COLOR is honoured
 * because it is the convention, and this is a tool people pipe.
 */
const colour = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code) => (text) =>
  colour ? `\u001b[${code}m${text}\u001b[0m` : String(text);

const style = {
  dim: paint(2),
  bold: paint(1),
  cyan: paint(36),
  amber: paint(33),
  red: paint(31),
};

const say = (message = '') => console.log(message);
const warn = (message) => console.log(style.amber(`! ${message}`));

function die(message) {
  console.error(style.red(`✗ ${message}`));
  process.exit(1);
}

/** Ask the user to pick one of a list, or nothing. */
async function choose(prompt, options, render) {
  if (options.length === 0) return undefined;

  say();
  options.forEach((option, index) => {
    say(`  ${style.bold(String(index + 1).padStart(2))}  ${render(option)}`);
  });
  say();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${prompt} [1-${options.length}, or blank to cancel] `)).trim();
    if (!answer) return undefined;
    const index = Number(answer) - 1;
    return Number.isInteger(index) && index >= 0 && index < options.length
      ? options[index]
      : undefined;
  } finally {
    rl.close();
  }
}

/* --- Repository ----------------------------------------------------------- */

const read = (relative) => readFileSync(join(ROOT, relative), 'utf8');
const exists = (relative) => existsSync(join(ROOT, relative));

/** Frontmatter values already in a collection, for id and order collisions. */
function readCollection(directory) {
  const path = join(ROOT, directory);
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((name) => name.endsWith('.md'))
    .map((name) => ({ id: name.replace(/\.md$/, ''), raw: readFileSync(join(path, name), 'utf8') }));
}

function readPeople() {
  return exists(PEOPLE_FILE) ? JSON.parse(read(PEOPLE_FILE)) : [];
}

function writePeople(people, options) {
  const body = `[\n${people
    .map((person) => `  { "id": ${JSON.stringify(person.id)}, "name": ${JSON.stringify(person.name)} }`)
    .join(',\n')}\n]\n`;
  writeFile(PEOPLE_FILE, body, options);
}

function writeFile(relative, contents, { dryRun, force }) {
  const path = join(ROOT, relative);

  if (existsSync(path) && !force && relative !== PEOPLE_FILE) {
    warn(`${relative} exists — skipped. Use --force to overwrite.`);
    return false;
  }

  if (dryRun) {
    say(style.dim(`  would write ${relative}`));
    return true;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, 'utf8');
  say(`  ${style.cyan('wrote')} ${relative}`);
  return true;
}

/* --- TMDB ----------------------------------------------------------------- */

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN;

async function tmdb(path, params) {
  if (!TMDB_KEY && !TMDB_TOKEN) {
    die(
      'No TMDB credentials. Set TMDB_API_KEY (a v3 key) or TMDB_ACCESS_TOKEN (a v4 read\n' +
        '  token) — see utilities/README.md.',
    );
  }

  const response = await fetch(url(path, params, TMDB_KEY), {
    headers: TMDB_TOKEN ? { Authorization: `Bearer ${TMDB_TOKEN}` } : {},
  });

  if (!response.ok) {
    die(`TMDB ${path} returned ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/** Print the overview for the human to read. Deliberately not written to disk. */
function showOverview(details) {
  const overview = pickOverview(details);
  if (!overview) return;
  say();
  say(style.dim('  Reference only — read it, then write your own. Do not paste:'));
  for (const line of wrap(overview, 74)) say(style.dim(`    ${line}`));
}

function wrap(text, width) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(line.trim());
      line = word;
    } else {
      line += ` ${word}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/* --- Commands ------------------------------------------------------------- */

async function commandTitle(term, options) {
  const tv = options.tv === true;
  const search = await tmdb(tv ? '/search/tv' : '/search/movie', { query: term });
  const results = (search.results ?? []).slice(0, 8);

  if (results.length === 0) die(`Nothing on TMDB for "${term}".`);

  const chosen = await choose(
    'Which one?',
    results,
    (r) =>
      `${r.title ?? r.name} ${style.dim(`(${(r.release_date ?? r.first_air_date ?? '????').slice(0, 4)}) · tmdb:${r.id}`)}`,
  );
  if (!chosen) return say('Cancelled.');

  return tv ? await writeSeries(chosen.id, options) : await writeFilm(chosen.id, options);
}

async function writeFilm(tmdbId, options) {
  const details = await tmdb(`/movie/${tmdbId}`, {
    append_to_response: 'credits,release_dates',
  });

  const id = slugify(details.title);
  const kind = options.short === true ? 'short' : 'film';

  const people = readPeople();
  const characters = readCollection('src/content/characters').map((entry) => ({
    id: entry.id,
    name: entry.id,
  }));

  const cast = castRows(details.credits?.cast ?? [], { people, characters }, options.castLimit);
  const directors = directorIds(details);

  const orders = readCollection('src/content/titles')
    .concat(readCollection('src/content/episodes'))
    .map((entry) => Number(entry.raw.match(/^\s*order:\s*(-?\d+(?:\.\d+)?)/m)?.[1]))
    .filter(Number.isFinite);

  const frontmatter = filmFrontmatter({
    details,
    kind,
    accent: options.accent,
    order: nextOrder(orders),
    cast,
    directors,
  });

  say();
  say(style.bold(`${details.title} — ${kind}`));
  writeFile(contentPath('titles', id), contentFile(frontmatter, TODO_BODY, { timeline: ORDER_TODO }), options);

  await writeSupporting({ details, cast, directors, people, options });
  showOverview(details);
  finish(options);
}

async function writeSeries(tmdbId, options) {
  const details = await tmdb(`/tv/${tmdbId}`, {
    append_to_response: 'aggregate_credits,content_ratings',
  });

  const id = slugify(details.name);
  const people = readPeople();
  const characters = readCollection('src/content/characters').map((entry) => ({
    id: entry.id,
    name: entry.id,
  }));

  /* Aggregate credits nest the character inside a roles array; flatten it into
     the shape castRows expects. */
  const flatCast = (details.aggregate_credits?.cast ?? []).map((member) => ({
    name: member.name,
    character: member.roles?.[0]?.character ?? '',
    order: member.order,
  }));

  const cast = castRows(flatCast, { people, characters }, options.castLimit);
  const creators = (details.created_by ?? []).map((person) => slugify(person.name));

  say();
  say(style.bold(`${details.name} — series`));
  writeFile(
    contentPath('titles', id),
    contentFile(seriesFrontmatter({ details, accent: options.accent, cast, creators }), TODO_BODY),
    options,
  );

  await writeSupporting({
    details: { credits: { crew: (details.created_by ?? []).map((p) => ({ ...p, job: 'Director' })) } },
    cast,
    directors: creators,
    people,
    options,
    crewNames: (details.created_by ?? []).map((person) => person.name),
  });

  showOverview(details);
  say();
  say(
    style.dim(
      `  Next: node utilities/sas.mjs episodes --series ${id} --tmdb ${tmdbId} --season 1`,
    ),
  );
  finish(options);
}

/** People and character stubs the title's references need in order to resolve. */
async function writeSupporting({ details, cast, directors, people, options, crewNames }) {
  const castNames = (details.credits?.cast ?? [])
    .slice(0, options.castLimit)
    .map((member) => ({ name: member.name }));

  const crew = crewNames
    ? crewNames.map((name) => ({ name }))
    : (details.credits?.crew ?? [])
        .filter((member) => member.job === 'Director')
        .map((member) => ({ name: member.name }));

  const fetched = [...crew, ...castNames, ...cast.rows.map((row) => ({ name: row.actor }))];
  const named = fetched.filter((person) => person.name && !/^[a-z0-9-]+$/.test(person.name));

  const { people: merged, added } = mergePeople(named, people);
  if (added.length > 0) {
    writePeople(merged, options);
    say(style.dim(`    + ${added.length} people: ${added.map((p) => p.id).join(', ')}`));
  }

  for (const character of cast.newCharacters) {
    const stub = characterStub({ name: character.name });
    writeFile(
      contentPath('characters', character.id),
      contentFile(stub.data, stub.body, stub.comments),
      options,
    );
  }

  const unresolved = directors.filter((id) => !merged.some((person) => person.id === id));
  if (unresolved.length > 0) {
    warn(`Director ids with no person entry: ${unresolved.join(', ')}`);
  }
}

async function commandEpisodes(options) {
  const seriesId = options.series;
  const tmdbId = options.tmdb;
  const season = Number(options.season ?? 1);

  if (!seriesId) die('--series is required: the id of the series file in src/content/titles.');
  if (!tmdbId) die('--tmdb is required: the series id on TMDB.');
  if (!exists(contentPath('titles', seriesId))) {
    die(`No series at ${contentPath('titles', seriesId)} — create it first with \`title --tv\`.`);
  }

  const details = await tmdb(`/tv/${tmdbId}/season/${season}`, {});
  const episodes = details.episodes ?? [];
  if (episodes.length === 0) die(`TMDB has no episodes for season ${season}.`);

  const orders = readCollection('src/content/titles')
    .concat(readCollection('src/content/episodes'))
    .map((entry) => Number(entry.raw.match(/^\s*order:\s*(-?\d+(?:\.\d+)?)/m)?.[1]))
    .filter(Number.isFinite);

  let order = nextOrder(orders);
  const people = readPeople();
  const directorNames = [];

  say();
  say(style.bold(`${seriesId} — season ${season}, ${episodes.length} episodes`));

  for (const episode of episodes) {
    const id = episodeId(seriesId, episode.season_number, episode.episode_number);
    const directors = episodeDirectorIds(episode);
    directorNames.push(
      ...(episode.crew ?? []).filter((m) => m.job === 'Director').map((m) => ({ name: m.name })),
    );

    const frontmatter = episodeFrontmatter({ episode, seriesId, order, directors });
    writeFile(
      contentPath('episodes', id),
      contentFile(frontmatter, TODO_BODY, { timeline: ORDER_TODO }),
      options,
    );
    /* Ten apart, so episodes stay adjacent but a film can still be inserted
       between two of them — which is the whole point of the timeline. */
    order += 10;
  }

  const { people: merged, added } = mergePeople(directorNames, people);
  if (added.length > 0) {
    writePeople(merged, options);
    say(style.dim(`    + ${added.length} people: ${added.map((p) => p.id).join(', ')}`));
  }

  finish(options);
}

async function commandWiki(term, options) {
  const target = WIKI_KINDS[options.kind ?? ''];
  if (!target) {
    die(`--kind must be one of: ${Object.keys(WIKI_KINDS).join(', ')}`);
  }

  const wiki = options.wiki ?? (target.collection === 'reading' ? 'comics' : 'mcu');
  const response = await fetch(searchUrl(wiki, term));
  if (!response.ok) die(`Fandom search returned ${response.status}`);

  const results = searchResults(await response.json());
  if (results.length === 0) die(`Nothing on the ${wiki} wiki for "${term}".`);

  const chosen = await choose(
    'Which page?',
    results,
    (r) => `${r.title}\n      ${style.dim(r.snippet.slice(0, 90))}`,
  );
  if (!chosen) return say('Cancelled.');

  const infoResponse = await fetch(pageUrl(wiki, chosen.title));
  const info = infoResponse.ok ? pageInfo(await infoResponse.json()) : undefined;

  const name = displayName(chosen.title);
  const id = slugify(name);
  const source = info?.url;

  const stub =
    target.collection === 'characters'
      ? characterStub({ name, source })
      : target.collection === 'reading'
        ? readingStub({ kind: target.readingKind, name, source })
        : entityStub({ kind: target.entityKind, name, source });

  say();
  say(style.bold(`${name} — ${options.kind}`));
  writeFile(
    contentPath(target.collection, id),
    contentFile(stub.data, stub.body, stub.comments),
    options,
  );
  if (source) say(style.dim(`  read: ${source}`));
  finish(options);
}

/** Find the placeholders this tool leaves behind, before they reach a commit. */
function commandCheck() {
  const found = [];

  for (const directory of Object.values({
    titles: 'src/content/titles',
    episodes: 'src/content/episodes',
    entities: 'src/content/entities',
    characters: 'src/content/characters',
    reading: 'src/content/reading',
  })) {
    const path = join(ROOT, directory);
    if (!existsSync(path)) continue;
    for (const name of readdirSync(path).filter((n) => n.endsWith('.md'))) {
      const raw = readFileSync(join(path, name), 'utf8');
      const lines = raw
        .split('\n')
        .map((line, index) => ({ line: line.trim(), number: index + 1 }))
        .filter(({ line }) => line.includes('TODO'));
      if (lines.length > 0) found.push({ file: `${directory}/${name}`, lines });
    }
  }

  if (found.length === 0) {
    say(style.cyan('✓ No placeholders left.'));
    return;
  }

  for (const entry of found) {
    say(style.bold(entry.file));
    for (const { line, number } of entry.lines) {
      say(`  ${style.dim(String(number).padStart(4))}  ${line.slice(0, 96)}`);
    }
  }
  say();
  say(style.amber(`${found.length} file(s) still carry a placeholder.`));
  process.exitCode = 1;
}

/* --- Entry point ---------------------------------------------------------- */

const USAGE = `
${style.bold('sas')} — pull facts from TMDB and Fandom into correctly-shaped content files

  ${style.cyan('node utilities/sas.mjs title')} "iron man"            search TMDB films
  ${style.cyan('node utilities/sas.mjs title')} "wandavision" --tv    search TMDB series
  ${style.cyan('node utilities/sas.mjs episodes')} --series wandavision --tmdb 85271 --season 1
  ${style.cyan('node utilities/sas.mjs wiki')} "Tesseract" --kind object
  ${style.cyan('node utilities/sas.mjs check')}                       list unfinished placeholders

Options
  --tv                 search television rather than film
  --short              write the film as a short
  --kind <kind>        ${Object.keys(WIKI_KINDS).join(', ')}
  --wiki <mcu|comics>  which Fandom wiki to search
  --accent <a>         magenta | cyan | amber   (default magenta)
  --cast-limit <n>     how many billed cast to take   (default 8)
  --dry-run            print what would be written, write nothing
  --force              overwrite an existing file

It writes facts. Summaries and bodies are left as placeholders for you to write
in your own words — see utilities/README.md for why that is not negotiable.
`;

function finish(options) {
  say();
  if (options.dryRun) say(style.dim('  Dry run — nothing was written.'));
  else say(style.dim('  Now: fill in the TODOs, then `npm run build` to check the schema.'));
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      tv: { type: 'boolean' },
      short: { type: 'boolean' },
      kind: { type: 'string' },
      wiki: { type: 'string' },
      accent: { type: 'string', default: 'magenta' },
      'cast-limit': { type: 'string', default: '8' },
      series: { type: 'string' },
      tmdb: { type: 'string' },
      season: { type: 'string' },
      'dry-run': { type: 'boolean' },
      force: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });

  const [command, term] = positionals;
  const options = {
    ...values,
    dryRun: values['dry-run'] === true,
    castLimit: Number(values['cast-limit']) || 8,
  };

  if (values.help || !command) return say(USAGE);

  if (!['magenta', 'cyan', 'amber'].includes(options.accent)) {
    die('--accent must be magenta, cyan or amber.');
  }

  switch (command) {
    case 'title':
      if (!term) die('Give something to search for: sas.mjs title "iron man"');
      return commandTitle(term, options);
    case 'episodes':
      return commandEpisodes(options);
    case 'wiki':
      if (!term) die('Give something to search for: sas.mjs wiki "Tesseract" --kind object');
      return commandWiki(term, options);
    case 'check':
      return commandCheck();
    default:
      die(`Unknown command "${command}". Run without arguments for usage.`);
  }
}

main().catch((error) => die(error.stack ?? String(error)));
