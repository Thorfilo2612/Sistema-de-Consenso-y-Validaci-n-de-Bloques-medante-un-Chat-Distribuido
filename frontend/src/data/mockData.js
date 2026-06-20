export const CURRENT_USER = "alice";
export const CONNECTION_STATUS = "connected";

/* ── Consensus state ──────────────────────────────────────────── */
export const mockConsensus = {
  round:          4,
  leader:         "bob",
  totalVotes:     4,   /* active nodes */
  receivedVotes:  3,   /* alice, bob, carol voted ACCEPT */
  phase:          "ACCEPTING", /* PROPOSING | ACCEPTING | COMMITTING | COMMITTED */
  proposedBlock:  44,
};

/* ── Blockchain ───────────────────────────────────────────────── */
export const mockBlocks = [
  { id: 39, hash: "0x9a1b2c3d", prevHash: "0x8z9y0x1w", timestamp: "12:30:12", status: "validated",   proposer: "alice" },
  { id: 40, hash: "0xd4e5f67g", prevHash: "0x9a1b2c3d", timestamp: "12:31:45", status: "validated",   proposer: "bob"   },
  { id: 41, hash: "0xa4f2c8e9", prevHash: "0xd4e5f67g", timestamp: "12:33:02", status: "validated",   proposer: "carol" },
  { id: 42, hash: "0xb7e3d1a2", prevHash: "0xa4f2c8e9", timestamp: "12:34:30", status: "validated",   proposer: "alice" },
  { id: 43, hash: "0xc9f4e2b1", prevHash: "0xb7e3d1a2", timestamp: "12:35:55", status: "validated",   proposer: "bob"   },
  { id: 44, hash: "0xe1f2a3b4", prevHash: "0xc9f4e2b1", timestamp: "12:36:30", status: "propagating", proposer: "dave"  },
  { id: 45, hash: "0x........", prevHash: "0xe1f2a3b4", timestamp: "--:--:--",  status: "pending",     proposer: null    },
];

/* ── Validation events ────────────────────────────────────────── */
export const mockValidationEvents = [
  { id: 1, type: "COMMITTED", node: null,    blockId: 43, hash: "0xc9f4e2b1", timestamp: "12:35:58", detail: null },
  { id: 2, type: "PROPOSE",   node: "dave",  blockId: 44, hash: "0xe1f2a3b4", timestamp: "12:36:30", detail: null },
  { id: 3, type: "ACCEPT",    node: "alice", blockId: 44, hash: "0xe1f2a3b4", timestamp: "12:36:31", detail: null },
  { id: 4, type: "ACCEPT",    node: "bob",   blockId: 44, hash: "0xe1f2a3b4", timestamp: "12:36:32", detail: null },
  { id: 5, type: "REJECT",    node: "eve",   blockId: 44, hash: "0xe1f2a3b4", timestamp: "12:36:33", detail: "node offline" },
  { id: 6, type: "ACCEPT",    node: "carol", blockId: 44, hash: "0xe1f2a3b4", timestamp: "12:36:34", detail: null },
];

/* ── Node health / metrics ────────────────────────────────────── */
export const mockNodeHealth = {
  alice: { health: 100, latency: 12,   votes: 47 },
  bob:   { health: 92,  latency: 18,   votes: 44 },
  carol: { health: 78,  latency: 34,   votes: 39 },
  dave:  { health: 55,  latency: 67,   votes: 12 },
  eve:   { health: 0,   latency: null, votes:  3 },
};

export const mockUsers = [
  { id: 1, name: "alice",  status: "connected",    joinedAt: "12:34:56", isOwn: true  },
  { id: 2, name: "bob",    status: "connected",    joinedAt: "12:35:12", isOwn: false },
  { id: 3, name: "carol",  status: "connected",    joinedAt: "12:35:45", isOwn: false },
  { id: 4, name: "dave",   status: "idle",         joinedAt: "12:36:10", isOwn: false },
  { id: 5, name: "eve",    status: "disconnected", joinedAt: "12:30:00", isOwn: false },
];

export const mockMessages = [
  {
    id: 1,
    type: "system",
    text: "Conectado como alice · Nodo activo en la red",
    timestamp: "12:34:56",
  },
  {
    id: 2,
    type: "system",
    text: "4 nodos detectados · Consenso disponible",
    timestamp: "12:34:57",
  },
  {
    id: 3,
    type: "broadcast",
    from: "alice",
    text: "Iniciando sesión de consenso distribuido.",
    timestamp: "12:34:58",
    own: true,
  },
  {
    id: 4,
    type: "broadcast",
    from: "bob",
    text: "Confirmado. Hash bloque #41: 0xa4f2c8e9b3d7",
    timestamp: "12:35:01",
  },
  {
    id: 5,
    type: "private",
    from: "carol",
    to: "alice",
    text: "¿Verificaste el bloque 42? Hay una discrepancia en mi cadena.",
    timestamp: "12:35:12",
  },
  {
    id: 6,
    type: "broadcast",
    from: "alice",
    text: "Bloque 42 validado correctamente. Propagando a la red...",
    timestamp: "12:35:20",
    own: true,
  },
  {
    id: 7,
    type: "broadcast",
    from: "bob",
    text: "Recibido y verificado. Actualizando cadena local.",
    timestamp: "12:35:28",
  },
  {
    id: 8,
    type: "broadcast",
    from: "carol",
    text: "Consenso alcanzado en nodos alice, bob, carol.",
    timestamp: "12:35:40",
  },
  {
    id: 9,
    type: "system",
    text: "dave se unió a la red · Sincronizando...",
    timestamp: "12:36:10",
  },
  {
    id: 10,
    type: "broadcast",
    from: "dave",
    text: "Hola red. Descargando cadena desde bloque #0.",
    timestamp: "12:36:15",
  },
  {
    id: 11,
    type: "broadcast",
    from: "carol",
    text: "Bienvenido dave. Bloque actual: #42 · Hash: 0xa4f2c8",
    timestamp: "12:36:22",
  },
  {
    id: 12,
    type: "broadcast",
    from: "bob",
    text: "Proponiendo bloque #43 → hash: 0xb7e3d1a2f6c9",
    timestamp: "12:36:30",
  },
  {
    id: 13,
    type: "private",
    from: "alice",
    to: "carol",
    text: "Consenso alcanzado en todos los nodos ✓",
    timestamp: "12:36:45",
    own: true,
  },
  {
    id: 14,
    type: "broadcast",
    from: "dave",
    text: "Sincronización completa. Listo para participar en consenso.",
    timestamp: "12:36:52",
  },
];
