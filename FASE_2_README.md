# 🚀 FASE 2 - Monitor + Bloques

[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://python.org)
[![Status](https://img.shields.io/badge/Estado-Completado-green.svg)]()

---

## 📌 Descripción

Monitor que carga transacciones, las agrupa en bloques y las distribuye a validadores.

**Funciones:**
- 📂 Carga transacciones desde archivo
- 🔗 Agrupa en bloques con hash SHA-256
- 📤 Distribuye bloques por mensajes privados (/w)
- 📒 Mantiene blockchain local

---

## 📦 Entregables

| Archivo | Qué hace |
|---------|----------|
| `bloque.py` | Clase Bloque con hash |
| `monitor.py` | Nodo Monitor |
| `bloques.txt` | Transacciones de ejemplo |
| `FASE_2_README.md` | Esta documentación |

---

## ▶️ Cómo ejecutar

### 1. Iniciar servidor (Fase 1)
```bash
python servidor.py

### 2. Iniciar Monitor

python monitor.py

Comandos

cargar_bloques(archivo, validadores=[...])	
distribuir_bloque(id)	
mostrar_blockchain()	
salir()	

Ejemplos

> cargar_bloques(bloques.txt, validadores=["val1","val2","val3"])
✓ Cargados 3 bloques

> distribuir_bloque(1)
✓ Bloque #1 distribuido a 3 validadores

Formato de bloques 

alice->bob:100
bob->carol:50
---
alice->bob:200
---
carol->bob:30

Cada línea = transacción: origen->destino:cantidad

--- = separador de bloques

Resultado:

Bloque 1: 2 transacciones

Bloque 2: 1 transacción

Bloque 3: 1 transacción

---------

🔷 Clase Bloque (bloque.py)

from bloque import Bloque

# Crear bloque
b = Bloque(1, ["alice->bob:100"], "0")

# Ver hash
print(b.hash)  # 64 caracteres hexadecimales

# Convertir a JSON
dict_b = b.to_dict()

# Recuperar desde JSON
b2 = Bloque.from_dict(dict_b)

Hash = SHA-256(id + transacciones + previous_hash + nonce)

🐛 Problemas comunes

Problema	Solución

Connection refused	¿Servidor corriendo? python servidor.py
FileNotFoundError	¿Existe bloques.txt?
No carga bloques	¿Usaste --- como separador?
