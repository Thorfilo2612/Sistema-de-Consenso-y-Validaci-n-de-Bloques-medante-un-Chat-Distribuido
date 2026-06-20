import "./UsersPanel.css";

const DOT_CONFIG = {
  connected:    { cls: "dot--connected",    label: "Conectado" },
  idle:         { cls: "dot--idle",         label: "Inactivo" },
  disconnected: { cls: "dot--disconnected", label: "Desconectado" },
};

function UserRow({ user, isOwn, index }) {
  const dot = DOT_CONFIG[user.status] ?? DOT_CONFIG.connected;

  return (
    <li
      className={`user-row anim-slide-in-right${isOwn ? " user-row--own" : ""}`}
      style={{ animationDelay: `${index * 55}ms` }}
      title={`${user.name} · unido: ${user.joinedAt}`}
    >
      <span
        className={`user-dot ${dot.cls}`}
        role="img"
        aria-label={dot.label}
      />
      <div className="user-info">
        <span className="user-name">
          {user.name}
          {isOwn && (
            <span className="own-badge" aria-label="tu nodo">
              you
            </span>
          )}
        </span>
        <time className="user-joined" dateTime={user.joinedAt}>
          {user.joinedAt}
        </time>
      </div>
    </li>
  );
}

export default function UsersPanel({ users, currentUser, open }) {
  const connected = users.filter((u) => u.status !== "disconnected").length;

  return (
    <aside
      id="users-panel"
      className={`users-panel${open ? " users-panel--open" : ""}`}
      aria-label="Nodos en la red"
      aria-hidden={!open}
      tabIndex={open ? undefined : -1}
    >
      <div className="panel-header">
        <span className="panel-title">NODOS</span>
        <span
          className="panel-count"
          aria-label={`${connected} nodos activos de ${users.length}`}
        >
          {connected}/{users.length}
        </span>
      </div>

      <ul
        className="user-list"
        role="list"
        aria-label="Lista de nodos"
      >
        {users.map((user, i) => (
          <UserRow
            key={user.id}
            user={user}
            isOwn={user.name === currentUser}
            index={i}
          />
        ))}
      </ul>

      <div className="panel-footer">
        <span className="panel-footer-label">red local</span>
        <span className="panel-footer-signal" aria-hidden="true">▪▪▪▪▪</span>
      </div>
    </aside>
  );
}
