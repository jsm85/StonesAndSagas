import { describe, expect, test } from 'vitest';

import {
  byReleaseDate,
  byTimelineOrder,
  indexUnits,
  refKey,
  resolveAppearances,
  toTimelineUnits,
  unitKey,
  type EpisodeLike,
  type TitleLike,
} from './timeline';

/*
 * Fixtures shaped like the real catalogue: a film set early in the chronology
 * but released late, a film released first but set later, and a two-episode
 * series that lands after both. That is the case the whole timeline feature
 * exists for — release order and in-universe order disagree.
 */
const firstAvenger = {
  id: 'captain-america-the-first-avenger',
  data: {
    kind: 'film',
    title: 'Captain America: The First Avenger',
    accent: 'cyan',
    releaseDate: new Date('2011-07-22T00:00:00Z'),
    timeline: { order: 100, setting: '1943' },
  },
} satisfies TitleLike;

const ironMan = {
  id: 'iron-man',
  data: {
    kind: 'film',
    title: 'Iron Man',
    accent: 'magenta',
    releaseDate: new Date('2008-05-02T00:00:00Z'),
    timeline: { order: 1000 },
  },
} satisfies TitleLike;

const item47 = {
  id: 'item-47',
  data: {
    kind: 'short',
    title: 'Item 47',
    accent: 'amber',
    releaseDate: new Date('2012-09-25T00:00:00Z'),
    timeline: { order: 1600 },
  },
} satisfies TitleLike;

const wandavision = {
  id: 'wandavision',
  data: { kind: 'series', title: 'WandaVision', accent: 'cyan' },
} satisfies TitleLike;

const episodeOne = {
  id: 'wandavision-s01e01',
  data: {
    title: 'Filmed Before a Live Studio Audience',
    series: { id: 'wandavision' },
    season: 1,
    episode: 1,
    releaseDate: new Date('2021-01-15T00:00:00Z'),
    timeline: { order: 3000 },
  },
} satisfies EpisodeLike;

const episodeTwo = {
  id: 'wandavision-s01e02',
  data: {
    title: "Don't Touch That Dial",
    series: { id: 'wandavision' },
    season: 1,
    episode: 2,
    accent: 'amber',
    releaseDate: new Date('2021-01-15T00:00:00Z'),
    timeline: { order: 3010 },
  },
} satisfies EpisodeLike;

const titles: TitleLike[] = [firstAvenger, ironMan, item47, wandavision];
const episodes: EpisodeLike[] = [episodeOne, episodeTwo];

const names = (units: { name: string }[]) => units.map((u) => u.name);

describe('toTimelineUnits', () => {
  test('includes films, shorts and episodes', () => {
    const units = toTimelineUnits(titles, episodes);
    expect(units).toHaveLength(5);
    expect(units.map((u) => u.kind).sort()).toEqual([
      'episode',
      'episode',
      'film',
      'film',
      'short',
    ]);
  });

  test('drops series, because a series is not a point in the chronology', () => {
    const units = toTimelineUnits(titles, episodes);
    expect(units.some((u) => u.id === 'wandavision')).toBe(false);
  });

  test('an episode carries its series, season and episode number', () => {
    const [episode] = toTimelineUnits([wandavision], [episodeOne]);
    expect(episode!.series).toEqual({
      id: 'wandavision',
      name: 'WandaVision',
      season: 1,
      episode: 1,
    });
  });

  test('an episode inherits its series accent, or overrides it', () => {
    const units = toTimelineUnits(titles, episodes);
    const byId = new Map(units.map((u) => [u.id, u]));
    expect(byId.get('wandavision-s01e01')!.accent).toBe('cyan');
    expect(byId.get('wandavision-s01e02')!.accent).toBe('amber');
  });

  test('an episode whose series is missing still resolves, using the id', () => {
    /* Astro logs a bad reference and exits 0, so this can reach us. Render the
       id rather than crashing a whole page over one broken pointer. */
    const [episode] = toTimelineUnits([], [episodeOne]);
    expect(episode!.series!.name).toBe('wandavision');
    expect(episode!.accent).toBe('magenta');
  });
});

