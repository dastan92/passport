// ---------------------------------------------------------------------------
// Missions. Authored situations, LLM-judged outcomes — the design doc's rule.
// The arc: your bag was lost in transit and the passport is somewhere in
// Pueblo's social web. Every mission is a piece of Hindi you actually use.
// All player-facing Hindi is romanized (Latin script) — never Devanagari.
// ---------------------------------------------------------------------------

import { has } from './knowledge.js'

export const MISSIONS = [
  {
    id: 'kele',
    giver: 'coach',
    target: 'pilar',
    title: 'Teen kele khareedo',
    titleEn: 'Buy three bananas',
    brief: 'Pilar runs the fruit stall on the plaza. Warm up with something easy — buy three bananas from her, in Hindi. Numbers plus a noun, that is all.',
    objective: 'The player must ask Pilar to buy bananas AND specify the quantity three. Any reasonable phrasing counts: "mujhe teen kele chahiye", "teen kele dena", "teen kele please". Grammar does not need to be perfect — if you understood they want three bananas, it is a success.',
    reward: { item: 'teen kele', repWith: 'pilar' },
    check: (text) => /kela|kele|banana/i.test(text) && /\bteen\b|\btin\b|\b3\b|three/i.test(text),
    success: 'Lo beta, teen kele — ekdum meethe hain, taaza aaye hain aaj subah!',
    hint: 'Try: "Namaste! Mujhe teen kele chahiye."',
  },
  {
    id: 'roti',
    giver: 'coach',
    target: 'rosa',
    title: 'Rosa se milo aur roti maango',
    titleEn: 'Introduce yourself to Rosa and ask for bread',
    brief: 'Rosa runs the bakery. Tell her your name and ask for bread. Word is she has a room above the bakery — a newcomer with no bag could use a landlady like her.',
    objective: 'The player must introduce themselves by name (e.g. "mera naam … hai", "main … hoon") AND ask for bread in some form. If they succeed, Rosa warmly offers them the room above the bakery to stay in.',
    reward: { item: 'bakery ke upar ka kamra', repWith: 'rosa' },
    check: (text) => /mera naam|main .{1,25}(hoon|hu\b)|my name|naam .{1,25}hai/i.test(text) && /roti|bread|pav|paav|double roti/i.test(text),
    success: 'Arre, kitna accha naam hai! Lo, garam roti. Aur suno — bakery ke upar ek kamra khaali hai. Jab tak tumhara samaan nahi milta, wahin raho.',
    hint: 'Try: "Namaste, mera naam … hai. Mujhe roti chahiye."',
  },
  {
    id: 'carmen',
    giver: 'rosa',
    target: 'carmen',
    title: 'Carmen se apne bag ke baare mein poochho',
    titleEn: 'Ask Carmen about your lost bag',
    brief: 'Rosa says Doña Carmen sees everything from her window — everything. If anyone noticed your bag, it is her. Ask her about it, and be patient: she talks.',
    objective: 'The player must ask Carmen about their lost bag, lost things, or whether she saw anything unusual. If they do, she reveals she saw Chispa the dog carrying something red on the beach.',
    reward: { item: 'Carmen ki gawahi', repWith: 'carmen' },
    check: (text) => /bag|saman|samaan|kho|khoya|lost|dekha|passport/i.test(text),
    success: 'Haan haan, maine dekha! Chispa — Lucia ka kutta — samundar kinare laal cheez leke bhaag raha tha!',
    hint: 'Try: "Mera bag kho gaya hai. Kya aapne kuch dekha?"',
  },
  {
    id: 'lucia',
    giver: 'carmen',
    target: 'lucia',
    title: 'Lucia se Chispa ke baare mein poochho',
    titleEn: 'Ask Lucia about Chispa and the red thing',
    brief: 'Carmen saw the dog with something red. Lucia is Chispa\'s owner — a nine-year-old, so keep it simple and friendly. Ask where Chispa hides things.',
    objective: 'The player must ask Lucia about Chispa, the red thing, or where the dog hides things. If they do, she reveals Chispa stashes treasures near the church steps and that Padre found something there.',
    reward: { item: 'church ki seedhiyon ka raaz', repWith: 'lucia' },
    requiresFact: 'carmen_dog_beach',
    check: (text) => /chispa|kutta|dog|laal|red|chhupa|hide|kahan/i.test(text),
    success: 'Chispa church ki seedhiyon ke paas sab chhupata hai! Lekin Padre ne kal wahan kuch laal uthaya tha!',
    hint: 'Try: "Chispa laal cheez kahan chhupata hai?"',
  },
  {
    id: 'padre',
    giver: 'lucia',
    target: 'padre',
    title: 'Padre se apna passport wapas maango',
    titleEn: 'Ask Padre for your passport back',
    brief: 'The priest found something red on the church steps. Go ask him for your passport back — politely. Fair warning: he will want you to hear a story about the bell tower first. Listen. It matters to him.',
    objective: 'The player must ask Padre about the red thing or their passport and request it back. Padre admits he has it, but first insists the player hear one short story about the bell tower. Once the player agrees or listens, he returns the passport.',
    reward: { item: 'passport', repWith: 'padre' },
    requiresFact: 'padre_has_passport',
    check: (text) => /passport|laal|red|wapas|vapas|de dijiye|dena|mera hai|mila/i.test(text),
    success: 'Ghanti ki kahani sun li tumne — accha laga. Lo, tumhara passport. Sambhal ke rakhna, beta.',
    hint: 'Try: "Padre, mera passport aapke paas hai? Wapas de dijiye, please."',
  },
  {
    id: 'jashn',
    giver: 'padre',
    target: 'coach',
    title: 'Marco ko khushkhabri sunao',
    titleEn: 'Tell Marco the good news',
    brief: 'You did it. Passport in hand. Come tell me how it went — in Hindi, obviously. Then we celebrate. Rosa is baking something already.',
    objective: 'The player must tell Marco (the coach) the good news — that they found their passport / it was recovered — or thank him. Any celebratory phrasing counts.',
    reward: { item: 'Pueblo mein ek ghar', repWith: 'coach' },
    check: (text) => /passport|mil gaya|milgaya|mil gya|found|shukriya|dhanyavad|dhanyawad|thank/i.test(text),
    success: 'Mil gaya! Dekha? Poora sheher tumhare saath tha. Chalo, Rosa ke yahan — aaj jashn hai!',
    hint: 'Try: "Marco, mera passport mil gaya! Shukriya!"',
  },
]

const saved = JSON.parse(localStorage.getItem('passport_missions') || 'null')
const state = saved || { active: 'kele', done: [], inventory: [] }

function persist() {
  localStorage.setItem('passport_missions', JSON.stringify(state))
}

export function missionState() { return state }

export function activeMission() {
  return MISSIONS.find(m => m.id === state.active) || null
}

export function missionFor(npcId) {
  const m = activeMission()
  return m && m.target === npcId ? m : null
}

export function completeMission(id) {
  const m = MISSIONS.find(x => x.id === id)
  if (!m || state.done.includes(id)) return null
  // gated missions cannot complete until the required fact has been learned
  if (m.requiresFact && !has(m.requiresFact)) return null
  state.done.push(id)
  if (m.reward?.item) state.inventory.push(m.reward.item)
  const next = MISSIONS.find(x => !state.done.includes(x.id))
  state.active = next ? next.id : null
  persist()
  return m
}

export function resetMissions() {
  localStorage.removeItem('passport_missions')
}
