import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const formatNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
export const formatPercent = (value: number) => `${formatNumber.format(value * 100)}%`;
export const formatArea = (value: number | null) => value == null ? 'н/д' : `${formatNumber.format(value)} м²`;
export const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

/**
 * Returns a Russian noun form for a cardinal number.
 * Forms are ordered as: singular, paucal (2–4), plural (5–20).
 */
export function pluralizeRu(count: number, forms: readonly [string, string, string]) {
  const absolute = Math.abs(Math.trunc(count));
  const lastTwo = absolute % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  const last = absolute % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export const formatCountRu = (count: number, forms: readonly [string, string, string]) => `${count.toLocaleString('ru-RU')} ${pluralizeRu(count, forms)}`;
