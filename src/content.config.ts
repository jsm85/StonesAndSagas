/*
 * Content collections and their schemas.
 *
 * Everything the catalogue knows is authored as files under `src/content/` and
 * validated here at build time. A missing field, a misspelled rating or a
 * pointer at a character who doesn't exist fails `npm run build` — the content
 * equivalent of a compile error, which is the whole reason we're on Astro
 * Content Collections rather than loading loose JSON at runtime.
 *
 * Five collections:
 *
 *   titles      films, TV series and shorts
 *   episodes    one entry per episode; a series' episodes, not the series,
 *               are what the timeline sorts
 *   reading     printed works — comic issues, collected editions, prose books
 *   people      everyone real: directors, actors, comic creators, authors —
 *               a flat lookup, so one JSON file
 *   characters  in-universe characters, first-class so that titles and reading
 *               entries alike point at one entity rather than a string
 *
 * `reference('people')` is the important primitive: it stores an id, checks at
 * build time that an entry with that id exists in that collection, and gives
 * the id a type. It is why an actor is a pointer rather than a repeated string.
 *
 * One caveat, verified against Astro 7.2 rather than assumed: a reference to a
 * missing entry is reported as `[ERROR] [content] Invalid content reference`
 * and the build still **exits 0**, so CI stays green and `getEntry` returns
 * undefined at render time. Schema validation proper — a bad enum, a missing
 * field, an unknown key — does exit non-zero. Read the build log when you
 * touch content; don't trust the exit code alone.
 */

import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
/* Astro re-exports Zod, so the version here always matches the one Astro
   validates with. `astro:content` also exports `z`, but that path is
   deprecated and goes away in Astro 8. */
import { z } from 'astro/zod';

/*
 * Every object below is a `strictObject`: an unrecognised key is an error, not
 * something quietly dropped. Zod's default is to strip unknown keys, which
 * would turn a misspelled field name — or a `timeline` written on a series,
 * which has no such concept — into content that silently does nothing. On a
 * schema whose job is to catch authoring mistakes at build time, that default
 * is the wrong one.
 */

/* -------------------------------------------------------------------------
 * Shared field types
 * ---------------------------------------------------------------------- */

/*
 * Which accent a title paints itself in. These are the three text-safe accents
 * from theme.css; violet is a fill colour and deliberately not offered here.
 */
const accent = z.enum(['magenta', 'cyan', 'amber']);

/*
 * One image, hosted by whoever owns it.
 *
 * Posters, banners and stills are Marvel-owned, and the project's IP rules
 * forbid committing them — so this is a *link*, never a path into the repo.
 * `source` is the official page the image belongs to, so nothing is ever shown
 * without somewhere to attribute it to.
 *
 * Every field here is optional at the title level. A title with no licensed
 * imagery is the normal case, and renders the procedural "plate" keyed to its
 * accent instead (see FeatureCard.astro for that pattern).
 */
const artwork = z.strictObject({
  url: z.url(),
  source: z.url(),
  /* Written for a reader who cannot see the image, not a caption. */
  alt: z.string().min(1),
});

const imagery = z.strictObject({
  /* Portrait key art — cards and list rows. */
  poster: artwork.optional(),
  /* Wide key art — the top of the title's own page. */
  banner: artwork.optional(),
  /* Everything else: scene stills, gallery shots. */
  stills: z.array(artwork).default([]),
});

/*
 * The certificate a title carries.
 *
 * Ratings are territory- and medium-specific: "12A" is BBFC, "PG-13" is the
 * MPA, "TV-14" is the US TV guidelines. Modelling them as one loose string
 * would let "PG13" or "12a" through, so each system enumerates its own ratings
 * and the system chooses which enum applies. Add a system here when you need
 * one rather than widening any of these lists.
 */
const certification = z.discriminatedUnion('system', [
  z.strictObject({
    system: z.literal('bbfc'),
    rating: z.enum(['U', 'PG', '12', '12A', '15', '18']),
  }),
  z.strictObject({
    system: z.literal('mpa'),
    rating: z.enum(['G', 'PG', 'PG-13', 'R', 'NC-17']),
  }),
  z.strictObject({
    system: z.literal('us-tv'),
    rating: z.enum(['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA']),
  }),
]);

/*
 * Where something sits in the in-universe chronology.
 *
 * `order` is a plain sort key, not a date: in-universe time is vague ("some
 * years after"), overlapping and occasionally circular, so a number that only
 * has to compare correctly beats a date that has to be defensible. Seed values
 * are spaced in hundreds so a title discovered to belong between two others can
 * be inserted without renumbering the catalogue.
 *
 * This cannot be derived from the release date — that is the entire point of
 * the timeline feature — so every timeline unit states it explicitly.
 */
