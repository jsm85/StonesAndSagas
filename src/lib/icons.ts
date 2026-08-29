/*
 * Which glyph stands for which kind.
 *
 * The names live here rather than in Icon.astro so pages can map a schema enum
 * to an icon without importing a component's types, and so the mapping is
 * covered by tests: `Record<Kind, IconName>` means adding a kind to a schema
 * without choosing a glyph for it fails to compile.
 */

import type { EntityKind, ReadingKind, TitleKind, UnitKind } from './format';

export type IconName =
  | 'film'
  | 'series'
  | 'short'
  | 'object'
  | 'location'
  | 'organisation'
  | 'event'
  | 'reality'
  | 'issue'
  | 'collection'
  | 'book';

export const TITLE_ICONS: Record<TitleKind, IconName> = {
  film: 'film',
  series: 'series',
  short: 'short',
};

/* An episode takes the series glyph: it is one of many, which is what the
   stacked shape says. */
export const UNIT_ICONS: Record<UnitKind, IconName> = {
  film: 'film',
  short: 'short',
  episode: 'series',
};

export const ENTITY_ICONS: Record<EntityKind, IconName> = {
  object: 'object',
  location: 'location',
  organisation: 'organisation',
  event: 'event',
  reality: 'reality',
};

export const READING_ICONS: Record<ReadingKind, IconName> = {
  issue: 'issue',
  collection: 'collection',
  book: 'book',
};
