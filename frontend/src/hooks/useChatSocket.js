import { useState, useRef, useCallback, useEffect } from "react";

const WS_PORT = 8765;
const LIST_POLL_MS = 4000;

function nowTime() {
  return new Date().toLocaleTimeString("es-VE", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Interpreta los mensajes "/broadcast" especiales que monitor.py y
 * validador.py usan como protocolo de consenso (BLOQUE_OK#<id>,
 * CONSENSO_ALCANZADO#<id>, etc). Cualquier otro broadcast es chat normal.
 */
function parseAnuncio(data) {
  let m;
  if ((m = /^BLOQUE_PROPUESTO#(\d+)#(.+)$/.exec(data))) {
    return { kind: "PROPOSE", id: Number(m[1]), hash: m[2] };
  }
  if ((m = /^BLOQUE_OK#(\d+)$/.exec(data))) {
    return { kind: "ACCEPT", id: Number(m[1]) };
  }
  if ((m = /^BLOQUE_INVALIDO#(\d+)$/.exec(data))) {
    return { kind: "REJECT", id: Number(m[1]) };
  }
  if ((m = /^CONSENSO_ALCANZADO#(\d+)$/.exec(data))) {
    return { kind: "COMMITTED", id: Number(m[1]) };
  }
  if ((m = /^BLOQUE_RECHAZADO#(\d+)$/.exec(data))) {
    return { kind: "REJECTED", id: Number(m[1]) };
  }
  return null;
}

const EMPTY_CONSENSUS = {
  round: 0,
  leader: "Monitor",
  totalVotes: 0,
  receivedVotes: 0,
  phase: "IDLE",
  proposedBlock: null,
};

/**
 * Hook real (no-mock) que conecta al puente WebSocket<->TCP (bridge.py) y
 * traduce el protocolo de chat real del proyecto (servidor.py / monitor.py
 * / validador.py) al mismo shape que useMockData, para que los componentes
 * del dashboard no necesiten saber si los datos son reales o simulados.
 */
export function useChatSocket(name, sessionKey) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [joinError, setJoinError] = useState(null);
  const [consensus, setConsensus] = useState(EMPTY_CONSENSUS);
  const [blocks, setBlocks] = useState([]);
  const [validationEvents, setValidationEvents] = useState([]);
  const [nodeHealth, setNodeHealth] = useState({});

  const wsRef = useRef(null);
  const idRef = useRef(0);
  const blockHashRef = useRef({}); // id -> hash, para enriquecer eventos de voto/commit
  const registeredRef = useRef(false);
  const listManualRef = useRef(false); // true si el ultimo /list fue pedido a mano (no el polling automatico)

  const nextId = useCallback(() => {
    idRef.current += 1;
    return idRef.current;
  }, []);

  const appendMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: nextId(), ...msg }]);
  }, [nextId]);

  const appendSystem = useCallback((text) => {
    appendMessage({ type: "system", text, timestamp: nowTime() });
  }, [appendMessage]);

  const appendEvent = useCallback((evt) => {
    setValidationEvents((prev) => [...prev, { id: nextId(), ...evt }]);
  }, [nextId]);

  const registrarVoto = useCallback((nombre) => {
    setNodeHealth((prev) => ({
      ...prev,
      [nombre]: {
        ...(prev[nombre] ?? { health: 100, latency: null, votes: 0 }),
        votes: (prev[nombre]?.votes ?? 0) + 1,
      },
    }));
  }, []);

  const manejarAnuncio = useCallback((anuncio, origen) => {
    const ts = nowTime();
    const hash = blockHashRef.current[anuncio.id] ?? "0".repeat(8);

    switch (anuncio.kind) {
      case "PROPOSE":
        blockHashRef.current[anuncio.id] = anuncio.hash;
        setConsensus({
          round: anuncio.id,
          leader: "Monitor",
          totalVotes: 0,
          receivedVotes: 0,
          phase: "PROPOSING",
          proposedBlock: anuncio.id,
        });
        setBlocks((prev) =>
          prev.some((b) => b.id === anuncio.id)
            ? prev
            : [
                ...prev,
                {
                  id: anuncio.id,
                  hash: anuncio.hash,
                  prevHash: prev.length ? prev[prev.length - 1].hash : "0",
                  timestamp: ts,
                  status: "propagating",
                  proposer: "Monitor",
                },
              ]
        );
        appendEvent({ type: "PROPOSE", node: "Monitor", blockId: anuncio.id, hash: anuncio.hash, timestamp: ts, detail: null });
        break;

      case "ACCEPT":
      case "REJECT":
        setConsensus((prev) => {
          if (prev.proposedBlock !== anuncio.id) return prev;
          const received = prev.receivedVotes + 1;
          return { ...prev, receivedVotes: received, totalVotes: Math.max(prev.totalVotes, received), phase: "ACCEPTING" };
        });
        registrarVoto(origen);
        appendEvent({
          type: anuncio.kind,
          node: origen,
          blockId: anuncio.id,
          hash,
          timestamp: ts,
          detail: null,
        });
        break;

      case "COMMITTED":
        setConsensus((prev) => ({ ...prev, phase: "COMMITTED", totalVotes: prev.receivedVotes || prev.totalVotes }));
        setBlocks((prev) => prev.map((b) => (b.id === anuncio.id ? { ...b, status: "validated" } : b)));
        appendEvent({ type: "COMMITTED", node: null, blockId: anuncio.id, hash, timestamp: ts, detail: null });
        break;

      case "REJECTED":
        setConsensus((prev) => ({ ...prev, phase: "REJECTED", totalVotes: prev.receivedVotes || prev.totalVotes }));
        setBlocks((prev) => prev.map((b) => (b.id === anuncio.id ? { ...b, status: "forked" } : b)));
        appendEvent({ type: "REJECTED", node: null, blockId: anuncio.id, hash, timestamp: ts, detail: null });
        break;

      default:
        break;
    }
  }, [appendEvent, registrarVoto]);

  const actualizarUsuarios = useCallback((nombres) => {
    setUsers((prev) => {
      const previos = Object.fromEntries(prev.map((u) => [u.name, u]));
      const ts = nowTime();
      const conocidos = nombres.map((n) =>
        previos[n]
          ? { ...previos[n], status: "connected" }
          : { id: n, name: n, status: "connected", joinedAt: ts, isOwn: n === name }
      );
      const idosSet = new Set(nombres);
      const desconectados = prev
        .filter((u) => !idosSet.has(u.name))
        .map((u) => ({ ...u, status: "disconnected" }));
      return [...conocidos, ...desconectados];
    });
  }, [name]);

  useEffect(() => {
    if (!name) return;

    let activo = true;
    registeredRef.current = false;
    setConnectionStatus("connecting");
    setJoinError(null);

    const ws = new WebSocket(`ws://${window.location.hostname}:${WS_PORT}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ cmd: "register", from: name }));
    };

    ws.onmessage = (event) => {
      if (!activo) return;
      let m;
      try {
        m = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (m.cmd) {
        case "welcome":
          registeredRef.current = true;
          setConnectionStatus("connected");
          appendSystem(`Conectado como ${name} · Nodo activo en la red`);
          ws.send(JSON.stringify({ cmd: "list", from: name }));
          break;

        case "error":
          if (!registeredRef.current) {
            setJoinError(String(m.data ?? "No se pudo registrar el nombre"));
            setConnectionStatus("disconnected");
            ws.close();
          } else {
            appendSystem(`[ERROR] ${m.data ?? ""}`);
          }
          break;

        case "broadcast": {
          const anuncio = parseAnuncio(String(m.data ?? ""));
          if (anuncio) {
            manejarAnuncio(anuncio, m.from);
          } else {
            appendMessage({ type: "broadcast", from: m.from, text: m.data, timestamp: nowTime(), own: m.from === name });
          }
          break;
        }

        case "w":
          appendMessage({ type: "private", from: m.from, to: m.to, text: m.data, timestamp: nowTime(), own: m.from === name });
          break;

        case "list": {
          const nombres = Array.isArray(m.data) ? m.data : [];
          actualizarUsuarios(nombres);
          if (listManualRef.current) {
            listManualRef.current = false;
            appendSystem(`Nodos en red: ${nombres.join(", ") || "(ninguno)"}`);
          }
          break;
        }

        default:
          break;
      }
    };

    ws.onclose = () => {
      if (!activo) return;
      setConnectionStatus("disconnected");
      appendSystem("Conexion cerrada por el servidor");
    };

    ws.onerror = () => {
      if (!activo) return;
      setConnectionStatus("disconnected");
    };

    const pollId = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && registeredRef.current) {
        ws.send(JSON.stringify({ cmd: "list", from: name }));
      }
    }, LIST_POLL_MS);

    return () => {
      activo = false;
      clearInterval(pollId);
      ws.close();
    };
  }, [name, sessionKey, appendMessage, appendSystem, manejarAnuncio, actualizarUsuarios]);

  const sendMessage = useCallback((text) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const trimmed = text.trim();
    if (!trimmed) return;
    const ts = nowTime();

    if (trimmed.startsWith("/w ")) {
      const resto = trimmed.slice(3).trim();
      const idx = resto.search(/\s/);
      if (idx === -1) return;
      const to = resto.slice(0, idx);
      const body = resto.slice(idx + 1).trim();
      if (!to || !body) return;
      appendMessage({ type: "private", from: name, to, text: body, timestamp: ts, own: true });
      ws.send(JSON.stringify({ cmd: "w", from: name, to, data: body }));
    } else if (trimmed === "/list") {
      listManualRef.current = true;
      ws.send(JSON.stringify({ cmd: "list", from: name }));
    } else if (trimmed === "/quit") {
      appendSystem("Desconectando de la red...");
      ws.send(JSON.stringify({ cmd: "quit", from: name }));
    } else {
      const body = trimmed.startsWith("/broadcast ") ? trimmed.slice(11).trim() : trimmed;
      if (!body) return;
      appendMessage({ type: "broadcast", from: name, text: body, timestamp: ts, own: true });
      ws.send(JSON.stringify({ cmd: "broadcast", from: name, data: body }));
    }
  }, [name, appendMessage, appendSystem]);

  return {
    messages,
    users,
    currentUser: name,
    connectionStatus,
    joinError,
    sendMessage,
    consensus,
    blocks,
    validationEvents,
    nodeHealth,
  };
}
