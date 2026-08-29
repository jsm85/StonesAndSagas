/*
 * Procedural plate composition.
 *
 * Every plate drew the same gradient, so a grid of cards was the same image
 * repeated. These functions derive a composition from the entry's id: stable
 * across builds (the id does not change, so neither does the picture), distinct
 * between entries, and constrained to ranges that keep the result inside the
 * design rather than letting a hash choose something ugly.
 *
 * A hash rather than a random number generator, precisely because a static site
 * is built repeatedly: `Math.random()` would reshuffle every plate on every
 * build and turn a one-line content edit into a diff across the whole site.
 */

/*
 * FNV-1a, 32-bit. Chosen for being about six lines rather than for its
 * statistics — the only property needed here is that similar ids ('iron-man',
 * 'item-47') land in visibly different places.
 */
export function hashId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    /* Multiply by the FNV prime, 16777619, in 32-bit space. */
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/* Pulls successive values out of one hash, so a plate needs only one. */
function* values(seed: number): Generator<number> {
  let state = seed;
  while (true) {
    /* xorshift32: keeps the sequence spread out without another dependency. */
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    yield state / 0x100000000;
  }
}

const between = (value: number, min: number, max: number) => min + value * (max - min);

export interface PlateFigure {
  /* Three stars, as percentage positions. */
  stars: { x: number; y: number; size: number }[];
  /* The accent bloom, kept low and well inside the plate's width so it reads as
     light rather than as a band across the bottom. */
  bloomX: number;
  bloomSize: number;
  /* The cool nebula, always entering from the top edge. */
  nebulaX: number;
}

export function plateFigure(id: string): PlateFigure {
  const next = values(hashId(id) || 1);
  const value = () => next.next().value;

  return {
    stars: [
      { x: between(value(), 10, 40), y: between(value(), 15, 45), size: 1.2 },
      { x: between(value(), 45, 75), y: between(value(), 10, 35), size: 1 },
      { x: between(value(), 70, 92), y: between(value(), 45, 75), size: 1.4 },
    ],
    bloomX: between(value(), 18, 62),
    bloomSize: between(value(), 38, 52),
    nebulaX: between(value(), 62, 96),
  };
}

/* The figure as CSS custom properties, for the component to set inline. */
export function plateStyle(id: string): string {
  const figure = plateFigure(id);
  const round = (n: number) => Math.round(n * 10) / 10;
  return [
    ...figure.stars.flatMap((star, i) => [
      `--star-${i}-x:${round(star.x)}%`,
      `--star-${i}-y:${round(star.y)}%`,
      `--star-${i}-size:${star.size}px`,
    ]),
    `--bloom-x:${round(figure.bloomX)}%`,
    `--bloom-size:${round(figure.bloomSize)}%`,
    `--nebula-x:${round(figure.nebulaX)}%`,
  ].join(';');
}
