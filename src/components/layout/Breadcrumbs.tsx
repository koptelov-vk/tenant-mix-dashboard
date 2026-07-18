import type { AnalysisContext } from '../../types/dashboard';

export function Breadcrumbs({ context, snapshot }: { context: AnalysisContext; snapshot: string }) {
  return <div className="breadcrumbs" aria-label="Контекст анализа"><span>Главная</span><i>/</i><span>{context.focusMall.mallClass} объект</span><i>/</i><strong>{context.focusMall.mall}</strong><i>/</i><span>Срез {snapshot}</span></div>;
}