describe('ordering', () => {
  test('in-universe order interleaves episodes with films', () => {
    const units = toTimelineUnits(titles, episodes).sort(byTimelineOrder);
    expect(names(units)).toEqual([
      'Captain America: The First Avenger',
      'Iron Man',
      'Item 47',
      'Filmed Before a Live Studio Audience',
      "Don't Touch That Dial",
    ]);
  });

  test('release order is a different list — the reason both exist', () => {
    const units = toTimelineUnits(titles, episodes).sort(byReleaseDate);
    expect(names(units)).toEqual([
      'Iron Man',
      'Captain America: The First Avenger',
      'Item 47',
      "Don't Touch That Dial",
      'Filmed Before a Live Studio Audience',
    ]);
  });

  test('equal timeline positions break on release date, then name', () => {
    const sameOrder = [
      { ...ironMan, id: 'b', data: { ...ironMan.data, title: 'B', timeline: { order: 1 } } },
      { ...ironMan, id: 'a', data: { ...ironMan.data, title: 'A', timeline: { order: 1 } } },
      {
        ...ironMan,
        id: 'earlier',
        data: {
          ...ironMan.data,
          title: 'Z',
          timeline: { order: 1 },
          releaseDate: new Date('2000-01-01T00:00:00Z'),
        },
      },
    ] satisfies TitleLike[];

    const sorted = toTimelineUnits(sameOrder, []).sort(byTimelineOrder);
    expect(names(sorted)).toEqual(['Z', 'A', 'B']);
  });
});

describe('resolveAppearances', () => {
  const index = indexUnits(toTimelineUnits(titles, episodes));

  test('addresses a unit by collection and id, not id alone', () => {
    expect(unitKey('titles', 'iron-man')).toBe('titles:iron-man');
    expect(refKey({ title: { id: 'iron-man' } })).toBe('titles:iron-man');
    expect(refKey({ episode: { id: 'wandavision-s01e01' } })).toBe(
      'episodes:wandavision-s01e01',
    );
  });

  test('resolves across both collections and sorts into timeline order', () => {
    const appearances = [
      { unit: { episode: { id: 'wandavision-s01e02' } }, type: 'appears' },
      { unit: { title: { id: 'iron-man' } }, type: 'mentioned' },
      { unit: { title: { id: 'captain-america-the-first-avenger' } }, type: 'appears' },
    ];

    const resolved = resolveAppearances(appearances, index, 'test');
    expect(resolved.map((r) => r.unit.name)).toEqual([
      'Captain America: The First Avenger',
      'Iron Man',
      "Don't Touch That Dial",
    ]);
    /* The appearance travels with its unit — the row needs both. */
    expect(resolved[1]!.appearance.type).toBe('mentioned');
  });

  test('does not mutate the caller’s array', () => {
    const appearances = [
      { unit: { title: { id: 'item-47' } }, type: 'appears' },
      { unit: { title: { id: 'iron-man' } }, type: 'appears' },
    ];
    resolveAppearances(appearances, index, 'test');
    expect(appearances[0]!.unit).toEqual({ title: { id: 'item-47' } });
  });

  test('throws on a pointer that resolves to nothing', () => {
    /* Astro exits 0 on an invalid reference, so without this a dead pointer
       renders as a silent gap instead of failing the build. */
    expect(() =>
      resolveAppearances(
        [{ unit: { episode: { id: 'wandavision-s01e99' } }, type: 'appears' }],
        index,
        'entities/westview',
      ),
    ).toThrow(/entities\/westview.*episodes:wandavision-s01e99/s);
  });

  test('throws when an appearance points at a series rather than a unit', () => {
    /* The schema cannot express "a film or short, but not a series", so this is
       where that mistake is caught. */
    expect(() =>
      resolveAppearances(
        [{ unit: { title: { id: 'wandavision' } }, type: 'appears' }],
        index,
        'entities/westview',
      ),
    ).toThrow(/rather than a series/);
  });
});
