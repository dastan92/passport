import * as THREE from 'three'
import { buildTown, isWalkable, tileToWorld, TILE } from './town.js'
import { buildPerson, RESIDENTS } from './people.js'

// ---------------------------------------------------------------------------
// renderer / scene
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf0dfc0) // warm haze sky
scene.fog = new THREE.Fog(0xf0dfc0, 42, 95)

// ---------------------------------------------------------------------------
// light — the main character. Low evening Andalusian sun.
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xffdcae, 2.6)
sun.position.set(-22, 26, 14)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -35
sun.shadow.camera.right = 35
sun.shadow.camera.top = 35
sun.shadow.camera.bottom = -35
sun.shadow.camera.far = 90
sun.shadow.bias = -0.0004
scene.add(sun)

// cool blue fill from the sky, warm bounce from the ground
const hemi = new THREE.HemisphereLight(0xbcd0f0, 0xd8b98e, 0.85)
scene.add(hemi)

// ---------------------------------------------------------------------------
// world + people
// ---------------------------------------------------------------------------
buildTown(scene)

for (const r of RESIDENTS) {
  const g = buildPerson(r.look)
  const p = tileToWorld(r.tile[0], r.tile[1])
  g.position.copy(p)
  g.rotation.y = r.facing
  r.group = g
  scene.add(g)
}

// player — the newcomer, slightly bluer outfit so you can find yourself
const player = buildPerson({ skin: 0xdca57e, outfit: 0x2450a4, accent: 0xf0e8d8, hair: 0x2e2a26 })
scene.add(player)

// ---------------------------------------------------------------------------
// grid movement: the world renders in 3D but thinks in tiles
// ---------------------------------------------------------------------------
const pos = { x: 9, z: 8 }          // current tile
const target = { x: 9, z: 8 }       // tile we are lerping toward
let moveT = 1                        // 0..1 lerp progress
const MOVE_TIME = 0.22               // seconds per tile

player.position.copy(tileToWorld(pos.x, pos.z))

const keys = new Set()
window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()))
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()))

function tryStep(dx, dz) {
  if (moveT < 1 || talking) return
  const nx = pos.x + dx
  const nz = pos.z + dz
  player.rotation.y = Math.atan2(dx, dz)
  if (!isWalkable(nx, nz)) return
  // no walking through residents
  if (RESIDENTS.some(r => r.tile[0] === nx && r.tile[1] === nz)) return
  target.x = nx
  target.z = nz
  moveT = 0
}

// ---------------------------------------------------------------------------
// conversation state (voice loop arrives in the next phase; this is the shell)
// ---------------------------------------------------------------------------
let talking = null
let nearby = null

const talkPrompt = document.getElementById('talk-prompt')
const subtitles = document.getElementById('subtitles')
const speakerEl = document.getElementById('speaker')
const lineEl = document.getElementById('line')
const hintEl = document.getElementById('controls-hint')

function startTalk(r) {
  talking = r
  speakerEl.textContent = `${r.name.toUpperCase()} · ${r.role.toUpperCase()}`
  lineEl.textContent = r.greeting.es
  subtitles.classList.remove('hidden')
  talkPrompt.classList.add('hidden')
  hintEl.textContent = 'Esc salir'
  r.group.lookAt(player.position.x, r.group.position.y, player.position.z)
}

function endTalk() {
  talking = null
  subtitles.classList.add('hidden')
  hintEl.textContent = 'WASD move · E hablar · Esc salir'
}

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase()
  if (k === 'e' && nearby && !talking) startTalk(nearby)
  if (k === 'escape' && talking) endTalk()
})

// ---------------------------------------------------------------------------
// camera: high three-quarter diorama view; eases in during conversation
// ---------------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 200)
const CAM_ROAM = new THREE.Vector3(13, 15, 13)
const CAM_TALK = new THREE.Vector3(5.5, 4.5, 5.5)
const camOffset = CAM_ROAM.clone()
const lookAt = new THREE.Vector3()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ---------------------------------------------------------------------------
// main loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock()
let bobT = 0

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05)

  // input
  if (keys.has('w') || keys.has('arrowup')) tryStep(0, -1)
  else if (keys.has('s') || keys.has('arrowdown')) tryStep(0, 1)
  else if (keys.has('a') || keys.has('arrowleft')) tryStep(-1, 0)
  else if (keys.has('d') || keys.has('arrowright')) tryStep(1, 0)

  // tile lerp
  if (moveT < 1) {
    moveT = Math.min(1, moveT + dt / MOVE_TIME)
    const a = tileToWorld(pos.x, pos.z)
    const b = tileToWorld(target.x, target.z)
    player.position.lerpVectors(a, b, moveT)
    // walk bob
    bobT += dt * 14
    player.position.y = Math.abs(Math.sin(bobT)) * 0.08
    if (moveT === 1) {
      pos.x = target.x
      pos.z = target.z
      player.position.y = 0
    }
  }

  // idle sway for residents
  const t = clock.elapsedTime
  RESIDENTS.forEach((r, i) => {
    if (r.group) r.group.rotation.z = Math.sin(t * 1.3 + i * 2.1) * 0.015
  })

  // proximity check
  if (!talking) {
    nearby = null
    for (const r of RESIDENTS) {
      const d = Math.abs(r.tile[0] - pos.x) + Math.abs(r.tile[1] - pos.z)
      if (d <= 1) { nearby = r; break }
    }
    if (nearby) {
      talkPrompt.innerHTML = `<kbd>E</kbd> hablar con ${nearby.name}`
      talkPrompt.classList.remove('hidden')
    } else {
      talkPrompt.classList.add('hidden')
    }
  }

  // camera
  const wantOffset = talking ? CAM_TALK : CAM_ROAM
  camOffset.lerp(wantOffset, 1 - Math.exp(-dt * 3))
  const focus = talking
    ? talking.group.position.clone().add(player.position).multiplyScalar(0.5).add(new THREE.Vector3(0, 1.1, 0))
    : player.position.clone().add(new THREE.Vector3(0, 0.6, 0))
  lookAt.lerp(focus, 1 - Math.exp(-dt * 4))
  camera.position.copy(lookAt).add(camOffset)
  camera.lookAt(lookAt)

  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}

tick()

// debug handle for automated verification
window.__game = { renderer, scene, camera, player, RESIDENTS }
