import { describe, expect, it } from 'vitest';
import { calculatePdfSlices } from './pdf';

describe('PDF page slicing', () => {
  it('covers the canvas exactly without gaps or overlap', () => {
    const slices = calculatePdfSlices(1_200, 4_000, 281, 194);
    expect(slices.length).toBeGreaterThan(1);
    expect(slices[0]?.sourceY).toBe(0);
    slices.slice(1).forEach((slice, index) => {
      const previous = slices[index];
      expect(slice.sourceY).toBe((previous?.sourceY ?? 0) + (previous?.sourceHeight ?? 0));
    });
    expect(slices.reduce((sum, slice) => sum + slice.sourceHeight, 0)).toBe(4_000);
    expect(slices.every((slice) => slice.renderedHeight <= 194)).toBe(true);
  });

  it('returns no pages for invalid dimensions', () => {
    expect(calculatePdfSlices(0, 1_000, 281, 194)).toEqual([]);
    expect(calculatePdfSlices(1_000, 0, 281, 194)).toEqual([]);
  });

  it('respects semantic page boundaries without losing pixels', () => {
    const slices = calculatePdfSlices(1_000, 2_400, 277, 194, [800, 1_600]);
    expect(slices.map(({ sourceY, sourceHeight }) => [sourceY, sourceHeight])).toEqual([
      [0, 700],
      [700, 100],
      [800, 700],
      [1_500, 100],
      [1_600, 700],
      [2_300, 100],
    ]);
    expect(slices.reduce((sum, slice) => sum + slice.sourceHeight, 0)).toBe(2_400);
  });
});
