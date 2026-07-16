import type { TenantRow } from '../../types/dashboard';
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
