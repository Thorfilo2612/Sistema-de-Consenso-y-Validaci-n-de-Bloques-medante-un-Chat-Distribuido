import { useRef, useEffect, useMemo } from "react";
import "./ConsensusPanel.css";

/* ── Phase color map ──────────────────────────────────────────── */
const PHASE_COLORS = {
  IDLE:       "#8A8A8A",
  PROPOSING:  "#F5A623",
  ACCEPTING:  "#00C896",
  COMMITTING: "#00C896",
  COMMITTED:  "#00C896",
  REJECTED:   "#E05252",
};

/* ── Star generation (positions stored as 0-1 fractions) ─────── */
function genStars(count, r, minA, maxA) {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x:     Math.random(),
    y:     Math.random(),
    r,
    alpha: minA + Math.random() * (maxA - minA),
    phase: Math.random() * Math.PI * 2, /* stagger parallax */
  }));
}

/* ── roundRect polyfill ───────────────────────────────────────── */
function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/* ── Space graph canvas ───────────────────────────────────────── */
function ConsensusGraph({ users, receivedVotes, leader, proposedBlock, phase }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const tRef      = useRef(0);

  /* Fixed random stars — generated once per mount */
  const starsSmall = useMemo(() => genStars(120, 1.0, 0.35, 0.65), []);
  const starsMed   = useMemo(() => genStars(40,  1.5, 0.50, 0.70), []);
  const starsLarge = useMemo(() => genStars(8,   2.0, 0.80, 1.00), []);

  const prefersReducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = Math.round(rect.width  * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const ctx = canvas.getContext("2d");

    function frame() {
      const W = canvas.width  / dpr;
      const H = canvas.height / dpr;
      if (W < 10 || H < 10) { rafRef.current = requestAnimationFrame(frame); return; }

      const t = tRef.current;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      /* ── Space background ────────────────────────────────────── */
      ctx.fillStyle = "#03030A";
      ctx.fillRect(0, 0, W, H);

      /* Nebula 1 — top-right, emerald tint */
      const n1 = ctx.createRadialGradient(
        W * 0.84, H * 0.10, 0,
        W * 0.84, H * 0.10, W * 0.50
      );
      n1.addColorStop(0, "rgba(0,200,150,0.048)");
      n1.addColorStop(1, "transparent");
      ctx.fillStyle = n1;
      ctx.fillRect(0, 0, W, H);

      /* Nebula 2 — bottom-left, indigo tint */
      const n2 = ctx.createRadialGradient(
        W * 0.13, H * 0.88, 0,
        W * 0.13, H * 0.88, W * 0.40
      );
      n2.addColorStop(0, "rgba(100,60,180,0.038)");
      n2.addColorStop(1, "transparent");
      ctx.fillStyle = n2;
      ctx.fillRect(0, 0, W, H);

      /* ── Stars ───────────────────────────────────────────────── */
      /* Small + medium: static */
      starsSmall.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${s.alpha.toFixed(2)})`;
        ctx.fill();
      });
      starsMed.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${s.alpha.toFixed(2)})`;
        ctx.fill();
      });
      /* Large: ±6px parallax, 8-second cycle, ease-in-out via sine */
      starsLarge.forEach(s => {
        const dy = prefersReducedMotion
          ? 0
          : Math.sin((t * Math.PI / 4) + s.phase) * 6; /* period = 8s */
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H + dy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(225,220,255,${s.alpha.toFixed(2)})`;
        ctx.fill();
      });

      /* ── Layout geometry ─────────────────────────────────────── */
      const cx = W / 2, cy = H / 2;
      const S  = Math.min(W, H);
      /* All nodes at equal R, uniform angle step — perfect circle */
      const R     = S * 0.34;
      /* Node radii: leader 34px, all others 28px (56px diameter) */
      const valR  = S * 0.14;
      const leadR = S * 0.17;
      const count = users.length;
      const nodes = users.map((user, i) => {
        const angle = -Math.PI / 2 + (i / count) * 2 * Math.PI;
        return {
          ...user,
          nx: cx + R * Math.cos(angle),
          ny: cy + R * Math.sin(angle),
        };
      });

      /* ── Dot timing constants ────────────────────────────────── */
      /* t += 0.016/frame → 1.0 unit ≈ 1 s at 60 fps.
         When wired to the real backend, replace the looping progress
         formula with event-driven timestamps. */
      const ACCEPT_PERIOD = 3.0;
      const DIST_PERIOD   = 3.5;

      /* Per-node transient glow intensity (0 = idle, 1 = peak).
         Fires only while a dot is departing or arriving at that node. */
      const nodeGlow = nodes.map((node, i) => {
        if (prefersReducedMotion) return 0;
        let g = 0;
        if (i < receivedVotes && node.status !== "disconnected") {
          const p = ((t - i * 0.9) % ACCEPT_PERIOD + ACCEPT_PERIOD) % ACCEPT_PERIOD / ACCEPT_PERIOD;
          if (p < 0.18) g = Math.max(g, 1 - p / 0.18);
        }
        if (node.name !== leader && node.status !== "disconnected") {
          const p = ((t - i * 1.1 - 6.0) % DIST_PERIOD + DIST_PERIOD) % DIST_PERIOD / DIST_PERIOD;
          if (p > 0.82) g = Math.max(g, (p - 0.82) / 0.18);
        }
        return g;
      });

      /* ── Connection lines ────────────────────────────────────── */
      nodes.forEach(node => {
        const isLeaderNode = node.name === leader;
        ctx.beginPath();
        ctx.moveTo(node.nx, node.ny);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = isLeaderNode ? "rgba(0,200,150,0.40)" : "#2A2A2A";
        ctx.lineWidth   = isLeaderNode ? 1.5 : 1;
        ctx.stroke();
      });

      /* ── Traveling dots ──────────────────────────────────────── */
      if (!prefersReducedMotion) {
        nodes.forEach((node, i) => {
          if (i >= receivedVotes || node.status === "disconnected") return;
          const prog = ((t - i * 0.9) % ACCEPT_PERIOD + ACCEPT_PERIOD) % ACCEPT_PERIOD / ACCEPT_PERIOD;
          const px   = node.nx + (cx - node.nx) * prog;
          const py   = node.ny + (cy - node.ny) * prog;
          const a    = prog < 0.82 ? 0.92 : (1 - prog) / 0.18 * 0.92;
          const g    = ctx.createRadialGradient(px, py, 0, px, py, 9);
          g.addColorStop(0, `rgba(0,200,150,${(a * 0.45).toFixed(2)})`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,200,150,${a.toFixed(2)})`;
          ctx.fill();
        });

        nodes.forEach((node, i) => {
          if (node.name === leader || node.status === "disconnected") return;
          const prog = ((t - i * 1.1 - 6.0) % DIST_PERIOD + DIST_PERIOD) % DIST_PERIOD / DIST_PERIOD;
          const px   = cx + (node.nx - cx) * prog;
          const py   = cy + (node.ny - cy) * prog;
          const a    = prog < 0.82 ? 0.80 : (1 - prog) / 0.18 * 0.80;
          ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245,166,35,${a.toFixed(2)})`;
          ctx.fill();
        });
      }

      /* ── Central block — the only permanent glow source ─────── */
      const bSize   = S * 0.23;
      const bx      = cx - bSize / 2;
      const by      = cy - bSize / 2;
      const bRad    = bSize * 0.18;
      const phColor = PHASE_COLORS[phase] ?? "#00C896";

      if (!prefersReducedMotion) {
        /* Pulses between rgba(0,200,150,0.20) and rgba(0,200,150,0.50), 2 s loop */
        const pulse = 0.20 + 0.30 * (0.5 + 0.5 * Math.sin(t * Math.PI));
        const gr    = ctx.createRadialGradient(cx, cy, 0, cx, cy, bSize * 0.90);
        gr.addColorStop(0, `rgba(0,200,150,${pulse.toFixed(2)})`);
        gr.addColorStop(1, "transparent");
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(cx, cy, bSize * 0.90, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = "#0A1F18";
      rr(ctx, bx, by, bSize, bSize, bRad);
      ctx.fill();
      ctx.strokeStyle = phColor;
      ctx.lineWidth   = 2;
      rr(ctx, bx, by, bSize, bSize, bRad);
      ctx.stroke();

      const fsMain = Math.max(13, bSize * 0.27);
      ctx.font         = `800 ${fsMain}px "Inter", system-ui, sans-serif`;
      ctx.fillStyle    = phColor;
      ctx.textAlign    = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(proposedBlock != null ? `#${proposedBlock}` : "—", cx, cy + fsMain * 0.22);

      const fsSub = Math.max(7, bSize * 0.13);
      ctx.font      = `500 ${fsSub}px "Inter", system-ui, sans-serif`;
      ctx.fillStyle = "#8A8A8A";
      ctx.fillText(phase, cx, cy + fsMain * 0.60);

      /* ── Node circles ────────────────────────────────────────── */
      nodes.forEach((node, i) => {
        const voted        = i < receivedVotes;
        const isLeaderNode = node.name === leader;
        const isOwnNode    = node.isOwn === true;
        const offline      = node.status === "disconnected";
        const glow         = nodeGlow[i];
        /* Leader larger; every other node (own, offline, validator) = valR */
        const nr = isLeaderNode ? leadR : valR;

        ctx.save();
        ctx.globalAlpha = offline ? 0.35 : 1;

        /* Alice: permanent, very subtle amber ambient glow */
        if (isOwnNode && !offline) {
          const gr = ctx.createRadialGradient(node.nx, node.ny, nr * 0.6, node.nx, node.ny, nr + 12);
          gr.addColorStop(0, "rgba(245,166,35,0.20)");
          gr.addColorStop(1, "transparent");
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(node.nx, node.ny, nr + 12, 0, Math.PI * 2); ctx.fill();
        }

        /* Transient glow — only while a dot is departing or arriving */
        if (glow > 0 && !offline) {
          const gc      = isOwnNode ? "245,166,35" : "0,200,150";
          const glowRad = nr + glow * 16;
          const gr = ctx.createRadialGradient(node.nx, node.ny, nr * 0.6, node.nx, node.ny, glowRad);
          gr.addColorStop(0, `rgba(${gc},${(glow * 0.45).toFixed(2)})`);
          gr.addColorStop(1, "transparent");
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(node.nx, node.ny, glowRad, 0, Math.PI * 2); ctx.fill();
        }

        /* Circle body */
        ctx.beginPath();
        ctx.arc(node.nx, node.ny, nr, 0, Math.PI * 2);
        ctx.fillStyle = isLeaderNode ? "#0A1F18" : "#111111";
        ctx.fill();

        /* Circle border */
        const strokeC = offline
          ? "#333333"
          : isLeaderNode ? "#00C896"
          : isOwnNode    ? "#F5A623"
          : "#2A2A2A";
        ctx.strokeStyle = strokeC;
        ctx.lineWidth   = (isLeaderNode || isOwnNode) ? 2 : 1;
        ctx.stroke();

        /* Node name — shifted up slightly when offline to make room for label */
        const nfs   = Math.max(6, nr * 0.34);
        const nameY = offline ? node.ny - nr * 0.22 : node.ny;
        ctx.font         = `${isLeaderNode ? 700 : 600} ${nfs}px "Inter", system-ui, sans-serif`;
        ctx.fillStyle    = offline
          ? "#5A5A5A"
          : isLeaderNode ? "#00C896"
          : voted        ? "#F0EDE8"
          : "#8A8A8A";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        /* Recorta el nombre hasta que entre en el circulo, sin importar cuantos nodos haya */
        const maxLabelWidth = nr * 1.6;
        let label = node.name.toUpperCase();
        while (label.length > 1 && ctx.measureText(label).width > maxLabelWidth) {
          label = label.slice(0, -1);
        }
        ctx.fillText(label, node.nx, nameY);

        ctx.restore();

        /* OFFLINE label drawn after restore — full opacity so it stays readable */
        if (offline) {
          ctx.font         = `500 9px "Inter", system-ui, sans-serif`;
          ctx.fillStyle    = "#E05252";
          ctx.textAlign    = "center";
          ctx.textBaseline = "top";
          ctx.fillText("OFFLINE", node.nx, node.ny + nr * 0.20);
        }
      });

      ctx.restore();
      tRef.current += 0.016; /* ~60 fps */
      rafRef.current = requestAnimationFrame(frame);
    }

    frame();

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [users, receivedVotes, leader, proposedBlock, phase,
      starsSmall, starsMed, starsLarge, prefersReducedMotion]);

  return (
    <div className="consensus-graph-wrap">
      <canvas
        ref={canvasRef}
        className="consensus-graph-canvas"
        aria-hidden="true"
        aria-label="Grafo de consenso"
      />
    </div>
  );
}

