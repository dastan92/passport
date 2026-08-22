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
