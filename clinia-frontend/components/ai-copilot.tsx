"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  Check,
  ClipboardCopy,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { listAppointments, type Appointment } from "@/lib/api/appointments";
import {
  summarizeToday,
  draftFollowUp,
  predictNoShow,
  type FollowUpResult,
  type NoShowRisk,
  type SummarizeToday,
} from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";

const QUICK = [
  { key: "today", label: "Summarize today's patients", desc: "Overview + no-show risk per slot", icon: FileText },
  { key: "followup", label: "Draft a follow-up", desc: "WhatsApp / email reminder for a visit", icon: CalendarCheck },
  { key: "noshow", label: "Predict no-show", desc: "Risk score for an upcoming slot", icon: AlertTriangle },
  { key: "search", label: "Search symptoms", desc: "Semantic search across patients", icon: Search },
] as const;

type Step = "home" | "today" | "followup" | "noshow" | "search";

const dayKey = (iso: string) => iso.slice(0, 10);
const todayKey = () => new Date().toISOString().slice(0, 10);

export function AiCopilot() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("home");
  const [followUp, setFollowUp] = useState<FollowUpResult | null>(null);
  const [noShow, setNoShow] = useState<NoShowRisk | null>(null);
  const [today, setToday] = useState<SummarizeToday | null>(null);
  const [query, setQuery] = useState("");

  const { data: appointments, isLoading: loadingAppts } = useQuery({
    queryKey: ["appointments"],
    queryFn: listAppointments,
  });

  const todays = useMemo(
    () => (appointments ?? []).filter((a) => dayKey(a.appointment_date) === todayKey()),
    [appointments]
  );

  const errMessage = (err: unknown) =>
    err instanceof ApiError ? err.message : "Request failed — is the API running?";

  const todayMut = useMutation({
    mutationFn: summarizeToday,
    onSuccess: setToday,
    onError: (err) => toast.error(errMessage(err)),
  });

  const followUpMut = useMutation({
    mutationFn: (v: { appointmentId: number; channel: "whatsapp" | "email" }) =>
      draftFollowUp(v.appointmentId, v.channel, "reminder"),
    onSuccess: setFollowUp,
    onError: (err) => toast.error(errMessage(err)),
  });

  const noShowMut = useMutation({
    mutationFn: (appointmentId: number) => predictNoShow(appointmentId),
    onSuccess: setNoShow,
    onError: (err) => toast.error(errMessage(err)),
  });

  const runQuick = (key: Step) => {
    setStep(key);
    if (key === "today") todayMut.mutate();
  };

  const goSearch = () => {
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    setOpen(false);
  };

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI Copilot"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--on-accent)] shadow-[0_8px_30px_var(--accent-strong)] transition hover:brightness-110"
      >
        <Sparkles className="size-5" />
        <span className="hidden sm:inline">AI Copilot</span>
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Clinia AI Copilot"
        description="Summaries, reminders, and risk forecasts for your clinic."
      >
        <div className="grid gap-4">
          {step !== "home" && (
            <Button variant="ghost" size="sm" className="w-fit" onClick={() => setStep("home")}>
              <ArrowLeft className="size-4" /> Back
            </Button>
          )}

          {step === "home" && (
            <>
              <p className="text-sm text-[var(--text-secondary)]">What should I do for you?</p>
              <div className="grid gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q.key}
                    onClick={() => runQuick(q.key)}
                    className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-1)] p-4 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                  >
                    <q.icon className="size-5 shrink-0 text-[var(--accent)]" />
                    <div>
                      <p className="text-sm font-semibold">{q.label}</p>
                      <p className="text-xs text-[var(--text-muted)]">{q.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "today" && (
            <>
              <h3 className="text-sm font-semibold">Today at the clinic</h3>
              {todayMut.isPending || todayMut.isIdle ? (
                <Skeleton className="h-40" />
              ) : todayMut.isError ? (
                <EmptyState title="Unavailable" description="Could not summarize today's schedule." />
              ) : today ? (
                <div className="grid gap-2">
                  {today.patients.length === 0 ? (
                    <EmptyState title="Quiet day" description="No appointments today." />
                  ) : (
                    today.patients.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-1)] p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{p.patient_name}</p>
                          <p className="truncate text-xs text-[var(--text-muted)]">
                            {p.doctor} · {p.time}
                          </p>
                        </div>
                        <Badge tone={p.risk === "HIGH" ? "danger" : p.risk === "MEDIUM" ? "warning" : "success"}>
                          {p.risk} risk
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </>
          )}

          {step === "followup" && (
            <AppointmentPicker
              title="Which visit should the reminder go out for?"
              appointments={todays}
              loading={loadingAppts}
              onPick={(a) => followUpMut.mutate({ appointmentId: a.id, channel: "whatsapp" })}
              hint="Picks WhatsApp by default — you can change the channel after."
            />
          )}

          {step === "followup" && followUp && (
            <FollowUpCard result={followUp} onReset={() => setFollowUp(null)} onClose={() => setOpen(false)} />
          )}

          {step === "noshow" && (
            <AppointmentPicker
              title="Pick an upcoming slot to forecast"
              appointments={todays}
              loading={loadingAppts}
              onPick={(a) => noShowMut.mutate(a.id)}
              hint="Based on the patient's history and slot time."
            />
          )}

          {step === "noshow" && noShow && (
            <NoShowCard result={noShow} onReset={() => setNoShow(null)} />
          )}

          {step === "search" && (
            <div className="grid gap-3">
              <p className="text-sm text-[var(--text-secondary)]">
                Describe the patient you're looking for — symptoms, condition, or context.
              </p>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goSearch()}
                placeholder='e.g. "elderly diabetic with penicillin allergy"'
                autoFocus
              />
              <Button onClick={goSearch} disabled={!query.trim()}>
                <Search className="size-4" /> Search patients
              </Button>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}

function AppointmentPicker({
  title,
  appointments,
  loading,
  hint,
  onPick,
}: {
  title: string;
  appointments: Appointment[];
  loading: boolean;
  hint: string;
  onPick: (a: Appointment) => void;
}) {
  if (loading) return <Skeleton className="h-32" />;
  if (appointments.length === 0)
    return <EmptyState title="Nothing scheduled today" description="Pick another day or book an appointment first." />;
  return (
    <div className="grid gap-3">
      <p className="text-sm text-[var(--text-secondary)]">{title}</p>
      <div className="grid gap-2">
        {appointments.map((a) => (
          <button
            key={a.id}
            onClick={() => onPick(a)}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-1)] p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
          >
            <p className="text-sm font-semibold">{a.doctor_name}</p>
            <p className="text-xs tabular-nums text-[var(--text-muted)]">
              {a.appointment_date.slice(11, 16)} · {a.reason ?? "No reason noted"}
            </p>
          </button>
        ))}
      </div>
      <p className="text-xs text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}

function FollowUpCard({ result, onReset, onClose }: { result: FollowUpResult; onReset: () => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Badge tone="accent">{result.channel}</Badge>
        {result.subject && <span className="text-xs text-[var(--text-muted)]">{result.subject}</span>}
      </div>
      <div className="whitespace-pre-wrap rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--text-primary)]">
        {result.message}
      </div>
      <p className="text-xs text-[var(--text-muted)]">{result.character_count} characters</p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={copy}>
          {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onReset}>
          Pick another
        </Button>
        <Button className="flex-1" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

function NoShowCard({ result, onReset }: { result: NoShowRisk; onReset: () => void }) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <div>
          <p className="text-sm font-semibold">{result.patient_name}</p>
          <p className="text-xs text-[var(--text-muted)]">Appointment #{result.appointment_id}</p>
        </div>
        <Badge tone={result.risk === "HIGH" ? "danger" : result.risk === "MEDIUM" ? "warning" : "success"}>
          {result.risk} · {result.score}%
        </Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full rounded-full" style={{ width: `${result.score}%`, background: "var(--accent)" }} />
      </div>
      {result.reasons.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Why</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-[var(--text-secondary)]">
            {result.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {result.recommendations.length > 0 && (
        <div className="rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent-soft)] p-3 text-sm text-[var(--text-primary)]">
          <span className="font-semibold text-[var(--accent)]">Suggestion: </span>
          {result.recommendations[0]}
        </div>
      )}
      <Button variant="secondary" onClick={onReset}>
        Pick another
      </Button>
    </div>
  );
}
