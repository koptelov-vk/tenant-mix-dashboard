import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const formatNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
export const formatPercent = (value: number) => `${formatNumber.format(value * 100)}%`;
export const formatArea = (value: number | null) => value == null ? 'н/д' : `${formatNumber.format(value)} м²`;
export const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
