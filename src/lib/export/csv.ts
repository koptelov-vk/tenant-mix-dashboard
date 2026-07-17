import type { TenantRow } from '../../types/dashboard';
import type { BrandTableRow } from '../brandTable';
import { CHARACTERISTIC_LABELS } from '../brandTable';
import { csvCell } from '../utils';

const headers = ['ТЦ', 'Город', 'Бренд', 'Нормализованный бренд', 'Категория', 'Тип источника', 'Качество источника', 'Дата проверки', 'Источник'];
const values = (row: TenantRow) => [row.mall, row.city, row.brand, row.brandNormalized, row.category, row.sourceType, row.sourceQuality ?? '', row.checkedAt ?? '', row.sourceUrl];

export function rowsToCsv(rows: TenantRow[]) {
  return `\uFEFF${[headers, ...rows.map(values)].map((line) => line.map(csvCell).join(';')).join('\r\n')}`;
}

export function downloadCsv(rows: TenantRow[], filename = 'tenant-mix-slice.csv') {
  const url = URL.createObjectURL(new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export async function downloadXlsx(rows: TenantRow[], filename = 'tenant-mix-slice.xlsx') {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows.map(values)]);
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Арендаторы'); XLSX.writeFile(book, filename);
}

const brandHeaders = ['Бренд', 'Характеристика', 'Категория', 'Объекты', 'Источник', 'URL', 'Тип источника', 'Качество', 'Дата проверки', 'Объект источника'];
const brandValues = (row: BrandTableRow) => [row.brand, CHARACTERISTIC_LABELS[row.characteristic], row.category, row.malls.join('; '), row.primarySource.label, row.primarySource.url ?? '', row.primarySource.type ?? '', row.primarySource.quality ?? '', row.primarySource.checkedAt ?? '', row.primarySource.mall ?? ''];

export function brandRowsToCsv(rows: BrandTableRow[]) {
  return `\uFEFF${[brandHeaders, ...rows.map(brandValues)].map((line) => line.map(csvCell).join(';')).join('\r\n')}`;
}

export function downloadBrandCsv(rows: BrandTableRow[], filename = 'brands-slice.csv') {
  const url = URL.createObjectURL(new Blob([brandRowsToCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export async function downloadBrandXlsx(rows: BrandTableRow[], filename = 'brands-slice.xlsx') {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([brandHeaders, ...rows.map(brandValues)]);
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Бренды'); XLSX.writeFile(book, filename);
}
