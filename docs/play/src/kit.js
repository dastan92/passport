import * as THREE from 'three'
import { RoundedBoxGeometry } from '../vendor/jsm/geometries/RoundedBoxGeometry.js'

// ---------------------------------------------------------------------------
// Building kit. Everything is rounded and slightly imperfect — Tunic's forms
// are chunky and hand-made, never sharp CAD boxes.
// ---------------------------------------------------------------------------

export const PAL = {
  // plaster — warm whites with a hint of ochre
  plaster: 0xfaf0dd,
  plasterWarm: 0xf2e0c0,
  plasterPink: 0xf0dcc8,
  plasterOchre: 0xe8cfa0,
  // roofs
  terracotta: 0xd4744a,
  terracottaDeep: 0xb85838,
  terracottaLight: 0xe08c5c,
  // woodwork
  door: 0x2f5fa8,
  doorTeal: 0x2c7a76,
  doorOlive: 0x6f8144,
  doorRed: 0xb4402f,
  wood: 0x9a7350,
  woodDark: 0x6f5238,
  // ground
  paving: 0xe6d5b4,
  pavingAlt: 0xdcc9a4,
  pavingWarm: 0xead9ba,
  dirt: 0xd9c49c,
  // nature
  olive: 0x87995a,
  oliveDark: 0x6c7d45,
  oliveLight: 0x9caf6b,
  geranium: 0xd94f3d,
  geraniumPink: 0xdb6f8f,
  bougainvillea: 0xc2478c,
  // stone / metal
  stone: 0xded0b4,
  stoneDark: 0xc4b394,
  iron: 0x4a4640,
  water: 0x5c93c9,
}

const _mats = new Map()
export function mat(color, opts = {}) {
  // NOTE: flat MUST be in the cache key. It was not, so whichever caller asked
// for a colour first won, and every later flatShading request was silently
// dropped — flat-shaded roofs and foliage were rendering smooth.
const key = color + '|' + (opts.rough ?? 0.85) + '|' + (opts.metal ?? 0) + '|' + (opts.flat ? 1 : 0)
  if (!_mats.has(key)) {
    _mats.set(key, new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0,
      flatShading: opts.flat ?? false,
    }))
  }
  return _mats.get(key)
}

// rounded box — the workhorse. r scales with size so small props stay crisp.
export function rbox(w, h, d, color, radius, opts) {
  const r = radius ?? Math.min(0.09, w * 0.12, h * 0.12, d * 0.12)
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), mat(color, opts))
  m.castShadow = true
  m.receiveShadow = true
  return m
}

export function cyl(rt, rb, h, seg, color, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts))
  m.castShadow = true
  m.receiveShadow = true
  return m
}

export function sph(r, color, detail = 1, opts) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(color, opts))
  m.castShadow = true
  return m
}

export function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// --- props -----------------------------------------------------------------

export function flowerPot(rng, colour) {
  const g = new THREE.Group()
  const pot = cyl(0.17, 0.13, 0.24, 8, PAL.terracottaDeep)
  pot.position.y = 0.12
  g.add(pot)
  const soil = cyl(0.155, 0.155, 0.04, 8, 0x4a3826)
  soil.position.y = 0.235
  g.add(soil)
  const n = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const leaf = sph(0.1 + rng() * 0.07, PAL.oliveDark, 0)
    leaf.position.set((rng() - 0.5) * 0.24, 0.3 + rng() * 0.1, (rng() - 0.5) * 0.24)
    g.add(leaf)
  }
  for (let i = 0; i < n; i++) {
    const bloom = sph(0.045 + rng() * 0.03, colour ?? (rng() > 0.5 ? PAL.geranium : PAL.geraniumPink), 0)
    bloom.position.set((rng() - 0.5) * 0.3, 0.38 + rng() * 0.14, (rng() - 0.5) * 0.3)
    g.add(bloom)
  }
  return g
}

export function oliveTree(rng, scale = 1) {
  const g = new THREE.Group()
  const trunk = cyl(0.13, 0.22, 1.5, 7, PAL.wood)
  trunk.position.y = 0.75
  g.add(trunk)
  // a couple of forked branches
  for (let i = 0; i < 2; i++) {
    const br = cyl(0.06, 0.09, 0.7, 5, PAL.wood)
    br.position.set((rng() - 0.5) * 0.4, 1.45, (rng() - 0.5) * 0.4)
    br.rotation.z = (rng() - 0.5) * 0.9
    br.rotation.x = (rng() - 0.5) * 0.9
    g.add(br)
  }
  const blobs = 4 + Math.floor(rng() * 3)
  for (let i = 0; i < blobs; i++) {
    const s = 0.55 + rng() * 0.45
    const c = [PAL.olive, PAL.oliveDark, PAL.oliveLight][Math.floor(rng() * 3)]
    const blob = sph(s, c, 1, { flat: true })
    blob.position.set((rng() - 0.5) * 1.3, 1.85 + rng() * 0.85, (rng() - 0.5) * 1.3)
    g.add(blob)
  }
  g.scale.setScalar(scale)
  return g
}

