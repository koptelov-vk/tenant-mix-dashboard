import { History } from 'lucide-react';
import { Card } from '../components/ui/Card';

export default function HistoryPage() {
  return <Card className="history-empty"><History size={38} /><h1>Историческая динамика пока недоступна</h1><p>Для анализа требуется минимум два сопоставимых снимка tenant mix. Текущий production-набор содержит один снимок, поэтому тренды и временные графики не формируются.</p></Card>;
}
