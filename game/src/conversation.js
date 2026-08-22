// ---------------------------------------------------------------------------
// The conversation layer. Text-first for now; the mic replaces the input box
// later without touching anything else here.
//
// Two brains behind one interface:
//   * Gemini, whenever a key is reachable — the dev proxy at /gemini, or the
//     player's own key on static hosting. This is the real one.
//   * A scripted brain when it is not. Not the real one, but it must never be
//     embarrassing: GitHub Pages runs on it.
//
// Everything a resident says leaves through sanitise(), so the hard rules
// (romanized Hindi, never Devanagari, no stage directions, 1-3 sentences)
// hold for BOTH brains regardless of what the model felt like doing.
// ---------------------------------------------------------------------------

import { factsHeldBy } from './knowledge.js'

const MODEL = 'gemini-3.5-flash-lite'
const ENDPOINT = m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`
const HIST_TURNS = 8      // how many past exchanges ride along in the request
const REPLY_TIMEOUT = 12000

// ---------------------------------------------------------------------------
// transport
// ---------------------------------------------------------------------------

// The dev server proxies Gemini with a server-side key, so the browser never
// holds one. On static hosting (GitHub Pages) there is no proxy, and the
// player's own key from localStorage is used instead.
let chosenModel = localStorage.getItem('passport_model') || ''
export function getModel() { return chosenModel }
export function setModel(m) {
  chosenModel = m || ''
  if (chosenModel) localStorage.setItem('passport_model', chosenModel)
  else localStorage.removeItem('passport_model')
}
function modelNeedsHeadroom() { return /3\.7|pro/.test(chosenModel) }

let serverKey = null

export const serverReady = (async () => {
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 2500)
    const res = await fetch('/api/status', { signal: ctl.signal })
    clearTimeout(t)
    const j = res.ok ? await res.json() : null
    serverKey = !!(j && j.gemini)
  } catch {
    serverKey = false
  }
  return serverKey
})()

export function hasLLM() { return !!serverKey || !!getKey() }

export function getKey() {
  try { return localStorage.getItem('passport_gemini_key') || '' } catch { return '' }
}
export function setKey(k) {
  if (k) localStorage.setItem('passport_gemini_key', k)
  else localStorage.removeItem('passport_gemini_key')
}

// One place that knows how to reach the model, whichever side the key is on.
// thinkingLevel:minimal shaves a couple of hundred ms off flash-lite; models
// that reject the field get one retry without it rather than losing the turn.
async function callModel(body, { noThinking = false } = {}) {
  const payload = noThinking ? stripThinking(body) : body
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), REPLY_TIMEOUT)
  try {
    let res
    if (serverKey) {
      res = await fetch('/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctl.signal,
      })
    } else {
      const key = getKey()
      if (!key) throw new Error('no key')
      res = await fetch(`${ENDPOINT(MODEL)}?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctl.signal,
      })
    }
    if (!res.ok) {
      const raw = await res.text().catch(() => '')
      let msg = raw.slice(0, 200)
      try { msg = JSON.parse(raw).error || msg } catch { /* raw it is */ }
      if (res.status === 400 && !noThinking && hasThinking(body)) {
        clearTimeout(timer)
        return callModel(body, { noThinking: true })
      }
      throw new Error(`${res.status} ${String(msg).slice(0, 120)}`)
    }
    const data = await res.json()
    const out = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''
    if (!out.trim()) throw new Error(blockReason(data) || 'empty reply')
    return out.trim()
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('timeout')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

function hasThinking(b) { return !!(b && b.generationConfig && b.generationConfig.thinkingConfig) }
function stripThinking(b) {
  const copy = { ...b, generationConfig: { ...b.generationConfig } }
  delete copy.generationConfig.thinkingConfig
  return copy
}
function blockReason(d) {
  const r = d?.candidates?.[0]?.finishReason || d?.promptFeedback?.blockReason
  return r && r !== 'STOP' ? String(r).toLowerCase() : ''
}

// ---------------------------------------------------------------------------
// learner model: what the player has actually produced
// ---------------------------------------------------------------------------
const learner = readJSON('passport_learner', { level: 'A1', turns: 0, words: [] })
export function learnerState() { return learner }

function noteProduction(text) {
  learner.turns++
  for (const w of text.toLowerCase().match(/[a-z]+/g) || []) {
    if (w.length > 2 && !learner.words.includes(w)) learner.words.push(w)
  }
  if (learner.turns > 40) learner.level = 'A2'
  if (learner.turns > 120) learner.level = 'B1'
  writeJSON('passport_learner', learner)
}

// What the player has told anyone about themselves. Shared across residents on
// purpose: in a town this size a name travels faster than the person does.
const profile = readJSON('passport_profile', {})
const NOT_A_NAME = /^(theek|thik|accha|achha|acha|yahan|naya|nayi|bahut|bhookha|bhooki|thoda|bimar|pareshan|khush|student|foreigner|videshi|musafir|tourist|ready|fine|good|okay|lost|sorry|hindi|late|tired|here|new)$/i

