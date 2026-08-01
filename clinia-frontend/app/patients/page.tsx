"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCopy, Pencil, Plus, Search, Sparkles, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, Pagination, type Column } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import { PatientForm } from "@/components/patient-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { listPatients, updatePatient, deletePatient, type Patient } from "@/lib/api/patients";
import { generateSOAPNotes, type SOAPResult } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";

const PAGE_SIZE = 10;

export default function PatientsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [soapOpen, setSoapOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients", page],
    queryFn: () => listPatients({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.phone.includes(needle) ||
        (p.email ?? "").toLowerCase().includes(needle)
    );
  }, [data, q]);

  const deleteMutation = useMutation({
    mutationFn: () => deletePatient(deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient removed");
      setDeleteTarget(null);
      if (selected && deleteTarget && selected.id === deleteTarget.id) setSelected(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed"),
  });

  const columns: Column<Patient>[] = [
    {
      key: "name",
      header: "Patient",
      render: (p) => (
        <div className="flex items-center gap-3">
          <Avatar name={p.name} />
          <div>
            <p className="font-semibold">{p.name}</p>
            {p.email && <p className="text-xs text-[var(--text-muted)]">{p.email}</p>}
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (p) => <span className="tabular-nums">{p.phone}</span> },
    {
      key: "age",
      header: "Details",
      render: (p) => (
        <span className="text-[var(--text-secondary)]">
          {p.gender ? <span className="capitalize">{p.gender}</span> : "—"}
          {p.age ? ` · ${p.age} yrs` : ""}
        </span>
      ),
    },
    {
      key: "history",
      header: "Medical history",
      render: (p) => (
        <span className="line-clamp-1 max-w-56 text-[var(--text-secondary)]">
          {p.medical_history ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <button
            aria-label="Edit patient"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(p);
              setEditOpen(true);
            }}
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <Pencil className="size-4" />
          </button>
          <button
            aria-label="Delete patient"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(p);
            }}
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Directory"
        title="Patients"
        description="Everyone in your clinic, with encrypted medical history."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New patient
          </Button>
        }
      />

      <div className="mt-8 grid gap-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name, phone or email…"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : isError ? (
          <Card>
            <CardBody className="text-sm text-[var(--text-secondary)]">
              Unable to load patients. Check that the API is running.
            </CardBody>
          </Card>
        ) : rows.length === 0 && !q ? (
          <EmptyState
            icon={<UserRound className="size-10" />}
            title="No patients yet"
            description="Start by registering your first patient."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> New patient
              </Button>
            }
          />
        ) : (
          <DataTable columns={columns} rows={rows} onRowClick={(p) => setSelected(p)} />
        )}

        {data && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={rows.length}
            onPage={setPage}
          />
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New patient"
        description="Medical history is encrypted before it touches the database."
      >
        <PatientForm onDone={() => setCreateOpen(false)} />
      </Modal>

      {/* Detail drawer */}
      <Drawer
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setEditOpen(false);
        }}
        title={selected?.name ?? ""}
        description={selected?.email ?? "No email on file"}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setSelected(null);
                setEditOpen(false);
              }}
            >
              Close
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen((v) => !v)}>
              <Pencil className="size-4" /> {editOpen ? "View" : "Edit"}
            </Button>
          </>
        }
      >
        {selected &&
          (editOpen ? (
            <PatientForm patient={selected} onDone={() => setEditOpen(false)} />
          ) : (
            <dl className="grid gap-4 text-sm">
              <Detail label="Phone" value={selected.phone} />
              <Detail
                label="Age / Gender"
                value={
                  [selected.gender && <span key="g" className="capitalize">{selected.gender}</span>, selected.age && <span key="a">{selected.age} yrs</span>]
                    .filter(Boolean)
                    .join(" · ") || "—"
                }
              />
              <Detail label="Medical history" value={selected.medical_history ?? "—"} />
              <Detail label="Notes" value={selected.notes ?? "—"} />
              <Detail
                label="Registered"
                value={new Date(selected.created_at).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
              />
              <div className="mt-2">
                <Badge tone="accent">Encrypted PHI</Badge>
              </div>
              <div className="mt-2">
                <Button variant="secondary" onClick={() => setSoapOpen(true)} className="w-full">
                  <Sparkles className="size-4 text-[var(--accent)]" /> Auto-generate SOAP notes
                </Button>
              </div>
            </dl>
          ))}
      </Drawer>

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove patient?"
        description={`${deleteTarget?.name} will be soft-deleted and hidden from the directory. This can be reversed by an administrator.`}
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />

      {selected && (
        <SOAPScribeModal
          open={soapOpen}
          patient={selected}
          onClose={() => setSoapOpen(false)}
        />
      )}
    </AppShell>
  );
}

function SOAPSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">{title}</p>
      {items.length ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-[var(--text-secondary)]">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-[var(--text-muted)]">—</p>
      )}
    </div>
  );
}

function soapToText(result: SOAPResult): string {
  const { subjective, objective, assessment, plan } = result.sections;
  return [
    "S: " + subjective.join(" "),
    "O: " + objective.join(" "),
    "A: " + assessment.join(" "),
    "P: " + plan.join(" "),
  ].join("\n");
}

function SOAPScribeModal({
  open,
  patient,
  onClose,
}: {
  open: boolean;
  patient: Patient;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const initial = [patient.medical_history, patient.notes].filter(Boolean).join("\n") || "";
  const [raw, setRaw] = useState(initial);
  const [result, setResult] = useState<SOAPResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useMutation({
    mutationFn: () => generateSOAPNotes(raw, patient.id),
    onSuccess: (data) => setResult(data),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Generation failed"),
  });

  const save = useMutation({
    mutationFn: () =>
      updatePatient(patient.id, { ...patient, medical_history: undefined, notes: soapToText(result!) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("SOAP notes saved to patient record");
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Save failed"),
  });

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(soapToText(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI medical scribe"
      description="Structures raw notes into SOAP. You can edit the notes before generating."
    >
      {!result ? (
        <div className="grid gap-4">
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={7}
            placeholder="Paste or type the doctor's raw notes / symptoms…"
          />
          <Button onClick={() => generate.mutate()} loading={generate.isPending} disabled={!raw.trim()}>
            <Sparkles className="size-4" /> Generate SOAP notes
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <SOAPSection title="Subjective" items={result.sections.subjective} />
            <SOAPSection title="Objective" items={result.sections.objective} />
            <SOAPSection title="Assessment" items={result.sections.assessment} />
            <SOAPSection title="Plan" items={result.sections.plan} />
          </div>
          <p className="text-center text-xs text-[var(--text-muted)]">{result.summary}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setResult(null)}>
              Edit notes
            </Button>
            <Button variant="secondary" onClick={copy}>
              {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button className="flex-1" onClick={() => save.mutate()} loading={save.isPending}>
              Save to patient
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}