export function grassTuft(rng) {
  const g = new THREE.Group()
  const n = 2 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const blade = cyl(0.005, 0.03, 0.16 + rng() * 0.14, 4, rng() > 0.5 ? PAL.olive : PAL.oliveLight)
    blade.position.set((rng() - 0.5) * 0.18, 0.09, (rng() - 0.5) * 0.18)
    blade.rotation.z = (rng() - 0.5) * 0.5
    blade.castShadow = false
    g.add(blade)
  }
  return g
}

export function crate(rng) {
  const g = new THREE.Group()
  const c = rbox(0.5, 0.4, 0.5, rng() > 0.5 ? PAL.wood : PAL.woodDark, 0.04)
  c.position.y = 0.2
  g.add(c)
  if (rng() > 0.5) {
    const c2 = rbox(0.42, 0.34, 0.42, PAL.woodDark, 0.04)
    c2.position.set((rng() - 0.5) * 0.1, 0.57, (rng() - 0.5) * 0.1)
    c2.rotation.y = rng() * 0.6
    g.add(c2)
  }
  return g
}

export function barrel(rng) {
  const g = new THREE.Group()
  const b = cyl(0.24, 0.28, 0.62, 10, PAL.woodDark)
  b.position.y = 0.31
  g.add(b)
  for (const y of [0.16, 0.46]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.022, 5, 12), mat(PAL.iron, { rough: 0.6, metal: 0.4 }))
    hoop.rotation.x = Math.PI / 2
    hoop.position.y = y
    g.add(hoop)
  }
  return g
}

export function bench() {
  const g = new THREE.Group()
  const seat = rbox(1.5, 0.1, 0.45, PAL.wood, 0.04)
  seat.position.y = 0.46
  g.add(seat)
  const back = rbox(1.5, 0.42, 0.09, PAL.wood, 0.04)
  back.position.set(0, 0.72, -0.19)
  g.add(back)
  for (const x of [-0.6, 0.6]) {
    const leg = rbox(0.1, 0.46, 0.4, PAL.iron, 0.03)
    leg.position.set(x, 0.23, 0)
    g.add(leg)
  }
  return g
}

export function lamp() {
  const g = new THREE.Group()
  const post = cyl(0.06, 0.09, 3.0, 8, PAL.iron, { rough: 0.55, metal: 0.5 })
  post.position.y = 1.5
  g.add(post)
  const arm = cyl(0.05, 0.05, 0.5, 6, PAL.iron, { rough: 0.55, metal: 0.5 })
  arm.rotation.z = Math.PI / 2
  arm.position.set(0.22, 2.95, 0)
  g.add(arm)
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.3, 6),
    mat(PAL.iron, { rough: 0.5, metal: 0.5 }),
  )
  head.position.set(0.45, 2.82, 0)
  g.add(head)
  // glass that glows at dusk — bloom picks this up
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffe0a0, emissive: 0xffc766, emissiveIntensity: 2.2, roughness: 0.4,
    }),
  )
  glass.position.set(0.45, 2.64, 0)
  g.add(glass)
  return g
}

export function marketStall(rng, clothColour) {
  const g = new THREE.Group()
  for (const [x, z] of [[-0.85, -0.5], [0.85, -0.5], [-0.85, 0.5], [0.85, 0.5]]) {
    const post = cyl(0.045, 0.045, 2.0, 6, PAL.woodDark)
    post.position.set(x, 1.0, z)
    g.add(post)
  }
  // canopy: two slanted planes
  for (const s of [-1, 1]) {
    const cloth = rbox(1.9, 0.06, 0.75, clothColour, 0.03)
    cloth.position.set(0, 2.05 + 0.12 * (s > 0 ? 1 : 1), s * 0.34)
    cloth.rotation.x = s * -0.32
    g.add(cloth)
  }
  const table = rbox(1.85, 0.09, 1.0, PAL.wood, 0.03)
  table.position.y = 0.9
  g.add(table)
  // produce piles
  const produce = [0xd4622f, 0xc9a227, 0x8a9a3a, 0xa63a52]
  for (let i = 0; i < 5; i++) {
    const p = sph(0.1 + rng() * 0.06, produce[Math.floor(rng() * produce.length)], 0)
    p.position.set((rng() - 0.5) * 1.5, 1.02, (rng() - 0.5) * 0.7)
    g.add(p)
  }
  return g
}

export function awning(width, colour) {
  const g = new THREE.Group()
  const cloth = rbox(width, 0.07, 0.85, colour, 0.03)
  cloth.rotation.x = -0.36
  g.add(cloth)
  const stripes = Math.max(2, Math.floor(width / 0.45))
  for (let i = 0; i < stripes; i++) {
    if (i % 2) continue
    const st = rbox(width / stripes * 0.9, 0.08, 0.86, 0xf7efe0, 0.02)
    st.position.set((i - (stripes - 1) / 2) * (width / stripes), 0.005, 0)
    st.rotation.x = -0.36
    g.add(st)
  }
  return g
}

