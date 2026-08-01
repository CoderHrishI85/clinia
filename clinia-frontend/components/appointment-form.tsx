"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAppointment,
  updateAppointment,
  type Appointment,
  type AppointmentInput,
} from "@/lib/api/appointments";
import { listPatients } from "@/lib/api/patients";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type FormState = {
  patient_id: string;
  doctor_name: string;
  date: string;
  time: string;
  duration: string;
  reason: string;
};

function toInput(f: FormState): AppointmentInput {
  return {
    patient_id: Number(f.patient_id),
    doctor_name: f.doctor_name.trim(),
    appointment_date: `${f.date}T${f.time}`,
    reason: f.reason.trim() || null,
    duration_minutes: Number(f.duration),
  };
}

export function AppointmentForm({
  appointment,
  onDone,
}: {
  appointment?: Appointment;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: () => listPatients({ limit: 200 }),
  });

  const [form, setForm] = useState<FormState>({
    patient_id: appointment ? String(appointment.patient_id) : "",
    doctor_name: appointment?.doctor_name ?? "",
    date: appointment ? appointment.appointment_date.slice(0, 10) : "",
    time: appointment ? appointment.appointment_date.slice(11, 16) : "",
    duration: String(appointment?.duration_minutes ?? 30),
    reason: appointment?.reason ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const mutation = useMutation({
    mutationFn: () =>
      appointment ? updateAppointment(appointment.id, toInput(form)) : createAppointment(toInput(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(appointment ? "Appointment updated" : "Appointment booked");
      onDone();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Booking failed");
    },
  });

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.patient_id) next.patient_id = "Choose a patient";
    if (!form.doctor_name.trim()) next.doctor_name = "Doctor is required";
    if (!form.date) next.date = "Pick a date";
    if (!form.time) next.time = "Pick a time";
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <Field label="Patient" required error={errors.patient_id}>
        <Select value={form.patient_id} onChange={set("patient_id")}>
          <option value="">Select a patient…</option>
          {(patients ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.phone}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Doctor" required error={errors.doctor_name}>
        <Input value={form.doctor_name} onChange={set("doctor_name")} placeholder="Dr. Ada Lopez" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" required error={errors.date}>
          <Input type="date" value={form.date} onChange={set("date")} />
        </Field>
        <Field label="Time" required error={errors.time}>
          <Input type="time" value={form.time} onChange={set("time")} />
        </Field>
        <Field label="Duration">
          <Select value={form.duration} onChange={set("duration")}>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </Select>
        </Field>
      </div>
      <Field label="Reason">
        <Textarea value={form.reason} onChange={set("reason")} placeholder="Routine check-up, follow-up…" />
      </Field>
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {appointment ? "Save changes" : "Book appointment"}
        </Button>
      </div>
    </form>
  );
}
