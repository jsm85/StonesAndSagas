# `sas` — the authoring utility

A local tool for getting the *facts* about a title, a character or an object out
of TMDB and the Marvel wikis, and into a correctly-shaped file in the right
directory. It exists so that adding an entry starts at "what do I want to say
about this" instead of "what was the slug format again".

It is **not part of the site**. Nothing under `src/` imports it, it never runs in
CI or at build time, and it is never deployed.

```bash
node utilities/sas.mjs title "iron man"              # search TMDB films
node utilities/sas.mjs title "wandavision" --tv      # search TMDB series
node utilities/sas.mjs episodes --series wandavision --tmdb 85271 --season 1
node utilities/sas.mjs wiki "Tesseract" --kind object
node utilities/sas.mjs wiki "Nick Fury" --kind character
node utilities/sas.mjs check                         # list unfinished placeholders
```

Run it with no arguments for the full option list.

## The rule it works under

**It fetches facts. It never writes fetched prose.**

The project's [IP rules](../CLAUDE.md#fan-content-and-ip-rules-hard-rule) forbid
copying prose from Marvel wikis, Fandom or Wikipedia. A TMDB `overview` is
usually studio marketing or a lift from Wikipedia, and Fandom article text is
CC-BY-SA writing by someone else. So:

| Written to the file | Printed to the terminal only |
| --- | --- |
| Titles, dates, runtimes, certificates | The TMDB overview |
| Credited names, cast pairings, issue numbers | Wiki search snippets |
| Canonical spellings, source URLs | — |

`summary` and the Markdown body come out as placeholders that say, in the file,
what you are supposed to do with them. Read the overview in the terminal if it
helps, then write your own words.

`sas check` lists every placeholder still in the content and exits non-zero, so
one that survived to a commit is findable.

## What it will not decide for you

- **`timeline.order`.** The tool cannot know where something belongs in the
  chronology, so it puts the entry at the end — spaced by the hundred the seed
  content uses — and marks it with a `TODO` comment. An entry obviously at the
  end is better than one at a plausible-looking position that is wrong.
- **`timeline.year`, `setting`, `accent`.** Editorial. `--accent` sets one if you
  care; otherwise everything is magenta and you can change it.
- **Relationships.** `appearances`, `related`, `partOf` — the whole point of the
  catalogue — are written empty with a `TODO` comment showing the shape.
- **Comic publication facts.** There is no good free comics API, and a Fandom
  page title is not a reliable source for an issue number or a cover date, so a
  reading entry comes out with `TODO` in those fields. Deliberately invalid: the
  build refuses it until you fill it in.

## Setting up TMDB

Fandom needs no key. TMDB does — a free account at
<https://www.themoviedb.org/settings/api> gives you both kinds:

```bash
export TMDB_API_KEY=...        # a v3 key
# or
export TMDB_ACCESS_TOKEN=...   # a v4 read access token
```

Either works; the tool uses whichever is set. **Do not commit it.** Put the
export in your shell profile, or prefix the command.

> **Attribution.** TMDB's terms ask that products using their API say so. This
> uses it during authoring rather than serving TMDB data, so it is arguably not
> caught — but if the catalogue ends up substantially built from it, the site
> should probably carry "This product uses the TMDB API but is not endorsed or
> certified by TMDB." That is the owner's call, not the tool's.

## How it is built

Zero dependencies. Node 22 has `fetch`, `readline/promises` and `parseArgs`
built in, so the utility needs nothing the project does not already have. Plain
ESM JavaScript with JSDoc types — a build step for a development tool is a cost
with no return.

```
sas.mjs         the CLI: fetching, asking, writing. No logic worth testing.
lib/slug.mjs    ids, filenames, and parsing TMDB's messy character credits
lib/yaml.mjs    the frontmatter emitter, and its quoting rules
lib/tmdb.mjs    request URLs and response → frontmatter mapping
lib/fandom.mjs  wiki search and page lookup
lib/collections.mjs  which entry goes in which directory, and empty templates
```

Everything in `lib/` is pure and unit-tested; `npm test` runs those tests
alongside the site's.

## A caveat worth knowing before you run it

**The network path is unverified.** This was built in a sandbox where both
`api.themoviedb.org` and `*.fandom.com` are blocked by an egress proxy, so no
live call was ever made. What *is* verified:

- every mapping, against fixtures matching the documented response shapes
- the YAML emitter, by round-tripping through `yaml` — the same parser Astro
  reads frontmatter with
- the whole chain end to end: fixture → mapping → file → `npm run build`, with
  the strict Zod schemas as the judge

What is not verified is that TMDB and Fandom return what the fixtures say they
do. Expect the first real run to need a fix, and use `--dry-run` on it.

## Safety

- Never overwrites an existing file without `--force`.
- `--dry-run` prints what it would write and writes nothing.
- Refuses to write an id that is not a lowercase slug, so a fetched name cannot
  put a file outside the content directories.
- `people.json` is the one file it appends to rather than refusing; new people
  are added and the list is re-sorted, existing entries are left alone.
