import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Real rigged characters.
//
// Quaternius' "Ultimate Animated Character Pack" (CC0) — one 23-bone armature
// shared by every human, so every model takes the same clips and the same
// tinting rules. Each .glb here was converted from the pack's .gltf and
// stripped down to the Idle / Walk / Run clips (see game/assets/CREDITS.md).
//
// The pack's house style paints skin near-black; every material is a flat
// baseColorFactor with no textures, which is exactly what we want — we retint
// Skin / Shirt / Pants / Hair per resident straight from their `look` object,
// so eight residents out of six models still read as eight different people.
//
// Everything in here is optional. If the loader, a file, or the whole vendor
// directory is missing, loadCharacterModels() resolves to an empty cache and
// people.js quietly keeps its primitive builders.
// ---------------------------------------------------------------------------

const ASSETS = new URL('../assets/characters/', import.meta.url)

export const HUMAN_MODELS = {
  Casual_Male: 'Casual_Male.glb',
  Casual2_Male: 'Casual2_Male.glb',
  Casual_Female: 'Casual_Female.glb',
  Casual_Bald: 'Casual_Bald.glb',
  OldClassy_Male: 'OldClassy_Male.glb',
  Chef_Female: 'Chef_Female.glb',
  Chef_Hat: 'Chef_Hat.glb',
  Worker_Female: 'Worker_Female.glb',
  OldClassy_Female: 'OldClassy_Female.glb',
  Suit_Male: 'Suit_Male.glb',
}

export const ANIMAL_MODELS = {
  ShibaInu: 'ShibaInu.glb',
}

const ALL_MODELS = { ...HUMAN_MODELS, ...ANIMAL_MODELS }

// Models are authored ~3.25 units tall (head top at y=3.13, hair to 3.31).
// The hand-built villagers this replaces stood ~2.05 units, and the camera
// framing is tuned for that, so bring them down to match.
export const HUMAN_SCALE = 2.05 / 3.25
export const DOG_SCALE = 0.75 / 3.1

// ---------------------------------------------------------------------------
// loading
// ---------------------------------------------------------------------------

const _cache = new Map()
let _loadPromise = null
let _clone = null

export function modelsReady() {
  return _cache.size > 0
}

export function getModel(name) {
  return _cache.get(name) || null
}

export function loadCharacterModels() {
  if (_loadPromise) return _loadPromise
  _loadPromise = (async () => {
    let GLTFLoader
    try {
      const [loaderMod, skelMod] = await Promise.all([
        import('../vendor/jsm/loaders/GLTFLoader.js'),
        import('../vendor/jsm/utils/SkeletonUtils.js'),
      ])
      GLTFLoader = loaderMod.GLTFLoader
      _clone = skelMod.clone
    } catch (err) {
      console.warn('[characters] GLTFLoader unavailable — staying on primitives', err)
      return _cache
    }

    const loader = new GLTFLoader()
    await Promise.all(Object.entries(ALL_MODELS).map(([name, file]) =>
      loader.loadAsync(new URL(file, ASSETS).href)
        .then((gltf) => { _cache.set(name, gltf) })
        .catch((err) => { console.warn('[characters] could not load', file, err) })))
    return _cache
  })()
  return _loadPromise
}

// ---------------------------------------------------------------------------
// tinting
//
// The pack names its material slots, and the names are consistent across the
// whole set: Skin / Face / Hair / Shirt / Clothes / Pants / Belt / Vest /
// Band / Detail(s) / DarkClothes / Black / Hat / Moustache. That lets one
// table drive every character off the existing `look` objects.
// ---------------------------------------------------------------------------

function shade(hex, k) {
  const c = new THREE.Color(hex)
  c.multiplyScalar(k)
  return c.getHex()
}

function colourFor(slot, look) {
  // per-model escape hatch: look.slots wins over the table below, for the
  // cases where a model's material means something different on that model
  if (look.slots && look.slots[slot] !== undefined) return look.slots[slot]
  switch (slot) {
    case 'skin': return look.skin
    // the white wedges are the eyes — tinting them to skin blinds the face
    case 'face': return 0xf6f1e6
    case 'hair':
    case 'moustache': return look.hair
    // only recolour a hat the look actually asks for — Doña Carmen's black
    // widow's hat and the chef's toque are already the right colour
    case 'hat': return look.hat ?? null
    case 'shirt':
    case 'clothes':
    case 'main': return look.outfit
    case 'vest':
    case 'band':
    case 'detail':
    case 'details': return look.accent ?? shade(look.outfit, 0.65)
    case 'pants':
    case 'darkclothes':
    case 'black': return look.trousers ?? 0x4a4550
    case 'belt': return shade(look.trousers ?? 0x4a4550, 0.65)
    default: return null
  }
}

function tintedMaterial(src, look) {
  const m = src.clone()
  const hex = colourFor((src.name || '').toLowerCase(), look)
  if (hex !== null && hex !== undefined) m.color.setHex(hex)
  // match the town's material register: matte plaster-and-cotton, never shiny
  m.roughness = 0.82
  m.metalness = 0
  return m
}

// ---------------------------------------------------------------------------
// instancing
// ---------------------------------------------------------------------------

const _live = []
const _clock = new THREE.Clock()
let _lastFrame = -1
let _manual = false

const _wp = new THREE.Vector3()
const _prev = new THREE.Vector3()
const _axis = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _delta = new THREE.Quaternion()
const UP = new THREE.Vector3(0, 1, 0)

