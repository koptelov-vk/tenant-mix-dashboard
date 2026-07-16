import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import type { DashboardData } from '../types/dashboard';
import { formatArea } from '../lib/utils';
import { Card, CardHeader } from '../components/ui/Card';

export default function DataQualityPage({ data }: { data: DashboardData }) {
  const quality = data.dataQuality;
  const missingGla = data.mallSummary.filter((mall) => !mall.glaConfirmed || mall.gla == null);
  const missingGba = data.mallSummary.filter((mall) => mall.gba == null);
  const critical = quality.emptyBrands + quality.emptyNormalizedBrands + quality.duplicateMallBrandPairs + quality.invalidUrls;
  return <><div className="page-heading"><div><h1>Качество данных</h1><p>Контроль полноты, валидности и пригодности production-среза для расчётов.</p></div></div><section className="quality-grid">{[['Строки', quality.rows], ['ТЦ', quality.malls], ['Бренды', quality.brands], ['Без GLA', quality.mallsWithoutGla], ['Ручная проверка', quality.manualReviewRows], ['Критические ошибки', critical]].map(([label, value]) => <Card key={String(label)}><span>{label}</span><strong>{Number(value).toLocaleString('ru-RU')}</strong></Card>)}</section><section className="quality-layout"><Card><CardHeader eyebrow="Проверка публикации" title={critical ? 'Есть блокирующие ошибки' : 'Критические проверки пройдены'} action={critical ? <AlertTriangle color="#dc2626" /> : <CheckCircle2 color="#059669" />} /><dl className="detail-list"><div><dt>Пустые бренды</dt><dd>{quality.emptyBrands}</dd></div><div><dt>Пустые нормализованные ключи</dt><dd>{quality.emptyNormalizedBrands}</dd></div><div><dt>Дубли ТЦ + бренд</dt><dd>{quality.duplicateMallBrandPairs}</dd></div><div><dt>Некорректные URL</dt><dd>{quality.invalidUrls}</dd></div></dl></Card><Card><CardHeader eyebrow="Площади" title="Объекты с неполными площадями" /><div className="missing-area-list">{[...new Set([...missingGla, ...missingGba])].map((mall) => <div key={mall.mall}><div><strong>{mall.mall}</strong><small>{mall.city} · GLA {mall.glaConfirmed ? formatArea(mall.gla) : 'н/д'} · GBA {formatArea(mall.gba)}</small></div>{mall.areaSource ? <a href={mall.areaSource} target="_blank" rel="noopener noreferrer" aria-label={`Источник площади ${mall.mall}`}><ExternalLink size={15} /></a> : null}</div>)}</div></Card></section></>;
}
