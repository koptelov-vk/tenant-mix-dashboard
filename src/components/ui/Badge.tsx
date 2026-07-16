import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'info' | 'danger' }) {
  return <span className={cn('badge', `badge-${tone}`)}>{children}</span>;
}
