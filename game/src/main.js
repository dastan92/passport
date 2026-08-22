import * as THREE from 'three'
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js'
import { buildTown, isWalkable, tileToWorld, groundHeight, PLAZA_H, COLS, ROWS, TILE } from './town.js'
import { createController } from './movement.js'
import { buildPerson, RESIDENTS } from './people.js'
import { spawnAmbient, createSoundscape } from './ambient.js'
import { ask, askCoach, getKey, setKey, forgetAll, learnerState, hasLLM, serverReady, getModel, setModel } from './conversation.js'
import { activeMission, missionFor, completeMission, missionState } from './missions.js'
import * as tts from './tts.js'
import { tryReveal, factsHeldBy, knownFacts, resetKnowledge } from './knowledge.js'

// ---------------------------------------------------------------------------
// renderer / scene — Alba register: bright coastal morning, saturated, soft
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xaed4ea) // coastal sky
scene.fog = new THREE.Fog(0xc4dcea, 70, 220)

// ---------------------------------------------------------------------------
// camera — perspective, high three-quarter follow. Warmth needs perspective.
// ---------------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 500)
const OFF_ROAM = new THREE.Vector3(0, 9.2, 11.0)   // low three-quarter: you are IN the town
const OFF_TALK = new THREE.Vector3(1.6, 2.6, 4.0)  // near eye level for conversation
// the follow, the spring and the occlusion pull-in all live in movement.js

// ---------------------------------------------------------------------------
// light — late morning sun, high and warm
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xfff0d0, 2.9)
sun.position.set(-30, 42, 20)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
const S = 46
sun.shadow.camera.left = -S; sun.shadow.camera.right = S
sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S
sun.shadow.camera.near = 1; sun.shadow.camera.far = 140
sun.shadow.bias = -0.0005
sun.shadow.normalBias = 0.03
scene.add(sun)
scene.add(sun.target)
scene.add(new THREE.HemisphereLight(0xbcd8f0, 0xd8c090, 1.25))
const fill = new THREE.DirectionalLight(0xffe0c0, 0.3)
fill.position.set(26, 14, -18)
scene.add(fill)

// ---------------------------------------------------------------------------
// world + people + ambient life
// ---------------------------------------------------------------------------
const { sea } = buildTown(scene)

for (const r of RESIDENTS) {
  const g = buildPerson(r.look)
  const p = tileToWorld(r.tile[0], r.tile[1])
  g.position.set(p.x, groundHeight(r.tile[0], r.tile[1]), p.z)
  g.rotation.y = r.facing
  r.group = g
  scene.add(g)
}

const player = buildPerson({
  skin: 0xdca57e, outfit: 0x2f5fa8, accent: 0xf2ede2,
  hair: 0x2e2a26, trousers: 0x3a3f4a,
})
scene.add(player)

function contactBlob(r = 0.42) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 20),
    new THREE.MeshBasicMaterial({ color: 0x6a5334, transparent: true, opacity: 0.24, depthWrite: false }),
  )
  m.rotation.x = -Math.PI / 2
  return m
}
const playerBlob = contactBlob()
scene.add(playerBlob)
for (const r of RESIDENTS) {
  const b = contactBlob()
  b.position.set(r.group.position.x, r.group.position.y + 0.03, r.group.position.z)
  scene.add(b)
}

const pos = { x: 20, z: 12 }   // player's current TILE — mirrored by movement.js
const ambient = spawnAmbient(scene, () => [
  [pos.x, pos.z],
  ...RESIDENTS.map(r => r.tile),
])
const sound = createSoundscape()

// ---------------------------------------------------------------------------
// post
// ---------------------------------------------------------------------------
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.22, 0.6, 0.9)
composer.addPass(bloom)
composer.addPass(new OutputPass())
composer.setSize(window.innerWidth, window.innerHeight)

// ===========================================================================
// MOVEMENT / CAMERA SECTION — owned by movement.js. Everything between this
// banner and the "END MOVEMENT" banner is the character controller wiring:
// input, the continuous controller, and the follow camera. Nothing else.
// ===========================================================================
const startP = tileToWorld(pos.x, pos.z)
player.position.set(startP.x, groundHeight(pos.x, pos.z), startP.z)

