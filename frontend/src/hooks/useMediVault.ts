import { useState, useEffect, useCallback } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

export interface HealthRecord {
  index: number;
  recordType: string;
  timestamp: number;
  // Decrypted values (only set after patient decrypts)
  heartRate?: number;
  oxygenLevel?: number;
  glucoseLevel?: number;
  temperature?: number;
}

export function useMediVault() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [records, setRecords]           = useState<HealthRecord[]>([]);
  const [grantedDoctors, setGrantedDoctors] = useState<string[]>([]);
  const [totalStored, setTotalStored]   = useState<number>(0);
  const [loading, setLoading]           = useState(false);
  const [txHash, setTxHash]             = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  // ── helpers ──────────────────────────────────────────────────
  const getContract = useCallback(async (withSigner = false) => {
    if (!walletClient) throw new Error("Wallet not connected");
    const provider = new BrowserProvider(walletClient.transport);
    const signerOrProvider = withSigner ? await provider.getSigner() : provider;
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
  }, [walletClient]);

  // ── fhevm SDK init ────────────────────────────────────────────
  const getFhevmInstance = useCallback(async () => {
    // Dynamically import to avoid SSR issues
    const { createInstance, SepoliaConfig } = await import("@fhevm/sdk");
    const instance = await createInstance(SepoliaConfig);
    return instance;
  }, []);

  // ── load data ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!address || !isConnected) return;
    try {
      setLoading(true);
      const contract = await getContract();

      const [count, doctors, total] = await Promise.all([
        contract.getRecordCount(address),
        contract.getGrantedDoctors(address),
        contract.totalRecordsStored(),
      ]);

      setGrantedDoctors(doctors as string[]);
      setTotalStored(Number(total));

      const recs: HealthRecord[] = [];
      for (let i = 0; i < Number(count); i++) {
        const r = await contract.getRecord(address, i);
        recs.push({
          index: i,
          recordType: r.recordType,
          timestamp: Number(r.timestamp),
        });
      }
      setRecords(recs);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, getContract]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── addRecord ─────────────────────────────────────────────────
  const addRecord = useCallback(async (
    heartRate: number,
    oxygenLevel: number,
    glucoseLevel: number,
    temperatureTimes10: number, // e.g. 366 for 36.6°C
    recordType: string,
  ) => {
    setLoading(true); setError(null); setTxHash(null);
    try {
      const instance = await getFhevmInstance();
      const contract = await getContract(true);

      // Encrypt all four values client-side
      const encHR   = instance.createEncryptedInput(CONTRACT_ADDRESS, address!).add32(heartRate).encrypt();
      const encO2   = instance.createEncryptedInput(CONTRACT_ADDRESS, address!).add32(oxygenLevel).encrypt();
      const encGL   = instance.createEncryptedInput(CONTRACT_ADDRESS, address!).add32(glucoseLevel).encrypt();
      const encTMP  = instance.createEncryptedInput(CONTRACT_ADDRESS, address!).add32(temperatureTimes10).encrypt();

      const tx = await contract.addRecord(
        encHR.handles[0],  encO2.handles[0],  encGL.handles[0],  encTMP.handles[0],
        encHR.inputProof,  encO2.inputProof,  encGL.inputProof,  encTMP.inputProof,
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
  }, [address, getContract, getFhevmInstance, loadData]);

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
