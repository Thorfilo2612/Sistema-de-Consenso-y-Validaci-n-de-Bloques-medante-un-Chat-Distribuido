"""
bridge.py - Puente WebSocket <-> TCP para que la interfaz web (frontend/)
pueda hablar con servidor.py.

Un navegador no puede abrir un socket TCP crudo, asi que este puente actua
como un cliente mas del chat: por cada conexion WebSocket entrante abre una
conexion TCP nueva e independiente hacia servidor.py y reenvia los mensajes
JSON (uno por linea) en ambas direcciones sin interpretarlos. No agrega
logica de negocio ni de consenso - es pura capa de transporte, igual que
servidor.py, solo que traduce el protocolo de transporte (TCP <-> WebSocket).

Cada conexion del navegador equivale a un cliente independiente del chat
(como ejecutar cliente_test.py), por lo que varias pestanas/usuarios pueden
conectarse simultaneamente con nombres distintos.
"""
import asyncio
import logging

import websockets

HOST_TCP = 'localhost'
PUERTO_TCP = 5000
HOST_WS = 'localhost'
PUERTO_WS = 8765

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s', datefmt='%H:%M:%S')


async def _tcp_a_ws(reader: asyncio.StreamReader, websocket) -> None:
    """Lee lineas JSON del servidor TCP y las reenvia como mensajes WebSocket."""
    try:
        while True:
            linea = await reader.readline()
            if not linea:
                break
            texto = linea.decode('utf-8', errors='replace').strip()
            if texto:
                await websocket.send(texto)
    except (websockets.exceptions.ConnectionClosed, ConnectionResetError):
        pass


async def _ws_a_tcp(websocket, writer: asyncio.StreamWriter) -> None:
    """Lee mensajes del WebSocket y los reenvia como lineas JSON al servidor TCP."""
    try:
        async for mensaje in websocket:
            writer.write(mensaje.encode('utf-8') + b'\n')
            await writer.drain()
    except (websockets.exceptions.ConnectionClosed, ConnectionResetError):
        pass


async def manejar_conexion(websocket) -> None:
    """Por cada cliente WebSocket, abre una conexion TCP propia hacia servidor.py."""
    direccion = websocket.remote_address
    logging.info(f"Nueva conexion WebSocket desde {direccion}")

    try:
        reader, writer = await asyncio.open_connection(HOST_TCP, PUERTO_TCP)
    except OSError as e:
        logging.error(f"No se pudo conectar al servidor TCP en {HOST_TCP}:{PUERTO_TCP}: {e}")
        await websocket.close(code=1011, reason="No se pudo conectar al servidor del chat")
        return

    tarea_tcp_a_ws = asyncio.create_task(_tcp_a_ws(reader, websocket))
    tarea_ws_a_tcp = asyncio.create_task(_ws_a_tcp(websocket, writer))

    try:
        await asyncio.wait(
            [tarea_tcp_a_ws, tarea_ws_a_tcp],
            return_when=asyncio.FIRST_COMPLETED
        )
    finally:
        tarea_tcp_a_ws.cancel()
        tarea_ws_a_tcp.cancel()
        writer.close()
        logging.info(f"Conexion WebSocket cerrada: {direccion}")


async def main() -> None:
    logging.info(f"Puente WebSocket escuchando en ws://{HOST_WS}:{PUERTO_WS}")
    logging.info(f"Reenviando hacia el servidor TCP en {HOST_TCP}:{PUERTO_TCP}")
    async with websockets.serve(manejar_conexion, HOST_WS, PUERTO_WS):
        await asyncio.Future()  # corre indefinidamente


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Puente detenido")
