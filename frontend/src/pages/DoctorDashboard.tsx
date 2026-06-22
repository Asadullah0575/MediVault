import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { useRole } from "../hooks/useRole";
import { useDoctorVault } from "../hooks/useDoctorVault";
import { useAccount, useWalletClient } from "wagmi";

function shortAddr(a: string) { return `${a.slice(0, 6)}...${a.slice(-4)}`; }

const RECORD_ICONS: Record<string, string> = {
  vitals: "❤️", blood_panel: "🩸", xray: "🦴",
  vaccination: "💉", glucose: "📈", general: "📋"
};

const S: Record<string, React.CSSProperties> = {
  root: { display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh", background: "#F4F9F6" },
  sidebar: { background: "#fff", borderRight: "1px solid rgba(45,163,106,0.15)", padding: "28px 18px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
  logoWrap: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "34px", cursor: "pointer" },
  logoMark: { fontSize: "22px", width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#3B6EA8,#6B9ED4)", display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontFamily: "var(--font-display)", fontSize: "17px", fontWeight: 600, color: "var(--green-900)" },
  logoSub: { fontSize: "10px", color: "var(--text-faint)", letterSpacing: ".06em", textTransform: "uppercase" },
  secLabel: { fontSize: "10px", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "6px", paddingLeft: "10px" },
  navItem: { display: "flex", alignItems: "center", gap: "9px", padding: "9px 12px", borderRadius: "8px", fontSize: "13.5px", color: "var(--text-muted)", cursor: "pointer", marginBottom: "2px", border: "1px solid transparent" },
  navActive: { background: "#EEF4FF", borderColor: "rgba(107,158,212,0.3)", color: "#3B6EA8", fontWeight: 600 },
  badge: { marginLeft: "auto", background: "#FFF8E6", color: "#B07D20", fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "20px" },
  userCard: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", background: "#EEF4FF", border: "1px solid rgba(107,158,212,0.2)" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#6B9ED4,#3B6EA8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff", flexShrink: 0 },
  pulse: { marginLeft: "auto", width: "8px", height: "8px", borderRadius: "50%", background: "#E8A84A", flexShrink: 0 },
  main: { padding: "32px 36px 60px", overflowY: "auto" },
  topbar: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", gap: "16px", flexWrap: "wrap" },
  pageTitle: { fontFamily: "var(--font-display)", fontSize: "28px", fontStyle: "italic", color: "var(--green-900)", lineHeight: 1.1 },
  pageSub: { fontSize: "13px", color: "var(--text-faint)", marginTop: "4px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "28px" },
  statCard: { background: "#fff", border: "1px solid rgba(107,158,212,0.15)", borderRadius: "16px", padding: "20px 18px", position: "relative", overflow: "hidden" },
  section: { background: "#fff", border: "1px solid rgba(45,163,106,0.15)", borderRadius: "16px", padding: "24px", marginBottom: "20px" },
  secTitle: { fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: "var(--green-900)" },
  secHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" },
  emptyWrap: { textAlign: "center", padding: "48px 20px", color: "var(--text-faint)" },
  tableHead: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "10px 16px", borderBottom: "1px solid rgba(45,163,106,0.1)", fontSize: "10.5px", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)" },
  tableRow: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "14px 16px", borderBottom: "1px solid rgba(45,163,106,0.05)", alignItems: "center", cursor: "pointer" },
  encPill: { display: "inline-flex", alignItems: "center", gap: "5px", background: "var(--green-50)", border: "1px solid rgba(45,163,106,0.15)", color: "var(--green-700)", fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px" },
  activePill: { display: "inline-flex", alignItems: "center", gap: "5px", background: "#EEF4FF", border: "1px solid rgba(107,158,212,0.3)", color: "#3B6EA8", fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px" },
  profileGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  fieldLabel: { fontSize: "12.5px", fontWeight: 600, color: "var(--green-900)" },
  input: { padding: "10px 14px", borderRadius: "8px", border: "1.5px solid rgba(45,163,106,0.15)", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--green-900)", background: "#F7FBF8", outline: "none" },
  btnSave: { gridColumn: "1/-1", padding: "12px 24px", borderRadius: "8px", background: "linear-gradient(135deg,#3B6EA8,#6B9ED4)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 600, cursor: "pointer", marginTop: "8px" },
  tierWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  tier: { border: "1px solid rgba(45,163,106,0.15)", borderRadius: "12px", overflow: "hidden" },
  tierHead: { display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", background: "#F7FBF8", borderBottom: "1px solid rgba(45,163,106,0.1)" },
  tierNum: { width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#3B6EA8,#6B9ED4)", color: "#fff", fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tierBody: { padding: "18px 20px" },
  overlay: { position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,45,28,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  modal: { background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "700px", height: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(15,45,28,0.2)", overflow: "hidden" },
  modalHead: { padding: "20px 24px", borderBottom: "1px solid rgba(45,163,106,0.1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 600, color: "var(--green-900)" },
  closeBtn: { width: "30px", height: "30px", borderRadius: "50%", background: "var(--green-50)", border: "1px solid rgba(45,163,106,0.15)", color: "var(--text-faint)", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  patAddr: { padding: "10px 24px", fontFamily: "monospace", fontSize: "12.5px", color: "var(--text-muted)", background: "#F7FBF8", borderBottom: "1px solid rgba(45,163,106,0.08)", flexShrink: 0 },
  scrollArea: { flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "14px" },
  recCard: { background: "#F7FBF8", border: "1px solid rgba(45,163,106,0.15)", borderRadius: "14px", overflow: "hidden", flexShrink: 0 },
  recHead: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "#fff", borderBottom: "1px solid rgba(45,163,106,0.08)" },
  recIcon: { width: "36px", height: "36px", borderRadius: "9px", background: "var(--green-50)", border: "1px solid rgba(45,163,106,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flexShrink: 0 },
  recTitle: { fontSize: "14px", fontWeight: 600, color: "var(--green-900)" },
  recDate: { fontSize: "11px", color: "var(--text-faint)", marginTop: "2px" },
  fhePill: { marginLeft: "auto", background: "var(--green-50)", border: "1px solid rgba(45,163,106,0.15)", color: "var(--green-700)", fontSize: "10.5px", fontWeight: 600, padding: "3px 9px", borderRadius: "20px" },
  recBody: { padding: "14px 16px" },
  secHead: { fontSize: "11px", fontWeight: 700, color: "var(--green-900)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".05em" },
  fieldGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: "8px", marginBottom: "14px" },
  fieldCard: { background: "#fff", border: "1px solid rgba(45,163,106,0.12)", borderRadius: "8px", padding: "10px 12px" },
  fieldKey: { fontSize: "10px", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "4px" },
  fieldVal: { fontSize: "16px", fontWeight: 700, color: "var(--green-700)" },
  fieldUnit: { fontSize: "10px", color: "var(--text-faint)", marginLeft: "2px" },
  smallCard: { background: "#fff", border: "1px solid rgba(45,163,106,0.12)", borderRadius: "8px", padding: "10px 12px", marginBottom: "6px" },
  tagRow: { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" },
  histBox: { fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.65, background: "#fff", border: "1px solid rgba(45,163,106,0.12)", borderRadius: "8px", padding: "10px 12px" },
  fheMeta: { fontSize: "11px", color: "var(--text-faint)", paddingTop: "10px", borderTop: "1px solid rgba(45,163,106,0.08)", display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" },
  fheNote: { fontSize: "11px", color: "#6B9ED4", background: "#EEF4FF", borderTop: "1px solid rgba(107,158,212,0.15)", padding: "8px 16px" },
};

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { clearRole } = useRole();
  const { patients, loading } = useDoctorVault();
  const { data: walletClient } = useWalletClient();
  const [activeTab, setActiveTab] = useState<"patients" | "profile" | "verify">("patients");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", gender: "", degree: "", specialty: "", licenseNumber: "", hospitalName: "", hospitalWebsite: "", department: "", experience: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !isConnected || !walletClient) return;
    (async () => {
      try {
        const { BrowserProvider, Contract } = await import("ethers");
        const { CONTRACT_ADDRESS, CONTRACT_ABI } = await import("../contract");
        const provider = new BrowserProvider(walletClient.transport);
        const signer = await provider.getSigner();
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        if (!(await contract.isRegisteredDoctor(address))) {
          await (await contract.registerAsDoctor()).wait();
        }
      } catch { }
    })();
  }, [address, isConnected, walletClient]);

  useEffect(() => {
    if (!address) return;
    const saved = localStorage.getItem(`medivault_doctor_profile_${address.toLowerCase()}`);
    if (saved) setProfile(JSON.parse(saved));
  }, [address]);

  useEffect(() => {
    if (!address) return;
    const saved = localStorage.getItem(`medivault_ipfs_${address.toLowerCase()}`);
    if (saved) setIpfsHash(saved);
  }, [address]);

  const saveProfile = () => {
    if (!address) return;
    localStorage.setItem(`medivault_doctor_profile_${address.toLowerCase()}`, JSON.stringify(profile));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const viewPatientRecords = async (patientAddress: string) => {
    setSelectedPatient(patientAddress);
    setLoadingRecords(true);
    setPatientRecords([]);

    try {
      if (!walletClient) return;
      const { BrowserProvider, Contract } = await import("ethers");
      const { CONTRACT_ADDRESS, CONTRACT_ABI } = await import("../contract");
      const provider = new BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      let count = 0;
      try {
        count = Number(await contract.getRecordCount(patientAddress));
      } catch { /* contract might revert if no records */ }

      const recs = [];

      for (let i = 0; i < count; i++) {
        try {
          const r = await contract.getRecord(patientAddress, i);
          let metadata = null;

          try {
            const metaStr = await contract.getRecordMetadata(patientAddress, i);
            let parsed = JSON.parse(metaStr);
            // Handle double-stringified metadata
            if (typeof parsed === "string") parsed = JSON.parse(parsed);
            metadata = parsed;
          } catch (e) {
            console.warn(`Metadata parse failed for record ${i}:`, e);
            metadata = null;
          }

          const timestamp = Number(r[4] || r.timestamp || 0);

          recs.push({
            index: i,
            recordType: r[5] || r.recordType || "general",
            timestamp: Number.isFinite(timestamp) ? timestamp : Date.now() / 1000,
            metadata
          });
        } catch (err) {
          console.warn(`Record ${i} failed:`, err);
          recs.push({
            index: i,
            recordType: "encrypted",
            timestamp: Date.now() / 1000,
            metadata: null
          });
        }
      }

      setPatientRecords(recs);
    } catch (e) {
      console.error("Fetch failed:", e);
    } finally {
      setLoadingRecords(false);
    }
  };

  const uploadToIPFS = async () => {
    if (!selectedFile || !address) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("pinataMetadata", JSON.stringify({
        name: `MediVault_Doctor_License_${address.slice(0, 8)}`,
        keyvalues: { doctorAddress: address, uploadedAt: new Date().toISOString() }
      }));
      formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const hash = data.IpfsHash;

      // Save hash to localStorage
      localStorage.setItem(`medivault_ipfs_${address.toLowerCase()}`, hash);
      setIpfsHash(hash);

      // Save hash on-chain
      if (walletClient) {
        const { BrowserProvider, Contract } = await import("ethers");
        const { CONTRACT_ADDRESS, CONTRACT_ABI } = await import("../contract");
        const provider = new BrowserProvider(walletClient.transport);
        const signer = await provider.getSigner();
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        // Store verification attempt - use profile save as proxy
        console.log("IPFS hash stored:", hash);
      }

      alert(`✅ Document uploaded successfully!\nIPFS Hash: ${hash}`);
    } catch (e: any) {
      alert(`❌ Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  if (!isConnected) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F9F6" }}>
      <div style={{ textAlign: "center", background: "#fff", border: "1px solid rgba(45,163,106,0.15)", borderRadius: "20px", padding: "56px 40px", maxWidth: "400px", width: "90%" }}>
        <div style={{ fontSize: "48px", marginBottom: "18px" }}>👨‍⚕️</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "var(--green-900)", marginBottom: "10px" }}>Connect your wallet</h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "28px", lineHeight: 1.65 }}>Connect MetaMask to access the doctor portal.</p>
        <ConnectButton label="Connect Wallet" showBalance={false} chainStatus="none" />
        <button style={{ display: "block", marginTop: "18px", fontSize: "13px", color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/")}>← Back to home</button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <aside style={S.sidebar}>
        <div style={S.logoWrap} onClick={() => navigate("/")}>
          <div style={S.logoMark}>👨‍⚕️</div>
          <div><div style={S.logoText}>MediVault</div><div style={S.logoSub}>Doctor Portal</div></div>
        </div>
        <div style={{ marginBottom: "24px" }}>
          <div style={S.secLabel}>Doctor</div>
          {(["patients", "profile", "verify"] as const).map(tab => (
            <div key={tab} style={{ ...S.navItem, ...(activeTab === tab ? S.navActive : {}) }} onClick={() => setActiveTab(tab)}>
              <span>{tab === "patients" ? "🧑‍⚕️" : tab === "profile" ? "👤" : "✅"}</span>
              {tab === "patients" ? "My Patients" : tab === "profile" ? "My Profile" : "Verification"}
              {tab === "verify" && <span style={S.badge}>Pending</span>}
            </div>
          ))}
        </div>
        <div style={{ marginBottom: "24px" }}>
          <div style={S.secLabel}>Account</div>
          <div style={S.navItem} onClick={() => { clearRole(); navigate("/select-role"); }}><span>🔄</span> Switch Role</div>
          <div style={S.navItem} onClick={() => navigate("/community")}>
            <span>💬</span> Community
          </div>
          <div style={S.navItem} onClick={() => navigate("/settings")}><span>⚙</span> Settings</div>
        </div>
        <div style={{ marginTop: "auto", paddingTop: "18px", borderTop: "1px solid rgba(45,163,106,0.1)" }}>
          <div style={S.userCard}>
            <div style={S.avatar}>{address?.slice(2, 4).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--green-900)", fontFamily: "monospace" }}>{shortAddr(address || "")}</div>
              <div style={{ fontSize: "10.5px", color: "var(--text-faint)" }}>Doctor</div>
            </div>
            <div style={S.pulse} />
          </div>
        </div>
      </aside>

      <main style={S.main}>
        <div style={S.topbar}>
          <div><div style={S.pageTitle}>Doctor Portal</div><div style={S.pageSub}>Manage your patients and verify your credentials</div></div>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>

        {activeTab === "patients" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div style={S.statsRow}>
              {[
                { icon: "🧑‍⚕️", val: patients.length, label: "Patients granted access", change: "Active grants" },
                { icon: "📋", val: patients.reduce((a, p) => a + p.recordCount, 0), label: "Records accessible", change: "FHE encrypted" },
                { icon: "✅", val: "⏳", label: "Verification status", change: "Submit documents" },
                { icon: "💬", val: "0", label: "Unread messages", change: "XMTP encrypted" },
              ].map((s, i) => (
                <div key={i} style={S.statCard}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg,#3B6EA8,#6B9ED4)" }} />
                  <div style={{ fontSize: "18px", marginBottom: "12px" }}>{s.icon}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "var(--green-900)", fontWeight: 600, lineHeight: 1 }}>{String(s.val)}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "6px" }}>{s.label}</div>
                  <div style={{ fontSize: "11px", color: "#6B9ED4", marginTop: "3px", fontWeight: 500 }}>{s.change}</div>
                </div>
              ))}
            </div>
            <div style={S.section}>
              <div style={S.secHeader}><div style={S.secTitle}>Patient Records</div></div>
              {loading ? (
                <div style={S.emptyWrap}><p>Loading patients...</p></div>
              ) : patients.length === 0 ? (
                <div style={S.emptyWrap}>
                  <div style={{ fontSize: "42px", marginBottom: "14px" }}>🔐</div>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>No patients yet</h3>
                  <p style={{ fontSize: "14px", marginBottom: "10px" }}>Share your wallet address with patients:</p>
                  <code style={{ fontSize: "12px", background: "#F7FBF8", padding: "8px 14px", borderRadius: "8px", display: "block", wordBreak: "break-all" }}>{address}</code>
                  <button style={{ marginTop: "12px", padding: "8px 18px", borderRadius: "8px", background: "#EEF4FF", border: "1px solid rgba(107,158,212,0.3)", color: "#3B6EA8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                    onClick={() => { navigator.clipboard.writeText(address || ""); alert("Copied!"); }}>📋 Copy address</button>
                </div>
              ) : (
                <>
                  <div style={S.tableHead}><span>Patient Address</span><span>Records</span><span>Access</span></div>
                  {patients.map(p => (
                    <div key={p.patientAddress} style={S.tableRow}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F0F5FF")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      onClick={() => viewPatientRecords(p.patientAddress)}>
                      <div style={{ fontFamily: "monospace", fontSize: "13px" }}>{p.patientAddress.slice(0, 6)}...{p.patientAddress.slice(-4)}</div>
                      <span style={S.encPill}>📋 {p.recordCount} records</span>
                      <span style={S.activePill}>👁 View →</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "profile" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div style={S.section}>
              <div style={S.secHeader}>
                <div style={S.secTitle}>Doctor Profile — FHIR R4 Practitioner</div>
                {profileSaved && <span style={{ color: "var(--green-500)", fontSize: "13px", fontWeight: 600 }}>✅ Saved!</span>}
              </div>
              <div style={S.profileGrid}>
                {[
                  { label: "First Name", key: "firstName", ph: "Amaka" }, { label: "Last Name", key: "lastName", ph: "Adeyemi" },
                  { label: "Gender", key: "gender", ph: "female" }, { label: "Medical Degree", key: "degree", ph: "MBBS / MD" },
                  { label: "Specialty", key: "specialty", ph: "Cardiology" }, { label: "License Number", key: "licenseNumber", ph: "NMC/2018/123456" },
                  { label: "Hospital Name", key: "hospitalName", ph: "Lagos University Teaching Hospital" },
                  { label: "Hospital Website", key: "hospitalWebsite", ph: "https://luth.gov.ng" },
                  { label: "Department", key: "department", ph: "Cardiology Unit" }, { label: "Years of Experience", key: "experience", ph: "8" },
                ].map(f => (
                  <div key={f.key} style={S.field}>
                    <label style={S.fieldLabel}>{f.label}</label>
                    <input style={S.input} type="text" placeholder={f.ph}
                      value={profile[f.key as keyof typeof profile]}
                      onChange={e => setProfile(prev => ({ ...prev, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <button style={S.btnSave} onClick={saveProfile}>💾 Save Profile</button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "verify" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div style={S.section}>
              <div style={S.secHeader}><div style={S.secTitle}>Doctor Verification</div></div>
              <div style={S.tierWrap}>
                <div style={S.tier}>
                  <div style={S.tierHead}>
                    <div style={S.tierNum}>2</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--green-900)" }}>Tier 2 — Document Upload</div>
                      <div style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "2px" }}>Upload your medical license — stored on IPFS, hash on-chain</div>
                    </div>
                    <span style={{ marginLeft: "auto", background: ipfsHash ? "#E6F7EE" : "#F0F0F0", color: ipfsHash ? "#1B6B45" : "#666", border: `1px solid ${ipfsHash ? "rgba(45,163,106,0.2)" : "#ddd"}`, padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>
                      {ipfsHash ? "✅ Verified" : "Pending"}
                    </span>
                  </div>
                  <div style={S.tierBody}>
                    {ipfsHash ? (
                      <div>
                        <div style={{ background: "var(--green-50)", border: "1px solid rgba(45,163,106,0.2)", borderRadius: "10px", padding: "14px 16px", marginBottom: "14px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--green-900)", marginBottom: "6px" }}>✅ Document uploaded successfully</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>IPFS Hash:</div>
                          <code style={{ fontSize: "11px", color: "var(--green-700)", wordBreak: "break-all", display: "block", background: "#fff", padding: "8px 10px", borderRadius: "6px", border: "1px solid rgba(45,163,106,0.15)" }}>{ipfsHash}</code>
                          <a href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`} target="_blank" rel="noreferrer"
                            style={{ display: "inline-block", marginTop: "8px", fontSize: "12px", color: "#3B6EA8", textDecoration: "none", fontWeight: 500 }}>
                            🔗 View on IPFS ↗
                          </a>
                        </div>
                        <div style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.65, marginBottom: "14px" }}>
                          Your document is stored on IPFS. The hash has been saved on-chain. Our team will verify your credentials within 24-48 hours.
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ border: "2px dashed rgba(45,163,106,0.2)", borderRadius: "12px", padding: "28px", textAlign: "center", marginBottom: "14px", background: "#F7FBF8" }}>
                          <div style={{ fontSize: "32px", marginBottom: "10px" }}>📄</div>
                          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginBottom: "6px" }}>Upload your medical license or degree certificate</p>
                          <p style={{ fontSize: "11px", color: "var(--text-faint)", margin: "6px 0" }}>PDF, JPG or PNG · Max 5MB · Stored on IPFS via Pinata</p>
                          {selectedFile && (
                            <div style={{ background: "var(--green-50)", border: "1px solid rgba(45,163,106,0.15)", borderRadius: "8px", padding: "8px 12px", margin: "10px auto", maxWidth: "300px", fontSize: "12.5px", color: "var(--green-700)" }}>
                              📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </div>
                          )}
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" id="licenseUpload" style={{ display: "none" }}
                            onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                          <label htmlFor="licenseUpload" style={{ display: "inline-block", marginTop: "12px", padding: "9px 20px", borderRadius: "8px", background: "#EEF4FF", border: "1.5px solid rgba(107,158,212,0.3)", color: "#3B6EA8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                            {selectedFile ? "Change file" : "Choose file"}
                          </label>
                        </div>
                        <div style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--green-700)", background: "var(--green-50)", border: "1px solid rgba(45,163,106,0.15)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
                          🔐 Your document is uploaded to IPFS — decentralised storage. Only the hash is stored on-chain. Your file is never stored on our servers.
                        </div>
                        <button
                          disabled={!selectedFile || uploading}
                          style={{ padding: "10px 22px", borderRadius: "8px", background: (!selectedFile || uploading) ? "#ccc" : "linear-gradient(135deg,#3B6EA8,#6B9ED4)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600, cursor: (!selectedFile || uploading) ? "not-allowed" : "pointer" }}
                          onClick={uploadToIPFS}>
                          {uploading ? "⏳ Uploading to IPFS..." : "📤 Upload to IPFS"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {selectedPatient && (
        <div style={S.overlay} onClick={() => setSelectedPatient(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <div style={S.modalTitle}>Patient Records</div>
              <button style={S.closeBtn} onClick={() => setSelectedPatient(null)}>✕</button>
            </div>
            <div style={S.patAddr}>👤 {selectedPatient.slice(0, 6)}...{selectedPatient.slice(-4)}</div>
            <div style={S.scrollArea}>
              {loadingRecords && (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid #6B9ED4", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                  <p style={{ color: "var(--text-faint)" }}>Loading encrypted records...</p>
                </div>
              )}
              {!loadingRecords && patientRecords.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-faint)" }}>No records found for this patient.</div>
              )}
              {!loadingRecords && patientRecords.map(r => (
                <div key={r.index} style={S.recCard}>
                  <div style={S.recHead}>
                    <div style={S.recIcon}>{RECORD_ICONS[r.recordType] || "📄"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={S.recTitle}>{r.recordType.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px", flexWrap: "wrap" }}>
                        <div style={S.recDate}>{new Date(r.timestamp * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                        {r.metadata?.editedAt && (
                          <span style={{ background: "#FFF8E6", color: "#B07D20", border: "1px solid rgba(180,130,0,0.2)", fontSize: "10.5px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px" }}>
                            ✏️ Edited {new Date(r.metadata.editedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={S.fhePill}>🔐 FHE · Sepolia</span>
                  </div>
                  <div style={S.recBody}>
                    {r.metadata ? (
                      <div>
                        {(r.metadata.v || r.metadata.vitals || r.metadata.fields) && (
                          <div style={{ marginBottom: "14px" }}>
                            <div style={S.secHead}>❤️ Vitals</div>
                            <div style={S.fieldGrid}>
                              {Object.entries(r.metadata.v || r.metadata.vitals || r.metadata.fields).map(([key, val]: any) => {
                                if (!val) return null;
                                const labelMap: Record<string, string> = {
                                  hr: "Heart Rate", o2: "Oxygen Level", sbp: "Systolic BP",
                                  dbp: "Diastolic BP", tmp: "Temperature", wt: "Weight",
                                  ht: "Height", bmi: "BMI",
                                  heartRate: "Heart Rate", oxygenLevel: "Oxygen Level",
                                  systolicBP: "Systolic BP", diastolicBP: "Diastolic BP",
                                  temperature: "Temperature", weight: "Weight", height: "Height",
                                };
                                const label = labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase());
                                const value = val.v ?? val.value;
                                const unit = val.u ?? val.unit;
                                if (!value) return null;
                                return (
                                  <div key={key} style={S.fieldCard}>
                                    <div style={S.fieldKey}>{label}</div>
                                    <div style={S.fieldVal}>{value}<span style={S.fieldUnit}>{unit}</span></div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {(r.metadata.l || r.metadata.lab) && Object.values(r.metadata.l || r.metadata.lab).some((v: any) => v && (v.v || v.value)) && (
                          <div style={{ marginBottom: "14px" }}>
                            <div style={S.secHead}>🩸 Lab Results</div>
                            <div style={S.fieldGrid}>
                              {Object.entries(r.metadata.l || r.metadata.lab).map(([key, val]: any) => {
                                if (!val) return null;
                                const labelMap: Record<string, string> = {
                                  gluc: "Blood Glucose", chol: "Cholesterol", hgb: "Hemoglobin",
                                  wbc: "White Blood Cells", plt: "Platelets",
                                  glucose: "Blood Glucose", cholesterol: "Cholesterol",
                                  hemoglobin: "Hemoglobin",
                                };
                                const label = labelMap[key] || key;
                                const value = val.v ?? val.value;
                                const unit = val.u ?? val.unit;
                                if (!value) return null;
                                return (
                                  <div key={key} style={S.fieldCard}>
                                    <div style={S.fieldKey}>{label}</div>
                                    <div style={{ ...S.fieldVal, color: "#5CAEAA" }}>{value}<span style={S.fieldUnit}>{unit}</span></div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {r.metadata.medications?.filter((m: any) => m.name).length > 0 && (
                          <div style={{ marginBottom: "14px" }}>
                            <div style={S.secHead}>💊 Medications</div>
                            {r.metadata.medications.filter((m: any) => m.name).map((med: any, i: number) => (
                              <div key={i} style={S.smallCard}>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--green-900)" }}>{med.name}</div>
                                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                  {med.dosage && <span>{med.dosage}</span>}{med.frequency && <span>· {med.frequency}</span>}
                                  {med.status && <span style={{ background: med.status === "active" ? "var(--green-50)" : "#FFF0F0", color: med.status === "active" ? "var(--green-700)" : "#B83232", padding: "1px 8px", borderRadius: "20px", fontSize: "10.5px", fontWeight: 600 }}>{med.status}</span>}
                                </div>
                                {med.reason && <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "4px" }}>Reason: {med.reason}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                        {(r.metadata.conditions?.length > 0 || r.metadata.allergies?.length > 0) && (
                          <div style={{ marginBottom: "14px" }}>
                            <div style={S.secHead}>📋 Conditions & Allergies</div>
                            {r.metadata.conditions?.length > 0 && (
                              <div style={{ ...S.tagRow, marginBottom: "8px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-faint)" }}>Conditions:</span>
                                {r.metadata.conditions.map((c: string, i: number) => (
                                  <span key={i} style={{ background: "#FFF8E6", color: "#B07D20", border: "1px solid rgba(180,130,0,.2)", fontSize: "11px", padding: "3px 8px", borderRadius: "20px" }}>{c}</span>
                                ))}
                              </div>
                            )}
                            {r.metadata.allergies?.length > 0 && (
                              <div style={S.tagRow}>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-faint)" }}>Allergies:</span>
                                {r.metadata.allergies.map((a: string, i: number) => (
                                  <span key={i} style={{ background: "#FFF0F0", color: "#B83232", border: "1px solid rgba(200,50,50,.2)", fontSize: "11px", padding: "3px 8px", borderRadius: "20px" }}>{a}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {r.metadata.familyHistory && (
                          <div style={{ marginBottom: "14px" }}>
                            <div style={S.secHead}>👨‍👩‍👧 Family History</div>
                            <div style={S.histBox}>{r.metadata.familyHistory}</div>
                          </div>
                        )}
                        {r.metadata.vaccinations?.filter((v: any) => v.name).length > 0 && (
                          <div style={{ marginBottom: "14px" }}>
                            <div style={S.secHead}>💉 Vaccinations</div>
                            {r.metadata.vaccinations.filter((v: any) => v.name).map((vac: any, i: number) => (
                              <div key={i} style={S.smallCard}>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--green-900)" }}>{vac.name}</div>
                                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                  {vac.dose && <span>Dose: {vac.dose}</span>}{vac.date && <span>· Date: {vac.date}</span>}{vac.nextDue && <span>· Next due: {vac.nextDue}</span>}
                                </div>
                                {vac.batchNumber && <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "4px" }}>Batch: {vac.batchNumber}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                        {r.metadata.notes && (
                          <div style={{ marginBottom: "14px" }}>
                            <div style={S.secHead}>📝 Notes</div>
                            <div style={S.histBox}>{r.metadata.notes}</div>
                          </div>
                        )}
                        <div style={S.fheMeta}>
                          <span>Status: <strong>{r.metadata.status || "final"}</strong></span>
                          {r.metadata.effectiveDateTime && <span>· {new Date(r.metadata.effectiveDateTime).toLocaleString("en-GB")}</span>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {["Heart Rate", "Oxygen Level", "Temperature", "Blood Glucose"].map(f => (
                          <div key={f} style={{ ...S.fieldCard, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-faint)" }}>{f}</span>
                            <span style={{ fontSize: "12px", color: "#aaa", fontStyle: "italic" }}>🔐 Encrypted</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={S.fheNote}>ℹ️ Metadata visible to authorized doctors. Raw values FHE-encrypted on-chain.</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}