const controller = createController({
  scene, camera, player,
  town: { isWalkable, tileToWorld, groundHeight, PLAZA_H, COLS, ROWS, TILE },
  // residents are static furniture as far as walking is concerned: you bump
  // around them instead of standing inside them
  obstacles: RESIDENTS.map(r => ({ x: r.group.position.x, z: r.group.position.z, r: 0.34 })),
  config: { camOffset: OFF_ROAM.toArray() },
})
controller.teleportToTile(pos.x, pos.z)

const keys = new Set()
const input = { x: 0, z: 0, run: false }
function readInput() {
  const up = keys.has('w') || keys.has('arrowup')
  const down = keys.has('s') || keys.has('arrowdown')
  const left = keys.has('a') || keys.has('arrowleft')
  const right = keys.has('d') || keys.has('arrowright')
  input.x = (right ? 1 : 0) - (left ? 1 : 0)
  input.z = (down ? 1 : 0) - (up ? 1 : 0)   // W walks north, i.e. -Z
  input.run = keys.has('shift')
  return input
}

window.addEventListener('keydown', e => { if (!uiFocused()) keys.add(e.key.toLowerCase()) })
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()))
window.addEventListener('blur', () => keys.clear())
window.addEventListener('pointerdown', () => sound.start(), { once: false })
window.addEventListener('keydown', () => sound.start(), { once: true })

// gait animation driven off the controller's speed output: arms and body bob
// scale with how fast you are actually moving, so walk and run read apart.
const talkFocus = new THREE.Vector3()
const SUN_OFF = new THREE.Vector3(-30, 42, 20)
function animateLocomotion(dt) {
  const gait = controller.gait                 // 0 idle · 1 walk · ~1.8 run
  const body = player.userData.body
  const arms = player.userData.arms
  if (gait > 0.04) {
    const s = Math.sin(controller.stride)
    const amp = Math.min(1, gait)
    body.position.y = Math.abs(s) * 0.075 * amp
    body.rotation.z = s * 0.035 * amp
    body.rotation.x = Math.min(0.12, gait * 0.06)   // lean into the run
    arms[0].rotation.x = s * (0.45 + 0.35 * Math.min(1, gait))
    arms[1].rotation.x = -s * (0.45 + 0.35 * Math.min(1, gait))
  } else {
    const k = Math.min(1, dt * 10)
    body.position.y += (0 - body.position.y) * k
    body.rotation.z += (0 - body.rotation.z) * k
    body.rotation.x += (0 - body.rotation.x) * k
    arms[0].rotation.x += (0 - arms[0].rotation.x) * k
    arms[1].rotation.x += (0 - arms[1].rotation.x) * k
  }
}

function stepMovement(dt) {
  controller.setFrozen(!!talking)
  controller.setCameraOffset(talking ? OFF_TALK : OFF_ROAM)
  if (talking) {
    talkFocus.copy(player.position).add(talking.group.position).multiplyScalar(0.5)
    talkFocus.y += 1.0
    controller.setFocusOverride(talkFocus)
  } else {
    controller.setFocusOverride(null)
  }
  controller.update(dt, talking ? null : readInput())
  animateLocomotion(dt)
  // the rest of the game still thinks in tiles — keep `pos` mirrored
  pos.x = controller.tileX
  pos.z = controller.tileZ
  playerBlob.position.set(player.position.x, player.position.y + 0.03, player.position.z)
  // sun rides with the focus so shadows stay in the shadow-camera box
  sun.target.position.copy(controller.focus)
  sun.position.copy(controller.focus).add(SUN_OFF)
}
// ======================= END MOVEMENT / CAMERA SECTION =====================

