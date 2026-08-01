export function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        {icon && <div className="text-[var(--text-muted)]">{icon}</div>}
      </div>
      <p className="font-display mt-3 text-4xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</p>}
    </div>
  );
}
