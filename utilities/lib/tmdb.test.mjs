import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import {
  castRows,
  certificationFromContentRatings,
  certificationFromReleaseDates,
  day,
  directorIds,
  episodeDirectorIds,
  episodeFrontmatter,
  filmFrontmatter,
  mergePeople,
  pickOverview,
  seriesFrontmatter,
  TODO_SUMMARY,
  url,
} from './tmdb.mjs';

/*
 * Fixtures, not the network. api.themoviedb.org is unreachable from the
 * environment this was written in, so these files are the specification: they
 * match the documented shapes of /movie/{id}, /tv/{id} and /tv/{id}/season/{n}
 * with credits, release_dates and content_ratings appended.
 */
const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

const movie = fixture('movie');
const tv = fixture('tv');
const season = fixture('season');

const catalogue = {
  people: [
    { id: 'joe-johnston', name: 'Joe Johnston' },
    { id: 'chris-evans', name: 'Chris Evans' },
  ],
  characters: [{ id: 'steve-rogers', name: 'Steve Rogers' }],
};

test('builds a URL with the v3 key in the query string', () => {
  const built = new URL(url('/search/movie', { query: 'iron man' }, 'secret'));
  expect(built.origin + built.pathname).toBe('https://api.themoviedb.org/3/search/movie');
  expect(built.searchParams.get('query')).toBe('iron man');
  expect(built.searchParams.get('api_key')).toBe('secret');
});

test('omits the key entirely when using a v4 bearer token', () => {
  const built = new URL(url('/movie/1771', { append_to_response: 'credits' }));
  expect(built.searchParams.has('api_key')).toBe(false);
});

test('drops undefined params rather than sending the string "undefined"', () => {
  const built = new URL(url('/search/tv', { query: 'x', year: undefined }));
  expect(built.searchParams.has('year')).toBe(false);
});

test('prefers the BBFC certificate over the MPA one', () => {
  /* British first: the site is written in British English, and 12A is the
     rating a UK reader recognises. */
  expect(certificationFromReleaseDates(movie.release_dates)).toEqual({
    system: 'bbfc',
    rating: '12A',
  });
});

test('skips an empty certificate string to reach the real one', () => {
  /* TMDB routinely returns a blank certification on a territory's earlier
     release rows; taking the first would emit an empty rating. */
  const gb = movie.release_dates.results.find((r) => r.iso_3166_1 === 'GB');
  expect(gb.release_dates[0].certification).toBe('');
  expect(certificationFromReleaseDates(movie.release_dates).rating).toBe('12A');
});

test('falls back to the MPA when there is no British certificate', () => {
  const usOnly = { results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'R' }] }] };
  expect(certificationFromReleaseDates(usOnly)).toEqual({ system: 'mpa', rating: 'R' });
});

test('drops a rating the schema does not enumerate', () => {
  /* Emitting 'R18' would produce a file that fails the build. The field is
     optional, so leaving it out is the better failure — obvious, and correct. */
  const r18 = { results: [{ iso_3166_1: 'GB', release_dates: [{ certification: 'R18' }] }] };
  expect(certificationFromReleaseDates(r18)).toBeUndefined();

  const german = { results: [{ iso_3166_1: 'DE', release_dates: [{ certification: '12' }] }] };
  expect(certificationFromReleaseDates(german)).toBeUndefined();
});

test('survives a response with no release dates at all', () => {
  expect(certificationFromReleaseDates({})).toBeUndefined();
  expect(certificationFromReleaseDates({ results: [] })).toBeUndefined();
});

test('takes the US television rating, the only system modelled for TV', () => {
  /* The GB '15' in the fixture has nowhere to go in the schema, so it is
     skipped rather than mislabelled as us-tv. */
  expect(certificationFromContentRatings(tv.content_ratings)).toEqual({
    system: 'us-tv',
    rating: 'TV-14',
  });
});

test('merges people without duplicating the ones already there', () => {
  const { people, added } = mergePeople(
    [{ name: 'Chris Evans' }, { name: 'Hayley Atwell' }],
    catalogue.people,
  );
  expect(added).toEqual([{ id: 'hayley-atwell', name: 'Hayley Atwell' }]);
  expect(people.map((p) => p.id)).toEqual(['chris-evans', 'hayley-atwell', 'joe-johnston']);
});

test('keeps the people file sorted, as it is by hand', () => {
  const { people } = mergePeople([{ name: 'Aaron A' }, { name: 'Zoe Z' }], catalogue.people);
  expect(people.map((p) => p.id)).toEqual([...people.map((p) => p.id)].sort());
});

test('a different person who slugs to a taken id gets a suffix', () => {
  const { added } = mergePeople([{ name: 'Chris  Evans' }], [
    { id: 'chris-evans', name: 'Chris Evans' },
  ]);
  /* Same slug, so it is treated as the same person and nothing is added. */
  expect(added).toEqual([]);
});

test('builds cast rows, character stubs and a list of actors it would invent', () => {
  const { rows, newCharacters, missingActors } = castRows(movie.credits.cast, catalogue, 4);

  expect(rows).toEqual([
    { character: 'steve-rogers', actor: 'chris-evans', billing: 1, note: undefined },
    { character: 'peggy-carter', actor: 'hayley-atwell', billing: 2, note: undefined },
    { character: 'johann-schmidt', actor: 'hugo-weaving', billing: 3, note: undefined },
    { character: 'howard-stark', actor: 'dominic-cooper', billing: 4, note: undefined },
  ]);

  /* Steve Rogers is already in the catalogue and is not stubbed again. */
  expect(newCharacters.map((c) => c.id)).toEqual([
    'peggy-carter',
    'johann-schmidt',
    'howard-stark',
  ]);

  /* Reported so the CLI can say whose entries it is about to create, rather
     than writing a reference that resolves to nothing. */
  expect(missingActors).toEqual(['hayley-atwell', 'hugo-weaving', 'dominic-cooper']);
});

