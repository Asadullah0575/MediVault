import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import styles from "./Landing.module.css";

/* ─── Plant canvas animation ─────────────────────────────── */
function usePlantCanvas(ref: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = ref.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let windTime = 0;

    const GREENS = ["#2DA36A","#1B6B45","#5CAE85","#A8D5BC","#3BBF7A","#7FC9A4","#C8EAD8"];

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    /* stems */
    const stems = Array.from({ length: 18 }, (_, i) => {
      const side = i < 9 ? "left" : "right";
      const x = side === "left"
        ? 20 + i * 60
        : (canvas.width || 1400) - 20 - (i - 9) * 60;
      const leafCount = 3 + Math.floor(Math.random() * 5);
      return {
        x, side,
        height:    130 + Math.random() * 240,
        thickness: 1.4 + Math.random() * 2.8,
        color:     GREENS[Math.floor(Math.random() * GREENS.length)],
        phase:     Math.random() * Math.PI * 2,
        sway:      7 + Math.random() * 20,
        leaves: Array.from({ length: leafCount }, (_, j) => ({
          t:     0.25 + j * (0.6 / leafCount) + Math.random() * 0.04,
          size:  16 + Math.random() * 36,
          dir:   Math.random() > 0.5 ? 1 : -1,
          angle: 0.2 + Math.random() * 0.55,
          color: GREENS[Math.floor(Math.random() * GREENS.length)],
          phase: Math.random() * Math.PI * 2,
        })),
      };
    });

    /* falling petals */
    const petals = Array.from({ length: 38 }, () => mkPetal(true));
    function mkPetal(rand: boolean) {
      const W = canvas.width || 1400;
      const H = canvas.height || 700;
      return {
        x:          rand ? Math.random() * W : Math.random() * W,
        y:          rand ? Math.random() * H : -20,
        size:       5 + Math.random() * 13,
        rot:        Math.random() * Math.PI * 2,
        rotSpeed:   (Math.random() - 0.5) * 0.04,
        vx:         (Math.random() - 0.35) * 0.55,
        vy:         0.35 + Math.random() * 0.65,
        opacity:    0.2 + Math.random() * 0.5,
        color:      GREENS[Math.floor(Math.random() * GREENS.length)],
        wobble:     Math.random() * Math.PI * 2,
        wobbleSpeed:0.018 + Math.random() * 0.022,
      };
    }

    function lighten(hex: string) {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return `rgb(${Math.min(255,r+55)},${Math.min(255,g+65)},${Math.min(255,b+45)})`;
    }

    function drawLeaf(cx: number, cy: number, size: number, angle: number, color: string) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.68;
      const g = ctx.createLinearGradient(0, -size/2, 0, size/2);
      g.addColorStop(0, color);
      g.addColorStop(1, lighten(color));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -size/2);
      ctx.bezierCurveTo( size*0.55, -size*0.25,  size*0.55, size*0.25, 0, size/2);
      ctx.bezierCurveTo(-size*0.55,  size*0.25, -size*0.55,-size*0.25, 0,-size/2);
      ctx.fill();
      // midrib
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth   = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -size/2);
      ctx.lineTo(0,  size/2);
      ctx.stroke();
      ctx.restore();
    }

    function drawStem(s: typeof stems[0]) {
      const W = canvas.width; const H = canvas.height;
      const wind = Math.sin(windTime * 0.9 + s.phase) * s.sway;
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth   = s.thickness;
      ctx.globalAlpha = 0.52;
      ctx.beginPath();
      ctx.moveTo(s.x, H);
      ctx.bezierCurveTo(
        s.x + wind * 0.3, H - s.height * 0.3,
        s.x + wind * 0.7, H - s.height * 0.65,
        s.x + wind,       H - s.height,
      );
      ctx.stroke();

      for (const l of s.leaves) {
        const lx = s.x + wind * l.t;
        const ly = H - s.height * l.t;
        const leafWind = Math.sin(windTime * 0.9 + s.phase + l.phase) * 0.38;
        drawLeaf(lx, ly, l.size, l.dir * (l.angle + leafWind), l.color);
      }
      ctx.restore();
    }

    function frame() {
      const W = canvas.width; const H = canvas.height;
      windTime += 0.006;
      ctx.clearRect(0, 0, W, H);

      // subtle background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "rgba(235,245,238,0.0)");
      bg.addColorStop(1, "rgba(220,240,228,0.0)");
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      for (const s of stems) drawStem(s);

      for (const p of petals) {
        p.wobble   += p.wobbleSpeed;
        p.x += p.vx + Math.sin(windTime * 1.8 + p.wobble) * 0.42 + 0.28;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        if (p.y > H + 20 || p.x > W + 20) Object.assign(p, mkPetal(false));

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.38, p.size, 0, 0, Math.PI * 2);
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

/* ─── ECG canvas ─────────────────────────────────────────── */
function useEcgCanvas(ref: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = ref.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    let t = 0, animId: number;
    const pts: number[] = Array(W).fill(H / 2);

    function ecgY(p: number) {
      const ph = p % 1;
      if (ph < 0.10) return H/2 + Math.sin(ph * Math.PI * 10) * 2.5;
      if (ph < 0.15) return H/2 - (ph - 0.10) * 900;
      if (ph < 0.22) return H/2 + (ph - 0.15) * 500;
      if (ph < 0.27) return H/2 - (ph - 0.22) * 180;
      if (ph < 0.32) return H/2 + (ph - 0.27) * 60;
      return H/2 + Math.sin(ph * Math.PI * 2) * 2;
    }

    function frame() {
      t += 0.017;
      pts.shift(); pts.push(ecgY(t));
      ctx.clearRect(0, 0, W, H);

      // glow fill
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, "rgba(45,163,106,0.22)");
      grd.addColorStop(1, "rgba(45,163,106,0)");
      ctx.beginPath();
      ctx.moveTo(0, H);
      pts.forEach((y, x) => ctx.lineTo(x, y));
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();

      // line
      ctx.beginPath();
      pts.forEach((y, x) => x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = "#2DA36A";
      ctx.lineWidth   = 2;
      ctx.shadowColor = "#2DA36A";
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;
      animId = requestAnimationFrame(frame);
    }
    frame();
    return () => cancelAnimationFrame(animId);
  }, [ref]);
}

