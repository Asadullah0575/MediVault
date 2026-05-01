import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useRole } from "../hooks/useRole";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import styles from "./Settings.module.css";

function shortAddr(a: string) { return `${a.slice(0,6)}...${a.slice(-4)}`; }

export default function Settings() {
  const navigate = useNavigate();
  const { role, clearRole } = useRole();
  const { address, isConnected } = useAccount();

  const handleSwitchRole = () => {
    clearRole();
    navigate("/select-role");
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(role === "doctor" ? "/doctor" : "/dashboard")}>
          ← Back to Dashboard
        </button>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.content}>
        {/* Account */}
        <motion.div className={styles.section} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.05}}>
          <h2 className={styles.sectionTitle}>👤 Account</h2>
          <div className={styles.row}>
            <div className={styles.rowLabel}>Connected wallet</div>
            <div className={styles.rowValue}>
              <code className={styles.address}>{address || "Not connected"}</code>
              <ConnectButton showBalance={false} chainStatus="none" />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLabel}>Current role</div>
            <div className={styles.rowValue}>
              <span className={`${styles.roleBadge} ${role === "doctor" ? styles.doctorBadge : styles.patientBadge}`}>
                {role === "doctor" ? "👨‍⚕️ Doctor" : "🧑‍⚕️ Patient"}
              </span>
              <button className={styles.btnSwitch} onClick={handleSwitchRole}>
                Switch role
              </button>
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLabel}>Network</div>
            <div className={styles.rowValue}>
              <span className={styles.networkBadge}>⛓ Sepolia Testnet</span>
              <button className={styles.btnLink} onClick={() => window.open("https://sepolia.etherscan.io", "_blank")}>
                View on Etherscan ↗
              </button>
            </div>
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.div className={styles.section} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}}>
          <h2 className={styles.sectionTitle}>🔐 Privacy & Encryption</h2>
          <div className={styles.infoBox}>
            <div className={styles.infoRow}><span>✅</span> All health records encrypted with FHE (euint32)</div>
            <div className={styles.infoRow}><span>✅</span> Data never stored in plaintext on-chain</div>
            <div className={styles.infoRow}><span>✅</span> Only you can grant/revoke access to your records</div>
            <div className={styles.infoRow}><span>✅</span> Role stored locally — never on blockchain</div>
            <div className={styles.infoRow}><span>✅</span> FHIR R4 compliant data structure</div>
          </div>
        </motion.div>

        {/* Contract */}
        <motion.div className={styles.section} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.15}}>
          <h2 className={styles.sectionTitle}>⛓ Contract Info</h2>
          <div className={styles.row}>
            <div className={styles.rowLabel}>Contract address</div>
            <div className={styles.rowValue}>
              <code className={styles.address}>0xEeef654Bc2B1D5287975B38E659B3ee0b348db15</code>
              <button className={styles.btnLink}
                onClick={() => window.open("https://sepolia.etherscan.io/address/0xEeef654Bc2B1D5287975B38E659B3ee0b348db15", "_blank")}>
                View ↗
              </button>
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLabel}>Network</div>
            <div className={styles.rowValue}>Sepolia Testnet (Chain ID: 11155111)</div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLabel}>FHE Protocol</div>
            <div className={styles.rowValue}>Zama FHEVM · euint32 encrypted fields</div>
          </div>
        </motion.div>

        {/* Danger zone */}
        <motion.div className={`${styles.section} ${styles.dangerSection}`} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.2}}>
          <h2 className={styles.sectionTitle}>⚠️ Danger Zone</h2>
          <div className={styles.dangerRow}>
            <div>
              <div className={styles.dangerTitle}>Clear local data</div>
              <div className={styles.dangerSub}>Removes your role preference. Your on-chain records are unaffected.</div>
            </div>
            <button className={styles.btnDanger} onClick={() => { clearRole(); navigate("/"); }}>
              Clear & logout
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}