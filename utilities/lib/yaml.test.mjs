import { expect, test } from 'vitest';
/*
 * Parsed with `yaml`, which is the parser Astro itself reads frontmatter with.
 * That is the whole point: the question is not "is this valid YAML" but "does
 * the thing that will actually read this file get back what we put in". It is a
 * declared devDependency so this test rests on a stated assumption rather than
 * on whatever happens to be in the tree.
 */
import { parse } from 'yaml';

import { contentFile, scalar } from './yaml.mjs';

/** Parse the frontmatter back out of a generated file. */
const frontmatter = (file) => parse(file.split('---\n')[1]);

test('a title round-trips through the parser that will read it', () => {
  const data = {
    kind: 'film',
    title: 'Captain America: The First Avenger',
    summary: 'A one-line summary.',
    accent: 'cyan',
    releaseDate: '2011-07-22',
    runtimeMinutes: 124,
    certification: { system: 'bbfc', rating: '12A' },
    directors: ['joe-johnston'],
    cast: [
      { character: 'steve-rogers', actor: 'chris-evans', billing: 1 },
      { character: 'peggy-carter', actor: 'hayley-atwell', billing: 2, note: 'uncredited' },
    ],
    images: { stills: [] },
    timeline: { order: 100, year: 1943, setting: '1943 — occupied Europe' },
  };

  expect(frontmatter(contentFile(data, 'Body.'))).toEqual(data);
});

test('a list of objects indents its continuation keys under the dash', () => {
  /* The bug this pins down: rendering the item one level deeper and then
     indenting it again put `actor` two spaces too far right, which parses as a
     different shape entirely. */
  const file = contentFile({ cast: [{ character: 'a', actor: 'b' }] }, 'x');
  expect(file).toContain('cast:\n  - character: a\n    actor: b\n');
});

test('values YAML would read as something else are quoted', () => {
  /* A BBFC '12' unquoted becomes the number 12 and fails a z.enum of strings. */
  const file = contentFile({ certification: { system: 'bbfc', rating: '12' } }, 'x');
  expect(file).toContain("rating: '12'");
  expect(typeof frontmatter(file).certification.rating).toBe('string');

  /* A cover date is a month, and must not arrive as a Date. */
  const published = contentFile({ published: '1963-03' }, 'x');
  expect(frontmatter(published).published).toBe('1963-03');
  expect(typeof frontmatter(published).published).toBe('string');
});

test('a colon in a title does not break the document', () => {
  const file = contentFile({ title: 'Captain America: The First Avenger' }, 'x');
  expect(frontmatter(file).title).toBe('Captain America: The First Avenger');
});

test('apostrophes survive, doubled as YAML requires', () => {
  const file = contentFile({ title: "Don't Touch That Dial" }, 'x');
  expect(frontmatter(file).title).toBe("Don't Touch That Dial");
});

test('the awkward scalars all come back as themselves', () => {
  const awkward = [
    'Captain America: The First Avenger',
    "Don't Touch That Dial",
    '12',
    '12A',
    'TV-14',
    '1963-03',
    '2011-07-22',
    'true',
    'no',
    'null',
    '- not a list',
    '# not a comment',
    '@handle',
    'trailing space ',
    'S.H.I.E.L.D.',
    'Maximiliano Hernández',
    '1943–1945 — New York',
    'a: b # c',
  ];

  for (const value of awkward) {
    const file = contentFile({ value }, 'x');
    expect(frontmatter(file).value, `round-tripping ${JSON.stringify(value)}`).toBe(value);
  }
});

test('undefined fields are dropped, not written empty', () => {
  /* Under strictObject a key with nothing after it is an error, not an
     omission — an optional field the source did not supply must not appear. */
  const file = contentFile({ title: 'A', certification: undefined, note: undefined }, 'x');
  expect(file).not.toContain('certification');
  expect(Object.keys(frontmatter(file))).toEqual(['title']);
});

test('an empty list is written, because the key still has to exist', () => {
  const file = contentFile({ images: { stills: [] }, aka: [] }, 'x');
  expect(frontmatter(file)).toEqual({ images: { stills: [] }, aka: [] });
});

test('an object whose every value is undefined collapses rather than vanishing', () => {
  const file = contentFile({ images: { poster: undefined } }, 'x');
  expect(frontmatter(file).images).toEqual({});
});

test('comments attach above their key and are stripped by the parser', () => {
  const file = contentFile(
    { timeline: { order: 100 } },
    'Body.',
    { timeline: 'TODO: place this in the chronology' },
  );
  expect(file).toContain('# TODO: place this in the chronology\ntimeline:');
  expect(frontmatter(file)).toEqual({ timeline: { order: 100 } });
});

test('the body follows the frontmatter, trimmed, with one trailing newline', () => {
  const file = contentFile({ title: 'A' }, '\n\nSome prose.\n\n\n');
  expect(file.endsWith('---\n\nSome prose.\n')).toBe(true);
});

test('scalar quotes only what would otherwise be misread', () => {
  expect(scalar('plain')).toBe('plain');
  expect(scalar('12')).toBe("'12'");
  expect(scalar('')).toBe("''");
  /* An apostrophe mid-scalar is unremarkable to YAML — quoting it would be
     noise, and the round-trip test above proves it survives. */
  expect(scalar("it's")).toBe("it's");
  expect(scalar("'quoted'")).toBe("'''quoted'''");
});

test('a Date is refused rather than silently written as an empty mapping', () => {
  /* A Date has no enumerable own properties, so the first version of this
     emitter rendered `releaseDate: {}` — valid YAML saying nothing, which then
     failed the schema somewhere unrelated. */
  expect(() => contentFile({ releaseDate: new Date('2008-05-02') }, 'x')).toThrow(
    /Refusing to write a Date/,
  );
});

test('a value type the schemas never use is rejected loudly', () => {
  expect(() => contentFile({ pattern: /x/ }, 'x')).toThrow(/RegExp/);
  expect(() => contentFile({ n: 1n }, 'x')).toThrow();
});
