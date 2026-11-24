"""Sajikan halaman serta inferensi Ruang Tutor melalui loopback."""

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import logging
from pathlib import Path
import sys
from threading import Lock

# Runtime Python portabel DSCO mengaktifkan mode isolasi.
if sys.flags.isolated:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
from inference import list_examples, predict_example


FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
STATIC = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/assets/plus-jakarta-sans.ttf": ("assets/plus-jakarta-sans.ttf", "font/ttf"),
    "/favicon.ico": ("assets/tutor.ico", "image/x-icon"),
}
MAX_BODY_BYTES = 4096
PREDICTION_LOCK = Lock()
ANALYSIS_ERROR = "Analisis belum bisa dijalankan. Coba lagi."


class DemoHandler(BaseHTTPRequestHandler):
    timeout = 10

    def reply(self, status, content_type, payload):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'none'")
        self.end_headers()
        if self.command != "HEAD":
            try:
                self.wfile.write(payload)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def reply_json(self, status, data):
        payload = json.dumps(data, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self.reply(status, "application/json; charset=utf-8", payload)

    def do_GET(self):
        route = self.path.partition("?")[0]
        if route == "/api/examples":
            return self.reply_json(200, {"examples": list_examples()})
        asset = STATIC.get(route)
        if asset is None:
            return self.reply_json(404, {"error": "Halaman tidak ditemukan."})
        filename, content_type = asset
        return self.reply(200, content_type, (FRONTEND / filename).read_bytes())

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        if self.path.partition("?")[0] != "/api/predict":
            return self.reply_json(404, {"error": "Halaman tidak ditemukan."})
        data = self.read_input()
        if (
            not isinstance(data, dict)
            or set(data) != {"case_id"}
            or not isinstance(data["case_id"], str)
            or not data["case_id"].strip()
        ):
            return self.reply_json(400, {"error": "Pilih satu contoh yang valid."})
        case_id = data["case_id"]
        if case_id not in list_examples():
            return self.reply_json(404, {"error": "Contoh tidak ditemukan."})
        try:
            with PREDICTION_LOCK:
                result = predict_example(case_id)
        except Exception:
            logging.exception("Inferensi gagal untuk %s", case_id)
            return self.reply_json(500, {"error": ANALYSIS_ERROR})
        return self.reply_json(200, result)

    def read_input(self):
        if self.headers.get_content_type() != "application/json":
            return None
        try:
            length = int(self.headers.get("Content-Length", ""))
            if 0 < length <= MAX_BODY_BYTES:
                return json.loads(self.rfile.read(length))
        except (ValueError, TimeoutError, RecursionError):
            return None
        return None


def main():
    parser = argparse.ArgumentParser(description="Jalankan demo Ruang Tutor di komputer ini.")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    print("Menyiapkan Ruang Tutor...", flush=True)
    list_examples()
    with ThreadingHTTPServer(("127.0.0.1", args.port), DemoHandler) as server:
        print(f"Ruang Tutor siap di http://127.0.0.1:{server.server_port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
