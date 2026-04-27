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

      setGrantedDoctors(doctors);
      setTotalStored(total);

      const recs: HealthRecord[] = [];
      for (let i = 0; i < count; i++) {
        try {
          const r = await contract.getRecord(address, i);
          recs.push({
            index: i,
            recordType: r.recordType,
            timestamp: Number(r.timestamp),
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
  ) => {
    setLoading(true); setError(null); setTxHash(null);
    try {
      const contract = await getContract(true);
      const zeroBytes32 = "0x" + "0".repeat(64);
      const zeroProof = "0x";
      const tx = await contract.addRecord(
        zeroBytes32, zeroBytes32, zeroBytes32, zeroBytes32,
        zeroProof, zeroProof, zeroProof, zeroProof,
        recordType,
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
      const tx = await contract.revokeAccess(doctorAddress);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getContract, loadData]);

  return {
    address, isConnected, loading, error, txHash,
    records, grantedDoctors, totalStored,
    addRecord, grantAccess, revokeAccess, refresh: loadData,
  };
}