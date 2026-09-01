/*
 * Where each kind of entry lives, and what an empty one looks like.
 *
 * One place that knows the directory layout, so the CLI never spells a path by
 * hand and a collection moving is a one-line change here.
 */

import { TODO_BODY, TODO_SUMMARY } from './tmdb.mjs';

/** Directory for each collection, relative to the repository root. */
export const DIRECTORIES = {
  titles: 'src/content/titles',
  episodes: 'src/content/episodes',
  entities: 'src/content/entities',
  characters: 'src/content/characters',
  reading: 'src/content/reading',
};

export const PEOPLE_FILE = 'src/content/people.json';

/**
 * The file an entry belongs in.
 *
 * @param {keyof DIRECTORIES} collection
 * @param {string} id
 */
export function contentPath(collection, id) {
  const directory = DIRECTORIES[collection];
  if (!directory) throw new Error(`Unknown collection: ${collection}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    throw new Error(`Refusing to write "${id}": an id must be a lowercase slug`);
  }
  return `${directory}/${id}.md`;
}

/*
 * Which wiki kinds map to which collection. `wiki --kind object` has to know
 * that objects are entities but characters are their own collection, and that
 * an issue is a reading entry.
 */
export const WIKI_KINDS = {
  object: { collection: 'entities', entityKind: 'object' },
  location: { collection: 'entities', entityKind: 'location' },
  organisation: { collection: 'entities', entityKind: 'organisation' },
  event: { collection: 'entities', entityKind: 'event' },
  reality: { collection: 'entities', entityKind: 'reality' },
  character: { collection: 'characters' },
  issue: { collection: 'reading', readingKind: 'issue' },
  collection: { collection: 'reading', readingKind: 'collection' },
  book: { collection: 'reading', readingKind: 'book' },
};

/**
 * The next timeline position, as a placeholder.
 *
 * The tool cannot know where something belongs in the chronology — that is the
 * editorial judgement the whole site is about. It puts the entry at the end,
 * spaced by the same hundred the seed content uses, and marks it. An entry at
 * the end is obviously unplaced; an entry at a plausible-looking position would
 * be a lie that is easy to miss.
 *
 * @param {number[]} existingOrders
 */
export function nextOrder(existingOrders) {
  const orders = existingOrders.filter((value) => Number.isFinite(value));
  if (orders.length === 0) return 100;
  return Math.max(...orders) + 100;
}

export const ORDER_TODO =
  'TODO: placed at the end. Move it to where it belongs in the chronology, and add `year:`';

/**
 * An entity stub, with only what a wiki page can honestly supply: a name, and a
 * link to read.
 *
 * @param {object} args
 * @param {string} args.kind
 * @param {string} args.name
 * @param {string} [args.source]
 */
export function entityStub({ kind, name, source }) {
  return {
    data: {
      kind,
      name,
      aka: [],
      summary: TODO_SUMMARY,
      appearances: [],
    },
    body: `${TODO_BODY}\n\n${sourceNote(source)}`,
    comments: {
      appearances: 'TODO: add a row per appearance — { unit: { title: some-film }, type: appears }',
    },
  };
}

/** A character stub. Same shape, different collection. */
export function characterStub({ name, source }) {
  return {
    data: { name, aka: [], summary: TODO_SUMMARY, appearances: [] },
    body: `${TODO_BODY}\n\n${sourceNote(source)}`,
    comments: {
      appearances:
        'TODO: only for references a cast list cannot express — a mention in a title they are not in',
    },
  };
}

/**
 * A reading stub.
 *
 * Publication facts are left blank rather than guessed: the utility has no
 * comics API behind it, and a Fandom page title is not a reliable source for an
 * issue number or a cover date. The fields are present so the shape is right and
 * the build tells you what is missing.
 */
export function readingStub({ kind, name, source }) {
  const common = {
    title: name,
    summary: TODO_SUMMARY,
    publisher: undefined,
    published: 'TODO-MM',
    creators: [],
    characters: [],
    official: undefined,
    related: [],
  };

  const shape =
    kind === 'issue'
      ? { kind, ...common, series: 'TODO', issueNumber: 'TODO' }
      : kind === 'collection'
        ? { kind, ...common, collects: 'TODO' }
        : { kind, ...common };

  return {
    data: shape,
    body: `${TODO_BODY}\n\n${sourceNote(source)}`,
    comments: {
      published: "TODO: a month, as 'YYYY-MM' — the build rejects anything else",
      related: 'TODO: at least one — { title: some-film, relationship: introduces }',
    },
  };
}

/**
 * The line in the body that says where to go and read.
 *
 * A link, not a quotation. Fandom prose is CC-BY-SA user writing and the IP
 * rules forbid copying it, so the tool points at the page and stops.
 */
function sourceNote(source) {
  return source
    ? `<!-- Reference while writing, not to copy from: ${source} -->`
    : '<!-- No source link — search the wiki before writing. -->';
}
