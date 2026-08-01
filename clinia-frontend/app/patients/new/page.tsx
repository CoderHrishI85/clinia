"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPatient, type PatientInput } from "@/lib/api/patients";
import { toast } from "sonner";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { PatientForm } from "@/components/patient-form";

export default function NewPatientPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: PatientInput) => createPatient(input),
    onSuccess: (patient) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient created");
      router.push(`/patients/${patient.id}`);
    },
    onError: () => toast.error("Unable to create patient"),
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Directory"
        title="New patient"
        description="Medical history and notes are encrypted at rest."
      />
      <Card className="mt-8 max-w-2xl">
        <CardBody>
          <PatientForm onDone={() => router.push("/patients")} />
        </CardBody>
      </Card>
    </AppShell>
  );
}
