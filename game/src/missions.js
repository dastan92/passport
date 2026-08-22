// ---------------------------------------------------------------------------
// Missions. Authored situations, LLM-judged outcomes — the design doc's rule.
// Every mission's real objective is a piece of Spanish you have to actually use.
// ---------------------------------------------------------------------------

export const MISSIONS = [
  {
    id: 'platanos',
    giver: 'coach',
    target: 'pilar',
    title: 'Compra tres plátanos',
    titleEn: 'Buy three bananas',
    brief: 'Pilar has the fruit stall on the east side of the plaza. Go buy three bananas from her — in Spanish.',
    // what the target NPC needs to see happen
    objective: 'The player must ask Pilar to buy bananas AND specify the quantity three. Any reasonable phrasing counts: "quiero tres plátanos", "me da tres plátanos por favor", "tres plátanos". Their grammar does not need to be perfect — if you understood that they want three bananas, that is a success.',
    reward: { item: 'tres plátanos', repWith: 'pilar' },
    // offline heuristic when there is no API key
    check: (text) => /pl[aá]tano|banana/i.test(text) && /\btres\b|\b3\b/i.test(text),
    hint: 'Try: "Hola, quiero tres plátanos, por favor."',
  },
  {
    id: 'pan',
    giver: 'coach',
    target: 'rosa',
    title: 'Preséntate a Rosa',
    titleEn: 'Introduce yourself to Rosa',
    brief: 'Rosa runs the bakery. Tell her your name and buy some bread. She is patient — she has taught a lot of foreigners how to order.',
    objective: 'The player must introduce themselves by name (e.g. "me llamo…", "soy…") AND ask for bread in some form.',
    reward: { item: 'una barra de pan', repWith: 'rosa' },
    check: (text) => /me llamo|soy |mi nombre/i.test(text) && /pan|barra/i.test(text),
    hint: 'Try: "Hola, me llamo … Quiero pan, por favor."',
  },
  {
    id: 'carmen',
    giver: 'rosa',
    target: 'carmen',
    title: 'Pregúntale a Doña Carmen por el ruido',
    titleEn: 'Ask Doña Carmen about the noise',
    brief: 'Rosa says Doña Carmen has been complaining about noise at night. Go ask her what happened — and brace yourself, she talks.',
    objective: 'The player must ask Doña Carmen a question about the noise (el ruido) or about what happened last night.',
    reward: { item: 'el chisme del barrio', repWith: 'carmen' },
    check: (text) => /ruido|anoche|noche|pas[oó]/i.test(text) && /\?/.test(text),
    hint: 'Try: "¿Qué pasó anoche con el ruido?"',
  },
]

const saved = JSON.parse(localStorage.getItem('passport_missions') || 'null')
const state = saved || { active: 'platanos', done: [], inventory: [] }

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
  state.done.push(id)
  if (m.reward?.item) state.inventory.push(m.reward.item)
  // next unfinished mission becomes active
  const next = MISSIONS.find(x => !state.done.includes(x.id))
  state.active = next ? next.id : null
  persist()
  return m
}

export function resetMissions() {
  localStorage.removeItem('passport_missions')
}
