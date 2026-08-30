# Stones & Sagas

A MARVEL fan static site, built for fun.

The repository is named `StonesAndSagas` because an ampersand doesn't belong in
a URL — the site itself is **Stones & Sagas**.

**Live at [jsm85.github.io/StonesAndSagas](https://jsm85.github.io/StonesAndSagas/)**

It's also a deliberate excuse to learn: the project is built almost entirely
with [Claude](https://claude.ai/code), as a hands-on way of getting good at
working with it. The conventions that keep that workable live in
[CLAUDE.md](CLAUDE.md).

## What it will do

Explore the characters, films, TV shows and shorts of the Marvel Cinematic
Universe, with three things a plain catalogue doesn't give you:

- **Timeline order** — everything in in-universe chronological order, not just
  release order. TV episodes sit on that timeline individually, interleaved with
  the films.
- **Cross-references** — pick a thread, like an Infinity Stone, an object or an
  event, and see every title and scene that references it, laid out in timeline
  order. "Every appearance of the Soul Stone, in order."
- **Recommended reading** — from anything you're watching, the comics worth
  reading alongside it.

## Status

All three features above are built and browsable — on a seed catalogue of four
titles, two episodes, nine threads and four comics and books. The machinery is
finished; filling it with a real catalogue is content work, not code.

You can walk the timeline — grouped into eras, with the decades it skips drawn
rather than implied, and WandaVision's episodes interleaved between the films —
open a thread like the Tesseract and see every appearance in order, or open
Howard Stark and find him cast in one film and merely discussed in another.

Everything is static HTML with no JavaScript at all. Content is authored as
Markdown and validated against Zod schemas at build time:
films, series and shorts as `titles`, episodes as their own entries — because a
series spans many points on the in-universe timeline, not one — and comics,
collected editions and prose books as `reading`, each carrying why it is worth
reading alongside a given title. Both sides point at shared `people` and
`characters` by reference rather than repeating names as text, so one character
gathers appearances across film, television and print. `entities` covers the
in-universe things worth following — objects, places, realities, organisations,
events — each carrying the list of moments it turns up in, which is what the
cross-reference feature reads. See [CLAUDE.md](CLAUDE.md#content-and-data-model-current-except-cross-references).

The look is an 80s Guardians-of-the-Galaxy space aesthetic: a deep indigo void,
neon magenta and cyan, wide-tracked uppercase mono, a drifting starfield and a
perspective grid horizon. Fonts are self-hosted and open-licence; the icons are
drawn in the repo; and where the design wants a poster or a cover, it draws an
abstract "plate" whose composition is derived from the entry's id. **No Marvel
imagery is used anywhere** — no posters, no stills, no comic covers. The palette and motifs are documented in
[CLAUDE.md](CLAUDE.md#design-language-current).

Built with [Astro](https://astro.build) and TypeScript. No server, no database:
everything is resolved at build time into static files.

## Local development

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev      # dev server with hot reload
npm run check    # typecheck
npm test         # unit tests
npm run build    # production build to dist/
npm run preview  # serve the built output
```

The site is served under its base path, so open
**http://localhost:4321/StonesAndSagas/** — the bare root will 404, which is
expected. That base path exists because the site deploys as a GitHub Pages
*project* site.

## Deployment

Pushing to `main` builds and publishes the site via GitHub Actions. There is no
staging step, so `main` is production.

## Contributing

Work starts with a GitHub issue, then a branch, then a pull request that closes
it. See [CLAUDE.md](CLAUDE.md) for the full workflow and project conventions.

## Disclaimer

This is an unofficial, non-commercial fan project. It is not affiliated with,
endorsed by, or sponsored by Marvel or The Walt Disney Company. All Marvel
characters, names, and related trademarks are the property of their respective
owners.

## License

[MIT](LICENSE) © 2026 Joe Mendonca
