// @ts-check
import { defineConfig } from 'astro/config';

// Deployed as a GitHub Pages *project* site, because jsm85.github.io is
// already the owner's user site. `base` must match the repository name or
// every asset URL resolves above the site root and 404s in production.
export default defineConfig({
  site: 'https://jsm85.github.io',
  base: '/StonesAndSagas',
});