// ---------------------------------------------------------------------------
// UI refs
// ---------------------------------------------------------------------------
const el = id => document.getElementById(id)
const panel = el('convo')
const cvName = el('cv-name'), cvRole = el('cv-role'), cvLog = el('cv-log')
const cvInput = el('cv-input'), cvStatus = el('cv-status')
const talkPrompt = el('talk-prompt')
const keyPanel = el('key-panel'), keyInput = el('key-input')
const coachPane = el('coach-pane'), coachLog = el('coach-log'), coachInput = el('coach-input')
const missionCard = el('mission-card')
const toast = el('toast')

let talking = null
let nearby = null

// --- patience: every resident has a temper. Rudeness and spam drain it,
// courtesy and completed missions restore it. Empty = they walk off.
const patience = JSON.parse(localStorage.getItem('passport_patience') || '{}')
const lastSaid = {}
function getPatience(id) { return patience[id] ?? 70 }
function setPatience(id, v) {
  patience[id] = Math.max(0, Math.min(100, Math.round(v)))
  localStorage.setItem('passport_patience', JSON.stringify(patience))
  renderPatience()
}
function patienceDelta(id, text) {
  let d = -1 // every message costs a sliver: their time is real
  const t = text.toLowerCase().trim()
  if (/namaste|dhanyavaad|shukriya|please|kripya|\bji\b|maaf/.test(t)) d += 5
  if (t === (lastSaid[id] || '')) d -= 12          // repeating yourself verbatim
  else if (t.split(/\s+/).length <= 1) d -= 6      // grunting
  if (t.length > 0 && !/[a-z\u0900-\u097F]/i.test(t)) d -= 8  // keyboard mash
  lastSaid[id] = t
  return d
}
function renderPatience() {
  const el2 = document.getElementById('cv-patience')
  if (!el2 || !talking) return
  const v = getPatience(talking.id)
  el2.style.setProperty('--p', v + '%')
  el2.classList.toggle('low', v < 30)
  el2.title = 'patience: ' + v
}
let showTranslation = localStorage.getItem('passport_tr') === '1'

function uiFocused() {
  return [cvInput, keyInput, coachInput].includes(document.activeElement)
}

// ---------------------------------------------------------------------------
// mission HUD
// ---------------------------------------------------------------------------
function refreshMission() {
  const m = activeMission()
  if (!m) {
    missionCard.innerHTML = '<div class="mc-title">Pueblo tumhara hai</div><div class="mc-en">Passport mil gaya — free roam</div>'
    return
  }
  const facts = knownFacts().length
  missionCard.innerHTML =
    `<div class="mc-label">mission</div>` +
    `<div class="mc-title">${m.title}</div>` +
    `<div class="mc-en">${m.titleEn}</div>` +
    (facts ? `<div class="mc-facts">gyaan: ${facts} baat pata hai</div>` : '')
}
refreshMission()

function showToast(text, sub) {
  toast.innerHTML = `<div class="t-main">${text}</div>` + (sub ? `<div class="t-sub">${sub}</div>` : '')
  toast.classList.remove('hidden')
  toast.classList.remove('pop'); void toast.offsetWidth
  toast.classList.add('pop')
  setTimeout(() => toast.classList.add('hidden'), 4200)
}

// ---------------------------------------------------------------------------
// conversation panel (world NPCs)
// ---------------------------------------------------------------------------
function addLine(log, who, text, cls) {
  const d = document.createElement('div')
  d.className = 'cv-line ' + (cls || '')
  if (who) {
    const w = document.createElement('span')
    w.className = 'cv-who'; w.textContent = who
    d.appendChild(w)
  }
  const t = document.createElement('span')
  t.className = 'cv-text'; t.textContent = text
  d.appendChild(t)
  log.appendChild(d)
  log.scrollTop = log.scrollHeight
  return d
}

function openConvo(r) {
  talking = r
  cvName.textContent = r.name
  cvRole.textContent = r.role
  cvLog.innerHTML = ''
  addLine(cvLog, '', r.opener, 'them')
  if (showTranslation && r.openerEn) addLine(cvLog, '', r.openerEn, 'tr')
  panel.classList.remove('hidden')
  sound.duck(true)
  talkPrompt.classList.add('hidden')
  cvStatus.textContent = hasLLM() ? '' : 'no API key · limited replies'
  if (getPatience(r.id) < 20) setPatience(r.id, 20) // time cools tempers a little
  renderPatience()
  tts.speak(r.opener, r.id)
  setTimeout(() => cvInput.focus(), 60)
  r.group.userData.turnTo = player.position.clone()
}