const timelinePosition = z.strictObject({
  order: z.number(),
  /* Human-readable, for display: '1943 — occupied Europe'. */
  setting: z.string().optional(),
  /* Why it sits here, when that isn't obvious — framing devices, flashbacks. */
  note: z.string().optional(),
});

/*
 * One casting: a character, and the actor who played them in this title.
 *
 * Both sides are references, so "Tony Stark" is one entity with one page
 * rather than a string retyped in a dozen files.
 */
const castMember = z.strictObject({
  character: reference('characters'),
  actor: reference('people'),
  /* Credit order, if it matters for display. Lower is billed higher. */
  billing: z.number().int().positive().optional(),
  /* Qualifies the performance: 'voice only', 'younger self', 'uncredited'. */
  note: z.string().optional(),
});

const cast = z.array(castMember).default([]);

/* Fields every kind of title carries, whatever shape it takes on screen. */
const titleCommon = {
  title: z.string().min(1),
  /* One or two sentences for cards and list rows. The full plot goes in the
     Markdown body, where it belongs — content is data, not markup. */
  summary: z.string().min(1),
  accent: accent.default('magenta'),
  images: imagery.default({ stills: [] }),
  cast,
};

/*
 * Fields shared by the kinds that occupy a single slot on the timeline and run
 * once, end to end: films and shorts. A series has none of these — see below.
 */
const selfContained = {
  ...titleCommon,
  /* First public release: theatrical opening, or the disc/stream it debuted
     on for a short. Stored as a date and always formatted in UTC — a
     local-time render turns 2008-05-02 into 1 May for anyone west of London. */
  releaseDate: z.coerce.date(),
  runtimeMinutes: z.number().int().positive(),
  certification: certification.optional(),
  directors: z.array(reference('people')).min(1),
  timeline: timelinePosition,
};

/*
 * A month, as `YYYY-MM`.
 *
 * A comic's cover date is a month, and is not the date it reached shops. Storing
 * a full date would be inventing precision we don't have, so this is a string
 * with a shape rather than a `Date`. YAML leaves `1963-03` alone — it only
 * coerces a complete date — but quote it anyway when authoring.
 */
const yearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected a month as YYYY-MM');

/*
 * One credit on a printed work.
 *
 * `person` points at the same `people` collection the films use, so Stan Lee is
 * one entity whether he is credited on a comic or on a film — the same argument
 * that makes characters first-class rather than strings.
 */
const credit = z.strictObject({
  person: reference('people'),
  role: z.enum([
    'writer',
    'penciller',
    'inker',
    'artist',
    'colourist',
    'letterer',
    'coverArtist',
    'editor',
    'author',
  ]),
});

/*
 * Why a printed work is worth reading alongside a screen title.
 *
 * The relationship is enumerated rather than prose because it decides how the
 * recommendation is grouped and labelled — "Adapted from", "First appearance" —
 * and a free-text field cannot be grouped on. The note says why in our own
 * words, and is where the actual recommendation lives.
 */
const relatedTitle = z.strictObject({
  /* Recommendations attach to a title, including a series as a whole, rather
     than to an individual episode. Revisit if a single episode ever needs its
     own reading list. */
  title: reference('titles'),
  relationship: z.enum([
    /* The screen title tells this story. */
    'adapts',
    /* Where a character, object or idea first appeared in print. */
    'introduces',
    /* Informed the tone or direction without being adapted. */
    'inspires',
    /* Goes further into material the screen title covers. */
    'expands',
    /* Useful context rather than a direct connection. */
    'background',
  ]),
  note: z.string().min(1).optional(),
});

/* -------------------------------------------------------------------------
 * Collections
 * ---------------------------------------------------------------------- */

/*
 * Films, TV series and shorts.
 *
 * A discriminated union rather than one schema with everything optional: the
 * three kinds genuinely differ, and the union makes the differences structural.
 * A series has no `runtimeMinutes` and no `timeline` — not "usually empty", but
 * rejected by the build if written — because a series does not occupy one
 * position in the chronology. Its episodes do, and they carry their own.
 */
const titles = defineCollection({
  loader: glob({ base: './src/content/titles', pattern: '**/*.md' }),
  schema: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('film'),
      ...selfContained,
    }),
    z.strictObject({
      kind: z.literal('short'),
      ...selfContained,
    }),
    z.strictObject({
      kind: z.literal('series'),
      ...titleCommon,
      /* A series spans a run of transmission dates rather than having one
         release date. `lastAired` is absent while a series is still running. */
      firstAired: z.coerce.date(),
      lastAired: z.coerce.date().optional(),
      /* Series-level credit. Episode directors live on the episodes; the
         person with a claim over the whole thing is its creator. */
      creators: z.array(reference('people')).default([]),
      certification: certification.optional(),
    }),
  ]),
});

/*
 * Episodes — the timeline unit for anything serialised.
 *
 * This is the piece that films-only thinking gets wrong, so it exists from the
 * start: a series' episodes are frequently interleaved with other titles in
 * chronological order, which is impossible to express if a series is one entry.
 * Anything that points at "a moment on the timeline" — a cross-reference, a
 * timeline row — points at a film, a short, or an entry here.
 */
