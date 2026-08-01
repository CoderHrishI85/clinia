export function Avatar({ name, className = "size-9" }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-bold text-[var(--accent)] ${className}`}
    >
      {initials || "?"}
    </span>
  );
}
