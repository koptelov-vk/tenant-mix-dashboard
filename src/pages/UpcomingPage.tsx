import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import type { AnalysisContext, DashboardData } from '../types/dashboard';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

const status = (plannedDate: string, explicit: string) => {
  if (!plannedDate) return explicit || 'анонсировано';
  const days = differenceInCalendarDays(parseISO(plannedDate), new Date());
  return days < 0 ? 'срок прошёл — требуется проверка' : 'ожидается';
};

export default function UpcomingPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const malls = new Set(context.displayMalls.map((mall) => mall.mall));
  const rows = data.upcoming.filter((item) => malls.has(item.mall));
  return <><div className="page-heading"><div><h1>Скоро открытие</h1><p>{rows.length} подтверждённых анонсов в текущем срезе. Просроченная плановая дата не означает автоматическое открытие.</p></div></div><Card><div className="table-scroll"><table className="data-table upcoming-table"><thead><tr><th>ТЦ</th><th>Бренд</th><th>Категория</th><th>Публикация</th><th>Плановая дата</th><th>Проверено</th><th>Статус</th><th>Источник</th></tr></thead><tbody>{rows.map((item) => { const currentStatus = status(item.plannedDate, item.status); return <tr key={`${item.mall}-${item.brand}`}><td>{item.mall}</td><th>{item.brand}</th><td>{item.category}</td><td>{item.announcementDate || 'н/д'}</td><td>{item.plannedDate || 'н/д'}</td><td>{item.checkedAt || 'н/д'}</td><td><Badge tone={currentStatus.includes('требуется') ? 'warning' : 'info'}>{currentStatus}</Badge></td><td>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Источник <ExternalLink size={14} /></a> : 'Без ссылки'}</td></tr>; })}</tbody></table></div>{!rows.length ? <p className="empty-state">Для выбранных объектов актуальные анонсы не найдены.</p> : null}</Card></>;
}
