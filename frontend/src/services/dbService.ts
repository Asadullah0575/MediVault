import { supabase } from "./supabaseClient";

export interface HealthRecord {
  id: string;
  patientAddress: string;
  recordType: string;
  timestamp: number;
  metadata: {
    title?: string;
    vitals?: {
      heartRate?: number;
      oxygenLevel?: number;
      glucoseLevel?: number;
      temperature?: number;
    };
    lab?: {
      hba1c?: number;
      cholesterol?: number;
      ldl?: number;
      hdl?: number;
    };
    notes?: string;
    status?: string;
    effectiveDateTime?: string;
    editedAt?: string;
    [key: string]: any;
  };
}

export interface AccessGrant {
  id: string;
  patientAddress: string;
  doctorAddress: string;
  doctorName: string;
  recordsAllowed: string[]; // ['vitals', 'blood_panel', etc.]
  created: number;
  expiration: number;
  active: boolean;
}

export interface AuditLog {
  id: string;
  patientAddress: string;
  accessorAddress: string;
  accessorName: string;
  action: string; // 'Viewed', 'Updated', 'Downloaded'
  details: string;
  timestamp: number;
}

export interface DoctorProfile {
  doctorAddress: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber: string;
  hospitalName: string;
  experience: string;
  verified: boolean;
  ipfsHash?: string;
}

export interface ForumPost {
  id: string;
  pseudonym: string;
  condition: string;
  title: string;
  content: string;
  timestamp: number;
  authorAddress: string;
  replies: ForumReply[];
}

export interface ForumReply {
  id: string;
  pseudonym: string;
  isDoctor: boolean;
  content: string;
  timestamp: number;
}

export interface ResearchStudy {
  id: string;
  sponsor: string;
  title: string;
  description: string;
  dataCategoriesRequested: string[];
  purpose: string;
  duration: string;
  consented: boolean;
}

// ── INITIAL SEED DATA FOR MOCK BACKEND ──────────────────────────────
const INITIAL_RECORDS: HealthRecord[] = [
  {
    id: "rec_1",
    patientAddress: "0x1fd43db16e3c09b6910609b552fa4c0234a11972",
    recordType: "vitals",
    timestamp: 1778846400, // May 15, 2026
    metadata: {
      title: "Routine Vital Check",
      vitals: { heartRate: 72, oxygenLevel: 98, glucoseLevel: 95, temperature: 36.6 },
      notes: "Vitals are normal. Patient feels energetic.",
      effectiveDateTime: "2026-05-15T10:00:00Z"
    }
  },
  {
    id: "rec_2",
    patientAddress: "0x1fd43db16e3c09b6910609b552fa4c0234a11972",
    recordType: "blood_panel",
    timestamp: 1778850000, // May 15, 2026
    metadata: {
      title: "Comprehensive Lab Panel",
      lab: { hba1c: 5.4, cholesterol: 185, ldl: 110, hdl: 55 },
      notes: "Glucose and lipid profiles look clean. Healthy margins.",
      effectiveDateTime: "2026-05-15T11:00:00Z"
    }
  },
  {
    id: "rec_3",
    patientAddress: "0x1fd43db16e3c09b6910609b552fa4c0234a11972",
    recordType: "vaccination",
    timestamp: 1778853600, // May 15, 2026
    metadata: {
      title: "Tetanus Booster Shot",
      notes: "Administered tdap vaccine booster. Next booster due in 10 years.",
      effectiveDateTime: "2026-05-15T12:00:00Z"
    }
  },
  {
    id: "rec_4",
    patientAddress: "0x1fd43db16e3c09b6910609b552fa4c0234a11972",
    recordType: "general",
    timestamp: 1782489600, // June 26, 2026
    metadata: {
      title: "Annual Checkup Summary",
      notes: "Overall health is excellent. Advised regular exercises and vitamin D supplements.",
      effectiveDateTime: "2026-06-26T09:00:00Z"
    }
  }
];

const INITIAL_DOCTORS: DoctorProfile[] = [
  {
    doctorAddress: "0x3b6ea82a02bf846d56752ad0f736e7dce7777777",
    firstName: "Adeola",
    lastName: "Ade",
    specialty: "Cardiology",
    licenseNumber: "LIC-98271A",
    hospitalName: "Metropolitan Cardiac Clinic",
    experience: "12 years",
    verified: true
  }
];

