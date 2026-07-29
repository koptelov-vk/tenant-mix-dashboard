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
  it.each([
    [0, '0 объектов'], [1, '1 объект'], [2, '2 объекта'], [3, '3 объекта'],
    [4, '4 объекта'], [5, '5 объектов'], [11, '11 объектов'], [12, '12 объектов'],
    [14, '14 объектов'], [20, '20 объектов'], [21, '21 объект'], [22, '22 объекта'],
    [24, '24 объекта'], [25, '25 объектов'], [101, '101 объект'],
    [102, '102 объекта'], [111, '111 объектов'],
  ])('formats the Issue #99 object matrix for %i', (count, expected) => {
    expect(formatCountRu(count, objectForms)).toBe(expected);
  });

  it('formats the confirmed production case correctly', () => {
    expect(formatCountRu(4, objectForms)).toBe('4 объекта');
    expect(formatCountRu(2, cityForms)).toBe('2 города');
  });
});
