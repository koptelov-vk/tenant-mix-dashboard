import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <article className={cn('panel', className)} {...props}>{children}</article>;
}

export function CardHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="panel-title"><div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h2>{title}</h2></div>{action}</div>;
}
