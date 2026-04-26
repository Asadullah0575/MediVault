import { useState } from "react";
import { motion } from "framer-motion";
import styles from "./Modal.module.css";

interface Props {
  onClose: () => void;
  onSubmit: (doctorAddress: string) => Promise<void>;
  loading: boolean;
}

export default function GrantAccessModal({ onClose, onSubmit, loading }: Props) {
  const [addr, setAddr] = useState("");
  const [err,  setErr]  = useState("");

  const handleSubmit = async () => {
    if (!addr.startsWith("0x") || addr.length !== 42) {
      setErr("Please enter a valid Ethereum address (0x...)"); return;
    }
    setErr("");
    await onSubmit(addr);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ duration: 0.22 }}
      >
        <div className={styles.modalHeader}>
          <h2>Grant Doctor Access</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p className={styles.modalSub}>
          The doctor will be able to view your encrypted health records. You can revoke access at any time.
        </p>
        <div className={styles.fheBanner}>
          🩺 Access is cryptographically enforced on-chain
        </div>
        <div className={styles.field}>
          <label>Doctor's Wallet Address</label>
          <input
            type="text"
            value={addr}
            onChange={e => { setAddr(e.target.value); setErr(""); }}
            className={styles.input}
            placeholder="0xDoctorWalletAddress..."
          />
          {err && <span className={styles.fieldErr}>{err}</span>}
        </div>
        <div className={styles.accessInfo}>
          <div className={styles.accessInfoRow}><span>✅</span> Doctor can view all your encrypted records</div>
          <div className={styles.accessInfoRow}><span>✅</span> You can revoke anytime from the dashboard</div>
          <div className={styles.accessInfoRow}><span>✅</span> Every access event is logged on-chain</div>
          <div className={styles.accessInfoRow}><span>❌</span> Doctor cannot modify or delete your records</div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnCancel} onClick={onClose} disabled={loading}>Cancel</button>
          <button className={styles.btnSubmit} onClick={handleSubmit} disabled={loading || !addr}>
            {loading ? <><span className={styles.btnSpinner}/>Processing...</> : "Grant Access On-chain"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}