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

Explore the characters and films of the Marvel Cinematic Universe, with three
things a plain catalogue doesn't give you:

- **Timeline order** — the films in in-universe chronological order, not just
  release order.
- **Cross-references between films** — pick a thread, like an Infinity Stone, an
  object or an event, and see every film and scene that references it, laid out
  in timeline order. "Every appearance of the Soul Stone, in order."
- **Recommended reading** — from any film, the comics worth reading alongside
  it.

## Status

Scaffolded and deploying, but there's no real content yet — the landing page is
a placeholder that proves the build and deploy pipeline works. The features
above are the plan, not the present.

Built with [Astro](https://astro.build) and TypeScript. No server, no database:
everything is resolved at build time into static files.

## Local development

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev      # dev server with hot reload
npm run check    # typecheck
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
