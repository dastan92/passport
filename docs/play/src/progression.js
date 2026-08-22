// ---------------------------------------------------------------------------
// progression.js — the Overcooked-style level layer over the mission chain.
//
// levelspec.js defines TEN LEVELS, each a set of missions plus the districts
// it opens. This module owns WHICH LEVEL YOU ARE ON and WHICH DISTRICTS ARE
// OPEN. Mission *completion* stays owned by missions.js (missionState().done
// is the single source of truth); we only derive from it. Districts
// accumulate and never re-lock.
//
// Persistence: localStorage 'passport_level' stores only the current level
// index — everything else is derived, so an old save can never disagree with
// the mission log about what is finished.
// ---------------------------------------------------------------------------

import { LEVELS, levelOf } from './levelspec.js'
import { DISTRICTS, districtOf } from './worldspec.js'
import { MISSIONS, missionState } from './missions.js'

const KEY = 'passport_level'

// --- level index (0-based into LEVELS) --------------------------------------
let idx = (() => {
  const n = parseInt(localStorage.getItem(KEY) || '0', 10)
  return Number.isFinite(n) ? Math.max(0, Math.min(LEVELS.length - 1, n)) : 0
})()

function persist() { localStorage.setItem(KEY, String(idx)) }

// Some levelspec mission ids are authored in later passes ('chai', 'bhav',
// 'kheti', …) and do not exist in missions.js yet. A level's completion is
// judged on the missions that ACTUALLY EXIST in the game right now: an
// unauthored id can never be completed, so requiring it would soft-lock the
// game the moment levelspec got ahead of missions.js. When the content lands,
// the requirement tightens automatically.
function requiredMissions(level) {
  return level.missions.filter(id => MISSIONS.some(m => m.id === id))
}

export function isLevelComplete(i) {
  const lv = LEVELS[i]
  if (!lv) return false
  const done = missionState().done
  const req = requiredMissions(lv)
  // a level whose missions are ALL unauthored counts as complete only if a
  // later real mission forced us past it — never block on empty requirements
  // unless nothing at all exists (then stay put).
  if (!req.length) return false
  return req.every(id => done.includes(id))
}

// Old or hand-edited saves: if the mission log already finished the current
// level (or several), catch the index up at load so the world matches.
while (idx < LEVELS.length - 1 && isLevelComplete(idx)) idx++
persist()

export function currentLevel() {
  return { index: idx, number: idx + 1, ...LEVELS[idx] }
}

// --- districts --------------------------------------------------------------
export function unlockedDistricts() {
  const out = []
  for (let i = 0; i <= idx && i < LEVELS.length; i++)
    for (const d of LEVELS[i].opens)
      if (!out.includes(d)) out.push(d)
  return out
}

export function isDistrictOpen(key) {
  return unlockedDistricts().includes(key)
}

// --- tiles ------------------------------------------------------------------
// Distance from a tile to a district's rect (0 if inside).
function rectDist(cx, cz, rect) {
  const [x0, z0, x1, z1] = rect
  const dx = cx < x0 ? x0 - cx : cx > x1 ? cx - x1 : 0
  const dz = cz < z0 ? z0 - cz : cz > z1 ? cz - z1 : 0
  return dx + dz
}

// LEVEL 1 REACHABILITY DECISION: Pilar (the 'kele' target) stands at [61,27]
// in EL MERCADO per worldspec, but level 1 opens only the plaza. The market
// hall's west wall (x56-57) means her stall is only reachable by the market's
// south aisle: east along z33-34, up the east side at x65, then west along
// z30 to the stall row. So the L1 open set annexes exactly that approach —
// the rect [54..65] x [24..34] plus the in-between street tiles x54-55 —
// to the plaza: it is the stall row and its aisle at the mercado's edge,
// which Marco's briefing already describes as "the east side of the plaza".
// It deliberately stops at x65 so Abuela Sofía's flower cart corner [66,34]
// and the deep market stay behind the rope. Once mercado opens at L4 this
// rect is inside open territory and the special case is inert.
const PLAZA_ANNEX = [54, 24, 65, 34]

export function isTileOpen(cx, cz) {
  const d = districtOf(cx, cz)
  if (d) {
    if (isDistrictOpen(d)) return true
    // the L1 annex overlaps the (closed) mercado rect — annex wins while
    // plaza is open
    if (isDistrictOpen('plaza') && rectDist(cx, cz, PLAZA_ANNEX) === 0) return true
    return false
  }
  // Streets/greenbelt BETWEEN districts belong to the nearest district; if
  // several tie for nearest, an open one wins the tie (so a shared boundary
  // street is usable right up to the closed side's edge, never a dead strip).
  if (isDistrictOpen('plaza') && rectDist(cx, cz, PLAZA_ANNEX) === 0) return true
  let best = Infinity, anyOpen = false
  for (const [key, dd] of Object.entries(DISTRICTS)) {
    const dist = rectDist(cx, cz, dd.rect)
    if (dist < best) { best = dist; anyOpen = isDistrictOpen(key) }
    else if (dist === best && isDistrictOpen(key)) anyOpen = true
  }
  // beach/sea rows south of every rect: nearest district logic covers them
  return anyOpen
}

// --- missions ---------------------------------------------------------------
// A mission is unlocked when its level is the current one or already passed.
// Ids that appear in no level (should not happen — all chain ids are placed)
// fail OPEN so a levelspec gap can never strand the chain.
export function missionUnlocked(id) {
  const lv = levelOf(id)
  if (!lv) return true
  return LEVELS.indexOf(lv) <= idx
}

// Per-level progress for the map screen: { done, total } counting the level's
// LISTED missions (unauthored ones count in the total so the map is honest
// about how much of a level exists to do — they just cannot be done yet).
export function levelProgress(i) {
  const lv = LEVELS[i]
  if (!lv) return { done: 0, total: 0 }
  const done = missionState().done
  return {
    done: lv.missions.filter(id => done.includes(id)).length,
    total: lv.missions.length,
  }
}

// --- completion hook --------------------------------------------------------
// main.js calls this right after missions.js confirms a completion. If that
// finished the CURRENT level, advance (skipping any already-complete levels —
// missions can complete out of chain order once unlocked) and report what to
// ceremonialise. Completing missions from past levels never re-fires.
export function onMissionComplete() {
  if (!isLevelComplete(idx)) return { levelFinished: false, nextLevel: null }
  const finished = currentLevel()
  if (idx >= LEVELS.length - 1) {
    // the final level: fire the ceremony exactly once, then remember it
    if (localStorage.getItem(KEY + '_end')) return { levelFinished: false, nextLevel: null, gameFinished: true }
    localStorage.setItem(KEY + '_end', '1')
    return { levelFinished: true, finishedLevel: finished, nextLevel: null, gameFinished: true, newDistricts: [] }
  }
  while (idx < LEVELS.length - 1 && isLevelComplete(idx)) idx++
  persist()
  return {
    levelFinished: true,
    finishedLevel: finished,
    nextLevel: currentLevel(),
    newDistricts: LEVELS[idx].opens.filter(d => !LEVELS.slice(0, idx).some(l => l.opens.includes(d))),
  }
}

export function resetProgression() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(KEY + '_end')
  idx = 0
}
