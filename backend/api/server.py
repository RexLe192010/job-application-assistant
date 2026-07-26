"""Simple API placeholder for extension polling in phase 2."""

from http.server import BaseHTTPRequestHandler, HTTPServer
import json


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/jobs/new":
            self.send_response(404)
            self.end_headers()
            return

        payload = {
            "items": [],
            "count": 0
        }
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run(host: str = "127.0.0.1", port: int = 8787) -> None:
    server = HTTPServer((host, port), Handler)
    print(f"API server listening at http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
