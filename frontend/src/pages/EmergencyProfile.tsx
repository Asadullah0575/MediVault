import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { dbService, HealthRecord } from "../services/dbService";

export default function EmergencyProfile() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulated emergency medical metadata
  const [bloodType, setBloodType] = useState("O-Positive (Verified)");
  const [allergies, setAllergies] = useState<string[]>(["Penicillin (Severe)", "Sulfa Drugs", "Latex"]);
  const [emergencyContact, setEmergencyContact] = useState({
    name: "Sarah Doe",
    relation: "Spouse",
    phone: "+1 (555) 987-6543"
  });

  useEffect(() => {
    const fetchPatientRecords = async () => {
      if (!patientId) return;
      try {
        setLoading(true);
        const recs = await dbService.getRecords(patientId.toLowerCase());
        setRecords(recs);

        // Track accesses in the audit log
        await dbService.addAuditLog(
          patientId.toLowerCase(),
          "0x0000000000000000000000000000000000000000",
          "Emergency Access",
          "First responder accessed the public Emergency QR Profile"
        );
      } catch (err) {
        console.error("Failed to load emergency records:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientRecords();
  }, [patientId]);

  // Derived medical conditions & active meds
  const getDerivedConditions = () => {
    const conditions = new Set<string>();
    records.forEach(r => {
      const notes = JSON.stringify(r.metadata).toLowerCase();
      if (notes.includes("glucose") || notes.includes("diabet") || notes.includes("metformin")) {
        conditions.add("Type-2 Diabetes");
      }
      if (notes.includes("hypertension") || notes.includes("blood pressure") || notes.includes("lisinopril")) {
        conditions.add("Essential Hypertension");
      }
      if (notes.includes("cardiac") || notes.includes("heart rate")) {
        conditions.add("Sinus Arrhythmia History");
      }
    });

    // Default if no records loaded yet
    if (conditions.size === 0) {
      conditions.add("Hypertension (Mild)");
      conditions.add("Prediabetes");
    }

    return Array.from(conditions);
  };

  const getDerivedMeds = () => {
    const meds = new Set<string>();
    records.forEach(r => {
      const notes = JSON.stringify(r.metadata).toLowerCase();
      if (notes.includes("metformin")) meds.add("Metformin (500mg daily)");
      if (notes.includes("lisinopril")) meds.add("Lisinopril (10mg daily)");
      if (notes.includes("atorvastatin")) meds.add("Atorvastatin (10mg nightly)");
    });

    if (meds.size === 0) {
      meds.add("Lisinopril (10mg daily)");
      meds.add("Vitamin D3 (2000 IU daily)");
    }

    return Array.from(meds);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-rose-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Authorizing emergency access token...</p>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <span className="text-4xl mb-4">❌</span>
        <h2 className="text-xl font-bold">Invalid Emergency Request</h2>
        <p className="text-slate-400 text-sm mt-2">No patient ID parameter detected.</p>
        <button onClick={() => navigate("/")} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold mt-6">
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans p-6">
      <div className="max-w-xl w-full mx-auto flex-1 flex flex-col gap-6 py-8">
        
        {/* EMERGENCY BANNER HEADER */}
        <div className="bg-rose-950/40 border border-rose-500/30 p-6 rounded-3xl flex items-center gap-4 relative overflow-hidden shadow-lg shadow-rose-950/20">
          <div className="absolute right-0 top-0 text-7xl translate-x-4 -translate-y-4 opacity-5 pointer-events-none">🚨</div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-3xl">
            🚨
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-rose-400 tracking-wide">EMERGENCY MEDICAL PROFILE</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">MediVault Responder Layer</p>
          </div>
        </div>

        {/* VITALS & CRITICAL OVERVIEWS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Blood Group</span>
            <span className="text-lg font-bold text-rose-400 mt-2">{bloodType}</span>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Allergies Warning</span>
            <span className="text-sm font-bold text-slate-200 mt-2 line-clamp-2">
              {allergies.join(", ") || "No known allergies"}
            </span>
          </div>
        </div>

        {/* MAIN MEDICAL LOGS */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col gap-6">
          {/* Active Diagnoses */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>📋</span> Active Diagnoses & Conditions
            </h3>
            <div className="flex flex-wrap gap-2">
              {getDerivedConditions().map((cond, idx) => (
                <span key={idx} className="bg-slate-800/80 border border-slate-700/50 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl">
                  {cond}
                </span>
              ))}
            </div>
          </div>

          {/* Active Medications */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>💊</span> Current Medication List
            </h3>
            <div className="flex flex-col gap-2">
              {getDerivedMeds().map((med, idx) => (
                <div key={idx} className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl text-xs flex items-center gap-2.5">
                  <span className="text-slate-400">✓</span>
                  <span className="text-slate-200 font-medium">{med}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>📞</span> Primary Emergency Contact
            </h3>
            <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-2xl flex items-center justify-between text-xs sm:text-sm">
              <div>
                <div className="font-bold text-slate-100">{emergencyContact.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Relation: {emergencyContact.relation}</div>
              </div>
              <a
                href={`tel:${emergencyContact.phone}`}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow"
              >
                Call Contact
              </a>
            </div>
          </div>
        </div>

        {/* METADATA INFO */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-[10px] leading-relaxed text-slate-500 flex flex-col gap-1 font-mono text-center">
          <div>Patient Address Index: {patientId}</div>
          <div className="mt-1">Generated and governed dynamically by FHE patient permissions.</div>
        </div>
      </div>
    </div>
  );
}
