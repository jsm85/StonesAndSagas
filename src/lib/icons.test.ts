import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import {
  ENTITY_ICONS,
  READING_ICONS,
  TITLE_ICONS,
  UNIT_ICONS,
  type IconName,
} from './icons';

const component = readFileSync(new URL('../components/Icon.astro', import.meta.url), 'utf8');

/*
 * The maps are typed `Record<Kind, IconName>`, so a kind without a glyph fails
 * to compile. The direction TypeScript cannot check is whether the glyph is
 * actually drawn: `IconName` is a union of strings, and nothing ties it to the
 * markup. This reads the component and checks.
 */
test('every icon the maps reference is actually drawn', () => {
  const used = new Set<IconName>([
    ...Object.values(TITLE_ICONS),
    ...Object.values(UNIT_ICONS),
    ...Object.values(ENTITY_ICONS),
    ...Object.values(READING_ICONS),
  ]);

  expect(used.size).toBeGreaterThan(0);
  for (const name of used) {
    expect(component, `Icon.astro draws no "${name}"`).toContain(`name === '${name}'`);
  }
});

test('every kind in every schema enum has a glyph', () => {
  expect(Object.keys(TITLE_ICONS)).toHaveLength(3);
  expect(Object.keys(UNIT_ICONS)).toHaveLength(3);
  expect(Object.keys(ENTITY_ICONS)).toHaveLength(5);
  expect(Object.keys(READING_ICONS)).toHaveLength(3);
});

test('icons carry no colour of their own', () => {
  /* They take the accent of whatever they sit in, which is the reason there is
     one set rather than one per accent. A hard-coded fill or stroke would break
     that silently on a page with a different accent. */
  expect(component).toContain('stroke="currentColor"');
  expect(component).not.toMatch(/(fill|stroke)="#[0-9a-f]{3,8}"/i);
  expect(component).not.toMatch(/(fill|stroke)="(?!none|currentColor)[a-z]+"/i);
});

test('icons are hidden from assistive technology', () => {
  /* They sharpen labels that stay in the markup; they never carry the meaning
     on their own. */
  expect(component).toContain('aria-hidden="true"');
});
