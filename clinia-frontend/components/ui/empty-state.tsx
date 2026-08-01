export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-1)] px-6 py-14 text-center">
      {icon && <div className="text-[var(--text-muted)]">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-[var(--text-secondary)]">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
