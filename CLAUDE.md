# CLAUDE.md

Guidance for Claude Code and other AI assistants working in this repository.

## Repository status: greenfield

**As of the latest commit, this repository contains no application code.** The
entire tracked contents are:

```
.
├── LICENSE      # MIT, © 2026 Joe Mendonca
├── README.md    # one-line project description
└── CLAUDE.md    # this file
```

There is no build system, no package manager manifest, no test suite, no CI
configuration, and no source directory. Do not describe, assume, or reference a
structure that isn't listed above — if you need to know where something lives,
it doesn't exist yet and you are the one creating it.

Sections below marked **[current]** describe what is true today. Sections marked
**[convention]** are the defaults to follow when adding code; they are proposals
that become fact once code lands. If the repository owner chooses differently,
follow their choice and update this file.

## What the project is [current]

StonesAndSagas is a **MARVEL fan static site, built for fun** (per `README.md`).

Two things follow from that framing and should shape every decision:

- **Static.** No server, no database, no backend runtime. Output is HTML, CSS,
  JS, and assets that can be served from any file host.
- **A personal hobby project.** Prefer small, readable, dependency-light
  solutions over enterprise scaffolding. Do not introduce a framework, build
  pipeline, or toolchain unless it earns its place or the owner asks for it.

## Fan-content and IP conventions [convention]

This is a fan site for a franchise owned by Marvel/Disney. This is the most
important repo-specific convention, so treat it as a hard rule:

- **Do not commit copyrighted media** — no Marvel-owned images, comic scans,
  film stills, logos, fonts, audio, or video in the repository. Use
  public-domain or self-made assets, or link/embed from an official source.
- **Do not copy prose** from Marvel wikis, Wikipedia, comics, or scripts. Write
  original summaries.
- **Do not imply official affiliation.** No Marvel/Disney branding, and keep a
  visible disclaimer that the site is an unofficial fan project.
- If a task would require any of the above, say so and propose an alternative
  rather than committing the asset.

## Tech stack [convention]

The stack is **not yet chosen**. Absent direction from the owner, default to the
simplest thing that works:

- Plain HTML5, CSS, and vanilla ES modules — no build step, openable via
  `file://` or any static server.
- No runtime dependencies. No bundler, transpiler, or CSS framework.
- If a generator or framework is genuinely warranted (many pages, shared
  layouts, content collections), raise it with the owner before adding it, and
  record the decision here.

Suggested layout when the first pages are added:

```
index.html
assets/
  css/
  js/
  img/
```

Flag the choice explicitly in your response when you create the first files, so
the owner can redirect early.

## Local development [convention]

With a no-build static site there is nothing to install. Serve the directory and
open it:

```bash
python3 -m http.server 8000    # then visit http://localhost:8000
```

Use a local server rather than opening files directly whenever ES modules or
`fetch` are involved — `file://` blocks both under CORS.

If you introduce tooling, add the real commands here and keep them accurate.
Never document a command you have not run successfully.

## Testing and verification [current]

There is **no test suite and no linter**. Until one exists, verify changes by
loading the affected page in a browser and confirming it renders and behaves as
intended.

Do not claim a change is "tested" when no test was run — state exactly what you
verified and how. If you add tests, document the command to run them here.

## Git workflow [current]

- Default branch: `main`. Remote: `https://github.com/jsm85/StonesAndSagas`.
- Do not commit directly to `main`. Work on a feature branch and push that.
- Branches created by Claude Code sessions follow `claude/<topic>-<id>`
  (e.g. `claude/claude-md-documentation-9sj39e`); push only to the branch the
  session was assigned.
- Push with `git push -u origin <branch-name>`.
- Commit and push only when asked. Open a pull request only when explicitly
  requested.
- Write clear, imperative commit messages describing the change and why.

## Conventions for AI assistants

- **Match reality over this document.** If the repository has grown past what is
  described here, trust the code and update this file as part of your change.
- **Keep this file current.** Adding a build step, test runner, dependency, or
  directory means updating the corresponding section in the same commit.
- **Do not scaffold speculatively.** Build what was asked. Empty placeholder
  directories, unused config files, and "we'll need this later" boilerplate are
  noise in a project this size.
- **Ask before structural commitments.** The first framework, package manager,
  or deployment target sets the direction for everything after it — surface that
  decision instead of making it silently.
- **Prefer no dependencies.** Every addition is a maintenance cost on a hobby
  project. Vanilla web platform APIs are usually enough.
- **Report accurately.** Say what you did, what you verified, and what you left
  undone.
