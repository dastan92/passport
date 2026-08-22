// ---------------------------------------------------------------------------
// Voices. Browser SpeechSynthesis for now — free, instant, and every OS ships
// Spanish voices. Each resident gets their own pitch/rate so Rosa doesn't
// sound like Tomás. Gemini TTS is the upgrade path; this is the tier below it.
// ---------------------------------------------------------------------------

let voices = []
let ready = false
let enabled = localStorage.getItem('passport_tts') !== '0'

function loadVoices() {
  voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : []
  ready = voices.length > 0
  return ready
}

if (window.speechSynthesis) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

// Best available Hindi voices. Text is romanized Hindi; hi-IN voices read it
// far better than en-* voices do.
function spanishVoices() { // legacy name: "target-language voices"
  if (!ready) loadVoices()
  return voices.filter(v => /^hi(-|_)?/i.test(v.lang))
}

export function voiceReport() {
  if (!ready) loadVoices()
  return {
    supported: !!window.speechSynthesis,
    total: voices.length,
    hindi: spanishVoices().map(v => `${v.name} (${v.lang})`),
  }
}

// per-resident voice character: [voiceIndexOffset, pitch, rate]
const CHARACTER = {
  rosa:   { pitch: 1.15, rate: 0.94, pick: 0 },  // warm, unhurried
  pilar:  { pitch: 1.25, rate: 1.08, pick: 1 },  // quick, bright
  carmen: { pitch: 0.95, rate: 0.86, pick: 0 },  // old, deliberate
  tomas:  { pitch: 0.75, rate: 1.06, pick: 2 },  // loud, low
  miguel: { pitch: 0.85, rate: 0.98, pick: 2 },  // easygoing
  lucia:  { pitch: 1.6,  rate: 1.16, pick: 1 },  // nine years old
  padre:  { pitch: 0.8,  rate: 0.8,  pick: 2 },  // slow, clear
  coach:  { pitch: 1.0,  rate: 1.0,  pick: 2, lang: 'en-GB' },
}

// --- Fish Audio via the dev server's /tts proxy ------------------------------
// Probed once at startup; when absent (GitHub Pages, no key) we use browser
// voices. Same graceful-degradation shape as dota-coach.
let fishAvailable = null
async function probeFish() {
  if (fishAvailable !== null) return fishAvailable
  try {
    const res = await fetch('/tts/status')
    fishAvailable = res.ok && (await res.json()).fish === true
  } catch { fishAvailable = false }
  return fishAvailable
}
probeFish()

let currentAudio = null
async function speakFish(text, residentId, onDone) {
  try {
    const res = await fetch('/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, resident: residentId }),
    })
    if (!res.ok) return false
    const blob = await res.blob()
    if (currentAudio) { currentAudio.pause(); currentAudio = null }
    const audio = new Audio(URL.createObjectURL(blob))
    currentAudio = audio
    audio.onended = () => {
      URL.revokeObjectURL(audio.src)
      if (currentAudio === audio) currentAudio = null
      onDone && onDone()
    }
    await audio.play()
    return true
  } catch { return false }
}

let current = null

export function speak(text, residentId, onDone) {
  if (!enabled || !text) { onDone && onDone(); return null }
  stop()
  if (fishAvailable) {
    speakFish(text, residentId, onDone).then(ok => {
      if (!ok) speakBrowser(text, residentId, onDone)
    })
    return null
  }
  return speakBrowser(text, residentId, onDone)
}

function speakBrowser(text, residentId, onDone) {
  if (!window.speechSynthesis) { onDone && onDone(); return null }
  const ch = CHARACTER[residentId] || { pitch: 1, rate: 1, pick: 0 }
  const u = new SpeechSynthesisUtterance(text)

  if (ch.lang === 'en-GB') {
    const en = voices.filter(v => /^en(-|_)/i.test(v.lang))
    if (en.length) u.voice = en[Math.min(ch.pick, en.length - 1)]
    u.lang = 'en-GB'
  } else {
    const es = spanishVoices()
    if (es.length) u.voice = es[ch.pick % es.length]
    u.lang = u.voice ? u.voice.lang : 'hi-IN'
  }
  u.pitch = ch.pitch
  u.rate = ch.rate
  u.volume = 1
  u.onend = () => { current = null; onDone && onDone() }
  u.onerror = () => { current = null; onDone && onDone() }
  current = u
  window.speechSynthesis.speak(u)
  return u
}

export function stop() {
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel()
  }
  if (currentAudio) { currentAudio.pause(); currentAudio = null }
  current = null
}

export function isSpeaking() {
  return !!(currentAudio && !currentAudio.paused) ||
    !!(window.speechSynthesis && window.speechSynthesis.speaking)
}

export function usingFish() { return fishAvailable === true }

export function toggle() {
  enabled = !enabled
  localStorage.setItem('passport_tts', enabled ? '1' : '0')
  if (!enabled) stop()
  return enabled
}

export function isEnabled() { return enabled }
