"use client";

import { cloneElement, forwardRef, isValidElement, useId } from "react";

const inputBase =
  "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => <input ref={ref} className={`${inputBase} ${className}`} {...props} />
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea ref={ref} className={`${inputBase} min-h-24 resize-y ${className}`} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select ref={ref} className={`${inputBase} appearance-none ${className}`} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
};

export function Field({ label, required, error, hint, children }: FieldProps) {
  const autoId = useId();
  const child = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ id?: string; "aria-invalid"?: boolean }>, {
        id: autoId,
        "aria-invalid": Boolean(error) || undefined,
      })
    : children;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={autoId} className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </label>
      {child}
      {error ? (
        <p className="text-xs text-[var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
