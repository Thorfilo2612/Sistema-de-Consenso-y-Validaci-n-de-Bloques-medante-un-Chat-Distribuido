import hashlib
import json

class Bloque:
    def __init__(self, id_bloque: int, transacciones: list, previous_hash: str = "0", nonce: str = ""):
        self.id = id_bloque
        self.transacciones = transacciones
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = self._calcular_hash()
    
    def _calcular_hash(self) -> str:
        contenido = str(self.id) + str(self.transacciones) + self.previous_hash + self.nonce
        return hashlib.sha256(contenido.encode()).hexdigest()
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "transacciones": self.transacciones,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce,
            "hash": self.hash
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Bloque":
        return cls(data["id"], data["transacciones"], data.get("previous_hash", "0"), data.get("nonce", ""))
    
    def __repr__(self) -> str:
        return f"Bloque(id={self.id}, txs={len(self.transacciones)}, hash={self.hash[:8]}...)"
    
    def minar(self, dificultad: int) -> None:
        """
        Implementa el acertijo matemático (Proof of Work).
        Busca un nonce tal que el hash comience con N ceros.
        """
        prefijo_requerido = "0" * dificultad
        
        # Iniciamos el nonce en 0 si está vacío
        if not self.nonce:
            self.nonce = "0"
            
        print(f"Minando bloque {self.id} con dificultad {dificultad}...")
        
        # Iteramos hasta que el hash cumpla con la regla
        while not self.hash.startswith(prefijo_requerido):
            # Incrementamos el nonce
            self.nonce = str(int(self.nonce) + 1)
            # Recalculamos el hash
            self.hash = self._calcular_hash()
            
        print(f"¡Bloque {self.id} minado! Nonce final: {self.nonce} | Hash: {self.hash[:15]}...")