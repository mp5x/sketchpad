# gh_bridge_server.py
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import threading

STATE = {
    "from_browser": None,  # latest payload from browser
    "from_gh": None,       # latest payload from GH
}

LOCK = threading.Lock()

class BridgeHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length else ""
        try:
            data = json.loads(body) if body else {}
        except Exception:
            data = {"raw": body}

        with LOCK:
            if self.path == "/from_browser":
                STATE["from_browser"] = data
                self._set_headers()
                self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))

            elif self.path == "/from_gh":
                STATE["from_gh"] = data
                self._set_headers()
                self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))

            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "unknown path"}).encode("utf-8"))

    def do_GET(self):
        with LOCK:
            if self.path == "/for_gh":
                payload = STATE["from_browser"]
                self._set_headers()
                self.wfile.write(json.dumps(payload).encode("utf-8"))

            elif self.path == "/for_browser":
                payload = STATE["from_gh"]
                self._set_headers()
                self.wfile.write(json.dumps(payload).encode("utf-8"))

            elif self.path == "/":
                # Simple health check endpoint
                self._set_headers()
                self.wfile.write(json.dumps({"status": "bridge ok"}).encode("utf-8"))

            elif self.path == "/favicon.ico":
                # Avoid noisy 404 in console
                self.send_response(204)
                self.end_headers()

            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "unknown path"}).encode("utf-8"))

    def log_message(self, format, *args):
        # silence default HTTP server spam
        return

if __name__ == "__main__":
    host = "127.0.0.1"
    port = 5000
    server = HTTPServer((host, port), BridgeHandler)
    print(f"Bridge server running on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()
        server.server_close()
