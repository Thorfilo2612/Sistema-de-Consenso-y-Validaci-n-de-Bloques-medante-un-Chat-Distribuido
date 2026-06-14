"""
ledger.py - Gestión de blockchain local y validación de bloques
"""
from bloque import Bloque

class Ledger:
    def __init__(self, dificultad: int = 1):
        self.blockchain: list[Bloque] = []
        # La dificultad representa la cantidad de ceros iniciales requeridos
        self.dificultad = dificultad

    def validar_bloque(self, bloque: Bloque) -> bool:
        """Aplica las reglas de consenso y verificación sobre un bloque candidato."""
        
        # Regla 1: Integridad Criptográfica (recalcular SHA-256)
        if bloque.hash != bloque._calcular_hash():
            print(f"[!] Hash inválido en bloque #{bloque.id}")
            return False
            
        # Regla 2: Acertijo Matemático (ej: el hash debe empezar con '0')
        prefijo_requerido = '0' * self.dificultad
        if not bloque.hash.startswith(prefijo_requerido):
            print(f"[!] Bloque #{bloque.id} no cumple el acertijo matemático (PoW)")
            return False
            
        # Regla 3: Encadenamiento (previous_hash debe coincidir con el último bloque)
        if self.blockchain:
            ultimo_bloque = self.blockchain[-1]
            if bloque.previous_hash != ultimo_bloque.hash:
                print(f"[!] previous_hash incorrecto en bloque #{bloque.id}")
                return False
        else:
            # Si es el primer bloque (génesis), asumimos que el previous_hash es "0"
            if bloque.previous_hash != "0":
                print(f"[!] previous_hash del bloque génesis #{bloque.id} debe ser '0'")
                return False

        return True

    def agregar_bloque(self, bloque: Bloque) -> None:
        """Inserta el bloque en la cadena local tras el consenso."""
        self.blockchain.append(bloque)
        print(f"✓ Bloque #{bloque.id} añadido al ledger local. Total bloques: {len(self.blockchain)}")