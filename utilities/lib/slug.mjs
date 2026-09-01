/*
 * Ids, filenames and the small amount of tidying that turns a fetched name into
 * one.
 *
 * An id is the primary key of this catalogue — it is what `reference()` points
 * at and what the URL ends in — so it has to be stable, readable and free of
 * anything that needs escaping in a path or a fragment.
 */

/**
 * Slugify a name into an id: lowercase, ASCII, hyphen-separated.
 *
 * Accents are folded rather than dropped (`Hernández` → `hernandez`), because
 * dropping them silently merges names that are genuinely different.
 *
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  return value
    .normalize('NFD')
    /* Strip the combining marks the decomposition leaves behind, so an accented
       letter folds to its base rather than splitting the slug in two. */
    .replace(/[\u0300-\u036f]/g, '')
    /* Apostrophes close up rather than becoming separators: "Don't" is one
       word, and 'don-t' reads as two. */
    .replace(/['\u2019]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The id for an episode file: the series id plus a padded season and episode.
 *
 * Padded so a directory listing sorts the way a season reads — s01e09 before
 * s01e10, which a bare number does not do.
 *
 * @param {string} seriesId
 * @param {number} season
 * @param {number} episode
 */
export function episodeId(seriesId, season, episode) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${seriesId}-s${pad(season)}e${pad(episode)}`;
}

/**
 * Make an id unique against ids already in the catalogue.
 *
 * Two different people genuinely can share a name, and two titles can share one
 * too. Rather than silently overwriting or merging them, the second gets a
 * numeric suffix and the caller is told.
 *
 * @param {string} id
 * @param {Iterable<string>} taken
 */
export function uniqueId(id, taken) {
  const used = new Set(taken);
  if (!used.has(id)) return id;
  for (let n = 2; ; n++) {
    const candidate = `${id}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/**
 * TMDB writes a cast credit as free text, and it is rarely just a name:
 * 'Tony Stark / Iron Man', 'Agent Coulson (uncredited)', 'Additional Voices'.
 * The first alias is the character; the rest is qualification we keep as a note
 * or drop.
 *
 * @param {string} credit
 * @returns {{ name: string, note?: string }}
 */
export function parseCharacterCredit(credit) {
  const trimmed = credit.trim();

  /* Parenthesised qualifiers — '(uncredited)', '(voice)' — become the note. */
  const qualifiers = [...trimmed.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim());
  const withoutQualifiers = trimmed.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

  /* 'Tony Stark / Iron Man': the first is the name, the alias is not ours to
     invent a field for — the character's own `aka` is where that belongs. */
  const [first] = withoutQualifiers.split('/').map((part) => part.trim());

  return {
    name: first ?? '',
    ...(qualifiers.length > 0 ? { note: qualifiers.join(', ') } : {}),
  };
}
