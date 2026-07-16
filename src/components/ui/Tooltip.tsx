import { Info } from 'lucide-react';

export function Tooltip({ label }: { label: string }) {
  return <span className="tooltip" tabIndex={0} aria-label={label}><Info size={15} aria-hidden="true" /><span role="tooltip">{label}</span></span>;
}
