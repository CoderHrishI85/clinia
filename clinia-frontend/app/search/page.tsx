"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanSearch, Sparkles } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { searchPatients, type PatientSearchResult } from "@/lib/api/search";

function scoreTone(score: number): "success" | "accent" | "neutral" | "warning" {
  if (score >= 0.9) return "success";
  if (score >= 0.7) return "accent";
  if (score >= 0.5) return "neutral";
  return "warning";
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState<number | null>(null);

  // Initial query from the AI Copilot "Search Symptoms" quick prompt (?q=…).
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQuery(initial);
  }, []);

  const trimmed = query.trim();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", trimmed],
    queryFn: () => searchPatients(trimmed),
    enabled: trimmed.length >= 2,
    placeholderData: (prev) => prev,
  });

  const results = useMemo(() => {
    if (!data?.results) return [];
    return minScore === null ? data.results : data.results.filter((r) => r.similarity_score >= minScore);
  }, [data, minScore]);

  const hasSearched = trimmed.length >= 2;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Semantic search"
        title="Find any patient"
        description="Search by meaning — conditions, symptoms, context — not just exact names. Powered by an AI vector index."
      />

      <div className="mt-8 grid gap-6">
        <div className="relative">
          <ScanSearch className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--accent)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "patient with penicillin allergy", "elderly diabetic follow-up", "sports injury last month"…'
            className="h-14 pl-12 text-base shadow-[var(--shadow)]"
            autoFocus
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--text-muted)]">Filter by relevance:</span>
          {[0.9, 0.75, 0.6].map((s) => (
            <button
              key={s}
              onClick={() => setMinScore((cur) => (cur === s ? null : s))}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                minScore === s
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              ≥ {s * 100}%
            </button>
          ))}
          {minScore !== null && (
            <button onClick={() => setMinScore(null)} className="text-xs text-[var(--text-muted)] underline">
              Clear filter
            </button>
          )}
        </div>

        {!hasSearched ? (
          <EmptyState
            icon={<Sparkles className="size-10" />}
            title="Ask in plain language"
            description="Type a description of the patient you're looking for. Clinia matches meaning, not just keywords."
          />
        ) : isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : isError ? (
          <Card>
            <CardBody className="text-sm text-[var(--text-secondary)]">
              The search index is unavailable right now. Please try again in a moment.
            </CardBody>
          </Card>
        ) : results.length === 0 ? (
          <EmptyState
            title="No close matches"
            description={`Nothing ranked above your filter for "${trimmed}". Try a different description.`}
          />
        ) : (
          <div className="grid gap-3">
            {results.map((r) => (
              <ResultRow key={r.patient.id} result={r} />
            ))}
            {data?.pagination.has_more && (
              <p className="text-center text-xs text-[var(--text-muted)]">
                Showing the top {results.length} of {data.pagination.returned + data.pagination.offset} ranked matches.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ResultRow({ result }: { result: PatientSearchResult }) {
  const { patient, similarity_score: score, distance, match_reasons } = result;
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]">
      <div className="flex items-center gap-4">
        <Avatar name={patient.name} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{patient.name}</p>
          <p className="truncate text-sm text-[var(--text-secondary)]">
            {patient.medical_history ?? "No medical history"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div
            className="rounded-full"
            style={score >= 0.9 ? { boxShadow: "0 0 12px var(--accent)" } : undefined}
          >
            <Badge tone={scoreTone(score)}>{Math.round(score * 100)}% match</Badge>
          </div>
          {distance !== null && (
            <span className="text-xs tabular-nums text-[var(--text-muted)]">d = {distance.toFixed(3)}</span>
          )}
        </div>
      </div>
      {match_reasons && match_reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-[60px]">
          <Sparkles className="size-3.5 text-[var(--accent)]" />
          {match_reasons.map((reason) => (
            <span
              key={reason}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]"
            >
              {reason}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
