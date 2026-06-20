# Sistema de Consenso y Validación de Bloques mediante un Chat Distribuido

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![Status](https://img.shields.io/badge/Estado-Fase_3_Completa-brightgreen.svg)]()

**Proyecto Sistemas Distribuidos 2526-3 - Universidad Metropolitana de Caracas**

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [FASE 1: Servidor TCP/IP](#fase-1-servidor-tcpip)
- [FASE 2: Nodo Monitor + Bloques](#fase-2-nodo-monitor--bloques)
- [FASE 3: Validadores y Consenso](#fase-3-validadores-y-consenso)
- [Ejecución Completa (Demo end-to-end)](#ejecución-completa-demo-end-to-end)
- [Testing](#testing)
- [Resolución de Problemas](#-resolución-de-problemas)
- [Estado del Proyecto](#-estado-del-proyecto)

---

## 📖 Descripción General

Este proyecto implementa un **sistema de consenso distribuido basado en chat** que emula el comportamiento de una blockchain sin utilizar protocolos complejos como Proof of Work tradicional.

**Objetivo:** Procesar y validar transacciones financieras en nodos independientes a través de un protocolo de comunicación basado en JSON sobre sockets TCP, alcanzando consenso por mayoría simple de votos emitidos en un chat.

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
┌───▼───┐      ┌──▼───┐      ┌───▼──┐
│Monitor│      │ Val1 │      │ Val2 │
│       │      │      │      │      │
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
- **Rol:** Carga transacciones, agrupa en bloques, distribuye y cuenta votos
- **Responsabilidad:** Coordinación de rondas de consenso
- **Funciones clave:** Cargar bloques, minar (PoW), distribuir, contar votos en tiempo real, calcular quórum, confirmar consenso

### Fase 3: Validadores (Procesadores)
- **Rol:** Verifican bloques, votan y mantienen su propio ledger local
- **Responsabilidad:** Validación criptográfica (SHA-256 + PoW + encadenamiento), votación pública, inserción diferida al ledger tras confirmación de consenso

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
├── servidor.py                  # Fase 1: Servidor TCP/IP (Hub)
├── cliente_test.py              # Fase 1: Cliente de prueba genérico
├── bloque.py                    # Fase 2: Clase Bloque + minado (PoW)
├── monitor.py                   # Fase 2/3: Nodo Monitor (orquestador + conteo de quórum)
├── bloques.txt                  # Fase 2: Transacciones de ejemplo
├── validador.py                 # Fase 3: Nodo Validador (verifica y vota)
├── ledger.py                    # Fase 3: Blockchain local + reglas de validación
└── servidor.log                 # (Generado en runtime)
```

### 3. Verificar que todo funciona
```bash
python -m py_compile servidor.py monitor.py validador.py bloque.py ledger.py cliente_test.py
# Sin salida = sin errores de sintaxis
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

## Comandos Disponibles (cliente_test.py)

| Comando | Sintaxis | Descripción |
|---|---|---|
| Broadcast | `/broadcast <mensaje>` | Envía a todos (excepto al emisor) |
| Privado | `/w <destino> <mensaje>` | Mensaje privado a un cliente |
| Listar | `/list` | Muestra clientes conectados |
| Salir | `/quit` | Desconecta y cierra |

## Cliente de Prueba

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

---

# FASE 2: Nodo Monitor + Bloques

## Descripción

El Monitor es el cliente coordinador. Carga transacciones desde un archivo, las agrupa en bloques encadenados por hash SHA-256, los **mina** (resuelve el acertijo de Proof of Work), los distribuye a los validadores por mensaje privado, y **escucha el chat en un hilo dedicado** para contar los votos en tiempo real y calcular el quórum.

## Archivos Entregables

| Archivo | Descripción |
|---|---|
| `bloque.py` | Clase Bloque con hash SHA-256 y minado (PoW) |
| `monitor.py` | Nodo Monitor: distribución + conteo de quórum + confirmación |
| `bloques.txt` | Archivo de transacciones de ejemplo |

## Clase Bloque

```python
class Bloque:
    def __init__(self, id_bloque, transacciones, previous_hash="0", nonce=""):
        self.id = id_bloque
        self.transacciones = transacciones
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = self._calcular_hash()  # SHA-256

    def minar(self, dificultad: int) -> None:
        """Busca un nonce tal que el hash empiece con N ceros (Proof of Work)."""
```

### Uso
```python
from bloque import Bloque

b1 = Bloque(1, ["alice->bob:100", "bob->carol:50"], "0")
b1.minar(1)                      # Resuelve el acertijo (hash inicia en '0')
print(b1.hash)

b2 = Bloque(2, ["alice->bob:200"], b1.hash)
print(b2.previous_hash == b1.hash)  # True

dict_b = b1.to_dict()
b1_copy = Bloque.from_dict(dict_b)
print(b1_copy.hash == b1.hash)      # True
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

---
```

**Sintaxis:**
- Cada línea: `origen->destino:cantidad`
- `---` marca el cierre de un bloque (incluido el último)
- Las líneas vacías se ignoran

**Resultado:** 3 bloques (3, 2 y 1 transacción respectivamente), encadenados por `previous_hash`.

## Nodo Monitor

### Características

| Característica | Descripción |
|---|---|
| **Carga de bloques** | Lee el archivo, crea objetos `Bloque` y los **mina inmediatamente** (en orden), de modo que el `previous_hash` del bloque N+1 siempre apunta al hash final (post-PoW) del bloque N |
| **Distribución** | Envía el bloque ya minado a cada validador por `/w` privado |
| **Hilo receptor** | `_escuchar_mensajes` corre en background (daemon) escuchando el chat |
| **Conteo de votos** | `_procesar_voto` contabiliza `BLOQUE_OK#<id>` / `BLOQUE_INVALIDO#<id>` |
| **Quórum dinámico** | `_chequear_decision` evalúa tras *cada* voto si la mayoría ya es matemáticamente segura o imposible (`votos_ok > total/2`), sin esperar a que respondan todos los validadores |
| **Timeout / resiliencia** | Si tras `TIMEOUT_VOTOS` (15s) algún validador no respondió, `_forzar_evaluacion` decide con los votos disponibles en vez de bloquear el sistema indefinidamente |
| **Latencia** | Cada ronda mide el tiempo entre distribución y decisión, e imprime `latencia: Xs` |
| **Confirmación** | Notifica `consenso_ok` por `/w` a cada validador cuando hay mayoría positiva |
| **Blockchain local + estado global** | `self.blockchain` almacena los bloques consensuados; `_mostrar_estado_global` imprime la cadena completa tras cada bloque aceptado |

### Ejecución y comandos reales del menú

```bash
python monitor.py
✓ Monitor conectado como 'Monitor'

> cargar bloques.txt val1,val2
Minando bloque 1 con dificultad 1...
¡Bloque 1 minado! Nonce final: 9 | Hash: 050954379994f4a...
Minando bloque 2 con dificultad 1...
¡Bloque 2 minado! Nonce final: 11 | Hash: 0fba0cfcd38e3e0...
Minando bloque 3 con dificultad 1...
¡Bloque 3 minado! Nonce final: 23 | Hash: 0485082e0f4e4af...
✓ Cargados 3 bloques

> distribuir 1
✓ Bloque #1 distribuido a 2 validadores

> salir
```

> **Nota:** el minado (PoW) ocurre durante `cargar`, no durante `distribuir`. Esto es necesario para que el `previous_hash` de cada bloque apunte siempre al hash *final* (post-minado) del bloque anterior.

| Comando | Sintaxis real | Descripción |
|---|---|---|
| Cargar bloques | `cargar <archivo> <val1,val2,...>` | Segmenta el archivo y crea los bloques |
| Distribuir | `distribuir <id>` | Mina y envía el bloque `id` a los validadores |
| Salir | `salir` | Termina el menú (no cierra el socket explícitamente) |

> El conteo de votos y la confirmación de consenso **no requieren ningún comando**: ocurren automáticamente en el hilo `_escuchar_mensajes` apenas los validadores emiten su voto por `/broadcast`. El quórum se decide en cuanto matemáticamente ya no puede cambiar (sin esperar a todos), y si algún validador no responde en 15s, se decide igual con los votos disponibles.

### Protocolo interno (Fase 2/3)

```json
// Monitor -> Validador: bloque candidato
{"cmd": "w", "to": "val1", "data": "{\"cmd\": \"bloque_candidato\", \"bloque\": {...}}"}

// Validador -> todos (voto público)
{"cmd": "broadcast", "from": "val1", "data": "BLOQUE_OK#1"}

// Monitor -> Validador: confirmación de consenso (solo si hubo mayoría OK)
{"cmd": "w", "to": "val1", "data": "{\"cmd\": \"consenso_ok\", \"bloque_id\": 1}"}
```

---

# FASE 3: Validadores y Consenso

## Descripción

Los Validadores son clientes independientes que reciben un bloque candidato, lo verifican contra **3 reglas de consenso** (`ledger.py`) y emiten su voto por `/broadcast`. A diferencia de una implementación naíf, el bloque **no se agrega al ledger local en el momento de votar**: queda en una zona de espera (`bloques_pendientes`) hasta que el Monitor confirma que se alcanzó el quórum, evitando que un nodo registre un bloque que luego la red rechaza.

## Archivos Entregables

| Archivo | Descripción |
|---|---|
| `validador.py` | Nodo Validador: recibe, verifica, vota, espera confirmación |
| `ledger.py` | Reglas de validación + blockchain local del nodo |

## Reglas de Validación (`Ledger.validar_bloque`)

1. **Integridad criptográfica:** se recalcula el SHA-256 del bloque y se compara con el `hash` recibido.
2. **Acertijo matemático (PoW):** el hash debe iniciar con `dificultad` ceros (`dificultad=1` por defecto, debe coincidir con la del Monitor).
3. **Encadenamiento:** el `previous_hash` del bloque debe coincidir con el hash del último bloque del ledger local (o ser `"0"` si es el bloque génesis).

Si cualquier regla falla, el validador vota `BLOQUE_INVALIDO#<id>`.

## Flujo del Validador

```python
class Validador:
    def __init__(self, nombre):
        self.ledger = Ledger(dificultad=1)
        self.bloques_pendientes = {}   # id -> Bloque, en espera de consenso
```

1. Recibe `bloque_candidato` por `/w` desde el Monitor → `_evaluar_y_votar(bloque)`.
2. Valida con `self.ledger.validar_bloque(bloque)`.
3. Emite el voto por `/broadcast`: `BLOQUE_OK#<id>` o `BLOQUE_INVALIDO#<id>`.
4. Si fue válido, **guarda el bloque en `bloques_pendientes`** (no lo agrega al ledger todavía).
5. Cuando llega `{"cmd": "w", "data": "{\"cmd\":\"consenso_ok\",\"bloque_id\":<id>}"}` del Monitor, recupera el bloque pendiente y **ahí sí** llama a `self.ledger.agregar_bloque(bloque)`.

## Ejecución

```bash
python validador.py
Nombre del validador (ej. val1): val1
✓ Validador conectado como 'val1'
Presiona Ctrl+C para salir.

[📥] Recibido bloque candidato #1 de Monitor
[!] Bloque #1 no cumple el acertijo matemático (PoW)   # (ejemplo de log interno del ledger)
[📣] Voto emitido: BLOQUE_OK#1
[🤝] Consenso confirmado para bloque #1
✓ Bloque #1 añadido al ledger local. Total bloques: 1
```

> **Nodos que fallan (NOTA del enunciado):** si un validador calcula mal el hash, recibe un bloque corrupto, o su `previous_hash` no coincide (por ejemplo si se conectó tarde y no procesó bloques anteriores), `validar_bloque` detecta la inconsistencia y ese nodo vota `BLOQUE_INVALIDO#<id>` sin detener al resto de la red. El Monitor sigue contando los votos de los demás nodos con normalidad.

---

# Ejecución Completa (Demo end-to-end)

### Terminal 1: Servidor
```bash
python servidor.py
[12:34:56] Servidor escuchando en localhost:5000
```

### Terminal 2: Validador 1
```bash
python validador.py
Nombre del validador (ej. val1): val1
✓ Validador conectado como 'val1'
```

### Terminal 3: Validador 2
```bash
python validador.py
Nombre del validador (ej. val1): val2
✓ Validador conectado como 'val2'
```

### Terminal 4: Monitor (arrancar al final)
```bash
python monitor.py
✓ Monitor conectado como 'Monitor'

> cargar bloques.txt val1,val2
Minando bloque 1 con dificultad 1...
¡Bloque 1 minado! Nonce final: 9 | Hash: 050954379994f4a...
(... bloques 2 y 3 tambien se minan aqui ...)
✓ Cargados 3 bloques

> distribuir 1
✓ Bloque #1 distribuido a 2 validadores

[🗳️] Voto de 'val1': BLOQUE_OK (bloque #1) -> 1/2 OK, 0/2 INVALIDO
[🗳️] Voto de 'val2': BLOQUE_OK (bloque #1) -> 2/2 OK, 0/2 INVALIDO
✅ CONSENSO_ALCANZADO: Bloque #1 aceptado por mayoria (2/2 votos OK, latencia: 0.04s)

=== ESTADO GLOBAL DE LA BLOCKCHAIN ===
  Bloque #1 | 3 tx | hash=050954379994...
Total: 1 bloque(s) consensuado(s)

✓ Confirmacion de consenso enviada a 2 validadores

> distribuir 2
...

> salir
```

**Ejemplo con un validador caído** (resiliencia): si `val2` se desconecta antes de votar, tras 15 segundos el Monitor decide igual con el voto disponible:
```
[🗳️] Voto de 'val1': BLOQUE_OK (bloque #2) -> 1/2 OK, 0/2 INVALIDO
[⏱️] Timeout de 15s en bloque #2: 1 validador(es) no respondieron a tiempo
❌ BLOQUE_RECHAZADO: Bloque #2 no alcanzo mayoria (1/2 votos OK, latencia: 15.00s)
```

En las terminales 2 y 3 (validadores) se verá en paralelo:
```
[📥] Recibido bloque candidato #1 de Monitor
[📣] Voto emitido: BLOQUE_OK#1
[🤝] Consenso confirmado para bloque #1
✓ Bloque #1 añadido al ledger local. Total bloques: 1
```

**Orden de arranque obligatorio:** `servidor.py` → validadores → `monitor.py` (el Monitor necesita conocer los nombres de validadores ya conectados al momento de `distribuir`).

---

# Testing

## Test 1: Fase 1 - Servidor y mensajería básica
```bash
# Terminal 1
python servidor.py
# Terminal 2 y 3
python cliente_test.py   # alice
python cliente_test.py   # bob

# alice:
> /broadcast hola a todos
> /w bob mensaje secreto
> /list
> /quit
```
**Esperado:** broadcast llega a bob pero no se hace eco a alice; el privado solo llega a bob; `/list` refleja ambos nombres.

## Test 2: Fase 2 - Carga y distribución de bloques
```bash
python monitor.py
> cargar bloques.txt val1,val2
✓ Cargados 3 bloques
> distribuir 1
✓ Bloque #1 distribuido a 2 validadores
```
**Esperado:** `servidor.log` muestra dos líneas `[Monitor] /w privado a 'valX'`.

## Test 3: Fase 3 - Consenso positivo
Con `val1` y `val2` conectados antes del Monitor, tras `distribuir 1` ambos deben votar `BLOQUE_OK#1` y el Monitor debe imprimir `✅ CONSENSO_ALCANZADO`, seguido de `[🤝] Consenso confirmado` en ambos validadores y la inserción en su ledger local.

## Test 4: Fase 3 - Consenso negativo / nodo que falla
Si se usa una dificultad distinta entre `monitor.py` (`dificultad_red`) y `Ledger` de algún validador, ese nodo votará `BLOQUE_INVALIDO#<id>`. Con 1 OK y 1 INVALIDO de 2 validadores, el Monitor debe imprimir `❌ BLOQUE_RECHAZADO` y **no** enviar `consenso_ok` a nadie (el bloque queda en `bloques_pendientes` de los validadores sin insertarse).

## Test 5: Encadenamiento e integridad
```python
from bloque import Bloque

b1 = Bloque(1, ["alice->bob:100"], "0")
b2 = Bloque(2, ["bob->carol:50"], b1.hash)
assert b2.previous_hash == b1.hash

import json
b_copy = Bloque.from_dict(json.loads(json.dumps(b1.to_dict())))
assert b_copy.hash == b1.hash
print("✓ Encadenamiento y serializacion OK")
```

---

# 🐛 Resolución de Problemas

| Problema | Solución |
|---|---|
| `ConnectionRefusedError` | Asegúrate de que el servidor está corriendo (`python servidor.py`) |
| `FileNotFoundError: bloques.txt` | Verifica que `bloques.txt` esté en el directorio actual |
| El Monitor no recibe votos | Verifica que los validadores se conectaron **antes** de `distribuir` y que sus nombres coinciden exactamente con los pasados a `cargar` |
| Bloque siempre `BLOQUE_INVALIDO` | La `dificultad` de `Ledger` en `validador.py` debe coincidir con `dificultad_red` en `monitor.py` (ambas en `1` por defecto) |
| El validador no inserta el bloque en su ledger | Solo lo hace tras recibir `consenso_ok`; si el Monitor imprimió `❌ BLOQUE_RECHAZADO`, es el comportamiento esperado |
| `OSError: [Errno 48] Address already in use` | El puerto 5000 está ocupado. Espera 30s o cambia el puerto en `servidor.py` |
| `UnicodeEncodeError` al imprimir (✓, ✅, 📥...) | `monitor.py` y `validador.py` ya reconfiguran `sys.stdout` a UTF-8 al iniciar; si aparece en otro script, agregar `sys.stdout.reconfigure(encoding='utf-8', errors='replace')` al inicio |
| Un bloque queda `BLOQUE_RECHAZADO` con votos pendientes | El Monitor esperó `TIMEOUT_VOTOS` (15s) y no todos los validadores respondieron a tiempo; revisa que sigan conectados |

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
- [x] Clase Bloque con SHA-256 + minado (PoW)
- [x] Nodo Monitor
- [x] Carga de bloques desde archivo
- [x] Encadenamiento de hashes
- [x] Distribución de bloques
- [x] Hilo receptor de mensajes (`_escuchar_mensajes`)
- [x] Conteo de quórum en tiempo real
- [x] Confirmación de consenso a validadores

## Fase 3: ✅ COMPLETADA
- [x] Nodos Validadores
- [x] Verificación criptográfica (hash + encadenamiento)
- [x] Acertijo matemático (PoW)
- [x] Votación por `/broadcast`
- [x] Ledger local por nodo
- [x] Inserción diferida hasta confirmación de consenso (`consenso_ok`)
- [x] Manejo de nodos que votan distinto sin bloquear al resto de la red

---

# 📄 Licencia

Proyecto educativo - Universidad Metropolitana de Caracas

---

# 👥 Contribuidores

- **Fase 1:** Implementación del Servidor TCP/IP
- **Fase 2:** Nodo Monitor y Estructura de Bloques
- **Fase 3:** Validadores y Consenso Distribuido

---

## ℹ️ Notas Importantes

1. **El servidor NO contiene lógica de negocio.** Es una capa de transporte pura.
2. **Sin dependencias externas.** Solo Python estándar (socket, threading, json, hashlib, logging).
3. **Thread-safe.** El acceso a `self.clientes` en el servidor y a `self.votos` en el Monitor está protegido por locks.
4. **Protocolo extensible.** Los comandos pueden agregarse sin modificar el servidor.
5. **Logging completo.** Todos los eventos del servidor se registran con timestamps en `servidor.log`.
6. **Consenso resiliente.** Un voto `BLOQUE_INVALIDO` de un nodo no detiene la ronda; el Monitor evalúa mayoría sobre el total de votos esperados.

---

**Última actualización:** Junio 2026
**Versión:** 3.0 (Fase 1 + Fase 2 + Fase 3 Completas)
