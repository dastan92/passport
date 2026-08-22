import * as THREE from 'three'
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js'
import { buildTown, isWalkable, tileToWorld, groundHeight, PLAZA_H } from './town.js'
import { buildPerson, RESIDENTS } from './people.js'
import { spawnAmbient, createSoundscape } from './ambient.js'
import { ask, askCoach, getKey, setKey, forgetAll, learnerState } from './conversation.js'
import { activeMission, missionFor, completeMission, missionState } from './missions.js'
import * as tts from './tts.js'

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
scene.fog = new THREE.Fog(0xc4dcea, 55, 160)

// ---------------------------------------------------------------------------
// camera — perspective, high three-quarter follow. Warmth needs perspective.
// ---------------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 400)
const OFF_ROAM = new THREE.Vector3(0, 16.5, 14.5)
const OFF_TALK = new THREE.Vector3(2.2, 4.6, 5.4)
const camOffset = OFF_ROAM.clone()
const camLook = new THREE.Vector3()

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

const pos = { x: 20, z: 12 }
const target = { x: 20, z: 12 }
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

// ---------------------------------------------------------------------------
// movement
// ---------------------------------------------------------------------------
let moveT = 1
const MOVE_TIME = 0.19
let facing = 0

const startP = tileToWorld(pos.x, pos.z)
player.position.set(startP.x, groundHeight(pos.x, pos.z), startP.z)

const keys = new Set()
window.addEventListener('keydown', e => { if (!uiFocused()) keys.add(e.key.toLowerCase()) })
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()))
window.addEventListener('pointerdown', () => sound.start(), { once: false })
window.addEventListener('keydown', () => sound.start(), { once: true })

function occupied(x, z) {
  return RESIDENTS.some(r => r.tile[0] === x && r.tile[1] === z)
}
function tryStep(dx, dz) {
  facing = Math.atan2(dx, dz)
  if (moveT < 1 || talking) return
  const nx = pos.x + dx, nz = pos.z + dz
  if (!isWalkable(nx, nz) || occupied(nx, nz)) return
  target.x = nx; target.z = nz
  moveT = 0
}

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
    missionCard.innerHTML = '<div class="mc-title">Pueblo es tuyo</div><div class="mc-en">Free roam — talk to anyone</div>'
    return
  }
  missionCard.innerHTML =
    `<div class="mc-label">misión</div>` +
    `<div class="mc-title">${m.title}</div>` +
    `<div class="mc-en">${m.titleEn}</div>`
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
  talkPrompt.classList.add('hidden')
  cvStatus.textContent = getKey() ? '' : 'sin clave · respuestas limitadas'
  tts.speak(r.opener, r.id)
  setTimeout(() => cvInput.focus(), 60)
  r.group.userData.turnTo = player.position.clone()
}

function closeConvo() {
  tts.stop()
  talking = null
  panel.classList.add('hidden')
  cvInput.blur()
  keys.clear()
}