export function bunting(from, to, height, rng) {
  const g = new THREE.Group()
  const colours = [0xd94f3d, 0xf0c04a, 0x4a8fc9, 0xf7efe0, 0x6f9a4a]
  const dir = new THREE.Vector3().subVectors(to, from)
  const len = dir.length()
  const steps = Math.max(4, Math.floor(len / 0.55))
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const sag = Math.sin(t * Math.PI) * 0.55
    pts.push(new THREE.Vector3(
      from.x + dir.x * t,
      height - sag,
      from.z + dir.z * t,
    ))
  }
  g.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x8a7a63 }),
  ))
  for (let i = 1; i < steps; i++) {
    const flag = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.26, 3),
      mat(colours[Math.floor(rng() * colours.length)]),
    )
    flag.position.copy(pts[i])
    flag.position.y -= 0.15
    flag.rotation.x = Math.PI
    flag.rotation.y = rng() * 0.5
    flag.castShadow = true
    g.add(flag)
  }
  return g
}

export function palmTree(rng) {
  const g = new THREE.Group()
  const segs = 5
  let px = 0
  const lean = (rng() - 0.5) * 0.5
  for (let i = 0; i < segs; i++) {
    const seg = cyl(0.1 - i * 0.012, 0.13 - i * 0.012, 0.75, 6, 0x9a7b52)
    px += lean * (i / segs)
    seg.position.set(px, 0.35 + i * 0.7, 0)
    seg.rotation.z = lean * 0.35
    g.add(seg)
  }
  const topY = 0.35 + segs * 0.7
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const frond = rbox(1.7, 0.05, 0.4, i % 2 ? 0x6f9a4a : 0x87a95a, 0.02)
    frond.position.set(px + Math.cos(a) * 0.8, topY + 0.1 - Math.abs(Math.sin(i)) * 0.12, Math.sin(a) * 0.8)
    frond.rotation.y = -a
    frond.rotation.z = 0.35 + rng() * 0.2
    g.add(frond)
  }
  for (let i = 0; i < 3; i++) {
    const coco = sph(0.09, 0x8a6f4d, 0)
    coco.position.set(px + (rng() - 0.5) * 0.3, topY - 0.15, (rng() - 0.5) * 0.3)
    g.add(coco)
  }
  return g
}

export function boat(rng, hue) {
  const g = new THREE.Group()
  const hull = rbox(1.1, 0.5, 2.6, hue, 0.16)
  hull.position.y = 0.25
  g.add(hull)
  const inner = rbox(0.8, 0.3, 2.2, PAL.wood, 0.1)
  inner.position.y = 0.45
  g.add(inner)
  const rim = rbox(1.16, 0.09, 2.66, PAL.woodDark, 0.04)
  rim.position.y = 0.52
  g.add(rim)
  for (const z of [-0.6, 0.3]) {
    const bench2 = rbox(0.85, 0.07, 0.3, PAL.wood, 0.02)
    bench2.position.set(0, 0.42, z)
    g.add(bench2)
  }
  return g
}

// --- facade / street-level helpers (low-camera pass) -----------------------

// small wooden signboard with painted text via canvas texture
export function signboard(text, colour = PAL.woodDark) {
  const g = new THREE.Group()
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#' + new THREE.Color(colour).getHexString()
  ctx.fillRect(0, 0, 256, 64)
  ctx.strokeStyle = 'rgba(247,239,224,0.85)'
  ctx.lineWidth = 3
  ctx.strokeRect(6, 6, 244, 52)
  ctx.fillStyle = '#f7efe0'
  ctx.font = 'bold 30px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 34)
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.44, 0.07),
    [
      mat(colour), mat(colour), mat(colour), mat(colour),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }),
      mat(colour),
    ],
  )
  board.castShadow = true
  board.receiveShadow = true
  // textured +z face turned to look down -z (facades face -z locally)
  board.rotation.y = Math.PI
  g.add(board)
  return g
}

// hanging plant on a small iron bracket — for facades
export function hangingPlant(rng) {
  const g = new THREE.Group()
  const bracket = rbox(0.05, 0.05, 0.4, PAL.iron, 0.02)
  bracket.position.set(0, 0, -0.2)
  g.add(bracket)
  const pot = cyl(0.14, 0.1, 0.18, 7, PAL.terracottaDeep)
  pot.position.set(0, -0.32, -0.36)
  g.add(pot)
  const n = 3 + Math.floor(rng() * 2)
  for (let i = 0; i < n; i++) {
    const leaf = sph(0.08 + rng() * 0.05, rng() > 0.5 ? PAL.olive : PAL.oliveDark, 0)
    leaf.position.set((rng() - 0.5) * 0.24, -0.24 - rng() * 0.2, -0.36 + (rng() - 0.5) * 0.24)
    g.add(leaf)
  }
  const bloom = sph(0.05, rng() > 0.5 ? PAL.bougainvillea : PAL.geranium, 0)
  bloom.position.set((rng() - 0.5) * 0.2, -0.3, -0.32)
  g.add(bloom)
  return g
}

// stone doorstep slab
export function doorstep(w = 1.4) {
  const s = rbox(w, 0.12, 0.55, PAL.stone, 0.03)
  s.position.y = 0.06
  return s
}

// terracotta chimney for rooflines
export function chimney(rng) {
  const g = new THREE.Group()
  const stack = rbox(0.34, 0.7 + rng() * 0.35, 0.34, PAL.plasterOchre, 0.04)
  stack.position.y = 0.4
  g.add(stack)
  const cap = rbox(0.44, 0.1, 0.44, PAL.terracottaDeep, 0.03)
  cap.position.y = 0.82
  g.add(cap)
  return g
}

