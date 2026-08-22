"""Dev server for Pueblo.

Plain http.server lets the browser cache ES modules, which silently serves
stale code after an edit. Everything here is no-store.
"""
import functools, http.server, socketserver, sys, os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "game")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_response(self, code, message=None):
        super().send_response(code, message)

    def log_message(self, fmt, *args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with Server(("127.0.0.1", PORT), handler) as httpd:
        print(f"Pueblo dev server on http://localhost:{PORT} (no-store)")
        httpd.serve_forever()
