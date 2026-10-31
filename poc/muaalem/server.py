"""Minimal local inference service for the Rafiqi recitation test harness.

Standard library only (no FastAPI) so it runs next to the Muaalem install.
Privacy: uploaded audio is decoded in memory, analysed, and discarded. Nothing
is written to disk or logged except request metadata (path, status, duration).

    MUAALEM_MODEL=obadx/muaalem-model-v3_2 python server.py  # 127.0.0.1:8765
"""

from __future__ import annotations

import json
import os
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import pipeline as P

HOST = os.environ.get("MUAALEM_HOST", "127.0.0.1")
PORT = int(os.environ.get("MUAALEM_PORT", "8765"))
MAX_AUDIO_SECONDS = float(os.environ.get("MUAALEM_MAX_SECONDS", "30"))
MAX_BODY = 20 * 1024 * 1024
MOSHAF_KEYS = {"madd_monfasel_len", "madd_mottasel_len", "madd_mottasel_waqf", "madd_aared_len", "recitation_speed"}

_lock = threading.Lock()  # one inference at a time (4 GB RAM budget)
_state = {"loaded": False, "error": None}


def _load_bg():
    try:
        P.load_model()
        _state["loaded"] = True
    except Exception as e:  # surfaced via /health, never hidden
        _state["error"] = f"{type(e).__name__}: {e}"


class H(BaseHTTPRequestHandler):
    def _send(self, code: int, body: dict):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, fmt, *args):  # metadata only, never audio
        print(f"[muaalem] {self.command} {urlparse(self.path).path} {args[1] if len(args) > 1 else ''}")

    def _q(self):
        u = urlparse(self.path)
        return u.path.rstrip("/").removeprefix("/muaalem") or "/", {k: v[0] for k, v in parse_qs(u.query).items()}

    def do_GET(self):
        path, q = self._q()
        try:
            if path == "/health":
                return self._send(200, dict(status="ok", model=P.MODEL_ID, model_loaded=_state["loaded"],
                                            model_error=_state["error"], device="cpu", max_audio_seconds=MAX_AUDIO_SECONDS))
            if path == "/passage":
                s, a, b = int(q["sura"]), int(q["from"]), int(q.get("to", q["from"]))
                return self._send(200, dict(ayat=P.get_passage(s, a, b), source="Tanzil Uthmani 1.1 via quran-transcript"))
            return self._send(404, dict(error="not found"))
        except Exception as e:
            return self._send(400, dict(error=str(e)))

    def do_POST(self):
        path, q = self._q()
        if path != "/analyze":
            return self._send(404, dict(error="not found"))
        if not _state["loaded"]:
            return self._send(503, dict(error="model still loading" if not _state["error"] else _state["error"]))
        n = int(self.headers.get("Content-Length", "0"))
        if n <= 0 or n > MAX_BODY:
            return self._send(413, dict(error="audio body missing or too large"))
        audio = self.rfile.read(n)
        try:
            s, a, b = int(q["sura"]), int(q["from"]), int(q.get("to", q["from"]))
            overrides = {k: (int(v) if v.isdigit() else v) for k, v in q.items() if k in MOSHAF_KEYS}
            wave = P.load_audio(audio)
            del audio
            dur = len(wave) / P.SAMPLE_RATE
            if dur < 0.5:
                return self._send(422, dict(error="recording too short"))
            if dur > MAX_AUDIO_SECONDS:
                return self._send(422, dict(error=f"recording is {dur:.1f}s; limit is {MAX_AUDIO_SECONDS:.0f}s"))
            t0 = time.perf_counter()
            with _lock:
                res = P.analyze(wave, s, a, b, moshaf_overrides=overrides)
            res["timing"]["server_total_seconds"] = round(time.perf_counter() - t0, 3)
            res["privacy"] = "Audio processed in memory on this machine and discarded; not stored."
            return self._send(200, res)
        except Exception as e:
            traceback.print_exc()
            return self._send(500, dict(error=f"{type(e).__name__}: {e}"))


def main():
    threading.Thread(target=_load_bg, daemon=True).start()
    print(f"[muaalem] serving on http://{HOST}:{PORT} (model loading in background)")
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()


if __name__ == "__main__":
    main()
