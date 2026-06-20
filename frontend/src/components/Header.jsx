import { useState, useEffect } from "react";
import ConnectionStatus from "./ConnectionStatus.jsx";
import "./Header.css";

function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("es-VE", { hour12: false })
  );
  useEffect(() => {
    const id = setInterval(() =>
      setTime(new Date().toLocaleTimeString("es-VE", { hour12: false })), 1000
    );
    return () => clearInterval(id);
  }, []);
  return (
    <time className="header-clock" aria-label="Hora del sistema">{time}</time>
  );
}

export default function Header({ currentUser, connectionStatus, onToggleSidebar, sidebarOpen }) {
  return (
    <header className="app-header" role="banner">
      <div className="header-left">
        <button
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Ocultar nodos" : "Mostrar nodos"}
          aria-expanded={sidebarOpen}
        >
          <span className="toggle-bars" aria-hidden="true">
            <span /><span /><span />
          </span>
        </button>

        <div className="header-brand" aria-label="Network Monitor">
          <span className="brand-name">NETWORK</span>
          <span className="brand-dot" aria-hidden="true">.</span>
          <span className="brand-sub">MONITOR</span>
        </div>
      </div>

      <div className="header-center">
        <div className="node-chip" aria-label={`Nodo: ${currentUser}`}>
          <span className="node-chip-label">NODE</span>
          <span className="node-chip-name">{currentUser.toUpperCase()}</span>
          <span className="node-chip-bar" aria-hidden="true" />
        </div>
      </div>

      <div className="header-right">
        <ConnectionStatus status={connectionStatus} />
        <span className="header-divider" aria-hidden="true" />
        <LiveClock />
      </div>
    </header>
  );
}