/* ── Vote bar ─────────────────────────────────────────────────── */
function VoteBar({ received, total }) {
  return (
    <div className="vote-bar-row">
      <div
        className="vote-bar"
        role="progressbar"
        aria-valuenow={received}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${received} de ${total} votos`}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`vote-seg${i < received ? " vote-seg--filled" : ""}`}
          />
        ))}
      </div>
      <span className="vote-fraction">
        {received}
        <span className="vote-fraction-denom">/{total}</span>
      </span>
    </div>
  );
}

/* ── ConsensusPanel ───────────────────────────────────────────── */
export default function ConsensusPanel({ consensus, users }) {
  const { round, leader, receivedVotes, totalVotes, phase, proposedBlock } =
    consensus;
  const phaseColor = PHASE_COLORS[phase] ?? "#00C896";

  return (
    <section
      className="consensus-panel panel--crt"
      aria-label="Ronda de consenso"
    >
      <div className="consensus-header">
        <span className="consensus-title">CONSENSO</span>
        <span className="consensus-phase" style={{ color: phaseColor }}>
          {phase}
        </span>
      </div>

      <div className="consensus-body">
        <ConsensusGraph
          users={users}
          receivedVotes={receivedVotes}
          leader={leader}
          proposedBlock={proposedBlock}
          phase={phase}
        />

        <div className="consensus-stats">
          <div className="consensus-stat">
            <span className="stat-label">RONDA</span>
            <span className="stat-value stat-value--round">
              {String(round).padStart(2, "0")}
            </span>
          </div>
          <span className="stat-divider" aria-hidden="true" />
          <div className="consensus-stat">
            <span className="stat-label">LÍDER</span>
            <span className="stat-value stat-value--leader">
              {leader.toUpperCase()}
            </span>
          </div>
          <span className="stat-divider" aria-hidden="true" />
          <div className="consensus-stat">
            <span className="stat-label">BLOQUE</span>
            <span className="stat-value stat-value--block">
              #{proposedBlock}
            </span>
          </div>
        </div>

        <VoteBar received={receivedVotes} total={totalVotes} />
      </div>
    </section>
  );
}
