import socket
import json
import threading
from bloque import Bloque

class Monitor:
    def __init__(self):
        self.socket = None
        self.nombre = "Monitor"
        self.bloques = {}
        self.validadores = []
        self.blockchain = []
    
    def conectar_servidor(self):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect(('localhost', 5000))
        self.socket.sendall(json.dumps({"cmd": "register", "from": self.nombre}).encode() + b'\n')
        print(f"✓ Monitor conectado como '{self.nombre}'")
    
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
        
        # Crear bloques (sin minería aún)
        prev_hash = "0"
        for idx, txs in enumerate(bloques_temp, start=1):
            bloque = Bloque(idx, txs, prev_hash)
            self.bloques[idx] = bloque
            prev_hash = bloque.hash
        
        print(f"✓ Cargados {len(self.bloques)} bloques")
    
    def distribuir_bloque(self, bloque_id: int):
        bloque = self.bloques[bloque_id]
        
        # --- NUEVO: Minar el bloque antes de enviarlo ---
        dificultad_red = 1 # Debe coincidir con la del Ledger de los validadores
        bloque.minar(dificultad_red)
        # ------------------------------------------------
        
        for val in self.validadores:
            mensaje = {
                "cmd": "w",
                "to": val,
                "data": json.dumps({"cmd": "bloque_candidato", "bloque": bloque.to_dict()})
            }
            self.socket.sendall(json.dumps(mensaje).encode() + b'\n')
        print(f"✓ Bloque #{bloque_id} distribuido a {len(self.validadores)} validadores")
        
    def menu(self):
        while True:
            cmd = input("\n> ").strip()
            if cmd.startswith("cargar"):
                partes = cmd.split()
                if len(partes) >= 3:
                    archivo = partes[1]
                    val_list = partes[2].split(',')
                    self.cargar_bloques(archivo, val_list)
            elif cmd.startswith("distribuir"):
                partes = cmd.split()
                if len(partes) == 2:
                    self.distribuir_bloque(int(partes[1]))
            elif cmd == "salir":
                break

def main():
    monitor = Monitor()
    monitor.conectar_servidor()
    monitor.menu()

if __name__ == "__main__":
    main()
    