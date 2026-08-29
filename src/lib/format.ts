/*
 * Display formatting.
 *
 * Everything a page shows that is not raw content passes through here, for two
 * reasons: the rules are testable in one place, and the enums in the content
 * schemas need exactly one set of human labels rather than one per template.
 */

/* --- Dates ---------------------------------------------------------------- */

/*
 * Release dates are authored as `2008-05-02`, which YAML parses as midnight UTC.
 * Formatted in local time, that is 1 May for anyone west of Greenwich — a date
 * that is simply wrong, on a site whose whole subject is chronology. So every
 * formatter here pins the zone to UTC. The unit tests run under a US timezone
 * precisely so that removing this would fail them.
 */
const UTC = 'UTC';

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: UTC,
  }).format(date);
}

export function formatYear(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: UTC }).format(date);
}

/* An ISO date for `<time datetime>`, so the markup carries the machine form. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/*
 * A cover date is a month — `1963-03` — because that is the precision comics
 * actually carry. Parsed by hand rather than through `new Date()`, which would
 * reintroduce the timezone problem for no benefit.
 */
export function formatCoverDate(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const name = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: UTC }).format(
    new Date(Date.UTC(2000, Number(month) - 1, 1)),
  );
  return `${name} ${year}`;
}

/* --- Runtime -------------------------------------------------------------- */

/* 126 → '2h 6m', 120 → '2h', 46 → '46m'. */
export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/* --- Episodes ------------------------------------------------------------- */

export function formatEpisodeCode(season: number, episode: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `S${pad(season)}E${pad(episode)}`;
}

/* --- Labels for the schema enums ------------------------------------------ */

/*
 * Each map is exhaustive over its enum by construction: `Record<K, string>`
 * fails to compile if a value is added to the schema and not given a label here.
 */

export type Certification =
  | { system: 'bbfc'; rating: string }
  | { system: 'mpa'; rating: string }
  | { system: 'us-tv'; rating: string };

const CERTIFICATION_SYSTEMS: Record<Certification['system'], string> = {
  bbfc: 'BBFC',
  mpa: 'MPA',
  'us-tv': 'US TV',
};

export function formatCertification(certification: Certification): string {
  return `${CERTIFICATION_SYSTEMS[certification.system]} ${certification.rating}`;
}

export type TitleKind = 'film' | 'series' | 'short';

export const TITLE_KINDS: Record<TitleKind, string> = {
  film: 'Film',
  series: 'Series',
  short: 'Short',
};

export type UnitKind = 'film' | 'short' | 'episode';

export const UNIT_KINDS: Record<UnitKind, string> = {
  film: 'Film',
  short: 'Short',
  episode: 'Episode',
};

export type EntityKind = 'object' | 'location' | 'organisation' | 'event' | 'reality';

export const ENTITY_KINDS: Record<EntityKind, string> = {
  object: 'Object',
  location: 'Location',
  organisation: 'Organisation',
  event: 'Event',
  reality: 'Reality',
};

export const ENTITY_KINDS_PLURAL: Record<EntityKind, string> = {
  object: 'Objects',
  location: 'Locations',
  organisation: 'Organisations',
  event: 'Events',
  reality: 'Realities',
};

export type AppearanceType =
  | 'appears'
  | 'mentioned'
  | 'acquired'
  | 'lost'
  | 'destroyed'
  | 'wielded'
  | 'created';

export const APPEARANCE_TYPES: Record<AppearanceType, string> = {
  appears: 'Appears',
  mentioned: 'Mentioned',
  acquired: 'Acquired',
  lost: 'Lost',
  destroyed: 'Destroyed',
  wielded: 'Wielded',
  created: 'Created',
};

export type ReadingKind = 'issue' | 'collection' | 'book';

export const READING_KINDS: Record<ReadingKind, string> = {
  issue: 'Issue',
  collection: 'Collected edition',
  book: 'Book',
};

export type Relationship = 'adapts' | 'introduces' | 'inspires' | 'expands' | 'background';

/*
 * Read from the title's point of view, since that is where the recommendation
 * is shown: "what is this comic to the film I'm looking at".
 */
export const RELATIONSHIPS: Record<Relationship, string> = {
  adapts: 'Source material',
  introduces: 'First appearance',
  inspires: 'Inspiration',
  expands: 'Goes further',
  background: 'Background',
};

export type CreatorRole =
  | 'writer'
  | 'penciller'
  | 'inker'
  | 'artist'
  | 'colourist'
  | 'letterer'
  | 'coverArtist'
  | 'editor'
  | 'author';

export const CREATOR_ROLES: Record<CreatorRole, string> = {
  writer: 'Writer',
  penciller: 'Penciller',
  inker: 'Inker',
  artist: 'Artist',
  colourist: 'Colourist',
  letterer: 'Letterer',
  coverArtist: 'Cover artist',
  editor: 'Editor',
  author: 'Author',
};