const INITIAL_GRANTS: AccessGrant[] = [
  {
    id: "grant_1",
    patientAddress: "0x1fd43db16e3c09b6910609b552fa4c0234a11972",
    doctorAddress: "0x3b6ea82a02bf846d56752ad0f736e7dce7777777",
    doctorName: "Dr. Adeola Ade",
    recordsAllowed: ["vitals", "blood_panel"],
    created: Date.now() - 3600000, // 1 hour ago
    expiration: Date.now() + 172800000, // 48 hours from now
    active: true
  }
];

const INITIAL_LOGS: AuditLog[] = [
  {
    id: "log_1",
    patientAddress: "0x1fd43db16e3c09b6910609b552fa4c0234a11972",
    accessorAddress: "0x3b6ea82a02bf846d56752ad0f736e7dce7777777",
    accessorName: "Dr. Adeola Ade",
    action: "Viewed",
    details: "Accessed vitals and blood panel results",
    timestamp: Date.now() - 1800000 // 30 minutes ago
  }
];

const INITIAL_STUDIES: ResearchStudy[] = [
  {
    id: "study_cardio",
    sponsor: "Cardiovascular Health Foundation",
    title: "National Heart Rate and Vitals Trends Analysis",
    description: "Anonymized aggregate review of patient resting heart rate and vitals to optimize predictive cardiac models.",
    dataCategoriesRequested: ["vitals"],
    purpose: "Academic research and AI cardiac model calibration.",
    duration: "6 months",
    consented: false
  },
  {
    id: "study_diabetes",
    sponsor: "Global Diabetes Alliance",
    title: "Longitudinal Glucose Marker Mapping",
    description: "Tracking glucose variances across demographic lines to understand early warning markers for Type-2 Diabetes.",
    dataCategoriesRequested: ["blood_panel", "vitals"],
    purpose: "Anonymized clinical trials.",
    duration: "1 year",
    consented: false
  }
];

const INITIAL_FORUM: ForumPost[] = [
  {
    id: "post_1",
    pseudonym: "HopefulHeart",
    condition: "Hypertension",
    title: "Managing stress-induced heart rate spikes?",
    content: "Has anyone successfully used biofeedback or specific breathing exercises to manage sudden spikes in blood pressure or heart rate? Looking for routines to combine with normal medication.",
    timestamp: Date.now() - 86400000 * 3, // 3 days ago
    authorAddress: "0x1fd43db16e3c09b6910609b552fa4c0234a11972",
    replies: [
      {
        id: "reply_1",
        pseudonym: "Dr. Adeola Ade",
        isDoctor: true,
        content: "Breathing techniques such as 4-7-8 breathing can stimulate the vagal nerve and decrease sympathetic nervous activation. Always align this with your cardiologist's advice.",
        timestamp: Date.now() - 86400000 * 2
      }
    ]
  }
];

// Helper to initialize local storage mock DB
function getMockStorage<T>(key: string, initial: T): T {
  if (typeof window === "undefined") return initial;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
}

function saveMockStorage(key: string, data: any) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

