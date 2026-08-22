import * as THREE from 'three'
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js'
import { buildTown, isWalkable, tileToWorld, groundHeight, PLAZA_H } from './town.js'
import { buildPerson, RESIDENTS } from './people.js'
import { ask, getKey, setKey, forgetAll, learnerState } from './conversation.js'

// ---------------------------------------------------------------------------
// renderer
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf3e3c4)
scene.fog = new THREE.Fog(0xf3e3c4, 40, 110)

// ---------------------------------------------------------------------------
// camera — fixed isometric angle, orthographic. This is the Tunic signature:
// the view never rotates, so the town always reads the same way.
// ---------------------------------------------------------------------------
const ISO = new THREE.Vector3(1, 1.02, 1).normalize()
let zoom = 15                      // half-height of the view frustum, in world units
const ZOOM_ROAM = 15
const ZOOM_TALK = 7.2
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
const camTarget = new THREE.Vector3()
const camLook = new THREE.Vector3()

function applyCamera() {
  const a = window.innerWidth / window.innerHeight
  camera.left = -zoom * a
  camera.right = zoom * a
  camera.top = zoom
  camera.bottom = -zoom
  camera.updateProjectionMatrix()
}
applyCamera()

// ---------------------------------------------------------------------------
// light
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xffe2b8, 3.1)
sun.position.set(-26, 30, 16)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
const S = 34
sun.shadow.camera.left = -S
sun.shadow.camera.right = S
sun.shadow.camera.top = S
sun.shadow.camera.bottom = -S
sun.shadow.camera.near = 1
sun.shadow.camera.far = 110
sun.shadow.bias = -0.0006
sun.shadow.normalBias = 0.03
scene.add(sun)
scene.add(sun.target)

// cool sky fill + warm ground bounce
scene.add(new THREE.HemisphereLight(0xa8c4ee, 0xe0b884, 1.15))
// a soft warm fill from the opposite side so shadows aren't dead
const fill = new THREE.DirectionalLight(0xffd0a0, 0.35)
fill.position.set(20, 12, -14)
scene.add(fill)

// ---------------------------------------------------------------------------
// world
// ---------------------------------------------------------------------------
buildTown(scene)

for (const r of RESIDENTS) {
  const g = buildPerson(r.look)
  const p = tileToWorld(r.tile[0], r.tile[1])
  g.position.set(p.x, groundHeight(r.tile[0], r.tile[1]), p.z)
  g.rotation.y = r.facing
  r.group = g
  r.baseY = g.position.y
  scene.add(g)
}

const player = buildPerson({
  skin: 0xdca57e, outfit: 0x2f5fa8, accent: 0xf2ede2,
  hair: 0x2e2a26, trousers: 0x3a3f4a,
})
scene.add(player)

// soft contact shadow blob under each character — sells grounding cheaply
function contactBlob() {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshBasicMaterial({ color: 0x6a5334, transparent: true, opacity: 0.26, depthWrite: false }),
  )
  m.rotation.x = -Math.PI / 2
  return m
}
const playerBlob = contactBlob()
scene.add(playerBlob)
for (const r of RESIDENTS) {
  const b = contactBlob()
  b.position.set(r.group.position.x, r.baseY + 0.03, r.group.position.z)
  scene.add(b)
}

// ---------------------------------------------------------------------------
// post-processing
// ---------------------------------------------------------------------------
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.28,  // strength — subtle; sun glints and lamp glass only
  0.62,  // radius
  0.86,  // threshold
)
composer.addPass(bloom)
composer.addPass(new OutputPass())
composer.setSize(window.innerWidth, window.innerHeight)

// ---------------------------------------------------------------------------
// grid movement
// ---------------------------------------------------------------------------
const pos = { x: 10, z: 8 }
const target = { x: 10, z: 8 }
let moveT = 1
const MOVE_TIME = 0.2
let facing = 0

const start = tileToWorld(pos.x, pos.z)
player.position.set(start.x, groundHeight(pos.x, pos.z), start.z)

