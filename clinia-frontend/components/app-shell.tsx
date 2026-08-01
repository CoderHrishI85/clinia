"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScanSearch,
  Sparkles,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useSession } from "@/components/session-provider";
import { useTheme } from "@/components/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { AiCopilot } from "@/components/ai-copilot";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/search", label: "AI Search", icon: ScanSearch },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useSession();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="font-display text-lg font-bold">
          Clinia<span className="text-[var(--accent)]">.</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[var(--text-secondary)]"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--surface-1)] transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-6">
          <Sparkles className="size-5 text-[var(--accent)]" />
          <Link href="/dashboard" className="font-display text-lg font-bold">
            Clinia<span className="text-[var(--accent)]">.</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                }`}
              >
                <item.icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            <Avatar name={user?.email ?? "?"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.email}</p>
              <p className="text-xs capitalize text-[var(--text-muted)]">{user?.role ?? "…"}</p>
            </div>
            <button
              onClick={toggle}
              title="Toggle theme"
              aria-label="Toggle theme"
              className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            >
              {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </button>
            <button
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <AiCopilot />
    </div>
  );
}
