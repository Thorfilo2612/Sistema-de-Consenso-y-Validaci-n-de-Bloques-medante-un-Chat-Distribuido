# Servidor TCP/IP para Sistema Distribuido — Fase 1

Capa de comunicación TCP/IP para un sistema distribuido de consenso blockchain. Esta fase implementa **solo la capa de transporte**: un servidor que acepta múltiples clientes simultáneos y rutea mensajes JSON entre ellos. **No** contiene lógica de consenso, validación de bloques ni almacenamiento de estado — eso vendrá en fases siguientes.

## Requisitos

- Python **3.10 o superior** (usa sintaxis moderna de type hints).
- Sin dependencias externas (solo librería estándar).

## Archivos

| Archivo | Descripción |
|---|---|
| `servidor.py` | Servidor TCP/IP multithreaded |
| `cliente_test.py` | Cliente interactivo para pruebas manuales |
| `servidor.log` | Log generado en ejecución (no versionar) |

## Ejecución

### 1. Iniciar el servidor

```bash
python servidor.py
```

Salida esperada:
```
[HH:MM:SS] ServidorChat inicializado en localhost:5000
[HH:MM:SS] Servidor escuchando en localhost:5000
```

Para detener: `Ctrl+C`.

### 2. Conectar un cliente

En otra terminal:
```bash
python cliente_test.py
```

Te pide un nombre, se conecta y entra al modo interactivo.

## Comandos disponibles

| Comando | Sintaxis | Descripción |
|---|---|---|
| Broadcast | `/broadcast <mensaje>` | Envía a todos los conectados (excepto al emisor) |
| Privado | `/w <destino> <mensaje>` | Mensaje privado a un cliente específico |
| Listar | `/list` | Muestra los clientes conectados |
| Salir | `/quit` | Desconecta y cierra el cliente |

## Protocolo de mensajes

JSON line-delimited (un mensaje por línea, terminado en `\n`).

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

> **Nota:** el campo `from` enviado por el cliente es ignorado por el servidor; siempre se usa el nombre registrado en el handshake para evitar suplantación.

## Plan de pruebas manual

Necesitas **4 terminales**: 1 servidor + 3 clientes.

### Test 1 — Conexiones simultáneas
1. Terminal 1: `python servidor.py`
2. Terminal 2: `python cliente_test.py` → nombre `alice`
3. Terminal 3: `python cliente_test.py` → nombre `bob`
4. Terminal 4: `python cliente_test.py` → nombre `carol`

✅ Las 3 conexiones se aceptan sin bloquear. El servidor loguea 3 registros.

### Test 2 — Broadcast
- En T2 (alice): `/broadcast hola a todos`

✅ T3 (bob) y T4 (carol) ven: `[BROADCAST de alice] hola a todos`
✅ T2 (alice) **NO** ve el mensaje (no se eco al emisor)
✅ Servidor loguea: `[alice] /broadcast entregado a 2/2 cliente(s)`

### Test 3 — Mensaje privado
- En T2 (alice): `/w bob mensaje secreto`

✅ **Solo** T3 (bob) ve: `[PRIVADO de alice] mensaje secreto`
✅ T4 (carol) **no** ve nada
✅ Servidor loguea: `[alice] /w privado a 'bob'`

### Test 4 — Destino inexistente
- En T2 (alice): `/w nobody hola`

✅ T2 (alice) ve: `[ERROR] Cliente 'nobody' no existe o no esta conectado`

### Test 5 — Listar conectados
- En T2 (alice): `/list`

✅ T2 (alice) ve: `[LISTA] 3 cliente(s): alice, bob, carol`

### Test 6 — Desconexión con /quit
1. En T2 (alice): `/quit` (la ventana se cierra)
2. En T3 (bob): `/list`

✅ T3 (bob) ve: `[LISTA] 2 cliente(s): bob, carol`
✅ Servidor loguea: `[alice] solicito /quit` y `Cliente 'alice' desconectado`

### Test 7 — Cierre limpio del servidor
- Con clientes conectados, en T1 presionar `Ctrl+C`.

✅ Servidor loguea: `Interrupcion de teclado recibida` → cierra todos los clientes → `Servidor detenido`
✅ Los clientes ven `[!] Conexion cerrada por el servidor`

## Defensas implementadas

- **Anti-spoofing**: el `from` enviado por el cliente se ignora.
- **Validación estructural**: rechaza JSON no-objeto, `cmd` no-string, etc., sin caerse.
- **Límite de tamaño**: 64 KB máximo por mensaje (anti-DoS).
- **Timeout de handshake**: 10 segundos para registrarse o desconexión.
- **Thread-safe**: el dict de clientes está protegido por un `Lock`.
- **Cierre limpio**: `Ctrl+C` desconecta a todos los clientes correctamente.

## Limitaciones conocidas (intencionales en esta fase)

- Sin autenticación: cualquiera con acceso al puerto puede registrarse.
- Sin cifrado: mensajes en texto plano sobre TCP.
- Sin persistencia: reiniciar el servidor desconecta a todos.

Se abordarán en fases posteriores con las capas de consenso y seguridad.

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

```
## 2. Iniciar Monitor
```bash
python monitor.py

```
## Comandos
```
cargar_bloques(archivo, validadores=[...])	
distribuir_bloque(id)	
mostrar_blockchain()	
salir()	
```
## Ejemplos
```bash
> cargar_bloques(bloques.txt, validadores=["val1","val2","val3"])
✓ Cargados 3 bloques

> distribuir_bloque(1)
✓ Bloque #1 distribuido a 3 validadores
```
## Formato de bloques 

```
alice->bob:100
bob->carol:50
---
alice->bob:200
---
carol->bob:30
```
### Cada línea = transacción: origen->destino:cantidad

--- = separador de bloques

### Resultado:

Bloque 1: 2 transacciones

Bloque 2: 1 transacción

Bloque 3: 1 transacción

---------

## 🔷 Clase Bloque (bloque.py)
```bash
from bloque import Bloque

# Crear bloque
b = Bloque(1, ["alice->bob:100"], "0")

# Ver hash
print(b.hash)  # 64 caracteres hexadecimales

# Convertir a JSON
dict_b = b.to_dict()

# Recuperar desde JSON
b2 = Bloque.from_dict(dict_b)
```

Hash = SHA-256(id + transacciones + previous_hash + nonce)

## 🐛 Problemas comunes

Problema -->	Solución

Connection refused --->	¿Servidor corriendo? python servidor.py

FileNotFoundError --->	¿Existe bloques.txt?

No carga bloques --->	¿Usaste --- como separador?



