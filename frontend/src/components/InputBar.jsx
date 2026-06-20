import { useState, useRef, useCallback, useId } from "react";
import "./InputBar.css";

const COMMANDS = [
  { cmd: "/broadcast", hint: "a todos" },
  { cmd: "/w <user>",  hint: "privado" },
  { cmd: "/list",      hint: "nodos" },
  { cmd: "/quit",      hint: "salir" },
];

function getCommandHint(value) {
  if (!value.startsWith("/")) return null;
  if (value.startsWith("/w "))         return "→ mensaje privado";
  if (value.startsWith("/broadcast ")) return "→ difusión a la red";
  if (value.startsWith("/list"))       return "→ listar nodos activos";
  if (value.startsWith("/quit"))       return "→ desconectarse";
  return "→ comando";
}

export default function InputBar({ onSend, connectionStatus }) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState("idle"); /* idle | sending | sent */
  const inputRef = useRef(null);
  const inputId = useId();

  const isDisabled =
    connectionStatus === "disconnected" || connectionStatus === "connecting";
  const canSend = value.trim().length > 0 && !isDisabled && phase === "idle";
  const hint = getCommandHint(value);
  const isCommand = value.startsWith("/");

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!canSend) return;

      const text = value.trim();
      setPhase("sending");
      setValue("");

      await new Promise((r) => setTimeout(r, 160));

      onSend(text);
      setPhase("sent");
      inputRef.current?.focus();

      setTimeout(() => setPhase("idle"), 1600);
    },
    [canSend, value, onSend]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <form
      className="input-bar"
      onSubmit={handleSubmit}
      aria-label="Enviar mensaje o comando"
      noValidate
    >
      {/* Main input row */}
      <div className="input-row">
        <label
          htmlFor={inputId}
          className={`input-mode-badge${isCommand ? " badge--cmd" : ""}`}
          aria-label={isCommand ? "Modo comando" : "Modo mensaje"}
        >
          {isCommand ? "CMD" : "MSG"}
        </label>

        <div className="input-field-wrap">
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            className={`msg-input${isCommand ? " msg-input--cmd" : ""}${
              phase === "sending" ? " msg-input--sending" : ""
            }`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isDisabled ? "Sin conexión al servidor..." : "Escribe un mensaje o comando..."
            }
            disabled={isDisabled}
            autoComplete="off"
            spellCheck="false"
            maxLength={500}
            aria-label="Campo de mensaje"
            aria-describedby={hint ? "cmd-hint" : undefined}
          />
          {hint && (
            <span
              id="cmd-hint"
              className="input-cmd-hint"
              aria-live="polite"
            >
              {hint}
            </span>
          )}
        </div>

        <button
          type="submit"
          className={`send-btn${phase === "sent" ? " send-btn--sent" : ""}${
            phase === "sending" ? " send-btn--sending" : ""
          }`}
          disabled={!canSend && phase === "idle"}
          aria-label={
            phase === "sending"
              ? "Enviando..."
              : phase === "sent"
              ? "Enviado"
              : "Enviar mensaje"
          }
          aria-busy={phase === "sending"}
        >
          {phase === "sending" ? (
            <span className="btn-spinner" aria-hidden="true" />
          ) : phase === "sent" ? (
            <span className="btn-check anim-checkmark" aria-hidden="true">
              ✓
            </span>
          ) : (
            <span className="btn-label" aria-hidden="true">
              SEND
            </span>
          )}
        </button>
      </div>

      {/* Command shortcuts row */}
      <div className="shortcuts-row" aria-label="Comandos disponibles" role="note">
        {COMMANDS.map((c) => (
          <span key={c.cmd} className="shortcut">
            <code className="shortcut-cmd">{c.cmd}</code>
            <span className="shortcut-hint">{c.hint}</span>
          </span>
        ))}
        <span className="shortcut shortcut--enter">
          <code className="shortcut-cmd">↵ Enter</code>
          <span className="shortcut-hint">enviar</span>
        </span>
      </div>
    </form>
  );
}
