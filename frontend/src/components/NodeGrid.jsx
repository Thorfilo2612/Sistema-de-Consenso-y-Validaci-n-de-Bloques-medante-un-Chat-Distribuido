import "./NodeGrid.css";

/* ── 16×16 pixel-art terminal sprite ─────────────────────────── */
function PixelSprite({ status, isOwn }) {
  const fill =
    isOwn             ? "var(--color-accent)"   :
    status === "connected"    ? "var(--color-primary)"  :
    status === "idle"         ? "var(--color-amber)"    :
                                "var(--gray-500)";

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 8 8"
      className={`node-sprite${isOwn ? " node-sprite--own" : ""}`}
      fill={fill}
      aria-hidden="true"
      style={{ imageRendering: "pixelated" }}
    >
      {/* Monitor frame */}
      <rect x="1" y="0" width="6" height="1" />
      <rect x="0" y="1" width="1" height="4" />
      <rect x="7" y="1" width="1" height="4" />
      <rect x="1" y="5" width="6" height="1" />
      {/* Stand */}
      <rect x="3" y="6" width="2" height="1" />
      {/* Base */}
      <rect x="2" y="7" width="4" height="1" />
      {/* Screen content */}
      <rect x="2" y="2" width="4" height="1" opacity="0.75" />
      <rect x="2" y="3" width="2" height="1" opacity="0.45" />
      <rect x="2" y="4" width="3" height="1" opacity="0.55" />
    </svg>
  );
}

/* ── Individual node row ──────────────────────────────────────── */
function NodeRow({ user, isOwn, index, health }) {
  const defaultHealth = user.status === "disconnected" ? 0 : user.status === "idle" ? 50 : 100;
  const h = health ?? { health: defaultHealth, latency: null, votes: 0 };
  const healthPct = Math.max(0, Math.min(100, h.health));
  const healthColor =
    healthPct > 66 ? "var(--color-accent)"    :
    healthPct > 33 ? "var(--color-amber)"     :
                     "var(--color-secondary)";

  return (
    <li
      className={`node-row anim-slide-in-right${isOwn ? " node-row--own" : ""}`}
      style={{ animationDelay: `${index * 60}ms` }}
      title={`${user.name} · latencia: ${h.latency ?? "offline"}ms · ${h.votes} votos`}
    >
      <div className="node-sprite-wrap">
        <PixelSprite status={user.status} isOwn={isOwn} />
      </div>

      <div className="node-info">
        <div className="node-name-row">
          <span className="node-name">{user.name}</span>
          {isOwn && (
            <span className="own-badge" aria-label="tu nodo">
              you
            </span>
          )}
        </div>

        <div
          className="node-health-bar"
          role="progressbar"
          aria-valuenow={healthPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Salud del nodo: ${healthPct}%`}
        >
          <div
            className="node-health-fill"
            style={{ width: `${healthPct}%`, backgroundColor: healthColor }}
          />
        </div>

        <div className="node-meta">
          {user.status === "disconnected" ? (
            <span className="node-latency node-latency--offline">OFFLINE</span>
          ) : h.latency !== null ? (
            <span className="node-latency">{h.latency}ms</span>
          ) : (
            <span className="node-latency">—</span>
          )}
          <span className="node-votes">{h.votes}v</span>
        </div>
      </div>

      <span
        className={`node-status-dot dot--${user.status}`}
        role="img"
        aria-label={user.status}
      />
    </li>
  );
}

/* ── NodeGrid panel ───────────────────────────────────────────── */
export default function NodeGrid({ users, currentUser, nodeHealth }) {
  const connected = users.filter((u) => u.status !== "disconnected").length;

  return (
    <aside className="node-grid panel--crt" aria-label="Nodos en la red">
      <div className="node-grid-header">
        <span className="panel-title">NODOS</span>
        <span
          className="panel-count"
          aria-label={`${connected} de ${users.length} nodos activos`}
        >
          {connected}/{users.length}
        </span>
      </div>

      <ul className="node-list" role="list" aria-label="Lista de nodos activos">
        {users.map((user, i) => (
          <NodeRow
            key={user.id}
            user={user}
            isOwn={user.name === currentUser}
            index={i}
            health={nodeHealth[user.name]}
          />
        ))}
      </ul>

      <div className="node-grid-footer">
        <span className="footer-signal" aria-hidden="true">▪▪▪▪▪</span>
        <span className="footer-label">red local</span>
      </div>
    </aside>
  );
}
