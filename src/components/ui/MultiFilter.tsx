import { Filter } from 'lucide-react';

export function MultiFilter({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (value: string[]) => void }) {
  const toggle = (option: string) => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  return <details className="registry-filter"><summary><Filter size={14} aria-hidden="true" />{label}{value.length ? <b>{value.length}</b> : null}</summary><div><div className="registry-filter-tools"><button type="button" onClick={() => onChange(options)}>Выбрать все</button><button type="button" onClick={() => onChange([])}>Снять все</button></div>{options.map((option) => <label key={option}><input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} /><span>{option}</span></label>)}</div></details>;
}

export function uniqueOptions(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
}
