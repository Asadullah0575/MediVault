import { useState, useEffect, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

export interface PatientRecord {
  patientAddress: string;
  recordCount: number;
}

export function useDoctorVault() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [patients, setPatients]   = useState<PatientRecord[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const getContract = useCallback(async (withSigner = false) => {
    if (!walletClient) throw new Error("Wallet not connected");
    const provider = new BrowserProvider(walletClient.transport);
    const signerOrProvider = withSigner ? await provider.getSigner() : provider;
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
  }, [walletClient]);

  const loadPatients = useCallback(async () => {
    if (!address || !isConnected || !walletClient) return;
    try {
      setLoading(true);
      const contract = await getContract(true);

      let patientAddresses: string[] = [];
      try {
        patientAddresses = await contract.getMyPatients(address) as string[];
      } catch { patientAddresses = []; }

      const patientData: PatientRecord[] = [];
      for (const patientAddr of patientAddresses) {
        let count = 0;
        try {
          count = Number(await contract.getRecordCount(patientAddr));
        } catch { count = 0; }
        patientData.push({ patientAddress: patientAddr, recordCount: count });
      }
      setPatients(patientData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, walletClient, getContract]);

  useEffect(() => {
    if (!isConnected || !address || !walletClient) return;
    const timer = setTimeout(loadPatients, 500);
    return () => clearTimeout(timer);
  }, [isConnected, address, walletClient, loadPatients]);

  return { patients, loading, error, refresh: loadPatients };
}