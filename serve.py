#!/usr/bin/env python3
"""Serveur local zéro-dépendance pour piloter le moteur BTP depuis un navigateur.

Aucune dépendance externe (pas de FastAPI) : uniquement la bibliothèque
standard. Sert ``ui/index.html`` et expose ``POST /simulate`` qui réutilise la
logique pure ``webapp.simulate_payload``.

Lancement :
    python serve.py                 # port 8000 par défaut
    python serve.py --port 8080
    PORT=8080 python serve.py

Puis ouvrir l'URL affichée. Le serveur écoute sur 0.0.0.0 afin d'être
joignable depuis un autre appareil (téléphone) sur le même réseau / via le
mécanisme de prévisualisation de port de l'environnement.
"""

from __future__ import annotations

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from webapp import INDEX_HTML, simulate_payload


class Handler(BaseHTTPRequestHandler):
    # Journalisation compacte.
    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} - {fmt % args}")

    def _send(self, code, body, content_type="application/json"):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        # CORS large : pratique pour tester depuis un téléphone.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, b"")

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            try:
                with open(INDEX_HTML, "r", encoding="utf-8") as handle:
                    self._send(200, handle.read(), "text/html")
            except OSError:
                self._send(500, json.dumps({"error": "index.html introuvable"}))
        elif self.path in ("/health", "/healthz"):
            self._send(200, json.dumps({"status": "ok"}))
        else:
            self._send(404, json.dumps({"error": "not found"}))

    def do_POST(self):
        if self.path != "/simulate":
            self._send(404, json.dumps({"error": "not found"}))
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
            result = simulate_payload(payload)
            self._send(200, json.dumps(result, ensure_ascii=False))
        except Exception as exc:  # renvoyer l'erreur plutôt que planter
            self._send(400, json.dumps({"error": str(exc)}))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int,
                        default=int(os.environ.get("PORT", 8000)))
    parser.add_argument("--host", default="0.0.0.0")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print("=" * 56)
    print("  Moteur BTP — serveur local (stdlib, zéro dépendance)")
    print(f"  Écoute sur http://{args.host}:{args.port}/")
    print(f"  Local    : http://127.0.0.1:{args.port}/")
    print("  Endpoints: GET /  |  POST /simulate  |  GET /health")
    print("  Ctrl+C pour arrêter.")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur.")
        server.shutdown()


if __name__ == "__main__":
    main()
