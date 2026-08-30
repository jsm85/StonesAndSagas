/*
 * Era bands, and the gaps between them.
 *
 * A flat list of units is correct and says nothing about the shape of the
 * chronology: the sixty-seven years between the war and Iron Man look exactly
 * like the hours between two episodes of a sitcom. Grouping into eras, and
 * measuring what is skipped between them, is what turns the list into a picture.
 */

import { byReleaseDate, byTimelineOrder, unitKey, type TimelineUnit } from './timeline';

export interface Era {
  /* Unique within the page: a decade can legitimately appear twice. */
  key: string;
  /* '1940s', or 'Undated'. */
  label: string;
  units: TimelineUnit[];
  /* The in-universe years actually covered, where the units state them. */
  from?: number;
  to?: number;
  /* The release years the band's units came out in — the other ordering, at a
     glance, which is where the two visibly disagree. */
  releasedFrom: number;
  releasedTo: number;
  /* Years skipped since the previous band, when both ends are known. */
  gapYears?: number;
}

const decadeOf = (year: number) => Math.floor(year / 10) * 10;

/*
 * Group units into consecutive runs sharing a decade.
 *
 * Runs, not buckets. The units arrive in in-universe order and stay in it: if a
 * chronology returns to an earlier decade — a flashback sequence placed late,
 * a title set in the past but positioned after its framing story — that becomes
 * a second band for the same decade rather than being folded back into the
 * first. The order is the truth; the year only labels it.
 *
 * Units with no year form their own band wherever they fall, rather than being
 * given a guess or silently dropped.
 */
export function toEras(units: TimelineUnit[]): Era[] {
  const eras: Era[] = [];
  let current: Era | undefined;
  let currentDecade: number | undefined;
  let seen = 0;

  for (const unit of units) {
    const decade = unit.year === undefined ? undefined : decadeOf(unit.year);
    const startsNewBand = current === undefined || decade !== currentDecade;

    if (startsNewBand) {
      const label = decade === undefined ? 'Undated' : `${decade}s`;
      current = {
        key: `${label}-${seen++}`,
        label,
        units: [],
        releasedFrom: Infinity,
        releasedTo: -Infinity,
      };
      currentDecade = decade;
      eras.push(current);
    }

    current!.units.push(unit);

    if (unit.year !== undefined) {
      current!.from = current!.from === undefined ? unit.year : Math.min(current!.from, unit.year);
      current!.to = current!.to === undefined ? unit.year : Math.max(current!.to, unit.year);
    }

    const releaseYear = unit.releaseDate.getUTCFullYear();
    current!.releasedFrom = Math.min(current!.releasedFrom, releaseYear);
    current!.releasedTo = Math.max(current!.releasedTo, releaseYear);
  }

  /* The jump between bands: measured end of one to start of the next, and only
     where both are actually known. */
  for (let i = 1; i < eras.length; i++) {
    const previous = eras[i - 1]!;
    const era = eras[i]!;
    if (previous.to !== undefined && era.from !== undefined && era.from > previous.to) {
      era.gapYears = era.from - previous.to;
    }
  }

  return eras;
}

/* '1943' for a single year, '1943–1945' for a span, nothing when undated. */
export function eraSpan(era: Era): string | undefined {
  if (era.from === undefined) return undefined;
  return era.from === era.to ? String(era.from) : `${era.from}–${era.to}`;
}

export function releaseSpan(era: Era): string {
  return era.releasedFrom === era.releasedTo
    ? String(era.releasedFrom)
    : `${era.releasedFrom}–${era.releasedTo}`;
}

/*
 * How far each unit moves between the two orderings.
 *
 * The site's premise is that release order and in-universe order disagree; this
 * measures the disagreement per unit. Negative means it happens earlier in the
 * chronology than its release slot — a prequel — and positive the reverse.
 */
export function driftByUnit(units: TimelineUnit[]): Map<string, number> {
  const chronological = [...units].sort(byTimelineOrder);
  const released = [...units].sort(byReleaseDate);

  const releaseIndex = new Map(
    released.map((unit, index) => [unitKey(unit.collection, unit.id), index]),
  );

  return new Map(
    chronological.map((unit, index) => {
      const key = unitKey(unit.collection, unit.id);
      return [key, releaseIndex.get(key)! - index];
    }),
  );
}

/*
 * Only worth saying when it is a real move. A title shifting one place is noise
 * — two neighbours swapping — and putting a chip on every row would bury the
 * cases where something jumps half the catalogue.
 */
export const DRIFT_THRESHOLD = 2;

export function driftLabel(drift: number): string | undefined {
  if (Math.abs(drift) < DRIFT_THRESHOLD) return undefined;
  const places = Math.abs(drift) === 1 ? 'place' : 'places';
  return drift > 0
    ? `${Math.abs(drift)} ${places} earlier than release order`
    : `${Math.abs(drift)} ${places} later than release order`;
}