/**
 * Clone one loaded model, retint it for `look`, and wire up an AnimationMixer.
 * Returns null when the model is not loaded, so callers can fall back.
 */
export function instantiateCharacter(name, look, opts = {}) {
  const gltf = _cache.get(name)
  if (!gltf || !_clone) return null

  let root
  try {
    root = _clone(gltf.scene)
  } catch (err) {
    console.warn('[characters] clone failed for', name, err)
    return null
  }

  const hide = new Set((look.hideParts || []).map(s => s.toLowerCase()))
  let headBone = null
  root.traverse((o) => {
    if (o.isBone && o.name === 'Head') headBone = o
    if (!o.isMesh) return
    const slot = (o.material?.name || '').toLowerCase()
    if (hide.has(slot)) { o.visible = false; return }
    o.material = tintedMaterial(o.material, look)
    o.castShadow = true
    o.receiveShadow = true
    // skinned bounds are computed from the bind pose and the clips reach
    // outside them; these are ~2k triangles each, culling is not worth a pop
    o.frustumCulled = false
  })

  const mixer = new THREE.AnimationMixer(root)
  const actions = {}
  for (const clip of gltf.animations) {
    const key = clip.name.toLowerCase()
    actions[key] = mixer.clipAction(clip)
  }
  const idle = actions.idle || null
  const walk = actions.walk || null
  const run = actions.run || actions.gallop || walk

  if (idle) { idle.play() }

  const rec = {
    name, root, mixer, actions,
    idle, walk, run,
    current: idle,
    headBone,
    headProxy: opts.headProxy || null,
    headMax: opts.headMax ?? 0.7,
    walkAt: opts.walkAt ?? 2.0,
    runAt: opts.runAt ?? 4.5,
    tracked: opts.tracked || root,
    prev: null,
    speed: 0,
    forced: null,
  }
  _live.push(rec)
  attachAutoTick(root)

  root.userData.record = rec
  return rec
}

export function releaseCharacter(rec) {
  const i = _live.indexOf(rec)
  if (i >= 0) _live.splice(i, 1)
}

function fadeTo(rec, next, dur = 0.28) {
  if (!next || next === rec.current) return
  next.enabled = true
  next.setEffectiveWeight(1)
  next.reset().play()
  if (rec.current) next.crossFadeFrom(rec.current, dur, true)
  rec.current = next
}

function updateOne(rec, dt) {
  // Nobody outside owns the walk/idle decision, so derive it from how far the
  // group actually travelled — that works for the player (moved by main.js),
  // for wandering villagers (moved by ambient.js), and for anything later.
  rec.tracked.getWorldPosition(_wp)
  if (rec.prev === null) {
    rec.prev = _wp.clone()
  } else {
    _prev.copy(rec.prev)
    const inst = _prev.distanceTo(_wp) / Math.max(dt, 1e-4)
    rec.speed += (inst - rec.speed) * Math.min(1, dt * 12)
    rec.prev.copy(_wp)
  }

  const state = rec.forced
    || (rec.speed < 0.35 ? 'idle' : rec.speed < rec.runAt ? 'walk' : 'run')

  if (state === 'idle') {
    fadeTo(rec, rec.idle)
  } else if (state === 'walk') {
    fadeTo(rec, rec.walk)
    if (rec.walk) rec.walk.setEffectiveTimeScale(clamp(rec.speed / rec.walkAt, 0.65, 1.9))
  } else {
    fadeTo(rec, rec.run)
    if (rec.run) rec.run.setEffectiveTimeScale(clamp(rec.speed / (rec.runAt * 1.6), 0.8, 1.8))
  }

  rec.mixer.update(dt)

  // Head turn rides on top of whatever the clip just wrote. main.js drives a
  // proxy object's rotation.y; convert that yaw into the bone's parent space
  // and pre-multiply, so the idle animation keeps playing underneath.
  const bone = rec.headBone
  const proxy = rec.headProxy
  if (bone && proxy) {
    const yaw = clamp(proxy.rotation.y, -rec.headMax, rec.headMax)
    if (Math.abs(yaw) > 0.001 && bone.parent) {
      bone.parent.getWorldQuaternion(_q).invert()
      _axis.copy(UP).applyQuaternion(_q).normalize()
      _delta.setFromAxisAngle(_axis, yaw)
      bone.quaternion.premultiply(_delta)
    }
  }
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

/**
 * Advance every live character. Called automatically once per rendered frame
 * (see attachAutoTick); pass a dt here to drive it by hand instead.
 */
export function tickCharacters(dt) {
  _manual = true
  const d = clamp(dt || 0, 0, 0.1)
  for (const rec of _live) updateOne(rec, d)
}

// The frame hook. requestAnimationFrame is frozen under the playtest harness
// and main.js owns its own loop, so hang the tick off the first character mesh
// that renders each frame: it fires for composer.render() and for a bare
// renderer.render(), and info.render.frame makes it exactly once per frame.
export function attachAutoTick(object) {
  object.traverse((o) => {
    if (!o.isMesh) return
    o.onBeforeRender = (renderer) => {
      if (_manual) return
      const frame = renderer.info.render.frame
      if (frame === _lastFrame) return
      _lastFrame = frame
      const dt = clamp(_clock.getDelta(), 0, 0.1)
      for (const rec of _live) updateOne(rec, dt)
    }
  })
}

export function liveCount() { return _live.length }
