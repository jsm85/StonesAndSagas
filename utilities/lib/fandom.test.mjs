import { expect, test } from 'vitest';

import {
  displayName,
  pageInfo,
  pageUrl,
  plainSnippet,
  searchResults,
  searchUrl,
  WIKIS,
} from './fandom.mjs';

/*
 * Fixtures, not the network: *.fandom.com is unreachable from the environment
 * this was written in. These match MediaWiki's documented action=query shapes.
 */
const searchResponse = {
  query: {
    search: [
      {
        ns: 0,
        title: 'Tesseract',
        pageid: 1234,
        snippet:
          'The <span class="searchmatch">Tesseract</span> was an &quot;ancient&quot; artifact &amp; a container.',
      },
      { ns: 0, title: 'Vision (Earth-616)', pageid: 5678, snippet: 'A synthezoid.' },
    ],
  },
};

test('builds a search that returns articles only', () => {
  const built = new URL(searchUrl('mcu', 'Tesseract'));
  expect(built.origin).toBe(WIKIS.mcu);
  expect(built.pathname).toBe('/api.php');
  expect(built.searchParams.get('srsearch')).toBe('Tesseract');
  /* Namespace 0 keeps categories, templates and talk pages out of the picker. */
  expect(built.searchParams.get('srnamespace')).toBe('0');
  expect(built.searchParams.get('format')).toBe('json');
});

test('the two wikis are separate, because they know different things', () => {
  expect(new URL(searchUrl('comics', 'x')).origin).toBe('https://marvel.fandom.com');
  expect(new URL(searchUrl('mcu', 'x')).origin).toBe(
    'https://marvelcinematicuniverse.fandom.com',
  );
});

test('a page lookup asks for the canonical URL', () => {
  const built = new URL(pageUrl('mcu', 'Tesseract'));
  expect(built.searchParams.get('inprop')).toBe('url');
  expect(built.searchParams.get('titles')).toBe('Tesseract');
});

test('a search term with spaces and punctuation is encoded, not broken', () => {
  const built = new URL(searchUrl('comics', 'Tales of Suspense Vol 1 39'));
  expect(built.searchParams.get('srsearch')).toBe('Tales of Suspense Vol 1 39');
});

test('snippets are stripped of markup and entities for the terminal', () => {
  expect(plainSnippet(searchResponse.query.search[0].snippet)).toBe(
    'The Tesseract was an "ancient" artifact & a container.',
  );
  expect(plainSnippet('')).toBe('');
});

test('results carry a ready-made id alongside the wiki title', () => {
  const results = searchResults(searchResponse);
  expect(results[0]).toEqual({
    title: 'Tesseract',
    id: 'tesseract',
    snippet: 'The Tesseract was an "ancient" artifact & a container.',
  });
  expect(results[1].id).toBe('vision-earth-616');
});

test('an empty or malformed search response yields no results, not a crash', () => {
  expect(searchResults({})).toEqual([]);
  expect(searchResults({ query: {} })).toEqual([]);
  expect(searchResults(undefined)).toEqual([]);
});

test('a missing page is detected rather than returned as a blank entry', () => {
  /* MediaWiki answers a miss with pageid -1 and a `missing` marker rather than
     an error, so this has to be checked explicitly. */
  const missing = { query: { pages: { '-1': { title: 'Nope', missing: '' } } } };
  expect(pageInfo(missing)).toBeUndefined();
  expect(pageInfo({})).toBeUndefined();
});

test('a found page yields its title and canonical URL', () => {
  const found = {
    query: {
      pages: {
        1234: {
          pageid: 1234,
          title: 'Tesseract',
          fullurl: 'https://marvelcinematicuniverse.fandom.com/wiki/Tesseract',
        },
      },
    },
  };
  expect(pageInfo(found)).toEqual({
    title: 'Tesseract',
    url: 'https://marvelcinematicuniverse.fandom.com/wiki/Tesseract',
  });
});

test('a disambiguating parenthetical is wiki bookkeeping, not part of the name', () => {
  expect(displayName('Vision (Earth-616)')).toBe('Vision');
  expect(displayName('Tales of Suspense Vol 1 39')).toBe('Tales of Suspense Vol 1 39');
  expect(displayName('Nick Fury (Earth-199999)')).toBe('Nick Fury');
  /* Only a trailing one — a parenthetical mid-title is part of the name. */
  expect(displayName('Iron Man (2008 film) sequel')).toBe('Iron Man (2008 film) sequel');
});
