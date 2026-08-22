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

// Pick the best available Spanish voice, preferring Spain over Latin America
// for this campaign, and preferring a non-default (usually higher quality) one.
function spanishVoices() {
  if (!ready) loadVoices()
  const es = voices.filter(v => /^es(-|_)?/i.test(v.lang))
  const spain = es.filter(v => /es[-_]ES/i.test(v.lang))
  return spain.length ? spain : es
}

export function voiceReport() {
  if (!ready) loadVoices()
  return {
    supported: !!window.speechSynthesis,
    total: voices.length,
    spanish: spanishVoices().map(v => `${v.name} (${v.lang})`),
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

let current = null

export function speak(text, residentId, onDone) {
  if (!enabled || !window.speechSynthesis || !text) { onDone && onDone(); return null }
  stop()
  const ch = CHARACTER[residentId] || { pitch: 1, rate: 1, pick: 0 }
  const u = new SpeechSynthesisUtterance(text)

  if (ch.lang === 'en-GB') {
    const en = voices.filter(v => /^en(-|_)/i.test(v.lang))
    if (en.length) u.voice = en[Math.min(ch.pick, en.length - 1)]
    u.lang = 'en-GB'
  } else {
    const es = spanishVoices()
    if (es.length) u.voice = es[ch.pick % es.length]
    u.lang = u.voice ? u.voice.lang : 'es-ES'
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
  current = null
}

export function isSpeaking() {
  return !!(window.speechSynthesis && window.speechSynthesis.speaking)
}

export function toggle() {
  enabled = !enabled
  localStorage.setItem('passport_tts', enabled ? '1' : '0')
  if (!enabled) stop()
  return enabled
}

export function isEnabled() { return enabled }