function closeConvo() {
  tts.stop()
  sound.duck(false)
  talking = null
  panel.classList.add('hidden')
  cvInput.blur()
  keys.clear()
}

let sendBusy = false
async function send() {
  const text = cvInput.value.trim()
  if (!text || !talking) return
  // A second send while one is in flight used to reach the re-entrancy guard
  // and render its empty reply as a blank bubble. Lock the input instead, so
  // the state is visible rather than silently swallowed.
  if (sendBusy) return
  sendBusy = true
  cvInput.disabled = true
  el('cv-send').disabled = true
  try {
    await _send(text)
  } finally {
    sendBusy = false
    cvInput.disabled = false
    el('cv-send').disabled = false
    if (talking) cvInput.focus()
  }
}

async function _send(text) {
  cvInput.value = ''
  addLine(cvLog, 'tú', text, 'me')
  const pending = addLine(cvLog, '', '···', 'them pending')
  cvStatus.textContent = 'soch rahe…'
  const r = talking
  const m = missionFor(r.id)
  // patience first: if they are out, the conversation is over
  setPatience(r.id, getPatience(r.id) + patienceDelta(r.id, text))
  if (getPatience(r.id) <= 0) {
    pending.remove()
    const line = addLine(cvLog, '', 'Bas, mera time ho gaya. Baad mein aana.', 'them')
    tts.speak('Bas, mera time ho gaya. Baad mein aana.', r.id)
    cvStatus.textContent = 'unka patience khatam — thodi der baad aana'
    setTimeout(closeConvo, 2600)
    return
  }
  const held = factsHeldBy(r.id)
  const extra = {
    mood: `\nYOUR PATIENCE with this foreigner right now: ${getPatience(r.id)}/100. Above 70: warm and generous. 40-70: normal. Below 40: clipped, busy, mildly annoyed. Below 20: one-line answers, about to walk off.\n`,
    knowledge: held.hidden.length || held.known.length ? `\nTHINGS YOU KNOW${held.known.length ? ' (already told them: ' + held.known.map(f => f.text).join(' | ') + ')' : ''}${held.hidden.length ? '. NOT yet told them — reveal ONLY if they ask about the relevant topic, never volunteer it unprompted: ' + held.hidden.map(f => f.text).join(' | ') : ''}\n` : '',
  }
  try {
    const { reply, source } = await ask(r, text, m, extra)
    if (talking !== r) return
    pending.remove()
    if (!reply || !reply.trim()) {
      cvStatus.textContent = source === 'busy' ? '' : 'koi jawab nahi aaya — phir se bolo'
      return
    }
    const line = addLine(cvLog, '', reply, 'them')
    tts.speak(reply, r.id)
    line.title = 'clic para repetir'
    line.style.cursor = 'pointer'
    line.addEventListener('click', () => tts.speak(reply, r.id))
    if (source.startsWith('error:')) cvStatus.textContent = 'API: ' + source.slice(6, 90)
    else if (source === 'scripted') cvStatus.textContent = 'no API key · limited replies'
    else {
      const st = learnerState()
      cvStatus.textContent = `${st.level} · ${st.words.length} shabd`
    }
    // knowledge: did this question unlock a fact?
    const fact = tryReveal(r.id, text)
    if (fact) {
      showToast('naya pata chala', fact.textEn)
      setPatience(r.id, getPatience(r.id) + 4)
      if (fact.coachNote) coachSay(fact.coachNote, false)
      refreshMission()
    }
    // mission completion
    if (m && m.check(text)) {
      const done = completeMission(m.id)
      if (done) {
        setPatience(r.id, getPatience(r.id) + 15)
        showToast(`✓ ${done.title}`, done.reward?.item ? `mila: ${done.reward.item}` : '')
        refreshMission()
        coachSay(`Nice — "${done.titleEn}" done. ` + (activeMission()
          ? `Next up: ${activeMission().titleEn}. ${activeMission().brief}`
          : `That's everything I had for you. The town is yours — go get lost in it.`))
      }
    }
  } catch (e) {
    pending.remove()
    cvStatus.textContent = 'error: ' + e.message
  }
}

