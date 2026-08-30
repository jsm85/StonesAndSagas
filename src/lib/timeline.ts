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

/*
 * Note the shape: one object whose `data` is a union, rather than a union of
 * objects. That is how Astro types a collection built on a discriminated union
 * — `CollectionEntry<'titles'>` is `{ id, collection, data: A | B | C }` — and
 * an input type shaped the other way round will not accept a real entry.
 */
export interface SelfContainedTitleData {
  kind: 'film' | 'short';
  title: string;
  accent: Accent;
  releaseDate: Date;
  timeline: { order: number; year?: number; setting?: string };
}

export interface SeriesTitleData {
  kind: 'series';
  title: string;
  accent: Accent;
}

export interface TitleLike {
  id: string;
  data: SelfContainedTitleData | SeriesTitleData;
}

export interface EpisodeLike {
  id: string;
  data: {
    title: string;
    series: { id: string };
    season: number;
    episode: number;
    accent?: Accent;
    releaseDate: Date;
    timeline: { order: number; year?: number; setting?: string };
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
  /* The in-universe year, where the content states one. Never sorted on — it is
     for grouping and labelling; `order` remains the only sort key. */
  year?: number;
  setting?: string;
  /* Episodes only — what a row needs to say where it belongs. */
  series?: { id: string; name: string; season: number; episode: number };
}

const isSelfContained = (
  title: TitleLike,
): title is TitleLike & { data: SelfContainedTitleData } => title.data.kind !== 'series';

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
    year: t.data.timeline.year,
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
      year: e.data.timeline.year,
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

/*
 * The reverse question: what refers to this unit?
 *
 * Threads are authored entity-first — "every appearance of the Soul Stone" is
 * one file — so the view a title page needs, "everything referenced in this
 * film", is a scan. That is the trade the model makes deliberately, and at this
 * size a scan over every entity and character costs nothing.
 */
export interface ReferenceSourceLike<A extends AppearanceLike = AppearanceLike> {
  id: string;
  data: { name: string; appearances: A[] };
}

export interface Reference<
  A extends AppearanceLike = AppearanceLike,
  S extends ReferenceSourceLike<A> = ReferenceSourceLike<A>,
> {
  source: S;
  appearance: A;
}

export function referencesTo<A extends AppearanceLike, S extends ReferenceSourceLike<A>>(
  key: string,
  sources: S[],
): Reference<A, S>[] {
  const found: Reference<A, S>[] = [];
  for (const source of sources) {
    for (const appearance of source.data.appearances) {
      if (refKey(appearance.unit) === key) found.push({ source, appearance });
    }
  }
  /* Alphabetical: there is no meaningful order among the things one film
     references, and a stable one keeps the built HTML diffable. */
  return found.sort((a, b) => a.source.data.name.localeCompare(b.source.data.name));
}

/* --- Characters ----------------------------------------------------------- */

/*
 * A character is present in two different ways, and a page has to show both as
 * one list.
 *
 * Cast records who *played* them, and lives on the title. Appearances record
 * references, and live on the character — most usefully a mention in a title
 * they never appear in, which a cast list cannot express. Where both describe
 * the same unit they are one row, not two: the cast side contributes the actor,
 * the authored side contributes the scene, the note and the more specific type.
 */
export interface CastMemberLike {
  character: { id: string };
  actor: { id: string };
  note?: string;
}

export interface CastCarrierLike {
  id: string;
  data: { cast: CastMemberLike[] };
}

/*
 * A title's cast, plus the kind that decides whether it can be a timeline row.
 *
 * A series carries a cast list — the regulars — but a series is not a point in
 * the chronology, so a credit on one cannot be placed on a timeline. Those are
 * reported separately by `seriesCredits` rather than dropped silently or, worse,
 * expanded across every episode: a regular is not in every episode, and
 * inventing appearances would be a lie the data does not support.
 */
export interface TitleCastLike extends CastCarrierLike {
  data: { kind: 'film' | 'short' | 'series'; cast: CastMemberLike[] };
}

export interface CharacterRow {
  unit: UnitRef;
  type: string;
  /* Set when the character was cast in this unit rather than only referred to. */
  actorId?: string;
  scene?: string;
  note?: string;
}

export function characterAppearances(
  characterId: string,
  authored: AppearanceLike[],
  titles: TitleCastLike[],
  episodes: CastCarrierLike[],
): CharacterRow[] {
  const rows = new Map<string, CharacterRow>();

  const addCast = (carriers: CastCarrierLike[], toRef: (id: string) => UnitRef) => {
    for (const carrier of carriers) {
      for (const member of carrier.data.cast) {
        if (member.character.id !== characterId) continue;
        const unit = toRef(carrier.id);
        rows.set(refKey(unit), {
          unit,
          type: 'appears',
          actorId: member.actor.id,
          note: member.note,
        });
      }
    }
  };

  addCast(
    titles.filter((title) => title.data.kind !== 'series'),
    (id) => ({ title: { id } }),
  );
  addCast(episodes, (id) => ({ episode: { id } }));

  for (const appearance of authored) {
    const key = refKey(appearance.unit);
    const existing = rows.get(key);
    rows.set(key, {
      unit: appearance.unit,
      type: appearance.type,
      actorId: existing?.actorId,
      scene: appearance.scene,
      note: appearance.note ?? existing?.note,
    });
  }

  return [...rows.values()];
}

/*
 * The series a character is a credited regular on.
 *
 * Shown as its own line rather than as timeline rows, because "is in this show"
 * is not a moment. The character's episode credits supply the actual positions.
 */
export function seriesCredits<T extends TitleCastLike>(
  characterId: string,
  titles: T[],
): T[] {
  return titles.filter(
    (title) =>
      title.data.kind === 'series' &&
      title.data.cast.some((member) => member.character.id === characterId),
  );
}

/*
 * The fragment id for a unit, so the timeline's jump rail and its rows agree on
 * one spelling. `unitKey` uses a colon, which is legal in a fragment but awkward
 * to write in a selector and easy to get wrong; this is plainly URL-safe.
 */
export function unitAnchor(unit: Pick<TimelineUnit, 'collection' | 'id'>): string {
  return `${unit.collection}-${unit.id}`;
}
