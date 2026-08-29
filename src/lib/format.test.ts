import { expect, test } from 'vitest';

import {
  APPEARANCE_TYPES,
  ENTITY_KINDS,
  formatCertification,
  formatCoverDate,
  formatDate,
  formatEpisodeCode,
  formatRuntime,
  formatYear,
  isoDate,
  RELATIONSHIPS,
} from './format';

/*
 * These run under TZ=America/Los_Angeles, pinned in vitest.config.ts. That is
 * the point of the timezone tests below: a date authored as 2008-05-02 is
 * midnight UTC, which is 1 May locally, so a formatter that forgets to pin the
 * zone silently reports every release a day early.
 */
test('the suite runs west of UTC, so the date tests mean something', () => {
  expect(process.env.TZ).toBe('America/Los_Angeles');
  expect(new Intl.DateTimeFormat('en-GB').format(new Date('2008-05-02T00:00:00Z'))).toBe(
    '01/05/2008',
  );
});

test('formatDate reports the authored day, not the local one', () => {
  expect(formatDate(new Date('2008-05-02T00:00:00Z'))).toBe('2 May 2008');
  expect(formatDate(new Date('2011-07-22T00:00:00Z'))).toBe('22 July 2011');
});

test('formatYear does not slip a year at a January boundary', () => {
  expect(formatYear(new Date('2021-01-01T00:00:00Z'))).toBe('2021');
});

test('isoDate round-trips the authored date', () => {
  expect(isoDate(new Date('2012-09-25T00:00:00Z'))).toBe('2012-09-25');
});

test('formatCoverDate turns a month into words', () => {
  expect(formatCoverDate('1963-03')).toBe('March 1963');
  expect(formatCoverDate('1941-03')).toBe('March 1941');
  expect(formatCoverDate('2012-10')).toBe('October 2012');
});

test('formatRuntime drops an empty hour or an empty minute', () => {
  expect(formatRuntime(126)).toBe('2h 6m');
  expect(formatRuntime(120)).toBe('2h');
  expect(formatRuntime(46)).toBe('46m');
  expect(formatRuntime(12)).toBe('12m');
  expect(formatRuntime(61)).toBe('1h 1m');
});

test('formatEpisodeCode pads both numbers', () => {
  expect(formatEpisodeCode(1, 2)).toBe('S01E02');
  expect(formatEpisodeCode(1, 10)).toBe('S01E10');
  expect(formatEpisodeCode(12, 3)).toBe('S12E03');
});

test('formatCertification names the system, because 12 and PG are not comparable', () => {
  expect(formatCertification({ system: 'bbfc', rating: '12A' })).toBe('BBFC 12A');
  expect(formatCertification({ system: 'mpa', rating: 'PG-13' })).toBe('MPA PG-13');
  expect(formatCertification({ system: 'us-tv', rating: 'TV-14' })).toBe('US TV TV-14');
});

test('every schema enum value has a label', () => {
  /* The maps are typed `Record<Enum, string>`, so a value added to the schema
     without a label fails to compile. This checks the other direction: that no
     label is blank, and that the counts still match the schemas. */
  const maps = [APPEARANCE_TYPES, ENTITY_KINDS, RELATIONSHIPS];
  for (const map of maps) {
    for (const label of Object.values(map)) expect(label.length).toBeGreaterThan(0);
  }
  expect(Object.keys(APPEARANCE_TYPES)).toHaveLength(7);
  expect(Object.keys(ENTITY_KINDS)).toHaveLength(5);
  expect(Object.keys(RELATIONSHIPS)).toHaveLength(5);
});
