"""
servidor.py - Servidor TCP/IP para sistema distribuido de consenso blockchain
Fase 1: Capa de comunicación (sin lógica de consenso ni ledger)
"""

import socket
import threading
import logging
import json


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
        self.clientes: dict[str, socket.socket] = {}   # {nombre: socket}
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
        # SO_REUSEADDR permite reiniciar el servidor sin esperar TIME_WAIT
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

                    # Un hilo por cliente; daemon=True para que cierren con el main
                    hilo = threading.Thread(
                        target=self._manejar_cliente,
                        args=(cliente_socket, direccion),
                        daemon=True
                    )
                    hilo.start()
                except OSError:
                    # Socket cerrado por detener() -> salir limpio
                    break

        except Exception as e:
            logging.error(f"Error en servidor: {e}")
        finally:
            self.detener()

    def detener(self) -> None:
        """Cierra el socket del servidor de forma idempotente."""
        if not self.activo and self.servidor_socket is None:
            return
        self.activo = False
        if self.servidor_socket:
            try:
                self.servidor_socket.close()
            except Exception:
                pass
            self.servidor_socket = None
        logging.info("Servidor detenido")

    # ------------------------------------------------------------------ #
    # Sesión por cliente                                                  #
    # ------------------------------------------------------------------ #
    def _manejar_cliente(self, cliente_socket: socket.socket, direccion: tuple) -> None:
        """Sesion completa de un cliente: handshake + loop de lectura."""
        nombre: str | None = None
        buffer: str = ""

        try:
            # 1) Handshake obligatorio antes de aceptar cualquier comando
            nombre = self._registrar_cliente(cliente_socket, direccion)
            if not nombre:
                return

            # 2) Loop de lectura (line-delimited JSON)
            #    Por ahora solo loguea. En el Paso 3 ruteamos comandos.
            while self.activo:
                datos = cliente_socket.recv(4096)
                if not datos:
                    break  # Cliente cerro el socket
                buffer += datos.decode('utf-8')

                while '\n' in buffer:
                    linea, buffer = buffer.split('\n', 1)
                    linea = linea.strip()
                    if linea:
                        logging.info(f"[{nombre}] mensaje recibido: {linea}")
                        # TODO Paso 3: parsear JSON y rutear comandos

        except (ConnectionResetError, BrokenPipeError):
            logging.warning(f"Cliente {nombre or direccion} desconectado abruptamente")
        except Exception as e:
            logging.error(f"Error con cliente {nombre or direccion}: {e}")
        finally:
            # Limpieza siempre, pase lo que pase
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
        Handshake inicial. Espera un primer mensaje JSON:
            {"cmd": "register", "from": "<nombre>"}
        Devuelve el nombre registrado o None si el handshake falla.
        """
        try:
            buffer = ""
            while '\n' not in buffer:
                datos = cliente_socket.recv(1024)
                if not datos:
                    return None
                buffer += datos.decode('utf-8')

            linea = buffer.split('\n', 1)[0].strip()
            mensaje = json.loads(linea)

            if mensaje.get('cmd') != 'register' or not mensaje.get('from'):
                self._enviar(cliente_socket, {
                    "cmd": "error",
                    "data": "Primer mensaje debe ser {cmd:'register', from:<nombre>}"
                })
                return None

            nombre = mensaje['from'].strip()
            if not nombre:
                self._enviar(cliente_socket, {"cmd": "error", "data": "Nombre vacio"})
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
            return nombre

        except json.JSONDecodeError:
            self._enviar(cliente_socket, {"cmd": "error", "data": "JSON invalido"})
            return None
        except UnicodeDecodeError:
            return None
        except Exception as e:
            logging.error(f"Error en handshake con {direccion}: {e}")
            return None

    # ------------------------------------------------------------------ #
    # Utilidad                                                            #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _enviar(sock: socket.socket, mensaje: dict) -> None:
        """Envia un dict como JSON line-delimited al socket dado."""
        try:
            sock.sendall((json.dumps(mensaje) + '\n').encode('utf-8'))
        except Exception:
            pass  # La limpieza del cliente se hace en _manejar_cliente


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
