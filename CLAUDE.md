# CLAUDE.md

Guidance for Claude Code and other AI assistants working in this repository.

Read the two hard rules first — [Workflow: issue before code](#workflow-issue-before-code-hard-rule)
and [Fan-content and IP rules](#fan-content-and-ip-rules-hard-rule). Everything
else is convention; those two are not.

## Naming: the site is "Stones & Sagas"

The product name contains an ampersand; the repository name does not, only
because `&` is awkward in a URL. Use the right form for the context:

| Context | Form |
| --- | --- |
| User-facing copy — `<title>`, headings, meta tags, README prose, site chrome | **Stones & Sagas** |
| Repository, GitHub URLs, clone paths | `StonesAndSagas` |
| Package name, directory and file names, CSS classes, slugs, IDs | `stones-and-sagas` |

Never render the site name to a visitor as "StonesAndSagas". In HTML, write the
ampersand as `&amp;` where the context requires escaping.

## Status: styled scaffold with a content model, seed content only [current]

The project is scaffolded, styled and deploys. The content model exists and is
enforced at build time; what it holds is a **small seed set proving the schema**,
not a catalogue. Tracked contents:

```
.
├── .github/workflows/
│   ├── ci.yml           # PR: install, typecheck, build
│   └── deploy.yml       # push to main: build, deploy to Pages
├── public/
│   └── favicon.svg      # self-made abstract mark, no Marvel imagery
├── src/
│   ├── components/
│   │   ├── CosmicBackdrop.astro  # starfield + CRT scanline layers
│   │   ├── FeatureCard.astro     # card with a procedural "plate" image
│   │   ├── SiteFooter.astro      # carries the fan-project disclaimer
│   │   └── SiteHeader.astro      # sticky wordmark + telemetry pill
│   ├── content/         # the catalogue itself
│   │   ├── characters/  # one .md per character
│   │   ├── entities/    # one .md per object, place, reality, group, event
│   │   ├── episodes/    # one .md per episode — a timeline unit
│   │   ├── reading/     # one .md per comic issue, collection or book
│   │   ├── titles/      # one .md per film, series or short
│   │   └── people.json  # flat lookup: everyone real, screen and print
│   ├── content.config.ts  # collection definitions + Zod schemas
│   ├── layouts/
│   │   └── Base.astro   # shared page shell
│   ├── pages/
│   │   └── index.astro  # landing page — styled, still content-free
│   └── styles/
│       ├── fonts/       # self-hosted woff2 subsets + OFL licence
│       └── theme.css    # design tokens and base elements
├── astro.config.mjs
├── package.json
├── package-lock.json
├── tsconfig.json
├── LICENSE
├── README.md
└── CLAUDE.md
```

Not built yet: a real catalogue, cross-reference records, and every page beyond
the landing page — nothing yet renders the content collections.

Section tags below tell you how much to trust each one:

- **[current]** — true today, verified against the repo.
- **[decided]** — the owner has chosen this, but it is *not built yet*. Follow it
  when you build; do not describe it as if it already exists.
- **[convention]** — a sensible default. Follow it unless the owner says otherwise.

## What the project is [current]

Stones & Sagas is a **MARVEL fan static site, built for fun**.

- **Static.** No server, no database, no backend runtime. Everything is resolved
  at build time into HTML/CSS/JS that any file host can serve.
- **A personal hobby project.** Favour small, readable, dependency-light
  solutions. Every dependency is a maintenance cost carried by one person.
- **Owner context.** The owner is a .NET developer who is comfortable with
  JavaScript and TypeScript. Prefer typed, schema-validated, compile-time-checked
  approaches — they map onto habits he already has. Don't assume deep familiarity
  with the JS build-tool ecosystem; when you introduce a tool, say what it does
  and why it's there.

## What the site does [decided — not yet built]

Stones & Sagas lets people explore the **characters and screen titles of the
Marvel Cinematic Universe** — **films, TV shows and shorts**, not films alone.
Three features beyond a plain catalogue:

- **Timeline ordering** — view titles in in-universe chronological order, not
  just release order. The two differ substantially.
- **Cross-references between titles** (the headline feature) — pick a thread (an
  Infinity Stone, an object, a character, an event) and see every title and
  scene that references it, in timeline order. "Every appearance of the Soul
  Stone, in order" is the shape of it.
- **Recommended reading** — from a title, surface the comics worth reading
  alongside it.

**Terminology:** "title" is the umbrella term for anything on screen. Prefer it
over "film" in code, schemas and copy — the catalogue is not films-only, and
naming a collection `films` is a rename waiting to happen. Three kinds:

| Kind | Timeline unit | Note |
| --- | --- | --- |
| Film | the title itself | one position on the timeline |
| TV show | **the episode** | a series spans many timeline positions, often interleaved with other titles |
| Short | the title itself | e.g. the One-Shots; brief, but they carry real cross-references |

**This shapes the data model, so read it before designing any schema.** The
cross-reference feature is not a view-layer concern. A flat per-title record
cannot answer "every scene referencing the Soul Stone in timeline order". See
[Content and data model](#content-and-data-model-current-except-cross-references)
for what that requires.

Also note for the [IP rules](#fan-content-and-ip-rules-hard-rule): the
recommended-reading feature means handling comic metadata. Titles, issue numbers
and creator credits are facts and fine to store. Cover images and solicitation
copy are not — link out to an official source instead of copying either. The
`reading` schema enforces this by having nowhere to put a cover; see
[What exists today](#what-exists-today-current).

## Workflow: issue before code [HARD RULE]

**Every change starts as a GitHub issue, opened and agreed before any code is
committed or any PR is raised.** No exceptions for "small" changes.

The loop, in order:

1. **Open an issue** describing the feature or fix — what and why, plus
   acceptance criteria concrete enough to tell when it's done.
2. **Wait for the owner** to confirm scope. Do not start implementing while the
   issue is still under discussion.
3. **Branch** from up-to-date `main`.
4. **Commit** work to that branch, referencing the issue (`Refs #12`).
5. **Open a PR** whose body closes the issue (`Closes #12`) and states what was
   verified and how.
6. **Update docs in the same PR** — see [Document as you go](#document-as-you-go).

Notes:

- One issue per coherent unit of work. If a task grows past its issue's scope,
  open a follow-up issue rather than widening the PR.
- If asked to implement something with no issue yet, create the issue first (or
  ask the owner to), then proceed — surfacing this rather than silently skipping
  the step.
- Never commit directly to `main`.

## Git workflow [current]

- Default branch: `main`. Remote: `https://github.com/jsm85/StonesAndSagas`.
- Branch naming:
  - Owner / general work: `feat/<issue-number>-<slug>`, `fix/<issue-number>-<slug>`,
    `docs/<issue-number>-<slug>`.
  - Claude Code sessions: `claude/<topic>-<id>` (e.g.
    `claude/claude-md-documentation-9sj39e`). Push **only** to the branch the
    session was assigned.
- Push with `git push -u origin <branch-name>`.
- Commit and push only when asked. Open a PR only when explicitly requested.
- Write clear, imperative commit messages: what changed and why.
- **Commit author email:** the account has GitHub email privacy enabled, so
  pushes carrying the owner's real address are rejected with
  `push declined due to email privacy restrictions`. Use
  `1835096+jsm85@users.noreply.github.com`.

## Fan-content and IP rules [HARD RULE]

This is a fan site for a franchise owned by Marvel/Disney. Treat these as
non-negotiable:

- **Never commit copyrighted media** — no Marvel-owned images, comic scans, film
  stills, posters, logos, fonts, audio, or video. Use public-domain or self-made
  assets, or link/embed from an official source.
- **Never copy prose** from Marvel wikis, Fandom, Wikipedia, comics, or scripts.
  Write original summaries in your own words.
- **Never imply official affiliation.** No Marvel/Disney branding or trade dress.
  Keep a visible "unofficial fan project" disclaimer in the site footer.
- If a task can't be done without breaking one of these, **say so and propose an
  alternative** instead of committing the asset.

## Tech stack [current]

**Astro + TypeScript**, installed and building. Chosen because it ships zero
JavaScript by default (a good fit for a content site on Pages), is
TypeScript-first, and its Content Collections validate content against Zod
schemas at build time — typed content models, which suits the owner's .NET
background.

Installed: `astro` (^7), plus `@astrojs/check` and `typescript` as dev
dependencies for the typecheck step. `tsconfig.json` extends
`astro/tsconfigs/strict`.

Constraints that still apply:

- Keep the dependency surface small. Astro plus what it needs; justify anything
  further in the issue before adding it.
- No CSS framework by default — plain modern CSS (nesting, custom properties,
  grid) until there's a concrete reason otherwise.
- Prefer Astro components rendering to static HTML. Only reach for a client-side
  framework island if a feature genuinely needs interactivity, and say why.

Layout — directories marked *(not yet created)* should be added only when you
actually need them:

```
astro.config.mjs
package.json
tsconfig.json
src/
  pages/          # routes
  layouts/        # shared page shells
  components/     #
  content/        # content collections
  content.config.ts  # Zod schemas
  styles/         # theme.css tokens + fonts/
public/           # static assets copied verbatim
.github/workflows/
```

## Design language [current]

The site's look is an **80s Guardians-of-the-Galaxy space aesthetic**, set by a
design mock the owner supplied. Everything it needs lives in
`src/styles/theme.css` as CSS custom properties.

**The rule: components reference tokens, never literals.** If you find yourself
typing a colour or a font stack into a component, the token is missing — add it
to `theme.css` instead. That is the whole point of the file.

### Palette

Colours are **oklch**, not hex. It keeps the palette perceptually even — the
three accents sit at the same lightness, so none shouts over the others — and a
lighter or darker variant is an edit to one number rather than a guess.

| Token | Role |
| --- | --- |
| `--sas-void`, `--sas-void-deep` | The indigo ground everything sits on |
| `--sas-panel-top`, `--sas-panel-bottom` | The faint vertical gradient inside cards and panels |
| `--sas-magenta`, `--sas-magenta-bright` | Primary accent — leads |
| `--sas-cyan`, `--sas-cyan-bright` | Secondary — links, hover states, "good" status |
| `--sas-amber` | Third voice. Used sparingly, or it stops reading as an accent |
| `--sas-violet` | Nebula and gradient fills, not text |
| `--sas-text`, `--sas-text-muted`, `--sas-text-dim` | The three text levels |
| `--sas-hairline*`, `--sas-glow-*` | 1px borders and the glows behind them |

Every foreground token was checked against `--sas-void` for **WCAG AA**; the
lowest, `--sas-text-dim`, lands at 6.5:1. Keep it that way — if you add a colour,
check it rather than eyeballing it against a dark background, where everything
looks fine and much of it isn't.

### Typography

Three faces, each with exactly one job:

- **Michroma** (`--sas-font-display`) — the wordmark and display numerals.
  Uppercase, wide, unmistakably 80s sci-fi. Never body text.
- **Space Grotesk** (`--sas-font-body`) — headings and prose. Variable, 400–700.
- **IBM Plex Mono** (`--sas-font-mono`) — every label, stamp, status and piece of
  metadata. **Always uppercase with heavy tracking** (`--sas-track-wide`
  through `--sas-track-widest`). This is the single most recognisable thing
  about the design; when in doubt about a small piece of metadata, it is mono.

All three are **self-hosted** from `src/styles/fonts/`, latin subsets, ~55 KB
total. They sit under `src/` rather than `public/` so Vite fingerprints them and
applies the `/StonesAndSagas/` base — plain CSS cannot interpolate `BASE_URL`.
All are SIL OFL 1.1; `fonts/OFL.txt` must stay alongside them. Only ship weights
the site actually uses.

### Motifs

The recurring vocabulary, so new pages look like the same site:

- **Starfield and scanlines** — `CosmicBackdrop.astro`, fixed to the viewport.
  Fixed rather than absolute: it keeps the stars still while content scrolls,
  and avoids putting an `overflow` ancestor above the sticky header.
- **Nebula bloom** — a soft three-colour radial behind hero content. Size it in
  `vw`, not `%` of its container, or it overflows the document on narrow
  viewports and produces a horizontal scrollbar.
- **The Outrun grid** — a grid tipped back with `perspective(300px) rotateX()`,
  scrolling toward the viewer, masked out at the top so it has no hard edge.
- **Hairlines over boxes** — 1px translucent violet borders, with a magenta or
  cyan left edge on panels. Never heavy borders or large radii.
- **Cyan on hover** — magenta at rest, cyan on interaction, throughout.
- **Mono stamps** — wide uppercase eyebrows and status lines, often with a
  dotted leader running out to a value.

### Motion

Ambient loops (`sas-drift`, `sas-pulse`, `sas-horizon`) are defined in
`theme.css` with their durations as tokens. **`prefers-reduced-motion: reduce`
must switch all of them off** — the design runs several at once, which is a lot
for anyone who has asked for less. The global block at the foot of `theme.css`
handles this; do not add an animation that escapes it.

### Images, and why there mostly aren't any

The mock puts a poster or a film still in every card. **We cannot ship those** —
see the [IP rules](#fan-content-and-ip-rules-hard-rule). The established
alternative is a **plate**: an abstract, procedurally drawn CSS gradient keyed
to an accent colour, as in `FeatureCard.astro`. Self-made by construction,
weighs nothing, and holds the composition the design wants. Prefer a plate over
hunting for a "safe" image. Avoid hard full-width edges in one — they read as a
progress bar rather than as light.

## Content and data model [current, except cross-references]

No database and no runtime API: **all content ships with the build.**

- **Primary format: Markdown with YAML frontmatter**, one file per entry, inside
  Astro Content Collections, with a **Zod schema per collection** in
  `src/content.config.ts`. A typo in a field name or a missing required field
  should fail the build, not reach the page.
- **Lookup tables** — small, flat, genuinely tabular reference data — may be JSON
  or CSV imported at build time. CSV is reasonable when the owner wants to
  bulk-edit rows in a spreadsheet; it is a poor fit for nested fields or prose,
  so don't force narrative content into it.
- Content is data, not markup: keep presentation in components and layouts, not
  embedded in frontmatter.
- Define the schema before authoring a pile of entries — retrofitting one across
  many files is the expensive path.

**What the cross-reference feature requires.** The headline feature in
[What the site does](#what-the-site-does-decided--not-yet-built) constrains the
schema from day one:

- **Referenceable things are first-class entries with stable IDs** — stones,
  objects, characters, events — not free text repeated inside each title. "The
  Soul Stone" written into twelve titles as a string cannot be queried, and
  cannot be renamed.
- **References are their own records**, each pointing at a *timeline unit* and a
  referenced entity, carrying enough context to render one timeline row: which
  scene or moment, and what the reference actually is. **Built, with one
  departure:** they are not separate files. Each is a row in the `appearances`
  list on the entity it concerns, which keeps a thread readable and checkable in
  one place and makes adding an entity a single new file. The record still holds
  everything a timeline row needs.
- **A TV show is not one timeline entry — its episodes are.** This is the main
  thing films-only thinking gets wrong. A film or short occupies a single
  timeline position; a series spans many, frequently interleaved with other
  titles. So the thing a reference points at, and the thing the timeline sorts,
  is a film, a short, *or an episode* — not a series. Model that from the start;
  bolting episodes on afterwards means reworking every reference record.
- **Every timeline unit needs two orderings** — release date *and* in-universe
  position. The timeline feature depends on the latter, and it cannot be derived
  from the former. Episodes need their own in-universe position, not just their
  series'.
- **Reference integrity belongs in the schema.** Use Zod's `reference()` so a
  pointer to a stone that doesn't exist is caught rather than shipped. This is
  the concrete reason the core content is frontmatter and not CSV: a dead
  cross-reference should surface at build time, not as a broken link in
  production. **But see the caveat below — it does not currently fail the
  build.**

Flat, genuinely tabular side data (a lookup of release dates, say) can still be
CSV or JSON. The relational core cannot.

### What exists today [current]

`src/content.config.ts` defines four collections. `titles` is a Zod
**discriminated union on `kind`**, so the three kinds differ structurally rather
than by convention:

| Collection | Loader | Holds |
| --- | --- | --- |
| `titles` | `glob` over `src/content/titles` | films, series, shorts |
| `episodes` | `glob` over `src/content/episodes` | one entry per episode |
| `reading` | `glob` over `src/content/reading` | comic issues, collected editions, prose books |
| `entities` | `glob` over `src/content/entities` | objects, locations, realities, organisations, events |
| `people` | `file` over `src/content/people.json` | everyone real: directors, actors, comic creators, authors |
| `characters` | `glob` over `src/content/characters` | in-universe characters |

Decisions worth knowing before you extend it:

- **A series carries no `timeline` and no `runtimeMinutes`.** Those fields are
  not merely unset on a series — the union rejects them, because a series is not
  a point in the chronology. Its episodes are, and each carries its own
  `timeline.order`. Sorting films, shorts and episodes together by that key is
  what interleaves a season with the films around it.
- **`timeline.order` is a bare sort key, not a date.** In-universe time is vague
  and occasionally circular; a number only has to compare correctly. Seed values
  are spaced in hundreds so a title can be inserted without renumbering.
- **Every schema is a `strictObject`.** Zod's default is to *strip* unknown keys,
  which would silently swallow a misspelled field name. Strict turns that into a
  build failure — verified: `runtimeMins` fails with `Unrecognized key`.
- **Cast is `{ character, actor }` reference pairs in the title's frontmatter**,
  not a separate `castings` collection. A character's filmography is derived by
  scanning titles. Revisit if per-episode cast overrides get unwieldy.
- **Certification is a discriminated union over rating systems** (`bbfc`, `mpa`,
  `us-tv`), each with its own enumerated ratings, so `PG-13` under `bbfc` fails.
- **Imagery is links, never files.** `poster`, `banner` and `stills` each hold an
  absolute URL plus the official `source` page and `alt` text. Nothing is
  committed — see the [IP rules](#fan-content-and-ip-rules-hard-rule). Seed
  content ships none at all; a title with no imagery renders the accent-keyed
  plate, which is the expected case rather than a fallback.
- **Prose lives in the Markdown body**, with a one-or-two-sentence `summary` in
  frontmatter for cards.
- **`reading` is a second union on `kind`** — `issue`, `collection`, `book` — so a
  prose book cannot carry an issue number. It is named `reading` rather than
  `comics` because prose books belong in it too.
- **A reading entry has no imagery field at all.** Titles model external poster
  links; reading entries deliberately cannot, because covers and solicitation
  copy are the parts of a comic the [IP rules](#fan-content-and-ip-rules-hard-rule)
  exclude. `official` links out to the publisher instead.
- **The recommendation lives on the reading entry**, as `related: [{ title,
  relationship, note }]`, not as a list on each film. Adding a comic is then one
  new file rather than a file plus edits to every title it relates to, and one
  work can be recommended from several. `relationship` is enumerated (`adapts`,
  `introduces`, `inspires`, `expands`, `background`) because it decides how a
  recommendation is grouped and labelled; free text cannot be grouped on. At
  least one relation is required — a work related to nothing cannot surface.
- **Recommendations attach to titles, not episodes.** A series can be
  recommended against as a whole. Revisit if an individual episode ever needs
  its own list.
- **Comic creators are `people`**, with a role enum, so a person credited on both
  a film and a comic is one entry. This is what lets a character's page gather a
  film, an episode and an issue: all three point at the same character id.
- **A cover date is a month (`YYYY-MM`), not a date.** It is also not the day the
  issue reached shops, so storing one would invent precision.
- **`entities` is one collection with a `kind` union, not five collections.** An
  appearance points at exactly one referenceable thing, and `reference()` names a
  single collection — five would force an unvalidated `{ type, id }` pair or five
  optional fields. `designation` is rejected on anything but a `reality`, and a
  `timeline` block on anything but an `event`.
- **Appearances live on the entity**, as `appearances: [{ unit, type, scene,
  note }]`. "Every appearance of the Soul Stone, in order" is then one file to
  read and check. `characters` carries the identical field, so "every appearance
  of X" is one code path whether X is a person or a stone — and it captures what
  a cast list cannot: a character *mentioned* in a title they never appear in.
- **A reality is both an entity and a timeline property.** `timeline.order` alone
  assumes one linear chronology, which multiverse material breaks, so
  `timelinePosition` carries an optional `reality` pointer. Omitted means
  Earth-616, which is why nothing authored before it had to change.
- **`partOf` is set membership, not a relationship graph.** It gives you "all six
  stones" from one field, and deliberately nothing else: the Tesseract *contains*
  the Space Stone, and that nuance lives in prose rather than in a single-parent
  pointer forced to mean two things.
- `import { z } from 'astro/zod'`, not from `astro:content` — the latter is
  deprecated and goes in Astro 8. Astro 7 ships Zod 4, where `.default()` takes
  the **output** value: `imagery.default({ stills: [] })`, not `{}`.

Note that a reading recommendation is *not* a cross-reference: "read this
alongside that" and "this scene references the Soul Stone" are different
relationships, and they are modelled separately — `related` on a reading entry,
`appearances` on an entity.

Not built: anything that *renders* this. Resolving appearances across `titles`
and `episodes` and sorting them into timeline order is the first real logic in
the project, so it ships with the page that needs it and with tests — which
means a test runner (#7) lands first.

### Caveat: a dead reference does not fail the build [current]

Verified against Astro 7.2: a `reference()` pointing at an entry that does not
exist logs

```
[ERROR] [content] Invalid content reference: entry "iron-man" in collection
"titles" (field: cast[2].character) references "obadiah-stain" in collection
"characters", but that entry does not exist.
```

…and then **exits 0**. Both `npm run build` and `npm run check` do this, and so
does a build whose page resolves the reference via `getEntry` — the entry simply
comes back `undefined`. CI greps nothing, so a broken pointer merges green.

Schema validation proper — a bad enum, a missing required field, an unknown key
— *does* fail with a non-zero exit. It is only referential integrity that
doesn't. Until that gap is closed, do not claim references are build-enforced,
and read the build log rather than trusting the exit code when you touch
content.

**Worse inside a discriminated union.** A `reference()` nested in a
`z.discriminatedUnion` is not checked at all — no error, no log line, nothing.
Every other position at least logs. A plain `z.union` *is* walked, which is why
`timelineUnit` is one:

```ts
z.union([
  z.strictObject({ title: reference('titles') }),
  z.strictObject({ episode: reference('episodes') }),
])
```

That shape also makes "exactly one of the two" structural — neither and both are
build failures. Prefer a plain union over a discriminated one wherever a
reference sits inside it; the discriminator costs you the only check there is.

## Local development [current]

Requires **Node.js >=22.12.0** (Astro 7's floor; recorded in `package.json`
under `engines` and pinned to 22 in both workflows).

```bash
npm install      # or `npm ci` for an exact install from the lockfile
npm run dev      # dev server with hot reload
npm run check    # astro check — typecheck .astro/.ts
npm test         # vitest run — the unit suite, once
npm run test:watch  # vitest, left running
npm run build    # production build to dist/
npm run preview  # serve the built output locally
```

All of them were run in this repository and succeed. `npm run dev` and
`npm run preview` serve under the base path — the site is at
**`http://localhost:4321/StonesAndSagas/`**, and `http://localhost:4321/`
correctly 404s. That is the base path working, not a bug.

> **Note for AI assistants in sandboxed sessions:** `npm create astro@latest`
> does not work behind the agent proxy — it fetches templates from
> codeload.github.com, which returns 403 while the npm registry is reachable.
> This scaffold was written by hand and `astro` installed from npm. Don't burn
> time retrying the scaffolder.

## Deployment: GitHub Pages [current]

The site deploys to GitHub Pages via GitHub Actions on every push to `main`.
**Merging to `main` publishes.** Live at
`https://jsm85.github.io/StonesAndSagas/`.

`jsm85.github.io` is already the owner's user site, so this repo deploys as a
**project site** at `https://jsm85.github.io/StonesAndSagas/`. That has one
consequence that breaks first deploys, so get it right up front:

- Both are set in `astro.config.mjs`:
  ```js
  site: 'https://jsm85.github.io',
  base: '/StonesAndSagas',
  ```
- **Never hardcode absolute root-relative paths** (`/assets/logo.svg`) in links,
  images, or CSS — they resolve above the base path and 404 in production while
  working locally. Use Astro's `import.meta.env.BASE_URL`, or let Astro handle
  asset URLs via imports.
- In repo Settings → Pages, the build source must be **GitHub Actions**, not a
  branch. Deploying from a branch runs Jekyll, which strips the underscore-prefixed
  `_astro/` directory and silently breaks styling.
- `src/pages/index.astro` shows the pattern for referencing a `public/` asset
  safely — derive it from `import.meta.env.BASE_URL`, never a literal `/path`.
- Verify a production build locally (`npm run build && npm run preview`) before
  relying on the deploy.

The site is public. Anything merged to `main` is visible immediately — there is
no staging step, so treat `main` as production.

## CI/CD [current]

Workflows live in `.github/workflows/`:

- **`ci.yml`** — on pull requests: `npm ci`, `npm run check`, `npm run build`.
  A PR that doesn't build should not be mergeable.
- **`deploy.yml`** — on push to `main`: builds, uploads the Pages artifact and
  deploys. Carries `permissions: { contents: read, pages: write, id-token: write }`
  and a `pages` concurrency group with `cancel-in-progress: false`, so a running
  deploy finishes rather than being cancelled halfway.

Both pin Node to 22 and use `cache: npm`. Both are also `workflow_dispatch`able
for manual runs.

Keeping CI honest is part of every change:

- Add a new script or check → **wire it into `ci.yml` in the same PR.**
- Change how the project builds or what it needs → update the workflows *and*
  the [Local development](#local-development-current) section together.
- Pin the Node version in the workflow and keep it consistent with what local
  development assumes.
- CI must never depend on a secret or an external service the owner hasn't set
  up. A static fan site needs neither.

## Testing and verification

**Every check-in ships unit tests for the behaviour it adds or changes.** Tests
are part of the change, in the same PR — not a follow-up, not a separate issue.

The carve-out, and only this one: changes with **no logic** — documentation,
content entries, styling, copy — don't need unit tests, because there is nothing
to assert. Everything with behaviour does. If you think a change is exempt, say
so explicitly and why; don't skip quietly.

What deserves a unit test here, concretely: timeline ordering and sorting,
cross-reference resolution and grouping, schema validation and transforms, date
and URL helpers, anything parsing or reshaping content. Astro components
rendering static markup mostly don't.

**The runner is Vitest** [current], installed as a dev dependency and wired into
`ci.yml` between the typecheck and the build. `npm test` runs it once;
`npm run test:watch` leaves it running. Tests live beside the code they cover as
`src/**/*.test.ts` — no separate tree, because a helper and its tests being
adjacent is what makes anyone open them.

Astro is Vite-based, so Vitest needs almost no configuration. `vitest.config.ts`
sets exactly one thing, and it is worth knowing about:

```ts
process.env.TZ = 'America/Los_Angeles';
```

Release dates are authored as bare days (`2008-05-02`) and parsed as midnight
UTC. Rendered in local time they come out as 1 May for anyone west of Greenwich —
every release reported a day early, on a site about chronology. The formatters in
`src/lib/format.ts` pin the zone to UTC; running the suite in a US timezone is
what makes removing that pin fail the tests on a UK machine, where the bug is
otherwise invisible. Verified by mutation: deleting the pin fails with
`expected '1 May 2008' to be '2 May 2008'`.

Verification rules that apply regardless:

- Never call a change "tested" when no test ran. State exactly what you did:
  which command, which page, what you looked at.
- If a change can't be verified in this environment, say so plainly rather than
  implying it works.
- When you add the test runner or a linter, document the real command here and
  add it to `ci.yml` in the same PR.

## Document as you go

Documentation is part of the change, not a follow-up:

- **CLAUDE.md** — update the relevant section in the same PR whenever you add a
  dependency, script, directory, workflow, or convention. Move sections from
  [decided] to [current] once they're actually built, and delete "not yet
  implemented" warnings as they stop being true.
- **README.md** — keep it accurate for a human arriving cold: what the site is,
  how to run it locally, where it's deployed.
- **Decisions** — record notable technical decisions and their reasoning in this
  file, near the thing they affect. Introduce a `docs/` directory only when this
  file genuinely outgrows the job; don't create it pre-emptively.

## Conventions for AI assistants

- **Match reality over this document.** If the repo has moved past what's written
  here, trust the code and fix this file as part of your change.
- **Do not scaffold speculatively.** Build what the issue asks for. Empty
  directories, unused config, and "we'll need this later" boilerplate are noise.
- **Ask before structural commitments.** New framework, package manager,
  hosting change, or content-model change: raise it on the issue first.
- **Prefer web-platform APIs** over a dependency that does the same job.
- **Report accurately.** Say what you did, what you verified, what you skipped,
  and what you're unsure about.
