import "./StatusSpine.css";

const PHASE_COLORS = {
  IDLE:       "var(--gray-700)",
  PROPOSING:  "var(--color-amber)",
  ACCEPTING:  "var(--color-primary)",
  COMMITTING: "var(--color-accent)",
  COMMITTED:  "var(--color-accent)",
  REJECTED:   "var(--color-secondary)",
};

export default function StatusSpine({ round, leader, votes, totalVotes, phase }) {
  const phaseColor = PHASE_COLORS[phase] ?? "var(--color-primary)";

  return (
    <div
      className="status-spine"
      role="status"
      aria-label="Estado global del consenso"
      aria-live="polite"
    >
      <span className="spine-chip">
        <span className="spine-key">ROUND</span>
        <span className="spine-val">{String(round).padStart(2, "0")}</span>
      </span>
      <span className="spine-sep" aria-hidden="true" />

      <span className="spine-chip">
        <span className="spine-key">LEADER</span>
        <span className="spine-val spine-val--leader">{leader.toUpperCase()}</span>
      </span>
      <span className="spine-sep" aria-hidden="true" />

      <span className="spine-chip">
        <span className="spine-key">VOTES</span>
        <span className="spine-val">
          {votes}
          <span className="spine-total">/{totalVotes}</span>
        </span>
      </span>
      <span className="spine-sep" aria-hidden="true" />

      <span className="spine-chip">
        <span className="spine-key">STATE</span>
        <span className="spine-val" style={{ color: phaseColor }}>
          {phase}
        </span>
      </span>
    </div>
  );
}
