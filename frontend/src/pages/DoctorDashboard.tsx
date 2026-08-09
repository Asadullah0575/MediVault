import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useRole } from "../hooks/useRole";
import { dbService, HealthRecord, DoctorProfile } from "../services/dbService";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { clearRole } = useRole();

  // Doctor Registration & Profile State
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regSpecialty, setRegSpecialty] = useState("General Medicine");
  const [regLicense, setRegLicense] = useState("");
  const [regHospital, setRegHospital] = useState("");
  const [regExperience, setRegExperience] = useState("5 years");

  // Patients & Records State
  const [activeTab, setActiveTab] = useState<"patients" | "settings">("patients");
  const [searchPatientAddr, setSearchPatientAddr] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patientRecords, setPatientRecords] = useState<HealthRecord[]>([]);
  const [activeAllowedCategories, setActiveAllowedCategories] = useState<string[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  // New Clinical Note Form
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [noteContent, setNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Check if doctor is registered
  const loadDoctorProfile = async () => {
    if (!address) return;
    try {
      const p = await dbService.getDoctorProfile(address.toLowerCase());
      setProfile(p);
    } catch (err) {
      console.error("Failed to load doctor profile:", err);
    }
  };

  useEffect(() => {
    if (address && isConnected) {
      loadDoctorProfile();
    }
  }, [address, isConnected]);

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !regFirstName || !regLastName || !regLicense) return;
    try {
      setIsRegistering(true);
      const newProfile = {
        firstName: regFirstName,
        lastName: regLastName,
        specialty: regSpecialty,
        licenseNumber: regLicense,
        hospitalName: regHospital,
        experience: regExperience
      };
      await dbService.saveDoctorProfile(address.toLowerCase(), newProfile);
      await loadDoctorProfile();
    } catch (err) {
      console.error("Registration failed:", err);
    } finally {
      setIsRegistering(false);
    }
  };

  // View patient records based on consent grant
  const fetchPatientRecords = async (patientAddr: string) => {
    if (!address) return;
    try {
      setLoadingRecords(true);
      setAccessError(null);
      setPatientRecords([]);

      const cleanDocAddr = address.toLowerCase();
      const cleanPatAddr = patientAddr.trim().toLowerCase();

      // 1. Get all patient active grants
      const patientGrants = await dbService.getAccessGrants(cleanPatAddr);
      
      // 2. Find the active grant for this specific doctor
      const activeGrant = patientGrants.find(
        g => g.doctorAddress.toLowerCase() === cleanDocAddr && g.active && g.expiration > Date.now()
      );

      if (!activeGrant) {
        setAccessError("No active consent grant found for this wallet. Ask the patient to configure a selective sharing link for your address.");
        setSelectedPatient(cleanPatAddr);
        return;
      }

      // Save allowed categories
      setActiveAllowedCategories(activeGrant.recordsAllowed);

      // 3. Fetch patient records and filter them by permitted categories
      const allRecords = await dbService.getRecords(cleanPatAddr);
      const permittedRecords = allRecords.filter(r => activeGrant.recordsAllowed.includes(r.recordType));

      setPatientRecords(permittedRecords);
      setSelectedPatient(cleanPatAddr);

      // 4. Log access in audit log
      await dbService.addAuditLog(cleanPatAddr, cleanDocAddr, "Viewed Records", `Doctor viewed permitted patient records (${activeGrant.recordsAllowed.join(", ")})`);

    } catch (err) {
      console.error("Failed to load patient records:", err);
      setAccessError("Failed to fetch records. Check connection.");
    } finally {
      setLoadingRecords(false);
    }
  };

  // Add clinical note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !selectedPatient || !noteTitle || !noteContent) return;
    try {
      setIsSubmittingNote(true);

      const timestamp = Math.floor(Date.now() / 1000);
      const metadata = {
        title: noteTitle,
        notes: `${noteContent}\n\nSigned: Dr. ${profile?.firstName} ${profile?.lastName} (${profile?.specialty})`,
        effectiveDateTime: new Date().toISOString()
      };

      // Add record to patient's vault
      await dbService.addRecord(selectedPatient, noteType, timestamp, metadata);

      // Log audit
      await dbService.addAuditLog(
        selectedPatient,
        address.toLowerCase(),
        "Added Record",
        `Doctor created a new clinical note (${noteType}): ${noteTitle}`
      );

      setNoteTitle("");
      setNoteContent("");
      setNoteType("general");
      setShowAddNoteModal(false);

      // Reload patient records
      await fetchPatientRecords(selectedPatient);
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Switch roles / log out
  const handleSwitchRole = () => {
    clearRole();
    navigate("/select-role");
  };

  // Loading state for connected state check
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6">
        <h3 className="font-display text-2xl font-bold mb-4">Doctor Portal Locked</h3>
        <p className="text-slate-500 mb-6">Please connect your authorized Web3 wallet to sign in.</p>
        <ConnectButton showBalance={false} chainStatus="none" />
      </div>
    );
  }

  // If connected but not registered as a doctor yet
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6 font-sans">
        <motion.div
          className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl max-w-lg w-full"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">👨‍⚕️</span>
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Doctor Registration</h2>
              <p className="text-slate-500 text-xs mt-0.5">Register your credential profile to begin reviewing patient vaults.</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-medium mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={regFirstName}
                  onChange={e => setRegFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 bg-slate-50"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={regLastName}
                  onChange={e => setRegLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 bg-slate-50"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Specialty</label>
              <input
                type="text"
                value={regSpecialty}
                onChange={e => setRegSpecialty(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 bg-slate-50"
                placeholder="Cardiology, General Medicine..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-medium mb-1">License Number</label>
                <input
                  type="text"
                  required
                  value={regLicense}
                  onChange={e => setRegLicense(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 bg-slate-50"
                  placeholder="LIC-192837"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Experience</label>
                <select
                  value={regExperience}
                  onChange={e => setRegExperience(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 bg-slate-50 font-medium text-slate-700"
                >
                  <option value="1-3 years">1-3 years</option>
                  <option value="5 years">5 years</option>
                  <option value="10+ years">10+ years</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Affiliated Hospital</label>
              <input
                type="text"
                value={regHospital}
                onChange={e => setRegHospital(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 bg-slate-50"
                placeholder="Saint Mary General Clinic"
              />
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-all disabled:bg-slate-200 disabled:text-slate-400 mt-2 shadow"
            >
              {isRegistering ? "Registering profile..." : "Confirm License Registration"}
            </button>

            <button
              type="button"
              onClick={handleSwitchRole}
              className="text-slate-500 hover:text-slate-800 text-xs font-semibold mt-2 text-center underline"
            >
              Switch Role
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* HEADERBAR */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-50/80 border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center shadow-md">
            <svg viewBox="0 0 20 20" className="w-5 h-5 fill-white">
              <path d="M10 2C10 2 4 5 4 11C4 14.3 6.7 17 10 17C13.3 17 16 14.3 16 11C16 5 10 2 10 2Z" fillOpacity=".9"/>
              <path d="M10 6v8M6 10h8" stroke="#389269" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-slate-900">
            Medi<span className="text-accent-600">Vault</span>
          </span>
          <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded ml-2 uppercase">
            Clinician Portal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end text-xs">
            <span className="font-bold text-slate-700">Dr. {profile.firstName} {profile.lastName}</span>
            <span className="text-slate-400 capitalize">{profile.specialty}</span>
          </div>
          <ConnectButton showBalance={false} chainStatus="none" />
        </div>
      </header>

      {/* BODY GRID */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR */}
        <aside className="md:w-60 flex flex-col gap-1 shrink-0">
          <button
            onClick={() => setActiveTab("patients")}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-3 border ${
              activeTab === "patients"
                ? "bg-sky-50 border-sky-200 text-sky-950 shadow-sm"
                : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <span>🧑‍⚕️</span> Review Patient Vault
          </button>
          
          <div className="mt-auto pt-6 border-t border-slate-200/60 flex flex-col gap-2">
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[10px] leading-relaxed text-slate-500">
              Logged in with: <code className="block font-mono text-[9px] mt-1 break-all">{address}</code>
            </div>
            <button
              onClick={handleSwitchRole}
              className="w-full text-center px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-800 font-bold text-xs rounded-xl transition-all hover:bg-slate-100"
            >
              Switch Role / Sign Out
            </button>
          </div>
        </aside>

        {/* MAIN PANEL */}
        <main className="flex-1 min-w-0">
          {activeTab === "patients" && (
            <div className="flex flex-col gap-6">
              {/* Search Patient Box */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-display text-lg font-bold text-slate-900 mb-2">Review Patient Records</h3>
                <p className="text-slate-500 text-sm mb-4">Input your patient's wallet address to request authorization and load permitted documents.</p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={searchPatientAddr}
                    onChange={e => setSearchPatientAddr(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-sky-500 font-mono text-sm bg-slate-50"
                    placeholder="Enter Patient Address (0x...)"
                  />
                  <button
                    onClick={() => fetchPatientRecords(searchPatientAddr)}
                    disabled={!searchPatientAddr}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-3 rounded-xl shadow transition-all disabled:bg-slate-200 disabled:text-slate-400 shrink-0"
                  >
                    View Vault On-Chain
                  </button>
                </div>
              </div>

              {/* Records List / Status Output */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm min-h-[300px] flex flex-col">
                {loadingRecords ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-sky-100 border-t-sky-600 rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 text-sm font-medium">Verifying FHE key authorizations on-chain...</p>
                  </div>
                ) : accessError ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                    <span className="text-4xl mb-4">🔒</span>
                    <h4 className="font-bold text-slate-900 text-base">Access Restricted</h4>
                    <p className="text-slate-500 text-xs max-w-sm mt-2 leading-relaxed">{accessError}</p>
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-400 font-mono">
                      Query Address: {selectedPatient}
                    </div>
                  </div>
                ) : selectedPatient ? (
                  <div className="flex flex-col gap-6">
                    {/* Active Permission Banner */}
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-emerald-800">✅ Authorized Access Granted</div>
                        <div className="text-[10px] text-emerald-600 mt-1">
                          You are permitted to view: <strong className="capitalize">{activeAllowedCategories.join(", ")}</strong>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAddNoteModal(true)}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all self-start sm:self-auto shrink-0 shadow"
                      >
                        + Create Clinical Note
                      </button>
                    </div>

                    {/* Patient records table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-3">Type</th>
                            <th className="py-3 px-3">Document Title</th>
                            <th className="py-3 px-3">Effective Date</th>
                            <th className="py-3 px-3">FHE Decrypted Status</th>
                            <th className="py-3 px-3">Clinical Notes & Values</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {patientRecords.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-3 font-medium text-slate-800 capitalize">
                                <span className="text-lg mr-2 inline-block">
                                  {rec.recordType === "vitals" ? "❤️" : rec.recordType === "blood_panel" ? "🩸" : rec.recordType === "vaccination" ? "💉" : "📋"}
                                </span>
                                {rec.recordType.replace("_", " ")}
                              </td>
                              <td className="py-4 px-3 font-semibold text-slate-900">{rec.metadata.title}</td>
                              <td className="py-4 px-3 text-slate-500">
                                {new Date(rec.timestamp * 1000).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-3">
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  ✓ Decrypted
                                </span>
                              </td>
                              <td className="py-4 px-3 max-w-[280px]">
                                {rec.metadata.vitals && (
                                  <div className="text-[10px] text-slate-500 grid grid-cols-2 gap-1 mb-2">
                                    <span>HR: {rec.metadata.vitals.heartRate} bpm</span>
                                    <span>Temp: {rec.metadata.vitals.temperature}°C</span>
                                    <span>Sugar: {rec.metadata.vitals.glucoseLevel} mg/dL</span>
                                  </div>
                                )}
                                {rec.metadata.lab && (
                                  <div className="text-[10px] text-slate-500 grid grid-cols-2 gap-1 mb-2">
                                    <span>HbA1c: {rec.metadata.lab.hba1c}%</span>
                                    <span>Cholesterol: {rec.metadata.lab.cholesterol} mg/dL</span>
                                    <span>LDL: {rec.metadata.lab.ldl} mg/dL</span>
                                  </div>
                                )}
                                <p className="text-xs text-slate-600 line-clamp-2 italic">{rec.metadata.notes}</p>
                              </td>
                            </tr>
                          ))}
                          {patientRecords.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                No records of allowed categories are stored in the patient's vault.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <span className="text-4xl mb-4">🩺</span>
                    <h4 className="font-semibold text-slate-700">Ready to Review</h4>
                    <p className="text-slate-500 text-xs max-w-sm mt-1">Search for a patient by pasting their wallet address in the field above.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MODAL: CLINICAL NOTE CREATION ────────────────────────────── */}
      <AnimatePresence>
        {showAddNoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-slate-900">Add Clinical Note</h3>
                <button onClick={() => setShowAddNoteModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
              </div>

              <form onSubmit={handleAddNote} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5 text-sm">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Note Title</label>
                  <input
                    type="text"
                    required
                    value={noteTitle}
                    onChange={e => setNoteTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 bg-slate-50"
                    placeholder="e.g. Hypertension Review, Annual Wellness Check"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Category</label>
                  <select
                    value={noteType}
                    onChange={e => setNoteType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 bg-slate-50 font-medium text-slate-700"
                  >
                    <option value="general">General Note</option>
                    <option value="vitals">Vitals Report</option>
                    <option value="blood_panel">Blood Panel Log</option>
                    <option value="vaccination">Vaccination Update</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Clinical Observation Notes</label>
                  <textarea
                    required
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 bg-slate-50"
                    placeholder="Write clinical assessments, diagnostics, recommendations, or medication adjustments..."
                  />
                </div>

                <div className="bg-brand-50 border border-brand-100 p-4 rounded-2xl text-xs leading-relaxed text-brand-900">
                  🔐 <strong>FHE Security:</strong> The clinical note is encrypted before writing to the blockchain vault of the patient, ensuring complete confidentiality.
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingNote || !noteTitle || !noteContent}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-all shadow"
                >
                  {isSubmittingNote ? "Submitting note..." : "Sign & Save Note"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}