# Stones & Sagas

A MARVEL fan static site, built for fun.

The repository is named `StonesAndSagas` because an ampersand doesn't belong in
a URL — the site itself is **Stones & Sagas**.

**Live at [jsm85.github.io/StonesAndSagas](https://jsm85.github.io/StonesAndSagas/)**

## Status

Scaffolded and deploying, but there's no real content yet — the landing page is
a placeholder that proves the build and deploy pipeline works. Content
collections and the first real pages come next.

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
