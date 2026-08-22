// ---------------------------------------------------------------------------
// Voices. Two tiers:
//
//   1. Fish Audio via the dev server's /tts proxy — preferred whenever it is
//      reachable. Each resident maps to a hand-picked native-Hindi voice in
//      ../../fish_voices.json (see that file for how they were chosen and
//      what the limitations are).
//   2. Browser SpeechSynthesis — the GitHub Pages / no-key fallback. Free and
//      instant, but the OS may ship no Hindi voice at all, so we degrade to
//      any Indic voice and finally to the default with a hi-IN lang hint.
//
// The residents speak ROMANIZED Hindi ("mujhe teen kele chahiye"). Fish's
// s2.1-pro reads that as Hindi; browser engines vary, and a hi-IN voice
// handles it far better than an en-* one.
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

// Best available Hindi voices, in descending order of preference:
//   hi-IN proper  ->  any other Indic-language voice (en-IN included, since
//   an Indian-English voice pronounces romanized Hindi far closer than a
//   US/UK one)  ->  nothing, and we let the engine guess from u.lang.
function hindiVoices() {
  if (!ready) loadVoices()
  const hi = voices.filter(v => /^hi(-|_)/i.test(v.lang) || /^hi$/i.test(v.lang))
  if (hi.length) return hi
  const indic = voices.filter(v => /(-|_)IN$/i.test(v.lang) ||
    /^(bn|gu|kn|ml|mr|pa|ta|te|ur)(-|_|$)/i.test(v.lang))
  return indic
}

export function voiceReport() {
  if (!ready) loadVoices()
  const picked = hindiVoices()
  return {
    supported: !!window.speechSynthesis,
    total: voices.length,
    usingFish: fishAvailable === true,
    // true hi-* voices, versus the Indic near-misses we settle for
    hindi: voices.filter(v => /^hi(-|_|$)/i.test(v.lang))
      .map(v => `${v.name} (${v.lang})`),
    fallbackPool: picked.map(v => `${v.name} (${v.lang})`),
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
//
// The probe is kept as a promise, not just a flag: the first line is often
// spoken before the fetch resolves, and reading the not-yet-set flag used to
// silently downgrade that line to a browser voice.
let fishAvailable = null
let fishProbe = null
function probeFish() {
  if (fishProbe) return fishProbe
  fishProbe = (async () => {
    try {
      // Ask whether the SERVER can synthesize at all — it may be Gemini-only.
      const res = await fetch('/api/status')
      const j = res.ok ? await res.json() : null
      fishAvailable = !!(j && (j.gemini || j.fish))
    } catch { fishAvailable = false }
    return fishAvailable
  })()
  return fishProbe
}
probeFish()

let currentAudio = null
let speakGen = 0            // bumped by stop(): invalidates in-flight requests
async function speakFish(text, residentId, onDone) {
  const gen = speakGen
  try {
    const res = await fetch('/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, resident: residentId }),
    })
    if (!res.ok) return false
    // stop()/mute/a newer line arrived while the network call was outstanding
    if (gen !== speakGen || !enabled) { onDone && onDone(); return true }
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

// Guards against an out-of-order fallback: if speak() is called again while
// a Fish request is in flight, the stale request must not start a browser
// utterance on top of the new line.
let speakToken = 0

export function speak(text, residentId, onDone) {
  if (!enabled || !text) { onDone && onDone(); return null }
  stop()
  // Known-good: go straight to Fish, no await, so playback starts as early
  // as possible. Known-bad: browser, same. Only the undecided first call
  // waits on the probe.
  if (fishAvailable === false) return speakBrowser(text, residentId, onDone)
  const token = ++speakToken
  probeFish().then(ok => {
    if (token !== speakToken) return   // superseded by a newer line
    if (!ok) { speakBrowser(text, residentId, onDone); return }
    speakFish(text, residentId, onDone).then(played => {
      if (!played && token === speakToken) speakBrowser(text, residentId, onDone)
    })
  })
  return null
}

function speakBrowser(text, residentId, onDone) {
  if (!window.speechSynthesis) { onDone && onDone(); return null }
  const ch = CHARACTER[residentId] || { pitch: 1, rate: 1, pick: 0 }
  const u = new SpeechSynthesisUtterance(text)

  if (ch.lang === 'en-IN') {
    // Marco teaches Hindi phrases, so an Indian English voice is the only one
    // that pronounces them correctly. Fall back to hi-IN, then any English.
    const en = voices.filter(v => /^en[-_]IN/i.test(v.lang))
      .concat(voices.filter(v => /^hi[-_]/i.test(v.lang)))
      .concat(voices.filter(v => /^en(-|_)/i.test(v.lang)))
    if (en.length) u.voice = en[Math.min(ch.pick, en.length - 1)]
    u.lang = en.length ? en[0].lang : 'en-IN'
  } else {
    const hi = hindiVoices()
    if (hi.length) u.voice = hi[ch.pick % hi.length]
    // No Hindi voice installed: leave u.voice unset and let the engine pick
    // from the lang hint rather than forcing an en-US voice onto Hindi text.
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
  speakGen++
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
