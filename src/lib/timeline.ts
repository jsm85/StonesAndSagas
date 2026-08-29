/*
 * Timeline ordering and cross-reference resolution.
 *
 * The first real logic in the project, and the reason it exists: a film, a short
 * and an episode are all one position in the in-universe chronology, they live
 * in two different collections, and the order they are watched in is not the
 * order they were released in. Everything here is a pure function over plain
 * data so it can be unit-tested without a content store.
 *
 * The inputs are deliberately narrow — each interface names only the fields the
 * function reads. A real `CollectionEntry` satisfies them structurally, so pages
 * pass their entries straight in, while tests build small literals.
 */

export type Accent = 'magenta' | 'cyan' | 'amber';

/* --- Inputs --------------------------------------------------------------- */

export interface SelfContainedTitleLike {
  id: string;
  data: {
    kind: 'film' | 'short';
    title: string;
    accent: Accent;
    releaseDate: Date;
    timeline: { order: number; setting?: string };
  };
}

export interface SeriesTitleLike {
  id: string;
  data: { kind: 'series'; title: string; accent: Accent };
}

export type TitleLike = SelfContainedTitleLike | SeriesTitleLike;

export interface EpisodeLike {
  id: string;
  data: {
    title: string;
    series: { id: string };
    season: number;
    episode: number;
    accent?: Accent;
    releaseDate: Date;
    timeline: { order: number; setting?: string };
  };
}

/* --- The unit ------------------------------------------------------------- */

/*
 * One position on the timeline, whichever collection it came from.
 *
 * `collection` is part of the identity, not decoration: ids are only unique
 * within a collection, so a bare id cannot address a unit.
 */
export interface TimelineUnit {
  collection: 'titles' | 'episodes';
  id: string;
  kind: 'film' | 'short' | 'episode';
  name: string;
  order: number;
  releaseDate: Date;
  accent: Accent;
  setting?: string;
  /* Episodes only — what a row needs to say where it belongs. */
  series?: { id: string; name: string; season: number; episode: number };
}

const isSelfContained = (t: TitleLike): t is SelfContainedTitleLike =>
  t.data.kind !== 'series';

/*
 * Flatten films, shorts and episodes into one list of timeline units.
 *
 * Series are dropped rather than skipped by accident: a series is not a point in
 * the chronology, which is why its schema has no `timeline` field to read.
 * Episodes inherit their series' accent unless they override it, so a season
 * reads as one run of colour.
 */
export function toTimelineUnits(
  titles: TitleLike[],
  episodes: EpisodeLike[],
): TimelineUnit[] {
  const seriesById = new Map(titles.map((t) => [t.id, t]));

  const fromTitles: TimelineUnit[] = titles.filter(isSelfContained).map((t) => ({
    collection: 'titles',
    id: t.id,
    kind: t.data.kind,
    name: t.data.title,
    order: t.data.timeline.order,
    releaseDate: t.data.releaseDate,
    accent: t.data.accent,
    setting: t.data.timeline.setting,
  }));

  const fromEpisodes: TimelineUnit[] = episodes.map((e) => {
    const series = seriesById.get(e.data.series.id);
    return {
      collection: 'episodes',
      id: e.id,
      kind: 'episode',
      name: e.data.title,
      order: e.data.timeline.order,
      releaseDate: e.data.releaseDate,
      accent: e.data.accent ?? series?.data.accent ?? 'magenta',
      setting: e.data.timeline.setting,
      series: {
        id: e.data.series.id,
        name: series?.data.title ?? e.data.series.id,
        season: e.data.season,
        episode: e.data.episode,
      },
    };
  });

  return [...fromTitles, ...fromEpisodes];
}

/*
 * In-universe order.
 *
 * Ties are real — `order` is hand-assigned, and two units can share a number
 * while the catalogue is being edited. They break on release date and then on
 * name so the output is stable: an unstable sort would reshuffle rows between
 * builds and turn a content edit into a confusing diff.
 */
export function byTimelineOrder(a: TimelineUnit, b: TimelineUnit): number {
  return (
    a.order - b.order ||
    a.releaseDate.getTime() - b.releaseDate.getTime() ||
    a.name.localeCompare(b.name)
  );
}

/* The order everything actually reached us. Deliberately not the same list. */
export function byReleaseDate(a: TimelineUnit, b: TimelineUnit): number {
  return (
    a.releaseDate.getTime() - b.releaseDate.getTime() ||
    a.name.localeCompare(b.name)
  );
}

/* --- Cross-references ----------------------------------------------------- */

/* A unit's address. Ids repeat across collections, so both parts are needed. */
export function unitKey(collection: 'titles' | 'episodes', id: string): string {
  return `${collection}:${id}`;
}

export function indexUnits(units: TimelineUnit[]): Map<string, TimelineUnit> {
  return new Map(units.map((u) => [unitKey(u.collection, u.id), u]));
}

/* The `timelineUnit` union from the schema: exactly one of the two is set. */
export type UnitRef = { title: { id: string } } | { episode: { id: string } };

export function refKey(ref: UnitRef): string {
  return 'title' in ref
    ? unitKey('titles', ref.title.id)
    : unitKey('episodes', ref.episode.id);
}

export interface AppearanceLike {
  unit: UnitRef;
  type: string;
  scene?: string;
  note?: string;
}

export interface ResolvedAppearance<A extends AppearanceLike = AppearanceLike> {
  appearance: A;
  unit: TimelineUnit;
}

/*
 * Resolve a thread's appearances against the timeline, in chronological order.
 *
 * Throws on a pointer that resolves to nothing. That is deliberate: Astro
 * reports an invalid content reference and then exits 0, so a dead pointer
 * otherwise reaches the page as `undefined` and renders as a gap. Throwing here
 * turns any dead reference on a rendered page into a failed build, which is the
 * behaviour the content model was documented as having.
 */
export function resolveAppearances<A extends AppearanceLike>(
  appearances: A[],
  index: Map<string, TimelineUnit>,
  context: string,
): ResolvedAppearance<A>[] {
  const resolved = appearances.map((appearance) => {
    const key = refKey(appearance.unit);
    const unit = index.get(key);
    if (!unit) {
      throw new Error(
        `${context}: appearance references "${key}", which is not a timeline unit. ` +
          `Check the id, and that it is a film, short or episode rather than a series.`,
      );
    }
    return { appearance, unit };
  });

  return resolved.sort((a, b) => byTimelineOrder(a.unit, b.unit));
}
