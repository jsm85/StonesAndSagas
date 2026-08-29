import { expect, test } from 'vitest';

import { href } from './href';

/*
 * Under Vitest, BASE_URL is '/' rather than the '/StonesAndSagas/' Astro builds
 * with, so what these pin down is the joining: exactly one slash between the
 * base and the path, whichever way the caller writes it.
 */
test('joins without doubling or dropping a slash', () => {
  expect(href('titles/iron-man')).toBe('/titles/iron-man');
  expect(href('/titles/iron-man')).toBe('/titles/iron-man');
});

test('handles the site root', () => {
  expect(href('')).toBe('/');
});
