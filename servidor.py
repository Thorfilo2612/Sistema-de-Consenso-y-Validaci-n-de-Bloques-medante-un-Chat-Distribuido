"""
servidor.py - Servidor TCP/IP para sistema distribuido de consenso blockchain
Fase 1: Capa de comunicación (sin lógica de consenso ni ledger)
"""

import socket
import threading
import logging
import json


# Limites defensivos
MAX_LINE_BYTES: int = 64 * 1024     # 64 KB por mensaje JSON
HANDSHAKE_TIMEOUT: float = 10.0     # segundos para enviar el register inicial


class ServidorChat:
    """
    Servidor de chat TCP/IP que actúa como capa de transporte para
    un sistema distribuido. NO contiene:
      - Lógica de validación de bloques
      - Lógica de consenso
      - Almacenamiento de estado (ledger)
    """

    def __init__(self, host: str = 'localhost', puerto: int = 5000):
        self.host: str = host
        self.puerto: int = puerto
        self.clientes: dict[str, socket.socket] = {}
        self.lock: threading.Lock = threading.Lock()
        self.servidor_socket: socket.socket | None = None
        self.activo: bool = False

        self._configurar_logging()
        logging.info(f"ServidorChat inicializado en {self.host}:{self.puerto}")

    # ------------------------------------------------------------------ #
    # Configuración                                                       #
    # ------------------------------------------------------------------ #
    def _configurar_logging(self) -> None:
        """Logging dual: consola [HH:MM:SS] + archivo servidor.log."""
        logger = logging.getLogger()
        logger.setLevel(logging.INFO)
        if logger.handlers:
            logger.handlers.clear()

        consola = logging.StreamHandler()
        consola.setFormatter(logging.Formatter(
            fmt='[%(asctime)s] %(message)s',
            datefmt='%H:%M:%S'
        ))
        logger.addHandler(consola)

        archivo = logging.FileHandler('servidor.log', mode='a', encoding='utf-8')
        archivo.setFormatter(logging.Formatter(
            fmt='[%(asctime)s] [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        ))
        logger.addHandler(archivo)

    # ------------------------------------------------------------------ #
    # Ciclo de vida del servidor                                          #
    # ------------------------------------------------------------------ #
    def iniciar(self) -> None:
        """Crea el socket, hace bind/listen y entra al loop de accept()."""
        self.servidor_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.servidor_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

        try:
            self.servidor_socket.bind((self.host, self.puerto))
            self.servidor_socket.listen(5)
            self.activo = True
            logging.info(f"Servidor escuchando en {self.host}:{self.puerto}")

            while self.activo:
                try:
                    cliente_socket, direccion = self.servidor_socket.accept()
                    logging.info(f"Nueva conexion desde {direccion[0]}:{direccion[1]}")

                    hilo = threading.Thread(
                        target=self._manejar_cliente,
                        args=(cliente_socket, direccion),
                        daemon=True
                    )
                    hilo.start()
                except OSError:
                    break

        except Exception as e:
            logging.error(f"Error en servidor: {e}")
        finally:
            self.detener()

    def detener(self) -> None:
        """
        Cierre limpio: marca el servidor como inactivo, cierra el socket
        de escucha y fuerza la desconexion de todos los clientes activos.
        Idempotente.
        """
        if not self.activo and self.servidor_socket is None and not self.clientes:
            return

        self.activo = False

        # 1) Cerrar socket de aceptación
        if self.servidor_socket:
            try:
                self.servidor_socket.close()
            except Exception:
                pass
            self.servidor_socket = None

        # 2) Forzar cierre de todos los clientes activos.
        #    Sus hilos veran recv() devolver b'' y haran cleanup en su finally.
        with self.lock:
            sockets_clientes = list(self.clientes.values())
        for sock in sockets_clientes:
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except Exception:
                pass
            try:
                sock.close()
            except Exception:
                pass

        logging.info("Servidor detenido")

    # ------------------------------------------------------------------ #
    # Sesión por cliente                                                  #
    # ------------------------------------------------------------------ #
    def _manejar_cliente(self, cliente_socket: socket.socket, direccion: tuple) -> None:
        """Sesion completa de un cliente: handshake + loop de comandos."""
        nombre: str | None = None
        buffer: str = ""

        try:
            nombre = self._registrar_cliente(cliente_socket, direccion)
            if not nombre:
                return

            while self.activo:
                datos = cliente_socket.recv(4096)
                if not datos:
                    break  # Cliente cerro el socket
                buffer += datos.decode('utf-8', errors='replace')

                # Defensa contra mensajes gigantes
                if len(buffer) > MAX_LINE_BYTES:
                    logging.warning(
                        f"[{nombre}] excedio MAX_LINE_BYTES "
                        f"({len(buffer)} bytes), desconectando"
                    )
                    self._enviar(cliente_socket, {
                        "cmd": "error",
                        "data": f"Mensaje excede {MAX_LINE_BYTES} bytes"
                    })
                    break

                while '\n' in buffer:
                    linea, buffer = buffer.split('\n', 1)
                    linea = linea.strip()
                    if not linea:
                        continue
                    seguir = self._procesar_mensaje(nombre, cliente_socket, linea)
                    if not seguir:
                        return  # /quit -> finally hace cleanup

        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            logging.warning(
                f"Cliente {nombre or direccion} desconectado abruptamente"
            )
        except OSError as e:
            # Socket cerrado durante detener() del servidor
            logging.info(f"Cliente {nombre or direccion} cerrado: {e}")
        except Exception as e:
            logging.exception(f"Error con cliente {nombre or direccion}: {e}")
        finally:
            if nombre:
                with self.lock:
                    self.clientes.pop(nombre, None)
                logging.info(f"Cliente '{nombre}' desconectado")
            try:
                cliente_socket.close()
            except Exception:
                pass

    def _registrar_cliente(
        self,
        cliente_socket: socket.socket,
        direccion: tuple
    ) -> str | None:
        """
        Handshake inicial con timeout. Espera primer mensaje JSON:
            {"cmd": "register", "from": "<nombre>"}
        """
        try:
            cliente_socket.settimeout(HANDSHAKE_TIMEOUT)

            buffer = ""
            while '\n' not in buffer:
                datos = cliente_socket.recv(1024)
                if not datos:
                    return None
                buffer += datos.decode('utf-8', errors='replace')
                if len(buffer) > MAX_LINE_BYTES:
                    return None

            linea = buffer.split('\n', 1)[0].strip()

            try:
                mensaje = json.loads(linea)
            except json.JSONDecodeError:
                self._enviar(cliente_socket, {
                    "cmd": "error", "data": "JSON invalido"
                })
                return None

            if not isinstance(mensaje, dict):
                self._enviar(cliente_socket, {
                    "cmd": "error", "data": "Mensaje debe ser un objeto JSON"
                })
                return None

            if mensaje.get('cmd') != 'register':
                self._enviar(cliente_socket, {
                    "cmd": "error",
                    "data": "Primer mensaje debe ser {cmd:'register', from:<nombre>}"
                })
                return None

            nombre_raw = mensaje.get('from')
            if not isinstance(nombre_raw, str):
                self._enviar(cliente_socket, {
                    "cmd": "error", "data": "Campo 'from' debe ser string"
                })
                return None

            nombre = nombre_raw.strip()
            if not nombre:
                self._enviar(cliente_socket, {
                    "cmd": "error", "data": "Nombre vacio"
                })
                return None

            with self.lock:
                if nombre in self.clientes:
                    self._enviar(cliente_socket, {
                        "cmd": "error",
                        "data": f"Nombre '{nombre}' ya esta en uso"
                    })
                    return None
                self.clientes[nombre] = cliente_socket

            self._enviar(cliente_socket, {
                "cmd": "welcome",
                "data": f"Bienvenido {nombre}"
            })
            logging.info(
                f"Cliente registrado: '{nombre}' desde {direccion[0]}:{direccion[1]}"
            )

            # Quitar timeout: el loop principal usa lectura bloqueante normal
            cliente_socket.settimeout(None)
            return nombre

        except socket.timeout:
            logging.warning(
                f"Handshake timeout desde {direccion[0]}:{direccion[1]} "
                f"(>{HANDSHAKE_TIMEOUT}s sin register)"
            )
            return None
        except (ConnectionResetError, BrokenPipeError):
            return None
        except Exception as e:
            logging.exception(f"Error en handshake con {direccion}: {e}")
            return None

    # ------------------------------------------------------------------ #
    # Ruteo de comandos                                                   #
    # ------------------------------------------------------------------ #
    def _procesar_mensaje(
        self,
        nombre: str,
        cliente_socket: socket.socket,
        linea: str
    ) -> bool:
        """Parsea un JSON entrante y lo despacha al comando correspondiente."""
        try:
            mensaje = json.loads(linea)
        except json.JSONDecodeError:
            self._enviar(cliente_socket, {"cmd": "error", "data": "JSON invalido"})
            return True

        if not isinstance(mensaje, dict):
            self._enviar(cliente_socket, {
                "cmd": "error", "data": "Mensaje debe ser un objeto JSON"
            })
            return True

        cmd_raw = mensaje.get('cmd')
        if not isinstance(cmd_raw, str):
            self._enviar(cliente_socket, {
                "cmd": "error", "data": "Campo 'cmd' debe ser string"
            })
            return True
        cmd = cmd_raw.lower()

        if cmd == 'broadcast':
            self._cmd_broadcast(nombre, str(mensaje.get('data', '')))
            return True
        if cmd == 'w':
            destino_raw = mensaje.get('to', '')
            destino = destino_raw.strip() if isinstance(destino_raw, str) else ''
            self._cmd_privado(
                origen=nombre,
                destino=destino,
                contenido=str(mensaje.get('data', '')),
                origen_socket=cliente_socket
            )
            return True
        if cmd == 'list':
            self._cmd_list(cliente_socket)
            return True
        if cmd == 'quit':
            self._cmd_quit(nombre, cliente_socket)
            return False

        self._enviar(cliente_socket, {
            "cmd": "error",
            "data": f"Comando desconocido: '{cmd}'"
        })
        return True

    # ---------- Implementación de cada comando ------------------------- #
    def _cmd_broadcast(self, origen: str, contenido: str) -> None:
        """Envia el mensaje a todos los clientes conectados, excepto al origen."""
        paquete = {"cmd": "broadcast", "from": origen, "data": contenido}

        with self.lock:
            destinatarios = [
                (n, s) for n, s in self.clientes.items() if n != origen
            ]

        entregados = 0
        for _, sock in destinatarios:
            if self._enviar(sock, paquete):
                entregados += 1
        logging.info(
            f"[{origen}] /broadcast entregado a {entregados}/{len(destinatarios)} cliente(s)"
        )

    def _cmd_privado(
        self,
        origen: str,
        destino: str,
        contenido: str,
        origen_socket: socket.socket
    ) -> None:
        """Mensaje privado a un destinatario especifico."""
        if not destino:
            self._enviar(origen_socket, {
                "cmd": "error", "data": "Falta el campo 'to' para /w"
            })
            return

        with self.lock:
            destino_socket = self.clientes.get(destino)

        if destino_socket is None:
            self._enviar(origen_socket, {
                "cmd": "error",
                "data": f"Cliente '{destino}' no existe o no esta conectado"
            })
            logging.info(f"[{origen}] /w fallido: '{destino}' no existe")
            return

        self._enviar(destino_socket, {
            "cmd": "w", "from": origen, "to": destino, "data": contenido
        })
        logging.info(f"[{origen}] /w privado a '{destino}'")

    def _cmd_list(self, cliente_socket: socket.socket) -> None:
        """Devuelve al solicitante la lista de clientes conectados."""
        with self.lock:
            nombres = sorted(self.clientes.keys())
        self._enviar(cliente_socket, {"cmd": "list", "data": nombres})

    def _cmd_quit(self, nombre: str, cliente_socket: socket.socket) -> None:
        """Confirma quit; la limpieza la hace el finally de _manejar_cliente."""
        self._enviar(cliente_socket, {
            "cmd": "quit", "data": "Conexion cerrada"
        })
        logging.info(f"[{nombre}] solicito /quit")

    # ------------------------------------------------------------------ #
    # Utilidad                                                            #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _enviar(sock: socket.socket, mensaje: dict) -> bool:
        """
        Envia un dict como JSON line-delimited al socket dado.
        Devuelve True si se envio, False si fallo (socket muerto, etc).
        """
        try:
            sock.sendall((json.dumps(mensaje) + '\n').encode('utf-8'))
            return True
        except Exception:
            return False


def main() -> None:
    """Punto de entrada del servidor."""
    servidor = ServidorChat(host='localhost', puerto=5000)
    try:
        servidor.iniciar()
    except KeyboardInterrupt:
        logging.info("Interrupcion de teclado recibida")
        servidor.detener()


if __name__ == '__main__':
    main()
