import { expect, test } from 'vitest';

import { episodeId, parseCharacterCredit, slugify, uniqueId } from './slug.mjs';

test('slugify produces ids matching the ones already in the catalogue', () => {
  expect(slugify('Iron Man')).toBe('iron-man');
  expect(slugify('Captain America: The First Avenger')).toBe(
    'captain-america-the-first-avenger',
  );
  expect(slugify('Item 47')).toBe('item-47');
  expect(slugify('WandaVision')).toBe('wandavision');
  expect(slugify("Don't Touch That Dial")).toBe('dont-touch-that-dial');
});

test('folds accents rather than dropping the letters', () => {
  /* Dropping them would merge names that are genuinely different. */
  expect(slugify('Maximiliano Hernández')).toBe('maximiliano-hernandez');
  expect(slugify('Gabriel Hernández Walta')).toBe('gabriel-hernandez-walta');
  expect(slugify('Tønsberg')).toBe('t-nsberg');
});

test('spells out an ampersand instead of losing it', () => {
  expect(slugify('Cloak & Dagger')).toBe('cloak-and-dagger');
});

test('never leaves a leading, trailing or doubled hyphen', () => {
  expect(slugify('  Spider-Man: No Way Home  ')).toBe('spider-man-no-way-home');
  expect(slugify('S.H.I.E.L.D.')).toBe('s-h-i-e-l-d');
  expect(slugify('!!!')).toBe('');
});

test('produces only characters that are safe in a path and a fragment', () => {
  for (const name of ['Loki (Season 2)', 'Ms. Marvel', 'Æon: 1943–45', 'A/B']) {
    const slug = slugify(name);
    if (slug === '') continue;
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(encodeURIComponent(slug)).toBe(slug);
  }
});

test('episode ids pad so a listing sorts the way a season reads', () => {
  expect(episodeId('wandavision', 1, 1)).toBe('wandavision-s01e01');
  expect(episodeId('wandavision', 1, 10)).toBe('wandavision-s01e10');
  expect(['wandavision-s01e10', 'wandavision-s01e09'].sort()).toEqual([
    'wandavision-s01e09',
    'wandavision-s01e10',
  ]);
});

test('uniqueId suffixes rather than colliding with an existing entry', () => {
  expect(uniqueId('chris-evans', [])).toBe('chris-evans');
  expect(uniqueId('chris-evans', ['chris-evans'])).toBe('chris-evans-2');
  expect(uniqueId('chris-evans', ['chris-evans', 'chris-evans-2'])).toBe('chris-evans-3');
});

test('parses the shapes TMDB actually puts in a character credit', () => {
  expect(parseCharacterCredit('Tony Stark')).toEqual({ name: 'Tony Stark' });
  /* An alias is not ours to invent a field for — the character's own `aka` is
     where 'Iron Man' belongs. */
  expect(parseCharacterCredit('Tony Stark / Iron Man')).toEqual({ name: 'Tony Stark' });
  expect(parseCharacterCredit('Agent Coulson (uncredited)')).toEqual({
    name: 'Agent Coulson',
    note: 'uncredited',
  });
  expect(parseCharacterCredit('Vision (voice) (uncredited)')).toEqual({
    name: 'Vision',
    note: 'voice, uncredited',
  });
  expect(parseCharacterCredit('  Peggy   Carter  ')).toEqual({ name: 'Peggy Carter' });
});
