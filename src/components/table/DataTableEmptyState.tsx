export function DataTableEmptyState({ children }: { children: string }) {
  return <p className="empty-state" role="status">{children}</p>;
}
