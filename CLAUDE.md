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

## Status: greenfield

**No application code exists yet.** Tracked contents are:

```
.
├── LICENSE      # MIT, © 2026 Joe Mendonca
├── README.md    # one-line project description
└── CLAUDE.md    # this file
```

Section tags below tell you how much to trust each one:

- **[current]** — true today, verified against the repo.
- **[decided]** — the owner has chosen this, but it is *not built yet*. Follow it
  when you build; do not describe it as if it already exists.
- **[convention]** — a sensible default. Follow it unless the owner says otherwise.

Do not reference files, scripts, or directories that aren't listed above until
you are the one creating them.

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

## Tech stack [decided — not yet implemented]

**Astro + TypeScript.** Chosen because it ships zero JavaScript by default (a good
fit for a content site on Pages), is TypeScript-first, and its Content Collections
validate content against Zod schemas at build time — typed content models, which
suits the owner's .NET background.

Constraints that still apply:

- Keep the dependency surface small. Astro plus what it needs; justify anything
  further in the issue before adding it.
- No CSS framework by default — plain modern CSS (nesting, custom properties,
  grid) until there's a concrete reason otherwise.
- Prefer Astro components rendering to static HTML. Only reach for a client-side
  framework island if a feature genuinely needs interactivity, and say why.

Expected layout once scaffolded — create directories only as you actually need them:

```
astro.config.mjs
package.json
tsconfig.json
src/
  pages/          # routes
  layouts/        # shared page shells
  components/
  content/        # content collections (Markdown + frontmatter)
  content.config.ts  # Zod schemas for those collections
  styles/
public/           # static assets copied verbatim
.github/workflows/
```

## Content and data model [decided — not yet implemented]

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

## Local development [decided — not yet implemented]

Requires Node.js (20 LTS or newer). Once the project is scaffolded, the standard
Astro scripts apply:

```bash
npm install
npm run dev      # local dev server with hot reload
npm run build    # production build to dist/
npm run preview  # serve the built output locally
```

> **Unverified.** These are the expected Astro defaults; nothing has been
> scaffolded or run in this repository yet. When you create the project, run each
> command, then correct this block to match reality and drop this warning.

## Deployment: GitHub Pages [decided — not yet implemented]

The target is GitHub Pages, deployed by GitHub Actions from `main`.

`jsm85.github.io` is already the owner's user site, so this repo deploys as a
**project site** at `https://jsm85.github.io/StonesAndSagas/`. That has one
consequence that breaks first deploys, so get it right up front:

- Set both in `astro.config.mjs`:
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
- Verify a production build locally (`npm run build && npm run preview`) before
  relying on the deploy.

Do not enable public deployment until the owner says the site is ready.

## CI/CD [convention]

Workflows live in `.github/workflows/`. Two are expected:

- **`ci.yml`** — runs on pull requests: install, build, and whatever checks exist
  (typecheck, lint, tests). A PR that doesn't build should not be mergeable.
- **`deploy.yml`** — runs on push to `main`: builds and deploys to Pages. Needs
  `permissions: { contents: read, pages: write, id-token: write }` and a
  `concurrency` group so overlapping deploys don't race.

Keeping CI honest is part of every change:

- Add a new script or check → **wire it into `ci.yml` in the same PR.**
- Change how the project builds or what it needs → update the workflows *and*
  the [Local development](#local-development-decided--not-yet-implemented) section together.
- Pin the Node version in the workflow and keep it consistent with what local
  development assumes.
- CI must never depend on a secret or an external service the owner hasn't set
  up. A static fan site needs neither.

## Testing and verification [current]

There is **no test suite and no linter yet.** Until one exists, verify a change
by building the site and loading the affected page in a browser.

- Never call a change "tested" when no test ran. State exactly what you did:
  which command, which page, what you looked at.
- If a change can't be verified in this environment, say so plainly rather than
  implying it works.
- When you add a test runner or linter, document the real command here and add it
  to `ci.yml` in the same PR.

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
