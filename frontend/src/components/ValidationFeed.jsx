import { useEffect, useRef, useMemo } from "react";
import "./ValidationFeed.css";

/* ── Event type config ────────────────────────────────────────── */
const EVENT_CFG = {
  PROPOSE:   { prefix: "PROPOSE",  color: "var(--color-primary)",   cls: "entry--propose"   },
  ACCEPT:    { prefix: "ACCEPT",   color: "var(--color-accent)",    cls: "entry--accept"    },
  COMMIT:    { prefix: "COMMIT",   color: "var(--color-accent)",    cls: "entry--commit"    },
  COMMITTED: { prefix: "DONE",    color: "var(--color-accent)",    cls: "entry--committed" },
  REJECT:    { prefix: "REJECT",  color: "var(--color-secondary)", cls: "entry--reject"    },
  REJECTED:  { prefix: "REJECTED", color: "var(--color-secondary)", cls: "entry--reject"    },
  broadcast: { prefix: "BCAST",   color: "var(--gray-700)",        cls: "entry--broadcast" },
  private:   { prefix: "PRIV",    color: "var(--color-secondary)", cls: "entry--private"   },
  system:    { prefix: "SYS",     color: "var(--gray-600)",        cls: "entry--system"    },
};

function eventText(e) {
  if (e.blockId != null) {
    const detail = e.detail ? ` ${e.detail}` : "";
    if (e.type === "REJECTED") return `blk#${e.blockId} ${e.hash.slice(0, 8)} rechazado por la red${detail}`;
    if (e.node) return `${e.node} -> blk#${e.blockId} ${e.hash.slice(0, 8)}${detail}`;
    return `blk#${e.blockId} ${e.hash.slice(0, 8)} confirmado${detail}`;
  }
  return e.text ?? "";
}

function msgText(m) {
  if (m.type === "system")  return m.text;
  if (m.type === "private") return `${m.from} -> ${m.to ?? "?"}: ${m.text}`;
  return `${m.from}: ${m.text}`;
}

/* ── Single feed entry ────────────────────────────────────────── */
function FeedEntry({ entry, index }) {
  const cfg = EVENT_CFG[entry.type] ?? EVENT_CFG.system;
  return (
    <div
      className={`feed-entry anim-feed-entry ${cfg.cls}`}
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <div className="entry-meta">
        <span className="entry-time">{entry.timestamp}</span>
        <span className="entry-prefix" style={{ color: cfg.color }}>
          [{cfg.prefix}]
        </span>
      </div>
      <span className="entry-text">{entry.text}</span>
    </div>
  );
}

/* ── ValidationFeed panel ─────────────────────────────────────── */
export default function ValidationFeed({ validationEvents, messages }) {
  const bottomRef = useRef(null);

  const feed = useMemo(() => {
    const evs = validationEvents.map((e) => ({
      id:        `e-${e.id}`,
      type:      e.type,
      timestamp: e.timestamp,
      text:      eventText(e),
    }));
    const msgs = messages.map((m) => ({
      id:        `m-${m.id}`,
      type:      m.type,
      timestamp: m.timestamp,
      text:      msgText(m),
    }));
    return [...evs, ...msgs].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );
  }, [validationEvents, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feed.length]);

  return (
    <aside
      className="validation-feed panel--crt"
      aria-label="Registro de actividad de la red"
    >
      <div className="feed-header">
        <span className="feed-title">ACTIVIDAD</span>
        <span className="feed-count">{feed.length} eventos</span>
      </div>

      <div
        className="feed-scroll"
        role="log"
        aria-live="polite"
        aria-label="Eventos de validacion y mensajes"
        aria-relevant="additions"
      >
        {feed.map((entry, i) => (
          <FeedEntry key={entry.id} entry={entry} index={i} />
        ))}
        <div ref={bottomRef} style={{ height: 0 }} aria-hidden="true" />
      </div>
    </aside>
  );
}
