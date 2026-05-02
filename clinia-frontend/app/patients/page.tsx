"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ApiError, createPatient, deletePatient, getPatients } from "@/lib/api";

interface Patient {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  created_at: string;
}

type PatientForm = {
  name: string;
  phone: string;
  email: string;
  age: string;
  gender: string;
};

const emptyForm: PatientForm = {
  name: "",
  phone: "",
  email: "",
  age: "",
  gender: "",
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getPatients();
      if (Array.isArray(data)) setPatients(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    const gender = form.gender.trim();
    const age = form.age.trim() ? Number(form.age) : null;

    if (!name || !phone) {
      setError("Name and phone are required");
      return;
    }

    if (age !== null && (!Number.isInteger(age) || age < 0 || age > 130)) {
      setError("Age must be a valid number between 0 and 130");
      return;
    }

    setIsSaving(true);
    try {
      await createPatient({
        name,
        phone,
        email: email || null,
        age,
        gender: gender || null,
      });
      setShowModal(false);
      setForm(emptyForm);
      await loadPatients();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      await deletePatient(id);
      await loadPatients();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="p-8 min-h-screen bg-gray-950 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Patient Directory</h1>
        <button
          onClick={() => {
            setError("");
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
        >
          + Add Patient
        </button>
      </div>

      {error && !showModal && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        <AnimatePresence>
          {patients.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex justify-between items-center"
            >
              <div>
                <p className="text-lg font-semibold">{p.name}</p>
                <p className="text-gray-400 text-sm">{p.phone} - {p.email || "No email"}</p>
                <p className="text-gray-500 text-sm">
                  {p.age !== null && p.age !== undefined ? `${p.age} yrs` : "Age N/A"} - {p.gender || "Gender N/A"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-red-500 hover:text-red-400 text-sm font-medium"
              >
                Delete
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {!isLoading && patients.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/60 p-10 text-center text-gray-400">
            No patients yet. Add the first patient to start building the clinic CRM.
          </div>
        )}

        {isLoading && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-10 text-center text-gray-400">
            Loading patients...
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md"
          >
            <h2 className="text-xl font-bold mb-6">Add New Patient</h2>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <form onSubmit={handleAdd}>
              <input
                required
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <input
                required
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <input
                min="0"
                max="130"
                type="number"
                placeholder="Age"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-6 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <div className="flex gap-3">
                <button
                  disabled={isSaving}
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 text-white py-3 rounded-lg font-medium transition"
                >
                  {isSaving ? "Saving..." : "Add Patient"}
                </button>
                <button
                  disabled={isSaving}
                  type="button"
                  onClick={() => {
                    setError("");
                    setShowModal(false);
                  }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 text-white py-3 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
