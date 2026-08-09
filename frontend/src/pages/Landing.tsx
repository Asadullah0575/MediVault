import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";

// ─── Floating Leaves Canvas Animation ───────────────────────────────
function usePlantCanvas(ref: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let windTime = 0;

    const GREENS = ["#389269", "#2b7554", "#58ae87", "#bce0d1", "#255e44"];

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const stems = Array.from({ length: 14 }, (_, i) => {
      const side = i < 7 ? "left" : "right";
      const x = side === "left"
        ? 20 + i * 70
        : (canvas.width || 1200) - 20 - (i - 7) * 70;
      const leafCount = 3 + Math.floor(Math.random() * 4);
      return {
        x, side,
        height: 140 + Math.random() * 200,
        thickness: 1.5 + Math.random() * 2,
        color: GREENS[Math.floor(Math.random() * GREENS.length)],
        phase: Math.random() * Math.PI * 2,
        sway: 8 + Math.random() * 15,
        leaves: Array.from({ length: leafCount }, (_, j) => ({
          t: 0.3 + j * (0.6 / leafCount) + Math.random() * 0.03,
          size: 15 + Math.random() * 25,
          dir: Math.random() > 0.5 ? 1 : -1,
          angle: 0.3 + Math.random() * 0.5,
          color: GREENS[Math.floor(Math.random() * GREENS.length)],
          phase: Math.random() * Math.PI * 2,
        })),
      };
    });

    const petals = Array.from({ length: 25 }, () => mkPetal(true));
    function mkPetal(rand: boolean) {
      const W = canvas?.width || 1200;
      const H = canvas?.height || 600;
      return {
        x: Math.random() * W,
        y: rand ? Math.random() * H : -20,
        size: 4 + Math.random() * 10,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        vx: (Math.random() - 0.3) * 0.4,
        vy: 0.3 + Math.random() * 0.5,
        opacity: 0.15 + Math.random() * 0.4,
        color: GREENS[Math.floor(Math.random() * GREENS.length)],
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.01 + Math.random() * 0.02,
      };
    }

    function lighten(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgb(${Math.min(255, r + 40)},${Math.min(255, g + 50)},${Math.min(255, b + 30)})`;
    }

    function drawLeaf(cx: number, cy: number, size: number, angle: number, color: string) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.5;
      const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      g.addColorStop(0, color);
      g.addColorStop(1, lighten(color));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.bezierCurveTo(size * 0.5, -size * 0.2, size * 0.5, size * 0.2, 0, size / 2);
      ctx.bezierCurveTo(-size * 0.5, size * 0.2, -size * 0.5, -size * 0.2, 0, -size / 2);
      ctx.fill();
      ctx.restore();
    }

    function drawStem(s: typeof stems[0]) {
      if (!canvas || !ctx) return;
      const H = canvas.height;
      const wind = Math.sin(windTime * 0.8 + s.phase) * s.sway;
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.thickness;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(s.x, H);
      ctx.bezierCurveTo(
        s.x + wind * 0.3, H - s.height * 0.3,
        s.x + wind * 0.7, H - s.height * 0.6,
        s.x + wind, H - s.height,
      );
      ctx.stroke();

      for (const l of s.leaves) {
        const lx = s.x + wind * l.t;
        const ly = H - s.height * l.t;
        const leafWind = Math.sin(windTime * 0.8 + s.phase + l.phase) * 0.3;
        drawLeaf(lx, ly, l.size, l.dir * (l.angle + leafWind), l.color);
      }
      ctx.restore();
    }

    function frame() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      windTime += 0.005;
      ctx.clearRect(0, 0, W, H);

      for (const s of stems) drawStem(s);

      for (const p of petals) {
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(windTime * 1.5 + p.wobble) * 0.3 + 0.2;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        if (p.y > H + 20 || p.x > W + 20) Object.assign(p, mkPetal(false));

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.35, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(frame);
    }
    frame();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [ref]);
}

// ─── ECG Heartbeat Canvas ───────────────────────────────────────────
function useEcgCanvas(ref: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    let t = 0;
    let animId: number;
    const pts: number[] = Array(W).fill(H / 2);

    function ecgY(p: number) {
      const ph = p % 1;
      if (ph < 0.08) return H / 2 + Math.sin(ph * Math.PI * 12) * 2;
      if (ph < 0.13) return H / 2 - (ph - 0.08) * 800;
      if (ph < 0.20) return H / 2 + (ph - 0.13) * 450;
      if (ph < 0.25) return H / 2 - (ph - 0.20) * 150;
      if (ph < 0.30) return H / 2 + (ph - 0.25) * 50;
      return H / 2 + Math.sin(ph * Math.PI * 2) * 1.5;
    }

    function frame() {
      if (!ctx) return;
      t += 0.015;
      pts.shift();
      pts.push(ecgY(t));
      ctx.clearRect(0, 0, W, H);

      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, "rgba(56, 146, 105, 0.15)");
      grd.addColorStop(1, "rgba(56, 146, 105, 0)");
      ctx.beginPath();
      ctx.moveTo(0, H);
      pts.forEach((y, x) => ctx.lineTo(x, y));
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      pts.forEach((y, x) => x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = "#389269";
      ctx.lineWidth = 2;
      ctx.stroke();
      animId = requestAnimationFrame(frame);
    }
    frame();
    return () => cancelAnimationFrame(animId);
  }, [ref]);
}

export default function Landing() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const plantRef = useRef<HTMLCanvasElement>(null);
  const ecgRef = useRef<HTMLCanvasElement>(null);
  usePlantCanvas(plantRef);
  useEcgCanvas(ecgRef);

  const features = [
    {
      icon: "📁",
      title: "Health Data Wallet",
      body: "Consolidate and organize your scattered lab tests, vaccine logs, prescriptions, and imaging reports in one secure wallet."
    },
    {
      icon: "🧠",
      title: "AI Health Intelligence",
      body: "Automatically structures raw uploads into dynamic clinical timelines, understandable summaries, and prep questions for your next clinic visit."
    },
    {
      icon: "🔐",
      title: "Granular Access Control",
      body: "Grant doctors view permissions for specific records with set expiry periods (e.g. 24h, 48h). Revoke access at any time."
    },
    {
      icon: "🚨",
      title: "Emergency QR Profile",
      body: "Generate a medical card QR code. In emergencies, first responders scan it to access critical warnings, allergies, and blood type."
    },
    {
      icon: "🧬",
      title: "Anonymized Research Opt-in",
      body: "Voluntarily contribute specific categories of anonymized health records to medical research studies. You control your consent."
    },
    {
      icon: "🛡️",
      title: "Zero-Trust Security Model",
      body: "Permissions are governed by strict client-side encryption rules. Audit logs log every access event, so privacy is fully visible."
    }
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans">
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-50 rounded-full blur-3xl opacity-60 pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-[800px] right-0 w-80 h-80 bg-accent-50 rounded-full blur-3xl opacity-50 pointer-events-none translate-x-1/3" />

      {/* NAVIGATION BAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-50/80 border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center shadow-md">
            <svg viewBox="0 0 20 20" className="w-5 h-5 fill-white">
              <path d="M10 2C10 2 4 5 4 11C4 14.3 6.7 17 10 17C13.3 17 16 14.3 16 11C16 5 10 2 10 2Z" fillOpacity=".9"/>
              <path d="M10 6v8M6 10h8" stroke="#389269" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-brand-900">
            Medi<span className="text-accent-600">Vault</span>
          </span>
          <span className="text-xs bg-brand-100 text-brand-800 font-semibold px-2 py-0.5 rounded-full ml-1">
            2.0
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
          <a href="#how" className="hover:text-brand-600 transition-colors">Emergency Profile</a>
          <a href="#research" className="hover:text-brand-600 transition-colors">Research Layer</a>
        </div>

        <div className="flex items-center gap-4">
          <ConnectButton showBalance={false} chainStatus="none" />
          {isConnected && (
            <button
              onClick={() => navigate("/select-role")}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all"
            >
              Enter Dashboard →
            </button>
          )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="relative px-6 py-20 lg:py-32 flex flex-col lg:flex-row items-center gap-16 max-w-7xl mx-auto">
        <canvas ref={plantRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
        
        {/* HERO LEFT */}
        <motion.div
          className="flex-1 flex flex-col items-start text-left z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-800 px-3 py-1 rounded-full text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            MediVault 2.0 Launch: Privacy-First AI Health Wallet
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1] mb-6">
            Your health records, <br />
            <span className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent italic">
              truly private.
            </span>
          </h1>

          <p className="text-lg text-slate-600 mb-8 max-w-xl">
            MediVault puts your clinical data directly back in your hands. Organize files, read AI-generated timelines, configure expiring doctor access links, and optionally contribute to research—fully secured.
          </p>

          <div className="flex flex-wrap gap-4 mb-12">
            <button
              onClick={() => isConnected ? navigate("/select-role") : navigate("/dashboard")}
              className="bg-gradient-to-r from-brand-600 to-accent-600 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.01]"
            >
              Get Started Now — Free
            </button>
            <a
              href="#features"
              className="bg-white hover:bg-slate-100 text-slate-700 font-semibold px-6 py-3.5 rounded-xl border border-slate-200 transition-all flex items-center gap-2"
            >
              Explore Features ↓
            </a>
          </div>

          <div className="flex gap-10 border-t border-slate-200/80 pt-8 w-full max-w-md">
            <div>
              <div className="text-3xl font-bold text-brand-600">100%</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Patient Owned</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent-600">Active</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">AI Insights</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-600">Secure</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Consent Log</div>
            </div>
          </div>
        </motion.div>

        {/* HERO RIGHT (Vitals Card Mockup) */}
        <motion.div
          className="flex-1 w-full max-w-lg z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold text-slate-700">Patient Health Overview</span>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 flex flex-col">
                <span className="text-2xl mb-2">❤️</span>
                <span className="text-xs text-slate-500 font-medium">Heart Rate</span>
                <span className="text-xl font-bold text-brand-900 mt-1">76 <span className="text-xs font-normal text-slate-500">bpm</span></span>
                <span className="text-[10px] text-brand-700 font-semibold mt-1">Normal</span>
              </div>
              <div className="p-4 bg-accent-50/40 rounded-2xl border border-accent-100 flex flex-col">
                <span className="text-2xl mb-2">🩸</span>
                <span className="text-xs text-slate-500 font-medium">Cholesterol</span>
                <span className="text-xl font-bold text-accent-950 mt-1">185 <span className="text-xs font-normal text-slate-500">mg/dL</span></span>
                <span className="text-[10px] text-accent-600 font-semibold mt-1">Desirable</span>
              </div>
            </div>

            {/* ECG WAVE */}
            <div className="bg-slate-900 rounded-2xl p-4 mb-6 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider block mb-2 uppercase">ECG Simulation wave</span>
              <canvas ref={ecgRef} width={400} height={50} className="w-full h-12 bg-transparent" />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/80 pt-4">
              <div><strong>6</strong> Encrypted Files</div>
              <div><strong>1</strong> Active Doctor</div>
              <div className="text-emerald-600 font-semibold">Consent Active</div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* CORE FEATURES GRID */}
      <section id="features" className="py-24 bg-white border-y border-slate-200/60 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-brand-600 font-bold text-sm uppercase tracking-widest mb-3">MediVault Capabilities</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Designed to empower health ownership.</h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-16">
            We merge standard web storage infrastructure with robust, user-controlled encryption and AI intelligence layers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-left hover:shadow-md hover:border-slate-300 transition-all"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-2xl mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg text-slate-950 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-brand-900 to-slate-950 text-white rounded-3xl p-8 md:p-12 text-center shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Take control of your medical history.</h2>
          <p className="text-brand-100 max-w-lg mx-auto mb-8 text-sm md:text-base leading-relaxed">
            Consolidate your logs, review automated clinical insights, and share selectively with zero compromises.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-white hover:bg-slate-100 text-brand-950 font-semibold px-8 py-3.5 rounded-xl transition-all shadow-md"
          >
            Launch Health Wallet →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-6 py-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="font-display text-sm font-bold text-slate-800">MediVault 2.0</div>
            <div className="mt-1">Copyright © 2026. All rights reserved.</div>
          </div>
          <div className="flex items-center gap-2 text-brand-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-brand-500 inline-block animate-pulse" />
            AI Health Assistant Active
          </div>
        </div>
      </footer>
    </div>
  );
}
