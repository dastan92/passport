"""Dev server for Pueblo.

- Static files from ./game with no-store headers (plain http.server lets the
  browser cache ES modules, which silently serves stale code after an edit).
- POST /tts — Fish Audio proxy, same pattern as dota-coach: key from env or
  .env, disk cache, graceful absence. The browser falls back to
  SpeechSynthesis when this returns 404, so the game works without it.
"""
import functools
import base64
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
GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts"
GEMINI_TTS_URL = ("https://generativelanguage.googleapis.com/v1beta/models/"
                  "{model}:generateContent")
# $10 per 1M audio-output tokens; ~25 audio tokens per second of speech.
GEMINI_TTS_USD_PER_SEC = 10.0 * 25 / 1_000_000

# Prebuilt Gemini voices + a per-character style prompt. The style line is
# ordinary English and is NOT spoken — it only conditions delivery.
GEMINI_VOICES = {
    "coach":  ("Charon", "Speak as a warm, encouraging Indian language coach talking to a nervous beginner. Natural Indian English accent, unhurried, friendly"),
    "rosa":   ("Aoede", "Speak as a warm, motherly Indian baker in her late fifties, unhurried and a little teasing"),
    "pilar":  ("Autonoe", "Speak as a quick, bright Indian market fruit-seller in her forties, cheerful and busy"),
    "carmen": ("Gacrux", "Speak as a sharp, elderly Indian woman of seventy-nine, slow, deliberate and a little disapproving"),
    "tomas":  ("Fenrir", "Speak as a loud, boisterous Indian fishmonger in his forties, big-hearted and full of exaggeration"),
    "miguel": ("Puck", "Speak as a relaxed young Indian waiter in his twenties, easy-going and unbothered"),
    "lucia":  ("Leda", "Speak as an excited nine-year-old Indian girl, fast, bright and curious"),
    "padre":  ("Enceladus", "Speak as a gentle elderly Indian priest, slow, clear and kindly"),
}


def _wav(pcm, rate=24000):
    """Gemini returns raw little-endian 16-bit PCM; browsers want a container."""
    import struct
    return (b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVEfmt "
            + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16)
            + b"data" + struct.pack("<I", len(pcm)) + pcm)


