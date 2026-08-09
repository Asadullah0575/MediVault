import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { QRCodeSVG } from "qrcode.react";
import { useRole } from "../hooks/useRole";
import { dbService, HealthRecord, AccessGrant, AuditLog, ResearchStudy } from "../services/dbService";
import { aiService, TIMELINE_ITEM } from "../services/aiService";

export default function Dashboard() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { role } = useRole();

  // Redirect to role selection if connected but no role chosen
  useEffect(() => {
    if (isConnected && !role) {
      navigate("/select-role");
    }
  }, [isConnected, role, navigate]);

  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<"overview" | "records" | "ai" | "sharing" | "research">("overview");

  // Core Data State
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [studies, setStudies] = useState<ResearchStudy[]>([]);
  
  // AI Derived States
  const [timeline, setTimeline] = useState<TIMELINE_ITEM[]>([]);
  const [healthSummary, setHealthSummary] = useState<string>("");
  const [medications, setMedications] = useState<{ name: string; dosage: string; source: string }[]>([]);
  const [labInsights, setLabInsights] = useState<{ marker: string; value: string; range: string; status: "normal" | "warning" }[]>([]);
  const [prepQuestions, setPrepQuestions] = useState<string[]>([]);

  // Page level loadings
  const [loading, setLoading] = useState(true);

  // Modals & Forms State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showViewRecordModal, setShowViewRecordModal] = useState<HealthRecord | null>(null);

  // File Upload State
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<any>(null); // For showing AI results

  // Grant Access State
  const [doctorAddr, setDoctorAddr] = useState("");
  const [selectedAllowedRecords, setSelectedAllowedRecords] = useState<string[]>(["vitals"]);
  const [grantDuration, setGrantDuration] = useState<number>(48); // default 48h
  const [isGranting, setIsGranting] = useState(false);
  const [grantErr, setGrantErr] = useState("");

  // Load everything
  const loadDashboardData = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const userAddr = address.toLowerCase();
      
      const loadedRecs = await dbService.getRecords(userAddr);
      const loadedGrants = await dbService.getAccessGrants(userAddr);
      const loadedLogs = await dbService.getAuditLogs(userAddr);
      const loadedStudies = await dbService.getResearchStudies(userAddr);

      setRecords(loadedRecs);
      setGrants(loadedGrants);
      setLogs(loadedLogs);
      setStudies(loadedStudies);

      // Process AI Insights
      const computedTimeline = await aiService.generateTimeline(loadedRecs);
      const computedSummary = await aiService.generateHealthSummary(loadedRecs);
      const computedMeds = await aiService.generateMedications(loadedRecs);
      const computedLabs = await aiService.generateLabInsights(loadedRecs);
      const computedQuestions = await aiService.generateDoctorQuestions(loadedRecs);

      setTimeline(computedTimeline);
      setHealthSummary(computedSummary);
      setMedications(computedMeds);
      setLabInsights(computedLabs);
      setPrepQuestions(computedQuestions);

    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address && isConnected) {
      loadDashboardData();
    }
  }, [address, isConnected]);

  // Handle file upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !uploadFileName) return;
    try {
      setIsUploading(true);
      setUploadSuccess(null);

      // 1. Simulating AI extraction first
      const extracted = await aiService.extractRecord(uploadFileName, uploadNotes);
      
      // 2. Add to database
      const timestamp = Math.floor(Date.now() / 1000);
      const newRec = await dbService.addRecord(
        address.toLowerCase(),
        extracted.recordType,
        timestamp,
        {
          title: extracted.title,
          notes: extracted.notes,
          vitals: extracted.vitals,
          lab: extracted.lab,
          effectiveDateTime: new Date().toISOString()
        }
      );

      // 3. Write audit log
      await dbService.addAuditLog(
        address.toLowerCase(),
        address.toLowerCase(),
        "Uploaded Record",
        `Uploaded medical file: ${uploadFileName} (Classified as ${extracted.recordType})`
      );

      setUploadSuccess(extracted);
      setUploadFileName("");
      setUploadNotes("");
      
      // Reload UI
      await loadDashboardData();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle sharing
  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !doctorAddr) return;
    if (!doctorAddr.startsWith("0x") || doctorAddr.length !== 42) {
      setGrantErr("Please enter a valid Ethereum address (0x...)");
      return;
    }
    try {
      setIsGranting(true);
      setGrantErr("");

      await dbService.grantAccess(
        address.toLowerCase(),
        doctorAddr.toLowerCase(),
        selectedAllowedRecords,
        grantDuration
      );

      setDoctorAddr("");
      setSelectedAllowedRecords(["vitals"]);
      setGrantDuration(48);
      setShowShareModal(false);

      // Reload
      await loadDashboardData();
    } catch (err) {
      setGrantErr("Failed to create sharing permission.");
    } finally {
      setIsGranting(false);
    }
  };

  // Handle revoke
  const handleRevoke = async (grantId: string) => {
    if (!address) return;
    try {
      await dbService.revokeAccess(address.toLowerCase(), grantId);
      await loadDashboardData();
    } catch (err) {
      console.error("Revoke failed:", err);
    }
  };

  // Handle research consent toggle
  const handleConsentToggle = async (studyId: string, currentConsent: boolean) => {
    if (!address) return;
    try {
      await dbService.toggleResearchConsent(address.toLowerCase(), studyId, !currentConsent);
      await loadDashboardData();
    } catch (err) {
      console.error("Consent toggle failed:", err);
    }
  };

  // Render tabs
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Decrypting and loading health vault...</p>
        </div>
      );
    }

    switch (activeTab) {
      // ── OVERVIEW TAB ──────────────────────────────────────────────
      case "overview":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Health Summary Card */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                    ✨ AI Health Summary
                  </h3>
                  <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-full">
                    Updated Live
                  </span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {healthSummary}
                </p>
              </div>

              {/* Recent Activity (Audit logs) */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-display text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  🛡️ Access & Audit Log
                </h3>
                <div className="divide-y divide-slate-100">
                  {logs.slice(0, 4).map((log) => (
                    <div key={log.id} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                      <div>
                        <span className="font-semibold text-slate-800">{log.accessorName}</span>
                        <span className="text-slate-500"> {log.action.toLowerCase()} — {log.details}</span>
                      </div>
                      <span className="text-slate-400 text-xs shrink-0 ml-2">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-slate-400 text-sm py-4 text-center">No recent access actions.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Overview Sidebar (Vitals check + Grants list) */}
            <div className="flex flex-col gap-6">
              {/* Quick vitals widget */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4">Latest Vitals</h3>
                {records.length > 0 && records.some(r => r.recordType === "vitals") ? (
                  (() => {
                    const vitalsRec = records.find(r => r.recordType === "vitals" && r.metadata?.vitals);
                    const v = vitalsRec?.metadata?.vitals;
                    if (!v) return <p className="text-xs text-slate-400">Vitals formatting error</p>;
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Heart Rate</div>
                          <div className="text-lg font-bold text-slate-800 mt-1">{v.heartRate} <span className="text-xs font-normal text-slate-500">bpm</span></div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Oxygen</div>
                          <div className="text-lg font-bold text-slate-800 mt-1">{v.oxygenLevel}%</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Blood Sugar</div>
                          <div className="text-lg font-bold text-slate-800 mt-1">{v.glucoseLevel} <span className="text-xs font-normal text-slate-500">mg/d</span></div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Temperature</div>
                          <div className="text-lg font-bold text-slate-800 mt-1">{v.temperature}°C</div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-slate-400 text-sm">No vital records found. Upload vital reports to track details.</p>
                )}
              </div>

              {/* Active Permissions panel */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">Granted Doctors</h3>
                  <button onClick={() => setActiveTab("sharing")} className="text-brand-600 hover:text-brand-700 text-xs font-bold">
                    Manage
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {grants.slice(0, 3).map((grant) => {
                    const hoursLeft = Math.max(0, Math.round((grant.expiration - Date.now()) / 3600000));
                    return (
                      <div key={grant.id} className="p-3 bg-brand-50/40 rounded-xl border border-brand-100/50 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-brand-950">{grant.doctorName}</span>
                          <span className="text-slate-500 font-medium">{hoursLeft} hrs left</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Records: {grant.recordsAllowed.join(", ")}
                        </div>
                      </div>
                    );
                  })}
                  {grants.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">No active doctor access grants.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      // ── RECORDS TAB ───────────────────────────────────────────────
      case "records":
        return (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">Health Document Vault</h3>
                <p className="text-slate-500 text-sm">Upload, categorize and browse your encrypted medical files.</p>
              </div>
              <button
                onClick={() => { setUploadSuccess(null); setShowUploadModal(true); }}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow transition-all"
              >
                + Upload New Record
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-3">Record Type</th>
                    <th className="py-4 px-3">File Title</th>
                    <th className="py-4 px-3">Effective Date</th>
                    <th className="py-4 px-3">FHE Security</th>
                    <th className="py-4 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-3">
                        <span className="text-lg mr-2 inline-block">
                          {rec.recordType === "vitals" ? "❤️" : rec.recordType === "blood_panel" ? "🩸" : rec.recordType === "vaccination" ? "💉" : "📋"}
                        </span>
                        <span className="capitalize font-medium text-slate-700">{rec.recordType.replace("_", " ")}</span>
                      </td>
                      <td className="py-4 px-3 font-semibold text-slate-900">{rec.metadata.title || "Untitled File"}</td>
                      <td className="py-4 px-3 text-slate-500">
                        {new Date(rec.timestamp * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-4 px-3">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          🔒 FHE Active
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <button
                          onClick={() => setShowViewRecordModal(rec)}
                          className="text-brand-600 hover:text-brand-700 font-semibold text-xs border border-brand-200 hover:border-brand-300 bg-brand-50/40 px-3 py-1.5 rounded-lg transition-all"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                        No health documents uploaded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      // ── AI HEALTH TAB ──────────────────────────────────────────────
      case "ai":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Timeline + Medications */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Chronological timeline */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-display text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  🗓️ Chronological Health Timeline
                </h3>
                <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-8">
                  {timeline.map((item, index) => (
                    <div key={index} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[35px] top-0 bg-brand-50 border border-brand-500 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm">
                        {item.icon}
                      </span>
                      <div className="text-xs text-brand-600 font-bold uppercase tracking-wider">{item.year}</div>
                      <h4 className="font-bold text-slate-900 mt-1">{item.title}</h4>
                      <p className="text-slate-600 text-sm mt-1">{item.description}</p>
                    </div>
                  ))}
                  {timeline.length === 0 && (
                    <p className="text-slate-400 text-sm py-4">No records to plot. Upload data to build timeline.</p>
                  )}
                </div>
              </div>

              {/* Medication History */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-display text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  💊 Active Medications List
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {medications.map((med, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                      <span className="text-xl">💊</span>
                      <div>
                        <h4 className="font-bold text-slate-900">{med.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{med.dosage}</p>
                        <span className="inline-block mt-2 text-[10px] bg-slate-200/60 px-2 py-0.5 rounded font-semibold text-slate-600">
                          Source: {med.source}
                        </span>
                      </div>
                    </div>
                  ))}
                  {medications.length === 0 && (
                    <p className="text-slate-400 text-sm py-4 col-span-2 text-center">No medications identified.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar (Lab insights + Prep Questions) */}
            <div className="flex flex-col gap-6">
              {/* Lab biomarkers tracker */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4">Biomarker lab Insights</h3>
                <div className="flex flex-col gap-3">
                  {labInsights.map((insight, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <div className="font-semibold text-slate-800">{insight.marker}</div>
                        <div className="text-[10px] text-slate-400">Normal Range: {insight.range}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{insight.value}</span>
                        {insight.status === "warning" && (
                          <span className="block text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5">
                            Borderline
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {labInsights.length === 0 && (
                    <p className="text-slate-400 text-sm py-4 text-center">Upload blood test reports to analyze insights.</p>
                  )}
                </div>
              </div>

              {/* Prep questions widget */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex-1">
                <h3 className="font-semibold text-slate-800 mb-2">Prepare for Your Next Visit</h3>
                <p className="text-xs text-slate-400 mb-4">AI-generated topics and questions you might want to raise with your doctor based on your records.</p>
                <div className="flex flex-col gap-3">
                  {prepQuestions.map((q, index) => (
                    <div key={index} className="p-3 bg-accent-50/50 rounded-xl border border-accent-100/50 text-xs leading-relaxed text-slate-700 flex gap-2">
                      <span className="text-accent-600 font-bold">Q:</span>
                      <span>{q}</span>
                    </div>
                  ))}
                  {prepQuestions.length === 0 && (
                    <p className="text-slate-400 text-sm py-4 text-center">No questions generated.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      // ── SHARING TAB ───────────────────────────────────────────────
      case "sharing":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sharing list */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900">Consent & Access Control</h3>
                  <p className="text-slate-500 text-sm">Decide exactly what data doctors can see and configure auto-expiry timings.</p>
                </div>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow transition-all animate-pulse"
                >
                  Create Sharing Link
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {grants.map((grant) => {
                  const hoursLeft = Math.max(0, Math.round((grant.expiration - Date.now()) / 3600000));
                  return (
                    <div key={grant.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{grant.doctorName}</h4>
                        <code className="text-xs text-slate-400 block mt-1">{grant.doctorAddress}</code>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {grant.recordsAllowed.map((recType) => (
                            <span key={recType} className="text-[10px] bg-brand-100 text-brand-800 font-semibold px-2 py-0.5 rounded-full capitalize">
                              {recType.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 border-t sm:border-t-0 border-slate-200/60 pt-3 sm:pt-0 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-800">
                            {hoursLeft > 0 ? `${hoursLeft} hours remaining` : "Expired"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Created: {new Date(grant.created).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevoke(grant.id)}
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs px-3 py-2 rounded-xl transition-all"
                        >
                          Revoke Access
                        </button>
                      </div>
                    </div>
                  );
                })}
                {grants.length === 0 && (
                  <p className="text-slate-400 text-center py-8 text-sm">No sharing configurations created.</p>
                )}
              </div>
            </div>

            {/* Emergency Profile Panel */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col">
              <h3 className="font-display text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                🚨 Emergency QR Profile
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Generate a card containing critical details (allergies, emergency contacts, blood type). First responders scan it to access limited info immediately.
              </p>

              <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 mb-6">
                <span className="text-4xl mb-4">🪪</span>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow"
                >
                  Generate Emergency QR Code
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-[10px] leading-relaxed text-amber-800 flex gap-2">
                <span>⚠️</span>
                <span>The emergency profile contains far less information than your full medical vault for optimal boundary protection.</span>
              </div>
            </div>
          </div>
        );

      // ── RESEARCH TAB ──────────────────────────────────────────────
      case "research":
        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-display text-xl font-bold text-slate-900 mb-2">Research & Data Contribution</h3>
            <p className="text-slate-500 text-sm mb-8">Choose to contribute anonymized components of your health data to accredited studies to advance medical science.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {studies.map((study) => (
                <div key={study.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded uppercase tracking-wider block w-max">
                      {study.sponsor}
                    </span>
                    <h4 className="font-bold text-slate-900 text-lg mt-3">{study.title}</h4>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{study.description}</p>
                    
                    <div className="mt-4 border-t border-slate-200/60 pt-4 text-xs flex flex-col gap-2">
                      <div>
                        <strong className="text-slate-700">Requested Categories:</strong>{" "}
                        <span className="capitalize">{study.dataCategoriesRequested.join(", ")}</span>
                      </div>
                      <div>
                        <strong className="text-slate-700">Study Duration:</strong> {study.duration}
                      </div>
                      <div>
                        <strong className="text-slate-700">Intended Purpose:</strong> {study.purpose}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/40 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Anonymization: Active</span>
                    <button
                      onClick={() => handleConsentToggle(study.id, study.consented)}
                      className={`font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm ${
                        study.consented
                          ? "bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600"
                          : "bg-brand-600 hover:bg-brand-700 text-white"
                      }`}
                    >
                      {study.consented ? "Revoke Consent" : "Contribute Anonymized Data"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

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
        </div>

        <div className="flex items-center gap-4">
          <ConnectButton showBalance={false} chainStatus="none" />
          <button
            onClick={() => navigate("/settings")}
            className="p-2 hover:bg-slate-200/50 rounded-lg border border-slate-200 transition-colors"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="md:w-60 flex flex-col gap-1 shrink-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-3 border ${
              activeTab === "overview"
                ? "bg-brand-50 border-brand-200/80 text-brand-900 shadow-sm"
                : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <span>📊</span> Overview
          </button>
          <button
            onClick={() => setActiveTab("records")}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-3 border ${
              activeTab === "records"
                ? "bg-brand-50 border-brand-200/80 text-brand-900 shadow-sm"
                : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <span>📁</span> My Records
            {records.length > 0 && (
              <span className="ml-auto text-[10px] bg-brand-100 text-brand-800 font-bold px-2 py-0.5 rounded-full">
                {records.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-3 border ${
              activeTab === "ai"
                ? "bg-brand-50 border-brand-200/80 text-brand-900 shadow-sm"
                : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <span>🧠</span> AI Health Insights
          </button>
          <button
            onClick={() => setActiveTab("sharing")}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-3 border ${
              activeTab === "sharing"
                ? "bg-brand-50 border-brand-200/80 text-brand-900 shadow-sm"
                : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <span>🩺</span> Sharing & Consent
            {grants.length > 0 && (
              <span className="ml-auto text-[10px] bg-accent-100 text-accent-800 font-bold px-2 py-0.5 rounded-full animate-pulse">
                {grants.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("research")}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-3 border ${
              activeTab === "research"
                ? "bg-brand-50 border-brand-200/80 text-brand-900 shadow-sm"
                : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <span>🧬</span> Research Layer
          </button>
        </aside>

        {/* MAIN PANEL */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── MODAL: FILE UPLOAD & AI SIMULATION ───────────────────────── */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-slate-900">Upload Health Record</h3>
                <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {!uploadSuccess ? (
                  <form onSubmit={handleUpload} className="flex flex-col gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Simulated Document Name</label>
                      <input
                        type="text"
                        required
                        value={uploadFileName}
                        onChange={(e) => setUploadFileName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 font-medium text-sm bg-slate-50"
                        placeholder="e.g. Blood Panel May 2026.pdf or Vital Check.jpg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Optional Notes</label>
                      <textarea
                        value={uploadNotes}
                        onChange={(e) => setUploadNotes(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm bg-slate-50"
                        placeholder="Add extra context for the clinical parser..."
                      />
                    </div>

                    <div className="bg-brand-50 border border-brand-100/50 p-4 rounded-2xl text-xs leading-relaxed text-brand-800">
                      🔒 <strong>Client-side Encryption:</strong> Files are locally encrypted using FHE public keys before uploading to keep data confidential.
                    </div>

                    <button
                      type="submit"
                      disabled={isUploading || !uploadFileName}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-2 shadow"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                          Processing AI Extraction...
                        </>
                      ) : "Confirm & Upload"}
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-5">
                    <div className="text-center py-4">
                      <span className="text-4xl">🚀</span>
                      <h4 className="font-bold text-slate-900 text-lg mt-2">AI Extraction Success!</h4>
                      <p className="text-xs text-slate-500 mt-1">MediVault AI parsed and structured the document.</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 text-xs">
                      <div><strong className="text-slate-600">Category:</strong> <span className="capitalize font-semibold text-slate-800">{uploadSuccess.recordType}</span></div>
                      <div><strong className="text-slate-600">Extracted Title:</strong> <span className="font-semibold text-slate-800">{uploadSuccess.title}</span></div>
                      {uploadSuccess.vitals && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60">
                          <strong className="text-slate-600">Vitals Extracted:</strong>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>• Heart Rate: {uploadSuccess.vitals.heartRate} bpm</div>
                            <div>• O2 Level: {uploadSuccess.vitals.oxygenLevel}%</div>
                            <div>• Glucose: {uploadSuccess.vitals.glucoseLevel} mg/dL</div>
                            <div>• Temp: {uploadSuccess.vitals.temperature}°C</div>
                          </div>
                        </div>
                      )}
                      {uploadSuccess.lab && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60">
                          <strong className="text-slate-600">Lab Values Extracted:</strong>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>• HbA1c: {uploadSuccess.lab.hba1c}%</div>
                            <div>• Total Cholesterol: {uploadSuccess.lab.cholesterol} mg/dL</div>
                            <div>• LDL: {uploadSuccess.lab.ldl} mg/dL</div>
                            <div>• HDL: {uploadSuccess.lab.hdl} mg/dL</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl shadow transition-all"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: GRANULAR ACCESS SHARING ───────────────────────────── */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-slate-900">Create Consent Access Grant</h3>
                <button onClick={() => setShowShareModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
              </div>

              <form onSubmit={handleGrantAccess} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Doctor's Wallet Address</label>
                  <input
                    type="text"
                    required
                    value={doctorAddr}
                    onChange={(e) => { setDoctorAddr(e.target.value); setGrantErr(""); }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 font-mono text-sm bg-slate-50"
                    placeholder="0xDoctorWalletAddress..."
                  />
                  {grantErr && <p className="text-xs text-rose-500 mt-1 font-medium">{grantErr}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Accessible Categories</label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {["vitals", "blood_panel", "vaccination", "general"].map((cat) => {
                      const isChecked = selectedAllowedRecords.includes(cat);
                      return (
                        <label
                          key={cat}
                          className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isChecked
                              ? "bg-brand-50/50 border-brand-300 text-brand-950 font-semibold"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAllowedRecords(prev => [...prev, cat]);
                              } else {
                                setSelectedAllowedRecords(prev => prev.filter(c => c !== cat));
                              }
                            }}
                            className="accent-brand-600"
                          />
                          <span className="capitalize text-sm">{cat.replace("_", " ")}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Access Expiration Duration</label>
                  <select
                    value={grantDuration}
                    onChange={(e) => setGrantDuration(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm bg-slate-50 font-medium text-slate-700"
                  >
                    <option value={1}>1 Hour (Quick Review)</option>
                    <option value={4}>4 Hours</option>
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours (Standard)</option>
                    <option value={168}>7 Days</option>
                  </select>
                </div>

                <div className="bg-accent-50 border border-accent-100 p-4 rounded-2xl text-xs leading-relaxed text-accent-900">
                  ⌛ <strong>Expiring Sharing:</strong> When this duration expires, the doctor's access will instantly close and your records will return to being hidden.
                </div>

                <button
                  type="submit"
                  disabled={isGranting || !doctorAddr || selectedAllowedRecords.length === 0}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl shadow transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center"
                >
                  {isGranting ? "Creating Grant..." : "Grant Expiring Access"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: EMERGENCY QR POPUP ────────────────────────────────── */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 p-6 flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              <div className="w-full flex justify-between items-center mb-4">
                <span className="font-bold text-slate-800">Emergency Medical QR Card</span>
                <button onClick={() => setShowQRModal(false)} className="w-6 h-6 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-sm">✕</button>
              </div>

              {/* QR Render */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner mb-6">
                <QRCodeSVG
                  value={`${window.location.origin}/emergency/${address?.toLowerCase()}`}
                  size={180}
                  level={"M"}
                  includeMargin={true}
                />
              </div>

              <h4 className="font-bold text-slate-900">QR Code Generated</h4>
              <p className="text-xs text-slate-500 text-center mt-1 max-w-[240px] leading-relaxed">
                First responders can scan this to view your critical alerts (allergies, emergency contacts, blood type) without your wallet.
              </p>

              <button
                onClick={() => navigate(`/emergency/${address?.toLowerCase()}`)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs mt-6 transition-all shadow"
              >
                Preview Emergency Page
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: VIEW DETAILED RECORD ─────────────────────────────── */}
      <AnimatePresence>
        {showViewRecordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-slate-900">Record Information</h3>
                <button onClick={() => setShowViewRecordModal(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 text-sm">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Document Title</span>
                  <span className="font-bold text-slate-900 text-lg mt-1 block">{showViewRecordModal.metadata.title}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Record Type</span>
                    <span className="capitalize font-semibold text-slate-800 mt-1 block">{showViewRecordModal.recordType.replace("_", " ")}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Timestamp</span>
                    <span className="font-semibold text-slate-800 mt-1 block">
                      {new Date(showViewRecordModal.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {showViewRecordModal.metadata.vitals && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <strong className="text-slate-700 text-xs font-bold uppercase tracking-wider block mb-3">Extracted Vitals</strong>
                    <div className="grid grid-cols-2 gap-4">
                      <div>Heart Rate: <strong className="text-slate-900">{showViewRecordModal.metadata.vitals.heartRate} bpm</strong></div>
                      <div>O2 Level: <strong className="text-slate-900">{showViewRecordModal.metadata.vitals.oxygenLevel}%</strong></div>
                      <div>Blood Glucose: <strong className="text-slate-900">{showViewRecordModal.metadata.vitals.glucoseLevel} mg/dL</strong></div>
                      <div>Temperature: <strong className="text-slate-900">{showViewRecordModal.metadata.vitals.temperature}°C</strong></div>
                    </div>
                  </div>
                )}

                {showViewRecordModal.metadata.lab && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <strong className="text-slate-700 text-xs font-bold uppercase tracking-wider block mb-3">Extracted Blood Panel</strong>
                    <div className="grid grid-cols-2 gap-4">
                      <div>HbA1c: <strong className="text-slate-900">{showViewRecordModal.metadata.lab.hba1c}%</strong></div>
                      <div>Total Cholesterol: <strong className="text-slate-900">{showViewRecordModal.metadata.lab.cholesterol} mg/dL</strong></div>
                      <div>LDL: <strong className="text-slate-900">{showViewRecordModal.metadata.lab.ldl} mg/dL</strong></div>
                      <div>HDL: <strong className="text-slate-900">{showViewRecordModal.metadata.lab.hdl} mg/dL</strong></div>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Clinical Notes</span>
                  <p className="text-slate-600 leading-relaxed mt-2 whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
                    {showViewRecordModal.metadata.notes || "No extra medical logs or notes recorded."}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}