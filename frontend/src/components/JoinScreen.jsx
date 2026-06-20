import { useState, useId } from "react";
import Button from "./ui/Button.jsx";
import "./JoinScreen.css";

export default function JoinScreen({ onJoin, error, connecting }) {
  const [value, setValue] = useState("");
  const inputId = useId();

  const handleSubmit = (e) => {
    e.preventDefault();
    const nombre = value.trim();
    if (!nombre) return;
    onJoin(nombre);
  };

  return (
    <div className="join-screen">
      <form className="join-card" onSubmit={handleSubmit}>
        <div className="join-brand">
          <span className="join-brand-name">NETWORK</span>
          <span className="join-brand-dot" aria-hidden="true">.</span>
          <span className="join-brand-sub">MONITOR</span>
        </div>
        <p className="join-subtitle">
          Conectate a la red de consenso distribuido como un nodo mas.
        </p>

        <label className="join-label" htmlFor={inputId}>
          Nombre de nodo
        </label>
        <input
          id={inputId}
          className="join-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ej. alice"
          autoComplete="off"
          autoFocus
          maxLength={32}
        />

        {error && (
          <p className="join-error" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="md" disabled={!value.trim() || connecting}>
          {connecting ? "Conectando..." : "Conectar"}
        </Button>

        <p className="join-hint">
          Requiere <code>servidor.py</code> y <code>bridge.py</code> corriendo en localhost.
        </p>
      </form>
    </div>
  );
}
