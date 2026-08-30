import { describe, expect, test } from 'vitest';

import { driftByUnit, driftLabel, eraSpan, releaseSpan, toEras } from './eras';
import type { TimelineUnit } from './timeline';

const unit = (
  id: string,
  order: number,
  year: number | undefined,
  releaseYear: number,
): TimelineUnit => ({
  collection: 'titles',
  id,
  kind: 'film',
  name: id,
  order,
  year,
  releaseDate: new Date(Date.UTC(releaseYear, 0, 1)),
  accent: 'magenta',
});

/* The seed catalogue's shape: a war film, two 2010s entries, two 2020s ones. */
const seed = [
  unit('first-avenger', 100, 1943, 2011),
  unit('iron-man', 1000, 2010, 2008),
  unit('item-47', 1600, 2012, 2012),
  unit('wv-1', 3000, 2023, 2021),
  unit('wv-2', 3010, 2023, 2021),
];

describe('toEras', () => {
  test('groups consecutive units by decade', () => {
    const eras = toEras(seed);
    expect(eras.map((e) => e.label)).toEqual(['1940s', '2010s', '2020s']);
    expect(eras.map((e) => e.units.length)).toEqual([1, 2, 2]);
  });

  test('reports the in-universe years each band covers', () => {
    const [war, tens] = toEras(seed);
    expect(eraSpan(war!)).toBe('1943');
    expect(eraSpan(tens!)).toBe('2010–2012');
  });

  test('reports the release years too, which is where the two disagree', () => {
    const [war, tens] = toEras(seed);
    /* Set first, released second: the whole premise of the site, in one band. */
    expect(releaseSpan(war!)).toBe('2011');
    expect(releaseSpan(tens!)).toBe('2008–2012');
  });

  test('measures the gap skipped between bands', () => {
    const [, tens, twenties] = toEras(seed);
    expect(tens!.gapYears).toBe(2010 - 1943);
    expect(twenties!.gapYears).toBe(2023 - 2012);
  });

  test('the first band has no gap', () => {
    expect(toEras(seed)[0]!.gapYears).toBeUndefined();
  });

  test('a decade returned to later becomes a second band, not a merge', () => {
    /* Runs, not buckets. If the chronology goes 1940s → 2010s → 1940s, the
       order is the truth and the page shows two 1940s bands rather than
       reordering the catalogue to tidy them together. */
    const eras = toEras([
      unit('a', 1, 1943, 2011),
      unit('b', 2, 2012, 2012),
      unit('c', 3, 1946, 2015),
    ]);
    expect(eras.map((e) => e.label)).toEqual(['1940s', '2010s', '1940s']);
    expect(eras.map((e) => e.key)).toHaveLength(new Set(eras.map((e) => e.key)).size);
  });

  test('a band that goes backwards in time reports no gap', () => {
    const eras = toEras([unit('a', 1, 2012, 2012), unit('b', 2, 1943, 2011)]);
    expect(eras[1]!.gapYears).toBeUndefined();
  });

  test('undated units get their own band rather than a guessed year', () => {
    const eras = toEras([
      unit('a', 1, 1943, 2011),
      unit('b', 2, undefined, 2014),
      unit('c', 3, 2012, 2012),
    ]);
    expect(eras.map((e) => e.label)).toEqual(['1940s', 'Undated', '2010s']);
    expect(eraSpan(eras[1]!)).toBeUndefined();
    /* No year on either side, so nothing can be said about what was skipped. */
    expect(eras[1]!.gapYears).toBeUndefined();
    expect(eras[2]!.gapYears).toBeUndefined();
  });

  test('consecutive undated units share one band', () => {
    const eras = toEras([unit('a', 1, undefined, 2011), unit('b', 2, undefined, 2012)]);
    expect(eras).toHaveLength(1);
    expect(eras[0]!.units).toHaveLength(2);
  });

  test('an empty catalogue produces no bands', () => {
    expect(toEras([])).toEqual([]);
  });

  test('a decade boundary splits, a decade interior does not', () => {
    const eras = toEras([
      unit('a', 1, 2009, 2009),
      unit('b', 2, 2010, 2010),
      unit('c', 3, 2019, 2019),
      unit('d', 4, 2020, 2020),
    ]);
    expect(eras.map((e) => e.label)).toEqual(['2000s', '2010s', '2020s']);
    expect(eras[1]!.units.map((u) => u.id)).toEqual(['b', 'c']);
  });
});

describe('drift', () => {
  test('measures how far a unit moves between the two orderings', () => {
    const drift = driftByUnit(seed);
    /* The First Avenger opens the chronology but was released second. */
    expect(drift.get('titles:first-avenger')).toBe(1);
    expect(drift.get('titles:iron-man')).toBe(-1);
  });

  test('is zero when the two orderings agree', () => {
    const agreeing = [unit('a', 1, 2000, 2000), unit('b', 2, 2001, 2001)];
    const drift = driftByUnit(agreeing);
    expect([...drift.values()]).toEqual([0, 0]);
  });

  test('finds the big movers in a catalogue that disagrees sharply', () => {
    /* A prequel released last: it opens the chronology and closes the release
       order, which is the case the chip exists to point at. */
    const prequelLast = [
      unit('prequel', 1, 1940, 2020),
      unit('a', 2, 2001, 2001),
      unit('b', 3, 2002, 2002),
      unit('c', 4, 2003, 2003),
    ];
    expect(driftByUnit(prequelLast).get('titles:prequel')).toBe(3);
  });

  test('only labels a move worth pointing at', () => {
    expect(driftLabel(0)).toBeUndefined();
    expect(driftLabel(1)).toBeUndefined();
    expect(driftLabel(-1)).toBeUndefined();
    expect(driftLabel(3)).toBe('3 places earlier than release order');
    expect(driftLabel(-2)).toBe('2 places later than release order');
  });
});
