// ---------------------------------------------------------------------------
// The conversation layer. Text-first for now; the mic replaces the input box
// later without touching anything else here.
//
// Residents run on Gemini when a key is present, and on a small scripted
// fallback when it isn't — so the game is always playable.
// ---------------------------------------------------------------------------

const MODEL = 'gemini-3.5-flash-lite'
const ENDPOINT = m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`

// The dev server proxies Gemini with a server-side key, so the browser never
// holds one. On static hosting (GitHub Pages) there is no proxy, and the
// player's own key from localStorage is used instead.
let serverKey = null
export const serverReady = fetch('/api/status')
  .then(r => r.ok ? r.json() : null)
  .then(j => { serverKey = !!(j && j.gemini); return serverKey })
  .catch(() => { serverKey = false; return false })

export function hasLLM() { return serverKey || !!getKey() }

async function callModel(body) {
  if (serverKey) {
    const res = await fetch('/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e.error || String(res.status))
    }
    return res.json()
  }
  const key = getKey()
  if (!key) throw new Error('no key')
  const res = await fetch(`${ENDPOINT(MODEL)}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

export function getKey() {
  return localStorage.getItem('passport_gemini_key') || ''
}
export function setKey(k) {
  if (k) localStorage.setItem('passport_gemini_key', k)
  else localStorage.removeItem('passport_gemini_key')
}

// --- learner model: what the player has actually produced -------------------
const learner = JSON.parse(localStorage.getItem('passport_learner') || '{"level":"A1","turns":0,"words":[]}')
export function learnerState() { return learner }
function noteProduction(text) {
  learner.turns++
  for (const w of text.toLowerCase().match(/[a-z\u0900-\u097F]+/g) || []) {
    if (w.length > 2 && !learner.words.includes(w)) learner.words.push(w)
  }
  if (learner.turns > 40) learner.level = 'A2'
  if (learner.turns > 120) learner.level = 'B1'
  localStorage.setItem('passport_learner', JSON.stringify(learner))
}

// --- per-resident memory ----------------------------------------------------
const memories = JSON.parse(localStorage.getItem('passport_memory') || '{}')
export function memoryOf(id) { return memories[id] || [] }
function remember(id, turn) {
  if (!memories[id]) memories[id] = []
  memories[id].push(turn)
  if (memories[id].length > 24) memories[id] = memories[id].slice(-24)
  localStorage.setItem('passport_memory', JSON.stringify(memories))
}
export function forgetAll() {
  localStorage.removeItem('passport_memory')
  localStorage.removeItem('passport_learner')
  location.reload()
}

function systemPrompt(r, mission, extra = {}) {
  const past = memoryOf(r.id)
  const summary = past.length
    ? `You know this foreigner already — here is what has passed between you (oldest first):\n` +
      past.map(t => `  They said: ${t.p}\n  You said: ${t.r}`).join('\n') +
      `\nPick up where things left off. Reference shared history naturally, the way neighbours do.`
    : `You are meeting this foreigner for the first time. Word has gone around that someone new arrived, so you are curious.`

  return `You are ${r.name}, ${r.age} years old, ${r.role} in Pueblo, a small coastal town. (The town looks Mediterranean, but everyone here speaks Hindi — it is simply the town's language; never comment on it.)

WHO YOU ARE
${r.persona}
${r.backstory ? `\nYour life so far: ${r.backstory}` : ''}
${r.goal ? `\nWhat you want these days: ${r.goal}` : ''}
${r.relationships ? `\nYour people: ${r.relationships}` : ''}
${r.doing ? `\nRight now you are ${r.doing}.` : ''}
${r.agenda ? `\nOn your mind today: ${r.agenda}` : ''}

THE CONVERSATION
You are talking with a foreigner who is learning Hindi (level: roughly ${learner.level}). This is a real conversation in the street, not a customer-service exchange. That means:
- You have somewhere to take it. Ask them things. Change the subject when you feel like it. Mention what is on your mind. Gossip about the neighbours. A conversation where you only answer and never push is a failed one.
- React honestly. If their Spanish is confusing, be confused — ask "¿cómo?", guess wrong, laugh kindly. If they say something interesting, dig in. If they are rude, be offended. If they nail a phrase they used to fumble, notice it out loud.
- You are busy and alive. You can cut things short, get distracted by something in the street, serve another customer mid-sentence, or keep them talking because you are enjoying yourself.
- You are NOT a language teacher and you are NOT an assistant. Never explain grammar. Never translate. Never break character. You simply do not speak English${r.id === 'coach' ? ' — EXCEPT you, Marco: you DO speak English. Mix warm English support with simple Hindi, and always push them toward trying things on real neighbours rather than practising on you' : ''}.

HOW YOU SPEAK
- Hindi only, but ALWAYS written in ROMAN script (Latin letters), never Devanagari. Example: "Main accha hoon, aur tum?" NOT "मैं अच्छा हूँ". Natural everyday Hindi — arre, beta, bhai, yaar all fine. Keep spellings simple and consistent so a learner can read them out loud.
- Match their level, one small step above (${learner.level} now): short simple sentences for beginners, more freedom as they grow. Being real matters more than being simple — one vivid short sentence beats three flat ones.
- 1–3 sentences per turn, like actual speech. No emoji, no asterisks, no stage directions.

${extra.knowledge || ''}${extra.mood || ''}${summary}${mission ? `

SITUATION: this foreigner has been sent to you with an errand. ${mission.objective} If they manage it, respond naturally in character — hand the thing over, answer the question, react like it is a normal moment of your day. Never reveal this was arranged.` : ''}`
}

