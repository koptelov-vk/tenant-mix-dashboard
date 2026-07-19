import { describe, expect, it } from 'vitest';
import { formatCountRu, pluralizeRu } from './utils';

const cityForms = ['город', 'города', 'городов'] as const;
const objectForms = ['объект', 'объекта', 'объектов'] as const;

describe('pluralizeRu', () => {
  it.each([
    [0, 'городов'], [1, 'город'], [2, 'города'], [4, 'города'], [5, 'городов'],
    [11, 'городов'], [12, 'городов'], [14, 'городов'], [21, 'город'],
    [22, 'города'], [24, 'города'], [25, 'городов'], [101, 'город'], [111, 'городов'],
  ])('returns the correct Russian form for %i', (count, expected) => {
    expect(pluralizeRu(count, cityForms)).toBe(expected);
  });
});

describe('formatCountRu', () => {
  it('formats the confirmed production case correctly', () => {
    expect(formatCountRu(4, objectForms)).toBe('4 объекта');
    expect(formatCountRu(2, cityForms)).toBe('2 города');
  });
});
