/*
 * Every internal link on the site goes through here.
 *
 * The site deploys as a GitHub Pages *project* site, so it lives under
 * `/StonesAndSagas/`. A root-relative literal like `/titles/iron-man` resolves
 * above that base and 404s in production while working perfectly in dev, which
 * is the worst shape a bug can take. `BASE_URL` carries the prefix; this joins
 * without doubling or dropping a slash.
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function href(path: string): string {
  return `${base}/${path.replace(/^\//, '')}`;
}
