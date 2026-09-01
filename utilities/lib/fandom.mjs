/*
 * Fandom: search a wiki, and turn a page into a content stub.
 *
 * The wikis are used for two things only — finding the canonical spelling of a
 * name, and getting a URL to read. Fandom text is CC-BY-SA user writing, and the
 * project's IP rules forbid copying prose from a Marvel wiki outright, so
 * nothing fetched here is ever written into a file. Search snippets come back
 * for the terminal, with their markup stripped, as a way to tell two
 * similarly-named pages apart before you pick one.
 */

import { slugify } from './slug.mjs';

/*
 * Two wikis, because they cover different things. The MCU wiki knows the films;
 * the main Marvel wiki knows the comics. Which one to ask depends on what you
 * are looking for, so the caller chooses.
 */
export const WIKIS = {
  mcu: 'https://marvelcinematicuniverse.fandom.com',
  comics: 'https://marvel.fandom.com',
};

/** @param {keyof WIKIS} wiki */
export function searchUrl(wiki, term, limit = 8) {
  const target = new URL(`${WIKIS[wiki]}/api.php`);
  target.searchParams.set('action', 'query');
  target.searchParams.set('list', 'search');
  target.searchParams.set('srsearch', term);
  target.searchParams.set('srlimit', String(limit));
  /* The default namespace is articles only, which is what we want — no
     categories, templates or talk pages in the picker. */
  target.searchParams.set('srnamespace', '0');
  target.searchParams.set('format', 'json');
  target.searchParams.set('origin', '*');
  return target.toString();
}

/** @param {keyof WIKIS} wiki */
export function pageUrl(wiki, title) {
  const target = new URL(`${WIKIS[wiki]}/api.php`);
  target.searchParams.set('action', 'query');
  target.searchParams.set('prop', 'info');
  target.searchParams.set('inprop', 'url');
  target.searchParams.set('titles', title);
  target.searchParams.set('format', 'json');
  target.searchParams.set('origin', '*');
  return target.toString();
}

/**
 * Strip the HTML MediaWiki puts in a search snippet.
 *
 * Snippets arrive with `<span class="searchmatch">` around the hit and HTML
 * entities throughout. This is for reading in a terminal, never for a file.
 *
 * @param {string} snippet
 */
export function plainSnippet(snippet) {
  return snippet
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The search results, tidied for the picker.
 *
 * @param {any} response a MediaWiki action=query&list=search body
 */
export function searchResults(response) {
  return (response?.query?.search ?? []).map((hit) => ({
    title: hit.title,
    id: slugify(hit.title),
    snippet: plainSnippet(hit.snippet ?? ''),
  }));
}

/**
 * The canonical URL of a page, from an action=query&prop=info response.
 *
 * MediaWiki keys pages by id and uses -1 for a miss, so a missing page has to be
 * detected rather than assumed away.
 *
 * @param {any} response
 */
export function pageInfo(response) {
  const pages = response?.query?.pages ?? {};
  const [page] = Object.values(pages);
  if (!page || page.missing !== undefined) return undefined;
  return { title: page.title, url: page.fullurl };
}

/*
 * A Fandom page title is not always the name we want. The comics wiki
 * disambiguates with a parenthesised universe — 'Vision (Earth-616)' — and the
 * MCU wiki occasionally does the same. The parenthetical is wiki bookkeeping,
 * not part of the name.
 */
export function displayName(title) {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim();
}
