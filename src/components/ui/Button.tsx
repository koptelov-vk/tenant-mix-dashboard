import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'danger'; children: ReactNode }>(function Button({ className, variant = 'default', children, ...props }, ref) {
  return <button ref={ref} className={cn('button', `button-${variant}`, className)} {...props}>{children}</button>;
});
