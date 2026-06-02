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