// drainpipe running down a facade
export function drainpipe(h) {
  const g = new THREE.Group()
  const pipe = cyl(0.05, 0.05, h, 6, PAL.terracottaDeep)
  pipe.position.y = h / 2
  g.add(pipe)
  const elbow = cyl(0.05, 0.06, 0.3, 6, PAL.terracottaDeep)
  elbow.rotation.x = -1.1
  elbow.position.set(0, 0.12, -0.12)
  g.add(elbow)
  return g
}

// cafe umbrella
export function cafeUmbrella(rng, colour = 0xe8c56a) {
  const g = new THREE.Group()
  const pole = cyl(0.035, 0.035, 2.1, 6, PAL.woodDark)
  pole.position.y = 1.05
  g.add(pole)
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.5, 8), mat(colour, { flat: true }))
  top.position.y = 2.05
  top.rotation.y = rng() * Math.PI
  top.castShadow = true
  g.add(top)
  return g
}

// small stone fountain jet / spout column
export function fountainJet() {
  const g = new THREE.Group()
  const jet = cyl(0.05, 0.09, 0.65, 6, 0xbcd8ee)
  jet.position.y = 0.32
  const m2 = new THREE.MeshStandardMaterial({ color: 0xbcd8ee, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.7 })
  jet.material = m2
  jet.castShadow = false
  g.add(jet)
  const splash = sph(0.12, 0xdceefb, 0)
  splash.material = m2
  splash.castShadow = false
  splash.position.y = 0.68
  splash.scale.y = 0.5
  g.add(splash)
  return g
}

export function rock(rng) {
  const g = new THREE.Group()
  for (let i = 0; i < 3; i++) {
    const r = sph(0.35 + rng() * 0.4, i % 2 ? 0xa8a090 : 0x968e7e, 0, { flat: true })
    r.position.set((rng() - 0.5) * 0.8, 0.1 + rng() * 0.25, (rng() - 0.5) * 0.8)
    r.scale.y = 0.7
    g.add(r)
  }
  return g
}

// ===========================================================================
// 84x60 pass — pieces the six districts need. Everything below is built from
// the same rbox/cyl/sph primitives so it shares the cached material set.
// ===========================================================================

// A cheap olive tree for groves and hillsides: 5 meshes instead of ~12. The
// full oliveTree() is reserved for streets and squares you actually walk past.
export function oliveTreeSimple(rng, scale = 1) {
  const g = new THREE.Group()
  const trunk = cyl(0.14, 0.22, 1.4, 5, PAL.wood)
  trunk.position.y = 0.7
  trunk.receiveShadow = false
  g.add(trunk)
  for (let i = 0; i < 3; i++) {
    const s = 0.7 + rng() * 0.35
    const blob = sph(s, [PAL.olive, PAL.oliveDark, PAL.oliveLight][i], 0, { flat: true })
    blob.position.set((rng() - 0.5) * 0.9, 1.9 + rng() * 0.55, (rng() - 0.5) * 0.9)
    blob.receiveShadow = false
    g.add(blob)
  }
  g.scale.setScalar(scale)
  return g
}

// Tall dark cypress — the vertical accent a church square needs.
export function cypress(rng, scale = 1) {
  const g = new THREE.Group()
  const trunk = cyl(0.1, 0.16, 1.0, 5, PAL.woodDark)
  trunk.position.y = 0.5
  g.add(trunk)
  const h = 3.6 + rng() * 1.4
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, h, 7),
    mat(rng() > 0.5 ? 0x3f5a34 : 0x47643a, { flat: true }),
  )
  body.position.y = 0.9 + h / 2
  body.castShadow = true
  g.add(body)
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, h * 0.4, 6), mat(0x35502c, { flat: true }))
  cap.position.y = 0.9 + h * 0.82
  cap.castShadow = true
  g.add(cap)
  g.scale.setScalar(scale)
  return g
}

// Spiky coastal agave for scrub and headlands.
export function agave(rng) {
  const g = new THREE.Group()
  const n = 6 + Math.floor(rng() * 4)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.3
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.85 + rng() * 0.4, 3),
      mat(rng() > 0.5 ? 0x7f9a63 : 0x6d8a55, { flat: true }),
    )
    blade.position.set(Math.cos(a) * 0.22, 0.4, Math.sin(a) * 0.22)
    blade.rotation.z = Math.cos(a) * -0.6
    blade.rotation.x = Math.sin(a) * 0.6
    blade.castShadow = true
    g.add(blade)
  }
  return g
}

// Dry scrub bush — filler for the greenbelt and the road out.
export function scrubBush(rng) {
  const g = new THREE.Group()
  const n = 2 + Math.floor(rng() * 2)
  for (let i = 0; i < n; i++) {
    const b = sph(0.26 + rng() * 0.2, [0x8f9a63, 0x9caf6b, 0x7d8a55][Math.floor(rng() * 3)], 0, { flat: true })
    b.position.set((rng() - 0.5) * 0.5, 0.2 + rng() * 0.18, (rng() - 0.5) * 0.5)
    b.scale.y = 0.75
    b.receiveShadow = false
    g.add(b)
  }
  return g
}

