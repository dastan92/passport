"""Dev server for Pueblo.

- Static files from ./game with no-store headers (plain http.server lets the
  browser cache ES modules, which silently serves stale code after an edit).
- POST /tts — Fish Audio proxy, same pattern as dota-coach: key from env or
  .env, disk cache, graceful absence. The browser falls back to
  SpeechSynthesis when this returns 404, so the game works without it.
"""
import functools
import hashlib
import http.server
import json
import os
import socketserver
import sys
import urllib.error
import urllib.request

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "game")
CACHE = os.path.join(HERE, ".tts-cache")

FISH_URL = "https://api.fish.audio/v1/tts"
GEMINI_MODEL = "gemini-3.5-flash-lite"
GEMINI_URL = ("https://generativelanguage.googleapis.com/v1beta/models/"
              "{model}:generateContent")
FISH_MODEL = os.environ.get("FISH_MODEL", "s2.1-pro")
TIMEOUT_S = 15  # conversational lines are longer than dota barks


def _load_env():
    """FISH_*/GEMINI_* from environment, then passport/.env, then dota-coach/.env."""
    conf = {}
    for name in ("FISH_API_KEY", "FISH_VOICE_ID", "FISH_MODEL",
                 "GEMINI_API_KEY", "GEMINI_MODEL"):
        if os.environ.get(name):
            conf[name] = os.environ[name]
    for envfile in (os.path.join(HERE, ".env"),
                    os.path.join(HERE, "..", "dota-coach", ".env")):
        if not os.path.exists(envfile):
            continue
        with open(envfile, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if (k.startswith("FISH_") or k.startswith("GEMINI_")) \
                        and k not in conf and v.strip():
                    conf[k] = v.strip()
    return conf


ENV = _load_env()

# Optional per-resident Fish voice ids. Fill in from fish.audio's voice
# catalog; any resident missing here uses FISH_VOICE_ID, and if that is
# empty too, Fish's default voice.
VOICES_FILE = os.path.join(HERE, "fish_voices.json")
VOICE_MAP = {}
if os.path.exists(VOICES_FILE):
    with open(VOICES_FILE, encoding="utf-8") as f:
        VOICE_MAP = json.load(f)


def synthesize(text, resident):
    key = ENV.get("FISH_API_KEY")
    if not key:
        return None, "no key"
    voice = VOICE_MAP.get(resident) or ENV.get("FISH_VOICE_ID", "")
    digest = hashlib.sha1(
        (FISH_MODEL + "|" + voice + "|" + text).encode()).hexdigest()
    path = os.path.join(CACHE, digest + ".mp3")
    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read(), "cache"
    body = {"text": text, "format": "mp3"}
    if voice:
        body["reference_id"] = voice
    req = urllib.request.Request(
        FISH_URL,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "model": ENV.get("FISH_MODEL", FISH_MODEL),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            audio = resp.read()
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read()[:200].decode(errors="replace")
        except Exception:
            pass
        return None, f"fish {e.code}: {detail}"
    except Exception as e:
        return None, f"unreachable: {e}"
    os.makedirs(CACHE, exist_ok=True)
    with open(path, "wb") as f:
        f.write(audio)
    return audio, "fish"


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass

    def _json(self, code, obj):
        payload = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == "/api/status":
            self._json(200, {
                "gemini": bool(ENV.get("GEMINI_API_KEY")),
                "fish": bool(ENV.get("FISH_API_KEY")),
                "model": ENV.get("GEMINI_MODEL", GEMINI_MODEL),
            })
            return
        if self.path == "/tts/status":
            payload = json.dumps({
                "fish": bool(ENV.get("FISH_API_KEY")),
                "voices": sorted(VOICE_MAP.keys()),
            }).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/gemini":
            key = ENV.get("GEMINI_API_KEY")
            if not key:
                self._json(404, {"error": "no gemini key on server"})
                return
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
            except Exception:
                self.send_error(400)
                return
            model = ENV.get("GEMINI_MODEL", GEMINI_MODEL)
            req = urllib.request.Request(
                GEMINI_URL.format(model=model) + "?key=" + key,
                data=body,
                headers={"Content-Type": "application/json"},
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    out = resp.read()
            except urllib.error.HTTPError as e:
                detail = ""
                try:
                    detail = e.read()[:400].decode(errors="replace")
                except Exception:
                    pass
                self._json(e.code, {"error": f"gemini {e.code}: {detail}"})
                return
            except Exception as e:
                self._json(502, {"error": f"gemini unreachable: {e}"})
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(out)))
            self.end_headers()
            self.wfile.write(out)
            return

        if self.path != "/tts":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length))
            text = str(data.get("text", ""))[:600]
            resident = str(data.get("resident", ""))
        except Exception:
            self.send_error(400)
            return
        if not text.strip():
            self.send_error(400)
            return
        audio, source = synthesize(text, resident)
        if audio is None:
            payload = json.dumps({"error": source}).encode()
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        self.send_response(200)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Content-Length", str(len(audio)))
        self.send_header("X-TTS-Source", source)
        self.end_headers()
        self.wfile.write(audio)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ROOT)
    with Server(("127.0.0.1", PORT), handler) as httpd:
        fish = "fish ON" if ENV.get("FISH_API_KEY") else "fish off"
        gem = "gemini ON" if ENV.get("GEMINI_API_KEY") else "gemini off"
        print(f"Pueblo dev server on http://localhost:{PORT} — {gem}, {fish}")
        httpd.serve_forever()