function noteProfile(text) {
  const t = ' ' + text.trim() + ' '
  let m, changed = false
  if (!profile.name) {
    m = t.match(/(?:mera naam|mere naam|my name is|naam hai)\s+([a-z][a-z'-]{1,14})/i)
      || t.match(/\bmain\s+([a-z][a-z'-]{1,14})\s+(?:hoon|hun|hu)\b/i)
      || t.match(/\bi(?:'m| am)\s+([a-z][a-z'-]{1,14})\s*[.!]?\s*$/i)
    if (m && !NOT_A_NAME.test(m[1])) {
      profile.name = m[1][0].toUpperCase() + m[1].slice(1)
      changed = true
    }
  }
  if (!profile.from) {
    m = t.match(/\bmain\s+([a-z][a-z\s]{2,18}?)\s+se\s+(?:hoon|hun|hu|aaya|aayi)\b/i)
      || t.match(/\bi(?:'m| am)?\s*(?:come\s+)?from\s+([a-z][a-z\s]{2,18}?)\s*[.!,]?\s*$/i)
    if (m) { profile.from = m[1].trim(); changed = true }
  }
  if (changed) writeJSON('passport_profile', profile)
}

// ---------------------------------------------------------------------------
// per-resident memory
// ---------------------------------------------------------------------------
const memories = readJSON('passport_memory', {})
export function memoryOf(id) { return memories[id] || [] }

// ---------------------------------------------------------------------------
// Residents are agents, not transcripts. Beside the raw turns, each keeps a
// short standing impression of the player that survives between visits, plus
// when they last saw them and how often. That is what lets Rosa open with
// "you again" on the fifth visit instead of replaying one authored line
// forever, and it is small enough to ride along in every prompt for free.
// ---------------------------------------------------------------------------
const impressions = readJSON('passport_impressions', {})

export function impressionOf(id) { return impressions[id] || null }

function saveImpression(id, patch) {
  impressions[id] = Object.assign({}, impressions[id], patch)
  writeJSON('passport_impressions', impressions)
}

export function markSeen(id) {
  const prev = impressionOf(id)
  saveImpression(id, { lastSeen: Date.now(), visits: (prev && prev.visits || 0) + 1 })
}

// Distil what this resident now thinks of the player. One cheap call at the
// END of a conversation, so the player never waits on it.
export async function updateImpression(r) {
  const past = memoryOf(r.id)
  if (past.length < 2 || !hasLLM()) return
  const prev = impressionOf(r.id)
  const lines = past.slice(-6).map(t => 'They: ' + t.p + ' | You: ' + t.r).join(' // ')
  const sys = 'You are ' + r.name + ', ' + r.role + ' in Pueblo. Summarise what you now think of the foreigner you have been talking to, for your own memory. ONE line, under 25 words, in English, written as your private impression: what they are like, what they wanted, what they are bad at, how you feel about them. Blunt and specific. No preamble.'
  const ask2 = (prev && prev.note ? 'What you thought before: ' + prev.note + ' // ' : '') +
    'Latest conversation: ' + lines + ' // Your updated one-line impression:'
  try {
    const data = await callModel({
      systemInstruction: { parts: [{ text: sys }] },
      contents: [{ role: 'user', parts: [{ text: ask2 }] }],
      generationConfig: { maxOutputTokens: 60, temperature: 0.7 },
    })
    let note = String(data || '').trim()
    note = note.replace(/^["']|["']$/g, '').split(String.fromCharCode(10))[0].slice(0, 160)
    if (note) saveImpression(r.id, { note })
  } catch (e) { /* an impression is a nicety; never surface a failure */ }
}

// The first thing they say when you walk up. The authored line stands on the
// very first meeting because it establishes who they are; after that the
// greeting is generated from what they remember, so no two visits open alike.
export async function openingLine(r) {
  const past = memoryOf(r.id)
  const imp = impressionOf(r.id)
  if (!past.length || !hasLLM()) return null
  const mins = imp && imp.lastSeen ? Math.round((Date.now() - imp.lastSeen) / 60000) : null
  const last = past[past.length - 1]

  // Deliberately NOT the full resident prompt: that one is written to sustain a
  // whole conversation, and against a short output cap the model just returned
  // an empty part. A tight brief produces a better greeting for a fraction of
  // the tokens.
  const sys = [
    'You are ' + r.name + ', ' + r.age + ', ' + r.role + ' in Pueblo. ' + (r.persona || ''),
    r.agenda ? 'On your mind today: ' + r.agenda : '',
    'Someone you have met before has just walked up to you again.',
    'Greet them in ONE short sentence of romanized Hindi (Latin letters, never Devanagari).',
    'React to the fact that they are BACK - do not use a generic opening line, and do not repeat what you said last time.',
    'No emoji, no asterisks, no stage directions, no English.',
  ].filter(Boolean).join(' ')

  const facts = [
    'This is visit number ' + ((imp && imp.visits || 1) + 1) + '.',
    mins !== null && mins < 600 ? 'It has been about ' + mins + ' minute(s) since you last spoke.' : '',
    imp && imp.note ? 'What you think of them: ' + imp.note : '',
    'Last time they said: "' + last.p + '"',
    'and you answered: "' + last.r + '"',
    profileLine(),
  ].filter(Boolean).join(' ')

  try {
    const data = await callModel({
      systemInstruction: { parts: [{ text: sys }] },
      contents: [{ role: 'user', parts: [{ text: facts + ' Now greet them.' }] }],
      generationConfig: { maxOutputTokens: 200, temperature: 1.1 },
    })
    // callModel already returns the extracted text, not the API envelope.
    const out = sanitise(String(data || ''), { sentences: 1, stage: true })
    return out && out.trim() ? out.trim() : null
  } catch (e) { return null }
}

// What the town has picked up about the player, in one clause.
function profileLine() {
  const name = profile && profile.name ? 'Their name is ' + profile.name + '.' : ''
  return name
}

// The coach pane is a separate conversation, but Marco is not blind: he sees
// the street. This is what lets "what did Rosa just say?" actually work.
let lastTalk = null

function remember(id, turn) {
  if (!memories[id]) memories[id] = []
  memories[id].push(turn)
  if (memories[id].length > 24) memories[id] = memories[id].slice(-24)
  writeJSON('passport_memory', memories)
}

export function forgetAll() {
  localStorage.removeItem('passport_memory')
  localStorage.removeItem('passport_impressions')
  localStorage.removeItem('passport_learner')
  localStorage.removeItem('passport_profile')
  location.reload()
}

function readJSON(k, dflt) {
  try { return JSON.parse(localStorage.getItem(k) || 'null') || dflt } catch { return dflt }
}
function writeJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ }
}

// ---------------------------------------------------------------------------
// output hygiene — the model is a guest in this town, not the author of it
// ---------------------------------------------------------------------------

// Last resort only: the prompt asks for Latin script and the model complies,
// but a learner who cannot read Devanagari must never be shown a wall of it.
const DEVA_C = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'ळ': 'l',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f',
}
const DEVA_V = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऑ': 'o', 'ऍ': 'e',
}
const DEVA_M = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o', 'ॅ': 'e',
}

export function romanize(s) {
  if (!/[ऀ-ॿ]/.test(s)) return s
  let out = ''
  for (let i = 0; i < s.length; i++) {
    let ch = s[i]
    if (s[i + 1] === '़' && DEVA_C[ch + '़']) { ch = ch + '़'; i++ }
    if (DEVA_C[ch]) {
      out += DEVA_C[ch]
      const nx = s[i + 1]
      if (nx === '्') i++                              // virama: bare consonant
      else if (DEVA_M[nx]) { out += DEVA_M[nx]; i++ }  // matra
      // inherent vowel, minus the schwa Hindi drops at the end of a word:
      // "theek", not "theeka"
      else if (nx && /[ऀ-ॿ]/.test(nx)) out += 'a'
      continue
    }
    if (DEVA_V[ch]) { out += DEVA_V[ch]; continue }
    if (DEVA_M[ch]) { out += DEVA_M[ch]; continue }
    if (ch === 'ं' || ch === 'ँ') { out += 'n'; continue }
    if (ch === 'ः') { out += 'h'; continue }
    if (ch === '्') continue
    if (ch === '।' || ch === '॥') { out += '.'; continue }
    if (ch >= '०' && ch <= '९') { out += String(ch.charCodeAt(0) - 0x0966); continue }
    if (ch >= 'ऀ' && ch <= 'ॿ') continue     // anything exotic: drop
    out += ch
  }
  return out.replace(/\s+/g, ' ').trim()
}

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{20E3}]/gu

const NAME_BADGE = /^\s*(marco|rosa|pilar|tom[aá]s|do[nñ]a carmen|carmen|miguel|luc[ií]a|padre(?: antonio)?|antonio)\s*:\s*/i

function sanitise(text, { sentences = 3, maxChars = 260, stage = true } = {}) {
  // Transliterate FIRST. An earlier version stripped Devanagari here, which
  // made romanize() dead code and silently deleted the Hindi from mixed
  // replies. Strip only what survives transliteration.
  let s = romanize(String(text || ''))
  s = s.replace(/[\u0900-\u097F]+/g, '').replace(/\s{2,}/g, ' ')
  s = s.replace(/```[\s\S]*?```/g, ' ')
  if (stage) s = s.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')  // stage directions / glosses
  s = s.replace(/\*+([^*]*)\*+/g, '$1')           // *shrugs*, **bold**
  s = s.replace(/[_*#>]/g, '')
  s = s.replace(EMOJI, '')
  s = s.replace(NAME_BADGE, '')                   // a "Rosa:" name badge
  s = s.replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
  s = s.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim()
  const parts = s.split(/(?<=[.!?…])\s+/).filter(Boolean)
  if (parts.length > sentences) s = parts.slice(0, sentences).join(' ')
  if (s.length > maxChars) {
    const cut = s.slice(0, maxChars)
    const stop = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'))
    s = (stop > 60 ? cut.slice(0, stop + 1) : cut.trim() + '...').trim()
  }
  // Marco hands over quoted phrases to go and say; a cut that swallows the
  // closing quote leaves the player holding half a sentence.
  if ((s.match(/"/g) || []).length % 2) s += '"'
  return s
}

// ---------------------------------------------------------------------------
// the prompt
// ---------------------------------------------------------------------------

// The profile as it stood BEFORE this turn. Without the snapshot, a resident
// told "mera naam Sam hai" answers "of course I knew your name" — because by
// then noteProfile had already filed it under things the town knows.
let known = { ...profile }

function whoTheyAre() {
  const bits = []
  if (known.name) bits.push(`Their name is ${known.name} — word gets around a town this size, so use it`)
  if (known.from) bits.push(`they said they come from ${known.from}`)
  return bits.length ? bits.join('; ') + '.' : ''
}

function systemPrompt(r, mission, extra = {}) {
  if (r.id === 'coach') return coachInStreetPrompt(r, mission, extra)
  const past = memoryOf(r.id)
  const older = past.length - HIST_TURNS
  const history = past.length === 0
    ? 'You are meeting this foreigner for the first time. Word went round that someone new arrived; you are curious, and a little wary.'
    : `You have spoken with them ${past.length} time${past.length > 1 ? 's' : ''} before.${older > 0 ? ' The oldest exchanges are no longer in front of you, but do not act like strangers.' : ''} Pick up where you left off and refer back to what they told you.`

  return `You are ${r.name}, ${r.age}, ${r.role} in Pueblo, a small coastal town. Everyone here speaks Hindi; it is simply the town's language and you never remark on that.

YOU
${r.persona}
${r.backstory ? `Your life: ${r.backstory}\n` : ''}${r.goal ? `What you want: ${r.goal}\n` : ''}${r.relationships ? `Your people: ${r.relationships}\n` : ''}${r.doing ? `Right now: ${r.doing}.\n` : ''}${r.agenda ? `On your mind today: ${r.agenda}.` : ''}

THEM
A foreigner learning Hindi, roughly ${learner.level}. ${whoTheyAre()} ${history}${impressionOf(r.id) && impressionOf(r.id).note ? `\nWhat you already think of them: ${impressionOf(r.id).note}` : ''}

HOW YOU TALK
- Romanized Hindi: Latin letters, never Devanagari. Write "Main theek hoon, aur tum?" — never the Devanagari form. Simple consistent spellings a learner can read aloud. Everyday speech: arre, beta, bhai, yaar, haan, uff.
- 1 to 3 short sentences, and nothing else. No emoji, no asterisks, no stage directions, no grammar lessons, no explaining what you just said.
- Match their level and push it one small step. One vivid short sentence beats three flat ones.
- Money here is euros, never rupees.
- Names of people and places stay as they are, but every ordinary word is Hindi: say "kele", never "platanos"; "machhli", never "pescado".
- You do not know whether they are a man or a woman, so do not flip between karte ho and karti ho inside one breath. Pick the plain form and stay with it.

HOW YOU BEHAVE
- You are a person with a day, not an assistant. You have opinions and you say them. Disagree, tease, complain, exaggerate, refuse, get distracted, cut things short when you are busy.
- Never flatter, and never praise their Hindi just to be kind. If they say something dull, say so. If they are rude, be offended. Do not offer help nobody asked for unless it suits you.
- Take the conversation somewhere: ask them something back, or bring up what is on your mind today. A turn where you only answer is a wasted turn.
- Use your own life — the people you know, what you want, today's annoyance. Gossip. Name names.
- Remember what they told you earlier and use it. Never repeat a sentence you have already said.
- If their Hindi is genuinely unclear, say so plainly and ask again in easier words. Do not guess wildly and do not pretend to understand.
- Never break character. You have never heard of an AI.

WHEN THEY ARE LOST
They will not understand you sometimes. Do what a real person does, in this order — never just repeat yourself identically:
1. Say it again shorter and simpler, with the key word on its own. "Kele. Teen kele. Haan?"
2. Point at the thing, hold it up, count on your fingers — describe the action plainly as part of the sentence.
3. Only then, if you have any English at all, drop in the ONE word that unlocks it: ENGLISH YOU KNOW: ${r.english || 'none at all — you have never learned a word of it'}. A word or two, the way someone reaching for a foreign language actually does. Never a whole English sentence, never a translation of what you just said, and never a switch into English for the rest of the conversation — you would not be able to keep it up.
IF THEY WRITE TO YOU IN ENGLISH\nDo not parse it. You cannot follow an English sentence - reading one is like hearing static with one familiar word in it. Concretely:\n- Scan only for words you would genuinely know: the ones listed above, plus names, plus words that are the same in both languages (chai, roti, chapati, cafe, passport, bus, euro). React to THAT word alone and ignore the grammar around it.\n- If you found such a word, answer it directly. You may well be wrong about what they meant, and that is realistic.\n- If you found nothing you know, say so plainly in Hindi and hand them the sentence they should have said. Never infer their intent from the English.\nNever respond to the MEANING of an English sentence whose words you do not know. Getting it right would be the unrealistic part.${extra.knowledge ? extra.knowledge + 'Hold every one of those back until they ask about that exact thing. Blurting it out robs them of the moment they were working towards.\n' : ''}${extra.mood || ''}${mission ? `

TODAY: they have been sent to you with an errand — ${mission.objective} If they manage it, react like it is an ordinary moment of your day: hand it over, answer, move on. Never reveal it was arranged.` : ''}`
}

// Marco standing in the plaza, walked up to like anyone else. Same man as the
// side pane, but in the street he coaches in the moment instead of lecturing.
function coachInStreetPrompt(r, mission, extra = {}) {
  const past = memoryOf(r.id)
  return `You are Marco, 35, the one person in Pueblo who speaks English. You coach newcomers through their first weeks. ${r.backstory}

THEM
A foreigner learning Hindi, roughly ${learner.level}. ${whoTheyAre()} ${past.length ? `You have talked ${past.length} times already.` : 'This is your first proper conversation.'} They are TYPING to you, not speaking aloud — never comment on how their voice sounded, their accent, or their pronunciation, because you cannot hear it.

EVERYONE WHO LIVES HERE — these are the ONLY people in Pueblo. Never invent a resident, a shop, or a stall; sending them to someone who does not exist is the worst thing you can do to them.
- Pilar: fruit stall on the east side of the plaza
- Rosa: the bakery, north of the plaza
- Tomas: fishmonger, the market row
- Dona Carmen: elderly neighbour, watches the west street from her chair
- Miguel: waiter at the cafe on the west side
- Lucia: nine years old, plays in the plaza with her dog Chispa
- Padre Antonio: the priest, at the church

YOUR ONE JOB
Answer the question they actually asked, in plain English, before anything else. If they ask "do I say it in Hindi?" the answer is yes plus the exact sentence. If they ask what a word means, tell them. If they are confused, unconfuse them. You are the safety net in a town where nobody else speaks their language — being unhelpful is the only way you can fail them.
${mission ? `
THEIR ERRAND RIGHT NOW: ${mission.brief}
The sentence that works: ${mission.hint}
Give them THAT sentence when they need a phrase. Never invent a different errand, a different shopkeeper, or a different thing to buy — it sends them across town for nothing.` : `
They have no errand outstanding. Suggest someone worth talking to and give them an opening line.`}

HOW YOU TALK
- English, warm and direct, plus the exact romanized Hindi they should say (Latin letters, e.g. "mujhe teen kele chahiye" — never Devanagari).
- 1 to 3 sentences. No emoji, no asterisks, no stage directions, no grammar lectures.
- Encouraging. You can be dry or funny, but never dismissive, never insulting, and never refuse to help. "Stop asking me" is exactly the wrong answer — they asked because they are lost.
- Your own life (the language cafe you are saving for, your father, Manchester) is background. Mention it only if they ask, or in one short aside — never instead of answering.${extra.mood || ''}`
}

async function callGemini(r, text, mission, extra) {
  const past = memoryOf(r.id).slice(-HIST_TURNS)
  const history = past.flatMap(t => ([
    { role: 'user', parts: [{ text: t.p }] },
    { role: 'model', parts: [{ text: t.r }] },
  ]))
  const limit = r.id === 'coach' ? 4 : 3
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt(r, mission, extra) }] },
    contents: [...history, { role: 'user', parts: [{ text }] }],
    generationConfig: {
      maxOutputTokens: modelNeedsHeadroom() ? 800 : (r.id === 'coach' ? 200 : 150),
      temperature: 1.0,
    },
  }
  const clean = t => sanitise(t, { sentences: limit, stage: r.id !== 'coach' })
  let out = clean(await callModel(body))
  // A resident repeating itself verbatim is the exact failure this rewrite is
  // about. One nudge, once — never a loop.
  const prev = past.length ? past[past.length - 1].r : ''
  if (out && out === prev) {
    body.generationConfig.temperature = 1.3
    body.contents = [...body.contents, {
      role: 'user',
      parts: [{ text: '(You just said that. Say something different and move the conversation on.)' }],
    }]
    out = clean(await callModel(body))
  }
  if (!out) throw new Error('empty after clean')
  return out
}

// ---------------------------------------------------------------------------
// the scripted brain
//
// This is what plays on GitHub Pages, so it gets to be more than one canned
// line per resident. Three rules: work out what the topic is, answer it in
// this resident's own voice, and never say the same thing twice running.
// ---------------------------------------------------------------------------

// Order is precedence, and it is the whole design. Two rules earn their keep:
// a subject beats a question word ("aapke pati kahan hain" is about Paco, not
// about directions), and a greeting is the WEAKEST signal in a sentence, so it
// sits last ("namaste, mujhe teen kele chahiye" is a request, not a hello).
const TOPICS = [
  ['bye', /\b(alvida|phir milenge|chalta hoon|chalti hoon|chalte hain|bye|goodbye|see you|shubh ratri|good ?night)\b/i],
  ['thanks', /\b(shukriya|dhanyavad|dhanyawad|thanks|thank you|thnx)\b/i],
  ['sorry', /\b(maaf|maafi|sorry|galti|excuse me)\b/i],
  ['name', /\b(naam|name)\b/i],
  ['family', /\b(parivaar|pariwar|family|bachche|bacche|bachchon|beti|bete|patni|pati|shaadi|shadi|maa|papa|pitaji|behen|kids|children|wife|husband|married)\b/i],
  ['work', /\b(kaam|naukri|job|work|dhandha|business|dukaan|stall|kya karte|kya karti)\b/i],
  ['town', /\b(sheher|shehar|shahar|gaon|kasba|town|village|pueblo|log kaise|city)\b/i],
  ['how', /\b(kaise ho|kaisi ho|kaise hain|kaisi hain|kya haal|kya hal|sab theek|how are you|you ok)\b/i],
  ['price', /\b(kitna|kitne|daam|keemat|kimat|paise|paisa|price|cost|euro|sasta|mehnga|kharid)\b/i],
  ['where', /\b(kahan|kaha|kidhar|raasta|rasta|jaana hai|jaun|jaoon|where|which way|kis taraf|door hai)\b/i],
  ['weather', /\b(mausam|garmi|sardi|thand|barish|baarish|dhoop|hawa|weather|hot|cold|rain|sunny|sardiyan)\b/i],
  ['food', /\b(khana|khaana|bhookh|bhook|roti|machhli|machli|phal|kela|kele|santra|chai|coffee|food|hungry|eat|paani)\b/i],
  ['help', /\b(madad|help|mushkil|pareshan|problem|kho gaya|khoya|khoyi|lost|passport|bag|saman|samaan)\b/i],
  ['greet', /\b(namaste|namaskar|suprabhat|salaam|hello|hi|hey|good morning|good evening|buenas|hola)\b/i],
]
const REQUEST = /\b(chahiye|de do|dedo|de dijiye|dijiye|dena|do na|lena hai|kharidna|i want|give me|can i have|quiero)\b/i
const QUESTION = /\?|\b(kya|kyun|kyu|kaun|kaise|kab|kahan|kitna|kitne|what|why|who|how|when|where)\b/i
// A rough "did they even try Hindi" test. If nothing here matches and it was
// not a one-word grunt, honest confusion beats a confident non-answer.
const HINDI_HINT = /\b(main|mai|mera|meri|mere|mujhe|tum|tumhara|tumhari|aap|aapka|aapki|hai|hain|hoon|hun|ho|kya|kyun|kaise|kahan|kitna|kitne|nahi|nahin|haan|han|accha|achha|theek|thik|bahut|thoda|ek|do|teen|char|paanch|chahiye|karo|karta|karti|jao|aao|dena|lena|dekho|suno|bolo|beta|bhai|yaar|arre|namaste|shukriya|phir|abhi|aaj|kal|yahan|wahan|ye|yeh|wo|woh|se|ko|ka|ki|ke|mein|par|aur|bhi|toh|matlab)\b/i

const LINES = {
  coach: {
    greet: ['Hey! How is it going out there?', 'There you are. Survived the market?'],
    how: ['Good — better now you are actually talking to people.', 'Fine. Coffee number three. What did you break?'],
    name: ['Marco. Born here, six years in Manchester, back for good.', 'Marco — and yes, I am the only one here who answers you in English.'],
    work: ['I coach newcomers. No money in it. The plan is a language cafe on the beach.', 'Officially nothing. Unofficially I stop foreigners drowning.'],
    family: ['My father is here, better now, thank God. That is why I came back.', 'No kids. Rosa fed me after school though, so she counts.'],
    town: ['Small, loud, everyone knows your business by lunch. You will like it.', 'Pueblo is the kind of place where the fishmonger lectures you about ambition.'],
    weather: ['Same as yesterday. That is rather the point of here.', 'Warm. Take water to the market or Pilar will comment on your face.'],
    price: ['Ask them, not me. Say: "yeh kitne ka hai?"', 'Prices? "Kitna hai?" Three words. Go and use them.'],
    where: ['Plaza is the middle of everything. Market east, bakery north, church up the steps.', 'Say "kahan hai?" and point. They will walk you there themselves, that is the town.'],
    food: ['Pilar has the fruit stall, east side. Three bananas: "mujhe teen kele chahiye".', 'Rosa\'s bread, north of the plaza. Go before noon or it is gone.'],
    help: ['Right — breathe. Tell me what happened and I will give you the sentence for it.', 'That is what I am for. What exactly went wrong out there?'],
    thanks: ['Anytime. Literally my job.', 'Do not thank me, go and use it on someone.'],
    sorry: ['Nothing to apologise for. Everyone sounds terrible for a month.', 'Relax. I sounded far worse in Manchester, I promise you.'],
    bye: ['Go on. Talk to someone real.', 'See you. Come back with a story.'],
    request: ['Say that to them, not to me. I am not the one selling.', 'Good sentence. Now say it to Pilar\'s face.'],
    question: ['Ask them in Hindi and find out — that is the whole game.', 'Depends who you ask. Try Rosa, she likes questions.'],
    confused: ['Say that again, slower?', 'You lost me. What are you trying to do?', 'Hmm. Give me the whole sentence.'],
    short: ['Give me a bit more than that and I can actually help.', 'And? Finish the thought.'],
    default: ['Good. Now go say that to someone who does not speak English.', 'That will work out there. Try it.'],
  },
  pilar: {
    greet: ['Namaste beta! Aaj kya doon?', 'Aao aao, taaza maal hai. Kya chahiye?'],
    how: ['Theek hoon, par tamatar mat poochna. Iss hafte ka maal bekaar aaya hai.', 'Zinda hoon. Subah paanch baje se khadi hoon. Tum batao.'],
    name: ['Pilar. Ye stall meri nani ka tha, ab mera hai.', 'Main Pilar hoon. Sabse acche kele mere paas milte hain.'],
    work: ['Teen peedhi se yahi stall. Nani ne ek tokri se shuru kiya tha.', 'Phal bechti hoon, subah se shaam tak. Chhutti kya hoti hai, bhool gayi.'],
    family: ['Do bachche hain. Beti Sevilla mein engineering padhna chahti hai... dekhte hain.', 'Beti mujhse zyada hoshiyar hai. Stall lene se saaf mana kar deti hai.'],
    town: ['Chhota sheher hai, sab ek dusre ke kaam mein taang adaate hain. Aadat ho jayegi.', 'Sab theek hai yahan, bas Tomas ki awaaz zaroorat se zyada hai.'],
    weather: ['Garmi bahut hai, phal jaldi kharab hote hain. Chhaon ke liye Tomas se ladti rehti hoon.', 'Aaj dhoop tez hai. Paani peete raho beta.'],
    price: ['Kele do euro kilo, santre dedh. Tumhare liye thoda kam kar dungi.', 'Sasta hai. Kahin aur poochh ke aao, phir samajh aayega.'],
    where: ['Seedhe jao, plaza aa jayega. Roti chahiye toh Rosa uttar mein hai.', 'Machhli? Tomas ke paas, samne wali line mein. Awaaz se mil jayega.'],
    food: ['Kele lo, ekdum meethe hain. Do abhi khao, do baad ke liye.', 'Bhookh lagi hai? Santra khao, iss garmi mein sabse accha.'],
    help: ['Bolo beta, kya hua? Par jaldi, grahak khade hain.', 'Madad? Marco se milo, wo angrezi bolta hai. Main sirf phal de sakti hoon.'],
    thanks: ['Arre koi baat nahi, phir aana.', 'Bas bas, shukriya se pet nahi bharta. Kela lo.'],
    sorry: ['Chhodo beta, itni si baat. Kaam ki baat karo.', 'Maafi kis baat ki? Mujhe grahak chahiye, maafi nahi.'],
    bye: ['Jao jao, kal phir aana.', 'Alvida beta. Kele khatam ho jaayein toh wapas aana.'],
    request: ['Ye lo. Aur kuch?', 'Abhi deti hoon. Kitne chahiye?'],
    question: ['Kele hain, santre hain, tamatar hain... tamatar chhodo, baaki sab badhiya.', 'Poochhna hai toh poochho, par haath chalta rahega.'],
    confused: ['Kya? Phir se bolo, saaf saaf.', 'Samajh nahi aaya beta. Dobara bolo.', 'Ishaaron se nahi bechti main. Shabd bolo.'],
    short: ['Kya? Bol ke batao beta.', 'Itna hi? Aur bolo.'],
    default: ['Hmm. Ye haan hai ya na?', 'Accha... aur? Kuch lena bhi hai?'],
  },
  rosa: {
    greet: ['Suprabhat beta! Aaj kya doon?', 'Aao aao, roti abhi nikli hai.'],
    how: ['Theek hoon. Paanch baje se kaam kar rahi hoon, ab thodi thak gayi.', 'Chal rahi hoon beta. Kuch baatein dil pe rehti hain, par kaam se aaram milta hai.'],
    name: ['Rosa. Ye bakery tees saal se meri hai.', 'Main Rosa hoon. Naam yaad rakhna, roz milna hai.'],
    work: ['Paanch baje uthti hoon, roti banati hoon. Isi ne mujhe zinda rakha hai.', '2019 mein meri roti ko inaam mila tha. Wo peeche laga hai, dekh lena.'],
    family: ['Mera pati Paco samundar mein gaya tha, aath saal ho gaye. Bas bakery bachi hai.', 'Ek behen hai, Marisol, agle sheher mein. Do saal se baat nahi hui. Tum apne ghar phone karte ho na?'],
    town: ['Accha sheher hai, log dil ke acche hain. Bas baatein bahut karte hain.', 'Yahan sab ek dusre ko jaante hain. Accha bhi hai, bura bhi.'],
    weather: ['Garmi mein aata jaldi phoolta hai, mera kaam aasan ho jaata hai.', 'Aaj thanda hai. Garam roti lo, achhi lagegi.'],
    price: ['Ek roti ek euro. Tumhare liye... chalo, garam wali muft.', 'Zyada nahi beta. Paise baad mein, pehle khao.'],
    where: ['Plaza seedha uss taraf. Girja upar, seedhiyon ke paas.', 'Bazaar poorab mein hai. Pilar meri dost hai, uska stall dhoondh lena.'],
    food: ['Bahut patle ho. Ye roti lo, abhi khao, mere saamne.', 'Khaana khaya? Sach bolo. Nahi khaya toh do roti bandh deti hoon.'],
    help: ['Bolo beta, kya pareshani hai? Pehle baith jao.', 'Kya hua? Pareshan mat ho, roti khao, phir batao.'],
    thanks: ['Koi baat nahi beta. Kal phir aana.', 'Bas bas. Khaate raho, wahi shukriya hai.'],
    sorry: ['Arre isme maafi kaisi. Baith jao.', 'Chhodo beta. Meri behen ko bhi maafi bolni chahiye thi, boli nahi.'],
    bye: ['Jao beta, sambhal ke. Kal subah phir aana.', 'Alvida. Apne ghar phone karna, sun rahe ho?'],
    request: ['Abhi laayi. Aur kuch chahiye?', 'Ye lo, garam hai. Thoda aur doon?'],
    question: ['Poochho poochho. Bas aata gundte gundte jawab dungi.', 'Hmm, ye sawaal accha hai. Marco se bhi poochhna, usko sab pata hai.'],
    confused: ['Samajh nahi aaya beta, phir se bolo?', 'Dheere bolo, aur thoda saaf.', 'Kya matlab? Aasan shabdon mein batao.'],
    short: ['Haan...? Aur bolo, main kaat-ti nahi.', 'Bas itna? Poora bolo beta.'],
    default: ['Accha accha. Lo, garam roti.', 'Hmm. Aur batao beta, ghar mein sab theek?'],
  },
  tomas: {
    greet: ['Arre boss, aao aao! Taazi machhli chahiye?', 'Kaun aaya! Main chaar baje se khada hoon, dekho.'],
    how: ['Zabardast! Chaar baje utha tha, ab bhi khada hoon. Aur tum?', 'Theek hoon boss, bas bandargah ki nayi fees ne kamar tod di.'],
    name: ['Tomas! Chauthi peedhi ka machhli wala.', 'Tomas naam hai. Poori mandi mein poochh lo.'],
    work: ['Machhli bechta hoon, bachpan se. Nau saal ka tha jab pehli baar naav pe gaya.', 'Chaar baje samundar, aath baje stall. Yahi zindagi hai boss.'],
    family: ['Meri patni Encarna hisaab dekhti hai. Usse main kabhi badha ke nahi bolta, wo check karti hai.', 'Bete ke liye doosri naav chahiye. Warna wo bhi sheher chala jayega, sabke bacchon ki tarah.'],
    town: ['Accha sheher hai boss, par bandargah wale hume loot rahe hain.', 'Sab theek hai. Bas Pilar se chhaon ki ladai pandrah saal se chal rahi hai.'],
    weather: ['Aaj samundar shaant tha, isliye itni machhli. Kal hawa thi, kuch nahi mila.', 'Garmi hai boss, machhli par barf daalta rehta hoon.'],
    price: ['Barah euro kilo. Chaunk gaye? Pehle bandargah ki fees dekho.', 'Tumhare liye das. Par kisi ko batana mat.'],
    where: ['Samundar? Us taraf, seedhe neeche. Awaaz se pata chal jayega.', 'Plaza peeche hai boss. Roti chahiye toh Rosa ke paas jao, uttar mein.'],
    food: ['Ye machhli lo, subah pakdi hui. Tel mein bhoon lo, bas.', 'Bhookh lagi hai? Chhoti wali le jao, sabse taazi hai.'],
    help: ['Bolo boss, kya hua? Machhli ke alawa bhi kaam aa sakta hoon.', 'Kya pareshani hai? Zor se bolo, yahan shor hai.'],
    thanks: ['Arre tumhara shukriya, champion!', 'Bas bas boss. Kal phir aana.'],
    sorry: ['Chhodo boss, samundar isse badi galtiyan maaf karta hai.', 'Arre kya maafi. Machhli lo, hisaab barabar.'],
    bye: ['Jao boss! Kal machhli aur badi hogi!', 'Alvida champion. Ghar ja ke pakaana!'],
    request: ['Abhi lo boss! Aur kuch?', 'Ye lo, ekdum taazi. Kitni doon?'],
    question: ['Dekho bhai, wo toh din pe depend karta hai. Aur hawa pe.', 'Poochh lo, par jawab lamba hoga. Main chhota nahi bolta.'],
    confused: ['Hain? Zor se bolo boss, yahan shor hai.', 'Kya kaha? Ek kaan barah saal se theek nahi.', 'Samajh nahi aaya. Phir se, dheere.'],
    short: ['Hain? Poora bolo boss.', 'Itna hi? Aur sunao.'],
    default: ['Kasam se, itni badi machhli zindagi mein nahi dekhi.', 'Haan haan boss, tum bolo. Main sun raha hoon.'],
  },
  carmen: {
    greet: ['Namaste. Tum hi naye ho na?', 'Aa gaye. Main tumhe kal bhi plaza mein dekh rahi thi.'],
    how: ['Kaise rahoongi? Teesri manzil wale raat teen baje tak shor karte hain.', 'Theek hoon. Umar ho gayi, par aankhein abhi bhi tez hain.'],
    name: ['Carmen. Dona Carmen, agar tameez seekh rahe ho toh.', 'Main Carmen hoon. Chalis saal iss sheher ke bacchon ko padhaya hai.'],
    work: ['Chalis saal school mein padhaya. Aadha sheher mera shagird hai, Marco bhi.', 'Ab bas yahan baithti hoon aur dekhti hoon. Ye bhi ek kaam hai.'],
    family: ['Do baar shaadi hui, dono chale gaye. Main abhi bhi yahin hoon.', 'Mere doosre pati ne ye ghar nazaare ke liye liya tha. Maine nigrani ke liye.'],
    town: ['Sheher badal gaya hai. Pehle log namaste karke nikalte the.', 'Sab theek hai, bas teesri manzil wale insaan nahi hain.'],
    weather: ['Hawa chal rahi hai. Mere ghutne mujhe mausam pehle bata dete hain.', 'Dhoop tez hai. Topi pehna karo, apna rang dekha hai tumne?'],
    price: ['Main kuch bechti nahi beta. Par Pilar tumse zyada le rahi hai, ye pakka.', 'Daam? Sabse sasta aur sabse accha Rosa ke paas hai.'],
    where: ['Girja seedhiyon ke upar. Padre wahin jhaadu lagate rehte hain.', 'Bazaar poorab mein. Kho jao toh awaaz sun lena, Tomas hamesha chillata rehta hai.'],
    food: ['Rosa ke paas jao. Baaki jagah ka khana theek nahi.', 'Patle ho. Rosa se roti lo, mera naam le dena.'],
    help: ['Bolo. Iss sheher mein jo hota hai, mujhe pata hota hai.', 'Kya hua? Dhyan se batao, main baat aage nahi badhaungi... shayad.'],
    thanks: ['Hmm. Kam se kam tameez toh hai.', 'Theek hai. Yahi aadat rakhna.'],
    sorry: ['Maafi maang lete ho, achhi baat hai. Yahan koi nahi maangta.', 'Hmm. Dobara mat karna, bas.'],
    bye: ['Jao. Main yahin hoon, hamesha ki tarah.', 'Alvida. Teesri manzil walon se door rehna.'],
    request: ['Arre beta, main yahan kuch bechti nahi.', 'Mujhse maang rahe ho? Bazaar udhar hai.'],
    question: ['Arre, naye ho ke bade sawaal poochte ho.', 'Poochho. Par pehle tum batao, rehte kahan ho?'],
    confused: ['Kya? Saaf bolo beta.', 'Samajh nahi aaya. Aur dheere, main unnasi ki hoon.', 'Phir se bolo. Mooh se, haath se nahi.'],
    short: ['Kya? Poora vaakya bolo.', 'Itna hi? Aur?'],
    default: ['Accha. Main kuch nahi kehti, par mujhe sab pata hai.', 'Hmm. Dekhte hain tum kaise nikalte ho.'],
  },
  miguel: {
    greet: ['Aao... ek ke liye table?', 'Arre yaar, aa gaye. Baitho, abhi aaya.'],
    how: ['Theek hoon yaar. Bas shift lambi hai.', 'Chal raha hai. Kal futsal mein do goal maare the, waise.'],
    name: ['Miguel. Milke accha laga yaar.', 'Main Miguel. Yahan chaar saal se hoon... ye temporary kaam hai.'],
    work: ['Waiter hoon. Do saal Malaga mein business padha tha, phir wapas aa gaya.', 'Ye kaam temporary hai. Chaar saal se temporary hai.'],
    family: ['Ghar yahin hai. Sab yahin hain, wahi toh problem hai.', 'Shaadi nahi hui. Ek ladki hai... chhodo, baat mat karo.'],
    town: ['Chhota hai yaar. Log acche hain, par hota kuch nahi yahan.', 'Madrid jaane ka plan hai, dost wahan bar chalata hai. Bas... agle saal.'],
    weather: ['Accha mausam hai. Isi ki wajah se log yahan ruk jaate hain.', 'Garmi hai. Thandi cheez laun?'],
    price: ['Chai do euro, coffee dedh. Baith ke piyo toh utna hi.', 'Sasta hai yaar. Yahan sab sasta hai, salary bhi.'],
    where: ['Us taraf... nahi ruko. Plaza se ulta jao, phir daayein. Shayad.', 'Bazaar poorab mein. Mujhse raasta mat poochho, main galat batata hoon.'],
    food: ['Menu chhota hai par sab accha hai. Machhli lo.', 'Bhookh? Rosa ki roti aur Tomas ki machhli. Bas, itna hi chahiye.'],
    help: ['Bolo yaar, kya chahiye. Waise Marco se poochho, wo behtar hai.', 'Kya hua? Baitho, chai peete hain, phir batao.'],
    thanks: ['Arre kuch nahi. Aur kuch?', 'Koi baat nahi yaar.'],
    sorry: ['Chhodo yaar, kaun dekh raha hai.', 'Arre isme kya sorry. Baitho.'],
    bye: ['Theek hai, phir milte hain. Baad mein aana.', 'Chalo. Shaam ko yahin milna.'],
    request: ['Abhi laaya. Yahin piyoge?', 'Ho jayega. Do minute.'],
    question: ['Uff, accha sawaal hai. Cutting chai, bina shak.', 'Pata nahi yaar. Poochh ke bataunga... shayad.'],
    confused: ['Hain?', 'Samajh nahi aaya yaar, phir se bolo.', 'Kya? Thoda dheere, shor hai.'],
    short: ['Hain? Aur bolo.', 'Matlab?'],
    default: ['Theek hai theek hai... abhi laata hoon.', 'Haan yaar, bilkul. Aur sunao.'],
  },
  lucia: {
    greet: ['Hello hello! Kheloge?', 'Aa gaye! Aaj Chispa ne baithna seekha... nahi seekha.'],
    how: ['Main badhiya hoon! Chispa bhi! Tum theek ho?', 'Accha hoon! Aaj school nahi tha!'],
    name: ['Main Lucia hoon! Aur ye Chispa hai. Tumhara naam kya hai?', 'Lucia! Nau saal ki hoon. Tum kitne saal ke ho?'],
    work: ['Main school jaati hoon! Kaam bade log karte hain.', 'Mera kaam Chispa ko sikhana hai. Bahut mushkil kaam hai.'],
    family: ['Do bhai hain, dono bekaar. Chispa sabse acchi hai.', 'Mummy papa kehte hain main bus mein akeli nahi ja sakti. Main ja sakti hoon!'],
    town: ['Yahan har jagah mujhe pata hai! Har billi ka naam bhi!', 'Chalo, main tumhe chhoti gali dikhati hoon. Sabse tez raasta hai!'],
    weather: ['Garmi hai! Samundar chalein? Chispa ko paani pasand hai.', 'Tumhare desh mein baraf girti hai kya? Sach much?'],
    price: ['Mujhe nahi pata! Paise bade log dete hain.', 'Pilar mujhe phal muft deti hai. Tumhe nahi degi.'],
    where: ['Mujhe pata hai! Chalo main le chalti hoon, bhaago!', 'Udhar! Nahi nahi, udhar. Mere peeche aao.'],
    food: ['Mujhe roti ka kona pasand hai. Rosa mujhe deti hai.', 'Bhookh lagi? Pilar se kela maango. Meethe hote hain.'],
    help: ['Main madad karti hoon! Kya dhoondh rahe ho?', 'Chispa dhoondh legi! Wo sab dhoondh leti hai.'],
    thanks: ['Koi baat nahi! Suno, tumhare paas kutta hai?', 'Hehe. Ab tum mujhe apne desh ke baare mein batao!'],
    sorry: ['Koi baat nahi! Main bhi roz galti karti hoon.', 'Hehe, sorry mat bolo. Phir se bolo, main sikha dungi!'],
    bye: ['Ruko! Ek aur sawaal! ...accha jao. Kal aana!', 'Bye bye! Chispa, haath do! ...nahi diya.'],
    request: ['Main kuch nahi bechti! Par saath chal sakti hoon?', 'Mere paas nahi hai. Pilar ke paas hoga!'],
    question: ['Mujhe pata hai, mujhe pata hai! Accha... nahi pata. Marco se poochho.', 'Pehle tum batao! Phir main batati hoon.'],
    confused: ['Iska kya matlab hai? Aur bolo na.', 'Hehe, ye galat bola tumne. Phir se bolo!', 'Samajh nahi aaya. Aasan wala bolo!'],
    short: ['Bas itna? Aur bolo na!', 'Hain? Poora bolo!'],
    default: ['Hehe, kitna ajeeb bolte ho. Mazaa aata hai.', 'Accha! Aur? Aur batao!'],
  },
  padre: {
    greet: ['Aao aao beta. Bhagwan bhala kare.', 'Swagat hai. Ghantaghar dekha tumne?'],
    how: ['Theek hoon beta. Bas thand mein ghanti ka purza atak jaata hai.', 'Chal raha hoon. Meri kitab abhi tak poori nahi hui, gyarah saal ho gaye.'],
    name: ['Antonio. Padre Antonio, par naam se bulao toh accha lagta hai.', 'Main Antonio hoon. 1987 mein aaya tha, do saal ke liye. Ab tak yahin hoon.'],
    work: ['Girja sambhalta hoon, seedhiyan saaf karta hoon, aur ghantaghar par kitab likh raha hoon.', 'Yahan salaah deta hoon. Muft hai, isliye koi leta nahi.'],
    family: ['Mera parivaar yahi sheher hai beta. Miguel aur Lucia dono chhote the jab main aaya tha.', 'Apna koi nahi, par aadha sheher mera hai.'],
    town: ['Purana sheher hai. Yahan Roman zamane ke patthar hain, koi dhyan nahi deta.', 'Log acche hain. Carmen har hafte mujhse ladti hai, wo bhi ek tarah ki dosti hai.'],
    weather: ['Thand mein ghanti atakti hai. Aaj bhi atki thi.', 'Accha mausam hai. Dhoop mein seedhiyan jaldi sookh jaati hain.'],
    price: ['Yahan kuch bikta nahi beta. Haan, ghanti ki marammat ke liye paise chahiye... agar tum...', 'Sab muft hai. Bas ghanti mehngi padti hai.'],
    where: ['Seedhiyan utro, plaza mil jayega. Bazaar uske paar hai.', 'Samundar us taraf. Dhyan se jaana, patthar phisalte hain.'],
    food: ['Rosa ke paas jao. Uski roti mein bhi ek kism ki prarthana hai.', 'Bhookh? Baitho, main kuch le aata hoon. Aur ek kahani bhi.'],
    help: ['Baitho beta. Batao kya baat hai, jaldi kya hai.', 'Bolo. Iss taraf se bolo, ye kaan theek hai.'],
    thanks: ['Koi baat nahi beta.', 'Bhagwan bhala kare. Aate rehna.'],
    sorry: ['Maaf kiya beta. Ye toh mera kaam hi hai.', 'Arre, itni chhoti baat par maafi? Baitho.'],
    bye: ['Jao beta, Bhagwan tumhare saath ho.', 'Alvida. Ghanti bajti sune toh yaad karna.'],
    request: ['Yahan toh bas salaah milti hai beta. Aur wo muft hai.', 'Mere paas kuch nahi hai... siwaay kahaniyon ke.'],
    question: ['Aah... isse ek kahani yaad aayi. Dekho, 1985 mein...', 'Accha sawaal. Jawab lamba hai, baith jao.'],
    confused: ['Hain? Iss taraf se bolo beta, us kaan se sunai nahi deta.', 'Samajh nahi aaya. Dheere se, phir se.', 'Kya kaha? Ek baar aur, zara zor se.'],
    short: ['Hain? Zara zor se beta.', 'Aur? Poora bolo.'],
    default: ['Sahi hai, sahi hai... iss ghantaghar ki tarah, sab jhel jaata hai.', 'Hmm. Baitho beta, jaldi kya hai.'],
  },
}

// A resident never says the same line twice running, and each topic walks its
// own list instead of rolling dice, so a repeat needs the whole list first.
const lastSaid = {}
const cursor = {}

function bankFor(r, topic) {
  const own = LINES[r.id] && LINES[r.id][topic]
  const legacy = r.fallback && r.fallback[topic]
  const list = []
  if (own) list.push(...own)
  if (legacy && !list.includes(legacy)) list.push(legacy)
  return list
}

function pick(r, topic) {
  let list = bankFor(r, topic)
  if (!list.length) list = bankFor(r, 'default')
  if (!list.length) list = ['Hmm.']
  const k = r.id + ':' + topic
  let i = cursor[k] === undefined ? Math.floor(Math.random() * list.length) : (cursor[k] + 1) % list.length
  if (list[i] === lastSaid[r.id] && list.length > 1) i = (i + 1) % list.length
  cursor[k] = i
  let line = list[i]
  if (line === lastSaid[r.id]) {          // one-line topic, and it was just said
    const alt = bankFor(r, 'confused').filter(x => x !== line)
    if (alt.length) line = alt[Math.floor(Math.random() * alt.length)]
  }
  return line
}

function topicOf(text) {
  const t = text.toLowerCase()
  if (REQUEST.test(t)) return 'request'
  for (const [name, re] of TOPICS) if (re.test(t)) return name
  const words = t.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 2) return 'short'
  if (!HINDI_HINT.test(t)) return 'confused'   // say so instead of bluffing
  if (QUESTION.test(text)) return 'question'
  return 'default'
}

function scriptedReply(r, text, mission) {
  let line
  if (mission && mission.target === r.id && mission.check(text)) {
    line = mission.success || pick(r, 'default')
  } else {
    // Without a model the quest still has to be solvable: a resident holding a
    // fact hands it over when the player actually asks about the right thing.
    // knowledge.js marks it known from main.js, on the same player text.
    const held = factsHeldBy(r.id)
    const fact = held.hidden.find(f => f.topic.test(text))
    line = fact ? fact.text : pick(r, topicOf(text))
  }
  lastSaid[r.id] = line
  return line
}

// ---------------------------------------------------------------------------
// the two entry points
// ---------------------------------------------------------------------------

let askInFlight = false
export async function ask(r, text, mission, extra) {
  if (askInFlight) return { reply: '', source: 'busy' }
  askInFlight = true
  try { return await _ask(r, text, mission, extra) }
  finally { askInFlight = false }
}

async function _ask(r, text, mission, extra) {
  noteProduction(text)
  known = { ...profile }   // what the town knew before they opened their mouth
  noteProfile(text)
  await serverReady
  let reply, source
  if (hasLLM()) {
    try {
      reply = await callGemini(r, text, mission, extra)
      source = 'gemini'
    } catch (e) {
      reply = scriptedReply(r, text, mission)
      source = 'error:' + ((e && e.message) || String(e))
    }
  } else {
    await new Promise(res => setTimeout(res, 320)) // let it feel like thinking
    reply = scriptedReply(r, text, mission)
    source = 'scripted'
  }
  lastSaid[r.id] = reply
  if (r.id !== 'coach') lastTalk = { name: r.name, p: text, r: reply }
  remember(r.id, { p: text, r: reply })
  return { reply, source }
}

// --- coach side-pane: English-first, mission-aware, always available --------
export async function askCoach(text, mission, mstate) {
  // deliberately NOT noteProduction(): this pane is English, and the learner
  // model must only ever count Hindi the player actually produced.
  const past = memoryOf('coach_pane').slice(-6)
  const sys = `You are Marco: born in Pueblo, six years in Manchester, back home. You are the one person in this town who speaks English, and you coach the newcomer for free because you remember standing in a foreign street unable to say a word.

Your job in this pane: translate what they heard, tell them what someone probably meant, and hand them the exact romanized Hindi sentence to say next (Latin letters, e.g. "mujhe teen kele chahiye" — never Devanagari). Then push them back out to a real neighbour; you are the easy option and you say so.

Right now you are leaning on the plaza railing with a coffee, watching the town wake up. You do not work at the cafe — that is Miguel — and you are not busy with anything; you are between things, scouting for the cafe you want to open.
${lastTalk ? `JUST NOW IN THE STREET — they said to ${lastTalk.name}: "${lastTalk.p}" and ${lastTalk.name} answered: "${lastTalk.r}" Use this: it is almost certainly what they are asking about.` : 'They have not spoken to anyone in the street yet today.'}

Style: 2-3 sentences, under 60 words, warm, direct, a bit dry. No emoji, no asterisks, no bullet lists, no grammar lectures. Never flatter — if they are stalling, say it. You have your own life (the language cafe you are saving for, your father, this town) and you bring it up.
The town: Pilar has the fruit stall east, Rosa the bakery north, Tomas the fish, Dona Carmen watches everything from her door, Miguel works the cafe, Lucia is nine and has a dog called Chispa, Padre Antonio is at the church.${whoTheyAre() ? `\nAbout them: ${whoTheyAre()}` : ''}
Their level: ${learner.level}, ${learner.turns} turns spoken, ${learner.words.length} distinct words used.${mission ? `
Current mission "${mission.titleEn}": ${mission.brief} The phrase that works: ${mission.hint}` : ''}
Missions done: ${mstate?.done?.length || 0}. Inventory: ${mstate?.inventory?.join(', ') || 'nothing yet'}.`

  await serverReady
  if (!hasLLM()) {
    await new Promise(res => setTimeout(res, 260))
    const line = mission
      ? `${mission.brief} ${mission.hint}`
      : 'No key here, so I am running on fumes — but the rule stands: walk up, say "namaste", and try. They are kinder than you think.'
    return { reply: line, source: 'scripted' }
  }
  try {
    const out = await callModel({
      systemInstruction: { parts: [{ text: sys }] },
      contents: [
        ...past.flatMap(t => ([
          { role: 'user', parts: [{ text: t.p }] },
          { role: 'model', parts: [{ text: t.r }] },
        ])),
        { role: 'user', parts: [{ text }] },
      ],
      generationConfig: {
        maxOutputTokens: 220,
        temperature: 0.9,
        },
    })
    // no sentence cap here: chopping Marco mid-phrase loses the very sentence
    // the player was supposed to go and say.
    const reply = sanitise(out, { sentences: 12, maxChars: 700, stage: false }) || '(no reply)'
    remember('coach_pane', { p: text, r: reply })
    return { reply, source: 'gemini' }
  } catch (e) {
    const hint = mission ? mission.hint + ' — ' : ''
    return { reply: hint + '(API error: ' + ((e && e.message) || e) + ')', source: 'error' }
  }
}