async function send() {
  const text = cvInput.value.trim()
  if (!text || !talking) return
  cvInput.value = ''
  addLine(cvLog, 'tú', text, 'me')
  const pending = addLine(cvLog, '', '···', 'them pending')
  cvStatus.textContent = 'pensando…'
  const r = talking
  const m = missionFor(r.id)
  try {
    const { reply, source } = await ask(r, text, m)
    if (talking !== r) return
    pending.remove()
    const line = addLine(cvLog, '', reply, 'them')
    tts.speak(reply, r.id)
    line.title = 'clic para repetir'
    line.style.cursor = 'pointer'
    line.addEventListener('click', () => tts.speak(reply, r.id))
    if (source.startsWith('error:')) cvStatus.textContent = 'API: ' + source.slice(6, 90)
    else if (source === 'scripted') cvStatus.textContent = 'sin clave · respuestas limitadas'
    else {
      const st = learnerState()
      cvStatus.textContent = `${st.level} · ${st.words.length} palabras`
    }
    // mission completion
    if (m && m.check(text)) {
      const done = completeMission(m.id)
      if (done) {
        showToast(`✓ ${done.title}`, done.reward?.item ? `conseguiste: ${done.reward.item}` : '')
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
function coachSay(text, speak = true) {
  const line = addLine(coachLog, 'marco', text, 'them coach-line')
  if (speak) tts.speak(text, 'coach')
  line.style.cursor = 'pointer'
  line.title = 'click to replay'
  line.addEventListener('click', () => tts.speak(text, 'coach'))
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

// first-run coach welcome
if (!localStorage.getItem('passport_welcomed')) {
  localStorage.setItem('passport_welcomed', '1')
  setTimeout(() => {
    toggleCoach(true)
    coachSay("Welcome to Pueblo. I'm Marco — the only English speaker in town, so make me count. First mission: Pilar's fruit stall, east side of the plaza. Buy three bananas. In Spanish. Say \"quiero tres plátanos, por favor\" and you're golden. I'm in this pane whenever you need me — press C.")
  }, 1200)
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
  el('key-open').textContent = getKey() ? 'clave ✓' : 'clave'
})
el('key-cancel').addEventListener('click', () => keyPanel.classList.add('hidden'))
el('key-forget').addEventListener('click', forgetAll)
el('key-open').textContent = getKey() ? 'clave ✓' : 'clave'
el('mute').addEventListener('click', () => {
  el('mute').textContent = sound.toggleMute() ? 'sonido ✕' : 'sonido ✓'
})
el('mute').textContent = sound.isMuted() ? 'sonido ✕' : 'sonido ✓'
el('voice').addEventListener('click', () => {
  const on = tts.toggle()
  el('voice').textContent = on ? 'voz ✓' : 'voz ✕'
  el('voice').classList.toggle('on', on)
})
el('voice').textContent = tts.isEnabled() ? 'voz ✓' : 'voz ✕'
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
let bob = 0
let simTime = 0
const clockEl = el('clock')

function step(dt) {
  simTime += dt
  const t = simTime

  if (!talking) {
    if (keys.has('w') || keys.has('arrowup')) tryStep(0, -1)
    else if (keys.has('s') || keys.has('arrowdown')) tryStep(0, 1)
    else if (keys.has('a') || keys.has('arrowleft')) tryStep(-1, 0)
    else if (keys.has('d') || keys.has('arrowright')) tryStep(1, 0)
  }

  if (moveT < 1) {
    moveT = Math.min(1, moveT + dt / MOVE_TIME)
    const a = tileToWorld(pos.x, pos.z), b = tileToWorld(target.x, target.z)
    const ya = groundHeight(pos.x, pos.z), yb = groundHeight(target.x, target.z)
    player.position.x = a.x + (b.x - a.x) * moveT
    player.position.z = a.z + (b.z - a.z) * moveT
    player.position.y = ya + (yb - ya) * moveT
    bob += dt * 15
    player.userData.body.position.y = Math.abs(Math.sin(bob)) * 0.07
    player.userData.body.rotation.z = Math.sin(bob) * 0.03
    player.userData.arms[0].rotation.x = Math.sin(bob) * 0.5
    player.userData.arms[1].rotation.x = -Math.sin(bob) * 0.5
    if (moveT === 1) { pos.x = target.x; pos.z = target.z }
  } else {
    player.userData.body.position.y *= 0.85
    player.userData.arms[0].rotation.x *= 0.8
    player.userData.arms[1].rotation.x *= 0.8
  }
  player.rotation.y += (facing - player.rotation.y) * Math.min(1, dt * 14)
  playerBlob.position.set(player.position.x, player.position.y + 0.03, player.position.z)

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
      talkPrompt.innerHTML = `<kbd>E</kbd> hablar con ${nearby.name}` + (m ? ' ★' : '')
      talkPrompt.classList.remove('hidden')
    } else {
      talkPrompt.classList.add('hidden')
      RESIDENTS.forEach(r => { r.group.userData.turnTo = null })
    }
  }

  // camera
  const wantOff = talking ? OFF_TALK : OFF_ROAM
  camOffset.lerp(wantOff, 1 - Math.exp(-dt * 3))
  const focus = talking
    ? new THREE.Vector3().addVectors(player.position, talking.group.position).multiplyScalar(0.5).add(new THREE.Vector3(0, 1.0, 0))
    : new THREE.Vector3().copy(player.position).add(new THREE.Vector3(0, 0.8, 0))
  camLook.lerp(focus, 1 - Math.exp(-dt * 5))
  camera.position.copy(camLook).add(camOffset)
  camera.lookAt(camLook)
  sun.target.position.copy(camLook)
  sun.position.copy(camLook).add(new THREE.Vector3(-30, 42, 20))

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
  // walk the grid with BFS — also proves the town is actually traversable
  walkTo(tx, tz, maxSteps = 4000) {
    const key = (x, z) => x + ',' + z
    const q = [[pos.x, pos.z]]
    const prev = new Map([[key(pos.x, pos.z), null]])
    while (q.length) {
      const [x, z] = q.shift()
      if (x === tx && z === tz) break
      for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, nz = z + dz
        if (!isWalkable(nx, nz) || occupied(nx, nz)) continue
        if (prev.has(key(nx, nz))) continue
        prev.set(key(nx, nz), [x, z])
        q.push([nx, nz])
      }
    }
    if (!prev.has(key(tx, tz))) return { ok: false, reason: 'unreachable' }
    const path = []
    let cur = [tx, tz]
    while (cur) { path.unshift(cur); cur = prev.get(key(cur[0], cur[1])) }
    let steps = 0
    for (let i = 1; i < path.length; i++) {
      const [nx, nz] = path[i]
      tryStep(nx - pos.x, nz - pos.z)
      while (moveT < 1 && steps++ < maxSteps) step(0.05)
    }
    return { ok: pos.x === tx && pos.z === tz, tiles: path.length - 1, at: [pos.x, pos.z] }
  },
}