// ── CORE DATA SERVICE ──────────────────────────────────────────────
export const dbService = {
  // ── RECORDS ───────────────────────────────────────────────────────
  async getRecords(patientAddress: string): Promise<HealthRecord[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("health_records")
        .select("*")
        .eq("patient_address", patientAddress.toLowerCase())
        .order("timestamp", { ascending: false });
      if (!error && data) return data;
    }
    const mockRecs = getMockStorage<HealthRecord[]>("mv2_records", INITIAL_RECORDS);
    return mockRecs.filter(r => r.patientAddress.toLowerCase() === patientAddress.toLowerCase());
  },

  async addRecord(patientAddress: string, recordType: string, timestamp: number, metadata: any): Promise<HealthRecord> {
    const newRecord: HealthRecord = {
      id: `rec_${Math.random().toString(36).substr(2, 9)}`,
      patientAddress: patientAddress.toLowerCase(),
      recordType,
      timestamp,
      metadata
    };

    if (supabase) {
      const { data, error } = await supabase
        .from("health_records")
        .insert({
          id: newRecord.id,
          patient_address: newRecord.patientAddress,
          record_type: newRecord.recordType,
          timestamp: newRecord.timestamp,
          metadata: newRecord.metadata
        })
        .select()
        .single();
      if (!error && data) return data;
    }

    const mockRecs = getMockStorage<HealthRecord[]>("mv2_records", INITIAL_RECORDS);
    mockRecs.push(newRecord);
    saveMockStorage("mv2_records", mockRecs);
    return newRecord;
  },

  async updateRecord(patientAddress: string, recordId: string, metadata: any): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase
        .from("health_records")
        .update({ metadata })
        .eq("id", recordId)
        .eq("patient_address", patientAddress.toLowerCase());
      if (!error) return true;
    }

    const mockRecs = getMockStorage<HealthRecord[]>("mv2_records", INITIAL_RECORDS);
    const index = mockRecs.findIndex(r => r.id === recordId && r.patientAddress.toLowerCase() === patientAddress.toLowerCase());
    if (index !== -1) {
      mockRecs[index].metadata = {
        ...mockRecs[index].metadata,
        ...metadata,
        editedAt: new Date().toISOString()
      };
      saveMockStorage("mv2_records", mockRecs);
      return true;
    }
    return false;
  },

  // ── ACCESS GRANTS ─────────────────────────────────────────────────
  async getAccessGrants(patientAddress: string): Promise<AccessGrant[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("access_grants")
        .select("*")
        .eq("patient_address", patientAddress.toLowerCase());
      if (!error && data) return data;
    }
    const mockGrants = getMockStorage<AccessGrant[]>("mv2_grants", INITIAL_GRANTS);
    return mockGrants.filter(g => g.patientAddress.toLowerCase() === patientAddress.toLowerCase() && g.active && g.expiration > Date.now());
  },

  async grantAccess(patientAddress: string, doctorAddress: string, recordsAllowed: string[], durationHours: number): Promise<AccessGrant> {
    const docProfile = await this.getDoctorProfile(doctorAddress);
    const doctorName = docProfile ? `Dr. ${docProfile.firstName} ${docProfile.lastName}` : `Doctor ${doctorAddress.slice(0, 6)}`;
    
    const newGrant: AccessGrant = {
      id: `grant_${Math.random().toString(36).substr(2, 9)}`,
      patientAddress: patientAddress.toLowerCase(),
      doctorAddress: doctorAddress.toLowerCase(),
      doctorName,
      recordsAllowed,
      created: Date.now(),
      expiration: Date.now() + durationHours * 3600000,
      active: true
    };

    if (supabase) {
      const { data, error } = await supabase
        .from("access_grants")
        .insert({
          id: newGrant.id,
          patient_address: newGrant.patientAddress,
          doctor_address: newGrant.doctorAddress,
          doctor_name: newGrant.doctorName,
          records_allowed: newGrant.recordsAllowed,
          created: newGrant.created,
          expiration: newGrant.expiration,
          active: newGrant.active
        })
        .select()
        .single();
      if (!error && data) return data;
    }

    const mockGrants = getMockStorage<AccessGrant[]>("mv2_grants", INITIAL_GRANTS);
    mockGrants.push(newGrant);
    saveMockStorage("mv2_grants", mockGrants);

    // Write audit log
    await this.addAuditLog(patientAddress, doctorAddress, "Granted Access", `Granted access to: ${recordsAllowed.join(", ")}`);

    return newGrant;
  },

  async revokeAccess(patientAddress: string, grantId: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase
        .from("access_grants")
        .update({ active: false })
        .eq("id", grantId)
        .eq("patient_address", patientAddress.toLowerCase());
      if (!error) return true;
    }

    const mockGrants = getMockStorage<AccessGrant[]>("mv2_grants", INITIAL_GRANTS);
    const index = mockGrants.findIndex(g => g.id === grantId && g.patientAddress.toLowerCase() === patientAddress.toLowerCase());
    if (index !== -1) {
      mockGrants[index].active = false;
      saveMockStorage("mv2_grants", mockGrants);
      
      // Log audit
      await this.addAuditLog(patientAddress, mockGrants[index].doctorAddress, "Revoked Access", "Access revoked by patient");
      return true;
    }
    return false;
  },

  async verifyDoctorAccess(patientAddress: string, doctorAddress: string, recordType: string): Promise<boolean> {
    // Check if doctor has a valid, active grant containing the requested recordType
    if (supabase) {
      const { data, error } = await supabase
        .from("access_grants")
        .select("*")
        .eq("patient_address", patientAddress.toLowerCase())
        .eq("doctor_address", doctorAddress.toLowerCase())
        .eq("active", true)
        .gt("expiration", Date.now());
      if (!error && data) {
        return data.some((g: any) => g.records_allowed.includes(recordType));
      }
    }
    const mockGrants = getMockStorage<AccessGrant[]>("mv2_grants", INITIAL_GRANTS);
    const hasGrant = mockGrants.some(g => 
      g.patientAddress.toLowerCase() === patientAddress.toLowerCase() &&
      g.doctorAddress.toLowerCase() === doctorAddress.toLowerCase() &&
      g.active &&
      g.expiration > Date.now() &&
      g.recordsAllowed.includes(recordType)
    );

    if (hasGrant) {
      const docProfile = await this.getDoctorProfile(doctorAddress);
      const doctorName = docProfile ? `Dr. ${docProfile.firstName} ${docProfile.lastName}` : "Authorized Doctor";
      await this.addAuditLog(patientAddress, doctorAddress, "Viewed", `Accessed ${recordType} record`);
    }

    return hasGrant;
  },

  // ── AUDIT LOGS ────────────────────────────────────────────────────
  async getAuditLogs(patientAddress: string): Promise<AuditLog[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("patient_address", patientAddress.toLowerCase())
        .order("timestamp", { ascending: false });
      if (!error && data) return data;
    }
    const mockLogs = getMockStorage<AuditLog[]>("mv2_logs", INITIAL_LOGS);
    return mockLogs
      .filter(l => l.patientAddress.toLowerCase() === patientAddress.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  async addAuditLog(patientAddress: string, accessorAddress: string, action: string, details: string): Promise<AuditLog> {
    const docProfile = await this.getDoctorProfile(accessorAddress);
    const accessorName = docProfile ? `Dr. ${docProfile.firstName} ${docProfile.lastName}` : "Self";

    const newLog: AuditLog = {
      id: `log_${Math.random().toString(36).substr(2, 9)}`,
      patientAddress: patientAddress.toLowerCase(),
      accessorAddress: accessorAddress.toLowerCase(),
      accessorName,
      action,
      details,
      timestamp: Date.now()
    };

    if (supabase) {
      const { error } = await supabase.from("audit_logs").insert({
        id: newLog.id,
        patient_address: newLog.patientAddress,
        accessor_address: newLog.accessorAddress,
        accessor_name: newLog.accessorName,
        action: newLog.action,
        details: newLog.details,
        timestamp: newLog.timestamp
      });
      if (!error) return newLog;
    }

    const mockLogs = getMockStorage<AuditLog[]>("mv2_logs", INITIAL_LOGS);
    mockLogs.push(newLog);
    saveMockStorage("mv2_logs", mockLogs);
    return newLog;
  },

  // ── DOCTOR PROFILES ───────────────────────────────────────────────
  async getDoctorProfile(doctorAddress: string): Promise<DoctorProfile | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("doctor_profiles")
        .select("*")
        .eq("doctor_address", doctorAddress.toLowerCase())
        .single();
      if (!error && data) return data;
    }
    const mockDocs = getMockStorage<DoctorProfile[]>("mv2_doctors", INITIAL_DOCTORS);
    return mockDocs.find(d => d.doctorAddress.toLowerCase() === doctorAddress.toLowerCase()) || null;
  },

  async saveDoctorProfile(doctorAddress: string, profile: any): Promise<boolean> {
    const updatedProfile: DoctorProfile = {
      doctorAddress: doctorAddress.toLowerCase(),
      firstName: profile.firstName,
      lastName: profile.lastName,
      specialty: profile.specialty || "General Medicine",
      licenseNumber: profile.licenseNumber || "N/A",
      hospitalName: profile.hospitalName || "N/A",
      experience: profile.experience || "1 year",
      verified: true,
      ipfsHash: profile.ipfsHash || ""
    };

    if (supabase) {
      const { error } = await supabase
        .from("doctor_profiles")
        .upsert({
          doctor_address: updatedProfile.doctorAddress,
          first_name: updatedProfile.firstName,
          last_name: updatedProfile.lastName,
          specialty: updatedProfile.specialty,
          license_number: updatedProfile.licenseNumber,
          hospital_name: updatedProfile.hospitalName,
          experience: updatedProfile.experience,
          verified: updatedProfile.verified,
          ipfs_hash: updatedProfile.ipfsHash
        });
      if (!error) return true;
    }

    const mockDocs = getMockStorage<DoctorProfile[]>("mv2_doctors", INITIAL_DOCTORS);
    const index = mockDocs.findIndex(d => d.doctorAddress.toLowerCase() === doctorAddress.toLowerCase());
    if (index !== -1) {
      mockDocs[index] = updatedProfile;
    } else {
      mockDocs.push(updatedProfile);
    }
    saveMockStorage("mv2_doctors", mockDocs);
    return true;
  },

  async isDoctorRegistered(doctorAddress: string): Promise<boolean> {
    const profile = await this.getDoctorProfile(doctorAddress);
    return !!profile;
  },

  // ── FORUM ─────────────────────────────────────────────────────────
  async getForumPosts(): Promise<ForumPost[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("*, replies(*)");
      if (!error && data) return data;
    }
    return getMockStorage<ForumPost[]>("mv2_forum", INITIAL_FORUM);
  },

  async createForumPost(pseudonym: string, condition: string, title: string, content: string, authorAddress: string): Promise<ForumPost> {
    const newPost: ForumPost = {
      id: `post_${Math.random().toString(36).substr(2, 9)}`,
      pseudonym,
      condition,
      title,
      content,
      timestamp: Date.now(),
      authorAddress: authorAddress.toLowerCase(),
      replies: []
    };

    if (supabase) {
      const { data, error } = await supabase
        .from("forum_posts")
        .insert({
          id: newPost.id,
          pseudonym: newPost.pseudonym,
          condition: newPost.condition,
          title: newPost.title,
          content: newPost.content,
          timestamp: newPost.timestamp,
          author_address: newPost.authorAddress
        })
        .select()
        .single();
      if (!error && data) return { ...data, replies: [] };
    }

    const mockForum = getMockStorage<ForumPost[]>("mv2_forum", INITIAL_FORUM);
    mockForum.unshift(newPost);
    saveMockStorage("mv2_forum", mockForum);
    return newPost;
  },

  async createForumReply(postId: string, pseudonym: string, isDoctor: boolean, content: string): Promise<ForumReply> {
    const newReply: ForumReply = {
      id: `reply_${Math.random().toString(36).substr(2, 9)}`,
      pseudonym,
      isDoctor,
      content,
      timestamp: Date.now()
    };

    if (supabase) {
      const { data, error } = await supabase
        .from("forum_replies")
        .insert({
          id: newReply.id,
          post_id: postId,
          pseudonym: newReply.pseudonym,
          is_doctor: newReply.isDoctor,
          content: newReply.content,
          timestamp: newReply.timestamp
        })
        .select()
        .single();
      if (!error && data) return data;
    }

    const mockForum = getMockStorage<ForumPost[]>("mv2_forum", INITIAL_FORUM);
    const postIndex = mockForum.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      mockForum[postIndex].replies.push(newReply);
      saveMockStorage("mv2_forum", mockForum);
    }
    return newReply;
  },

  // ── MESSAGES ──────────────────────────────────────────────────────
  async getMessages(user1: string, user2: string): Promise<any[]> {
    const u1 = user1.toLowerCase();
    const u2 = user2.toLowerCase();

    if (supabase) {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender.eq.${u1},receiver.eq.${u2}),and(sender.eq.${u2},receiver.eq.${u1})`)
        .order("timestamp", { ascending: true });
      if (!error && data) return data;
    }

    const mockMsgs = getMockStorage<any[]>("mv2_messages", []);
    return mockMsgs.filter(m => 
      (m.sender.toLowerCase() === u1 && m.receiver.toLowerCase() === u2) ||
      (m.sender.toLowerCase() === u2 && m.receiver.toLowerCase() === u1)
    ).sort((a, b) => a.timestamp - b.timestamp);
  },

  async sendMessage(sender: string, receiver: string, content: string): Promise<any> {
    const newMsg = {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      sender: sender.toLowerCase(),
      receiver: receiver.toLowerCase(),
      content,
      timestamp: Date.now()
    };

    if (supabase) {
      const { data, error } = await supabase
        .from("messages")
        .insert(newMsg)
        .select()
        .single();
      if (!error && data) return data;
    }

    const mockMsgs = getMockStorage<any[]>("mv2_messages", []);
    mockMsgs.push(newMsg);
    saveMockStorage("mv2_messages", mockMsgs);
    return newMsg;
  },

  // ── RESEARCH ──────────────────────────────────────────────────────
  async getResearchStudies(patientAddress: string): Promise<ResearchStudy[]> {
    const mockStudies = getMockStorage<ResearchStudy[]>("mv2_studies", INITIAL_STUDIES);
    // If Supabase existed, we would join with patient consents table
    const consents = getMockStorage<Record<string, boolean>>(`mv2_consents_${patientAddress.toLowerCase()}`, {});
    return mockStudies.map(s => ({
      ...s,
      consented: !!consents[s.id]
    }));
  },

  async toggleResearchConsent(patientAddress: string, studyId: string, consented: boolean): Promise<boolean> {
    const consents = getMockStorage<Record<string, boolean>>(`mv2_consents_${patientAddress.toLowerCase()}`, {});
    consents[studyId] = consented;
    saveMockStorage(`mv2_consents_${patientAddress.toLowerCase()}`, consents);

    // Audit log
    await this.addAuditLog(
      patientAddress,
      "0x0000000000000000000000000000000000000000",
      consented ? "Opt-in Research" : "Opt-out Research",
      `${consented ? "Gave" : "Revoked"} consent for study ID: ${studyId}`
    );

    return true;
  }
};
