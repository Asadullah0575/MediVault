import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRole } from "../hooks/useRole";
import styles from "./RoleSelect.module.css";

export default function RoleSelect() {
  const { setRole } = useRole();
  const navigate = useNavigate();

  const handleSelect = (role: "patient" | "doctor") => {
  setRole(role);
  if (role === "patient") navigate("/dashboard");
  else navigate("/doctor/register");
};

  return (
    <div className={styles.root}>
      <div className={styles.bg} />
      <motion.div
        className={styles.container}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.logo}>🔐</div>
        <h1 className={styles.title}>Welcome to <em>MediVault</em></h1>
        <p className={styles.sub}>
          Your privacy-first health records on the blockchain.<br/>
          How are you using MediVault today?
        </p>

        <div className={styles.cards}>
          {/* Patient card */}
          <motion.div
            className={`${styles.card} ${styles.patientCard}`}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect("patient")}
          >
            <div className={styles.cardIcon}>🧑‍⚕️</div>
            <h2>I'm a Patient</h2>
            <p>Store and manage your encrypted health records. You control who sees your data.</p>
            <ul className={styles.cardFeatures}>
              <li>✓ Encrypted health vault</li>
              <li>✓ Grant / revoke doctor access</li>
              <li>✓ Full medical history</li>
              <li>✓ Community health forum</li>
            </ul>
            <button className={styles.btnPatient}>Continue as Patient →</button>
          </motion.div>

          {/* Doctor card */}
          <motion.div
            className={`${styles.card} ${styles.doctorCard}`}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect("doctor")}
          >
            <div className={styles.cardIcon}>👨‍⚕️</div>
            <h2>I'm a Doctor</h2>
            <p>Access your patients' encrypted records securely. Verification required.</p>
            <ul className={styles.cardFeatures}>
              <li>✓ View authorised patient records</li>
              <li>✓ FHIR R4 compliant data</li>
              <li>✓ Add clinical notes</li>
              <li>✓ Verified badge on profile</li>
            </ul>
            <button className={styles.btnDoctor}>Continue as Doctor →</button>
          </motion.div>
        </div>

        <p className={styles.privacy}>
          🔐 Your role is stored locally — never on-chain. Switch anytime from settings.
        </p>
      </motion.div>
    </div>
  );
}