def gemini_tts(text, resident):
    """Returns (wav_bytes, note) or (None, reason)."""
    key = ENV.get("GEMINI_API_KEY")
    if not key:
        return None, "no gemini key"
    voice, style = GEMINI_VOICES.get(resident, ("Charon", "Speak naturally"))
    body = {
        "contents": [{"parts": [{"text": f"{style}: {text}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    url = GEMINI_TTS_URL.format(model=GEMINI_TTS_MODEL) + "?key=" + key
    # The preview model intermittently answers finishReason OTHER with no
    # audio — observed on ~half of calls. Retry with a short backoff before
    # giving up and letting the caller fall through to Fish.
    import time as _t
    for attempt in (1, 2, 3, 4):
        try:
            req = urllib.request.Request(
                url, data=json.dumps(body).encode(),
                headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=45) as resp:
                d = json.loads(resp.read())
        except Exception as e:
            if attempt == 4:
                return None, f"gemini tts unreachable: {e}"
            _t.sleep(0.4 * attempt)
            continue
        cands = d.get("candidates") or []
        parts = (cands[0].get("content") or {}).get("parts") if cands else None
        if not parts:
            if attempt == 4:
                fin = cands[0].get("finishReason") if cands else "?"
                return None, f"gemini tts empty (finish={fin})"
            _t.sleep(0.4 * attempt)
            continue
        inline = parts[0].get("inlineData") or parts[0].get("inline_data") or {}
        b64 = inline.get("data")
        if not b64:
            if attempt == 4:
                return None, "gemini tts no inline audio"
            _t.sleep(0.4 * attempt)
            continue
        pcm = base64.b64decode(b64)
        secs = len(pcm) / (24000 * 2)
        SPEND["tts"]["usd"] += secs * GEMINI_TTS_USD_PER_SEC
        return _wav(pcm), "gemini"
    return None, "gemini tts failed"
GEMINI_MODEL = "gemini-3.5-flash-lite"

# USD per 1M tokens, list price as of Aug 2026. gemini-3.7-flash is on a
# promotional rate through 2026-12-31 — revisit then.
# Models the in-game switch offers. 3.7-flash always spends 400-600 thinking
# tokens (billed at the output rate) and cannot be told not to, which is why it
# is ~14x the cost and ~3x the latency of flash-lite for a marginal quality win.
SWITCHABLE = ["gemini-3.5-flash-lite", "gemini-3.7-flash"]

PRICES = {
    "gemini-3.7-flash":       {"in": 0.75, "out": 3.75},
    "gemini-3.5-flash":       {"in": 1.50, "out": 9.00},
    "gemini-3.5-flash-lite":  {"in": 0.30, "out": 2.50},
    "gemini-3.1-flash-lite":  {"in": 0.25, "out": 1.50},
    "gemini-2.5-flash-lite":  {"in": 0.10, "out": 0.40},
    "gemini-2.5-pro":         {"in": 1.25, "out": 10.00},
}
FISH_USD_PER_MBYTE = 15.0   # $15 per million UTF-8 bytes synthesized

SPEND = {
    "gemini": {"calls": 0, "in": 0, "out": 0, "thoughts": 0, "usd": 0.0},
    "tts": {"calls": 0, "cached": 0, "bytes": 0, "usd": 0.0},
}


def _bill_gemini(model, usage):
    if not usage:
        return
    pin = usage.get("promptTokenCount", 0) or 0
    pout = usage.get("candidatesTokenCount", 0) or 0
    pth = usage.get("thoughtsTokenCount", 0) or 0
    price = PRICES.get(model) or PRICES[GEMINI_MODEL]
    # thinking tokens bill at the output rate
    usd = (pin * price["in"] + (pout + pth) * price["out"]) / 1_000_000
    SPEND["gemini"]["calls"] += 1
    SPEND["gemini"]["in"] += pin
    SPEND["gemini"]["out"] += pout
    SPEND["gemini"]["thoughts"] += pth
    SPEND["gemini"]["usd"] += usd
GEMINI_URL = ("https://generativelanguage.googleapis.com/v1beta/models/"
              "{model}:generateContent")
# s2.1-pro auto-detects the language of the input text (83 languages) and
# reads romanized Hindi as Hindi. s1/s2 are weaker at that; don't downgrade
# without re-running the ASR round-trip check.
FISH_MODEL_DEFAULT = "s2.1-pro"
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
# One effective model name, used for BOTH the request header and the cache
# digest. These used to disagree (the digest read os.environ while the header
# read the .env-merged value), so changing FISH_MODEL in .env silently served
# audio cached from the previous model.
FISH_MODEL = ENV.get("FISH_MODEL", FISH_MODEL_DEFAULT)

# Per-resident Fish voices, from fish_voices.json. Each entry is either a
# bare reference_id string or {"id": ..., "speed": ..., "volume": ...};
# "_"-prefixed keys are documentation, not residents. A resident with no
# entry falls back to FISH_VOICE_ID, then to Fish's default voice.
VOICES_FILE = os.path.join(HERE, "fish_voices.json")
VOICE_MAP = {}
if os.path.exists(VOICES_FILE):
    try:
        with open(VOICES_FILE, encoding="utf-8") as f:
            raw = json.load(f)
        if isinstance(raw, dict):
            VOICE_MAP = {k: v for k, v in raw.items()
                         if not k.startswith("_")}
    except (ValueError, OSError) as e:
        print(f"  ! fish_voices.json unreadable ({e}); using default voice")

# reference_ids Fish has already rejected this run. Without this every line
# for a mistyped voice costs a doomed round trip before falling back.
BAD_VOICES = {}


def voice_for(resident):
    """-> (reference_id, prosody_dict). Tolerates both entry shapes."""
    entry = VOICE_MAP.get(resident)
    prosody = {}
    if isinstance(entry, dict):
        voice = str(entry.get("id") or "").strip()
        for k in ("speed", "volume"):
            if isinstance(entry.get(k), (int, float)):
                prosody[k] = float(entry[k])
    elif isinstance(entry, str):
        voice = entry.strip()
    else:
        voice = ""
    if not voice:
        voice = str(ENV.get("FISH_VOICE_ID", "") or "").strip()
    return voice, prosody


def _fish_request(key, text, voice, prosody):
    """-> (audio_bytes, None) or (None, error_string)."""
    body = {"text": text, "format": "mp3"}
    if voice:
        body["reference_id"] = voice
    if prosody:
        body["prosody"] = prosody
    req = urllib.request.Request(
        FISH_URL,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "model": FISH_MODEL,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            return resp.read(), None
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read()[:200].decode(errors="replace")
        except Exception:
            pass
        return None, f"fish {e.code}: {detail}"
    except Exception as e:
        return None, f"unreachable: {e}"


def synthesize(text, resident):
    """-> (audio_bytes|None, source_string). source doubles as the error.

    Gemini TTS is tried first: its prebuilt voices are professional (no
    celebrity clones), it reads romanized Hindi correctly as Hindi, and it
    takes a per-character style prompt — which is how Marco gets an Indian
    English coach read. Fish is the fallback, browser speech the last resort.
    """
    if ENV.get("GEMINI_API_KEY"):
        gsig = "gem2|" + resident + "|" + text
        gpath = os.path.join(CACHE, hashlib.sha1(gsig.encode()).hexdigest() + ".wav")
        if os.path.exists(gpath):
            with open(gpath, "rb") as f:
                return f.read(), "cache"
        audio, note = gemini_tts(text, resident)
        if audio is not None:
            os.makedirs(CACHE, exist_ok=True)
            with open(gpath, "wb") as f:
                f.write(audio)
            return audio, note
        print("[tts] gemini fell back to fish:", note)

    key = ENV.get("FISH_API_KEY")
    if not key:
        return None, "no key"
    voice, prosody = voice_for(resident)
    if voice in BAD_VOICES:
        voice, prosody = "", {}  # known-bad id: skip straight to default

    # Cache key covers everything that changes the audio.
    sig = "|".join([FISH_MODEL, voice, json.dumps(prosody, sort_keys=True), text])
    path = os.path.join(CACHE, hashlib.sha1(sig.encode()).hexdigest() + ".mp3")
    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read(), "cache"

    audio, err = _fish_request(key, text, voice, prosody)

    # A rejected reference_id is a config error, not a network blip: say so
    # loudly on the console, remember it, and retry once on the default voice
    # so the player still hears the line.
    if err and voice and ("400" in err or "402" in err or "404" in err
                          or "422" in err):
        print(f"  ! fish rejected voice {voice!r} for resident "
              f"{resident or '(none)'} -> {err}")
        print(f"    check fish_voices.json; falling back to the default voice")
        BAD_VOICES[voice] = err
        voice, prosody = "", {}
        sig = "|".join([FISH_MODEL, voice, "{}", text])
        path = os.path.join(CACHE,
                            hashlib.sha1(sig.encode()).hexdigest() + ".mp3")
        if os.path.exists(path):
            with open(path, "rb") as f:
                return f.read(), "cache"
        audio, err = _fish_request(key, text, "", {})

    if err:
        print(f"  ! tts failed for {resident or '(none)'}: {err}")
        return None, err
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
                "voice": "gemini" if ENV.get("GEMINI_API_KEY") else
                         ("fish" if ENV.get("FISH_API_KEY") else "browser"),
            })
            return
        if self.path == "/api/cost":
            total = SPEND["gemini"]["usd"] + SPEND["tts"]["usd"]
            self._json(200, {
                "usd": round(total, 6),
                "gemini": {**SPEND["gemini"], "usd": round(SPEND["gemini"]["usd"], 6)},
                "tts": {**SPEND["tts"], "usd": round(SPEND["tts"]["usd"], 6)},
                "model": ENV.get("GEMINI_MODEL", GEMINI_MODEL),
            })
            return
        if self.path == "/tts/status":
            payload = json.dumps({
                "fish": bool(ENV.get("FISH_API_KEY")),
                "model": FISH_MODEL,
                "voices": sorted(VOICE_MAP.keys()),
                # so a wrong/dead reference_id is visible from the browser
                # instead of only in the server console
                "rejected": BAD_VOICES,
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
            # allow a per-request model override so the game can pick a
            # stronger model for dialogue than for cheap background calls
            model = ENV.get("GEMINI_MODEL", GEMINI_MODEL)
            try:
                parsed = json.loads(body)
                if isinstance(parsed, dict) and parsed.pop("model", None):
                    model = json.loads(body).get("model") or model
                    body = json.dumps(parsed).encode()
            except Exception:
                pass
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
            try:
                _bill_gemini(model, json.loads(out).get("usageMetadata"))
            except Exception:
                pass
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
        if audio is not None:
            SPEND["tts"]["calls"] += 1
            if source == "cache":
                SPEND["tts"]["cached"] += 1
            else:
                nbytes = len(text.encode("utf-8"))
                SPEND["tts"]["bytes"] += nbytes
                SPEND["tts"]["usd"] += nbytes * FISH_USD_PER_MBYTE / 1_000_000
        if audio is None:
            # 404 = "no Fish here, use browser voices" (the normal GitHub
            # Pages / no-key case). 502 = Fish exists but the call failed,
            # which is a real problem worth seeing in devtools.
            code = 404 if source == "no key" else 502
            payload = json.dumps({"error": source, "resident": resident}).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        voice, _ = voice_for(resident)
        self.send_response(200)
        self.send_header("Content-Type",
                         "audio/wav" if audio[:4] == b"RIFF" else "audio/mpeg")
        self.send_header("Content-Length", str(len(audio)))
        self.send_header("X-TTS-Source", source)
        self.send_header("X-TTS-Voice", voice or "(default)")
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
        if ENV.get("FISH_API_KEY"):
            named = sum(1 for r in VOICE_MAP if voice_for(r)[0])
            print(f"  tts: model {FISH_MODEL}, {named} resident voices "
                  f"from fish_voices.json")
        httpd.serve_forever()
