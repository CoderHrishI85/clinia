"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Appointment, getAppointments } from "@/lib/api";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    getAppointments()
      .then((data) => setAppointments(data))
      .catch((err) => console.error("Error:", err));
  }, []);

  return (
    <div className="p-10 bg-slate-50 min-h-screen">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl font-bold mb-8 text-blue-900"
      >
        Appointments Dashboard
      </motion.h1>

      <motion.div layout className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {appointments.length > 0 ? (
          appointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03 }}
              className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 cursor-pointer"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                  Patient #{appointment.patient_id}
                </span>
              </div>
              <p className="text-slate-500 text-sm">Date: {appointment.appointment_date}</p>
              <h3 className="mt-2 font-semibold text-slate-800 text-lg">{appointment.reason}</h3>
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full text-center p-20 border-2 border-dashed border-slate-300 rounded-3xl bg-white"
          >
            <p className="text-slate-400 text-lg font-medium">No appointments scheduled today.</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