const keys = new Set()
window.addEventListener('keydown', e => {
  if (uiFocused()) return
  keys.add(e.key.toLowerCase())
})
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()))

function occupied(x, z) {
  return RESIDENTS.some(r => r.tile[0] === x && r.tile[1] === z)
}

function tryStep(dx, dz) {
  facing = Math.atan2(dx, dz)
  if (moveT < 1 || talking) return
  const nx = pos.x + dx, nz = pos.z + dz
  if (!isWalkable(nx, nz) || occupied(nx, nz)) return
  target.x = nx
  target.z = nz
  moveT = 0
}

// ---------------------------------------------------------------------------
// conversation UI
// ---------------------------------------------------------------------------
const el = id => document.getElementById(id)
const panel = el('convo')
const cvName = el('cv-name')
const cvRole = el('cv-role')
const cvLog = el('cv-log')
const cvInput = el('cv-input')
const cvSend = el('cv-send')
const cvClose = el('cv-close')
const cvStatus = el('cv-status')
const talkPrompt = el('talk-prompt')
const keyPanel = el('key-panel')
const keyInput = el('key-input')

let talking = null
let nearby = null
let showTranslation = localStorage.getItem('passport_tr') === '1'

function uiFocused() {
  return document.activeElement === cvInput || document.activeElement === keyInput
}

function addLine(who, text, cls) {
  const d = document.createElement('div')
  d.className = 'cv-line ' + (cls || '')
  if (who) {
    const w = document.createElement('span')
    w.className = 'cv-who'
    w.textContent = who
    d.appendChild(w)
  }
  const t = document.createElement('span')
  t.className = 'cv-text'
  t.textContent = text
  d.appendChild(t)
  cvLog.appendChild(d)
  cvLog.scrollTop = cvLog.scrollHeight
  return d
}

function openConvo(r) {
  talking = r
  cvName.textContent = r.name
  cvRole.textContent = r.role
  cvLog.innerHTML = ''
  addLine('', r.opener, 'them')
  if (showTranslation && r.openerEn) addLine('', r.openerEn, 'tr')
  panel.classList.remove('hidden')
  talkPrompt.classList.add('hidden')
  cvStatus.textContent = getKey() ? '' : 'sin clave · respuestas limitadas'
  setTimeout(() => cvInput.focus(), 60)
  r.group.userData.turnTo = player.position.clone()
}

function closeConvo() {
  talking = null
  panel.classList.add('hidden')
  cvInput.blur()
  keys.clear()
}

async function send() {
  const text = cvInput.value.trim()
  if (!text || !talking) return
  cvInput.value = ''
  addLine('tú', text, 'me')
  const pending = addLine('', '···', 'them pending')
  cvStatus.textContent = 'pensando…'
  const r = talking
  try {
    const { reply, source } = await ask(r, text)
    if (talking !== r) return
    pending.remove()
    addLine('', reply, 'them')
    if (source.startsWith('error:')) {
      cvStatus.textContent = 'API: ' + source.slice(6, 80)
    } else if (source === 'scripted') {
      cvStatus.textContent = 'sin clave · respuestas limitadas'
    } else {
      const st = learnerState()
      cvStatus.textContent = `${st.level} · ${st.words.length} palabras`
    }
  } catch (e) {
    pending.remove()
    cvStatus.textContent = 'error: ' + e.message
  }
}

cvSend.addEventListener('click', send)
cvInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); send() }
  if (e.key === 'Escape') closeConvo()
})
cvClose.addEventListener('click', closeConvo)

el('cv-translate').addEventListener('click', () => {
  showTranslation = !showTranslation
  localStorage.setItem('passport_tr', showTranslation ? '1' : '0')
  el('cv-translate').classList.toggle('on', showTranslation)
})
el('cv-translate').classList.toggle('on', showTranslation)

