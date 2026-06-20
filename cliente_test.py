"""
cliente_test.py - Cliente interactivo de pruebas para servidor.py

Soporta los comandos del protocolo:
    /broadcast <mensaje>
    /w <destino> <mensaje>
    /list
    /quit
"""

import socket
import threading
import json


HOST = 'localhost'
PUERTO = 5000


def receptor(sock: socket.socket) -> None:
    """Lee mensajes del servidor en un thread aparte y los imprime."""
    buf = ""
    while True:
        try:
            datos = sock.recv(4096)
            if not datos:
                print("\n[!] Conexion cerrada por el servidor")
                break
            buf += datos.decode('utf-8', errors='replace')
            while '\n' in buf:
                linea, buf = buf.split('\n', 1)
                linea = linea.strip()
                if linea:
                    _imprimir(linea)
        except (ConnectionResetError, BrokenPipeError, OSError):
            print("\n[!] Conexion perdida")
            break


def _imprimir(linea: str) -> None:
    """Formatea un mensaje JSON entrante de forma legible."""
    try:
        m = json.loads(linea)
    except json.JSONDecodeError:
        print(f"<<< {linea}")
        return

    cmd = m.get('cmd', '')
    if cmd == 'welcome':
        print(f"[SERVIDOR] {m.get('data', '')}")
    elif cmd == 'broadcast':
        print(f"[BROADCAST de {m.get('from', '?')}] {m.get('data', '')}")
    elif cmd == 'w':
        print(f"[PRIVADO de {m.get('from', '?')}] {m.get('data', '')}")
    elif cmd == 'list':
        lista = m.get('data', [])
        print(f"[LISTA] {len(lista)} cliente(s): {', '.join(lista)}")
    elif cmd == 'error':
        print(f"[ERROR] {m.get('data', '')}")
    elif cmd == 'quit':
        print(f"[SERVIDOR] {m.get('data', '')}")
    else:
        print(f"<<< {linea}")


def enviar_comando(sock: socket.socket, nombre: str, entrada: str) -> bool:
    """
    Convierte una linea tipo '/broadcast hola' a JSON y la envia.
    Devuelve False si la sesion debe terminar (por /quit), True para continuar.
    """
    if not entrada.startswith('/'):
        print("[!] Los comandos deben empezar con '/'. Ej: /broadcast hola")
        return True

    partes = entrada[1:].split(' ', 1)
    cmd = partes[0].lower()
    resto = partes[1] if len(partes) > 1 else ''

    if cmd == 'broadcast':
        if not resto:
            print("[!] Uso: /broadcast <mensaje>")
            return True
        mensaje = {"cmd": "broadcast", "from": nombre, "data": resto}

    elif cmd == 'w':
        sub = resto.split(None, 1)  # None colapsa espacios extra/multiples
        if len(sub) < 2 or not sub[0]:
            print("[!] Uso: /w <destino> <mensaje>")
            return True
        destino, contenido = sub[0], sub[1]
        mensaje = {
            "cmd": "w", "from": nombre, "to": destino, "data": contenido
        }

    elif cmd == 'list':
        mensaje = {"cmd": "list", "from": nombre}

    elif cmd == 'quit':
        mensaje = {"cmd": "quit", "from": nombre}

    else:
        print(f"[!] Comando desconocido: /{cmd}")
        print("    Disponibles: /broadcast, /w, /list, /quit")
        return True

    try:
        sock.sendall((json.dumps(mensaje) + '\n').encode('utf-8'))
    except (BrokenPipeError, OSError):
        print("[!] Error enviando: conexion perdida")
        return False

    return cmd != 'quit'


def main() -> None:
    nombre = input("Tu nombre: ").strip()
    if not nombre:
        print("Nombre vacio, abortando.")
        return

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.connect((HOST, PUERTO))
    except ConnectionRefusedError:
        print(f"[!] No se pudo conectar a {HOST}:{PUERTO}. "
              f"El servidor esta corriendo?")
        return

    # Handshake: registrar nombre
    try:
        sock.sendall(
            (json.dumps({"cmd": "register", "from": nombre}) + '\n').encode('utf-8')
        )
    except OSError as e:
        print(f"[!] Error en handshake: {e}")
        sock.close()
        return

    # Lanzar receptor en thread aparte (daemon)
    threading.Thread(target=receptor, args=(sock,), daemon=True).start()

    print(f"\nConectado como '{nombre}'. Comandos disponibles:")
    print("  /broadcast <mensaje>")
    print("  /w <destino> <mensaje>")
    print("  /list")
    print("  /quit")
    print("(Ctrl+C para salir abruptamente)\n")

    try:
        while True:
            try:
                entrada = input().strip()
            except EOFError:
                break
            if not entrada:
                continue
            if not enviar_comando(sock, nombre, entrada):
                break
    except KeyboardInterrupt:
        print("\nDesconectando...")
    finally:
        try:
            sock.close()
        except Exception:
            pass


if __name__ == '__main__':
    main()