async function callGemini(r, text, mission, extra) {
  const history = memoryOf(r.id).flatMap(t => ([
    { role: 'user', parts: [{ text: t.p }] },
    { role: 'model', parts: [{ text: t.r }] },
  ]))
  const data = await callModel({
    systemInstruction: { parts: [{ text: systemPrompt(r, mission, extra) }] },
    contents: [...history, { role: 'user', parts: [{ text }] }],
    generationConfig: { maxOutputTokens: 200 },
  })
  const out = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
  if (!out.trim()) throw new Error('empty reply')
  return out.trim()
}

// Scripted fallback for when there is no API key. Ordered most-specific first:
// a greeting is the WEAKEST signal in a sentence, so it must be checked last,
// otherwise "Hola, quiero tres plátanos" is answered as a bare "hola".
function scriptedReply(r, text, mission) {
  const t = text.toLowerCase()
  const bank = r.fallback
  const words = t.trim().split(/\s+/).filter(Boolean)

  // 1. the active mission's objective — the whole point of the conversation
  if (mission && mission.target === r.id && mission.check(text)) {
    return mission.success || bank.default
  }
  // 2. an explicit request, even if it opens with a greeting
  if (/quiero|quisiera|me da|dame|me pone|p[oó]ngame|necesito/.test(t)) {
    return bank.request || bank.default
  }
  // 3. a question anywhere in the sentence
  if (/\?/.test(text) || /^(qu[eé]|c[oó]mo|d[oó]nde|cu[aá]nto|cu[aá]ndo|por qu[eé]|qui[eé]n)/.test(t)) {
    return bank.question
  }
  // 4. introductions
  if (/me llamo|mi nombre|soy /.test(t)) return bank.intro || bank.default
  if (/gracias/.test(t)) return bank.thanks
  // 5. bare greeting, only if that is genuinely all they said
  if (/^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches)[\s!.,]*$/.test(t.trim())) {
    return bank.greet
  }
  if (words.length <= 2) return bank.short
  if (/hola|buenas|buenos/.test(t)) return bank.greet
  return bank.default
}

export async function ask(r, text, mission, extra) {
  noteProduction(text)
  await serverReady
  let reply, source
  if (hasLLM()) {
    try {
      reply = await callGemini(r, text, mission, extra)
      source = 'gemini'
    } catch (e) {
      reply = scriptedReply(r, text, mission)
      source = 'error:' + e.message
    }
  } else {
    await new Promise(res => setTimeout(res, 380)) // let it feel like thinking
    reply = scriptedReply(r, text, mission)
    source = 'scripted'
  }
  remember(r.id, { p: text, r: reply })
  return { reply, source }
}


// --- coach side-pane: English-first, mission-aware, always available --------
export async function askCoach(text, mission, mstate) {
  // deliberately NOT noteProduction(): this pane is English, and the learner
  // model must only ever count Spanish the player actually produced.
  const key = getKey()
  const sys = `You are Marco, the player's language coach in Pueblo, a coastal town where every other character speaks only Hindi. You are the ONE person who speaks English. Your job: help the player survive and learn — translate phrases they ask about, explain what someone probably meant, give them the exact Hindi sentence to try next (romanized Hindi in Latin script, e.g. "mujhe teen kele chahiye" — never Devanagari), and encourage them to go say it to a real resident. Keep replies short and practical (2-4 sentences). Never do a long grammar lecture.${mission ? `

Their current mission: "${mission.titleEn}" — ${mission.brief} If they seem lost, remind them; the magic phrase hint is: ${mission.hint}` : ''}
Missions completed so far: ${mstate?.done?.length || 0}. Inventory: ${mstate?.inventory?.join(', ') || 'nothing yet'}.`
  await serverReady
  if (!hasLLM()) {
    await new Promise(r => setTimeout(r, 300))
    if (mission && /qué|how|what|help|ayuda|stuck|lost/i.test(text))
      return { reply: `${mission.brief} ${mission.hint}`, source: 'scripted' }
    return { reply: 'Without an API key I am running on fumes — but here is the golden rule: walk up, say "namaste", and try. ' + (mission ? mission.hint : ''), source: 'scripted' }
  }
  try {
    const data = await callModel({
      systemInstruction: { parts: [{ text: sys }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { maxOutputTokens: 250 },
    })
    const out = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
    return { reply: out.trim() || '(no reply)', source: 'gemini' }
  } catch (e) {
    return { reply: (mission ? mission.hint + ' — ' : '') + '(API error: ' + e.message + ')', source: 'error' }
  }
}
