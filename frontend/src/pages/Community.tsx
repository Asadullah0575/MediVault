import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWalletClient } from "wagmi";
import { useRole } from "../hooks/useRole";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useXMTP } from "../hooks/useXMTP";

// ── Types ──────────────────────────────────────────────
interface Post {
    id: string;
    pseudonym: string;
    condition: string;
    title: string;
    content: string;
    timestamp: number;
    replies: Reply[];
    ipfsHash?: string;
}

interface Reply {
    id: string;
    pseudonym: string;
    isDoctor: boolean;
    content: string;
    timestamp: number;
}

interface Message {
    id: string;
    from: string;
    to: string;
    content: string;
    timestamp: number;
    sent: boolean;
}

// ── Condition tags ─────────────────────────────────────
const CONDITIONS = [
    "All", "Diabetes", "Hypertension", "Heart Disease",
    "Asthma", "Mental Health", "Cancer", "Arthritis",
    "Thyroid", "Kidney Disease", "Liver Disease", "General"
];

// ── Generate pseudonym from address ────────────────────
function getPseudonym(address: string): string {
    const adjectives = ["Brave", "Calm", "Kind", "Wise", "Bold", "Swift", "Gentle", "Bright"];
    const animals = ["Falcon", "Dolphin", "Panther", "Eagle", "Tiger", "Lioness", "Phoenix", "Hawk"];
    const idx1 = parseInt(address.slice(2, 4), 16) % adjectives.length;
    const idx2 = parseInt(address.slice(4, 6), 16) % animals.length;
    return `${adjectives[idx1]} ${animals[idx2]}`;
}

