"""
servidor.py - Servidor TCP/IP para sistema distribuido de consenso blockchain
Fase 1: Capa de comunicación (sin lógica de consenso ni ledger)
"""

import socket
import threading
import logging


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
        self.lock: threading.Lock = threading.Lock()   # Protege el dict de clientes
        self.servidor_socket: socket.socket | None = None
        self.activo: bool = False

        self._configurar_logging()
        logging.info(f"ServidorChat inicializado en {self.host}:{self.puerto}")

    def _configurar_logging(self) -> None:
        """
        Configura logging dual:
          - Consola : [HH:MM:SS] mensaje
          - Archivo : [YYYY-MM-DD HH:MM:SS] [NIVEL] mensaje  -> servidor.log
        """
        logger = logging.getLogger()
        logger.setLevel(logging.INFO)

        # Limpieza para evitar handlers duplicados si se reinstancia
        if logger.handlers:
            logger.handlers.clear()

        # Handler de consola
        consola = logging.StreamHandler()
        consola.setFormatter(logging.Formatter(
            fmt='[%(asctime)s] %(message)s',
            datefmt='%H:%M:%S'
        ))
        logger.addHandler(consola)

        # Handler de archivo (modo append, UTF-8)
        archivo = logging.FileHandler('servidor.log', mode='a', encoding='utf-8')
        archivo.setFormatter(logging.Formatter(
            fmt='[%(asctime)s] [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        ))
        logger.addHandler(archivo)


def main() -> None:
    """Punto de entrada del servidor."""
    servidor = ServidorChat(host='localhost', puerto=5000)
    # En el Paso 2 aquí se llamará a servidor.iniciar()


if __name__ == '__main__':
    main()
