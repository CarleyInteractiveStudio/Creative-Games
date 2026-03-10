import http.server
import socketserver
import webbrowser
import os

PORT = 8000
# El directorio raíz será la propia carpeta admin para independencia total
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"--- Servidor ADMIN de Creative Game iniciado ---")
        print(f"Dirección: http://localhost:{PORT}")
        print("Presiona Ctrl+C para detener el servidor.")

        # Abre el navegador automáticamente
        webbrowser.open(f"http://localhost:{PORT}")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
            httpd.server_close()

if __name__ == "__main__":
    start_server()