// Post-and-rail fence run along +x, `len` world units.
export function fence(len, rng) {
  const g = new THREE.Group()
  const posts = Math.max(2, Math.round(len / 1.4))
  for (let i = 0; i <= posts; i++) {
    const p = cyl(0.055, 0.07, 1.0, 5, PAL.woodDark)
    p.position.set(-len / 2 + (i / posts) * len, 0.5, (rng() - 0.5) * 0.06)
    g.add(p)
  }
  for (const y of [0.4, 0.78]) {
    const rail = rbox(len, 0.07, 0.06, PAL.wood, 0.02)
    rail.position.set(0, y, 0)
    rail.rotation.z = (rng() - 0.5) * 0.012
    g.add(rail)
  }
  return g
}

export function haystack(rng) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.7, 8), mat(0xd7bd72, { flat: true }))
  body.position.y = 0.85
  body.castShadow = true
  body.receiveShadow = true
  g.add(body)
  const skirt = cyl(0.98, 1.05, 0.3, 8, 0xc9ae66)
  skirt.position.y = 0.15
  g.add(skirt)
  const pole = cyl(0.04, 0.04, 0.4, 4, PAL.woodDark)
  pole.position.y = 1.8
  g.add(pole)
  g.rotation.y = rng() * Math.PI
  return g
}

// Drying rack with nets — the signature harbour prop.
export function netRack(rng, colour = 0x9a8f6a) {
  const g = new THREE.Group()
  for (const x of [-0.9, 0.9]) {
    const leg = cyl(0.06, 0.08, 1.9, 5, PAL.woodDark)
    leg.position.set(x, 0.95, 0)
    g.add(leg)
  }
  const bar = cyl(0.05, 0.05, 2.0, 5, PAL.woodDark)
  bar.rotation.z = Math.PI / 2
  bar.position.y = 1.85
  g.add(bar)
  for (let i = 0; i < 3; i++) {
    const net = rbox(0.55, 1.25 + rng() * 0.4, 0.06, colour, 0.03)
    net.position.set((i - 1) * 0.6 + (rng() - 0.5) * 0.12, 1.15, (rng() - 0.5) * 0.1)
    net.rotation.z = (rng() - 0.5) * 0.12
    g.add(net)
  }
  const float1 = sph(0.13, PAL.doorRed, 0)
  float1.position.set(-0.75, 0.16, 0.35)
  g.add(float1)
  const float2 = sph(0.11, 0xe8c56a, 0)
  float2.position.set(0.8, 0.14, -0.3)
  g.add(float2)
  return g
}

// Quay bollard with a coil of rope.
export function bollard(rng) {
  const g = new THREE.Group()
  const post = cyl(0.16, 0.2, 0.55, 8, PAL.stoneDark)
  post.position.y = 0.28
  g.add(post)
  const cap = sph(0.17, PAL.stoneDark, 0)
  cap.position.y = 0.56
  cap.scale.y = 0.6
  g.add(cap)
  if (rng() > 0.4) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 5, 10), mat(0xbba883))
    coil.rotation.x = Math.PI / 2
    coil.position.set((rng() - 0.5) * 0.5, 0.06, 0.42)
    coil.castShadow = true
    g.add(coil)
  }
  return g
}

// Iron balcony that clamps onto a facade (front face is local -z).
export function balcony(w = 1.5) {
  const g = new THREE.Group()
  const floor = rbox(w, 0.08, 0.6, PAL.stone, 0.02)
  floor.position.set(0, 0, -0.3)
  g.add(floor)
  const rail = rbox(w, 0.05, 0.05, PAL.iron, 0.02)
  rail.position.set(0, 0.52, -0.58)
  g.add(rail)
  for (const s of [-1, 1]) {
    const side = rbox(0.05, 0.05, 0.6, PAL.iron, 0.02)
    side.position.set(s * w / 2, 0.52, -0.3)
    g.add(side)
  }
  const n = Math.max(3, Math.round(w / 0.22))
  for (let i = 0; i < n; i++) {
    const bar = cyl(0.018, 0.018, 0.54, 4, PAL.iron, { rough: 0.5, metal: 0.5 })
    bar.position.set(-w / 2 + (i / (n - 1)) * w, 0.26, -0.58)
    bar.castShadow = false
    g.add(bar)
  }
  for (const s of [-1, 1]) {
    const brace = cyl(0.045, 0.045, 0.62, 4, PAL.iron)
    brace.position.set(s * w * 0.36, -0.2, -0.28)
    brace.rotation.x = 0.9
    g.add(brace)
  }
  return g
}

