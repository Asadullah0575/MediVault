import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { useRole } from "../hooks/useRole";
import { useDoctorVault } from "../hooks/useDoctorVault";
import { useAccount, useWalletClient } from "wagmi";
import styles from "./DoctorDashboard.module.css";

function shortAddr(a: string) { return `${a.slice(0,6)}...${a.slice(-4)}`; }

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { clearRole } = useRole();
  const { patients, loading } = useDoctorVault();
  const { data: walletClient } = useWalletClient();

  const [activeTab, setActiveTab]             = useState<"patients"|"profile"|"verify">("patients");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patientRecords, setPatientRecords]   = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords]   = useState(false);
  const [profileSaved, setProfileSaved]       = useState(false);
  const [profile, setProfile] = useState({
    firstName: "", lastName: "", gender: "", degree: "",
    specialty: "", licenseNumber: "", hospitalName: "",
    hospitalWebsite: "", department: "", experience: "",
  });

  useEffect(() => {
    if (!address) return;
    const saved = localStorage.getItem(`medivault_doctor_profile_${address.toLowerCase()}`);
    if (saved) setProfile(JSON.parse(saved));
  }, [address]);

  const saveProfile = () => {
    if (!address) return;
    localStorage.setItem(
      `medivault_doctor_profile_${address.toLowerCase()}`,
      JSON.stringify(profile)
    );
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
      try { count = Number(await contract.getRecordCount(patientAddress)); } catch { count = 0; }

      const recs = [];
      for (let i = 0; i < count; i++) {
        try {
          const r = await contract.getRecord(patientAddress, i);
          let metadata = null;
          try {
            const metaStr = await contract.getRecordMetadata(patientAddress, i);
            metadata = JSON.parse(metaStr);
          } catch { metadata = null; }

          recs.push({
            index: i,
            recordType: r[5] || r.recordType || "general",
            timestamp: Number(r[4] || r.timestamp || 0),
            metadata,
          });
        } catch {
          recs.push({ index: i, recordType: "encrypted", timestamp: Date.now() / 1000, metadata: null });
        }
      }
      setPatientRecords(recs);
      console.log("Loaded records:", recs);
    } catch (e: any) {
      console.error("Error:", e);
      setPatientRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Register as doctor on-chain when first visiting portal
useEffect(() => {
  if (!address || !isConnected || !walletClient) return;
  const registerDoctor = async () => {
    try {
      const { BrowserProvider, Contract } = await import("ethers");
      const { CONTRACT_ADDRESS, CONTRACT_ABI } = await import("../contract");
      const provider = new BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const alreadyRegistered = await contract.isRegisteredDoctor(address);
      if (!alreadyRegistered) {
        const tx = await contract.registerAsDoctor();
        await tx.wait();
        console.log("Doctor registered on-chain!");
      }
    } catch (e) {
      console.log("Doctor registration check:", e);
    }
  };
  registerDoctor();
}, [address, isConnected, walletClient]);

  if (!isConnected) {
    return (
      <div className={styles.notConnected}>
        <div className={styles.connectBox}>
          <div className={styles.connectIcon}>👨‍⚕️</div>
          <h2>Connect your wallet</h2>
          <p>Connect MetaMask to access the doctor portal.</p>
          <ConnectButton label="Connect Wallet" showBalance={false} chainStatus="none" />
          <button className={styles.backLink} onClick={() => navigate("/")}>← Back to home</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>

      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo} onClick={() => navigate("/")}>
          <div className={styles.sideLogoMark}>👨‍⚕️</div>
          <div>
            <div className={styles.sideLogoText}>MediVault</div>
            <div className={styles.sideLogoSub}>Doctor Portal</div>
          </div>
        </div>

        <div className={styles.sideSection}>
          <div className={styles.sideSectionLabel}>Doctor</div>
          <div className={`${styles.sideItem} ${activeTab==="patients" ? styles.sideItemActive : ""}`}
            onClick={() => setActiveTab("patients")}>
            <span>🧑‍⚕️</span> My Patients
          </div>
          <div className={`${styles.sideItem} ${activeTab==="profile" ? styles.sideItemActive : ""}`}
            onClick={() => setActiveTab("profile")}>
            <span>👤</span> My Profile
          </div>
          <div className={`${styles.sideItem} ${activeTab==="verify" ? styles.sideItemActive : ""}`}
            onClick={() => setActiveTab("verify")}>
            <span>✅</span> Verification
            <span className={styles.pendingBadge}>Pending</span>
          </div>
        </div>

        <div className={styles.sideSection}>
          <div className={styles.sideSectionLabel}>Account</div>
          <div className={styles.sideItem} onClick={() => { clearRole(); navigate("/select-role"); }}>
            <span>🔄</span> Switch Role
          </div>
          <div className={styles.sideItem} onClick={() => navigate("/settings")}>
            <span>⚙</span> Settings
          </div>
        </div>

        <div className={styles.sideFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>{address ? address.slice(2,4).toUpperCase() : "??"}</div>
            <div>
              <div className={styles.userName}>{shortAddr(address || "")}</div>
              <div className={styles.userRole}>Doctor</div>
            </div>
            <span className={styles.pendingPulse} title="Verification pending"/>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Doctor Portal</h1>
            <p className={styles.pageSub}>Manage your patients and verify your credentials</p>
          </div>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>

        {/* ── Patients Tab ── */}
        {activeTab === "patients" && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <div className={styles.statsRow}>
              {[
                { icon:"🧑‍⚕️", val: patients.length,                              label:"Patients granted access", change:"Active grants"   },
                { icon:"📋",   val: patients.reduce((a,p)=>a+p.recordCount,0),   label:"Records accessible",      change:"FHE encrypted"   },
                { icon:"✅",   val:"⏳",                                            label:"Verification status",     change:"Submit documents" },
                { icon:"💬",   val:"0",                                             label:"Unread messages",         change:"XMTP encrypted"  },
              ].map((s,i) => (
                <motion.div key={s.label} className={styles.statCard}
                  initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}>
                  <div className={styles.statIcon}>{s.icon}</div>
                  <div className={styles.statVal}>{String(s.val)}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                  <div className={styles.statChange}>{s.change}</div>
                </motion.div>
              ))}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Patient Records</h2>
              </div>
              {loading ? (
                <div className={styles.emptyState}>
                  <div className={styles.spinner}/>
                  <p>Loading your patients...</p>
                </div>
              ) : patients.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🔐</div>
                  <h3>No patients yet</h3>
                  <p>Patients need to grant you access from their dashboard.<br/>Share your wallet address:</p>
                  <code style={{fontSize:"12px",background:"#F7FBF8",padding:"8px 14px",borderRadius:"8px",display:"block",margin:"10px 0",wordBreak:"break-all"}}>{address}</code>
                  <button className={styles.btnCopy}
                    onClick={() => { navigator.clipboard.writeText(address || ""); alert("Address copied!"); }}>
                    📋 Copy wallet address
                  </button>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <div className={styles.tableHead}>
                    <span>Patient Address</span>
                    <span>Records</span>
                    <span>Access</span>
                  </div>
                  {patients.map((p) => (
                    <div key={p.patientAddress} className={styles.tableRow}
                      style={{cursor:"pointer"}}
                      onClick={() => viewPatientRecords(p.patientAddress)}>
                      <div style={{fontFamily:"monospace",fontSize:"13px"}}>
                        {p.patientAddress.slice(0,6)}...{p.patientAddress.slice(-4)}
                      </div>
                      <span className={styles.encPill}>📋 {p.recordCount} records</span>
                      <span className={styles.activePill}>👁 View records →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Doctor Profile — FHIR R4 Practitioner</h2>
                {profileSaved && (
                  <span style={{color:"var(--green-500)",fontSize:"13px",fontWeight:600}}>✅ Profile saved!</span>
                )}
              </div>
              <div className={styles.profileForm}>
                {[
                  { label:"First Name",          key:"firstName",       ph:"Amaka",                               type:"text"   },
                  { label:"Last Name",            key:"lastName",        ph:"Adeyemi",                             type:"text"   },
                  { label:"Gender",               key:"gender",          ph:"female",                              type:"text"   },
                  { label:"Medical Degree",       key:"degree",          ph:"MBBS / MD",                           type:"text"   },
                  { label:"Specialty",            key:"specialty",       ph:"Cardiology",                          type:"text"   },
                  { label:"License Number",       key:"licenseNumber",   ph:"NMC/2018/123456",                     type:"text"   },
                  { label:"Hospital Name",        key:"hospitalName",    ph:"Lagos University Teaching Hospital",  type:"text"   },
                  { label:"Hospital Website",     key:"hospitalWebsite", ph:"https://luth.gov.ng",                 type:"url"    },
                  { label:"Department",           key:"department",      ph:"Cardiology Unit",                     type:"text"   },
                  { label:"Years of Experience",  key:"experience",      ph:"8",                                   type:"number" },
                ].map((f) => (
                  <div key={f.label} className={styles.field}>
                    <label>{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.ph}
                      className={styles.input}
                      value={profile[f.key as keyof typeof profile]}
                      onChange={e => setProfile(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <button className={styles.btnSave} onClick={saveProfile}>💾 Save Profile</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Verification Tab ── */}
        {activeTab === "verify" && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Doctor Verification</h2>
              </div>
              <div className={styles.verifySteps}>
                <div className={styles.verifyTier}>
                  <div className={styles.tierHeader}>
                    <span className={styles.tierNum}>1</span>
                    <div>
                      <div className={styles.tierTitle}>Tier 1 — Self Declaration</div>
                      <div className={styles.tierSub}>Fill your profile and submit hospital website for review</div>
                    </div>
                    <span className={styles.tierBadge} style={{background:"#FFF8E6",color:"#B07D20",border:"1px solid rgba(180,130,0,0.2)"}}>Pending</span>
                  </div>
                  <div className={styles.tierBody}>
                    <p>Complete your doctor profile on the Profile tab. Once submitted, our team will verify your hospital website link within 24-48 hours.</p>
                    <button className={styles.btnVerify} onClick={() => setActiveTab("profile")}>Complete Profile →</button>
                  </div>
                </div>

                <div className={styles.verifyTier}>
                  <div className={styles.tierHeader}>
                    <span className={styles.tierNum}>2</span>
                    <div>
                      <div className={styles.tierTitle}>Tier 2 — Document Upload</div>
                      <div className={styles.tierSub}>Upload your medical license — stored on IPFS, hash on-chain</div>
                    </div>
                    <span className={styles.tierBadge} style={{background:"#F0F0F0",color:"#666",border:"1px solid #ddd"}}>Locked</span>
                  </div>
                  <div className={styles.tierBody}>
                    <div className={styles.uploadBox}>
                      <div style={{fontSize:"32px",marginBottom:"10px"}}>📄</div>
                      <p>Upload your medical license or degree certificate</p>
                      <p style={{fontSize:"11px",color:"var(--text-faint)",margin:"6px 0"}}>PDF, JPG or PNG · Max 5MB · Stored on IPFS</p>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className={styles.fileInput} id="licenseUpload"/>
                      <label htmlFor="licenseUpload" className={styles.btnUpload}>Choose file</label>
                    </div>
                    <div className={styles.ipfsNote}>
                      🔐 Your document is uploaded to IPFS — only the hash is stored on-chain. The admin wallet verifies and approves your account.
                    </div>
                    <button className={styles.btnVerify} disabled>Complete Tier 1 first</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* ── Patient Records Modal ── */}
      {selectedPatient && (
        <div className={styles.modalOverlay} onClick={() => setSelectedPatient(null)}>
          <motion.div
            className={styles.modal}
            onClick={e => e.stopPropagation()}
            initial={{opacity:0,scale:0.94,y:24}}
            animate={{opacity:1,scale:1,y:0}}
            exit={{opacity:0,scale:0.94}}
          >
            <div className={styles.modalHeader}>
              <h2>Patient Records</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedPatient(null)}>✕</button>
            </div>
            <div className={styles.modalPatientAddr}>
              👤 {selectedPatient?.slice(0,6)}...{selectedPatient?.slice(-4)}
            </div>

            {loadingRecords ? (
              <div style={{textAlign:"center",padding:"32px"}}>
                <div className={styles.spinner}/>
                <p style={{color:"var(--text-faint)"}}>Loading encrypted records...</p>
              </div>
            ) : patientRecords.length === 0 ? (
              <div style={{textAlign:"center",padding:"32px",color:"var(--text-faint)"}}>
                No records found for this patient.
              </div>
            ) : (
              <div className={styles.recordsList}>
                {patientRecords.map((r) => {
                  const icons: Record<string,string> = {
                    vitals:"❤️", blood_panel:"🩸", xray:"🦴",
                    vaccination:"💉", glucose:"📈", general:"📋"
                  };
                  const defaultFields = ["Heart Rate","Oxygen Level","Temperature","Blood Glucose"];
                  return (
                   <div key={r.index} className={styles.recordItem}>

                    {/* Top row — icon + title + date + FHE badge */}
                    <div className={styles.recordItemHeader}>
                     <div className={styles.recordIcon}>{icons[r.recordType] || "📄"}</div>
                      <div style={{flex:1}}>
                       <div className={styles.recordTitle}>
                         {r.recordType.replace("_"," ").replace(/\b\w/g,(c:string)=>c.toUpperCase())}
                        </div>
                        <div className={styles.recordDate}>
                          {new Date(r.timestamp*1000).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                        </div>
                      </div>
                      <span className={styles.encPillSmall}>🔐 FHE</span>
                    </div>

                    {/* Fields grid */}
                    <div className={styles.recordFields}>
                      {r.metadata?.fields
                        ? Object.entries(r.metadata.fields).map(([key, val]: [string, any]) => (
                            <div key={key} className={styles.recordField}>
                             <span className={styles.fieldName}>
                               {key.replace(/([A-Z])/g,' $1').replace(/^./,(s:string)=>s.toUpperCase())}
                             </span>
                             <div className={styles.fieldValueReal}>
                               {val.value}<span className={styles.fieldUnit}>{val.unit}</span>
                             </div>
                           </div>
                         ))
                       : ["Heart Rate","Oxygen Level","Temperature","Blood Glucose"].map((fieldName) => (
                           <div key={fieldName} className={styles.recordField}>
                             <span className={styles.fieldName}>{fieldName}</span>
                             <div className={styles.fieldValue}>
                               <span className={styles.lockIcon}>🔐</span>
                               <span className={styles.encryptedText}>Encrypted</span>
                              </div>
                            </div>
                          ))
                     }
                    </div>

                    {/* FHE note */}
                    <div className={styles.fheNote}>
                      ℹ️ Values FHE-encrypted on Sepolia — only authorized doctors can access.
                    </div>

                   </div>
                );
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}