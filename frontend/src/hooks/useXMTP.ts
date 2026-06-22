import { useState, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

export function useXMTP() {
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const client = walletClient ? true : null;

    const getContract = useCallback(async (write = false) => {
        if (!walletClient) throw new Error("No wallet");
        const provider = new BrowserProvider(walletClient.transport);
        const signerOrProvider = write ? await provider.getSigner() : provider;
        return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
    }, [walletClient]);

    const initialize = useCallback(async () => {
        return walletClient ? true : null;
    }, [walletClient]);

    const sendMessage = useCallback(async (toAddress: string, content: string) => {
        setLoading(true);
        try {
            const contract = await getContract(true);
            const tx = await contract.sendMessage(toAddress, content);
            await tx.wait();
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [getContract]);

    const loadMessages = useCallback(async (toAddress: string) => {
        try {
            const contract = await getContract(true); // ← needs signer for msg.sender
            const msgs = await contract.getMessages(toAddress);
            return msgs.map((m: any) => ({
                id: `${m.timestamp}_${m.sender}`,
                content: m.content,
                sender: m.sender,
                timestamp: Number(m.timestamp) * 1000,
                sent: m.sender.toLowerCase() === address?.toLowerCase(),
            }));
        } catch (e: any) {
            setError(e.message);
            return [];
        }
    }, [getContract, address]);

    const streamMessages = useCallback(async (toAddress: string, onMessage: (msg: any) => void) => {
        // Poll every 10 seconds for new messages
        const interval = setInterval(async () => {
            const msgs = await loadMessages(toAddress);
            if (msgs.length > 0) onMessage(msgs[msgs.length - 1]);
        }, 10000);
        return () => clearInterval(interval);
    }, [loadMessages]);

    return { client, loading, error, initialize, sendMessage, loadMessages, streamMessages };
}