el('cv-send').addEventListener('click', send)
cvInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); send() }
  if (e.key === 'Escape') closeConvo()
})
el('cv-close').addEventListener('click', closeConvo)
el('cv-translate').addEventListener('click', () => {
  showTranslation = !showTranslation
  localStorage.setItem('passport_tr', showTranslation ? '1' : '0')
  el('cv-translate').classList.toggle('on', showTranslation)
})
el('cv-translate').classList.toggle('on', showTranslation)

// ---------------------------------------------------------------------------
// coach pane (right side, toggle any time)
// ---------------------------------------------------------------------------
// Marco is TEXT by default. Two reasons: you need to *hear* Hindi because
// pronunciation is the skill, but you can *read* English perfectly well — and
// his paragraphs were the longest, most expensive lines in the game (voice was
// ~90% of running cost). A play button is offered on every line so you can
// still hear him pronounce a phrase when that is the point.
function coachSay(text, speak = false) {
  const line = addLine(coachLog, 'marco', text, 'them coach-line')
  const btn = document.createElement('button')
  btn.className = 'say-btn'
  btn.type = 'button'
  btn.textContent = '▶'
  btn.title = 'hear Marco say this'
  btn.setAttribute('aria-label', 'hear Marco say this line')
  btn.addEventListener('click', e => {
    e.stopPropagation()
    btn.classList.add('playing')
    tts.speak(text, 'coach', () => btn.classList.remove('playing'))
  })
  line.appendChild(btn)
  if (speak) tts.speak(text, 'coach')
  return line
}

function toggleCoach(force) {
  const show = force !== undefined ? force : coachPane.classList.contains('hidden')
  coachPane.classList.toggle('hidden', !show)
  document.body.classList.toggle('coach-open', show)
  el('coach-toggle').classList.toggle('on', show)
  if (show) setTimeout(() => coachInput.focus(), 60)
  else coachInput.blur()
}
el('coach-toggle').addEventListener('click', () => toggleCoach())
el('coach-close').addEventListener('click', () => toggleCoach(false))

async function sendCoach() {
  const text = coachInput.value.trim()
  if (!text) return
  coachInput.value = ''
  addLine(coachLog, 'tú', text, 'me')
  const pending = addLine(coachLog, '', '···', 'them pending')
  try {
    const { reply } = await askCoach(text, activeMission(), missionState())
    pending.remove()
    coachSay(reply)
  } catch (e) {
    pending.remove()
    coachSay('(offline) ' + e.message)
  }
}
el('coach-send').addEventListener('click', sendCoach)
coachInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); sendCoach() }
  if (e.key === 'Escape') toggleCoach(false)
})

// first-run: arrival sequence
const introEl = document.getElementById('intro')
if (!localStorage.getItem('passport_welcomed')) {
  introEl.classList.remove('hidden')
  document.getElementById('intro-start').addEventListener('click', () => {
    localStorage.setItem('passport_welcomed', '1')
    introEl.classList.add('hidden')
    sound.start()
    setTimeout(() => {
      toggleCoach(true)
      coachSay("There you are! Rough landing, huh — the bus company says your bag is 'somewhere'. Breathe. I'm Marco, the only person in this town who speaks English, so use me well: press C anytime, this pane is me. Rule one of being stranded: eat. Pilar's fruit stall, east side of the plaza — buy three bananas. In Hindi. Say: mujhe teen kele chahiye. Go.")
    }, 700)
  })
} else {
  introEl.classList.add('hidden')
}

