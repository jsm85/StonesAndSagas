import { expect, test } from 'vitest';

import { hashId, plateFigure, plateStyle } from './plate';

test('the same id always draws the same plate', () => {
  /* The point of hashing rather than randomising: a static site is rebuilt
     constantly, and a plate that moved every build would put the whole site in
     the diff of every content edit. */
  expect(plateFigure('iron-man')).toEqual(plateFigure('iron-man'));
  expect(plateStyle('iron-man')).toBe(plateStyle('iron-man'));
});

test('different ids draw different plates', () => {
  const ids = ['iron-man', 'item-47', 'wandavision', 'tesseract', 'hydra', 'westview'];
  const figures = ids.map((id) => JSON.stringify(plateFigure(id)));
  expect(new Set(figures).size).toBe(ids.length);
});

test('ids differing by one character do not land in the same place', () => {
  /* FNV-1a is used precisely so 'iron-man' and 'iron-mans' diverge; a weaker
     mixing step would leave neighbouring ids visually identical. */
  expect(plateFigure('iron-man').bloomX).not.toBeCloseTo(plateFigure('iron-mans').bloomX, 1);
});

test('every value stays inside the range the design allows', () => {
  const ids = Array.from({ length: 200 }, (_, i) => `entry-${i}`);
  for (const id of ids) {
    const figure = plateFigure(id);
    expect(figure.bloomX).toBeGreaterThanOrEqual(18);
    expect(figure.bloomX).toBeLessThanOrEqual(62);
    expect(figure.bloomSize).toBeGreaterThanOrEqual(38);
    expect(figure.bloomSize).toBeLessThanOrEqual(52);
    expect(figure.nebulaX).toBeGreaterThanOrEqual(62);
    expect(figure.nebulaX).toBeLessThanOrEqual(96);
    for (const star of figure.stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(100);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(100);
    }
  }
});

test('an empty id still produces a usable plate', () => {
  /* hashId('') returns the FNV offset basis, not zero, but the seed is guarded
     anyway: xorshift stays stuck at zero forever if it ever starts there. */
  const figure = plateFigure('');
  expect(Number.isFinite(figure.bloomX)).toBe(true);
  expect(figure.stars).toHaveLength(3);
});

test('hashId is a 32-bit unsigned value', () => {
  for (const id of ['', 'a', 'iron-man', 'a'.repeat(500)]) {
    const hash = hashId(id);
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  }
});

test('plateStyle emits custom properties the component can consume', () => {
  const style = plateStyle('iron-man');
  expect(style).toMatch(/--star-0-x:[\d.]+%/);
  expect(style).toMatch(/--bloom-x:[\d.]+%/);
  expect(style).toMatch(/--nebula-x:[\d.]+%/);
  /* Three stars, three properties each, plus three for the blooms. */
  expect(style.split(';')).toHaveLength(12);
});
