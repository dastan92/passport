// ---------------------------------------------------------------------------
// profiles.js — characters as passports.
//
// The whole game state lives in ~a dozen localStorage keys that every module
// reads directly. Rather than thread a profile id through all of them, the
// active character's keys ARE the live keys, and switching characters swaps
// snapshots: save the live keys into the outgoing character's blob, restore
// the incoming character's blob into the live keys, reload. Zero changes to
// any game module, and a character's save is one JSON object — which also
// makes export/backup trivial.
// ---------------------------------------------------------------------------

// Every key that belongs to a character (world memory of them + their progress
// + their preferences). Keys not listed here are global (api key, model).
export const CHARACTER_KEYS = [
  'passport_missions', 'passport_facts', 'passport_memory',
  'passport_impressions', 'passport_patience', 'passport_learner',
  'passport_profile', 'passport_level', 'passport_level_end',
  'passport_welcomed', 'passport_tr', 'passport_tts', 'passport_mute',
]

const INDEX_KEY = 'passport_characters'   // [{id, name, created, lastPlayed, summary}]
const ACTIVE_KEY = 'passport_active_character'
const BLOB_PREFIX = 'passport_char_'      // + id -> JSON of CHARACTER_KEYS

function readIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]') } catch { return [] }
}
function writeIndex(ix) { localStorage.setItem(INDEX_KEY, JSON.stringify(ix)) }

export function listCharacters() { return readIndex() }
export function activeCharacterId() { return localStorage.getItem(ACTIVE_KEY) || null }
export function activeCharacter() {
  const id = activeCharacterId()
  return readIndex().find(c => c.id === id) || null
}

function liveSnapshot() {
  const blob = {}
  for (const k of CHARACTER_KEYS) {
    const v = localStorage.getItem(k)
    if (v !== null) blob[k] = v
  }
  return blob
}

function restoreSnapshot(blob) {
  for (const k of CHARACTER_KEYS) localStorage.removeItem(k)
  for (const [k, v] of Object.entries(blob || {})) localStorage.setItem(k, v)
}

// A short human summary for the character-select card, derived from the blob.
function summarise(blob) {
  try {
    const missions = JSON.parse(blob.passport_missions || '{}')
    const learner = JSON.parse(blob.passport_learner || '{}')
    const level = parseInt(blob.passport_level || '0', 10)
    return {
      stamps: (missions.done || []).length,
      words: (learner.words || []).length,
      level: level + 1,
      cefr: learner.level || 'A1',
    }
  } catch { return { stamps: 0, words: 0, level: 1, cefr: 'A1' } }
}

// Persist the live state into the active character's blob. Called on an
// interval, on unload, and before any switch.
export function saveActive() {
  const id = activeCharacterId()
  if (!id) return
  const blob = liveSnapshot()
  localStorage.setItem(BLOB_PREFIX + id, JSON.stringify(blob))
  const ix = readIndex()
  const c = ix.find(x => x.id === id)
  if (c) {
    c.lastPlayed = Date.now()
    c.summary = summarise(blob)
    writeIndex(ix)
  }
}

export function createCharacter(name) {
  name = String(name || '').trim().slice(0, 24)
  if (!name) return null
  saveActive()
  const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const ix = readIndex()
  ix.push({ id, name, created: Date.now(), lastPlayed: Date.now(),
            summary: { stamps: 0, words: 0, level: 1, cefr: 'A1' } })
  writeIndex(ix)
  // fresh world: clear live keys, seed the profile with their name so the
  // GAME knows it. Residents still only know it once you tell them — the
  // conversation profile tracks what the TOWN has learned separately.
  restoreSnapshot({ passport_profile: JSON.stringify({ givenName: name }) })
  localStorage.setItem(ACTIVE_KEY, id)
  localStorage.setItem(BLOB_PREFIX + id, JSON.stringify(liveSnapshot()))
  return id
}

export function switchCharacter(id) {
  const ix = readIndex()
  if (!ix.some(c => c.id === id)) return false
  saveActive()
  let blob = {}
  try { blob = JSON.parse(localStorage.getItem(BLOB_PREFIX + id) || '{}') } catch {}
  restoreSnapshot(blob)
  localStorage.setItem(ACTIVE_KEY, id)
  return true
}

export function deleteCharacter(id) {
  const ix = readIndex().filter(c => c.id !== id)
  writeIndex(ix)
  localStorage.removeItem(BLOB_PREFIX + id)
  if (activeCharacterId() === id) {
    localStorage.removeItem(ACTIVE_KEY)
    restoreSnapshot({})
  }
}

// "Download passport": one character as a portable JSON file.
export function exportCharacter(id) {
  const c = readIndex().find(x => x.id === id)
  if (!c) return null
  if (id === activeCharacterId()) saveActive()
  let blob = {}
  try { blob = JSON.parse(localStorage.getItem(BLOB_PREFIX + id) || '{}') } catch {}
  return JSON.stringify({ format: 'passport-character-v1', character: c, save: blob }, null, 2)
}

export function importCharacter(json) {
  try {
    const d = JSON.parse(json)
    if (d.format !== 'passport-character-v1' || !d.character?.name) return null
    const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const ix = readIndex()
    ix.push({ ...d.character, id, lastPlayed: Date.now() })
    writeIndex(ix)
    localStorage.setItem(BLOB_PREFIX + id, JSON.stringify(d.save || {}))
    return id
  } catch { return null }
}

// One-time migration: a pre-profile save becomes "the first character", so
// nobody's existing town forgets them on update.
export function migrateLegacySave() {
  if (readIndex().length || activeCharacterId()) return false
  const live = liveSnapshot()
  if (!Object.keys(live).length) return false
  let name = 'Musafir'
  try {
    const prof = JSON.parse(live.passport_profile || '{}')
    if (prof.name) name = prof.name
    if (prof.givenName) name = prof.givenName
  } catch {}
  const id = 'c' + Date.now().toString(36) + 'lgcy'
  writeIndex([{ id, name, created: Date.now(), lastPlayed: Date.now(), summary: summarise(live) }])
  localStorage.setItem(BLOB_PREFIX + id, JSON.stringify(live))
  localStorage.setItem(ACTIVE_KEY, id)
  return true
}
