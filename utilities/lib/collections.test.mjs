import { expect, test } from 'vitest';

import {
  characterStub,
  contentPath,
  DIRECTORIES,
  entityStub,
  nextOrder,
  readingStub,
  WIKI_KINDS,
} from './collections.mjs';
import { contentFile } from './yaml.mjs';

test('each collection has the directory the site actually reads', () => {
  expect(DIRECTORIES.titles).toBe('src/content/titles');
  expect(DIRECTORIES.episodes).toBe('src/content/episodes');
  expect(DIRECTORIES.entities).toBe('src/content/entities');
  expect(DIRECTORIES.characters).toBe('src/content/characters');
  expect(DIRECTORIES.reading).toBe('src/content/reading');
});

test('a path is the directory plus the id, which is the entry key', () => {
  expect(contentPath('titles', 'iron-man')).toBe('src/content/titles/iron-man.md');
  expect(contentPath('episodes', 'wandavision-s01e01')).toBe(
    'src/content/episodes/wandavision-s01e01.md',
  );
});

test('refuses an id that is not a slug, rather than writing outside the tree', () => {
  /* The id comes from a fetched name, so this is the boundary where a bad one
     has to stop — a traversal or a space would put a file somewhere unread. */
  expect(() => contentPath('titles', '../../etc/passwd')).toThrow(/lowercase slug/);
  expect(() => contentPath('titles', 'Iron Man')).toThrow(/lowercase slug/);
  expect(() => contentPath('titles', '')).toThrow(/lowercase slug/);
  expect(() => contentPath('nope', 'iron-man')).toThrow(/Unknown collection/);
});

test('every wiki kind maps to a real collection', () => {
  for (const [kind, target] of Object.entries(WIKI_KINDS)) {
    expect(DIRECTORIES[target.collection], `${kind} → ${target.collection}`).toBeDefined();
  }
  expect(WIKI_KINDS.object.collection).toBe('entities');
  expect(WIKI_KINDS.character.collection).toBe('characters');
  expect(WIKI_KINDS.issue.collection).toBe('reading');
});

test('the five entity kinds are exactly the ones the schema enumerates', () => {
  const entityKinds = Object.values(WIKI_KINDS)
    .filter((target) => target.entityKind)
    .map((target) => target.entityKind);
  expect(entityKinds.sort()).toEqual([
    'event',
    'location',
    'object',
    'organisation',
    'reality',
  ]);
});

test('a new entry goes at the end of the chronology, spaced as the seed is', () => {
  expect(nextOrder([100, 1000, 1600])).toBe(1700);
  expect(nextOrder([])).toBe(100);
  expect(nextOrder([3010, 100])).toBe(3110);
});

test('a malformed order in the content does not poison the next one', () => {
  expect(nextOrder([100, Number.NaN, 200])).toBe(300);
});

test('an entity stub carries a name and nothing invented', () => {
  const stub = entityStub({ kind: 'object', name: 'The Tesseract', source: 'https://x/y' });
  expect(stub.data).toMatchObject({ kind: 'object', name: 'The Tesseract', appearances: [] });
  expect(stub.data.summary).toMatch(/^TODO/);
  /* The source is a link to read, never a quotation. */
  expect(stub.body).toContain('https://x/y');
  expect(stub.body).toContain('not to copy from');
});

test('an issue stub has the fields the union requires, marked as unfilled', () => {
  const stub = readingStub({ kind: 'issue', name: 'Iron Man Is Born!' });
  expect(stub.data).toMatchObject({ kind: 'issue', series: 'TODO', issueNumber: 'TODO' });
  /* A cover date is a month; the placeholder is deliberately invalid so the
     build refuses it rather than shipping a plausible wrong one. */
  expect(stub.data.published).toBe('TODO-MM');
});

test('a collection stub says what it collects; a book has neither field', () => {
  expect(readingStub({ kind: 'collection', name: 'X' }).data).toHaveProperty('collects');
  const book = readingStub({ kind: 'book', name: 'X' }).data;
  expect(book).not.toHaveProperty('issueNumber');
  expect(book).not.toHaveProperty('collects');
});

test('every stub writes to valid frontmatter', () => {
  /* The stubs and the emitter are the two halves of a generated file; this is
     the seam where a shape one of them does not expect would surface. */
  const stubs = [
    entityStub({ kind: 'location', name: 'Westview' }),
    characterStub({ name: 'Nick Fury', source: 'https://x/y' }),
    readingStub({ kind: 'issue', name: 'A' }),
    readingStub({ kind: 'collection', name: 'B' }),
    readingStub({ kind: 'book', name: 'C' }),
  ];
  for (const stub of stubs) {
    expect(() => contentFile(stub.data, stub.body, stub.comments)).not.toThrow();
  }
});

test('no stub carries prose that did not come from this repository', () => {
  const stub = characterStub({ name: 'Nick Fury', source: 'https://marvel.example/wiki/X' });
  const file = contentFile(stub.data, stub.body, stub.comments);
  expect(file).toContain('in your own words');
  expect(file).toContain('IP rules forbid');
});