// A washing line strung between two points, with shirts and sheets on it.
export function laundryLine(from, to, height, rng, sag = 0.55) {
  const g = new THREE.Group()
  const dir = new THREE.Vector3().subVectors(to, from)
  const len = dir.length()
  const steps = Math.max(6, Math.floor(len / 0.5))
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push(new THREE.Vector3(
      from.x + dir.x * t,
      height - Math.sin(t * Math.PI) * sag,
      from.z + dir.z * t,
    ))
  }
  g.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x8a7a63 }),
  ))
  const cloths = [0xd9694a, 0xf7efe0, 0x5b7fb8, 0xe8c56a, 0xf0dcc8, 0x8fae5f, 0xe8e0d0]
  const n = Math.max(3, Math.floor(len / 1.5))
  for (let i = 0; i < n; i++) {
    const t = (i + 0.7) / (n + 0.4)
    const p = new THREE.Vector3(
      from.x + dir.x * t,
      height - Math.sin(t * Math.PI) * sag,
      from.z + dir.z * t,
    )
    const wide = rng() > 0.6
    const cloth = rbox(wide ? 0.85 : 0.5, wide ? 1.05 : 0.72, 0.05,
      cloths[Math.floor(rng() * cloths.length)], 0.02)
    cloth.position.set(p.x, p.y - (wide ? 0.56 : 0.4), p.z)
    cloth.rotation.z = (rng() - 0.5) * 0.18
    cloth.rotation.y = (rng() - 0.5) * 0.25
    g.add(cloth)
  }
  return g
}

// Village well — stone drum, iron arch and a bucket.
export function wellHead(rng) {
  const g = new THREE.Group()
  const drum = cyl(0.62, 0.68, 0.85, 10, PAL.stone)
  drum.position.y = 0.42
  g.add(drum)
  const lip = cyl(0.7, 0.7, 0.12, 10, PAL.stoneDark)
  lip.position.y = 0.9
  g.add(lip)
  const dark = cyl(0.55, 0.55, 0.04, 10, 0x2a3038)
  dark.position.y = 0.93
  dark.castShadow = false
  g.add(dark)
  for (const s of [-1, 1]) {
    const post = cyl(0.055, 0.06, 1.5, 5, PAL.iron, { rough: 0.5, metal: 0.5 })
    post.position.set(s * 0.55, 1.6, 0)
    g.add(post)
  }
  const beam = cyl(0.05, 0.05, 1.2, 5, PAL.iron, { rough: 0.5, metal: 0.5 })
  beam.rotation.z = Math.PI / 2
  beam.position.y = 2.3
  g.add(beam)
  const bucket = cyl(0.16, 0.13, 0.24, 7, PAL.woodDark)
  bucket.position.set(0, 1.75, 0)
  g.add(bucket)
  if (rng() > 0.5) {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.5, 4), mat(PAL.terracotta, { flat: true }))
    roof.rotation.y = Math.PI / 4
    roof.position.y = 2.6
    roof.castShadow = true
    g.add(roof)
  }
  return g
}

// Harbour-end beacon: stubby stone tower with a lantern that bloom picks up.
export function beacon() {
  const g = new THREE.Group()
  const base = cyl(0.85, 1.0, 0.6, 10, PAL.stoneDark)
  base.position.y = 0.3
  g.add(base)
  const shaft = cyl(0.5, 0.72, 3.4, 10, PAL.plaster)
  shaft.position.y = 2.3
  g.add(shaft)
  for (let i = 0; i < 2; i++) {
    const band = cyl(0.62 - i * 0.06, 0.66 - i * 0.06, 0.35, 10, PAL.doorRed)
    band.position.y = 1.4 + i * 1.3
    g.add(band)
  }
  const gallery = cyl(0.66, 0.66, 0.14, 10, PAL.iron, { rough: 0.5, metal: 0.5 })
  gallery.position.y = 4.05
  g.add(gallery)
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.5, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffe6b0, emissive: 0xffc766, emissiveIntensity: 2.4, roughness: 0.35,
    }),
  )
  lantern.position.y = 4.36
  g.add(lantern)
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.5, 8), mat(PAL.iron, { flat: true }))
  cap.position.y = 4.85
  cap.castShadow = true
  g.add(cap)
  return g
}

// Open-sided bus shelter with a timetable board.
export function busShelter(rng) {
  const g = new THREE.Group()
  for (const [x, z] of [[-1.0, -0.5], [1.0, -0.5], [-1.0, 0.5], [1.0, 0.5]]) {
    const post = cyl(0.06, 0.07, 2.3, 5, PAL.iron, { rough: 0.5, metal: 0.5 })
    post.position.set(x, 1.15, z)
    g.add(post)
  }
  const roof = rbox(2.4, 0.12, 1.4, PAL.doorTeal, 0.05)
  roof.position.y = 2.34
  roof.rotation.x = -0.06
  g.add(roof)
  const back = rbox(2.2, 1.5, 0.08, PAL.plasterWarm, 0.04)
  back.position.set(0, 1.2, 0.52)
  g.add(back)
  const seat = rbox(2.0, 0.09, 0.4, PAL.wood, 0.03)
  seat.position.set(0, 0.5, 0.3)
  g.add(seat)
  const board = rbox(0.6, 0.8, 0.05, 0xf2ede0, 0.02)
  board.position.set(0.7, 1.4, 0.46)
  g.add(board)
  const pole = cyl(0.05, 0.05, 2.8, 5, PAL.iron, { rough: 0.5, metal: 0.5 })
  pole.position.set(1.5, 1.4, -0.2)
  g.add(pole)
  const disc = cyl(0.3, 0.3, 0.06, 10, PAL.doorRed)
  disc.rotation.x = Math.PI / 2
  disc.position.set(1.5, 2.7, -0.2)
  g.add(disc)
  if (rng() > 0.5) {
    const bin = cyl(0.18, 0.15, 0.5, 7, PAL.iron)
    bin.position.set(-1.4, 0.25, -0.3)
    g.add(bin)
  }
  return g
}

