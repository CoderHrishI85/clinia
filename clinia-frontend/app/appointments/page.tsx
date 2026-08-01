"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, Clock, ClipboardList, Sparkles, Stethoscope, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/table";
import { TableSkeleton, Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/components/session-provider";
import { AppointmentForm } from "@/components/appointment-form";
import { listAppointments, deleteAppointment, type Appointment } from "@/lib/api/appointments";
import { listPatients, type Patient } from "@/lib/api/patients";
import { predictNoShow } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";

type View = "list" | "calendar";

const fmtTime = (iso: string) => iso.slice(11, 16);
const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const [view, setView] = useState<View>("list");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));

  const { data, isLoading, isError } = useQuery({
    queryKey: ["appointments"],
    queryFn: listAppointments,
  });
  const { data: patientList } = useQuery({
    queryKey: ["patients"],
    queryFn: () => listPatients({ limit: 500 }),
  });
  const patientMap = useMemo(() => {
    const map = new Map<number, Patient>();
    for (const p of patientList ?? []) map.set(p.id, p);
    return map;
  }, [patientList]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteAppointment(deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment cancelled");
      setDeleteTarget(null);
      if (selected && deleteTarget && selected.id === deleteTarget.id) setSelected(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed"),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of data ?? []) {
      const day = a.appointment_date.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(a);
    }
    return map;
  }, [data]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    }),
    []
  );

  const isAdmin = user?.role === "admin";

  const columns: Column<Appointment>[] = [
    {
      key: "time",
      header: "When",
      render: (a) => (
        <div>
          <p className="font-semibold tabular-nums">{fmtTime(a.appointment_date)}</p>
          <p className="text-xs text-[var(--text-muted)]">{fmtDay(a.appointment_date)}</p>
        </div>
      ),
    },
    {
      key: "doctor",
      header: "Doctor",
      render: (a) => (
        <span className="inline-flex items-center gap-2">
          <Stethoscope className="size-4 text-[var(--text-muted)]" />
          {a.doctor_name}
        </span>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      render: (a) => {
        const p = patientMap.get(a.patient_id);
        return (
          <span className="inline-flex items-center gap-2">
            <Users className="size-4 text-[var(--text-muted)]" />
            {p?.name ?? `#${a.patient_id}`}
          </span>
        );
      },
    },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "risk",
      header: "AI risk",
      render: (a) => <RiskBadge appointmentId={a.id} />,
    },
    {
      key: "duration",
      header: "Length",
      render: (a) => <Badge>{a.duration_minutes} min</Badge>,
    },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      render: (a) =>
        isAdmin ? (
          <button
            aria-label="Cancel appointment"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(a);
            }}
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Schedule"
        title="Appointments"
        description="Bookings across your clinic, with an automatic double-booking guard."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <CalendarPlus className="size-4" /> New appointment
          </Button>
        }
      />

      <div className="mt-8 grid gap-4">
        <div className="inline-flex w-fit rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-1)] p-1">
          <button
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-2 rounded-[calc(var(--radius)-4px)] px-4 py-2 text-sm font-medium transition ${
              view === "list" ? "bg-[var(--surface-2)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ClipboardList className="size-4" /> List
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`inline-flex items-center gap-2 rounded-[calc(var(--radius)-4px)] px-4 py-2 text-sm font-medium transition ${
              view === "calendar" ? "bg-[var(--surface-2)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <CalendarDays className="size-4" /> Calendar
          </button>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : isError ? (
          <Card>
            <CardBody className="text-sm text-[var(--text-secondary)]">
              Unable to load appointments. Check that the API is running.
            </CardBody>
          </Card>
        ) : view === "list" ? (
          <DataTable columns={columns} rows={data ?? []} onRowClick={(a) => setSelected(a)} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-10" />}
            title="No appointments yet"
            description="Book your first appointment to see the calendar come alive."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <CalendarPlus className="size-4" /> Book appointment
              </Button>
            }
          />
        ) : (
          <CalendarView
            days={days}
            byDay={byDay}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            patientMap={patientMap}
            onOpen={(a) => setSelected(a)}
          />
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Book appointment"
        description="Conflicts with the same doctor are rejected automatically."
      >
        <AppointmentForm onDone={() => setCreateOpen(false)} />
      </Modal>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${fmtDay(selected.appointment_date)} at ${fmtTime(selected.appointment_date)}` : ""}
        description={selected?.reason ?? "No reason noted"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Reschedule
            </Button>
          </>
        }
      >
        {selected && (
          <dl className="grid gap-4 text-sm">
            <Row label="Doctor" value={selected.doctor_name} />
            <Row label="Patient" value={patientMap.get(selected.patient_id)?.name ?? `#${selected.patient_id}`} />
            <Row label="Duration" value={`${selected.duration_minutes} minutes`} />
            <Row label="Status" value={<StatusBadge status={selected.status} />} />
            <Row label="Reason" value={selected.reason ?? "—"} />
            <NoShowDetails appointmentId={selected.id} />
            <div className="mt-2">
              <Badge tone="accent">Conflict-guarded</Badge>
            </div>
          </dl>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Cancel appointment?"
        description={`This removes the ${deleteTarget?.duration_minutes} minute slot with ${deleteTarget?.doctor_name}.`}
        confirmLabel="Cancel appointment"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </AppShell>
  );
}

