import { useEffect, useRef } from "react";
import Tag from "./ui/Tag.jsx";
import "./ChatPanel.css";

/* ── System message ───────────────────────────────────────────── */
function SystemMessage({ msg }) {
  return (
    <li className="msg msg--system" role="listitem">
      <span className="sys-line" aria-hidden="true" />
      <span className="sys-content">
        <time className="sys-time" dateTime={msg.timestamp}>
          {msg.timestamp}
        </time>
        <span className="sys-text">{msg.text}</span>
      </span>
      <span className="sys-line" aria-hidden="true" />
    </li>
  );
}

/* ── Broadcast message ────────────────────────────────────────── */
function BroadcastMessage({ msg }) {
  return (
    <li
      className={`msg msg--broadcast anim-slide-in-right${msg.own ? " msg--own" : ""}`}
      role="listitem"
    >
      <header className="msg-header">
        <span className="msg-from">{msg.from}</span>
        <time
          className="msg-timestamp"
          dateTime={msg.timestamp}
          aria-label={`Enviado a las ${msg.timestamp}`}
        >
          {msg.timestamp}
        </time>
      </header>
      <p className="msg-body">{msg.text}</p>
    </li>
  );
}

/* ── Private message ──────────────────────────────────────────── */
function PrivateMessage({ msg }) {
  return (
    <li
      className={`msg msg--private anim-slide-in-up${msg.own ? " msg--own" : ""}`}
      role="listitem"
    >
      <header className="msg-header">
        <Tag variant="private">PRIV</Tag>
        <span className="msg-from msg-from--private">{msg.from}</span>
        {msg.to && (
          <>
            <span className="msg-arrow" aria-hidden="true">→</span>
            <span className="msg-to">{msg.to}</span>
          </>
        )}
        <time
          className="msg-timestamp"
          dateTime={msg.timestamp}
          aria-label={`Enviado a las ${msg.timestamp}`}
        >
          {msg.timestamp}
        </time>
      </header>
      <p className="msg-body">{msg.text}</p>
    </li>
  );
}

/* ── Chat Panel ───────────────────────────────────────────────── */
export default function ChatPanel({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section
      className="chat-panel"
      aria-label="Historial de mensajes"
    >
      <ul
        className="msg-list"
        role="list"
        aria-live="polite"
        aria-label="Mensajes"
        aria-relevant="additions"
      >
        {messages.map((msg) => {
          switch (msg.type) {
            case "system":
              return <SystemMessage key={msg.id} msg={msg} />;
            case "private":
              return <PrivateMessage key={msg.id} msg={msg} />;
            default:
              return <BroadcastMessage key={msg.id} msg={msg} />;
          }
        })}
        <li ref={bottomRef} aria-hidden="true" style={{ height: 0 }} />
      </ul>
    </section>
  );
}