// Flower cart — the mercado's landmark.
export function flowerCart(rng) {
  const g = new THREE.Group()
  const bed = rbox(2.0, 0.35, 1.0, PAL.doorTeal, 0.05)
  bed.position.y = 0.85
  g.add(bed)
  const rail = rbox(2.05, 0.08, 1.05, PAL.wood, 0.03)
  rail.position.y = 1.06
  g.add(rail)
  for (const x of [-0.7, 0.7]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 12), mat(PAL.woodDark))
    wheel.position.set(x, 0.44, 0.56)
    wheel.castShadow = true
    g.add(wheel)
    for (let i = 0; i < 4; i++) {
      const spoke = cyl(0.03, 0.03, 0.8, 4, PAL.wood)
      spoke.position.set(x, 0.44, 0.56)
      spoke.rotation.x = Math.PI / 2
      spoke.rotation.z = (i / 4) * Math.PI
      spoke.castShadow = false
      g.add(spoke)
    }
  }
  const handle = cyl(0.05, 0.05, 1.1, 5, PAL.woodDark)
  handle.rotation.x = 1.2
  handle.position.set(0, 0.7, -0.9)
  g.add(handle)
  const blooms = [PAL.geranium, PAL.geraniumPink, PAL.bougainvillea, 0xe8c56a, 0xf2ede0, 0x9a6fd9]
  for (let i = 0; i < 16; i++) {
    const b = sph(0.09 + rng() * 0.07, blooms[Math.floor(rng() * blooms.length)], 0)
    b.position.set((rng() - 0.5) * 1.8, 1.14 + rng() * 0.3, (rng() - 0.5) * 0.85)
    b.castShadow = false
    g.add(b)
  }
  for (let i = 0; i < 3; i++) {
    const bucket = cyl(0.19, 0.15, 0.36, 7, 0x8fa8b8)
    bucket.position.set((i - 1) * 0.75, 0.18, -0.75)
    g.add(bucket)
    const spray = sph(0.24, [PAL.geranium, 0xe8c56a, PAL.bougainvillea][i], 0, { flat: true })
    spray.position.set((i - 1) * 0.75, 0.5, -0.75)
    g.add(spray)
  }
  return g
}

// Fishmonger's slab: ice bed, catch of the day, a scale.
export function fishTable(rng) {
  const g = new THREE.Group()
  const top = rbox(2.0, 0.1, 1.1, 0xe6e9ea, 0.03)
  top.position.y = 0.95
  g.add(top)
  const skirt = rbox(1.9, 0.85, 1.0, PAL.doorTeal, 0.05)
  skirt.position.y = 0.48
  g.add(skirt)
  const ice = rbox(1.8, 0.12, 0.9, 0xdceefb, 0.03)
  ice.position.y = 1.06
  g.add(ice)
  for (let i = 0; i < 7; i++) {
    const fish = sph(0.13 + rng() * 0.06, [0x9fb4c4, 0xb8c6d0, 0xcf8f6f][Math.floor(rng() * 3)], 0, { flat: true })
    fish.scale.set(1.7, 0.55, 0.75)
    fish.position.set((rng() - 0.5) * 1.6, 1.16, (rng() - 0.5) * 0.7)
    fish.rotation.y = rng() * Math.PI
    g.add(fish)
  }
  const post = cyl(0.04, 0.04, 1.0, 5, PAL.iron, { rough: 0.5, metal: 0.5 })
  post.position.set(0.85, 1.5, 0)
  g.add(post)
  const pan = cyl(0.22, 0.18, 0.09, 8, PAL.iron, { rough: 0.4, metal: 0.6 })
  pan.position.set(0.85, 1.95, 0)
  g.add(pan)
  return g
}

// Small hand crane on the quay.
export function crane(rng) {
  const g = new THREE.Group()
  const base = cyl(0.45, 0.55, 0.3, 8, PAL.stoneDark)
  base.position.y = 0.15
  g.add(base)
  const mast = cyl(0.16, 0.2, 3.2, 6, PAL.iron, { rough: 0.5, metal: 0.5 })
  mast.position.y = 1.75
  g.add(mast)
  const jib = rbox(2.6, 0.16, 0.2, PAL.iron, 0.04)
  jib.position.set(0.9, 3.25, 0)
  jib.rotation.z = -0.16
  g.add(jib)
  const stay = cyl(0.05, 0.05, 2.1, 4, PAL.iron)
  stay.position.set(0.55, 2.85, 0)
  stay.rotation.z = 0.95
  g.add(stay)
  const rope = cyl(0.02, 0.02, 1.5, 4, 0xbba883)
  rope.position.set(2.05, 2.7, 0)
  rope.castShadow = false
  g.add(rope)
  const hook = cyl(0.12, 0.1, 0.22, 6, PAL.iron, { rough: 0.4, metal: 0.6 })
  hook.position.set(2.05, 1.9, 0)
  g.add(hook)
  if (rng() > 0.5) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 5, 10), mat(PAL.iron, { metal: 0.5, rough: 0.5 }))
    wheel.position.set(-0.02, 1.0, 0.28)
    g.add(wheel)
  }
  return g
}

