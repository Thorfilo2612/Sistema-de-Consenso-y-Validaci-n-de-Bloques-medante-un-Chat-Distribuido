import "./ConnectionStatus.css";

const STATUS_CONFIG = {
  connecting: {
    label: "Conectando...",
    mod: "status--connecting",
    dotMod: "dot--connecting",
    ariaLabel: "Estado: conectando al servidor",
  },
  connected: {
    label: "Conectado",
    mod: "status--connected",
    dotMod: "dot--connected",
    ariaLabel: "Estado: conectado",
  },
  disconnected: {
    label: "Sin conexión",
    mod: "status--disconnected",
    dotMod: "dot--disconnected",
    ariaLabel: "Estado: desconectado",
  },
};

export default function ConnectionStatus({ status = "connecting" }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.connecting;

  return (
    <div
      className={`conn-status ${cfg.mod}`}
      role="status"
      aria-label={cfg.ariaLabel}
      aria-live="polite"
    >
      <span className={`conn-dot ${cfg.dotMod}`} aria-hidden="true" />
      <span className="conn-label">{cfg.label}</span>
    </div>
  );
}