/* ─── Component ─────────────────────────────────────────── */
export default function Landing() {
  const navigate   = useNavigate();
  const { isConnected } = useAccount();
  const plantRef   = useRef<HTMLCanvasElement>(null);
  const ecgRef     = useRef<HTMLCanvasElement>(null);
  usePlantCanvas(plantRef);
  useEcgCanvas(ecgRef);

  const vitals = [
    { icon: "❤️", label: "Heart Rate",   value: "72",   unit: "bpm",  status: "Normal",    ok: true  },
    { icon: "🫁", label: "Oxygen",       value: "98",   unit: "%",    status: "Optimal",   ok: true  },
    { icon: "🌡️", label: "Temperature",  value: "36.6", unit: "°C",   status: "Normal",    ok: true  },
    { icon: "💧", label: "Hydration",    value: "87",   unit: "%",    status: "Drink more",ok: false },
  ];

  const features = [
    { icon: "🔐", bg: "#E6F7EE", title: "Homomorphic Encryption",   body: "Health data is encrypted before it leaves your browser. The blockchain computes on ciphertext — never plaintext." },
    { icon: "🩺", bg: "#E6F5F7", title: "Doctor Access Control",    body: "Grant or revoke a doctor's view of your records with one on-chain transaction. Full audit trail, always." },
    { icon: "⛓️", bg: "#E8F0FA", title: "Immutable Record Keeping", body: "Every health event is stored permanently on Sepolia — tamper-proof and verifiable forever." },
    { icon: "🌿", bg: "#F0F7EA", title: "Holistic Wellness Vault",  body: "Lab results, vitals, vaccinations and wellness data — one encrypted, self-sovereign health record." },
  ];

  const steps = [
    { n: "1", title: "Connect Wallet",      body: "Link MetaMask to MediVault. Your wallet address is your anonymous patient identity — no sign-up needed." },
    { n: "2", title: "Upload Health Data",  body: "Data is encrypted client-side with FHE public keys. Ciphertext is all that ever touches the blockchain." },
    { n: "3", title: "Grant Doctor Access", body: "Choose which doctors see which records. Revoke any access instantly, at any time, on-chain." },
    { n: "4", title: "Stay in Control",     body: "Every access event is logged permanently. You always know exactly who viewed your data and when." },
  ];

  return (
    <div className={styles.root}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
              <path d="M10 2C10 2 4 5 4 11C4 14.3 6.7 17 10 17C13.3 17 16 14.3 16 11C16 5 10 2 10 2Z" fill="white" opacity=".9"/>
              <path d="M10 7V13M7 10H13" stroke="#1B6B45" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={styles.logoText}>Medi<span>Vault</span></span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#wellness">Wellness</a>
        </div>
        <div className={styles.navActions}>
          <ConnectButton
            label="Connect Wallet"
            showBalance={false}
            chainStatus="none"
          />
          {isConnected && (
            <button className={styles.btnLaunch} onClick={() => navigate("/dashboard")}>
              Open Dashboard →
            </button>
          )}
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <canvas ref={plantRef} className={styles.plantCanvas} />

        <div className={styles.heroInner}>
          {/* left */}
          <motion.div
            className={styles.heroLeft}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className={styles.badge}>
              <span className={styles.badgeDot} />
              FHE Powered · Sepolia Testnet · Open Source
            </div>
            <h1 className={styles.heroH1}>
              Your health records,<br />
              <em>truly private</em><br />
              on the blockchain.
            </h1>
            <p className={styles.heroSub}>
              MediVault uses Fully Homomorphic Encryption so your medical data
              stays encrypted — even while being processed on-chain. No one reads
              your data without your explicit permission.
            </p>
            <div className={styles.heroBtns}>
              <button className={styles.btnPrimary} onClick={() => navigate("/dashboard")}>
                Get started — free
              </button>
              <a href="#how" className={styles.btnGhost}>
                How it works ↓
              </a>
            </div>
            <div className={styles.heroStats}>
              {[
                ["100%",  "FHE encrypted"],
                ["0",     "Data exposed"],
                ["∞",     "You stay in control"],
              ].map(([n, l]) => (
                <div key={l} className={styles.statItem}>
                  <div className={styles.statN}>{n}</div>
                  <div className={styles.statL}>{l}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* right — vitals card */}
          <motion.div
            className={styles.heroRight}
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className={styles.vitalsCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Patient Health Overview</span>
                <span className={styles.livePill}><span className={styles.liveDot}/>Live</span>
              </div>
              <div className={styles.vitalsGrid}>
                {vitals.map(v => (
                  <div key={v.label} className={styles.vital}>
                    <div className={styles.vitalIcon}>{v.icon}</div>
                    <div className={styles.vitalLabel}>{v.label}</div>
                    <div className={styles.vitalVal}>
                      {v.value} <span className={styles.vitalUnit}>{v.unit}</span>
                    </div>
                    <span className={`${styles.statusPill} ${v.ok ? styles.statusOk : styles.statusWarn}`}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.ecgWrap}>
                <div className={styles.ecgLabel}>ECG — LIVE HEARTBEAT</div>
                <canvas ref={ecgRef} width={480} height={52} className={styles.ecgCanvas}/>
              </div>
              <div className={styles.cardFooter}>
                {[["4","Encrypted records"],["2","Doctors granted"],["100%","FHE secured"]].map(([n,l])=>(
                  <div key={l} className={styles.footerStat}>
                    <div className={styles.footerN}>{n}</div>
                    <div className={styles.footerL}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className={styles.featSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionLabel}>Why MediVault</p>
          <h2 className={styles.sectionTitle}>Built for real healthcare privacy.</h2>
          <p className={styles.sectionSub}>
            Every record is encrypted before it touches the blockchain. Doctors only
            see what you authorise — computed without ever decrypting your data.
          </p>
          <div className={styles.featGrid}>
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className={styles.featCard}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className={styles.featIcon} style={{ background: f.bg }}>{f.icon}</div>
                <div className={styles.featTitle}>{f.title}</div>
                <div className={styles.featBody}>{f.body}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how" className={styles.howSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionLabelLight}>How it works</p>
          <h2 className={styles.sectionTitleLight}>Private by design,<br/>verifiable by default.</h2>
          <p className={styles.sectionSubLight}>
            Three simple steps — from your doctor's office to the blockchain, fully encrypted end to end.
          </p>
          <div className={styles.stepsRow}>
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                className={styles.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={styles.stepNum}>{s.n}</div>
                <div className={styles.stepTitle}>{s.title}</div>
                <div className={styles.stepBody}>{s.body}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <motion.div
          className={styles.ctaBox}
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className={styles.ctaTitle}>Your health data belongs to you.</h2>
          <p className={styles.ctaSub}>
            Join MediVault — the first FHE-powered confidential health record system on Ethereum.
          </p>
          <button className={styles.btnPrimary} onClick={() => navigate("/dashboard")}>
            Launch MediVault →
          </button>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.footerLogo}>Medi<span>Vault</span></div>
            <div className={styles.footerNote}>Confidential health records on Sepolia · Built with FHE</div>
          </div>
          <div className={styles.footerRight}>
            <span className={styles.encDot}/> FHE encryption active
          </div>
        </div>
      </footer>
    </div>
  );
}