// ---------------------------------------------------------------------------
// key panel
// ---------------------------------------------------------------------------
el('key-open').addEventListener('click', () => {
  keyInput.value = getKey()
  keyPanel.classList.remove('hidden')
  keyInput.focus()
})
el('key-save').addEventListener('click', () => {
  setKey(keyInput.value.trim())
  keyPanel.classList.add('hidden')
  el('key-open').textContent = getKey() ? 'API ✓' : 'API'
serverReady.then(ok => { if (ok) el('key-open').classList.add('hidden') })
})
el('key-cancel').addEventListener('click', () => keyPanel.classList.add('hidden'))
el('key-forget').addEventListener('click', () => { resetKnowledge(); forgetAll() })
el('key-open').textContent = getKey() ? 'API ✓' : 'API'
el('mute').addEventListener('click', () => {
  el('mute').textContent = sound.toggleMute() ? 'sound ✕' : 'sound ✓'
})
el('mute').textContent = sound.isMuted() ? 'sound ✕' : 'sound ✓'
el('voice').addEventListener('click', () => {
  const on = tts.toggle()
  el('voice').textContent = on ? 'voice ✓' : 'voice ✕'
  el('voice').classList.toggle('on', on)
})
el('voice').textContent = tts.isEnabled() ? 'voice ✓' : 'voice ✕'
el('voice').classList.toggle('on', tts.isEnabled())

// global keys
window.addEventListener('keydown', e => {
  if (uiFocused()) return
  const k = e.key.toLowerCase()
  if (k === 'e' && nearby && !talking) openConvo(nearby)
  if (k === 'escape' && talking) closeConvo()
  if (k === 'c' && !talking) toggleCoach()
})

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

// ---------------------------------------------------------------------------
// loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock()
let simTime = 0
const clockEl = el('clock')

