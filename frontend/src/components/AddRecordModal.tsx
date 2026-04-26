import { useState } from "react";
import { motion } from "framer-motion";
import styles from "./Modal.module.css";

interface Props {
  onClose: () => void;
  onSubmit: (hr: number, o2: number, gl: number, tmp: number, type: string) => Promise<void>;
  loading: boolean;
}

export default function AddRecordModal({ onClose, onSubmit, loading }: Props) {
  const [type, setType] = useState("vitals");
  const [hr,   setHr]   = useState("72");
  const [o2,   setO2]   = useState("98");
  const [gl,   setGl]   = useState("95");
  const [tmp,  setTmp]  = useState("36.6");

  const handleSubmit = async () => {
    await onSubmit(Number(hr), Number(o2), Number(gl), Number(tmp), type);
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
          <h2>Add Encrypted Health Record</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p className={styles.modalSub}>
          All values are encrypted client-side with FHE before being stored on-chain. Nobody can read your raw data.
        </p>
        <div className={styles.fheBanner}>
          🔐 FHE encryption active — data never leaves your browser in plaintext
        </div>
        <div className={styles.field}>
          <label>Record Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className={styles.select}>
            <option value="vitals">❤️ Vitals</option>
            <option value="blood_panel">🩸 Blood Panel</option>
            <option value="xray">🦴 X-Ray</option>
            <option value="vaccination">💉 Vaccination</option>
            <option value="glucose">📈 Glucose</option>
            <option value="general">📋 General</option>
          </select>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label>Heart Rate <span className={styles.unit}>bpm</span></label>
            <input type="number" value={hr} onChange={e => setHr(e.target.value)} className={styles.input} min="30" max="220" placeholder="72"/>
          </div>
          <div className={styles.field}>
            <label>Oxygen Level <span className={styles.unit}>%</span></label>
            <input type="number" value={o2} onChange={e => setO2(e.target.value)} className={styles.input} min="50" max="100" placeholder="98"/>
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label>Glucose <span className={styles.unit}>mg/dL</span></label>
            <input type="number" value={gl} onChange={e => setGl(e.target.value)} className={styles.input} min="30" max="600" placeholder="95"/>
          </div>
          <div className={styles.field}>
            <label>Temperature <span className={styles.unit}>°C</span></label>
            <input type="number" step="0.1" value={tmp} onChange={e => setTmp(e.target.value)} className={styles.input} min="35" max="42" placeholder="36.6"/>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnCancel} onClick={onClose} disabled={loading}>Cancel</button>
          <button className={styles.btnSubmit} onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className={styles.btnSpinner}/>Encrypting...</> : "🔐 Encrypt & Store on-chain"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}