// ── Styles ──────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
    root: { display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh", background: "#F4F9F6" },
    sidebar: { background: "#fff", borderRight: "1px solid rgba(45,163,106,0.15)", padding: "28px 18px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
    main: { padding: "32px 36px 60px", overflowY: "auto" },
    topbar: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", gap: "16px", flexWrap: "wrap" },
    pageTitle: { fontFamily: "var(--font-display)", fontSize: "28px", fontStyle: "italic", color: "var(--green-900)", lineHeight: 1.1 },
    pageSub: { fontSize: "13px", color: "var(--text-faint)", marginTop: "4px" },
    tabs: { display: "flex", gap: "8px", marginBottom: "24px" },
    tab: { padding: "10px 20px", borderRadius: "20px", border: "1.5px solid rgba(45,163,106,0.15)", background: "#fff", fontSize: "13.5px", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-body)", transition: "all .18s" },
    tabActive: { background: "linear-gradient(135deg,#1B6B45,#2DA36A)", color: "#fff", border: "1.5px solid transparent", fontWeight: 600 },
    condRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" },
    condTag: { padding: "6px 14px", borderRadius: "20px", border: "1.5px solid rgba(45,163,106,0.15)", background: "#fff", fontSize: "12.5px", color: "var(--text-muted)", cursor: "pointer", transition: "all .18s" },
    condActive: { background: "var(--green-50)", borderColor: "var(--green-500)", color: "var(--green-700)", fontWeight: 600 },
    card: { background: "#fff", border: "1px solid rgba(45,163,106,0.15)", borderRadius: "16px", padding: "20px 22px", marginBottom: "14px" },
    postTitle: { fontSize: "16px", fontWeight: 600, color: "var(--green-900)", marginBottom: "6px" },
    postMeta: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" },
    pseudonym: { fontSize: "12px", fontWeight: 600, color: "var(--green-700)", background: "var(--green-50)", padding: "3px 10px", borderRadius: "20px" },
    condPill: { fontSize: "11px", color: "#6B9ED4", background: "#EEF4FF", padding: "3px 10px", borderRadius: "20px", border: "1px solid rgba(107,158,212,0.2)" },
    timestamp: { fontSize: "11px", color: "var(--text-faint)" },
    postBody: { fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "14px" },
    replyBtn: { background: "none", border: "none", color: "var(--green-700)", fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "var(--font-body)" },
    replyWrap: { borderTop: "1px solid rgba(45,163,106,0.08)", marginTop: "14px", paddingTop: "14px" },
    replyCard: { background: "#F7FBF8", borderRadius: "10px", padding: "12px 14px", marginBottom: "8px" },
    doctorBadge: { background: "#EEF4FF", color: "#3B6EA8", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", marginLeft: "6px" },
    textarea: { width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid rgba(45,163,106,0.15)", fontFamily: "var(--font-body)", fontSize: "13.5px", color: "var(--green-900)", background: "#F7FBF8", outline: "none", resize: "vertical", boxSizing: "border-box" },
    btnGreen: { padding: "10px 20px", borderRadius: "8px", background: "linear-gradient(135deg,#1B6B45,#2DA36A)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
    btnBlue: { padding: "10px 20px", borderRadius: "8px", background: "linear-gradient(135deg,#3B6EA8,#6B9ED4)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
    input: { padding: "10px 14px", borderRadius: "8px", border: "1.5px solid rgba(45,163,106,0.15)", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--green-900)", background: "#F7FBF8", outline: "none", width: "100%", boxSizing: "border-box" },
    msgBubble: { maxWidth: "70%", padding: "10px 14px", borderRadius: "14px", fontSize: "13.5px", lineHeight: 1.6, marginBottom: "8px" },
    msgSent: { background: "linear-gradient(135deg,#1B6B45,#2DA36A)", color: "#fff", marginLeft: "auto", borderBottomRightRadius: "4px" },
    msgRecv: { background: "#F7FBF8", color: "var(--green-900)", border: "1px solid rgba(45,163,106,0.12)", borderBottomLeftRadius: "4px" },
    overlay: { position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,45,28,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
    modal: { background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "560px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(15,45,28,0.2)", overflow: "hidden" },
    modalHead: { padding: "20px 24px", borderBottom: "1px solid rgba(45,163,106,0.1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" },
    modalBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },
    modalFoot: { padding: "16px 24px", borderTop: "1px solid rgba(45,163,106,0.1)", flexShrink: 0 },
    closeBtn: { width: "30px", height: "30px", borderRadius: "50%", background: "var(--green-50)", border: "1px solid rgba(45,163,106,0.15)", color: "var(--text-faint)", fontSize: "12px", cursor: "pointer" },
    ipfsNote: { fontSize: "11px", color: "#6B9ED4", background: "#EEF4FF", border: "1px solid rgba(107,158,212,0.2)", borderRadius: "8px", padding: "8px 12px", marginTop: "10px" },
    emptyWrap: { textAlign: "center", padding: "60px 20px", color: "var(--text-faint)" },
    navItem: { display: "flex", alignItems: "center", gap: "9px", padding: "9px 12px", borderRadius: "8px", fontSize: "13.5px", color: "var(--text-muted)", cursor: "pointer", marginBottom: "2px" },
};

export default function Community() {
    const navigate = useNavigate();
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { role, roleLoaded } = useRole();
    const isDoctor = role === "doctor";



    const [activeTab, setActiveTab] = useState<"forum" | "messages">("forum");
    const [activeCondition, setActiveCondition] = useState("All");
    const [posts, setPosts] = useState<Post[]>([]);
    const [showNewPost, setShowNewPost] = useState(false);
    const [showReply, setShowReply] = useState<string | null>(null);
    const [expandedPost, setExpandedPost] = useState<string | null>(null);

    // New post form
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newCondition, setNewCondition] = useState("General");
    const [posting, setPosting] = useState(false);

    // Reply form
    const [replyContent, setReplyContent] = useState("");
    const [replying, setReplying] = useState(false);

    // XMTP state
    const { client, initialize, sendMessage, loadMessages, streamMessages } = useXMTP();
    const [xmtpReady, setXmtpReady] = useState(false);
    const pollingRef = useRef<any>(null);
    const [xmtpLoading, setXmtpLoading] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [msgLoading, setMsgLoading] = useState(false);
    const [messageInput, setMessageInput] = useState("");
    const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
    const [conversations, setConversations] = useState<string[]>([]);
    const [newConvoAddr, setNewConvoAddr] = useState("");

    const pseudonym = address ? getPseudonym(address) : "Anonymous";

    // Load posts from localStorage (demo — in production use IPFS)
    useEffect(() => {
        if (client) setXmtpReady(true);
    }, [client]);
    useEffect(() => {
        if (walletClient) loadPostsFromChain();
    }, [walletClient]);
    useEffect(() => {
        if (!address) return;
        const savedConvos = localStorage.getItem(`medivault_convos_${address}`);
        if (savedConvos) setConversations(JSON.parse(savedConvos));
    }, [address]);

    useEffect(() => {
        if (!address || !walletClient) return;
        const lastConvo = localStorage.getItem(`medivault_selected_convo_${address}`);
        if (lastConvo && activeTab === "messages") openConvo(lastConvo);
    }, [address, walletClient, activeTab]);

    useEffect(() => {
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, []);

    const savePosts = (updated: Post[]) => {
        setPosts(updated);
        localStorage.setItem("medivault_community_posts", JSON.stringify(updated));
    };

    const handleNewPost = async () => {
        if (!newTitle.trim() || !newContent.trim() || !address || !walletClient) return;
        setPosting(true);
        try {
            const { BrowserProvider, Contract } = await import("ethers");
            const { CONTRACT_ADDRESS, CONTRACT_ABI } = await import("../contract");
            const provider = new BrowserProvider(walletClient.transport as any);
            const signer = await provider.getSigner();
            const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            const tx = await contract.createPost(pseudonym, newCondition, newTitle, newContent);
            await tx.wait();
            setNewTitle(""); setNewContent(""); setNewCondition("General");
            setShowNewPost(false);
            await loadPostsFromChain();
        } catch (e: any) {
            console.error(e);
        } finally {
            setPosting(false);
        }
    };

    const loadPostsFromChain = async () => {
        if (!walletClient) return;
        try {
            const { BrowserProvider, Contract } = await import("ethers");
            const { CONTRACT_ADDRESS, CONTRACT_ABI } = await import("../contract");
            const provider = new BrowserProvider(walletClient.transport as any);
            const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
            const count = Number(await contract.getPostCount());
            const loaded: Post[] = [];
            for (let i = count - 1; i >= 0; i--) {
                const p = await contract.getPost(i);
                // Load replies for this post
                const r = await contract.getRepliesForPost(i);
                const replies: Reply[] = [];
                for (let j = 0; j < r[0].length; j++) {
                    replies.push({
                        id: `reply_${i}_${j}`,
                        pseudonym: r[0][j],
                        isDoctor: r[1][j],
                        content: r[2][j],
                        timestamp: Number(r[3][j]) * 1000,
                    });
                }
                loaded.push({
                    id: `post_${i}`,
                    pseudonym: p[0],
                    condition: p[1],
                    title: p[2],
                    content: p[3],
                    timestamp: Number(p[4]) * 1000,
                    replies,
                });
            }
            setPosts(loaded);
        } catch (e) { console.error(e); }
    };

    const handleReply = async (postId: string) => {
        if (!replyContent.trim() || !address || !walletClient) return;
        setReplying(true);
        try {
            const { BrowserProvider, Contract } = await import("ethers");
            const { CONTRACT_ADDRESS, CONTRACT_ABI } = await import("../contract");
            const provider = new BrowserProvider(walletClient.transport as any);
            const signer = await provider.getSigner();
            const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            const postIndex = parseInt(postId.replace("post_", ""));
            const replyPseudonym = isDoctor ? `Dr. ${pseudonym}` : pseudonym;
            const tx = await contract.createReply(postIndex, replyPseudonym, isDoctor, replyContent);
            await tx.wait();
            setReplyContent("");
            setShowReply(null);
            await loadPostsFromChain();
        } catch (e: any) {
            console.error(e);
        } finally {
            setReplying(false);
        }
    };

    const startConversation = () => {
        if (!newConvoAddr.trim()) return;
        const addr = newConvoAddr.trim();
        if (!conversations.includes(addr)) {
            const updated = [addr, ...conversations];
            setConversations(updated);
            localStorage.setItem(`medivault_convos_${address}`, JSON.stringify(updated));
        }
        setSelectedConvo(addr);
        setNewConvoAddr("");
    };

    const initXMTP = async () => {
        setXmtpLoading(true);
        try {
            const c = await initialize();
            console.log("XMTP client:", c);
            if (c) {
                setXmtpReady(true);
                // Force save conversations from localStorage
                const savedConvos = localStorage.getItem(`medivault_convos_${address}`);
                if (savedConvos) setConversations(JSON.parse(savedConvos));
            }
        } catch (e) {
            console.error("XMTP error:", e);
        }
        setXmtpLoading(false);
    };


    const openConvo = async (addr: string) => {
        setSelectedConvo(addr);
        setMsgLoading(true);
        localStorage.setItem(`medivault_selected_convo_${address}`, addr);
        setConversations(prev => {
            if (prev.includes(addr)) return prev;
            const updated = [addr, ...prev];
            localStorage.setItem(`medivault_convos_${address}`, JSON.stringify(updated));
            return updated;
        });
        const msgs = await loadMessages(addr);
        setMessages(msgs);
        setMsgLoading(false);
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            const updated = await loadMessages(addr);
            setMessages(updated);
        }, 8000);
    };

    const sendMsg = async () => {
        if (!messageInput.trim() || !selectedConvo) return;
        const content = messageInput;
        setMessageInput("");
        const success = await sendMessage(selectedConvo, content);
        if (success) {
            setMessages(prev => [...prev, {
                id: `local_${Date.now()}`,
                content,
                sent: true,
                timestamp: Date.now(),
            }]);
        }
    };

    const filteredPosts = activeCondition === "All"
        ? posts
        : posts.filter(p => p.condition === activeCondition);


    if (!isConnected || !roleLoaded) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F9F6" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #2DA36A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                    <p style={{ color: "var(--text-faint)" }}>Loading...</p>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    return (
        <div style={S.root}>

            {/* Sidebar */}
            <aside style={S.sidebar}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "34px", cursor: "pointer" }} onClick={() => navigate(role === "doctor" ? "/doctor" : "/dashboard")}>
                    <div style={{ fontSize: "22px", width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#1B6B45,#2DA36A)", display: "flex", alignItems: "center", justifyContent: "center" }}>💬</div>
                    <div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "17px", fontWeight: 600, color: "var(--green-900)" }}>Community</div>
                        <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".06em" }}>Health Forum</div>
                    </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "10px", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "6px", paddingLeft: "10px" }}>Navigation</div>
                    <div style={S.navItem} onClick={() => navigate(role === "doctor" ? "/doctor" : "/dashboard")}>
                        <span>🏠</span> Dashboard
                    </div>
                    <div style={S.navItem} onClick={() => navigate("/settings")}>
                        <span>⚙</span> Settings
                    </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "10px", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "10px", paddingLeft: "10px" }}>Topics</div>
                    {CONDITIONS.slice(1).map(c => (
                        <div key={c} style={{ ...S.navItem, ...(activeCondition === c ? { background: "var(--green-50)", color: "var(--green-700)", fontWeight: 600 } : {}) }}
                            onClick={() => { setActiveCondition(c); setActiveTab("forum"); }}>
                            {c}
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: "auto", paddingTop: "18px", borderTop: "1px solid rgba(45,163,106,0.1)" }}>
                    <div style={{ background: "var(--green-50)", border: "1px solid rgba(45,163,106,0.15)", borderRadius: "10px", padding: "10px 12px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--green-700)", marginBottom: "2px" }}>Your pseudonym</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--green-900)" }}>{pseudonym}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>🔐 Wallet address hidden</div>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main style={S.main}>
                <div style={S.topbar}>
                    <div>
                        <div style={S.pageTitle}>Patient Community</div>
                        <div style={S.pageSub}>Anonymous health discussions · Encrypted messaging</div>
                    </div>
                    <ConnectButton showBalance={false} chainStatus="icon" />
                </div>

                {/* Tabs */}
                <div style={S.tabs}>
                    <button style={{ ...S.tab, ...(activeTab === "forum" ? S.tabActive : {}) }} onClick={() => setActiveTab("forum")}>
                        💬 Forum ({posts.length})
                    </button>
                    <button style={{ ...S.tab, ...(activeTab === "messages" ? S.tabActive : {}) }} onClick={() => setActiveTab("messages")}>
                        ✉️ Messages
                    </button>
                </div>

                {/* ── Forum Tab ── */}
                {activeTab === "forum" && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

                        {/* Condition filter */}
                        <div style={S.condRow}>
                            {CONDITIONS.map(c => (
                                <button key={c} style={{ ...S.condTag, ...(activeCondition === c ? S.condActive : {}) }}
                                    onClick={() => setActiveCondition(c)}>
                                    {c}
                                </button>
                            ))}
                        </div>

                        {/* New post button — patients only */}
                        {!isDoctor && (
                            <div style={{ marginBottom: "20px" }}>
                                <button style={S.btnGreen} onClick={() => setShowNewPost(true)}>
                                    ✏️ Start a discussion
                                </button>
                            </div>
                        )}

                        {/* Posts */}
                        {filteredPosts.length === 0 ? (
                            <div style={S.emptyWrap}>
                                <div style={{ fontSize: "42px", marginBottom: "14px" }}>💬</div>
                                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>No posts yet</h3>
                                <p>Be the first to start a discussion in this category.</p>
                            </div>
                        ) : (
                            filteredPosts.map(post => (
                                <motion.div key={post.id} style={S.card}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

                                    <div style={S.postMeta}>
                                        <span style={S.pseudonym}>👤 {post.pseudonym}</span>
                                        <span style={S.condPill}>{post.condition}</span>
                                        <span style={S.timestamp}>{new Date(post.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                        {post.ipfsHash && <span style={{ fontSize: "10px", color: "var(--text-faint)", fontFamily: "monospace" }}>IPFS: {post.ipfsHash}</span>}
                                    </div>

                                    <div style={S.postTitle}>{post.title}</div>
                                    <div style={S.postBody}>{post.content}</div>

                                    {/* Replies */}
                                    {post.replies.length > 0 && (
                                        <div style={S.replyWrap}>
                                            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-faint)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".05em" }}>
                                                {post.replies.length} {post.replies.length === 1 ? "Reply" : "Replies"}
                                            </div>
                                            <AnimatePresence>
                                                {(expandedPost === post.id ? post.replies : post.replies.slice(0, 2)).map(reply => (
                                                    <motion.div key={reply.id} style={S.replyCard}
                                                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                                            <span style={{ fontSize: "12px", fontWeight: 600, color: reply.isDoctor ? "#3B6EA8" : "var(--green-700)" }}>
                                                                {reply.isDoctor ? "👨‍⚕️" : "👤"} {reply.pseudonym}
                                                            </span>
                                                            {reply.isDoctor && <span style={S.doctorBadge}>Doctor</span>}
                                                            <span style={{ ...S.timestamp, marginLeft: "auto" }}>{new Date(reply.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                                                        </div>
                                                        <div style={{ fontSize: "13.5px", color: "var(--text-muted)", lineHeight: 1.65 }}>{reply.content}</div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            {post.replies.length > 2 && (
                                                <button style={S.replyBtn} onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}>
                                                    {expandedPost === post.id ? "Show less ▲" : `Show ${post.replies.length - 2} more replies ▼`}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Reply button */}
                                    <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
                                        <button style={S.replyBtn} onClick={() => setShowReply(showReply === post.id ? null : post.id)}>
                                            💬 Reply
                                        </button>
                                    </div>

                                    {/* Reply form */}
                                    {showReply === post.id && (
                                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                            style={{ marginTop: "12px", background: "#F7FBF8", borderRadius: "10px", padding: "14px" }}>
                                            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--green-900)", marginBottom: "8px" }}>
                                                Replying as <span style={{ color: isDoctor ? "#3B6EA8" : "var(--green-700)" }}>
                                                    {isDoctor ? `Dr. ${pseudonym}` : pseudonym}
                                                </span>
                                                {isDoctor && <span style={S.doctorBadge}>Doctor</span>}
                                            </div>
                                            <textarea rows={3} placeholder="Write your reply..." style={S.textarea}
                                                value={replyContent} onChange={e => setReplyContent(e.target.value)} />
                                            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                                <button style={isDoctor ? S.btnBlue : S.btnGreen} onClick={() => handleReply(post.id)} disabled={replying}>
                                                    {replying ? "Posting..." : "Post Reply"}
                                                </button>
                                                <button style={{ ...S.btnGreen, background: "transparent", border: "1px solid rgba(45,163,106,0.2)", color: "var(--text-muted)" }}
                                                    onClick={() => setShowReply(null)}>Cancel</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                )}

                {/* ── Messages Tab ── */}
                {activeTab === "messages" && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "16px", height: "calc(100vh - 220px)" }}>

                        {/* Conversations list */}
                        <div style={{ background: "#fff", border: "1px solid rgba(45,163,106,0.15)", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                            <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(45,163,106,0.08)" }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 600, color: "var(--green-900)", marginBottom: "10px" }}>
                                    Messages
                                    <span style={{ fontSize: "11px", color: "#6B9ED4", fontFamily: "var(--font-body)", fontWeight: 400, marginLeft: "8px" }}>XMTP encrypted</span>
                                </div>
                                {!xmtpReady && (
                                    <button style={{ ...S.btnGreen, width: "100%", marginBottom: "10px", fontSize: "12.5px", padding: "9px" }}
                                        onClick={initXMTP} disabled={xmtpLoading}>
                                        {xmtpLoading ? "Connecting XMTP..." : "🔐 Connect to XMTP"}
                                    </button>
                                )}
                                {xmtpReady && (
                                    <>
                                        <input placeholder="Paste wallet address..." style={{ ...S.input, fontSize: "12.5px" }}
                                            value={newConvoAddr} onChange={e => setNewConvoAddr(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && startConversation()} />
                                        <button style={{ ...S.btnBlue, width: "100%", marginTop: "8px", fontSize: "12.5px", padding: "8px" }}
                                            onClick={startConversation}>+ New Message</button>
                                    </>
                                )}
                            </div>
                            <div style={{ flex: 1, overflowY: "auto" }}>
                                {conversations.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "30px 16px", color: "var(--text-faint)", fontSize: "13px" }}>
                                        {xmtpReady ? "No conversations yet.\nPaste a wallet address above." : "Connect to XMTP to start messaging."}
                                    </div>
                                ) : conversations.map(addr => (
                                    <div key={addr}
                                        style={{ padding: "14px 18px", borderBottom: "1px solid rgba(45,163,106,0.05)", cursor: "pointer", background: selectedConvo === addr ? "#EEF4FF" : "transparent", transition: "background .15s" }}
                                        onMouseEnter={e => { if (selectedConvo !== addr) e.currentTarget.style.background = "#F7FBF8"; }}
                                        onMouseLeave={e => { if (selectedConvo !== addr) e.currentTarget.style.background = "transparent"; }}
                                        onClick={() => openConvo(addr)}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#6B9ED4,#3B6EA8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                                {addr.slice(2, 4).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--green-900)", fontFamily: "monospace" }}>{addr.slice(0, 6)}...{addr.slice(-4)}</div>
                                                <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>🔐 End-to-end encrypted</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chat window */}
                        <div style={{ background: "#fff", border: "1px solid rgba(45,163,106,0.15)", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                            {!selectedConvo ? (
                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", color: "var(--text-faint)" }}>
                                    <div style={{ fontSize: "42px" }}>✉️</div>
                                    <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)" }}>Select a conversation</div>
                                    <div style={{ fontSize: "13px" }}>Messages are end-to-end encrypted via XMTP</div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(45,163,106,0.08)", display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#6B9ED4,#3B6EA8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff" }}>
                                            {selectedConvo.slice(2, 4).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--green-900)", fontFamily: "monospace" }}>{selectedConvo.slice(0, 6)}...{selectedConvo.slice(-4)}</div>
                                            <div style={{ fontSize: "11px", color: "#2DA36A" }}>🔐 End-to-end encrypted · XMTP Network</div>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {msgLoading && <div style={{ textAlign: "center", padding: "20px", color: "var(--text-faint)" }}>Loading messages...</div>}
                                        {!msgLoading && messages.length === 0 && (
                                            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-faint)", fontSize: "13px" }}>No messages yet. Say hello! 👋</div>
                                        )}
                                        {messages.map(msg => (
                                            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.sent ? "flex-end" : "flex-start" }}>
                                                <div style={{ ...S.msgBubble, ...(msg.sent ? S.msgSent : S.msgRecv) }}>
                                                    {msg.content}
                                                </div>
                                                <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "4px", marginLeft: msg.sent ? 0 : "4px", marginRight: msg.sent ? "4px" : 0 }}>
                                                    {new Date(msg.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(45,163,106,0.08)", display: "flex", gap: "10px" }}>
                                        <input placeholder="Type a message..." style={{ ...S.input, flex: 1 }}
                                            value={messageInput} onChange={e => setMessageInput(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && sendMsg()} />
                                        <button style={S.btnGreen} onClick={sendMsg} disabled={!xmtpReady}>Send →</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </main>

            {/* New Post Modal */}
            {showNewPost && (
                <div style={S.overlay} onClick={() => setShowNewPost(false)}>
                    <motion.div style={S.modal} onClick={e => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}>
                        <div style={S.modalHead}>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: "var(--green-900)" }}>Start a Discussion</div>
                            <button style={S.closeBtn} onClick={() => setShowNewPost(false)}>✕</button>
                        </div>
                        <div style={S.modalBody}>
                            <div style={{ marginBottom: "14px" }}>
                                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--green-900)", marginBottom: "6px" }}>Posting as</div>
                                <div style={{ fontSize: "13.5px", color: "var(--green-700)", fontWeight: 600, background: "var(--green-50)", padding: "8px 12px", borderRadius: "8px" }}>
                                    👤 {pseudonym} <span style={{ fontSize: "11px", color: "var(--text-faint)", fontWeight: 400 }}>— your wallet address is hidden</span>
                                </div>
                            </div>
                            <div style={{ marginBottom: "14px" }}>
                                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--green-900)", marginBottom: "6px" }}>Health condition</div>
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    {CONDITIONS.slice(1).map(c => (
                                        <button key={c} style={{ ...S.condTag, ...(newCondition === c ? S.condActive : {}) }} onClick={() => setNewCondition(c)}>{c}</button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom: "14px" }}>
                                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--green-900)", marginBottom: "6px" }}>Title</div>
                                <input style={S.input} placeholder="What would you like to discuss?" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                            </div>
                            <div style={{ marginBottom: "14px" }}>
                                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--green-900)", marginBottom: "6px" }}>Your message</div>
                                <textarea rows={5} style={S.textarea} placeholder="Share your experience, ask a question, or offer advice..." value={newContent} onChange={e => setNewContent(e.target.value)} />
                            </div>
                            <div style={S.ipfsNote}>
                                🔐 Your post will be stored on IPFS — decentralised and permanent. Only your pseudonym is shown, never your wallet address.
                            </div>
                        </div>
                        <div style={S.modalFoot}>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button style={S.btnGreen} onClick={handleNewPost} disabled={posting || !newTitle.trim() || !newContent.trim()}>
                                    {posting ? "Posting to IPFS..." : "📤 Post to Community"}
                                </button>
                                <button style={{ ...S.btnGreen, background: "transparent", border: "1px solid rgba(45,163,106,0.2)", color: "var(--text-muted)" }} onClick={() => setShowNewPost(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

        </div>
    );
}