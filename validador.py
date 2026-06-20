"""
validador.py - Nodo Validador para la Fase 3
"""
import socket
import threading
import json
import sys
from bloque import Bloque
from ledger import Ledger

# La consola de Windows usa cp1252 por defecto, que no soporta los emojis
# usados en los prints (📥, 📣, 🤝, etc.) y crashea con UnicodeEncodeError.
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'localhost'
PUERTO = 5000

class Validador:
    def __init__(self, nombre: str):
        self.nombre = nombre
        self.socket = None
        self.ledger = Ledger(dificultad=1) # Exige que el hash empiece con un '0'
        self.bloques_pendientes = {}  # bloques validados que esperan confirmacion de consenso
        
    def conectar(self):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            self.socket.connect((HOST, PUERTO))
            # Handshake de registro
            msg = json.dumps({"cmd": "register", "from": self.nombre}) + '\n'
            self.socket.sendall(msg.encode('utf-8'))
            print(f"✓ Validador conectado como '{self.nombre}'")
            
            # Iniciar el hilo receptor
            threading.Thread(target=self._escuchar_mensajes, daemon=True).start()
        except ConnectionRefusedError:
            print("[!] No se pudo conectar al servidor.")
            sys.exit(1)

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
            # Solo nos interesan los mensajes privados (cmd: 'w') que contengan un bloque
            if m.get('cmd') == 'w':
                payload = json.loads(m.get('data', '{}'))
                
                if payload.get('cmd') == 'bloque_candidato':
                    dict_bloque = payload.get('bloque')
                    bloque = Bloque.from_dict(dict_bloque)
                    print(f"\n[📥] Recibido bloque candidato #{bloque.id} de {m.get('from')}")
                    self._evaluar_y_votar(bloque)

                elif payload.get('cmd') == 'consenso_ok':
                    bloque_id = payload.get('bloque_id')
                    bloque = self.bloques_pendientes.pop(bloque_id, None)
                    if bloque is not None:
                        print(f"\n[🤝] Consenso confirmado para bloque #{bloque_id}")
                        self.ledger.agregar_bloque(bloque)

            elif m.get('cmd') == 'broadcast':
                # Opcional: Escuchar los votos de los demás para análisis de bifurcaciones
                pass
                
        except json.JSONDecodeError:
            pass
            
    def _evaluar_y_votar(self, bloque: Bloque):
        """Verifica el bloque y emite un voto por broadcast."""
        es_valido = self.ledger.validar_bloque(bloque)
        
        if es_valido:
            voto = f"BLOQUE_OK#{bloque.id}"
            # El bloque queda pendiente hasta recibir la confirmacion de consenso del Monitor
            self.bloques_pendientes[bloque.id] = bloque
        else:
            voto = f"BLOQUE_INVALIDO#{bloque.id}"
            
        # Emitir voto público
        msg_voto = {
            "cmd": "broadcast",
            "from": self.nombre,
            "data": voto
        }
        self.socket.sendall((json.dumps(msg_voto) + '\n').encode('utf-8'))
        print(f"[📣] Voto emitido: {voto}")

if __name__ == '__main__':
    nombre = input("Nombre del validador (ej. val1): ").strip()
    if nombre:
        nodo = Validador(nombre)
        nodo.conectar()
        print("Presiona Ctrl+C para salir.\n")
        try:
            # Mantener el hilo principal vivo sin consumir CPU (busy-wait)
            threading.Event().wait()
        except KeyboardInterrupt:
            print("\nDesconectando...")
            if nodo.socket:
                nodo.socket.close()