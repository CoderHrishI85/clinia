"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Moon, Sparkles, Sun } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { login, register } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirm: z.string().min(1, "Confirm your password"),
});

type Values = z.infer<typeof schema>;
type Errors = Partial<Record<keyof Values, string>>;

export default function RegisterPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [values, setValues] = useState<Values>({ email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        email: flat.email?.[0],
        password: flat.password?.[0],
        confirm: flat.confirm?.[0],
      });
      return;
    }
    if (values.password !== values.confirm) {
      setErrors((err) => ({ ...err, confirm: "Passwords do not match" }));
      return;
    }
    setSubmitting(true);
    try {
      await register(values.email, values.password);
      await login(values.email, values.password);
      toast.success("Account created — welcome to Clinia");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-grid relative flex min-h-screen items-center justify-center px-4">
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="absolute right-4 top-4 z-10 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
      >
        {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>
      <div className="glass w-full max-w-sm rounded-[var(--radius-lg)] p-8">
        <div className="mb-8 flex items-center gap-2">
          <Sparkles className="size-6 text-[var(--accent)]" />
          <span className="font-display text-2xl font-bold">
            Clinia<span className="text-[var(--accent)]">.</span>
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          New clinics start here — a clinic license is issued on signup.
        </p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-4" noValidate>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@clinic.com"
              value={values.email}
              onChange={set("email")}
            />
          </Field>
          <Field label="Password" error={errors.password}>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={values.password}
              onChange={set("password")}
            />
          </Field>
          <Field label="Confirm password" error={errors.confirm}>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={values.confirm}
              onChange={set("confirm")}
            />
          </Field>
          <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
