// ---------------------------------------------------------------------------
// The conversation layer. Text-first for now; the mic replaces the input box
// later without touching anything else here.
//
// Residents run on Gemini when a key is present, and on a small scripted
// fallback when it isn't — so the game is always playable.
// ---------------------------------------------------------------------------

const MODEL = 'gemini-3.5-flash-lite'
const ENDPOINT = m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`

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
  for (const w of text.toLowerCase().match(/[a-záéíóúñü]+/g) || []) {
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

function systemPrompt(r) {
  const past = memoryOf(r.id)
  const summary = past.length
    ? `You have met this person before. Recent exchanges (oldest first):\n` +
      past.map(t => `  Player: ${t.p}\n  You: ${t.r}`).join('\n')
    : `You have never met this person before. They are clearly a foreigner, new in town.`

  return `You are ${r.name}, ${r.age}, a ${r.role} in Pueblo, a small town in Andalusia, Spain. ${r.persona}

You are talking to a foreigner who is learning Spanish. Their current level is ${learner.level}.

RULES — these matter more than anything else:
- Reply ONLY in Spanish. Never translate. Never break character. You do not speak English.${r.id === 'coach' ? ' EXCEPTION: you are the coach and you DO speak English — reply in English when the player seems stuck, otherwise mix simple Spanish with English support.' : ''}
- Speak just slightly above their level (i+1). At A1: short sentences, present tense, common words. Never dump long paragraphs on a beginner.
- Keep replies SHORT — one or two sentences. This is a conversation in a street, not a monologue.
- React like a real person: if they say something confusing or wrong, show it — puzzled, amused, patient. If they get something right that they got wrong before, notice it warmly.
- You have your own life, mood and opinions. You are not a helpful assistant. You can be busy, teasing, nosy.
- Never use emoji. Never use asterisks or stage directions.

${summary}`
}

async function callGemini(r, text, key) {
  const history = memoryOf(r.id).flatMap(t => ([
    { role: 'user', parts: [{ text: t.p }] },
    { role: 'model', parts: [{ text: t.r }] },
  ]))
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt(r) }] },
    contents: [...history, { role: 'user', parts: [{ text }] }],
    generationConfig: { maxOutputTokens: 200 },
  }
  const res = await fetch(`${ENDPOINT(MODEL)}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${res.status} ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const out = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
  if (!out.trim()) throw new Error('empty reply')
  return out.trim()
}

// scripted fallback so the town works with no key at all
function scriptedReply(r, text) {
  const t = text.toLowerCase()
  const bank = r.fallback
  if (/hola|buenas|buenos|buenas tardes/.test(t)) return bank.greet
  if (/gracias/.test(t)) return bank.thanks
  if (/\?$/.test(text.trim())) return bank.question
  if (t.split(/\s+/).length <= 2) return bank.short
  return bank.default
}

export async function ask(r, text) {
  noteProduction(text)
  const key = getKey()
  let reply, source
  if (key) {
    try {
      reply = await callGemini(r, text, key)
      source = 'gemini'
    } catch (e) {
      reply = scriptedReply(r, text)
      source = 'error:' + e.message
    }
  } else {
    await new Promise(res => setTimeout(res, 380)) // let it feel like thinking
    reply = scriptedReply(r, text)
    source = 'scripted'
  }
  remember(r.id, { p: text, r: reply })
  return { reply, source }
}