// Roadside signpost: a post carrying a painted signboard.
// Free-standing, so it gets a board on BOTH faces — a one-sided sign is a blank
// plank half the time you walk past it.
export function signpost(text, colour = PAL.woodDark, h = 2.2) {
  const g = new THREE.Group()
  const post = cyl(0.08, 0.1, h, 6, PAL.woodDark)
  post.position.y = h / 2
  g.add(post)
  const foot = cyl(0.28, 0.34, 0.24, 8, PAL.stoneDark)
  foot.position.y = 0.12
  g.add(foot)
  const front = signboard(text, colour)
  front.position.set(0, h - 0.15, -0.04)
  g.add(front)
  const back = signboard(text, colour)
  back.position.set(0, h - 0.15, 0.04)
  back.rotation.y = Math.PI
  g.add(back)
  return g
}

// Stone arch spanning a lane — barrio flavour, purely decorative.
export function archway(w, h = 3.4) {
  const g = new THREE.Group()
  const span = rbox(w, 0.55, 0.9, PAL.plasterWarm, 0.06)
  span.position.y = h
  g.add(span)
  const key = rbox(0.45, 0.75, 0.95, PAL.stone, 0.04)
  key.position.y = h - 0.05
  g.add(key)
  for (const s of [-1, 1]) {
    const haunch = rbox(0.5, 0.5, 0.92, PAL.stone, 0.05)
    haunch.position.set(s * (w / 2 - 0.3), h - 0.42, 0)
    g.add(haunch)
  }
  return g
}

// Market arcade: a colonnade with an entablature and hanging lanterns, OPEN to
// the sky. A solid roof over the aisle would hide the player from the follow
// camera (movement.js only knows about roofs on NON-walkable tiles), so the
// only cover here is the narrow eave that oversails the stalls at the edge.
export function marketHall(w, d, rng) {
  const g = new THREE.Group()
  const colsX = Math.max(2, Math.round(w / 4))
  const colsZ = Math.max(2, Math.round(d / 4))
  const H = 4.6
  for (let i = 0; i <= colsX; i++) {
    for (let j = 0; j <= colsZ; j++) {
      if (i > 0 && i < colsX && j > 0 && j < colsZ) continue   // perimeter only
      const x = -w / 2 + (i / colsX) * w
      const z = -d / 2 + (j / colsZ) * d
      const base = cyl(0.3, 0.34, 0.3, 8, PAL.stoneDark)
      base.position.set(x, 0.15, z)
      g.add(base)
      const col = cyl(0.19, 0.25, H, 8, PAL.plaster)
      col.position.set(x, H / 2 + 0.2, z)
      g.add(col)
      const cap = rbox(0.5, 0.18, 0.5, PAL.stone, 0.03)
      cap.position.set(x, H + 0.3, z)
      g.add(cap)
    }
  }
  // entablature around the top, plus a shallow eave that only oversails outward
  for (const s of [-1, 1]) {
    const beam = rbox(w + 0.7, 0.26, 0.34, PAL.woodDark, 0.04)
    beam.position.set(0, H + 0.52, s * d / 2)
    g.add(beam)
    const eave = rbox(w + 1.4, 0.14, 1.0, PAL.terracotta, 0.05)
    eave.position.set(0, H + 0.76, s * (d / 2 + 0.42))
    eave.rotation.x = s * 0.22
    g.add(eave)
    const sideBeam = rbox(0.34, 0.26, d, PAL.woodDark, 0.04)
    sideBeam.position.set(s * w / 2, H + 0.52, 0)
    g.add(sideBeam)
  }
  for (let i = 0; i < 6; i++) {
    const x = -w / 2 + ((i % 3 + 0.5) / 3) * w
    const z = (i < 3 ? -1 : 1) * d / 2
    const cordL = 0.5
    const cord = cyl(0.015, 0.015, cordL, 4, PAL.iron)
    cord.position.set(x, H + 0.35 - cordL / 2, z)
    cord.castShadow = false
    g.add(cord)
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 7, 7),
      new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc766, emissiveIntensity: 1.8, roughness: 0.4 }),
    )
    lantern.position.set(x, H + 0.35 - cordL - 0.1 + rng() * 0.05, z)
    g.add(lantern)
  }
  return g
}

// Crop rows for the farm field: one tile's worth of furrows.
export function cropRow(rng, w = 2, d = 2) {
  const g = new THREE.Group()
  const rows = 3
  for (let i = 0; i < rows; i++) {
    const ridge = rbox(w * 0.92, 0.16, d / rows * 0.55, 0x9a7f52, 0.03)
    ridge.position.set(0, 0.08, -d / 2 + ((i + 0.5) / rows) * d)
    ridge.castShadow = false
    g.add(ridge)
    const n = 3 + Math.floor(rng() * 2)
    for (let k = 0; k < n; k++) {
      const plant = sph(0.15 + rng() * 0.09, rng() > 0.5 ? 0x6f9a4a : 0x87a95a, 0, { flat: true })
      plant.position.set(
        -w / 2 + ((k + 0.5) / n) * w + (rng() - 0.5) * 0.2,
        0.26,
        -d / 2 + ((i + 0.5) / rows) * d,
      )
      plant.scale.y = 0.8
      plant.castShadow = false
      g.add(plant)
    }
  }
  return g
}