function step(dt) {
  simTime += dt
  const t = simTime

  // walking, the camera, and the player's gait — see the MOVEMENT section
  stepMovement(dt)

  // residents idle + face player
  RESIDENTS.forEach((r, i) => {
    const g = r.group
    g.userData.body.position.y = Math.sin(t * 1.6 + i * 1.7) * 0.018
    if (g.userData.turnTo) {
      const want = Math.atan2(g.userData.turnTo.x - g.position.x, g.userData.turnTo.z - g.position.z)
      let diff = want - g.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      g.rotation.y += diff * Math.min(1, dt * 5)
    }
    const d = g.position.distanceTo(player.position)
    if (d < 6) {
      const want = Math.atan2(player.position.x - g.position.x, player.position.z - g.position.z) - g.rotation.y
      let a2 = want
      while (a2 > Math.PI) a2 -= Math.PI * 2
      while (a2 < -Math.PI) a2 += Math.PI * 2
      g.userData.head.rotation.y += (Math.max(-0.9, Math.min(0.9, a2)) - g.userData.head.rotation.y) * Math.min(1, dt * 4)
    } else {
      g.userData.head.rotation.y *= 0.95
    }
  })

  // ambient life
  ambient.update(dt, t, player.position)

  // sea shimmer
  sea.position.y = -0.35 + Math.sin(t * 0.6) * 0.03
  sound.setListener(player.position.z)

  // proximity
  if (!talking) {
    nearby = null
    let best = 99
    for (const r of RESIDENTS) {
      const d = Math.abs(r.tile[0] - pos.x) + Math.abs(r.tile[1] - pos.z)
      if (d <= 2 && d < best) { best = d; nearby = r }
    }
    if (nearby) {
      const m = missionFor(nearby.id)
      talkPrompt.innerHTML = `<kbd>E</kbd> ${nearby.name} se baat karo` + (m ? ' ★' : '')
      talkPrompt.classList.remove('hidden')
    } else {
      talkPrompt.classList.add('hidden')
      RESIDENTS.forEach(r => { r.group.userData.turnTo = null })
    }
  }

  const mins = 10 * 60 + 30 + Math.floor(t * 2)
  clockEl.textContent = `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05)
  step(dt)
  composer.render()
  requestAnimationFrame(tick)
}
tick()

// --- debug / playtest harness ----------------------------------------------
// The loop is driven by rAF normally, but `step` can be called directly so the
// whole game can be played without a compositing window.
window.__game = { renderer, scene, camera, player, RESIDENTS, composer, step }
window.__test = {
  step,
  pos,
  getNearby: () => nearby && nearby.id,
  getTalking: () => talking && talking.id,
  press: k => keys.add(k),
  release: k => keys.delete(k),
  openConvo, closeConvo, send, toggleCoach, sendCoach,
  setInput: v => { cvInput.value = v },
  setCoachInput: v => { coachInput.value = v },
  logText: () => [...cvLog.querySelectorAll('.cv-line')].map(e => e.textContent),
  coachText: () => [...coachLog.querySelectorAll('.cv-line')].map(e => e.textContent),
  missionCard: () => missionCard.textContent,
  promptText: () => talkPrompt.classList.contains('hidden') ? null : talkPrompt.textContent,
  toastText: () => toast.classList.contains('hidden') ? null : toast.textContent,
  // walk there for real: the controller paths on the grid and then *drives
  // itself* through the same physics the keyboard uses, so this still proves
  // the town is traversable — and now also that it is walkable.
  walkTo(tx, tz, maxSteps = 4000) {
    const r = controller.moveToTile(tx, tz)
    if (!r.ok) return { ok: false, reason: r.reason, at: [pos.x, pos.z] }
    let steps = 0
    while (controller.navBusy() && steps++ < maxSteps) step(0.05)
    return {
      ok: pos.x === tx && pos.z === tz,
      state: controller.navState,
      tiles: r.tiles,
      steps,
      at: [pos.x, pos.z],
    }
  },
  // continuous-movement probes
  hold(dir, seconds, run = false, dt = 1 / 60) {
    const k = { up: 'w', down: 's', left: 'a', right: 'd' }[dir] || dir
    keys.add(k); if (run) keys.add('shift')
    for (let t = 0; t < seconds; t += dt) step(dt)
    keys.delete(k); keys.delete('shift')
    return { at: [pos.x, pos.z], world: player.position.toArray().map(n => +n.toFixed(3)) }
  },
  ctl: controller,
  playerPos: () => player.position.toArray().map(n => +n.toFixed(3)),
  camPos: () => camera.position.toArray().map(n => +n.toFixed(3)),
  speed: () => +controller.speed.toFixed(3),
}


// --- session API spend, polled from the server (which sees every call) -----
;(function costMeter() {
  const el = document.getElementById('cost')
  if (!el) return
  let last = 0
  async function poll() {
    try {
      const r = await fetch('/api/cost')
      if (r.ok) {
        const c = await r.json()
        el.textContent = '$' + c.usd.toFixed(4)
        el.title = `session spend — ${c.model}\n` +
          `LLM: ${c.gemini.calls} calls, ${c.gemini.in} in / ${c.gemini.out} out tokens, $${c.gemini.usd.toFixed(4)}\n` +
          `voice: ${c.tts.calls} lines (${c.tts.cached} cached), $${c.tts.usd.toFixed(4)}`
        if (c.usd > last) {
          el.classList.add('spending')
          setTimeout(() => el.classList.remove('spending'), 900)
          last = c.usd
        }
      }
    } catch {}
    setTimeout(poll, 3000)
  }
  poll()
})()


// --- model switch: flash-lite is the default because 3.7-flash costs ~14x
// and runs ~3x slower for a marginal quality gain. The cost readout next to
// it makes that tradeoff visible while you play.
;(function modelSwitch() {
  const btn = document.getElementById('model')
  if (!btn) return
  const LITE = 'gemini-3.5-flash-lite'
  const BIG = 'gemini-3.7-flash'
  const label = () => {
    const m = getModel() || LITE
    btn.textContent = m === BIG ? '3.7' : 'lite'
    btn.classList.toggle('on', m === BIG)
    btn.title = m === BIG
      ? 'gemini-3.7-flash — richer, ~3s per reply, ~14x the cost. Click for lite.'
      : 'gemini-3.5-flash-lite — ~0.9s per reply, cheapest. Click for 3.7-flash.'
  }
  btn.addEventListener('click', () => {
    setModel((getModel() || LITE) === BIG ? LITE : BIG)
    label()
  })
  label()
})()
