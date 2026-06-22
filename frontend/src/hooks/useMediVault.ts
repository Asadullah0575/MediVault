import { useState, useEffect, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

export interface HealthRecord {
  index: number;
  recordType: string;
  timestamp: number;
  heartRate?: number;
  oxygenLevel?: number;
  glucoseLevel?: number;
  temperature?: number;
}

export function useMediVault() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [records, setRecords]               = useState<HealthRecord[]>([]);
  const [grantedDoctors, setGrantedDoctors] = useState<string[]>([]);
  const [totalStored, setTotalStored]       = useState<number>(0);
  const [loading, setLoading]               = useState(false);
  const [txHash, setTxHash]                 = useState<string | null>(null);
  const [error, setError]                   = useState<string | null>(null);

  // ── helpers ───────────────────────────────────────────────────
  const getContract = useCallback(async (withSigner = false) => {
    if (!walletClient) throw new Error("Wallet not connected");
    const provider = new BrowserProvider(walletClient.transport);
    const signerOrProvider = withSigner ? await provider.getSigner() : provider;
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
  }, [walletClient]);

  // ── load data ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!address || !isConnected || !walletClient) return;
    try {
      setLoading(true);
      const contract = await getContract(true);

      let count = 0;
      let total = 0;
      let doctors: string[] = [];

      try { count = Number(await contract.getRecordCount(address)); } catch { count = 0; }
      try { total = Number(await contract.totalRecordsStored()); } catch { total = 0; }
      try { doctors = await contract.getGrantedDoctors(address) as string[]; } catch { doctors = []; }

      // Deduplicate doctors list
const uniqueDoctors = [...new Set((doctors as string[]).map(d => d.toLowerCase()))];
setGrantedDoctors(uniqueDoctors);
      setTotalStored(total);

      const recs: HealthRecord[] = [];
      for (let i = 0; i < count; i++) {
        try {
          const r = await contract.getRecord(address, i);
          let metadata = null;
          try {
            const metaStr = await contract.getRecordMetadata(address, i);
            const parsed = JSON.parse(metaStr);
            metadata = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
            // Normalize compact format
            if (metadata?.v) metadata.vitals = metadata.v;
            if (metadata?.l) metadata.lab = metadata.l;
            if (metadata?.s) metadata.status = metadata.s;
            if (metadata?.t) metadata.effectiveDateTime = metadata.t;
            if (metadata?.n) metadata.notes = metadata.n;
          } catch { }
          recs.push({
            index: i,
            recordType: r.recordType,
            timestamp: Number(r.timestamp),
            metadata,
          });
        } catch { break; }
      }
      setRecords(recs);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, walletClient, getContract]);

  // ── auto load when wallet is ready ───────────────────────────
  useEffect(() => {
  if (!isConnected || !address || !walletClient) return;
  const timer = setTimeout(loadData, 800);
  return () => clearTimeout(timer);
}, [isConnected, address, walletClient]); // eslint-disable-line

  // ── addRecord ─────────────────────────────────────────────────
  const addRecord = useCallback(async (
    heartRate: number,
    oxygenLevel: number,
    glucoseLevel: number,
    temperatureTimes10: number,
    recordType: string,
    fullMetadata?: string, 
  ) => {
    console.log("addRecord called with metadata:", fullMetadata);
    setLoading(true); setError(null); setTxHash(null);
    try {
      const contract = await getContract(true);
      const zeroBytes32 = "0x" + "0".repeat(64);
      const zeroProof = "0x";

      // Use fullMetadata if provided, otherwise build basic one
      const metadata = fullMetadata || JSON.stringify({
        resourceType: "Observation",
        status: "final",
        category: "vital-signs",
        effectiveDateTime: new Date().toISOString(),
        fields: {
          heartRate: heartRate ? { value: heartRate, unit: "/min", loinc: "8867-4" } : null,
          oxygenLevel: oxygenLevel ? { value: oxygenLevel, unit: "%", loinc: "2708-6" } : null,
          temperature: temperatureTimes10 ? { value: temperatureTimes10 / 10, unit: "Cel", loinc: "8310-5" } : null,
          bloodGlucose: glucoseLevel ? { value: glucoseLevel, unit: "mg/dL", loinc: "2339-0" } : null,
        }
      });

      const tx = await contract.addRecord(
        zeroBytes32, zeroBytes32, zeroBytes32, zeroBytes32,
        zeroProof, zeroProof, zeroProof, zeroProof,
        recordType,
        metadata,
      );
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getContract, loadData]);

  // ── grantAccess ───────────────────────────────────────────────
  const grantAccess = useCallback(async (doctorAddress: string) => {
  setLoading(true); setError(null);
  try {
    const contract = await getContract(true);

    // Check on-chain if address is a registered doctor
    let isDoctor = false;
    try {
      isDoctor = await contract.isRegisteredDoctor(doctorAddress);
    } catch { isDoctor = false; }

    if (!isDoctor) {
      setError("This wallet is not registered as a doctor on MediVault. They need to sign in as a doctor first.");
      setLoading(false);
      return;
    }

    const tx = await contract.grantAccess(doctorAddress);
    const receipt = await tx.wait();
    setTxHash(receipt.hash);
    await loadData();
  } catch (e: any) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
}, [getContract, loadData]);

  // ── revokeAccess ──────────────────────────────────────────────
  const revokeAccess = useCallback(async (doctorAddress: string) => {
  setLoading(true); setError(null);
  try {
    const contract = await getContract(true);

    // Check if grant actually exists before trying to revoke
    let hasGrant = false;
    try {
      hasGrant = await contract.hasAccess(address!, doctorAddress);
    } catch { hasGrant = false; }

    if (!hasGrant) {
      // Grant doesn't exist on-chain — just remove from UI
      setGrantedDoctors(prev =>
        prev.filter(d => d.toLowerCase() !== doctorAddress.toLowerCase())
      );
      setLoading(false);
      return;
    }

    const tx = await contract.revokeAccess(doctorAddress);
    await tx.wait();
    // Remove from UI immediately
    setGrantedDoctors(prev =>
      prev.filter(d => d.toLowerCase() !== doctorAddress.toLowerCase())
    );
    await loadData();
  } catch (e: any) {
    // If no active grant error, just remove from UI silently
    if (e.message?.includes("no active grant")) {
      setGrantedDoctors(prev =>
        prev.filter(d => d.toLowerCase() !== doctorAddress.toLowerCase())
      );
    } else {
      setError(e.message);
    }
  } finally {
    setLoading(false);
  }
}, [getContract, loadData, address]);

  const updateRecord = useCallback(async (index: number, updatedMetadata: string) => {
    setLoading(true); setError(null);
    try {
      const contract = await getContract(true);
      const tx = await contract.updateRecordMetadata(address, index, updatedMetadata);
      await tx.wait();
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getContract, loadData, address]);

  return {
    address, isConnected, loading, error, txHash,
    records, grantedDoctors, totalStored,
    addRecord, updateRecord, grantAccess, revokeAccess,
  };
}