/*
 * Vitest configuration.
 *
 * One setting, and it earns its place: the suite runs in a US timezone. Release
 * dates are authored as bare days and parsed as midnight UTC, so a formatter
 * that forgets to pin the zone reports every release a day early for anyone west
 * of Greenwich. Pinning TZ here means those tests fail on a UK machine too,
 * rather than passing everywhere the bug is invisible.
 *
 * Set before the import so it is in place when the test workers inherit the
 * environment.
 */
process.env.TZ = 'America/Los_Angeles';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