function CalendarView({
  days,
  byDay,
  selectedDay,
  onSelectDay,
  patientMap,
  onOpen,
}: {
  days: Date[];
  byDay: Map<string, Appointment[]>;
  selectedDay: string;
  onSelectDay: (key: string) => void;
  patientMap: Map<number, Patient>;
  onOpen: (a: Appointment) => void;
}) {
  const appointments = byDay.get(selectedDay) ?? [];
  return (
    <div className="grid gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const key = dayKey(d);
          const count = (byDay.get(key) ?? []).length;
          const active = key === selectedDay;
          return (
            <button
              key={key}
              onClick={() => onSelectDay(key)}
              className={`flex min-w-24 flex-col items-center rounded-[var(--radius)] border px-3 py-2.5 transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider">
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className="text-xl font-bold tabular-nums">{d.getDate()}</span>
              {count > 0 && <span className="text-xs">{count} booked</span>}
            </button>
          );
        })}
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-10" />}
          title="Quiet day"
          description="No appointments scheduled for this day."
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <button
              key={a.id}
              onClick={() => onOpen(a)}
              className="flex w-full items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-4 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
            >
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius)] bg-[var(--surface-2)]">
                <Clock className="size-4 text-[var(--accent)]" />
                <span className="mt-0.5 text-xs font-semibold tabular-nums">{fmtTime(a.appointment_date)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.doctor_name}</p>
                <p className="truncate text-sm text-[var(--text-secondary)]">
                  {patientMap.get(a.patient_id)?.name ?? `Patient #${a.patient_id}`}
                  {a.reason ? ` — ${a.reason}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge status={a.status} />
                <RiskBadge appointmentId={a.id} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function riskTone(risk: "LOW" | "MEDIUM" | "HIGH"): "success" | "warning" | "danger" {
  return risk === "HIGH" ? "danger" : risk === "MEDIUM" ? "warning" : "success";
}

function RiskBadge({ appointmentId }: { appointmentId: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["noshow", appointmentId],
    queryFn: () => predictNoShow(appointmentId),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <Skeleton className="h-5 w-20" />;
  if (isError || !data) return <Badge tone="neutral">—</Badge>;
  return (
    <Badge tone={riskTone(data.risk)} className="whitespace-nowrap">
      <Sparkles className="size-3" /> {data.score}% {data.risk === "HIGH" ? "no-show" : "risk"}
    </Badge>
  );
}

function NoShowDetails({ appointmentId }: { appointmentId: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["noshow", appointmentId],
    queryFn: () => predictNoShow(appointmentId),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <Skeleton className="h-20" />;
  if (isError || !data) return <p className="text-sm text-[var(--text-muted)]">Risk analysis unavailable.</p>;
  return (
    <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">No-show risk</p>
        <Badge tone={riskTone(data.risk)}>{data.risk}</Badge>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-[var(--text-muted)]">
          <span>AI confidence</span>
          <span className="tabular-nums">{data.score}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${data.score}%`, background: "var(--accent)" }}
          />
        </div>
      </div>
      {data.reasons.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-sm text-[var(--text-secondary)]">
          {data.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      {data.recommendations.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">{data.recommendations[0]}</p>
      )}
    </div>
  );
}
