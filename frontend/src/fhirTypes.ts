// FHIR R4 compliant type definitions for MediVault

export type ObservationStatus = "registered" | "preliminary" | "final" | "amended";
export type Gender = "male" | "female" | "other" | "unknown";
export type UserRole = "patient" | "doctor" | "admin" | null;

// LOINC codes for vital signs
export const LOINC_CODES = {
  HEART_RATE:        { code: "8867-4",  display: "Heart rate",           unit: "/min"   },
  OXYGEN_SAT:        { code: "2708-6",  display: "Oxygen saturation",    unit: "%"      },
  BODY_TEMP:         { code: "8310-5",  display: "Body temperature",     unit: "Cel"    },
  BLOOD_GLUCOSE:     { code: "2339-0",  display: "Blood glucose",        unit: "mg/dL"  },
  BLOOD_PRESSURE:    { code: "85354-9", display: "Blood pressure panel", unit: ""       },
  SYSTOLIC_BP:       { code: "8480-6",  display: "Systolic BP",          unit: "mmHg"   },
  DIASTOLIC_BP:      { code: "8462-4",  display: "Diastolic BP",         unit: "mmHg"   },
  BODY_WEIGHT:       { code: "29463-7", display: "Body weight",          unit: "kg"     },
  BODY_HEIGHT:       { code: "8302-2",  display: "Body height",          unit: "cm"     },
  BMI:               { code: "39156-5", display: "BMI",                  unit: "kg/m2"  },
};

// FHIR R4 Patient resource (encrypted fields marked)
export interface FHIRPatient {
  resourceType: "Patient";
  // Demographics — all encrypted on-chain
  name: { family: string; given: string[] };
  gender: Gender;
  birthDate: string;          // YYYY-MM-DD
  address?: {
    line: string;
    city: string;
    country: string;
    postalCode: string;
  };
  maritalStatus?: string;
  language?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  // Medical
  bloodType?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  allergies?: string[];
  chronicConditions?: string[];
  medications?: FHIRMedication[];
  familyHistory?: string;
}

// FHIR R4 Observation resource
export interface FHIRObservation {
  resourceType: "Observation";
  status: ObservationStatus;
  category: "vital-signs" | "laboratory" | "imaging";
  code: { loincCode: string; display: string };
  effectiveDateTime: string;   // ISO 8601
  valueQuantity?: { value: number; unit: string };
  component?: Array<{          // for blood pressure
    code: { loincCode: string; display: string };
    valueQuantity: { value: number; unit: string };
  }>;
  note?: string;
}

// FHIR R4 MedicationStatement
export interface FHIRMedication {
  resourceType: "MedicationStatement";
  status: "active" | "stopped" | "completed";
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate?: string;
  reasonCode?: string;
}

// FHIR R4 Practitioner
export interface FHIRPractitioner {
  resourceType: "Practitioner";
  name: { family: string; given: string[] };
  gender: Gender;
  identifier: {
    system: string;             // e.g. "https://www.nmc.org.ng" for Nigeria
    licenseNumber: string;
  };
  qualification: {
    degree: string;             // e.g. "MBBS", "MD"
    specialty: string;          // e.g. "Cardiology"
    issuer: string;             // university or medical board
    year: string;
  };
  practitionerRole: {
    hospitalName: string;
    hospitalWebsite: string;
    department: string;
  };
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  ipfsDocumentHash?: string;   // IPFS hash of uploaded license document
}

// Full health record combining FHIR resources
export interface MediVaultRecord {
  index: number;
  recordType: string;
  timestamp: number;
  fhirObservation?: FHIRObservation;
  // Extended vitals
  heartRate?: number;
  oxygenLevel?: number;
  temperature?: number;
  bloodGlucose?: number;
  systolicBP?: number;
  diastolicBP?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  observationStatus?: ObservationStatus;
  notes?: string;
}