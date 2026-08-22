// ---------------------------------------------------------------------------
// lang.js — the language a character is learning. Chosen at passport creation,
// stored in passport_profile, constant for that character's whole life.
//
// Content files hold either a plain string (treated as Hindi, the original
// language) or a {hi, es} object; tr() resolves at read time. The town, the
// people and the missions are identical — only the words change, which is the
// whole architectural bet of this game.
// ---------------------------------------------------------------------------

export const LANGS = {
  hi: {
    name: 'Hindi',
    self: 'Hindi',
    ttsLang: 'hi-IN',
    // prompt fragments used by conversation.js
    speakRule: 'Hindi only, ALWAYS written in ROMAN script (Latin letters), never Devanagari. Example: "Main theek hoon, aur tum?" — never the Devanagari form. Natural everyday Hindi — arre, beta, bhai, yaar, haan, uff. Simple consistent spellings a learner can read aloud.',
    coachPhraseNote: 'romanized Hindi in Latin script, e.g. "mujhe teen kele chahiye" — never Devanagari',
    tryIt: 'namaste',
    voiceStyleAccent: 'Indian',
  },
  es: {
    name: 'Spanish',
    self: 'español',
    ttsLang: 'es-ES',
    speakRule: 'Spanish only. Natural everyday peninsular Spanish — hombre, vale, anda, venga, oye. Keep spelling standard so a learner can look words up, and prefer simple constructions they can read aloud.',
    coachPhraseNote: 'plain Spanish, e.g. "quiero tres plátanos, por favor"',
    tryIt: 'hola',
    voiceStyleAccent: 'Spanish',
  },
}

export function currentLang() {
  try {
    const p = JSON.parse(localStorage.getItem('passport_profile') || '{}')
    return LANGS[p.lang] ? p.lang : 'hi'
  } catch { return 'hi' }
}

export function langMeta() { return LANGS[currentLang()] }

// Resolve a translatable value: plain string = original Hindi content,
// {hi, es} = pick the character's language, fall back to hi.
export function tr(v) {
  if (v && typeof v === 'object' && !Array.isArray(v) && (v.hi !== undefined || v.es !== undefined)) {
    const l = currentLang()
    return v[l] !== undefined ? v[l] : v.hi
  }
  return v
}

// For check() regexes stored per-language: {hi: RegExp, es: RegExp}
export function trRe(v) {
  if (v && typeof v === 'object' && (v.hi instanceof RegExp || v.es instanceof RegExp)) {
    const l = currentLang()
    return v[l] || v.hi
  }
  return v
}
