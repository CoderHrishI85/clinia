"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import AppShell from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getPatient } from "@/lib/api/patients";

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients", id],
    queryFn: () => getPatient(id),
    enabled: Number.isFinite(id),
  });

  return (
    <AppShell>
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="size-4" /> Back to patients
      </Link>

      {isLoading ? (
        <div className="mt-6 grid gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40" />
        </div>
      ) : isError || !data ? (
        <Card className="mt-6">
          <CardBody className="text-sm text-[var(--text-secondary)]">
            Patient not found or unavailable.
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Patient</p>
              <h1 className="font-display mt-1 text-3xl font-bold">{data.name}</h1>
              <p className="mt-1 text-[var(--text-secondary)]">
                {data.phone}
                {data.email ? ` · ${data.email}` : ""}
              </p>
            </div>
            <Link href="/appointments">
              <Button>
                <CalendarPlus className="size-4" /> Book appointment
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardBody className="grid gap-3 text-sm">
                <Row label="Age" value={data.age ? `${data.age} yrs` : "—"} />
                <Row label="Gender" value={data.gender ? <span className="capitalize">{data.gender}</span> : "—"} />
                <Row
                  label="Registered"
                  value={new Date(data.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                />
              </CardBody>
            </Card>
            <Card>
              <CardBody className="grid gap-3 text-sm">
                <div>
                  <p className="eyebrow">Medical history</p>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--text-primary)]">
                    {data.medical_history ?? "No medical history on file."}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--text-primary)]">
                    {data.notes ?? "No notes."}
                  </p>
                </div>
                <div>
                  <Badge tone="accent">Encrypted at rest</Badge>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
