import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./AddRecordModal.module.css";

interface Props {
  onClose: () => void;
  onSubmit: (hr: number, o2: number, gl: number, tmp: number, type: string, meta?: string) => Promise<void>;
  loading: boolean;
  initialData?: any;   
  isEditing?: boolean; 
}

type Tab = "vitals" | "lab" | "medications" | "history" | "vaccinations";

export default function AddRecordModal({ onClose, onSubmit, loading, initialData, isEditing }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("vitals");

  const vitals = initialData?.vitals || initialData?.fields || {};
  const lab = initialData?.lab || {};

  const [heartRate, setHeartRate] = useState(vitals.heartRate?.value?.toString() || "");
  const [systolicBP, setSystolicBP] = useState(vitals.systolicBP?.value?.toString() || "");
  const [diastolicBP, setDiastolicBP] = useState(vitals.diastolicBP?.value?.toString() || "");
  const [oxygen, setOxygen] = useState(vitals.oxygenLevel?.value?.toString() || "");
  const [temperature, setTemperature] = useState(vitals.temperature?.value?.toString() || "");
  const [weight, setWeight] = useState(vitals.weight?.value?.toString() || "");
  const [height, setHeight] = useState(vitals.height?.value?.toString() || "");
  const [status, setStatus] = useState(initialData?.status || "final");
  const [notes, setNotes] = useState(initialData?.notes || "");

  const [glucose, setGlucose] = useState(lab.glucose?.value?.toString() || "");
  const [cholesterol, setCholesterol] = useState(lab.cholesterol?.value?.toString() || "");
  const [hemoglobin, setHemoglobin] = useState(lab.hemoglobin?.value?.toString() || "");
  const [wbc, setWbc] = useState(lab.wbc?.value?.toString() || "");
  const [platelets, setPlatelets] = useState(lab.platelets?.value?.toString() || "");
  const [fastingState, setFastingState] = useState(lab.glucose?.fasting || "fasting");

  const [medications, setMedications] = useState(
    initialData?.medications?.length > 0
      ? initialData.medications
      : [{ name: "", dosage: "", frequency: "", status: "active", reason: "" }]
  );

  const [conditions, setConditions] = useState(initialData?.conditions?.join(", ") || "");
  const [allergies, setAllergies] = useState(initialData?.allergies?.join(", ") || "");
  const [familyHistory, setFamilyHistory] = useState(initialData?.familyHistory || "");

  const [vaccinations, setVaccinations] = useState(
    initialData?.vaccinations?.length > 0
      ? initialData.vaccinations
      : [{ name: "", dose: "", date: "", nextDue: "", batchNumber: "" }]
  );

  // Calculate BMI
  const bmi = weight && height
    ? (Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1)
    : "";

  const addMedication = () => setMedications(prev => [
    ...prev, { name: "", dosage: "", frequency: "", status: "active", reason: "" }
  ]);

  const addVaccination = () => setVaccinations(prev => [
    ...prev, { name: "", dose: "", date: "", nextDue: "", batchNumber: "" }
  ]);

  const handleSubmit = async () => {
    // Build compact metadata — remove null values to save gas
    const vitalsData: any = {};
    if (heartRate) vitalsData.hr = { v: Number(heartRate), u: "/min", l: "8867-4" };
    if (oxygen) vitalsData.o2 = { v: Number(oxygen), u: "%", l: "2708-6" };
    if (systolicBP) vitalsData.sbp = { v: Number(systolicBP), u: "mmHg", l: "8480-6" };
    if (diastolicBP) vitalsData.dbp = { v: Number(diastolicBP), u: "mmHg", l: "8462-4" };
    if (temperature) vitalsData.tmp = { v: Number(temperature), u: "Cel", l: "8310-5" };
    if (weight) vitalsData.wt = { v: Number(weight), u: "kg", l: "29463-7" };
    if (height) vitalsData.ht = { v: Number(height), u: "cm", l: "8302-2" };
    if (bmi) vitalsData.bmi = { v: Number(bmi), u: "kg/m2", l: "39156-5" };

    const labData: any = {};
    if (glucose) labData.gluc = { v: Number(glucose), u: "mg/dL", l: "2339-0", f: fastingState };
    if (cholesterol) labData.chol = { v: Number(cholesterol), u: "mg/dL", l: "2093-3" };
    if (hemoglobin) labData.hgb = { v: Number(hemoglobin), u: "g/dL", l: "718-7" };
    if (wbc) labData.wbc = { v: Number(wbc), u: "10³/µL", l: "6690-2" };
    if (platelets) labData.plt = { v: Number(platelets), u: "10³/µL", l: "777-3" };

    const metadata: any = { s: status, t: new Date().toISOString() };
    if (Object.keys(vitalsData).length > 0) metadata.v = vitalsData;
    if (Object.keys(labData).length > 0) metadata.l = labData;
    if (medications.filter(m => m.name).length > 0) metadata.m = medications.filter(m => m.name);
    if (conditions) metadata.c = conditions.split(",").map(c => c.trim()).filter(Boolean);
    if (allergies) metadata.a = allergies.split(",").map(a => a.trim()).filter(Boolean);
    if (familyHistory) metadata.fh = familyHistory;
    if (vaccinations.filter(v => v.name).length > 0) metadata.vac = vaccinations.filter(v => v.name);
    if (notes) metadata.n = notes;

    const typeMap: Record<Tab, string> = {
      vitals: "vitals", lab: "blood_panel", medications: "general",
      history: "general", vaccinations: "vaccination",
    };

    await onSubmit(
      Number(heartRate) || 0,
      Number(oxygen) || 0,
      Number(glucose) || 0,
      Math.round((Number(temperature) || 0) * 10),
      typeMap[activeTab],
      JSON.stringify(metadata),
    );
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "vitals",       label: "Vitals",       icon: "❤️" },
    { key: "lab",          label: "Lab Results",  icon: "🩸" },
    { key: "medications",  label: "Medications",  icon: "💊" },
    { key: "history",      label: "History",      icon: "📋" },
    { key: "vaccinations", label: "Vaccinations", icon: "💉" },
  ];

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
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2>{isEditing ? "Edit Health Record" : "Add Health Record"}</h2>
            <p className={styles.modalSubtitle}>
              FHIR R4 compliant · FHE encrypted
              {isEditing && <span style={{ marginLeft: "8px", background: "#FFF8E6", color: "#B07D20", padding: "2px 8px", borderRadius: "20px", fontSize: "11px" }}>✏️ Editing existing record</span>}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.fheBanner}>
          🔐 All values encrypted client-side before reaching the blockchain
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {tabs.map(t => (
            <button
              key={t.key}
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className={styles.tabContent}>
          <AnimatePresence mode="wait">

            {/* ── Vitals ── */}
            {activeTab === "vitals" && (
              <motion.div key="vitals"
                initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}}>
                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <label>Heart Rate <span className={styles.loinc}>LOINC: 8867-4</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" placeholder="72" value={heartRate}
                        onChange={e=>setHeartRate(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>/min</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Oxygen Saturation <span className={styles.loinc}>2708-6</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" placeholder="98" value={oxygen}
                        onChange={e=>setOxygen(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>%</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Systolic BP <span className={styles.loinc}>8480-6</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" placeholder="120" value={systolicBP}
                        onChange={e=>setSystolicBP(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>mmHg</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Diastolic BP <span className={styles.loinc}>8462-4</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" placeholder="80" value={diastolicBP}
                        onChange={e=>setDiastolicBP(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>mmHg</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Temperature <span className={styles.loinc}>8310-5</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" step="0.1" placeholder="36.6" value={temperature}
                        onChange={e=>setTemperature(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>°C</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Weight <span className={styles.loinc}>29463-7</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" placeholder="70" value={weight}
                        onChange={e=>setWeight(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>kg</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Height <span className={styles.loinc}>8302-2</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" placeholder="170" value={height}
                        onChange={e=>setHeight(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>cm</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>BMI <span className={styles.loinc}>39156-5</span></label>
                    <div className={styles.inputUnit}>
                      <input type="text" value={bmi} readOnly placeholder="Auto-calculated"
                        className={`${styles.input} ${styles.readOnly}`}/>
                      <span className={styles.unit}>kg/m²</span>
                    </div>
                  </div>
                </div>
                <div className={styles.field} style={{marginTop:"12px"}}>
                  <label>Observation Status</label>
                  <select value={status} onChange={e=>setStatus(e.target.value)} className={styles.select}>
                    <option value="final">Final</option>
                    <option value="preliminary">Preliminary</option>
                    <option value="amended">Amended</option>
                  </select>
                </div>
              </motion.div>
            )}

            {/* ── Lab Results ── */}
            {activeTab === "lab" && (
              <motion.div key="lab"
                initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}}>
                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <label>Blood Glucose <span className={styles.loinc}>2339-0</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" placeholder="95" value={glucose}
                        onChange={e=>setGlucose(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>mg/dL</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Fasting State</label>
                    <select value={fastingState} onChange={e=>setFastingState(e.target.value)} className={styles.select}>
                      <option value="fasting">Fasting</option>
                      <option value="non-fasting">Non-fasting</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Total Cholesterol <span className={styles.loinc}>2093-3</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" placeholder="180" value={cholesterol}
                        onChange={e=>setCholesterol(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>mg/dL</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Hemoglobin <span className={styles.loinc}>718-7</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" step="0.1" placeholder="13.5" value={hemoglobin}
                        onChange={e=>setHemoglobin(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>g/dL</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>White Blood Cells <span className={styles.loinc}>6690-2</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" step="0.1" placeholder="7.5" value={wbc}
                        onChange={e=>setWbc(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>10³/µL</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Platelets <span className={styles.loinc}>777-3</span></label>
                    <div className={styles.inputUnit}>
                      <input type="number" placeholder="250" value={platelets}
                        onChange={e=>setPlatelets(e.target.value)} className={styles.input}/>
                      <span className={styles.unit}>10³/µL</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Medications ── */}
            {activeTab === "medications" && (
              <motion.div key="medications"
                initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}}>
                {medications.map((med, i) => (
                  <div key={i} className={styles.repeatBlock}>
                    <div className={styles.repeatHeader}>
                      <span>💊 Medication {i + 1}</span>
                      {i > 0 && (
                        <button className={styles.removeBtn}
                          onClick={() => setMedications(prev => prev.filter((_,j)=>j!==i))}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className={styles.fieldGrid}>
                      <div className={styles.field}>
                        <label>Medication Name</label>
                        <input type="text" placeholder="e.g. Metformin" className={styles.input}
                          value={med.name}
                          onChange={e => setMedications(prev => prev.map((m,j)=>j===i?{...m,name:e.target.value}:m))}/>
                      </div>
                      <div className={styles.field}>
                        <label>Dosage</label>
                        <input type="text" placeholder="e.g. 500mg" className={styles.input}
                          value={med.dosage}
                          onChange={e => setMedications(prev => prev.map((m,j)=>j===i?{...m,dosage:e.target.value}:m))}/>
                      </div>
                      <div className={styles.field}>
                        <label>Frequency</label>
                        <input type="text" placeholder="e.g. Twice daily" className={styles.input}
                          value={med.frequency}
                          onChange={e => setMedications(prev => prev.map((m,j)=>j===i?{...m,frequency:e.target.value}:m))}/>
                      </div>
                      <div className={styles.field}>
                        <label>Status</label>
                        <select className={styles.select} value={med.status}
                          onChange={e => setMedications(prev => prev.map((m,j)=>j===i?{...m,status:e.target.value}:m))}>
                          <option value="active">Active</option>
                          <option value="stopped">Stopped</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className={styles.field} style={{gridColumn:"1/-1"}}>
                        <label>Reason</label>
                        <input type="text" placeholder="Why is this medication being taken?"
                          className={styles.input} value={med.reason}
                          onChange={e => setMedications(prev => prev.map((m,j)=>j===i?{...m,reason:e.target.value}:m))}/>
                      </div>
                    </div>
                  </div>
                ))}
                <button className={styles.addMoreBtn} onClick={addMedication}>＋ Add another medication</button>
              </motion.div>
            )}

            {/* ── History ── */}
            {activeTab === "history" && (
              <motion.div key="history"
                initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}}>
                <div className={styles.field}>
                  <label>Chronic Conditions <span className={styles.hint}>comma separated</span></label>
                  <input type="text" placeholder="e.g. Type 2 Diabetes, Hypertension"
                    value={conditions} onChange={e=>setConditions(e.target.value)} className={styles.input}/>
                </div>
                <div className={styles.field}>
                  <label>Allergies <span className={styles.hint}>comma separated</span></label>
                  <input type="text" placeholder="e.g. Penicillin, Peanuts, Latex"
                    value={allergies} onChange={e=>setAllergies(e.target.value)} className={styles.input}/>
                </div>
                <div className={styles.field}>
                  <label>Family Medical History</label>
                  <textarea placeholder="e.g. Father — Hypertension, Heart disease. Mother — Type 2 Diabetes..."
                    value={familyHistory} onChange={e=>setFamilyHistory(e.target.value)}
                    className={styles.textarea} rows={4}/>
                </div>
                <div className={styles.field}>
                  <label>Clinical Notes</label>
                  <textarea placeholder="Any additional notes for this record..."
                    value={notes} onChange={e=>setNotes(e.target.value)}
                    className={styles.textarea} rows={3}/>
                </div>
              </motion.div>
            )}

            {/* ── Vaccinations ── */}
            {activeTab === "vaccinations" && (
              <motion.div key="vaccinations"
                initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}}>
                {vaccinations.map((vac, i) => (
                  <div key={i} className={styles.repeatBlock}>
                    <div className={styles.repeatHeader}>
                      <span>💉 Vaccination {i + 1}</span>
                      {i > 0 && (
                        <button className={styles.removeBtn}
                          onClick={() => setVaccinations(prev => prev.filter((_,j)=>j!==i))}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className={styles.fieldGrid}>
                      <div className={styles.field}>
                        <label>Vaccine Name</label>
                        <input type="text" placeholder="e.g. COVID-19 (Pfizer)" className={styles.input}
                          value={vac.name}
                          onChange={e => setVaccinations(prev => prev.map((v,j)=>j===i?{...v,name:e.target.value}:v))}/>
                      </div>
                      <div className={styles.field}>
                        <label>Dose Number</label>
                        <input type="text" placeholder="e.g. 1st, 2nd, Booster" className={styles.input}
                          value={vac.dose}
                          onChange={e => setVaccinations(prev => prev.map((v,j)=>j===i?{...v,dose:e.target.value}:v))}/>
                      </div>
                      <div className={styles.field}>
                        <label>Date Administered</label>
                        <input type="date" className={styles.input}
                          value={vac.date}
                          onChange={e => setVaccinations(prev => prev.map((v,j)=>j===i?{...v,date:e.target.value}:v))}/>
                      </div>
                      <div className={styles.field}>
                        <label>Next Due Date</label>
                        <input type="date" className={styles.input}
                          value={vac.nextDue}
                          onChange={e => setVaccinations(prev => prev.map((v,j)=>j===i?{...v,nextDue:e.target.value}:v))}/>
                      </div>
                      <div className={styles.field} style={{gridColumn:"1/-1"}}>
                        <label>Batch Number</label>
                        <input type="text" placeholder="e.g. EK9231" className={styles.input}
                          value={vac.batchNumber}
                          onChange={e => setVaccinations(prev => prev.map((v,j)=>j===i?{...v,batchNumber:e.target.value}:v))}/>
                      </div>
                    </div>
                  </div>
                ))}
                <button className={styles.addMoreBtn} onClick={addVaccination}>＋ Add another vaccination</button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={styles.modalActions}>
          <button className={styles.btnCancel} onClick={onClose} disabled={loading}>Cancel</button>
          <button className={styles.btnSubmit} onClick={handleSubmit} disabled={loading}>
            {loading
              ? <><span className={styles.btnSpinner}/>Encrypting & storing...</>
              : isEditing ? "💾 Save Changes" : "🔐 Encrypt & Store on-chain"
            }
          </button>
        </div>
      </motion.div>
    </div>
  );
}