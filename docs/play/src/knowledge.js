// ---------------------------------------------------------------------------
// Knowledge graph. Facts live with residents; the player extracts them by
// actually asking about the right thing (romanized Hindi or plain English).
// ---------------------------------------------------------------------------

export const FACTS = [
  {
    id: 'carmen_dog_beach',
    holder: 'carmen',
    topic: /bag|bags|luggage|suitcase|saman|samaan|kho|khoya|khoyi|gum|gayab|chori|dhoondh|lost|missing|passport|dekha|dekhi|dekhu|saw|beach|samundar|kinare/i,
    requires: [],
    text: 'Haan beta, maine khidki se dekha — Lucia ka kutta Chispa samundar kinare kuch laal cheez muh mein leke bhaag raha tha. Bilkul laal, tumhare passport jaisi.',
    textEn: 'Yes dear, I saw from my window — Lucia\'s dog Chispa was running along the beach carrying something red in its mouth. Bright red, like your passport.',
    coachNote: 'Carmen saw the dog, Chispa, with something red on the beach. Go find Lucia — the dog is hers.',
  },
  {
    id: 'lucia_church_steps',
    holder: 'lucia',
    topic: /chispa|\bkutta\b|kutte|kutiya|\bdog\b|doggy|\blaal\b|\blal\b|\bred\b|cheez|thing|chhupa|chupa|khazana|treasure|hide|hidden|\bkahan\b|\bkaha\b|kidhar/i,
    requires: ['carmen_dog_beach'],
    text: 'Chispa na, apne khazane church ki seedhiyon ke paas chhupata hai! Lekin kal Padre ne wahan kuch uthaya tha — laal wala kuch. Padre ke paas hoga!',
    textEn: 'Chispa hides his treasures near the church steps! But yesterday Padre picked something up there — something red. Padre must have it!',
    coachNote: 'The dog stashes things at the church steps, and the priest found something red there. Go talk to Padre.',
  },
  {
    id: 'padre_has_passport',
    holder: 'padre',
    topic: /passport|\blaal\b|\blal\b|\bred\b|kitab|seedhi|seedhiyon|steps|chispa|\bkutta\b|\bdog\b|wapas|vapas|de dijiye|de do|dedo|return|mera passport|meri kitab/i,
    requires: ['lucia_church_steps'],
    text: 'Haan beta, laal passport mere paas hi hai. Seedhiyon par mila tha, mitti mein. Maine socha, malik zaroor aayega. Pehle baitho — ghanti ke tower ki ek kahani suno, phir le jaana.',
    textEn: 'Yes child, the red passport is with me. I found it on the steps, in the dirt. I thought the owner would surely come. First sit — hear one story about the bell tower, then take it.',
    coachNote: 'He has it! Small price: you have to sit through one bell-tower story. Worth it.',
  },
]

const KEY = 'passport_facts'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function knownFacts() { return load() }

export function has(factId) { return load().includes(factId) }

export function tryReveal(residentId, playerText) {
  const known = load()
  for (const f of FACTS) {
    if (f.holder !== residentId) continue
    if (known.includes(f.id)) continue
    if (!f.requires.every(r => known.includes(r))) continue
    if (!f.topic.test(playerText)) continue
    known.push(f.id)
    localStorage.setItem(KEY, JSON.stringify(known))
    return f
  }
  return null
}

export function factsHeldBy(residentId) {
  const knownIds = load()
  const mine = FACTS.filter(f => f.holder === residentId)
  return {
    known: mine.filter(f => knownIds.includes(f.id)),
    hidden: mine.filter(f => !knownIds.includes(f.id) && f.requires.every(r => knownIds.includes(r))),
  }
}

export function resetKnowledge() {
  localStorage.removeItem(KEY)
}
