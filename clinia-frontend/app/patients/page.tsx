"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", contact: "" });

  const fetchPatients = async () => {
    try {
      // Browser mein 127.0.0.1 chal raha hai toh yahan bhi wahi use karo
      const res = await fetch("http://127.0.0.1:8000/patients/");
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://127.0.0.1:8000/patients/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPatient.name,
          contact: newPatient.contact 
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setNewPatient({ name: "", contact: "" });
        fetchPatients(); 
        alert("Patient Saved Successfully! 🎉");
      } else {
        const errorData = await response.json();
        console.log("Error details:", errorData);
        alert("Server side error! Check console.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Connection failed! Make sure Backend is running on 127.0.0.1:8000");
    }
  };

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-900">👤 Patient Directory</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
        >
          + Add New Patient
        </button>
      </div>

      <div className="grid gap-4">
        {patients.length > 0 ? (
          patients.map((p: any, index: number) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{p.name}</h3>
                <p className="text-slate-500 text-sm italic">Contact: {p.phone || p.contact}</p>
              </div>
              <div className="text-blue-500 font-bold bg-blue-50 px-3 py-1 rounded-full text-sm">ID: {p.id}</div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-white text-slate-400">
            No patients found. Pehla patient add karo! 🩺
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
            >
              <h2 className="text-2xl font-bold mb-6 text-slate-800 text-center">Quick Add Patient</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input 
                  type="text" placeholder="Full Name" required 
                  value={newPatient.name}
                  className="w-full p-3 rounded-xl border border-slate-300 text-slate-900"
                  onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                />
                <input 
                  type="text" placeholder="Contact Number" required 
                  value={newPatient.contact}
                  className="w-full p-3 rounded-xl border border-slate-300 text-slate-900"
                  onChange={(e) => setNewPatient({...newPatient, contact: e.target.value})}
                />
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-3 text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold active:scale-95 transition-all">Save Patient</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}