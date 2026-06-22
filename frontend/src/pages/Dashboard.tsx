import React, { useState, useEffect } from "react";
import { useRole } from "../hooks/useRole";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { useMediVault } from "../hooks/useMediVault";
import AddRecordModal from "../components/AddRecordModal";
import GrantAccessModal from "../components/GrantAccessModal";
import styles from "./Dashboard.module.css";

function shortAddr(a: string) { return `${a.slice(0,6)}...${a.slice(-4)}`; }
function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
}

const RECORD_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  vitals:      { label: "Vitals",        icon: "❤️" },
  blood_panel: { label: "Blood Panel",   icon: "🩸" },
  xray:        { label: "X-Ray",         icon: "🦴" },
  vaccination: { label: "Vaccination",   icon: "💉" },
  glucose:     { label: "Glucose",       icon: "📈" },
  general:     { label: "General",       icon: "📋" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    address, isConnected, loading, error, txHash,
    records, grantedDoctors, totalStored,
    addRecord, updateRecord, grantAccess, revokeAccess,
  } = useMediVault();

  const { role } = useRole();
  
  const [showAdd, setShowAdd]     = useState(false);
  const [showGrant, setShowGrant] = useState(false);
  const [revoking, setRevoking]   = useState<string | null>(null);
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editMetadata, setEditMetadata] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (role === "doctor") {
      navigate("/doctor");
    }
  }, [role, navigate]);

  if (role === "doctor") return null;
  if (!isConnected) {
    return (
      <div className={styles.notConnected}>
        <div className={styles.connectBox}>
          <div className={styles.connectIcon}>🔐</div>
          <h2>Connect your wallet</h2>
          <p>Connect MetaMask to access your encrypted health records.</p>
          <ConnectButton label="Connect Wallet" showBalance={false} chainStatus="none" />
          <button className={styles.backLink} onClick={() => navigate("/")}>← Back to home</button>
        </div>
      </div>
    );
  }

  const handleRevoke = async (doctor: string) => {
    setRevoking(doctor);
    await revokeAccess(doctor);
    setRevoking(null);
  };

  return (
    <div className={styles.root}>

      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo} onClick={() => navigate("/")}>
          <div className={styles.sideLogoMark}>🔐</div>
          <div>
            <div className={styles.sideLogoText}>MediVault</div>
            <div className={styles.sideLogoSub}>FHE Protected</div>
            <div className={styles.sideItem} onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate("/community", { replace: true }); }}>
              <span>💬</span> Community
            </div>
          </div>
        </div>

        <div className={styles.sideSection}>
          <div className={styles.sideSectionLabel}>Patient</div>
          <div className={`${styles.sideItem} ${styles.sideItemActive}`}>
            <span>⬡</span> Dashboard
          </div>
          <div className={styles.sideItem} onClick={() => document.getElementById("records-section")?.scrollIntoView({ behavior: "smooth" })}>
            <span>📋</span> My Records
            <span className={styles.sideBadge}>{records.length}</span>
          </div>
          <div className={styles.sideItem} onClick={() => document.getElementById("doctors-section")?.scrollIntoView({ behavior: "smooth" })}>
            <span>🩺</span> Doctors
            <span className={styles.sideBadge}>{grantedDoctors.length}</span>
          </div>
          <div className={styles.sideItem} onClick={() => document.getElementById("doctors-section")?.scrollIntoView({ behavior: "smooth" })}>
            <span>🔑</span> Access Grants
          </div>
        </div>

        <div className={styles.sideSection}>
          <div className={styles.sideSectionLabel}>Network</div>
          <div className={styles.sideItem} onClick={() => window.open("https://sepolia.etherscan.io", "_blank")}>
            <span>⛓</span> Sepolia Testnet
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
              <div className={styles.userRole}>Patient</div>
            </div>
            <span className={styles.encPulse} title="FHE active"/>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={styles.main}>

        {/* topbar */}
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Health Dashboard</h1>
            <p className={styles.pageSub}>All records are FHE-encrypted on Sepolia Testnet</p>
          </div>
          <div className={styles.topActions}>
            <ConnectButton showBalance={false} chainStatus="icon" />
            <button className={styles.btnAdd} onClick={() => setShowAdd(true)}>＋ Add Record</button>
          </div>
        </div>

        {/* alerts */}
        <AnimatePresence>
          {error && (
            <motion.div className={styles.alertError} initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              ⚠️ {error}
            </motion.div>
          )}
          {txHash && (
            <motion.div className={styles.alertSuccess} initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              ✅ Transaction confirmed —{" "}
              <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
                view on Etherscan ↗
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* stat cards */}
        <div className={styles.statsRow}>
          {[
            { icon:"🔐", val: records.length,         label:"Encrypted Records",    change:"FHE secured" },
            { icon:"🩺", val: grantedDoctors.length,  label:"Active Doctors",       change:"Access granted" },
            { icon:"⛓",  val: totalStored,            label:"Total Records Stored", change:"On-chain" },
            { icon:"🛡",  val:"100%",                  label:"FHE Coverage",         change:"euint32 encrypted" },
          ].map((s, i) => (
            <motion.div key={s.label} className={styles.statCard}
              initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div className={styles.statVal}>{String(s.val)}</div>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statChange}>{s.change}</div>
            </motion.div>
          ))}
        </div>

        {/* records table */}
        <div className={styles.section} id="records-section">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Health Records</h2>
            <button className={styles.btnSecondary} onClick={() => setShowAdd(true)}>＋ New record</button>
          </div>

          {loading && records.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.spinner}/>
              <p>Loading your encrypted records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <h3>No records yet</h3>
              <p>Add your first encrypted health record to get started.</p>
              <button className={styles.btnAdd} onClick={() => setShowAdd(true)}>＋ Add Record</button>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <div className={styles.tableHead}>
                <span>Record</span>
                <span>Encryption</span>
                <span>Date</span>
                <span>On-chain ID</span>
              </div>
              {records.map((r, i) => {
  const meta = RECORD_TYPE_LABELS[r.recordType] || { label: r.recordType, icon: "■" };
  return (
    <motion.div key={r.index} className={styles.tableRow}
      initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}>
      <div className={styles.rowName}>
        <div className={styles.rowAvatar}>{meta.icon}</div>
        <div>
          <div className={styles.rowTitle}>{meta.label}</div>
          <div className={styles.rowSub}>Record #{r.index + 1}</div>
        </div>
      </div>
      <span className={styles.encPill}>🔒 FHE Active</span>
      <span className={styles.rowDate}>{fmtDate(r.timestamp)}</span>
      <span className={styles.rowHash}>{shortAddr(address || "")}…#{r.index}</span>
      <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
        {r.metadata?.editedAt && (
          <span className={styles.editedBadge}>✏️ Edited {new Date(r.metadata.editedAt).toLocaleDateString("en-GB")}</span>
        )}
        <button className={styles.btnView} onClick={() => setViewRecord({...r, index:r.index})}>👁 View</button>
        <button className={styles.btnEdit} onClick={() => {
          let meta2 = r.metadata || {};
          if (typeof meta2 === "string") { try { meta2 = JSON.parse(meta2); } catch {} }
          setEditRecord({...r, index:r.index, parsedMeta: meta2});
          setShowEdit(true);
        }}>✏️ Edit</button>
      </div>
    </motion.div>
  );
})}
                  {records.map((r: any, i: number) => (
                    <div key={i} className={styles.recordRow}>
                      <div className={styles.recordType}>
                        {r.recordType.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </div>
                      <div className={styles.recordDate}>
                        {new Date(r.timestamp * 1000).toLocaleDateString("en-GB")}
                      </div>
                      {r.metadata?.editedAt && (
                        <span className={styles.editedBadge}>
                          ✏️ Edited {new Date(r.metadata.editedAt).toLocaleDateString("en-GB")}
                        </span>
                      )}
                      <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                        <button className={styles.btnView} onClick={() => setViewRecord({ ...r, index: i })}>
                          👁 View
                        </button>
                        <button className={styles.btnEdit} onClick={() => {
                          let meta = r.metadata || {};
                          if (typeof meta === "string") {
                            try { meta = JSON.parse(meta); } catch { }
                          }
                          setEditRecord({ ...r, index: i, parsedMeta: meta });
                          setShowEdit(true);
                        }}>
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  ))}
            </div>
          )}
        </div>

        {/* bottom grid */}
        <div className={styles.bottomGrid} id="doctors-section">

          {/* Doctor access */}
          <div className={styles.panel}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Doctor Access</h2>
              <button className={styles.btnSecondary} onClick={() => setShowGrant(true)}>＋ Grant</button>
            </div>
            {grantedDoctors.length === 0 ? (
              <div className={styles.emptySmall}>No doctors granted access yet.</div>
            ) : (
              grantedDoctors.map((doc) => (
                <div key={doc} className={styles.doctorRow}>
                  <div className={styles.doctorAvatar}>{doc.slice(2,4).toUpperCase()}</div>
                  <div>
                    <div className={styles.doctorAddr}>{shortAddr(doc)}</div>
                    <div className={styles.doctorStatus}>Access active</div>
                  </div>
                  <button
                    className={styles.btnRevoke}
                    disabled={revoking === doc}
                    onClick={() => handleRevoke(doc)}
                  >
                    {revoking === doc ? "..." : "Revoke"}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* FHE pipeline */}
          <div className={styles.panel}>
            <h2 className={styles.sectionTitle} style={{marginBottom:"20px"}}>FHE Encryption Pipeline</h2>
            {[
              { n:"1", text:"Patient enters health data — encrypted client-side using FHEVM public key before leaving the browser.", icon:"📝" },
              { n:"2", text:"Encrypted euint32 ciphertext is stored on Sepolia — no one on the network can read the values.", icon:"⛓" },
              { n:"3", text:"Doctor requests access → patient grants on-chain → Gateway KMS decrypts only for that authorised address.", icon:"🔓" },
            ].map((s, i) => (
              <div key={s.n}>
                <div className={styles.pipeStep}>
                  <div className={styles.pipeNum}>{s.n}</div>
                  <div className={styles.pipeText}>{s.text}</div>
                  <span className={styles.pipeIcon}>{s.icon}</span>
                </div>
                {i < 2 && <div className={styles.pipeConnector}/>}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAdd && (
          <AddRecordModal
            onClose={() => setShowAdd(false)}
            onSubmit={async (hr, o2, gl, tmp, type, meta) => {
              await addRecord(hr, o2, gl, tmp, type, meta);
              setShowAdd(false);
            }}
            loading={loading}
          />
        )}
        {showGrant && (
          <GrantAccessModal
            onClose={() => setShowGrant(false)}
            onSubmit={async (addr) => {
              await grantAccess(addr);
              setShowGrant(false);
            }}
            loading={loading}
          />
        )}
      </AnimatePresence>
      {/* View Record Modal */}
      {viewRecord && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,45,28,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setViewRecord(null)}>
          <div style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "600px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(45,163,106,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: "var(--green-900)" }}>
                  {viewRecord.recordType?.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "2px" }}>
                  {new Date(viewRecord.timestamp * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {viewRecord.metadata?.editedAt && (
                    <span style={{ marginLeft: "8px", background: "#FFF8E6", color: "#B07D20", padding: "2px 8px", borderRadius: "20px", fontSize: "11px" }}>
                      ✏️ Edited {new Date(viewRecord.metadata.editedAt).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setViewRecord(null)}
                style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--green-50)", border: "1px solid rgba(45,163,106,0.15)", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
              {viewRecord.metadata ? (
                <div>
                  {(viewRecord.metadata.vitals || viewRecord.metadata.fields || viewRecord.metadata.v) && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--green-900)", marginBottom: "8px" }}>❤️ Vitals</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: "8px" }}>
                        {Object.entries(viewRecord.metadata.vitals || viewRecord.metadata.fields || viewRecord.metadata.v).map(([key, val]: any) => val && val.value ? (
                          <div key={key} style={{ background: "#F7FBF8", border: "1px solid rgba(45,163,106,0.12)", borderRadius: "8px", padding: "10px 12px" }}>
                            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: "4px" }}>
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--green-700)" }}>{val.value}<span style={{ fontSize: "10px", color: "var(--text-faint)", marginLeft: "2px" }}>{val.unit}</span></div>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  )}
                  {(viewRecord.metadata.lab || viewRecord.metadata.l) && Object.values(viewRecord.metadata.lab || viewRecord.metadata.l).some((v: any) => v && v.value) && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--green-900)", marginBottom: "8px" }}>🩸 Lab Results</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: "8px" }}>
                        {Object.entries(viewRecord.metadata.lab || viewRecord.metadata.l).map(([key, val]: any) => val && val.value ? (
                          <div key={key} style={{ background: "#F7FBF8", border: "1px solid rgba(45,163,106,0.12)", borderRadius: "8px", padding: "10px 12px" }}>
                            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: "4px" }}>
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "#5CAEAA" }}>{val.value}<span style={{ fontSize: "10px", color: "var(--text-faint)", marginLeft: "2px" }}>{val.unit}</span></div>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  )}
                  {viewRecord.metadata.medications?.filter((m: any) => m.name).length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--green-900)", marginBottom: "8px" }}>💊 Medications</div>
                      {viewRecord.metadata.medications.filter((m: any) => m.name).map((med: any, i: number) => (
                        <div key={i} style={{ background: "#F7FBF8", border: "1px solid rgba(45,163,106,0.12)", borderRadius: "8px", padding: "10px 12px", marginBottom: "6px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--green-900)" }}>{med.name}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{med.dosage} · {med.frequency}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {viewRecord.metadata.notes && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--green-900)", marginBottom: "8px" }}>📝 Notes</div>
                      <div style={{ background: "#F7FBF8", border: "1px solid rgba(45,163,106,0.12)", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.65 }}>{viewRecord.metadata.notes}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-faint)" }}>🔐 Record is FHE encrypted</div>
              )}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(45,163,106,0.1)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button style={{ padding: "10px 20px", borderRadius: "8px", background: "linear-gradient(135deg,#1B6B45,#2DA36A)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                onClick={() => {
                  setViewRecord(null);
                  setEditRecord(viewRecord);
                  let meta = viewRecord.metadata || {};
                  if (typeof meta === "string") {
                    try { meta = JSON.parse(meta); } catch { }
                  }
                  setEditMetadata(meta);
                }}>
                ✏️ Edit Record
              </button>
              <button style={{ padding: "10px 20px", borderRadius: "8px", background: "#F7FBF8", border: "1px solid rgba(45,163,106,0.15)", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "13px", cursor: "pointer" }}
                onClick={() => setViewRecord(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Record Modal */}
      {showEdit && editRecord && (
        <AddRecordModal
          onClose={() => { setShowEdit(false); setEditRecord(null); }}
          isEditing={true}
          initialData={editRecord.parsedMeta}
          loading={loading}
          onSubmit={async (hr, o2, gl, tmp, type, meta) => {
            setSaving(true);
            try {
              const original = editRecord.parsedMeta || {};
              const newMeta = JSON.parse(meta || "{}");
              const updatedMeta = {
                ...original,
                ...newMeta,
                editedAt: new Date().toISOString(),
              };
              await updateRecord(editRecord.index, JSON.stringify(updatedMeta));
              setShowEdit(false);
              setEditRecord(null);
            } finally { setSaving(false); }
          }}
        />
      )}
    </div>
  );
}