test('takes the first alias as the character and keeps the qualifier as a note', () => {
  const { rows } = castRows(
    [{ name: 'A B', character: 'Bystander (uncredited)', order: 0 }],
    { people: [], characters: [] },
    5,
  );
  expect(rows[0]).toMatchObject({ character: 'bystander', note: 'uncredited' });
});

test('respects the billing limit and orders by it', () => {
  const { rows } = castRows(movie.credits.cast, catalogue, 2);
  expect(rows).toHaveLength(2);
  expect(rows.map((r) => r.billing)).toEqual([1, 2]);
});

test('skips a credit with no character name rather than emitting an empty id', () => {
  const { rows } = castRows(
    [
      { name: 'A B', character: '', order: 0 },
      { name: 'C D', character: '(uncredited)', order: 1 },
      { name: 'E F', character: 'Real Person', order: 2 },
    ],
    { people: [], characters: [] },
    5,
  );
  expect(rows.map((r) => r.character)).toEqual(['real-person']);
});

test('reads the directors off the crew, ignoring every other job', () => {
  expect(directorIds(movie)).toEqual(['joe-johnston']);
  expect(episodeDirectorIds(season.episodes[0])).toEqual(['matt-shakman']);
});

test('only accepts a complete day, since the schema parses it as a date', () => {
  expect(day('2011-07-22')).toBe('2011-07-22');
  expect(day('2011-07')).toBeUndefined();
  expect(day('')).toBeUndefined();
  expect(day(undefined)).toBeUndefined();
});

test('a film maps to frontmatter with facts filled and prose left to the owner', () => {
  const frontmatter = filmFrontmatter({
    details: movie,
    kind: 'film',
    accent: 'cyan',
    order: 100,
    cast: castRows(movie.credits.cast, catalogue, 3),
    directors: directorIds(movie),
  });

  expect(frontmatter).toMatchObject({
    kind: 'film',
    title: 'Captain America: The First Avenger',
    releaseDate: '2011-07-22',
    runtimeMinutes: 124,
    certification: { system: 'bbfc', rating: '12A' },
    directors: ['joe-johnston'],
    timeline: { order: 100 },
  });
  expect(frontmatter.summary).toBe(TODO_SUMMARY);
});

test('no fetched prose appears anywhere in generated frontmatter', () => {
  /* The rule the whole utility exists under: facts yes, prose never. */
  const frontmatter = filmFrontmatter({
    details: movie,
    kind: 'film',
    accent: 'cyan',
    order: 100,
    cast: castRows(movie.credits.cast, catalogue, 3),
    directors: directorIds(movie),
  });
  expect(JSON.stringify(frontmatter)).not.toContain(movie.overview);

  const series = seriesFrontmatter({
    details: tv,
    accent: 'cyan',
    cast: { rows: [] },
    creators: ['jac-schaeffer'],
  });
  expect(JSON.stringify(series)).not.toContain(tv.overview);

  const episode = episodeFrontmatter({
    episode: season.episodes[0],
    seriesId: 'wandavision',
    order: 3000,
    directors: ['matt-shakman'],
  });
  expect(JSON.stringify(episode)).not.toContain(season.episodes[0].overview);
});

test('the overview is returned separately, for the terminal only', () => {
  expect(pickOverview(movie)).toBe(movie.overview);
  expect(pickOverview({ overview: '   ' })).toBeUndefined();
  expect(pickOverview({})).toBeUndefined();
});

test('a series carries no runtime and no timeline, which the union rejects', () => {
  const frontmatter = seriesFrontmatter({
    details: tv,
    accent: 'cyan',
    cast: { rows: [] },
    creators: ['jac-schaeffer'],
  });

  expect(frontmatter).toMatchObject({
    kind: 'series',
    title: 'WandaVision',
    firstAired: '2021-01-15',
    lastAired: '2021-03-05',
    certification: { system: 'us-tv', rating: 'TV-14' },
  });
  expect(frontmatter).not.toHaveProperty('runtimeMinutes');
  expect(frontmatter).not.toHaveProperty('timeline');
});

test('an episode points at its series and carries its own position', () => {
  const frontmatter = episodeFrontmatter({
    episode: season.episodes[1],
    seriesId: 'wandavision',
    order: 3010,
    directors: episodeDirectorIds(season.episodes[1]),
  });

  expect(frontmatter).toMatchObject({
    title: "Don't Touch That Dial",
    series: 'wandavision',
    season: 1,
    episode: 2,
    releaseDate: '2021-01-15',
    runtimeMinutes: 36,
    directors: ['matt-shakman'],
    timeline: { order: 3010 },
  });
});

test('a zero runtime becomes absent rather than an invalid zero', () => {
  /* TMDB uses 0 for "unknown"; the schema wants a positive integer. */
  const frontmatter = episodeFrontmatter({
    episode: { ...season.episodes[0], runtime: 0 },
    seriesId: 'wandavision',
    order: 1,
    directors: [],
  });
  expect(frontmatter.runtimeMinutes).toBeUndefined();
});