// key panel
el('key-open').addEventListener('click', () => {
  keyInput.value = getKey()
  keyPanel.classList.remove('hidden')
  keyInput.focus()
})
el('key-save').addEventListener('click', () => {
  setKey(keyInput.value.trim())
  keyPanel.classList.add('hidden')
  el('key-open').textContent = getKey() ? 'clave ✓' : 'clave'
  if (talking) cvStatus.textContent = getKey() ? 'listo' : 'sin clave'
})
el('key-cancel').addEventListener('click', () => keyPanel.classList.add('hidden'))
el('key-forget').addEventListener('click', forgetAll)
el('key-open').textContent = getKey() ? 'clave ✓' : 'clave'

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase()
  if (uiFocused()) return
  if (k === 'e' && nearby && !talking) openConvo(nearby)
  if (k === 'escape' && talking) closeConvo()
})

// ---------------------------------------------------------------------------
// resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  applyCamera()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

// ---------------------------------------------------------------------------
// loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock()
let bob = 0
const clockEl = el('clock')

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.elapsedTime

  if (!talking) {
    if (keys.has('w') || keys.has('arrowup')) tryStep(0, -1)
    else if (keys.has('s') || keys.has('arrowdown')) tryStep(0, 1)
    else if (keys.has('a') || keys.has('arrowleft')) tryStep(-1, 0)
    else if (keys.has('d') || keys.has('arrowright')) tryStep(1, 0)
  }

  // move
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
    player.userData.body.rotation.z *= 0.85
    player.userData.arms[0].rotation.x *= 0.8
    player.userData.arms[1].rotation.x *= 0.8
  }
  player.rotation.y += (facing - player.rotation.y) * Math.min(1, dt * 14)
  playerBlob.position.set(player.position.x, player.position.y + 0.03, player.position.z)

  // residents: breathe, and turn to face you when talking
  RESIDENTS.forEach((r, i) => {
    const g = r.group
    g.userData.body.position.y = Math.sin(t * 1.6 + i * 1.7) * 0.018
    g.userData.body.rotation.z = Math.sin(t * 1.1 + i * 2.3) * 0.012
    if (g.userData.turnTo) {
      const want = Math.atan2(g.userData.turnTo.x - g.position.x, g.userData.turnTo.z - g.position.z)
      let diff = want - g.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      g.rotation.y += diff * Math.min(1, dt * 5)
    }
    // head follows the player when close by
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

  // proximity
  if (!talking) {
    nearby = null
    let best = 99
    for (const r of RESIDENTS) {
      const d = Math.abs(r.tile[0] - pos.x) + Math.abs(r.tile[1] - pos.z)
      if (d <= 2 && d < best) { best = d; nearby = r }
    }
    if (nearby) {
      talkPrompt.innerHTML = `<kbd>E</kbd> hablar con ${nearby.name}`
      talkPrompt.classList.remove('hidden')
    } else {
      talkPrompt.classList.add('hidden')
      RESIDENTS.forEach(r => { r.group.userData.turnTo = null })
    }
  }

  // camera: fixed iso angle, follows player; zooms in for conversation
  const wantZoom = talking ? ZOOM_TALK : ZOOM_ROAM
  zoom += (wantZoom - zoom) * Math.min(1, dt * 3.2)
  applyCamera()

  const focus = talking
    ? new THREE.Vector3().addVectors(player.position, talking.group.position).multiplyScalar(0.5)
    : player.position
  camLook.lerp(focus, 1 - Math.exp(-dt * 5))
  camTarget.copy(camLook).addScaledVector(ISO, 60)
  camera.position.copy(camTarget)
  camera.lookAt(camLook)

  sun.target.position.copy(camLook)
  sun.position.copy(camLook).add(new THREE.Vector3(-26, 30, 16))

  // town clock drifts through the evening
  const mins = 18 * 60 + 40 + Math.floor(t * 2)
  clockEl.textContent = `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

  composer.render()
  requestAnimationFrame(tick)
}
tick()

window.__game = { renderer, scene, camera, player, RESIDENTS, composer }
