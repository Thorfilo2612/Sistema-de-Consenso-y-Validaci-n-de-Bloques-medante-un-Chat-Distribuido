# Sistema de Consenso y Validación de Bloques mediante un Chat Distribuido

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![Status](https://img.shields.io/badge/Estado-Fase_2_Completa-green.svg)]()

**Proyecto Sistemas Distribuidos 2526-3 - Universidad Metropolitana de Caracas**

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [FASE 1: Servidor TCP/IP](#fase-1-servidor-tcpip)
- [FASE 2: Nodo Monitor + Bloques](#fase-2-nodo-monitor--bloques)
- [Testing](#testing)
- [Roadmap Fase 3](#roadmap-fase-3)

---

## 📖 Descripción General

Este proyecto implementa un **sistema de consenso distribuido basado en chat** que emula el comportamiento de una blockchain sin utilizar protocolos complejos como Proof of Work.

**Objetivo:** Procesar y validar transacciones financieras en nodos independientes a través de un protocolo de comunicación basado en JSON sobre sockets TCP.

**Arquitectura:**
```
┌──────────────────────────────┐
│   SERVIDOR TCP/IP (Hub)      │
│   - Acepta conexiones        │
│   - Rutea mensajes           │
│   - SIN lógica de negocio    │
└──────────────────────────────┘
    │              │              │
    │              │              │
┌───▼───┐      ┌──▼──┐      ┌───▼──┐
│Monitor│      │Val1  │      │Val2  │
│ (Fase│      │(Fase│      │(Fase│
│  2)  │      │ 3)  │      │ 3) │
└───────┘      └──────┘      └──────┘
```

---

## 🏗️ Arquitectura

### Fase 1: Servidor (Capa de Transporte)
- **Rol:** Hub de red central
- **Responsabilidad:** Aceptar conexiones TCP y rutear mensajes
- **NO incluye:** lógica de bloques, consenso, ledger
- **Puerto:** localhost:5000
- **Protocolo:** JSON line-delimited sobre TCP/IP

### Fase 2: Monitor (Orquestador)
- **Rol:** Carga transacciones, agrupa en bloques, distribuye
- **Responsabilidad:** Coordinación de rondas de consenso
- **Funciones clave:** Cargar bloques, distribuir, contar votos

### Fase 3: Validadores (pendiente)
- **Rol:** Verifican bloques, votan, mantienen ledger
- **Responsabilidad:** Validación criptográfica, consenso distribuido

---

## 📦 Requisitos

- Python **3.10 o superior**
- Sin dependencias externas (solo librería estándar)
- Sistema operativo: Linux, macOS, Windows

**Verificar versión:**
```bash
python --version
# Python 3.10.x o mayor
```

---

## 🚀 Instalación

### 1. Clonar/Descargar el Repositorio
```bash
git clone <repositorio>
cd Sistema-de-Consenso-y-Validaci-n-de-Bloques-medante-un-Chat-Distribuido
```

### 2. Estructura de Archivos
```
proyecto/
├── README.md                    # Este archivo
├── servidor.py                  # Fase 1: Servidor TCP/IP
├── cliente_test.py              # Fase 1: Cliente de prueba
├── bloque.py                    # Fase 2: Clase Bloque
├── monitor.py                   # Fase 2: Nodo Monitor
├── bloques.txt                  # Fase 2: Transacciones de ejemplo
└── servidor.log                 # (Generado en runtime)
```

### 3. Verificar que todo funciona
```bash
python bloque.py    # Testea la clase Bloque
# ✓ Bloque(id=1, txs=2, hash=abc123...)
```

---

# FASE 1: Servidor TCP/IP

## Descripción

Capa de transporte pura que acepta múltiples conexiones TCP simultáneas y rutea mensajes JSON entre clientes. **No contiene lógica de negocio.**

## Características

| Característica | Descripción |
|---|---|
| **Threading** | Un thread por cliente, manejo no-bloqueante |
| **Protocolo** | JSON line-delimited (un mensaje por línea, terminado en `\n`) |
| **Comandos** | `/broadcast`, `/w`, `/list`, `/quit` |
| **Seguridad** | Lock de thread-safety, validación estructural, límite de tamaño |
| **Logging** | Dual: consola `[HH:MM:SS]` + archivo `servidor.log` |

## Ejecución

### Iniciar el servidor
```bash
python servidor.py
```

**Salida esperada:**
```
[12:34:56] ServidorChat inicializado en localhost:5000
[12:34:56] Servidor escuchando en localhost:5000
```

Para detener: `Ctrl+C`

## Protocolo de Mensajes

### Cliente → Servidor
```json
{"cmd": "register",  "from": "<nombre>"}
{"cmd": "broadcast", "from": "<nombre>", "data": "<mensaje>"}
{"cmd": "w",         "from": "<nombre>", "to": "<destino>", "data": "<mensaje>"}
{"cmd": "list",      "from": "<nombre>"}
{"cmd": "quit",      "from": "<nombre>"}
```

### Servidor → Cliente
```json
{"cmd": "welcome",   "data": "<saludo>"}
{"cmd": "broadcast", "from": "<origen>", "data": "<mensaje>"}
{"cmd": "w",         "from": "<origen>", "to": "<destino>", "data": "<mensaje>"}
{"cmd": "list",      "data": ["nombre1", "nombre2", ...]}
{"cmd": "error",     "data": "<descripcion>"}
{"cmd": "quit",      "data": "<confirmacion>"}
```

## Comandos Disponibles

| Comando | Sintaxis | Descripción |
|---|---|---|
| Broadcast | `/broadcast <mensaje>` | Envía a todos (excepto al emisor) |
| Privado | `/w <destino> <mensaje>` | Mensaje privado a un cliente |
| Listar | `/list` | Muestra clientes conectados |
| Salir | `/quit` | Desconecta y cierra |

## Cliente de Prueba

### Usar cliente interactivo
```bash
python cliente_test.py
Tu nombre: alice

Conectado como 'alice'. Comandos disponibles:
  /broadcast <mensaje>
  /w <destino> <mensaje>
  /list
  /quit

> /broadcast hola a todos
> /w bob mensaje secreto
> /list
> /quit
```

## Testing de Fase 1

### Test 1: Conexiones Simultáneas
```bash
# Terminal 1
python servidor.py

# Terminal 2
python cliente_test.py
Tu nombre: alice

# Terminal 3
python cliente_test.py
Tu nombre: bob

# Terminal 4
python cliente_test.py
Tu nombre: carol

# Resultado esperado:
✓ Las 3 conexiones sin bloqueo
✓ Servidor loguea 3 registros
```

### Test 2: Broadcast
```bash
# En Terminal 2 (alice)
> /broadcast hola a todos

# Resultado esperado:
# Terminal 3 (bob): [BROADCAST de alice] hola a todos
# Terminal 4 (carol): [BROADCAST de alice] hola a todos
# Terminal 2 (alice): (NO ve el mensaje - no se echo)
```

### Test 3: Privado
```bash
# En Terminal 2 (alice)
> /w bob mensaje secreto

# Resultado esperado:
# Terminal 3 (bob): [PRIVADO de alice] mensaje secreto
# Terminal 4 (carol): (No ve nada)
```

### Test 4: List y Quit
```bash
# En Terminal 2
> /list
[LISTA] 3 cliente(s): alice, bob, carol

# En Terminal 2
> /quit
[SERVIDOR] Conexion cerrada

# En Terminal 3
> /list
[LISTA] 2 cliente(s): bob, carol
```

---

# FASE 2: Nodo Monitor + Bloques

## Descripción

El Monitor es un cliente que **coordina la validación de bloques**. Carga transacciones desde un archivo, las agrupa en bloques con hash SHA-256, las distribuye a validadores, y cuenta votos.

## Archivos Entregables

| Archivo | Descripción |
|---|---|
| `bloque.py` | Clase Bloque con hash SHA-256 |
| `monitor.py` | Nodo Monitor coordinador |
| `bloques.txt` | Archivo de transacciones de ejemplo |

## Clase Bloque

### Estructura
```python
class Bloque:
    def __init__(self, id_bloque: int, transacciones: list, 
                 previous_hash: str = "0", nonce: str = ""):
        self.id = id_bloque
        self.transacciones = transacciones
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = self._calcular_hash()  # SHA-256
    
    def _calcular_hash(self) -> str:
        # Concatena: id + transacciones + previous_hash + nonce
        # Calcula SHA-256
        # Devuelve hexdigest (64 caracteres)
    
    def to_dict(self) -> dict:
        # Serializa a JSON
    
    @classmethod
    def from_dict(cls, data: dict) -> "Bloque":
        # Deserializa desde JSON
```

### Uso
```python
from bloque import Bloque

# Crear bloque
b1 = Bloque(1, ["alice->bob:100", "bob->carol:50"], "0")
print(b1.hash)  # abc123... (64 caracteres hexadecimales)

# Encadenar bloques
b2 = Bloque(2, ["alice->bob:200"], b1.hash)
print(b2.previous_hash == b1.hash)  # True ✓

# Serializar/deserializar
dict_b = b1.to_dict()
b1_copy = Bloque.from_dict(dict_b)
print(b1_copy.hash == b1.hash)  # True ✓
```

## Formato de Transacciones (bloques.txt)

```
alice->bob:100
bob->carol:50
carol->alice:25
---
alice->bob:200
bob->alice:75
---
carol->bob:30
```

**Sintaxis:**
- Cada línea: `origen->destino:cantidad`
- `---` marca inicio de nuevo bloque
- Las líneas vacías se ignoran

**Resultado:**
- Bloque 1: 3 transacciones
- Bloque 2: 2 transacciones
- Bloque 3: 1 transacción

## Nodo Monitor

### Características

| Característica | Descripción |
|---|---|
| **Carga de bloques** | Lee archivo, crea objetos Bloque |
| **Distribución** | Envía bloques a validadores por `/w` privado |
| **Escucha de votos** | Thread que monitorea votos en el chat |
| **Conteo de votos** | Calcula quórum (mayoría simple) |
| **Blockchain local** | Almacena bloques consensuados |

### Ejecución

```bash
python monitor.py
Tu nombre: Monitor

✓ Monitor conectado como 'Monitor'
```

### Comandos del Monitor

#### `cargar_bloques(archivo, validadores)`
Carga transacciones desde archivo y crea bloques.

```bash
> cargar_bloques bloques.txt val1,val2,val3
✓ Cargados 3 bloques
  Bloque 1: 3 transacciones | hash: abc123...
  Bloque 2: 2 transacciones | hash: def456...
  Bloque 3: 1 transacción | hash: ghi789...
```

#### `distribuir_bloque(bloque_id)`
Envía bloque a todos los validadores por `/w` privado.

```bash
> distribuir_bloque 1
✓ Bloque #1 distribuido a 3 validadores
```

**Lo que ocurre internamente:**
```json
// Monitor envía a cada validador:
{
  "cmd": "w",
  "to": "val1",
  "data": "{\"cmd\": \"bloque_candidato\", \"bloque\": {...}}"
}
```

#### `esperar_votos(timeout=30)`
Espera votos durante N segundos.

```bash
> esperar_votos 30
Esperando votos durante 30 segundos...
[VOTO] val1: BLOQUE_OK#1
[VOTO] val2: BLOQUE_OK#1
[VOTO] val3: BLOQUE_INVALIDO#1
Recibidos 3/3 votos
```

#### `quorum(bloque_id)`
Calcula si se alcanzó mayoría simple.

```bash
> quorum 1
Bloque #1: 2 votos OK, 1 INVALIDO
✓ QUÓRUM ALCANZADO (2/3 >= 2)
```

#### `insertar_blockchain(bloque_id)`
Agrega bloque a la blockchain si alcanzó consenso.

```bash
> insertar_blockchain 1
✓ Bloque #1 insertado en blockchain
```

#### `mostrar_blockchain()`
Imprime el estado de la blockchain.

```bash
> mostrar_blockchain
=== BLOCKCHAIN ===
Bloque #1: 3 txs | hash: abc123... | Consenso: 2/3 ✓
Bloque #2: 2 txs | hash: def456... | Consenso: 3/3 ✓
Total: 2 bloques, 5 transacciones
```

#### `salir()`
Desconecta el Monitor.

```bash
> salir
```

## Ejemplo de Ejecución Completa (Fase 2)

### Terminal 1: Servidor
```bash
$ python servidor.py
[12:34:56] ServidorChat inicializado en localhost:5000
[12:34:56] Servidor escuchando en localhost:5000
[12:34:57] Nueva conexion desde 127.0.0.1:54321
[12:34:57] Cliente registrado: 'Monitor'
```

### Terminal 2: Monitor
```bash
$ python monitor.py
Tu nombre: Monitor
[12:34:57] Conectado como 'Monitor'

> cargar_bloques bloques.txt val1,val2,val3
✓ Cargados 3 bloques
  Bloque 1: 3 transacciones
  Bloque 2: 2 transacciones
  Bloque 3: 1 transacción

> distribuir_bloque 1
✓ Bloque #1 distribuido a 3 validadores

> esperar_votos 30
Esperando votos durante 30 segundos...
[VOTO] val1: BLOQUE_OK#1
[VOTO] val2: BLOQUE_OK#1
[VOTO] val3: BLOQUE_INVALIDO#1
✓ Recibidos 3 votos

> quorum 1
Bloque #1: 2 votos OK, 1 INVALIDO
✓ QUÓRUM ALCANZADO (2/3 >= 2)

> insertar_blockchain 1
✓ Bloque #1 insertado en blockchain

> mostrar_blockchain
=== BLOCKCHAIN ===
Bloque #1: 3 txs | Consenso: 2/3 ✓

> distribuir_bloque 2
✓ Bloque #2 distribuido a 3 validadores

> esperar_votos 30
Esperando votos durante 30 segundos...
[VOTO] val1: BLOQUE_OK#2
[VOTO] val2: BLOQUE_OK#2
[VOTO] val3: BLOQUE_OK#2
✓ Recibidos 3 votos

> quorum 2
Bloque #2: 3 votos OK, 0 INVALIDO
✓ QUÓRUM ALCANZADO (3/3 >= 2)

> insertar_blockchain 2
✓ Bloque #2 insertado en blockchain

> mostrar_blockchain
=== BLOCKCHAIN ===
Bloque #1: 3 txs | Consenso: 2/3 ✓
Bloque #2: 2 txs | Consenso: 3/3 ✓
Total: 2 bloques, 5 transacciones

> salir
```

## Testing de Fase 2

### Setup Básico
```bash
# Terminal 1: Servidor
python servidor.py

# Terminal 2: Monitor
python monitor.py
Tu nombre: Monitor
```

### Test 1: Cargar y Distribuir Bloques
```bash
> cargar_bloques bloques.txt val1,val2,val3
✓ Cargados 3 bloques

> distribuir_bloque 1
✓ Bloque #1 distribuido a 3 validadores

# Verificar en servidor.log:
# [HH:MM:SS] [Monitor] /w privado a 'val1'
# [HH:MM:SS] [Monitor] /w privado a 'val2'
# [HH:MM:SS] [Monitor] /w privado a 'val3'
```

### Test 2: Encadenamiento de Hashes
```python
# Verificar que los hashes encadenan correctamente
from bloque import Bloque

b1 = Bloque(1, ["alice->bob:100"], "0")
b2 = Bloque(2, ["bob->carol:50"], b1.hash)
b3 = Bloque(3, ["carol->alice:25"], b2.hash)

assert b2.previous_hash == b1.hash  # ✓
assert b3.previous_hash == b2.hash  # ✓
print("✓ Hashes encadenan correctamente")
```

### Test 3: Serialización JSON
```python
from bloque import Bloque
import json

b = Bloque(1, ["alice->bob:100"], "0")
json_str = json.dumps(b.to_dict())
print(f"✓ Bloque serializado: {json_str}")

# Deserializar
b2 = Bloque.from_dict(json.loads(json_str))
assert b2.hash == b.hash  # ✓
print("✓ Serialización/deserialización OK")
```

---

# Testing

## Test Suite Completo (Fase 1 + 2)

### Prerequisitos
```bash
# Terminal 1: Servidor (Fase 1)
python servidor.py
```

### Test 1: Fase 1 - Servidor Funciona
```bash
# Terminal 2: Cliente 1
python cliente_test.py
Tu nombre: alice

# Terminal 3: Cliente 2
python cliente_test.py
Tu nombre: bob

# Resultado esperado:
✓ Ambos conectan sin bloqueo
✓ /broadcast funciona
✓ /w privado funciona
✓ /list muestra ambos
✓ /quit desconecta
```

### Test 2: Fase 2 - Monitor Carga Bloques
```bash
# Terminal 2: Monitor
python monitor.py
Tu nombre: Monitor

> cargar_bloques bloques.txt val1,val2,val3
✓ Cargados 3 bloques

# Resultado esperado:
✓ Bloques creados correctamente
✓ Hashes calculados (64 caracteres hex)
✓ Encadenamiento OK (previous_hash apunta a bloque anterior)
```

### Test 3: Fase 2 - Monitor Distribuye
```bash
# En Monitor
> distribuir_bloque 1

# Resultado esperado en servidor.log:
[HH:MM:SS] [Monitor] /w privado a 'val1'
[HH:MM:SS] [Monitor] /w privado a 'val2'
[HH:MM:SS] [Monitor] /w privado a 'val3'

# Mensaje privado contiene:
# {"cmd": "w", "to": "val1", "data": "{...bloque...}"}
```

### Test 4: Fase 2 - Monitor Escucha Votos
```bash
# En Monitor
> distribuir_bloque 1
> esperar_votos 30

# Esperado (una vez que Fase 3 esté lista):
[VOTO] val1: BLOQUE_OK#1
[VOTO] val2: BLOQUE_OK#1
[VOTO] val3: BLOQUE_INVALIDO#1
✓ Recibidos 3/3 votos
```

---

# Roadmap Fase 3

La siguiente fase (Fase 3) implementará:

## 📦 Entregables Fase 3

- `validador.py` - Nodo Validador con verificación
- `ledger.py` - Gestión de blockchain local
- `test_consensus.py` - Testing automatizado

## 🎯 Funcionalidades Fase 3

| Componente | Descripción |
|---|---|
| **Validadores** | Reciben bloques, verifican hash + acertijo, votan |
| **Verificación de Hash** | Recalculan SHA-256 y comparan |
| **Acertijo Matemático** | Regla simple (ej: hash comienza con '0') |
| **Votación** | Emiten voto público por `/broadcast` |
| **Ledger Local** | Blockchain con análisis de consistencia |
| **Detección de Forks** | Identifica bifurcaciones entre nodos |
| **Análisis de Desempeño** | Métricas de latencia y consistencia |

## 🔗 Integración Esperada Fase 3

```
Terminal 1: python servidor.py
            ↓
Terminal 2: python monitor.py → cargar_bloques + distribuir
            ↓
Terminal 3: python validador.py (val1) → recibe, verifica, vota
Terminal 4: python validador.py (val2) → recibe, verifica, vota
Terminal 5: python validador.py (val3) → recibe, verifica, vota
            ↓
Monitor escucha votos → calcula quórum → inserta en blockchain
            ↓
Validadores mantienen ledger local sincronizado
```

---

# 🐛 Resolución de Problemas

| Problema | Solución |
|---|---|
| `ConnectionRefusedError` | Asegúrate de que el servidor está corriendo (`python servidor.py`) |
| `FileNotFoundError: bloques.txt` | Verifica que `bloques.txt` esté en el directorio actual |
| El Monitor no recibe votos | Asegúrate de que los validadores estén enviando broadcasts (Fase 3) |
| Parsing de comandos fallido | Usa la sintaxis exacta: `cargar_bloques archivo.txt val1,val2,val3` (sin espacios después de comas) |
| `OSError: [Errno 48] Address already in use` | El puerto 5000 está ocupado. Espera 30s o cambia el puerto en `servidor.py` |

---

# 📊 Estado del Proyecto

## Fase 1: ✅ COMPLETADA
- [x] Servidor TCP/IP
- [x] Cliente de prueba
- [x] Protocolo JSON
- [x] Logging
- [x] Threading
- [x] Manejo de errores

## Fase 2: ✅ COMPLETADA
- [x] Clase Bloque con SHA-256
- [x] Nodo Monitor
- [x] Carga de bloques desde archivo
- [x] Encadenamiento de hashes
- [x] Distribución de bloques
- [x] Escucha de votos
- [x] Conteo de quórum
- [x] Inserción en blockchain

## Fase 3: ⏳ EN PROGRESO
- [ ] Nodos Validadores
- [ ] Verificación criptográfica
- [ ] Acertijo matemático
- [ ] Votación por consensus
- [ ] Ledger local
- [ ] Análisis de consistencia

---

# 📄 Licencia

Proyecto educativo - Universidad Metropolitana de Caracas

---

# 👥 Contribuidores

- **Fase 1:** Implementación del Servidor TCP/IP
- **Fase 2:** Nodo Monitor y Estructura de Bloques
- **Fase 3:** Validadores y Consenso Distribuido (próximo)

---

## ℹ️ Notas Importantes

1. **El servidor NO contiene lógica de negocio.** Es una capa de transporte pura.
2. **Sin dependencias externas.** Solo Python estándar (socket, threading, json, hashlib, logging).
3. **Thread-safe.** Todos los accesos al dict de clientes están protegidos por locks.
4. **Protocolo extensible.** Los comandos pueden agregarse sin modificar el servidor.
5. **Logging completo.** Todos los eventos se registran con timestamps.

---

**Última actualización:** Junio 2024
**Versión:** 2.0 (Fase 1 + Fase 2 Completa)
