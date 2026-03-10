import http.server
import socketserver
import webbrowser
import os

PORT = 8000
# El directorio raíz será la raíz del repositorio para acceder a js/ y css/ compartidos
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"--- Servidor ADMIN de Creative Game iniciado ---")
        print(f"Dirección: http://localhost:{PORT}/admin/index.html")
        print("Presiona Ctrl+C para detener el servidor.")

        # Abre el navegador automáticamente apuntando a la carpeta admin
        webbrowser.open(f"http://localhost:{PORT}/admin/index.html")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
            httpd.server_close()

if __name__ == "__main__":
    start_server()
