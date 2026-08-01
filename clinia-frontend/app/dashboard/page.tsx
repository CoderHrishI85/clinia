"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, HeartPulse, ScanSearch, Sparkles, UserPlus, Users } from "lucide-react";
import AppShell from "@/components/app-shell";
import { MetricCard } from "@/components/ui/metric-card";
import { MetricSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeUp } from "@/components/ui/motion";
import { getAnalytics } from "@/lib/api/analytics";
import { summarizeToday } from "@/lib/api/ai";

const QUICK_ACTIONS = [
  {
    href: "/patients/new",
    icon: UserPlus,
    title: "Register patient",
    description: "Add a patient to your directory.",
  },
  {
    href: "/appointments",
    icon: CalendarPlus,
    title: "Book appointment",
    description: "Schedule a slot for a doctor.",
  },
  {
    href: "/search",
    icon: ScanSearch,
    title: "AI patient search",
    description: "Find patients by meaning, not just name.",
  },
];

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["analytics"], queryFn: getAnalytics });

  return (
    <AppShell>
      <div className="grid gap-8">
        <FadeUp>
          <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">Good day, Clinia</h1>
          <p className="mt-2 max-w-lg text-[var(--text-secondary)]">
            A calm overview of your clinic today — patient volume, today&apos;s schedule and AI activity.
          </p>
        </FadeUp>

        {isLoading ? (
          <MetricSkeleton />
        ) : isError || !data ? (
          <Card>
            <CardBody className="text-sm text-[var(--text-secondary)]">
              Unable to load clinic metrics. Check that the API is running.
            </CardBody>
          </Card>
        ) : (
          <FadeUp delay={0.05}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total patients" value={data.patients_total} icon={<Users className="size-4" />} />
              <MetricCard
                label="Appointments today"
                value={data.appointments_today}
                icon={<CalendarDays className="size-4" />}
              />
              <MetricCard label="AI searches" value={data.searches_total} icon={<Sparkles className="size-4" />} />
              <MetricCard label="Clinic status" value="Live" icon={<HeartPulse className="size-4" />} />
            </div>
          </FadeUp>
        )}

        <FadeUp delay={0.1}>
          <div className="grid gap-4 md:grid-cols-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
              >
                <action.icon className="size-6 text-[var(--accent)]" />
                <h3 className="mt-4 font-display text-lg font-bold">{action.title}</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{action.description}</p>
              </Link>
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={0.15}>
          <AiToday />
        </FadeUp>
      </div>
    </AppShell>
  );
}

function AiToday() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["ai-today"], queryFn: summarizeToday });

  return (
    <Card>
      <CardHeader
        title="AI preview — today's schedule"
        description="No-show risk is forecast for each slot automatically."
        action={<Sparkles className="size-4 text-[var(--accent)]" />}
      />
      <CardBody>
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : isError || !data ? (
          <p className="text-sm text-[var(--text-muted)]">Today's summary is unavailable right now.</p>
        ) : data.patients.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No appointments today — enjoy the calm.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.patients.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-1)] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.patient_name}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {p.doctor} · {p.time}
                  </p>
                </div>
                <Badge
                  tone={p.risk === "HIGH" ? "danger" : p.risk === "MEDIUM" ? "warning" : "success"}
                  className="shrink-0"
                >
                  {p.risk} risk
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
