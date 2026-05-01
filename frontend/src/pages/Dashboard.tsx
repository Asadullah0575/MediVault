import React, { useState } from "react";
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
    addRecord, grantAccess, revokeAccess,
  } = useMediVault();

  const { role } = useRole();
  
  const [showAdd, setShowAdd]     = useState(false);
  const [showGrant, setShowGrant] = useState(false);
  const [revoking, setRevoking]   = useState<string | null>(null);

// Redirect doctor to doctor portal
if (role === "doctor") {
  navigate("/doctor");
  return null;
}
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
                const meta = RECORD_TYPE_LABELS[r.recordType] || { label: r.recordType, icon: "📄" };
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
                    <span className={styles.encPill}>🔐 FHE Active</span>
                    <span className={styles.rowDate}>{fmtDate(r.timestamp)}</span>
                    <span className={styles.rowHash}>{shortAddr(address || "")}…#{r.index}</span>
                  </motion.div>
                );
              })}
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
            onSubmit={async (hr, o2, gl, tmp, type) => {
              await addRecord(hr, o2, gl, Math.round(tmp * 10), type);
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
    </div>
  );
}