const episodes = defineCollection({
  loader: glob({ base: './src/content/episodes', pattern: '**/*.md' }),
  schema: z.strictObject({
    title: z.string().min(1),
    /* The series this belongs to. Nothing checks that the referenced title is
       of kind 'series' rather than a film — that needs the build-time guard
       described at the top of this file, which is logic and so waits on a test
       runner. */
    series: reference('titles'),
    season: z.number().int().positive(),
    episode: z.number().int().positive(),
    summary: z.string().min(1),
    /* First transmission or stream. */
    releaseDate: z.coerce.date(),
    runtimeMinutes: z.number().int().positive(),
    certification: certification.optional(),
    directors: z.array(reference('people')).min(1),
    cast,
    /* Omitted means "whatever the series uses" — set it only to override. */
    accent: accent.optional(),
    images: imagery.default({ stills: [] }),
    timeline: timelinePosition,
  }),
});

/*
 * Reading: comic issues, collected editions and prose books.
 *
 * The printed half of the catalogue, and what the recommended-reading feature
 * surfaces from a title. Named `reading` rather than `comics` because prose
 * books belong here too.
 *
 * Note what this schema does *not* have: any imagery field at all. The IP rules
 * allow titles, issue numbers and creator credits — those are facts — but not
 * cover images or solicitation copy. So a cover has nowhere to go, summaries are
 * written in our own words, and `official` links out to the publisher instead.
 * That is a deliberate difference from `titles`, which does model external
 * poster links.
 *
 * The recommendation lives here rather than on the screen title: adding a comic
 * is one new file instead of a new file plus an edit to every film it relates
 * to, and one work can be recommended from several titles at once.
 */
const readingCommon = {
  title: z.string().min(1),
  /* Our own words. Never the publisher's solicitation copy. */
  summary: z.string().min(1),
  publisher: z.string().min(1).optional(),
  /* Cover date for an issue, publication month otherwise. */
  published: yearMonth,
  creators: z.array(credit).default([]),
  /* Who appears in it — the reason a character's page can list a film, an
     episode and a comic issue side by side. */
  characters: z.array(reference('characters')).default([]),
  /* The publisher's own page for the work, to link out to rather than
     reproducing anything from it. */
  official: z.url().optional(),
  /* At least one: a work related to nothing has nowhere to surface, so it would
     be content nobody can reach. */
  related: z.array(relatedTitle).min(1),
};

/* Digits only, no hyphens — one way of writing it, so ids stay comparable. */
const isbn = z
  .string()
  .regex(/^(?:\d{9}[\dX]|\d{13})$/, 'Expected an ISBN-10 or ISBN-13, digits only');

const reading = defineCollection({
  loader: glob({ base: './src/content/reading', pattern: '**/*.md' }),
  schema: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('issue'),
      ...readingCommon,
      /* The comic series it belongs to, as printed on the cover. Not a
         reference: a run's title is not itself an entry here. */
      series: z.string().min(1),
      /* A string, not a number — annuals, decimals and `#1.MU` all exist. */
      issueNumber: z.string().min(1),
    }),
    z.strictObject({
      kind: z.literal('collection'),
      ...readingCommon,
      /* What's inside, as a reader would ask for it: 'The Vision #1-12'. */
      collects: z.string().min(1),
      isbn: isbn.optional(),
    }),
    z.strictObject({
      kind: z.literal('book'),
      ...readingCommon,
      isbn: isbn.optional(),
    }),
  ]),
});

/*
 * People: everyone real — directors, actors, comic creators, authors.
 *
 * Flat reference data — an id and a name — so it is one JSON file rather than
 * a directory of files that would each hold a single line of frontmatter. One
 * collection for all of them, so a person credited on both a film and a comic
 * is one entry.
 * These are real, living people; the collection deliberately has nowhere to
 * put biography, and there is no reason for it to grow one.
 */
const people = defineCollection({
  loader: file('./src/content/people.json'),
  schema: z.strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
});

/*
 * Characters — first-class entries, not strings inside cast lists.
 *
 * They are also the first of the "referenceable things" the cross-reference
 * feature needs: stones, objects and events will follow the same shape. Titles,
 * episodes and reading entries all point here, which is what lets a character's
 * page gather appearances across media. The body of each file is an original
 * description written for this site.
 */
const characters = defineCollection({
  loader: glob({ base: './src/content/characters', pattern: '**/*.md' }),
  schema: z.strictObject({
    name: z.string().min(1),
    /* Aliases, code names, titles — 'Iron Man', 'the Red Skull'. */
    aka: z.array(z.string()).default([]),
    summary: z.string().min(1),
  }),
});

export const collections = { titles, episodes, reading, people, characters };
