export interface TIMELINE_ITEM {
  year: string;
  title: string;
  description: string;
  icon: string;
}

export const aiService = {
  // Extract structured clinical fields from a file name or simple text
  async extractRecord(fileName: string, notesText = ""): Promise<{
    recordType: string;
    title: string;
    vitals?: any;
    lab?: any;
    notes: string;
  }> {
    const name = fileName.toLowerCase();
    const notes = notesText || `Uploaded medical document: ${fileName}`;

    if (name.includes("blood") || name.includes("panel") || name.includes("cbc")) {
      return {
        recordType: "blood_panel",
        title: "Blood Panel Report",
        lab: {
          hba1c: 5.6,
          cholesterol: 195,
          ldl: 115,
          hdl: 50
        },
        notes: notes + "\n\nAI Assessment: Lipid levels are border-line high. HbA1c is within the healthy range (5.6%). Keep monitor of diet and fats intake."
      };
    } else if (name.includes("vital") || name.includes("heart") || name.includes("pressure") || name.includes("bpm")) {
      return {
        recordType: "vitals",
        title: "Vitals Observation Check",
        vitals: {
          heartRate: 76,
          oxygenLevel: 99,
          glucoseLevel: 105,
          temperature: 36.8
        },
        notes: notes + "\n\nAI Assessment: Core vital metrics are stable. Normal body temperature (36.8°C) and robust pulse rate."
      };
    } else if (name.includes("vaccin") || name.includes("covid") || name.includes("shot") || name.includes("booster")) {
      return {
        recordType: "vaccination",
        title: "Immunization Log",
        notes: notes + "\n\nAI Assessment: Immunization record recorded successfully. Boosters help maintain antibody defenses. No immediate booster updates required."
      };
    } else if (name.includes("glucose") || name.includes("diabet") || name.includes("sugar")) {
      return {
        recordType: "vitals",
        title: "Blood Sugar Monitoring",
        vitals: {
          heartRate: 70,
          oxygenLevel: 98,
          glucoseLevel: 135, // Slightly high post-prandial
          temperature: 36.5
        },
        notes: notes + "\n\nAI Assessment: Post-prandial glucose levels read at 135 mg/dL. This is slightly elevated, normal under digesting states. Keep tracking."
      };
    } else {
      return {
        recordType: "general",
        title: fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
        notes: notes + "\n\nAI Assessment: General clinical record processed. Categorized under clinical notes and stored securely in FHE Vault."
      };
    }
  },

  // Generates timeline mapping from all records
  async generateTimeline(records: any[]): Promise<TIMELINE_ITEM[]> {
    if (records.length === 0) return [];
    
    return records
      .map(r => {
        const dateObj = new Date(r.timestamp * 1000);
        const year = dateObj.getFullYear().toString();
        const month = dateObj.toLocaleString("en-GB", { month: "short" });
        const day = dateObj.getDate();
        
        let title = r.metadata?.title || "Clinical Record";
        let icon = "📋";
        let desc = r.metadata?.notes || "No details provided.";

        if (r.recordType === "vitals") {
          icon = "❤️";
          if (r.metadata?.vitals) {
            const v = r.metadata.vitals;
            desc = `Vitals captured: Heart Rate ${v.heartRate} bpm, O2 Level ${v.oxygenLevel}%, Temp ${v.temperature}°C.`;
          }
        } else if (r.recordType === "blood_panel") {
          icon = "🩸";
          if (r.metadata?.lab) {
            const l = r.metadata.lab;
            desc = `Cholesterol read at ${l.cholesterol} mg/dL, HbA1c ${l.hba1c}%.`;
          }
        } else if (r.recordType === "vaccination") {
          icon = "💉";
          desc = r.metadata?.title || "Vaccine immunization recorded.";
        }

        return {
          year: `${day} ${month} ${year}`,
          title,
          description: desc,
          icon
        };
      })
      .sort((a, b) => new Date(b.year).getTime() - new Date(a.year).getTime());
  },

  // Summarizes health information across all records
  async generateHealthSummary(records: any[]): Promise<string> {
    if (records.length === 0) {
      return "No records uploaded yet. Upload a lab report or clinical note to generate your AI Health Summary.";
    }

    const vitalsCount = records.filter(r => r.recordType === "vitals").length;
    const labsCount = records.filter(r => r.recordType === "blood_panel").length;
    
    let summary = `MediVault AI has reviewed your ${records.length} clinical document(s). `;
    summary += "Overall, your cardiovascular and metabolic markers appear stable. ";

    const latestVitals = records.find(r => r.recordType === "vitals" && r.metadata?.vitals);
    if (latestVitals) {
      const v = latestVitals.metadata.vitals;
      summary += `Your latest vitals check (HR: ${v.heartRate} bpm, Temp: ${v.temperature}°C) indicates healthy cardiovascular responses. `;
    }

    const latestLab = records.find(r => r.recordType === "blood_panel" && r.metadata?.lab);
    if (latestLab) {
      const l = latestLab.metadata.lab;
      if (l.cholesterol > 190) {
        summary += `Metabolic review highlights a total cholesterol level of ${l.cholesterol} mg/dL, which is close to borderline high. `;
      } else {
        summary += `Metabolic review shows optimal cholesterol level of ${l.cholesterol} mg/dL. `;
      }
    }

    summary += "\n\n⚠️ Disclaimer: This summary is generated by AI based on your uploaded records to help you understand your data. It does NOT replace professional medical diagnosis, treatment, or consultation.";

    return summary;
  },

  // Identifies medications mentioned or implied across records
  async generateMedications(records: any[]): Promise<{ name: string; dosage: string; source: string }[]> {
    const meds: { name: string; dosage: string; source: string }[] = [];
    
    // Scan notes for keywords
    records.forEach(r => {
      const text = JSON.stringify(r.metadata).toLowerCase();
      if (text.includes("insulin") || text.includes("metformin")) {
        if (!meds.some(m => m.name === "Metformin")) {
          meds.push({ name: "Metformin", dosage: "500mg, Daily", source: r.metadata.title || "Glucose Logs" });
        }
      }
      if (text.includes("atorvastatin") || text.includes("statin") || text.includes("lipitor") || (r.recordType === "blood_panel" && r.metadata.lab?.cholesterol > 200)) {
        if (!meds.some(m => m.name === "Atorvastatin")) {
          meds.push({ name: "Atorvastatin (implied)", dosage: "10mg, Nightly", source: "Cholesterol Lab review" });
        }
      }
      if (text.includes("lisinopril") || text.includes("amlodipine") || text.includes("blood pressure")) {
        if (!meds.some(m => m.name === "Lisinopril")) {
          meds.push({ name: "Lisinopril", dosage: "10mg, Morning", source: "Cardiac Vitals History" });
        }
      }
    });

    if (meds.length === 0 && records.length > 0) {
      // Return a default mock multi-vitamin or similar common drug if it is a general review
      meds.push({ name: "Vitamin D3 Supplement", dosage: "2000 IU, Daily", source: "Recommended checkup guidelines" });
    }

    return meds;
  },

  // Highlight unusual lab values
  async generateLabInsights(records: any[]): Promise<{ marker: string; value: string; range: string; status: "normal" | "warning" }[]> {
    const insights: { marker: string; value: string; range: string; status: "normal" | "warning" }[] = [];

    records.forEach(r => {
      if (r.recordType === "blood_panel" && r.metadata.lab) {
        const l = r.metadata.lab;
        if (l.cholesterol) {
          insights.push({
            marker: "Total Cholesterol",
            value: `${l.cholesterol} mg/dL`,
            range: "< 200 mg/dL",
            status: l.cholesterol >= 200 ? "warning" : "normal"
          });
        }
        if (l.ldl) {
          insights.push({
            marker: "LDL (Bad) Cholesterol",
            value: `${l.ldl} mg/dL`,
            range: "< 100 mg/dL",
            status: l.ldl >= 100 ? "warning" : "normal"
          });
        }
        if (l.hdl) {
          insights.push({
            marker: "HDL (Good) Cholesterol",
            value: `${l.hdl} mg/dL`,
            range: "> 40 mg/dL",
            status: "normal"
          });
        }
        if (l.hba1c) {
          insights.push({
            marker: "HbA1c",
            value: `${l.hba1c}%`,
            range: "< 5.7% (Normal)",
            status: l.hba1c >= 5.7 ? "warning" : "normal"
          });
        }
      }

      if (r.recordType === "vitals" && r.metadata.vitals) {
        const v = r.metadata.vitals;
        if (v.glucoseLevel && v.glucoseLevel > 130) {
          insights.push({
            marker: "Random Blood Sugar",
            value: `${v.glucoseLevel} mg/dL`,
            range: "70 - 125 mg/dL",
            status: "warning"
          });
        }
        if (v.heartRate && (v.heartRate > 100 || v.heartRate < 60)) {
          insights.push({
            marker: "Resting Heart Rate",
            value: `${v.heartRate} bpm`,
            range: "60 - 100 bpm",
            status: "warning"
          });
        }
      }
    });

    return insights;
  },

  // Generate preparation questions for next doctor visit
  async generateDoctorQuestions(records: any[]): Promise<string[]> {
    const questions = [
      "Are my current vital metrics stable enough for starting a new high-intensity workout routine?",
      "How frequently should I monitor my blood panels based on my recent lab markers?"
    ];

    records.forEach(r => {
      if (r.recordType === "blood_panel" && r.metadata.lab) {
        const l = r.metadata.lab;
        if (l.cholesterol >= 190 && !questions.includes("Given that my total cholesterol is near borderline high, should I consider dietary adjustments or medical intervention?")) {
          questions.push("Given that my total cholesterol is near borderline high, should I consider dietary adjustments or medical intervention?");
        }
      }
      if (r.recordType === "vitals" && r.metadata.vitals?.glucoseLevel > 125 && !questions.includes("My blood sugar logs show occasional post-meal elevation. Do we need to test for pre-diabetes?")) {
        questions.push("My blood sugar logs show occasional post-meal elevation. Do we need to test for pre-diabetes?");
      }
    });

    return questions.slice(0, 4); // Max 4 questions
  }
};
