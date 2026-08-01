"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPatient, updatePatient, type Patient, type PatientInput } from "@/lib/api/patients";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type FormState = {
  name: string;
  phone: string;
  email: string;
  age: string;
  gender: string;
  medical_history: string;
  notes: string;
};

function toInput(f: FormState): PatientInput {
  return {
    name: f.name.trim(),
    phone: f.phone.trim(),
    email: f.email.trim() || null,
    age: f.age === "" ? null : Number(f.age),
    gender: f.gender || null,
    medical_history: f.medical_history.trim() || null,
    notes: f.notes.trim() || null,
  };
}

export function PatientForm({ patient, onDone }: { patient?: Patient; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>({
    name: patient?.name ?? "",
    phone: patient?.phone ?? "",
    email: patient?.email ?? "",
    age: patient?.age?.toString() ?? "",
    gender: patient?.gender ?? "",
    medical_history: patient?.medical_history ?? "",
    notes: patient?.notes ?? "",
  });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const mutation = useMutation({
    mutationFn: () =>
      patient ? updatePatient(patient.id, toInput(form)) : createPatient(toInput(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success(patient ? "Patient updated" : "Patient created");
      onDone();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (form.phone.trim().length < 5) next.phone = "Enter a valid phone number";
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name}>
          <Input value={form.name} onChange={set("name")} placeholder="Jane Doe" />
        </Field>
        <Field label="Phone" required error={errors.phone}>
          <Input value={form.phone} onChange={set("phone")} placeholder="+1 555 0100" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" />
        </Field>
        <Field label="Age">
          <Input type="number" min={0} max={130} value={form.age} onChange={set("age")} placeholder="42" />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onChange={set("gender")}>
            <option value="">Not specified</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </Select>
        </Field>
      </div>
      <Field label="Medical history" hint="Encrypted at rest.">
        <Textarea
          value={form.medical_history}
          onChange={set("medical_history")}
          placeholder="Chronic conditions, allergies…"
        />
      </Field>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={set("notes")} placeholder="Anything else worth remembering…" />
      </Field>
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {patient ? "Save changes" : "Create patient"}
        </Button>
      </div>
    </form>
  );
}
