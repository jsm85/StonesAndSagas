/*
 * TMDB: request URLs, and turning a response into content frontmatter.
 *
 * Everything here is pure — it builds URLs and maps parsed JSON. The CLI does
 * the fetching. That split is what lets the mapping be tested without a network
 * or an API key, which matters more than usual here: this was written in an
 * environment where api.themoviedb.org is unreachable, so the fixtures ARE the
 * verification.
 *
 * What this deliberately does not do is copy prose. A TMDB `overview` is studio
 * marketing or a lift from Wikipedia; the IP rules forbid putting either in the
 * repo. Overviews come back from `pickOverview` for the CLI to print as reading
 * material, and never reach a file.
 */

import { episodeId, parseCharacterCredit, slugify, uniqueId } from './slug.mjs';

const BASE = 'https://api.themoviedb.org/3';

/**
 * Build a TMDB URL.
 *
 * v3 keys go in the query string, v4 read tokens go in an Authorization header,
 * and TMDB issues both — so the caller may hold either.
 *
 * @param {string} path
 * @param {Record<string, string | number | undefined>} params
 * @param {string} [apiKey] v3 key, omitted when using a v4 bearer token
 */
export function url(path, params = {}, apiKey) {
  const target = new URL(`${BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) target.searchParams.set(key, String(value));
  }
  if (apiKey) target.searchParams.set('api_key', apiKey);
  return target.toString();
}

/* --- Certificates --------------------------------------------------------- */

/*
 * Only the ratings the schemas actually enumerate. TMDB returns whatever a
 * territory uses — 'R18', 'Uc', '12+', an empty string — and emitting one the
 * enum does not know would produce a file that fails the build. Dropping the
 * certificate entirely is the better failure: the field is optional, and a
 * missing certificate is obvious to fix while a wrong one is not.
 */
const BBFC = new Set(['U', 'PG', '12', '12A', '15', '18']);
const MPA = new Set(['G', 'PG', 'PG-13', 'R', 'NC-17']);
const US_TV = new Set(['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA']);

/**
 * Pick a film certificate from `release_dates`, preferring the BBFC.
 *
 * British first because the site is written in British English for a British
 * owner, and because a BBFC certificate is the one a UK reader recognises.
 *
 * @param {{ results?: { iso_3166_1: string, release_dates?: { certification?: string }[] }[] }} releaseDates
 */
export function certificationFromReleaseDates(releaseDates) {
  const byCountry = (code) =>
    releaseDates?.results?.find((entry) => entry.iso_3166_1 === code)?.release_dates ?? [];

  const gb = byCountry('GB')
    .map((entry) => entry.certification?.trim())
    .find((rating) => rating && BBFC.has(rating));
  if (gb) return { system: 'bbfc', rating: gb };

  const us = byCountry('US')
    .map((entry) => entry.certification?.trim())
    .find((rating) => rating && MPA.has(rating));
  if (us) return { system: 'mpa', rating: us };

  return undefined;
}

/**
 * Pick a television certificate from `content_ratings`.
 *
 * The schema's `us-tv` system is the only one modelled for television, so a GB
 * rating here has nowhere to go and is skipped rather than mislabelled.
 *
 * @param {{ results?: { iso_3166_1: string, rating?: string }[] }} contentRatings
 */
export function certificationFromContentRatings(contentRatings) {
  const us = contentRatings?.results
    ?.filter((entry) => entry.iso_3166_1 === 'US')
    .map((entry) => entry.rating?.trim())
    .find((rating) => rating && US_TV.has(rating));

  return us ? { system: 'us-tv', rating: us } : undefined;
}

/* --- People and cast ------------------------------------------------------ */

/**
 * Resolve a fetched person against the people already in the catalogue.
 *
 * Matching on the slug rather than the name so 'Robert Downey Jr.' and
 * 'Robert Downey Jr' land on the same entry. A genuinely new person gets an id
 * that cannot collide with an existing one.
 *
 * @param {{ name: string }[]} fetched
 * @param {{ id: string, name: string }[]} existing
 * @returns {{ people: { id: string, name: string }[], added: { id: string, name: string }[] }}
 */
export function mergePeople(fetched, existing) {
  const people = [...existing];
  const byId = new Map(people.map((person) => [person.id, person]));
  const added = [];

  for (const { name } of fetched) {
    const slug = slugify(name);
    if (!slug || byId.has(slug)) continue;
    /* A different person who slugs to a taken id gets a suffix rather than
       quietly becoming the first one. */
    const id = uniqueId(slug, byId.keys());
    const person = { id, name };
    people.push(person);
    byId.set(id, person);
    added.push(person);
  }

  people.sort((a, b) => a.id.localeCompare(b.id));
  return { people, added };
}

/**
 * Turn a TMDB cast list into schema cast rows, plus the character stubs needed
 * for the references in them to resolve.
 *
 * @param {{ name: string, character?: string, order?: number }[]} cast
 * @param {{ people: { id: string, name: string }[], characters: { id: string, name: string }[] }} catalogue
 * @param {number} limit
 */
export function castRows(cast, catalogue, limit = 8) {
  const characterIds = new Set(catalogue.characters.map((entry) => entry.id));
  const peopleIds = new Set(catalogue.people.map((entry) => entry.id));
  const rows = [];
  const newCharacters = [];

  const billed = [...cast]
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .slice(0, limit);

  for (const [index, member] of billed.entries()) {
    const credit = parseCharacterCredit(member.character ?? '');
    if (!credit.name) continue;

    const characterId = slugify(credit.name);
    const actorId = slugify(member.name);
    if (!characterId || !actorId) continue;

    if (!characterIds.has(characterId)) {
      characterIds.add(characterId);
      newCharacters.push({ id: characterId, name: credit.name });
    }

    rows.push({
      character: characterId,
      actor: actorId,
      billing: index + 1,
      note: credit.note,
    });
  }

  /* Reported so the CLI can say which actors it is about to invent, rather than
     silently writing a reference that resolves to nothing. */
  const missingActors = rows.map((row) => row.actor).filter((id) => !peopleIds.has(id));

  return { rows, newCharacters, missingActors };
}

/* --- Frontmatter ---------------------------------------------------------- */

/** A day, as the schemas want it: 'YYYY-MM-DD', or undefined if TMDB had none. */
export function day(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : undefined;
}

/**
 * The overview, for the CLI to print as reference material.
 *
 * Never written to a file: see the note at the top of this module.
 *
 * @param {{ overview?: string }} details
 */
export function pickOverview(details) {
  const overview = details.overview?.trim();
  return overview ? overview : undefined;
}

/** The placeholder that makes an unfinished entry impossible to miss. */
export const TODO_SUMMARY =
  'TODO: one or two sentences, in your own words — do not paste from TMDB or a wiki';

/*
 * Shared by every generator, so it stays source-agnostic: a title comes from
 * TMDB and an entity from a wiki, and the rule is the same either way.
 */
export const TODO_BODY = `TODO: write the entry.

Everything in the frontmatter above is a fact, fetched. This part is yours: what
the thing is, why it matters, what it connects to. Write it in your own words —
copying a synopsis from TMDB, Fandom or Wikipedia is exactly what the project's
IP rules forbid.`;

/**
 * A film or short, as frontmatter.
 *
 * @param {object} args
 * @param {any} args.details TMDB movie details, with credits and release_dates
 * @param {'film' | 'short'} args.kind
 * @param {string} args.accent
 * @param {number} args.order the placeholder timeline position
 * @param {{ rows: object[] }} args.cast
 * @param {string[]} args.directors person ids
 */
export function filmFrontmatter({ details, kind, accent, order, cast, directors }) {
  return {
    kind,
    title: details.title,
    summary: TODO_SUMMARY,
    accent,
    releaseDate: day(details.release_date),
    runtimeMinutes: details.runtime || undefined,
    certification: certificationFromReleaseDates(details.release_dates ?? {}),
    directors,
    cast: cast.rows,
    timeline: {
      order,
      /* The in-universe year is an editorial call — the release year is not it,
         and guessing would be worse than leaving it out. */
      setting: undefined,
    },
  };
}

/**
 * A series, as frontmatter. No runtime and no timeline: the union rejects both,
 * because a series is not a point in the chronology.
 */
export function seriesFrontmatter({ details, accent, cast, creators }) {
  return {
    kind: 'series',
    title: details.name,
    summary: TODO_SUMMARY,
    accent,
    firstAired: day(details.first_air_date),
    lastAired: day(details.last_air_date),
    creators,
    certification: certificationFromContentRatings(details.content_ratings ?? {}),
    cast: cast.rows,
  };
}

/**
 * One episode, as frontmatter.
 *
 * @param {object} args
 * @param {any} args.episode a TMDB season's episode entry
 * @param {string} args.seriesId
 * @param {number} args.order
 * @param {string[]} args.directors
 */
export function episodeFrontmatter({ episode, seriesId, order, directors }) {
  return {
    title: episode.name,
    series: seriesId,
    season: episode.season_number,
    episode: episode.episode_number,
    summary: TODO_SUMMARY,
    releaseDate: day(episode.air_date),
    runtimeMinutes: episode.runtime || undefined,
    directors,
    cast: [],
    timeline: { order },
  };
}

/** The directors credited on a TMDB movie, as person ids. */
export function directorIds(details) {
  return (details.credits?.crew ?? [])
    .filter((member) => member.job === 'Director')
    .map((member) => slugify(member.name))
    .filter(Boolean);
}

/** The directors credited on a TMDB episode, as person ids. */
export function episodeDirectorIds(episode) {
  return (episode.crew ?? [])
    .filter((member) => member.job === 'Director')
    .map((member) => slugify(member.name))
    .filter(Boolean);
}

/** The filename stem for an episode of a series already in the catalogue. */
export { episodeId };
