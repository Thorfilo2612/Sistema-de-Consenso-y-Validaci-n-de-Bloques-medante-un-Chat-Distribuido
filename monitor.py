import socket
import json
import sys
import threading
import time
from bloque import Bloque

# La consola de Windows usa cp1252 por defecto, que no soporta los emojis
# usados en los prints (✓, ✅, ❌, etc.) y crashea con UnicodeEncodeError.
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DIFICULTAD_RED = 1     # Debe coincidir con la dificultad del Ledger de los validadores
TIMEOUT_VOTOS = 15.0   # segundos maximos de espera por los votos de un bloque

class Monitor:
    def __init__(self):
        self.socket = None
        self.nombre = "Monitor"
        self.bloques = {}
        self.validadores = []
        self.blockchain = []
        self.votos = {}
        self.lock = threading.Lock()

    def conectar_servidor(self):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect(('localhost', 5000))
        self.socket.sendall(json.dumps({"cmd": "register", "from": self.nombre}).encode() + b'\n')
        print(f"✓ Monitor conectado como '{self.nombre}'")
        threading.Thread(target=self._escuchar_mensajes, daemon=True).start()
    
    def cargar_bloques(self, archivo: str, validadores: list):
        self.validadores = validadores
        bloques_temp = []
        trans_actuales = []
        
        with open(archivo, 'r') as f:
            for linea in f:
                linea = linea.strip()
                if not linea:
                    continue
                if linea == '---':
                    if trans_actuales:
                        bloques_temp.append(trans_actuales)
                        trans_actuales = []
                else:
                    trans_actuales.append(linea)
            if trans_actuales:
                bloques_temp.append(trans_actuales)
        
        # Crear y minar los bloques en orden: cada previous_hash debe apuntar
        # al hash final (post-mineria) del bloque anterior, no al hash previo
        # a resolver el PoW (de lo contrario la Regla 3 del Ledger siempre
        # falla a partir del segundo bloque).
        prev_hash = "0"
        for idx, txs in enumerate(bloques_temp, start=1):
            bloque = Bloque(idx, txs, prev_hash)
            bloque.minar(DIFICULTAD_RED)
            self.bloques[idx] = bloque
            prev_hash = bloque.hash

        print(f"✓ Cargados {len(self.bloques)} bloques")

    def distribuir_bloque(self, bloque_id: int):
        bloque = self.bloques[bloque_id]

        with self.lock:
            self.votos[bloque_id] = {
                "ok": 0,
                "invalido": 0,
                "total": len(self.validadores),
                "decidido": False,
                "t_inicio": time.time()
            }

        for val in self.validadores:
            mensaje = {
                "cmd": "w",
                "to": val,
                "data": json.dumps({"cmd": "bloque_candidato", "bloque": bloque.to_dict()})
            }
            self.socket.sendall(json.dumps(mensaje).encode() + b'\n')
        print(f"✓ Bloque #{bloque_id} distribuido a {len(self.validadores)} validadores")

        # Anuncio publico (ademas del envio privado): permite que cualquier
        # observador del chat (ej. la interfaz web) vea que arranco una ronda
        # de consenso, sin que el servidor necesite saber nada de bloques.
        self._anunciar(f"BLOQUE_PROPUESTO#{bloque_id}#{bloque.hash[:12]}")

        # Resiliencia ante nodos caidos: si algun validador no responde,
        # forzamos la evaluacion del quorum tras el timeout en vez de
        # esperar indefinidamente su voto.
        threading.Timer(TIMEOUT_VOTOS, self._forzar_evaluacion, args=(bloque_id,)).start()

    def _escuchar_mensajes(self):
        """Hilo dedicado a recibir e interpretar mensajes del servidor."""
        buf = ""
        while True:
            try:
                datos = self.socket.recv(4096)
                if not datos:
                    break
                buf += datos.decode('utf-8', errors='replace')
                while '\n' in buf:
                    linea, buf = buf.split('\n', 1)
                    if linea.strip():
                        self._procesar_mensaje(linea.strip())
            except Exception as e:
                print(f"\n[!] Error de conexión: {e}")
                break

    def _procesar_mensaje(self, linea: str):
        try:
            m = json.loads(linea)
            if m.get('cmd') == 'broadcast':
                self._procesar_voto(m.get('from', '?'), str(m.get('data', '')))
        except json.JSONDecodeError:
            pass

    def _procesar_voto(self, origen: str, contenido: str):
        """Interpreta un voto BLOQUE_OK#<id> / BLOQUE_INVALIDO#<id> y actualiza el conteo."""
        if '#' not in contenido:
            return

        veredicto, _, sufijo = contenido.partition('#')
        if veredicto not in ('BLOQUE_OK', 'BLOQUE_INVALIDO'):
            return

        try:
            bloque_id = int(sufijo)
        except ValueError:
            return

        with self.lock:
            estado = self.votos.get(bloque_id)
            if estado is None or estado["decidido"]:
                return

            if veredicto == 'BLOQUE_OK':
                estado["ok"] += 1
            else:
                estado["invalido"] += 1

            print(f"[🗳️] Voto de '{origen}': {veredicto} (bloque #{bloque_id}) -> "
                  f"{estado['ok']}/{estado['total']} OK, {estado['invalido']}/{estado['total']} INVALIDO")

            self._chequear_decision(bloque_id, estado)

    def _chequear_decision(self, bloque_id: int, estado: dict) -> None:
        """
        Calcula el quorum dinamicamente: decide en cuanto el resultado ya es
        matematicamente seguro (mayoria alcanzada o ya imposible), sin esperar
        a que respondan todos los validadores. Se invoca bajo self.lock.
        """
        total = estado["total"]
        pendientes = total - (estado["ok"] + estado["invalido"])

        mayoria_alcanzada = estado["ok"] > total / 2
        mayoria_imposible = (estado["ok"] + pendientes) <= total / 2

        if mayoria_alcanzada or mayoria_imposible or pendientes <= 0:
            estado["decidido"] = True
            self._evaluar_quorum(bloque_id, estado)

    def _forzar_evaluacion(self, bloque_id: int) -> None:
        """
        Disparado tras TIMEOUT_VOTOS si el bloque sigue sin decidirse (ej: un
        validador caido que nunca emitio su voto). Evalua el quorum con los
        votos recibidos hasta el momento en vez de esperar indefinidamente.
        """
        with self.lock:
            estado = self.votos.get(bloque_id)
            if estado is None or estado["decidido"]:
                return
            faltantes = estado["total"] - (estado["ok"] + estado["invalido"])
            print(f"[⏱️] Timeout de {TIMEOUT_VOTOS:.0f}s en bloque #{bloque_id}: "
                  f"{faltantes} validador(es) no respondieron a tiempo")
            estado["decidido"] = True
            self._evaluar_quorum(bloque_id, estado)

    def _evaluar_quorum(self, bloque_id: int, estado: dict) -> None:
        """Determina si se alcanzo mayoria simple y actua en consecuencia. Se invoca bajo self.lock."""
        mayoria = estado["ok"] > estado["total"] / 2
        latencia = time.time() - estado["t_inicio"]

        if mayoria:
            print(f"✅ CONSENSO_ALCANZADO: Bloque #{bloque_id} aceptado por mayoria "
                  f"({estado['ok']}/{estado['total']} votos OK, latencia: {latencia:.2f}s)")
            bloque = self.bloques[bloque_id]
            self.blockchain.append(bloque)
            self._mostrar_estado_global()
            self._anunciar(f"CONSENSO_ALCANZADO#{bloque_id}")
            self._notificar_consenso(bloque_id)
        else:
            print(f"❌ BLOQUE_RECHAZADO: Bloque #{bloque_id} no alcanzo mayoria "
                  f"({estado['ok']}/{estado['total']} votos OK, latencia: {latencia:.2f}s)")
            self._anunciar(f"BLOQUE_RECHAZADO#{bloque_id}")

    def _anunciar(self, contenido: str) -> None:
        """Difunde un mensaje publico del Monitor (ej. para que la interfaz lo muestre)."""
        mensaje = {"cmd": "broadcast", "from": self.nombre, "data": contenido}
        self.socket.sendall(json.dumps(mensaje).encode() + b'\n')

    def _mostrar_estado_global(self) -> None:
        """Imprime el estado global de la blockchain consensuada hasta el momento."""
        print("\n=== ESTADO GLOBAL DE LA BLOCKCHAIN ===")
        for b in self.blockchain:
            print(f"  Bloque #{b.id} | {len(b.transacciones)} tx | hash={b.hash[:12]}...")
        print(f"Total: {len(self.blockchain)} bloque(s) consensuado(s)\n")

    def _notificar_consenso(self, bloque_id: int) -> None:
        """Envia un mensaje privado a cada validador confirmando el consenso alcanzado."""
        for val in self.validadores:
            mensaje = {
                "cmd": "w",
                "to": val,
                "data": json.dumps({"cmd": "consenso_ok", "bloque_id": bloque_id})
            }
            self.socket.sendall(json.dumps(mensaje).encode() + b'\n')
        print(f"✓ Confirmacion de consenso enviada a {len(self.validadores)} validadores")

    def menu(self):
        while True:
            cmd = input("\n> ").strip()
            try:
                if cmd.startswith("cargar"):
                    partes = cmd.split()
                    if len(partes) >= 3:
                        archivo = partes[1]
                        val_list = partes[2].split(',')
                        self.cargar_bloques(archivo, val_list)
                    else:
                        print("Uso: cargar <archivo.txt> <val1,val2,...>")
                elif cmd.startswith("distribuir"):
                    partes = cmd.split()
                    if len(partes) == 2:
                        self.distribuir_bloque(int(partes[1]))
                    else:
                        print("Uso: distribuir <numero_de_bloque>  (ej: distribuir 1)")
                elif cmd == "salir":
                    break
                elif cmd:
                    print(f"Comando desconocido: '{cmd}'. Usa: cargar, distribuir o salir.")
            except ValueError:
                print("[!] El numero de bloque debe ser un entero (ej: distribuir 1)")
            except KeyError:
                print("[!] Ese bloque no existe. Primero usa 'cargar <archivo> <validadores>'.")
            except FileNotFoundError:
                print(f"[!] Archivo no encontrado.")

def main():
    monitor = Monitor()
    monitor.conectar_servidor()
    monitor.menu()

if __name__ == "__main__":
    main()
    