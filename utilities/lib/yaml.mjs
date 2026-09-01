/*
 * A small YAML emitter for content frontmatter.
 *
 * Not a general YAML library — it writes the handful of shapes the content
 * schemas use, and it writes them conservatively. The whole point of the strict
 * Zod schemas is that a malformed field fails the build; a generator that emits
 * subtly wrong YAML would turn that safety net into a chore.
 *
 * The quoting rule is the part that matters. YAML will happily read `rating: 12`
 * as a number and `title: Captain America: The First Avenger` as a syntax error,
 * so anything that could be misread is quoted rather than guessed at.
 */

/**
 * Values YAML would interpret as something other than a string. `12` becomes a
 * number and fails a `z.enum` of strings; `1963-03` is fine unquoted but quoted
 * anyway, because the neighbouring `1963-03-01` *would* become a Date.
 */
const AMBIGUOUS = /^(-?\d+(\.\d+)?|true|false|yes|no|on|off|null|~|\d{4}-\d{2}(-\d{2})?)$/i;

/** Characters that give YAML a different meaning at the start of a scalar. */
const LEADING_INDICATOR = /^[-?:,[\]{}#&*!|>'"%@`]/;

/**
 * Quote a scalar when leaving it bare would change what it means.
 *
 * @param {string} value
 * @returns {string}
 */
export function scalar(value) {
  const needsQuotes =
    value === '' ||
    AMBIGUOUS.test(value) ||
    LEADING_INDICATOR.test(value) ||
    /: /.test(value) ||
    /:$/.test(value) ||
    / #/.test(value) ||
    /^\s|\s$/.test(value) ||
    /[\n\r\t]/.test(value);

  if (!needsQuotes) return value;

  /* Single quotes, because they have exactly one escape — a doubled quote — and
     no backslash rules to get wrong. Newlines are folded to spaces: nothing this
     tool writes is prose, and a multi-line scalar is not worth the complexity. */
  const collapsed = value.replace(/\s*[\n\r]+\s*/g, ' ');
  return `'${collapsed.replace(/'/g, "''")}'`;
}

/**
 * Render a value as a list of YAML lines at a given indent depth.
 *
 * Line-based rather than string-concatenating: block YAML is defined by where
 * things sit on a line, and assembling it out of nested strings with newlines
 * embedded in them is how generators come to emit almost-right indentation.
 *
 * Block style throughout, because that is what every hand-authored file in the
 * catalogue uses — generated files should not look foreign beside them.
 *
 * `undefined` is dropped rather than written as an empty value: under
 * `strictObject` a key with nothing after it is an error, not an omission.
 *
 * @param {unknown} value
 * @param {number} depth
 * @returns {string[]}
 */
function lines(value, depth) {
  const pad = '  '.repeat(depth);

  if (Array.isArray(value)) {
    const items = value.filter((item) => item !== undefined);
    return items.flatMap((item) => {
      if (isBlock(item)) {
        /* Rendered one level in, which is exactly where the continuation keys
           have to sit: the dash and its space occupy that same indent. */
        const [first, ...rest] = lines(item, depth + 1);
        return [`${pad}- ${first.trim()}`, ...rest];
      }
      return [`${pad}- ${inline(item)}`];
    });
  }

  const entries = Object.entries(/** @type {object} */ (value)).filter(
    ([, v]) => v !== undefined,
  );

  return entries.flatMap(([key, v]) => {
    if (!isBlock(v)) return [`${pad}${key}: ${inline(v)}`];
    /* An empty list or object still has to be written, or the key vanishes. */
    const nested = lines(v, depth + 1);
    if (nested.length === 0) return [`${pad}${key}: ${Array.isArray(v) ? '[]' : '{}'}`];
    return [`${pad}${key}:`, ...nested];
  });
}

/** Something that has to open a block rather than sit after its key. */
function isBlock(value) {
  if (Array.isArray(value)) return value.filter((v) => v !== undefined).length > 0;
  return (
    isPlainObject(value) &&
    Object.values(value).filter((v) => v !== undefined).length > 0
  );
}

/*
 * A plain object, not any object.
 *
 * A `Date` has no enumerable own properties, so treating every object as a
 * mapping quietly rendered one as `{}` — and a date is precisely what a caller
 * reaches for when writing `releaseDate`. Silently writing an empty mapping is
 * the worst outcome available: it parses, so the schema error lands somewhere
 * else entirely.
 */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** @param {unknown} value */
function inline(value) {
  if (typeof value === 'string') return scalar(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return '[]';
  if (isPlainObject(value)) return '{}';
  if (value instanceof Date) {
    throw new TypeError(
      'Refusing to write a Date: format it first — the schemas take a day as ' +
        "'YYYY-MM-DD' and a cover date as 'YYYY-MM'.",
    );
  }
  throw new TypeError(`Cannot write ${describe(value)} to YAML frontmatter`);
}

/** @param {unknown} value */
function describe(value) {
  if (value === null) return 'null';
  if (typeof value !== 'object') return typeof value;
  return value.constructor?.name ?? 'object';
}

/**
 * A whole file: frontmatter, then the Markdown body.
 *
 * `comments` attach a `# ...` line above a named key. YAML comments survive into
 * the file and are stripped by the parser, which makes them the right place for
 * the TODOs that say what still needs a human decision.
 *
 * @param {Record<string, unknown>} data
 * @param {string} body
 * @param {Record<string, string>} [comments]
 */
export function contentFile(data, body, comments = {}) {
  const out = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (comments[key]) out.push(`# ${comments[key]}`);
    out.push(...lines({ [key]: value }, 0));
  }
  return `---\n${out.join('\n')}\n---\n\n${body.trim()}\n`;
}
