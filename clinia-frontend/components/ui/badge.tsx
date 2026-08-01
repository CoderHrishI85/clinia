type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--surface-2)] text-[var(--text-secondary)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
};

const STATUS_TONE: Record<string, Tone> = {
  SCHEDULED: "info",
  CONFIRMED: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status}</Badge>;
}
