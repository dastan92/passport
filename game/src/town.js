import * as THREE from 'three'
import { mergeGeometries } from '../vendor/jsm/utils/BufferGeometryUtils.js'
import {
  COLS, ROWS, TILE, DISTRICTS, CAST, PLAYER_SPAWN, LANDMARKS,
  SEA_Z, BEACH_Z, districtOf,
} from './worldspec.js'
import {
  PAL, mat, rbox, cyl, sph, seeded,
  flowerPot, oliveTree, palmTree, grassTuft, crate, barrel, bench, lamp,
  marketStall, awning, bunting, boat, rock,
  signboard, hangingPlant, doorstep, chimney, drainpipe, cafeUmbrella, fountainJet,
  oliveTreeSimple, cypress, agave, scrubBush, fence, haystack, netRack, bollard,
  balcony, laundryLine, wellHead, beacon, busShelter, flowerCart, fishTable,
  crane, signpost, archway, marketHall, cropRow,
} from './kit.js'

// ---------------------------------------------------------------------------
// Pueblo — 84 x 60 tiles laid out as the six districts in worldspec.DISTRICTS.
// Renders in 3D, thinks in tiles. worldspec.js is law: every district bound,
// resident tile and landmark tile is imported, never restated.
//
// chars
//   .  street / dirt        p  plaza paving      s  step / kerb
//   c  cafe terrace         m  market floor      q  harbour quay
//   g  grass                o  grove floor       b  beach sand
//   w  water                #  building          W  wall
//   F  fountain             M  stall / cart      K  fixture (shelter, well…)
//   T  tree                 P  palm              r  rock       n  crop field
// ---------------------------------------------------------------------------
export { COLS, ROWS, TILE }

// ===========================================================================
// 1. THE GRID
// ===========================================================================
function buildGrid() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('.'))
  const rect = (x0, z0, x1, z1, ch) => {
    for (let z = Math.max(0, z0); z <= Math.min(ROWS - 1, z1); z++)
      for (let x = Math.max(0, x0); x <= Math.min(COLS - 1, x1); x++) grid[z][x] = ch
  }
  const put = (x, z, ch) => { if (x >= 0 && z >= 0 && x < COLS && z < ROWS) grid[z][x] = ch }

  // --- edges: a greenbelt ring so the map never ends in a hard line --------
  rect(0, 0, COLS - 1, 1, 'g')
  rect(0, 0, 3, 54, 'g')
  rect(80, 0, 83, 54, 'g')

  // --- the sea and the shore ----------------------------------------------
  rect(0, SEA_Z, COLS - 1, ROWS - 1, 'w')
  rect(0, BEACH_Z, COLS - 1, SEA_Z - 1, 'b')

  // --- LA IGLESIA  [4,4]..[23,20] -----------------------------------------
  rect(8, 6, 18, 13, 'p')                          // the walled church square
  rect(9, 5, 17, 5, 'W')                           // north wall
  rect(7, 6, 7, 13, 'W'); rect(7, 9, 7, 10, '.')   // west wall + gate
  rect(19, 6, 19, 11, 'W')                         // east wall (open at z 12..13)
  rect(8, 14, 18, 14, 's')                         // apron in front of the door
  rect(9, 15, 17, 19, '#')                         // the church itself
  rect(20, 13, 23, 15, '#')                        // the school
  rect(4, 6, 6, 8, '#')
  rect(4, 11, 6, 13, '#')
  rect(4, 2, 10, 4, '#')
  rect(12, 2, 17, 4, '#')
  rect(20, 2, 23, 4, '#')
  rect(4, 16, 7, 19, '#')
  rect(19, 16, 21, 19, 'g')                        // the school yard
  rect(22, 17, 23, 19, '#')
  for (const [tx, tz] of [[9, 7], [17, 7], [9, 12], [17, 12], [20, 18]]) put(tx, tz, 'T')

  // --- EL BARRIO  [26,2]..[57,19] -----------------------------------------
  rect(26, 2, 57, 19, '#')
  for (const lx of [31, 36, 41, 46, 51]) rect(lx, 2, lx, 19, '.')   // tight lanes
  rect(26, 6, 57, 6, '.')
  rect(26, 11, 57, 12, '.')                        // the barrio's own street
  rect(26, 17, 57, 17, '.')
  rect(42, 7, 45, 10, 'p')                         // la placita
  put(43, 8, 'T')

  // --- the hillside above town (x 60..83, z 2..19) ------------------------
  rect(60, 2, 83, 19, 'g')
  rect(62, 4, 79, 18, 'o')
  for (const tx of [63, 66, 69, 72, 75, 78])
    for (const tz of [5, 8, 11, 14, 17]) put(tx, tz, 'T')
  rect(62, 7, 70, 7, 'W'); rect(73, 7, 79, 7, 'W')
  rect(62, 13, 70, 13, 'W'); rect(73, 13, 79, 13, 'W')
  rect(64, 15, 67, 16, '#')
  for (const [rx, rz] of [[61, 4], [80, 9], [61, 16], [71, 2]]) put(rx, rz, 'r')

  // --- LA PLAZA  [30,22]..[53,39] -----------------------------------------
  rect(33, 25, 50, 37, 'p')
  rect(32, 22, 36, 24, '#')
  rect(39, 22, 43, 24, '#')
  rect(46, 22, 50, 24, '#')
  rect(51, 26, 53, 31, '#')
  rect(51, 35, 53, 38, '#')
  rect(33, 38, 37, 39, '#')
  rect(42, 38, 47, 39, '#')
  rect(30, 25, 32, 28, '#')
  rect(30, 30, 32, 35, '#')                        // the cafe
  rect(33, 30, 35, 36, 'c')                        // its terrace
  rect(40, 28, 41, 29, 'F')                        // LANDMARKS.fountain
  for (const [tx, tz] of [[36, 27], [47, 27], [47, 35], [37, 35], [34, 28], [49, 31]]) put(tx, tz, 'T')

  // --- EL MERCADO  [56,20]..[79,40] ---------------------------------------
  rect(58, 24, 72, 38, 'm')
  rect(59, 26, 64, 26, 'M')                        // includes LANDMARKS.fruitStall
  rect(67, 26, 71, 26, 'M')
  rect(59, 32, 64, 32, 'M')
  rect(68, 32, 71, 32, 'M')
  put(66, 33, 'M')                                 // LANDMARKS.flowerCart
  // arcade columns — these tiles must line up with the colonnade marketHall()
  // generates for a 8x6 tile hall centred on [62,28], or you get columns you
  // can walk through and solid tiles with nothing on them.
  for (const cz of [25, 27, 29, 31]) { put(58, cz, 'K'); put(66, cz, 'K') }
  for (const cx of [60, 62, 64]) { put(cx, 25, 'K'); put(cx, 31, 'K') }
  rect(56, 24, 57, 30, '#')
  rect(56, 34, 57, 38, '#')
  rect(58, 22, 63, 23, '#')
  rect(66, 22, 71, 23, '#')
  rect(74, 22, 79, 23, '#')
  rect(74, 25, 79, 31, '#')
  rect(74, 34, 79, 38, '#')
  rect(58, 39, 63, 39, '#')
  rect(67, 39, 72, 39, '#')

  // --- LAS AFUERAS  [4,24]..[25,40] ---------------------------------------
  rect(4, 26, 15, 38, 'o')                         // the olive grove
  for (const tx of [4, 7, 10, 13]) for (const tz of [27, 30, 33, 36]) put(tx, tz, 'T')
  rect(17, 26, 23, 29, 'n')                        // the fenced field
  rect(19, 33, 23, 36, '#')                        // farmhouse
  rect(15, 34, 16, 36, '#')                        // barn
  rect(16, 30, 23, 32, 'g')                        // meadow
  put(21, 31, 'K')                                 // the well
  rect(4, 22, 23, 23, '.')
  for (const [tx, tz] of [[6, 22], [12, 22], [18, 22]]) put(tx, tz, 'T')

  // --- EL PUERTO  [24,42]..[62,56] ----------------------------------------
  rect(4, 42, 23, 54, 'g')                         // west coastal scrub
  rect(63, 41, 83, 50, 'g')                        // east headland
  rect(24, 42, 28, 44, '#')
  rect(33, 42, 38, 44, '#')
  rect(47, 42, 52, 44, '#')
  rect(57, 42, 62, 44, '#')
  rect(24, 45, 62, 49, 'q')                        // the quay
  rect(24, 49, 40, 49, 's')                        // slipway down to the sand
  rect(41, 50, 62, 50, 'W')                        // the harbour wall
  rect(24, 50, 40, 56, 'b')                        // the beach
  rect(41, 51, 83, 56, 'w')                        // harbour water
  put(44, 46, 'M')                                 // LANDMARKS.fishStall
  put(29, 45, 'K')                                 // LANDMARKS.busStop
  for (const [rx, rz] of [[8, 50], [16, 52], [70, 45], [78, 48], [66, 43]]) put(rx, rz, 'r')
  for (const px of [6, 12, 19, 26, 33, 39]) put(px, 53, 'P')
  for (const [px, pz] of [[68, 47], [75, 44], [80, 49]]) put(px, pz, 'P')

  // --- the streets that tie the six districts together --------------------
  rect(4, 21, 79, 21, '.')                         // calle mayor, north
  rect(4, 20, 51, 20, '.')
  rect(56, 20, 79, 20, '.')
  rect(4, 40, 79, 41, '.')                         // the esplanade, south
  rect(0, 40, 3, 41, '.')                          // the road out of town
  rect(24, 2, 25, 21, '.')                         // iglesia | barrio
  rect(26, 22, 29, 41, '.')                        // afueras | plaza
  rect(54, 22, 55, 41, '.')                        // plaza | mercado
  rect(58, 2, 59, 21, '.')                         // barrio | hillside
  rect(73, 24, 73, 39, '.')                        // mercado back lane
  rect(29, 42, 32, 44, '.')                        // ramps down to the quay
  rect(39, 42, 46, 44, '.')
  rect(53, 42, 56, 44, '.')
  rect(12, 42, 13, 54, '.')                        // path to the west beach
  rect(66, 41, 67, 48, '.'); rect(68, 48, 69, 48, '.')
  put(70, 48, 'K')                                 // the little lighthouse
  rect(5, 48, 9, 48, 'W'); rect(15, 45, 19, 45, 'W')   // ruined dry-stone walls

  // --- landmarks that deliberately sit on a street ------------------------
  rect(52, 18, 55, 20, '#')                        // the pharmacy juts out
  put(2, 39, 'K')                                  // milestone on the road out

  // --- street trees: no avenue may read as a flat plane -------------------
  for (const tx of [8, 14, 20, 27, 33, 44, 48, 57, 63, 69, 75]) put(tx, 20, 'T')
  for (const tx of [7, 13, 19, 25, 31, 37, 43, 49, 61, 67, 73]) put(tx, 41, 'T')
  for (const tz of [24, 28, 32, 36]) put(27, tz, 'T')
  for (const tz of [25, 30, 35]) put(55, tz, 'T')
  for (const [tx, tz] of [[34, 48], [50, 48], [60, 46]]) put(tx, tz, 'K')

  // --- kerbs: a street tile that touches a raised floor becomes a step ----
  const raised = new Set(['p', 'c', 'm', 'q'])
  const snap = grid.map(r => r.slice())
  for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) {
    if (snap[z][x] !== '.') continue
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz
      if (nx < 0 || nz < 0 || nx >= COLS || nz >= ROWS) continue
      if (raised.has(snap[nz][nx])) { grid[z][x] = 's'; break }
    }
  }
  return grid
}

const grid = buildGrid()
export const MAP = grid.map(r => r.join(''))

const WALKABLE = new Set(['.', 'p', 's', 'c', 'm', 'q', 'g', 'o', 'b'])

export function isWalkable(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= COLS || cz >= ROWS) return false
  return WALKABLE.has(grid[cz][cx])
}

export function tileToWorld(cx, cz) {
  return new THREE.Vector3((cx - COLS / 2 + 0.5) * TILE, 0, (cz - ROWS / 2 + 0.5) * TILE)
}

export const PLAZA_H = 0.22
const HEIGHTS = {
  p: PLAZA_H, c: PLAZA_H, m: PLAZA_H, q: PLAZA_H, F: PLAZA_H, M: PLAZA_H,
  s: PLAZA_H / 2, b: -0.12, w: -0.4,
}
export function groundHeight(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= COLS || cz >= ROWS) return 0
  const h = HEIGHTS[grid[cz][cx]]
  return h === undefined ? 0 : h
}

// ===========================================================================
// 2. REACHABILITY GUARANTEE
// A resident nobody can walk to is a broken game, so the map proves itself at
// module load: flood fill from PLAYER_SPAWN, and if any CAST tile is stranded,
// carve an L-shaped lane to the nearest reached tile before anything renders.
// ===========================================================================
function floodFrom(sx, sz) {
  const seen = new Uint8Array(COLS * ROWS)
  if (!isWalkable(sx, sz)) return seen
  const q = new Int32Array(COLS * ROWS)
  let head = 0, tail = 0
  q[tail++] = sz * COLS + sx
  seen[sz * COLS + sx] = 1
  while (head < tail) {
    const cur = q[head++]
    const cx = cur % COLS, cz = (cur - cx) / COLS
    for (let k = 0; k < 4; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0)
      const nz = cz + (k === 2 ? 1 : k === 3 ? -1 : 0)
      if (nx < 0 || nz < 0 || nx >= COLS || nz >= ROWS) continue
      const ni = nz * COLS + nx
      if (seen[ni] || !isWalkable(nx, nz)) continue
      seen[ni] = 1
      q[tail++] = ni
    }
  }
  return seen
}

export function verifyReachability() {
  const report = { ok: true, spawn: PLAYER_SPAWN.slice(), reached: 0, cast: [], repaired: [] }
  for (let attempt = 0; attempt < 3; attempt++) {
    const seen = floodFrom(PLAYER_SPAWN[0], PLAYER_SPAWN[1])
    report.reached = seen.reduce((a, b) => a + b, 0)
    report.cast = CAST.map(c => ({
      id: c.id, tile: c.tile, ch: grid[c.tile[1]][c.tile[0]],
      walkable: isWalkable(c.tile[0], c.tile[1]),
      reachable: !!seen[c.tile[1] * COLS + c.tile[0]],
    }))
    const broken = report.cast.filter(c => !c.walkable || !c.reachable)
    if (!broken.length) { report.ok = true; return report }
    // last-resort repair: open the tile, then walk an L back toward spawn
    for (const b of broken) {
      const [tx, tz] = b.tile
      grid[tz][tx] = '.'
      const sx = PLAYER_SPAWN[0], sz = PLAYER_SPAWN[1]
      for (let x = Math.min(tx, sx); x <= Math.max(tx, sx); x++)
        if (!isWalkable(x, tz)) grid[tz][x] = '.'
      for (let z = Math.min(tz, sz); z <= Math.max(tz, sz); z++)
        if (!isWalkable(sx, z)) grid[z][sx] = '.'
      report.repaired.push(b.id)
    }
    report.ok = false
  }
  return report
}

export const REACHABILITY = verifyReachability()
if (!REACHABILITY.ok) {
  console.warn('[town] carved emergency lanes for:', REACHABILITY.repaired.join(', '))
}

// ===========================================================================
// 3. INSTANCING — the micro-props (cobbles, tufts, pebbles, slabs, walls)
// outnumber everything else 5:1, so they never get their own mesh.
// ===========================================================================
const _mtx = new THREE.Matrix4()
const _quat = new THREE.Quaternion()
const _eul = new THREE.Euler()
const _pos = new THREE.Vector3()
const _scl = new THREE.Vector3()
const _col = new THREE.Color()

function batch(geo, material, opts = {}) {
  const items = []
  return {
    add(x, y, z, colour, ry = 0, sx = 1, sy = 1, sz = 1) {
      items.push(x, y, z, ry, sx, sy, sz, colour)
    },
    build(parent) {
      const n = items.length / 8
      if (!n) return null
      const im = new THREE.InstancedMesh(geo, material, n)
      im.castShadow = !!opts.cast
      im.receiveShadow = opts.receive !== false
      for (let i = 0; i < n; i++) {
        const o = i * 8
        _eul.set(0, items[o + 3], 0)
        _quat.setFromEuler(_eul)
        _pos.set(items[o], items[o + 1], items[o + 2])
        _scl.set(items[o + 4], items[o + 5], items[o + 6])
        im.setMatrixAt(i, _mtx.compose(_pos, _quat, _scl))
        im.setColorAt(i, _col.setHex(items[o + 7]))
      }
      im.instanceMatrix.needsUpdate = true
      if (im.instanceColor) im.instanceColor.needsUpdate = true
      im.frustumCulled = false
      parent.add(im)
      return im
    },
    get count() { return items.length / 8 },
  }
}

// ---------------------------------------------------------------------------
// bake(): collapse one prop's sub-meshes into one mesh per material.
//
// A house is ~50 little rounded boxes; 57 houses was ~2900 draw calls, and the
// shadow pass paid for every one of them. Merging per PROP (never across the
// map) keeps each merged mesh spatially compact so frustum culling still works.
// Lines and multi-material meshes (the painted signboards) are left alone.
// ---------------------------------------------------------------------------
const _bakeM = new THREE.Matrix4()
const _bakeInv = new THREE.Matrix4()
const KEEP_ATTRS = ['position', 'normal', 'uv']

function bake(root) {
  root.updateMatrixWorld(true)
  _bakeInv.copy(root.matrixWorld).invert()
  const buckets = new Map()
  const doomed = []
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !o.geometry) return
    const key = o.material.uuid + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0)
    let b = buckets.get(key)
    if (!b) { b = { m: o.material, c: o.castShadow, r: o.receiveShadow, g: [] }; buckets.set(key, b) }
    // primitives disagree about indexing (RoundedBox is indexed, Icosahedron is
    // not), and mergeGeometries refuses a mixed batch — flatten everything.
    const gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
    for (const n of Object.keys(gg.attributes)) if (!KEEP_ATTRS.includes(n)) gg.deleteAttribute(n)
    gg.applyMatrix4(_bakeM.multiplyMatrices(_bakeInv, o.matrixWorld))
    b.g.push(gg)
    doomed.push(o)
  })
  if (doomed.length < 2) { for (const b of buckets.values()) for (const g of b.g) g.dispose(); return root }
  for (const o of doomed) if (o.parent) o.parent.remove(o)
  for (const b of buckets.values()) {
    let merged
    if (b.g.length === 1) merged = b.g[0]
    else {
      merged = mergeGeometries(b.g, false)
      for (const g of b.g) g.dispose()
    }
    if (!merged) continue
    const mesh = new THREE.Mesh(merged, b.m)
    mesh.castShadow = b.c
    mesh.receiveShadow = b.r
    root.add(mesh)
  }
  return root
}

// ===========================================================================
// 4. PIECES
// ===========================================================================
function hipRoof(w, d, h, color) {
  const g = new THREE.Group()
  const r = Math.sqrt(w * w + d * d) / 2
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), mat(color, { flat: true }))
  cone.rotation.y = Math.PI / 4
  cone.scale.set(w / (r * Math.SQRT2) * 1.06, 1, d / (r * Math.SQRT2) * 1.06)
  cone.castShadow = true
  cone.receiveShadow = true
  g.add(cone)
  const eave = rbox(w * 1.12, 0.1, d * 1.12, color, 0.04)
  eave.position.y = -h / 2 + 0.02
  g.add(eave)
  return g
}

function windowUnit(colour, shuttered, rng) {
  const g = new THREE.Group()
  const recess = rbox(0.72, 1.0, 0.12, 0x2e2b33, 0.02)
  g.add(recess)
  const sill = rbox(0.92, 0.09, 0.2, PAL.stone, 0.03)
  sill.position.y = -0.54
  g.add(sill)
  const lintel = rbox(0.9, 0.12, 0.16, PAL.stoneDark, 0.03)
  lintel.position.y = 0.56
  g.add(lintel)
  if (shuttered) {
    for (const s of [-1, 1]) {
      const sh = rbox(0.34, 1.0, 0.06, colour, 0.02)
      sh.position.set(s * 0.53, 0, 0.06)
      sh.rotation.y = s * -0.5
      g.add(sh)
    }
  }
  if (rng() > 0.78) {
    const rail = rbox(0.95, 0.06, 0.28, PAL.iron, 0.02)
    rail.position.set(0, -0.36, 0.16)
    g.add(rail)
    for (let i = 0; i < 4; i++) {
      const bar = cyl(0.017, 0.017, 0.32, 4, PAL.iron, { rough: 0.5, metal: 0.5 })
      bar.position.set((i - 1.5) * 0.24, -0.5, 0.16)
      bar.castShadow = false
      g.add(bar)
    }
  }
  return g
}

// cheap sill planter — the full flowerPot() is ~10 meshes and facades want dozens
function sillPot(rng) {
  const g = new THREE.Group()
  const pot = cyl(0.13, 0.1, 0.18, 6, PAL.terracottaDeep)
  g.add(pot)
  const bloom = sph(0.15, rng() > 0.5 ? PAL.geranium : PAL.geraniumPink, 0, { flat: true })
  bloom.position.y = 0.16
  bloom.scale.y = 0.75
  bloom.castShadow = false
  g.add(bloom)
  return g
}

const STYLE = {
  plaza:   { floors: [2, 3], cols: 4, pal: [PAL.plasterWarm, PAL.plasterPink, PAL.plaster], balc: 0.5, pot: 0.4 },
  mercado: { floors: [1, 2], cols: 4, pal: [PAL.plasterOchre, PAL.plasterWarm, PAL.plaster], balc: 0.3, pot: 0.35 },
  barrio:  { floors: [2, 3], cols: 3, pal: [PAL.plaster, PAL.plasterWarm, PAL.plasterPink, PAL.plasterOchre], balc: 0.62, pot: 0.5 },
  iglesia: { floors: [1, 2], cols: 3, pal: [PAL.plaster, PAL.plaster, PAL.plasterWarm], balc: 0.22, pot: 0.55 },
  puerto:  { floors: [1, 2], cols: 4, pal: [PAL.plasterWarm, PAL.plaster, PAL.plasterOchre], balc: 0.15, pot: 0.25 },
  afueras: { floors: [1, 2], cols: 3, pal: [PAL.plasterOchre, PAL.plasterWarm], balc: 0.1, pot: 0.45 },
  hill:    { floors: [1, 1], cols: 2, pal: [PAL.stone, PAL.plasterOchre], balc: 0, pot: 0.15 },
}

function building(w, d, rng, opts = {}) {
  const g = new THREE.Group()
  const st = STYLE[opts.style] || STYLE.plaza
  const floors = opts.floors ?? (st.floors[0] + Math.floor(rng() * (st.floors[1] - st.floors[0] + 1)))
  const h = 3.0 + floors * 1.6 + (rng() - 0.5) * 0.7
  const basePlaster = opts.colour ?? st.pal[Math.floor(rng() * st.pal.length)]
  const plaster = new THREE.Color(basePlaster)
    .offsetHSL((rng() - 0.5) * 0.015, (rng() - 0.5) * 0.06, (rng() - 0.5) * 0.045)
    .getHex()

  const body = rbox(w * 0.97, h, d * 0.97, plaster, 0.12)
  body.position.y = h / 2
  g.add(body)
  const base = rbox(w * 0.99, 0.4, d * 0.99, PAL.stoneDark, 0.05)
  base.position.y = 0.2
  g.add(base)
  const rf = hipRoof(w * 1.04, d * 1.04, 1.3 + rng() * 0.5,
    rng() > 0.35 ? PAL.terracotta : (rng() > 0.5 ? PAL.terracottaDeep : PAL.terracottaLight))
  rf.position.y = h + 0.62
  g.add(rf)

  const ch = chimney(rng)
  ch.position.set((rng() - 0.5) * w * 0.5, h + 0.9 + rng() * 0.3, (rng() - 0.5) * d * 0.4)
  g.add(ch)

  const shutterCols = [PAL.door, PAL.doorTeal, PAL.doorOlive, PAL.doorRed]
  const shutterCol = shutterCols[Math.floor(rng() * shutterCols.length)]
  const front = -d * 0.485

  const doorX = (rng() - 0.5) * Math.max(0, w - 2.4)
  const frame = rbox(1.25, 2.3, 0.14, PAL.stone, 0.03)
  frame.position.set(doorX, 1.15, front)
  g.add(frame)
  const door = rbox(1.0, 2.05, 0.1, shutterCol, 0.03)
  door.position.set(doorX, 1.03, front - 0.05)
  g.add(door)
  const knob = sph(0.05, 0xd9b64a, 0)
  knob.position.set(doorX + 0.32, 1.05, front - 0.12)
  knob.castShadow = false
  g.add(knob)
  const step = doorstep(1.5)
  step.position.set(doorX, 0, front - 0.32)
  g.add(step)

  if (rng() > 0.45) {
    const dp = drainpipe(h - 0.4)
    dp.position.set((rng() > 0.5 ? 1 : -1) * (w * 0.44), 0, front - 0.06)
    g.add(dp)
  }

  // warehouses get big cargo doors instead of a window grid
  if (opts.warehouse) {
    const big = rbox(Math.min(w * 0.42, 3.0), 2.9, 0.16, PAL.woodDark, 0.04)
    big.position.set(doorX + (w > 7 ? 2.6 : 0) * (doorX < 0 ? 1 : -1), 1.45, front - 0.02)
    g.add(big)
    for (let i = 0; i < 3; i++) {
      const plank = rbox(Math.min(w * 0.42, 3.0) * 0.94, 0.11, 0.06, PAL.wood, 0.02)
      plank.position.set(big.position.x, 0.6 + i * 0.95, front - 0.11)
      g.add(plank)
    }
  }

  const cols = Math.min(st.cols, Math.max(1, Math.floor(w / 2.3)))
  for (let f = 0; f < floors; f++) {
    const wy = 2.6 + f * 1.6
    const shift = f > 0 && rng() > 0.55 ? (w / cols) * 0.5 * (rng() > 0.5 ? 1 : -1) : 0
    for (let i = 0; i < cols; i++) {
      if (rng() < 0.16) continue
      const wx = (i - (cols - 1) / 2) * (w / cols) + shift
      if (Math.abs(wx) > w * 0.42) continue
      if (f === 0 && Math.abs(wx - doorX) < 1.2) continue
      const win = windowUnit(shutterCol, rng() > 0.35, rng)
      win.position.set(wx, wy, front + 0.02)
      g.add(win)
      if (f > 0 && rng() < st.balc) {
        const b = balcony(1.5)
        b.position.set(wx, wy - 0.6, front)
        g.add(b)
        if (rng() > 0.5) {
          const p = sillPot(rng)
          p.position.set(wx + (rng() - 0.5) * 0.7, wy - 0.52, front - 0.42)
          g.add(p)
        }
      } else if (rng() < st.pot) {
        const p = sillPot(rng)
        p.position.set(wx + (rng() - 0.5) * 0.3, wy - 0.5, front - 0.14)
        g.add(p)
      }
    }
    if (f === floors - 1 && rng() > 0.7) {
      const hp = hangingPlant(rng)
      hp.position.set((rng() - 0.5) * w * 0.6, wy + 0.45, front + 0.14)
      g.add(hp)
    }
  }

  if (opts.shop) {
    const aw = awning(Math.min(w * 0.7, 3.2), opts.awningColour ?? PAL.doorRed)
    aw.position.set(doorX, 2.75, front - 0.42)
    g.add(aw)
    const sign = signboard(opts.signText ?? 'dukaan', PAL.woodDark)
    sign.position.set(doorX, 3.5, front - 0.1)
    g.add(sign)
  }
  if (opts.cross) {                 // pharmacy: the green cross you can spot
    for (const [sx, sy] of [[0.62, 0.2], [0.2, 0.62]]) {
      const arm = rbox(sx, sy, 0.12, 0x3f9a6a, 0.03)
      arm.position.set(doorX + w * 0.32, 3.6, front - 0.1)
      g.add(arm)
    }
  }
  return g
}

function church(w, d, rng) {
  const g = new THREE.Group()
  const h = 8
  const body = rbox(w * 0.94, h, d * 0.94, PAL.plaster, 0.12)
  body.position.y = h / 2
  g.add(body)
  const rf = hipRoof(w, d, 1.8, PAL.terracottaDeep)
  rf.position.y = h + 0.85
  g.add(rf)
  // the bell tower, the tallest thing for half a mile
  const tw = 2.6
  const th = h + 6.5
  const tower = rbox(tw, th, tw, PAL.plasterWarm, 0.1)
  tower.position.set(-w / 2 + tw / 2 + 0.5, th / 2, -d / 2 + tw / 2 + 0.3)
  g.add(tower)
  const cornice = rbox(tw * 1.18, 0.3, tw * 1.18, PAL.stone, 0.05)
  cornice.position.set(tower.position.x, th - 0.1, tower.position.z)
  g.add(cornice)
  const belfry = rbox(tw * 0.92, 2.0, tw * 0.92, PAL.plaster, 0.08)
  belfry.position.set(tower.position.x, th + 0.9, tower.position.z)
  g.add(belfry)
  for (const [ox, oz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const arch = rbox(ox ? 0.2 : 1.1, 1.4, oz ? 0.2 : 1.1, 0x33313a, 0.04)
    arch.position.set(tower.position.x + ox * tw * 0.45, th + 0.9, tower.position.z + oz * tw * 0.45)
    g.add(arch)
  }
  const bellMesh = sph(0.36, 0xc9a227, 1)
  bellMesh.position.set(tower.position.x, th + 1.0, tower.position.z)
  g.add(bellMesh)
  const spire = new THREE.Mesh(new THREE.ConeGeometry(tw * 0.8, 2.0, 4), mat(PAL.terracotta, { flat: true }))
  spire.position.set(tower.position.x, th + 2.9, tower.position.z)
  spire.rotation.y = Math.PI / 4
  spire.castShadow = true
  g.add(spire)
  const cross = rbox(0.1, 0.9, 0.1, PAL.iron, 0.02)
  cross.position.set(tower.position.x, th + 4.3, tower.position.z)
  g.add(cross)
  const crossArm = rbox(0.5, 0.1, 0.1, PAL.iron, 0.02)
  crossArm.position.set(tower.position.x, th + 4.5, tower.position.z)
  g.add(crossArm)

  // the great door, facing the square
  const front = -d * 0.47
  const arch = rbox(2.4, 3.6, 0.2, PAL.stone, 0.05)
  arch.position.set(1.2, 1.8, front)
  g.add(arch)
  const archTop = cyl(1.2, 1.2, 0.2, 12, PAL.stone)
  archTop.rotation.x = Math.PI / 2
  archTop.position.set(1.2, 3.6, front)
  g.add(archTop)
  const door = rbox(1.9, 3.2, 0.14, PAL.woodDark, 0.06)
  door.position.set(1.2, 1.6, front - 0.06)
  g.add(door)
  for (let i = 0; i < 3; i++) {
    const stud = sph(0.07, 0xc9a227, 0)
    stud.position.set(1.2 + (i - 1) * 0.5, 2.4, front - 0.14)
    stud.castShadow = false
    g.add(stud)
  }
  const rose = cyl(0.75, 0.75, 0.12, 12, 0x4a6fa8)
  rose.rotation.x = Math.PI / 2
  rose.position.set(1.2, 5.4, front)
  g.add(rose)
  const roseRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 6, 14), mat(PAL.stone))
  roseRing.position.set(1.2, 5.4, front - 0.02)
  roseRing.castShadow = true
  g.add(roseRing)
  return g
}

function fountain() {
  const g = new THREE.Group()
  const step = cyl(3.4, 3.7, 0.24, 12, PAL.stoneDark)
  step.position.y = 0.12
  g.add(step)
  const basin = cyl(2.8, 2.9, 0.75, 12, PAL.stone)
  basin.position.y = 0.6
  g.add(basin)
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: PAL.water, roughness: 0.12, metalness: 0.25 }),
  )
  water.position.y = 0.94
  water.receiveShadow = true
  g.add(water)
  const col = cyl(0.28, 0.46, 1.7, 8, PAL.stone)
  col.position.y = 1.8
  g.add(col)
  const bowl = cyl(1.05, 0.55, 0.34, 12, PAL.stone)
  bowl.position.y = 2.75
  g.add(bowl)
  const top = sph(0.24, PAL.stone, 1)
  top.position.y = 3.08
  g.add(top)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4
    const spout = cyl(0.08, 0.1, 0.3, 6, PAL.iron, { rough: 0.5, metal: 0.5 })
    spout.rotation.z = Math.PI / 2
    spout.position.set(Math.cos(a) * 0.5, 2.45, Math.sin(a) * 0.5)
    g.add(spout)
  }
  return g
}

function cafeTerrace(rng, n = 3) {
  const g = new THREE.Group()
  for (let i = 0; i < n; i++) {
    const tx = (i - (n - 1) / 2) * 1.8
    const tz = (rng() - 0.5) * 1.2
    const top = cyl(0.44, 0.44, 0.07, 10, 0xf7efe0)
    top.position.set(tx, 0.76, tz)
    g.add(top)
    const leg = cyl(0.05, 0.07, 0.76, 6, PAL.iron, { rough: 0.5, metal: 0.5 })
    leg.position.set(tx, 0.38, tz)
    g.add(leg)
    for (const s of [-1, 1]) {
      const c = new THREE.Group()
      const seat = rbox(0.42, 0.07, 0.42, PAL.doorOlive, 0.03)
      seat.position.y = 0.44
      c.add(seat)
      const back = rbox(0.42, 0.44, 0.06, PAL.doorOlive, 0.03)
      back.position.set(0, 0.66, -0.18)
      c.add(back)
      for (const [lx, lz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) {
        const l = cyl(0.025, 0.025, 0.44, 4, PAL.woodDark)
        l.position.set(lx, 0.22, lz)
        l.castShadow = false
        c.add(l)
      }
      c.position.set(tx + s * 0.85, 0, tz + (rng() - 0.5) * 0.5)
      c.rotation.y = s * 1.4 + (rng() - 0.5) * 0.8
      g.add(c)
    }
    if (rng() > 0.4) {
      const cup = cyl(0.06, 0.05, 0.09, 6, 0xf7efe0)
      cup.position.set(tx + (rng() - 0.5) * 0.4, 0.84, tz + (rng() - 0.5) * 0.4)
      cup.castShadow = false
      g.add(cup)
    }
  }
  return g
}

// ===========================================================================
// 5. BUILD
// ===========================================================================
const SHOPS = [
  { at: [37, 18], colour: PAL.doorRed,  sign: 'roti ghar' },      // LANDMARKS.bakery
  { at: [52, 20], colour: 0x3f9a6a,     sign: 'dawa ghar', cross: true },  // pharmacy
  { at: [32, 33], colour: PAL.doorTeal, sign: 'chai adda' },      // the cafe
  { at: [20, 15], colour: 0x4a6fa8,     sign: 'paathshala' },     // the school
  { at: [41, 24], colour: 0xe8c56a,     sign: 'kitaab ghar' },
  { at: [48, 24], colour: PAL.geranium, sign: 'kapde' },
  { at: [56, 27], colour: 0xc98a3a,     sign: 'masaale' },
  { at: [28, 14], colour: 0x9a6fd9,     sign: 'nai ki dukaan' },
  { at: [50, 43], colour: 0x2c7a76,     sign: 'machhli bazaar' },
  { at: [21, 34], colour: PAL.doorOlive, sign: 'khet' },
  { at: [60, 39], colour: 0xd94f3d,     sign: 'panaderia' },
]

function styleAt(cx, cz) {
  const d = districtOf(cx, cz)
  if (d) return d
  if (cz <= 19 && cx >= 60) return 'hill'
  if (cz >= 42) return 'puerto'
  if (cz <= 20 && cx < 26) return 'iglesia'
  if (cz <= 20) return 'barrio'
  return 'plaza'
}

// which way does a block face? whichever side has the most open ground.
function facingFor(x, z, w, d) {
  const openness = (dx, dz) => {
    const n = dz !== 0 ? w : d
    let s = 0
    for (let i = 0; i < n; i++) {
      const bx = dz !== 0 ? x + i : (dx > 0 ? x + w - 1 : x)
      const bz = dz !== 0 ? (dz > 0 ? z + d - 1 : z) : z + i
      for (let k = 1; k <= 4; k++) {
        const tx = bx + dx * k, tz = bz + dz * k
        if (!isWalkable(tx, tz)) break
        const ch = grid[tz][tx]
        s += (ch === 'p' || ch === 'm' || ch === 'c' || ch === 'q') ? 2.2 : 1
      }
    }
    return s / n
  }
  const cands = [
    [openness(0, -1), 0],
    [openness(0, 1), Math.PI],
    [openness(-1, 0), Math.PI / 2],
    [openness(1, 0), -Math.PI / 2],
  ]
  cands.sort((a, b) => b[0] - a[0])
  return cands[0][1]
}

export function buildTown(scene) {
  const rng = seeded(20260824)
  const props = new THREE.Group()
  scene.add(props)

  const white = mat(0xffffff, { rough: 0.95 })
  const whiteFlat = mat(0xffffff, { rough: 0.9, flat: true })

  // --- instanced layers ----------------------------------------------------
  const cobbleGeo = new THREE.BoxGeometry(TILE / 2 - 0.07, 0.2, TILE / 2 - 0.07)
  const slabGeo = new THREE.BoxGeometry(TILE, 0.14, TILE)
  const dirtGeo = new THREE.BoxGeometry(TILE, 0.5, TILE)
  const stepGeo = new THREE.BoxGeometry(TILE, PLAZA_H, TILE)
  const bladeGeo = new THREE.CylinderGeometry(0.006, 0.032, 0.22, 3)
  const pebbleGeo = new THREE.IcosahedronGeometry(0.09, 0)
  const blobGeo = new THREE.IcosahedronGeometry(0.3, 0)
  const wallGeo = new THREE.BoxGeometry(TILE, 1, 0.85)
  const capGeo = new THREE.BoxGeometry(TILE, 0.16, 1.0)
  const furrowGeo = new THREE.BoxGeometry(TILE * 0.9, 0.16, 0.5)

  const cobbles = batch(cobbleGeo, white, { receive: true })
  const slabs = batch(slabGeo, white, { receive: true })
  const dirt = batch(dirtGeo, white, { receive: true })
  const steps = batch(stepGeo, white, { receive: true })
  const blades = batch(bladeGeo, whiteFlat, { receive: false })
  const pebbles = batch(pebbleGeo, whiteFlat, { receive: false })
  const blobs = batch(blobGeo, whiteFlat, { cast: true, receive: false })
  const walls = batch(wallGeo, white, { cast: true })
  const caps = batch(capGeo, white, { cast: true })
  const furrows = batch(furrowGeo, white, { receive: true })
  const water = batch(slabGeo, new THREE.MeshStandardMaterial({
    color: 0x3f7fb8, roughness: 0.18, metalness: 0.3,
  }), { receive: true })

  // --- ground ---------------------------------------------------------------
  // The town floor is a block per tile, not one big plane. A plane at y=-0.03
  // sat ON TOP of the water (-0.35) and the sand (-0.12) and hid both; per-tile
  // blocks let the sea be cut out of the land properly, and give the dirt
  // streets a bit of tonal variation for free. This plane is only the apron
  // beyond the map edge and the seabed under the open water.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(COLS * TILE + 200, ROWS * TILE + 320),
    mat(0xb9bd82, { rough: 1 }),      // dry inland grass, not table-top dirt
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, -0.52, 60)
  ground.receiveShadow = true
  scene.add(ground)
  // a skirt of scrub so the map edge is countryside rolling away, not a cliff
  for (let i = 0; i < 90; i++) {
    const b = bake(rng() > 0.5 ? scrubBush(rng) : agave(rng))
    const edge = Math.floor(rng() * 4)
    const t = rng()
    const halfW = COLS * TILE / 2 + 4, halfD = ROWS * TILE / 2 + 4
    const out = 2 + rng() * 26
    if (edge === 0) b.position.set(-halfW + t * halfW * 2, -0.5, -halfD - out)
    else if (edge === 1) b.position.set(-halfW - out, -0.5, -halfD + t * halfD * 1.55)
    else if (edge === 2) b.position.set(halfW + out, -0.5, -halfD + t * halfD * 1.55)
    else b.position.set(-halfW - out - rng() * 20, -0.5, halfD * 0.3 + t * halfD * 0.6)
    b.scale.setScalar(0.9 + rng() * 1.4)
    scene.add(b)
  }

  // --- the sea: a bobbing group holding the open water + the harbour inlet --
  const sea = new THREE.Group()
  sea.position.y = -0.35
  scene.add(sea)
  const openSea = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 240),
    new THREE.MeshStandardMaterial({ color: 0x3f7fb8, roughness: 0.18, metalness: 0.3 }),
  )
  openSea.rotation.x = -Math.PI / 2
  openSea.position.set(0, 0, tileToWorld(0, SEA_Z).z - TILE / 2 + 120)
  openSea.receiveShadow = true
  sea.add(openSea)

  // foam where the open sea meets the western beach
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(84, 0.6),
    new THREE.MeshBasicMaterial({ color: 0xf2ede0, transparent: true, opacity: 0.7 }),
  )
  foam.rotation.x = -Math.PI / 2
  foam.position.set(tileToWorld(20, 0).x, -0.28, tileToWorld(0, SEA_Z).z - TILE / 2)
  scene.add(foam)

  // --- horizon: hazy hills so the low camera never sees the void -----------
  const hazeCols = [0x8fa8b8, 0x9db2bd, 0x7e9aab]
  const hillMat = i => new THREE.MeshBasicMaterial({ color: hazeCols[i % hazeCols.length], fog: true })
  const farZ = tileToWorld(0, SEA_Z).z + 46
  for (let i = 0; i < 8; i++) {
    const hw = 34 + rng() * 40
    const hh = 6 + rng() * 7
    const hill = new THREE.Mesh(new THREE.ConeGeometry(hw * 0.5, hh, 7), hillMat(i))
    hill.scale.y = 0.6 + rng() * 0.3
    hill.position.set((i - 3.5) * 30 + (rng() - 0.5) * 14, -0.4, farZ + 6 + rng() * 16)
    scene.add(hill)
  }
  const headland = new THREE.Mesh(new THREE.ConeGeometry(24, 4.2, 6), hillMat(2))
  headland.scale.set(2.8, 0.8, 0.7)
  headland.position.set(92, -0.4, tileToWorld(0, SEA_Z).z + 24)
  scene.add(headland)
  const westCape = new THREE.Mesh(new THREE.ConeGeometry(20, 5.0, 6), hillMat(0))
  westCape.scale.set(2.2, 0.9, 0.8)
  westCape.position.set(-104, -0.4, tileToWorld(0, SEA_Z).z + 16)
  scene.add(westCape)

  // ==========================================================================
  // 5a. the tile pass — floors, greenery, water, walls
  // ==========================================================================
  const pavingCols = [PAL.paving, PAL.pavingAlt, PAL.pavingWarm]
  const quayCols = [0xcfc3a8, 0xc2b699, 0xd6cbb2]
  const grassCols = [0x8fae5f, 0x86a558, 0x9aba69, 0x7f9d52]
  const groveCols = [0xa89a66, 0xb0a170, 0x9d9060]
  const sandCols = [0xe8d9ae, 0xe2d2a4, 0xeee0b8]
  const trees = []          // [x, z, kind]

  const dirtCols = [0xd9c49c, 0xd2bc93, 0xdfcba4, 0xcdb78e]

  // A tree, a rock or a shelter is an object standing ON a floor, not a floor
  // of its own — without this every prop tile punched a bare dirt square into
  // the grove and the plaza. Ask the neighbours what we are standing on.
  const FLOORS = new Set(['p', 'c', 'm', 'q', 'g', 'o', 'b', 's', '.'])
  const PROPS_ON_FLOOR = new Set(['T', 'P', 'r', 'K', 'W'])
  const NB8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
  function surfaceOf(x, z) {
    const counts = {}
    for (const [dx, dz] of NB8) {
      const row = grid[z + dz]
      const c = row && row[x + dx]
      if (c && FLOORS.has(c)) counts[c] = (counts[c] || 0) + 1
    }
    let best = '.', n = 0
    for (const k in counts) if (counts[k] > n) { n = counts[k]; best = k }
    return best
  }
  const surfaceH = ch => (HEIGHTS[ch] === undefined ? 0 : HEIGHTS[ch])
  const standH = new Float32Array(COLS * ROWS)

  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      const raw = grid[z][x]
      const ch = PROPS_ON_FLOOR.has(raw) ? surfaceOf(x, z) : raw
      standH[z * COLS + x] = surfaceH(ch)
      const p = tileToWorld(x, z)

      // every tile that is not open water stands on a block of ground; the
      // beach uses the same block in sand so the shoreline has a real edge
      if (ch === 'b') dirt.add(p.x, -0.33, p.z, sandCols[Math.floor(rng() * sandCols.length)])
      else if (ch !== 'w') dirt.add(p.x, -0.27, p.z, dirtCols[Math.floor(rng() * dirtCols.length)])

      if (ch === 'p' || ch === 'c' || ch === 'm' || ch === 'q' || ch === 'F' || ch === 'M') {
        const cols = ch === 'q' ? quayCols : pavingCols
        for (let sx = 0; sx < 2; sx++) for (let sz = 0; sz < 2; sz++) {
          cobbles.add(
            p.x + (sx - 0.5) * TILE / 2 + (rng() - 0.5) * 0.05,
            PLAZA_H - 0.1 + (rng() - 0.5) * 0.025,
            p.z + (sz - 0.5) * TILE / 2 + (rng() - 0.5) * 0.05,
            cols[Math.floor(rng() * cols.length)],
            (rng() - 0.5) * 0.06,
          )
        }
        if (ch !== 'q' && rng() > 0.93) {
          for (let i = 0; i < 3; i++)
            blades.add(p.x + (rng() - 0.5) * 1.3, PLAZA_H, p.z + (rng() - 0.5) * 1.3,
              rng() > 0.5 ? 0x87995a : 0x9caf6b, rng() * 3, 1, 0.8 + rng() * 0.5, 1)
        }
      } else if (ch === 's') {
        steps.add(p.x, PLAZA_H / 2 - 0.07, p.z, PAL.stoneDark)
      } else if (ch === 'g' || ch === 'o') {
        const cols = ch === 'o' ? groveCols : grassCols
        slabs.add(p.x, 0.01, p.z, cols[Math.floor(rng() * cols.length)])
        const n = ch === 'o' ? 2 : 3
        for (let i = 0; i < n; i++)
          blades.add(p.x + (rng() - 0.5) * 1.7, 0.07, p.z + (rng() - 0.5) * 1.7,
            rng() > 0.5 ? 0x87995a : 0x9caf6b, rng() * 3, 1, 0.7 + rng() * 0.7, 1)
        if (rng() > 0.86) {
          const s = 0.7 + rng() * 0.9
          blobs.add(p.x + (rng() - 0.5) * 1.3, 0.2 + s * 0.14, p.z + (rng() - 0.5) * 1.3,
            [0x8f9a63, 0x9caf6b, 0x7d8a55][Math.floor(rng() * 3)], rng() * 3, s, s * 0.75, s)
        }
        if (rng() > 0.9) {
          pebbles.add(p.x + (rng() - 0.5) * 1.5, 0.1, p.z + (rng() - 0.5) * 1.5,
            [0xd94f3d, 0xe8c56a, 0xdb6f8f, 0xf2ede0][Math.floor(rng() * 4)],
            0, 0.7, 0.7, 0.7)
        }
      } else if (ch === 'b') {
        if (rng() > 0.87)
          pebbles.add(p.x + (rng() - 0.5) * 1.5, -0.03, p.z + (rng() - 0.5) * 1.5,
            rng() > 0.5 ? 0xf2ede0 : 0xd9c9a4, rng() * 3, 0.6, 0.5, 0.9)
      } else if (ch === 'w') {
        // local to the `sea` group, which itself bobs at y = -0.35
        if (z < SEA_Z) water.add(p.x, 0, p.z, 0xffffff)
      } else if (ch === '.') {
        if (rng() > 0.84)
          pebbles.add(p.x + (rng() - 0.5) * 1.6, 0.03, p.z + (rng() - 0.5) * 1.6,
            rng() > 0.5 ? PAL.stoneDark : 0xb8a888, rng() * 3, 1, 0.7, 1)
        if (rng() > 0.9)
          for (let i = 0; i < 2; i++)
            blades.add(p.x + (rng() - 0.5) * 1.6, 0.02, p.z + (rng() - 0.5) * 1.6,
              0x87995a, rng() * 3, 1, 0.7, 1)
      } else if (ch === 'n') {
        slabs.add(p.x, 0.01, p.z, 0xb59a68)
        for (let i = 0; i < 3; i++) {
          furrows.add(p.x, 0.09, p.z - TILE / 2 + ((i + 0.5) / 3) * TILE, 0x9a7f52)
          for (let k = 0; k < 3; k++)
            blobs.add(p.x - TILE / 2 + ((k + 0.5) / 3) * TILE + (rng() - 0.5) * 0.2, 0.26,
              p.z - TILE / 2 + ((i + 0.5) / 3) * TILE,
              rng() > 0.5 ? 0x6f9a4a : 0x87a95a, rng() * 3, 0.6, 0.5, 0.6)
        }
      }

      // --- and now whatever stands on that floor -------------------------
      const y0 = standH[z * COLS + x]
      if (raw === 'W') {
        const horiz = grid[z][x - 1] === 'W' || grid[z][x + 1] === 'W'
        const seaWall = z >= 42
        const hgt = seaWall ? 1.5 : (districtOf(x, z) === 'iglesia' ? 1.7 : 1.0 + rng() * 0.25)
        const col = seaWall ? 0xc2b699 : (districtOf(x, z) === 'iglesia' ? PAL.plaster : 0xbfb192)
        walls.add(p.x, y0 + hgt / 2, p.z, col, horiz ? 0 : Math.PI / 2, 1, hgt, 1)
        caps.add(p.x, y0 + hgt + 0.06, p.z, PAL.stoneDark, horiz ? 0 : Math.PI / 2)
      } else if (raw === 'T') {
        trees.push([x, z, y0])
      } else if (raw === 'r') {
        const rk = bake(rock(rng))
        rk.position.set(p.x, y0 - 0.15, p.z)
        rk.rotation.y = rng() * Math.PI * 2
        props.add(rk)
      } else if (raw === 'P') {
        const t = bake(palmTree(rng))
        t.position.set(p.x, y0 - 0.05, p.z)
        t.rotation.y = rng() * Math.PI * 2
        props.add(t)
      }
    }
  }

  // --- trees: detailed ones where you walk, cheap ones in the groves -------
  for (const [x, z, y0] of trees) {
    const p = tileToWorld(x, z)
    const d = districtOf(x, z)
    const grove = (d === 'afueras' && x <= 15) || (z <= 19 && x >= 60)
    let t
    if (d === 'iglesia') t = cypress(rng, 0.9 + rng() * 0.3)
    else if (grove) t = oliveTreeSimple(rng, 0.85 + rng() * 0.4)
    else t = oliveTree(rng, 0.95 + rng() * 0.35)
    if (!grove) {
      const ring = cyl(0.88, 0.94, 0.32, 8, PAL.stoneDark)
      ring.position.y = 0.14
      t.add(ring)
    }
    bake(t)
    t.position.set(p.x, y0, p.z)
    t.rotation.y = rng() * Math.PI * 2
    props.add(t)
  }

  // ==========================================================================
  // 5b. buildings — greedy rectangles over the '#' cells
  // ==========================================================================
  const used = grid.map(r => r.map(() => false))
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[z][x] !== '#' || used[z][x]) continue
      let w = 0
      while (x + w < COLS && grid[z][x + w] === '#' && !used[z][x + w]) w++
      let d = 1
      outer: while (z + d < ROWS) {
        for (let i = 0; i < w; i++) if (grid[z + d][x + i] !== '#' || used[z + d][x + i]) break outer
        d++
      }
      for (let dz = 0; dz < d; dz++) for (let i = 0; i < w; i++) used[z + dz][x + i] = true

      const c0 = tileToWorld(x + w / 2 - 0.5, z + d / 2 - 0.5)
      const isChurch = x === 9 && z === 15
      let b
      if (isChurch) {
        b = church(w * TILE, d * TILE, rng)
        b.rotation.y = 0                              // door faces the square
      } else {
        const style = styleAt(x + (w >> 1), z + (d >> 1))
        const shop = SHOPS.find(s => s.at[0] >= x && s.at[0] < x + w && s.at[1] >= z && s.at[1] < z + d)
        b = building(w * TILE, d * TILE, rng, {
          style,
          shop: !!shop,
          cross: !!shop?.cross,
          awningColour: shop?.colour,
          signText: shop?.sign,
          warehouse: style === 'puerto' && d <= 3,
        })
        b.rotation.y = facingFor(x, z, w, d)
      }
      bake(b)
      b.position.set(c0.x, 0, c0.z)
      scene.add(b)
    }
  }

  // ==========================================================================
  // 5c. LA PLAZA — fountain, cafe terrace, benches
  // ==========================================================================
  const at = (cx, cz, y) => {
    const p = tileToWorld(cx, cz)
    p.y = y === undefined ? groundHeight(Math.round(cx), Math.round(cz)) : y
    return p
  }
  const place = (obj, cx, cz, ry = 0, y) => {
    const p = at(cx, cz, y)
    bake(obj)
    obj.position.copy(p)
    obj.rotation.y = ry
    scene.add(obj)
    return obj
  }

  const [fx, fz] = LANDMARKS.fountain
  const fp = tileToWorld(fx - 0.5, fz - 0.5)          // the 2x2 'F' block
  place(fountain(), fx - 0.5, fz - 0.5, 0, PLAZA_H)
  const jet = fountainJet()
  jet.position.set(fp.x, PLAZA_H + 2.9, fp.z)
  scene.add(jet)
  for (let i = 0; i < 6; i++) {                        // ring of pots round the basin
    const a = (i / 6) * Math.PI * 2
    const pot = bake(flowerPot(rng))
    pot.position.set(fp.x + Math.cos(a) * 4.3, PLAZA_H, fp.z + Math.sin(a) * 4.3)
    scene.add(pot)
  }

  const [cx0, cz0] = LANDMARKS.cafe
  for (let i = 0; i < 3; i++) {
    place(cafeTerrace(rng, 2), cx0 + 0.4, cz0 - 2 + i * 2.2, 0, PLAZA_H)
  }
  for (const [ux, uz, uc] of [[0.2, -2.2, 0xe8c56a], [1.2, 0.2, 0xd9694a], [0.1, 2.4, 0x6f9a4a]]) {
    place(cafeUmbrella(rng, uc), cx0 + ux, cz0 + uz, 0, PLAZA_H)
  }
  place(signpost('chai adda', PAL.doorTeal, 1.9), cx0, cz0 + 0.1, 0, PLAZA_H)

  for (const [bx, bz, ry] of [
    [35, 26, Math.PI], [39, 26, Math.PI], [45, 26, Math.PI], [49, 27, -Math.PI / 2],
    [35, 37, 0], [40, 37, 0], [45, 37, 0], [49, 33, -Math.PI / 2],
    [38, 31, Math.PI / 2], [44, 31, -Math.PI / 2],
  ]) place(bench(), bx, bz, ry, PLAZA_H)

  for (const [lx, lz] of [
    [33, 25], [50, 25], [33, 37], [50, 37], [38, 25], [45, 37], [50, 31], [33, 31],
  ]) place(lamp(), lx, lz, rng() * 6.28, PLAZA_H)

  scene.add(bake(bunting(at(33, 24.6, 0), at(50, 24.6, 0), 5.4, rng)))
  scene.add(bake(bunting(at(33, 37.6, 0), at(50, 37.6, 0), 5.4, rng)))
  scene.add(bake(bunting(at(32.6, 26, 0), at(32.6, 37, 0), 5.2, rng)))
  scene.add(bake(bunting(at(50.6, 26, 0), at(50.6, 37, 0), 5.2, rng)))

  for (let i = 0; i < 10; i++) {
    const spots = [[33.5, 23.6], [44.5, 23.6], [51.5, 25.4], [51.5, 34.4], [38, 39.4], [31.5, 29.4]]
    const [sx, sz] = spots[Math.floor(rng() * spots.length)]
    place(flowerPot(rng), sx + (rng() - 0.5) * 1.6, sz + (rng() - 0.5) * 0.8, 0)
  }
  // a couple of market-day stalls keep the south half of the square occupied
  for (const [sx, sz, sc] of [[38.5, 35.6, 0xe8c56a], [42.5, 35.6, 0x4a8fc9], [40.5, 24.6, 0xd94f3d]]) {
    place(marketStall(rng, sc), sx, sz, 0, PLAZA_H)
    place(crate(rng), sx + 1.3, sz + 0.4, rng() * 6.28, PLAZA_H)
  }
  place(wellHead(rng), 44.5, 27.5, 0, PLAZA_H)

  // ==========================================================================
  // 5d. EL MERCADO — a real market row
  // ==========================================================================
  place(marketHall(8 * TILE, 6 * TILE, rng), 62, 28, 0, PLAZA_H)
  // long striped awnings over the stall rows — the "covered market row". They
  // sit above NON-walkable stall tiles only, so they never blind the camera.
  for (const [ax0, ax1, az, ry, ac] of [
    [59, 64, 26, Math.PI, 0xd94f3d], [67, 71, 26, Math.PI, 0x4a8fc9],
    [59, 64, 32, 0, 0xe8c56a], [68, 71, 32, 0, 0x6f9a4a],
  ]) {
    place(awning((ax1 - ax0 + 1) * TILE * 0.98, ac), (ax0 + ax1) / 2, az, ry, PLAZA_H + 3.35)
  }

  // group runs of 'M' into stalls
  const stallCols = [0xe8c56a, 0xd94f3d, 0x4a8fc9, 0x6f9a4a, 0xc2478c]
  const seenM = new Set()
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[z][x] !== 'M' || seenM.has(z * COLS + x)) continue
      let run = 0
      while (grid[z][x + run] === 'M' && !seenM.has(z * COLS + x + run)) { seenM.add(z * COLS + x + run); run++ }
      const isFish = x <= LANDMARKS.fishStall[0] && LANDMARKS.fishStall[0] < x + run && z === LANDMARKS.fishStall[1]
      const isFlower = x <= LANDMARKS.flowerCart[0] && LANDMARKS.flowerCart[0] < x + run && z === LANDMARKS.flowerCart[1]
      if (isFish) {
        // stall frame first, then the slab in front of it — an unsupported
        // awning floating over the quay reads as a bug, not a canopy
        place(marketStall(rng, 0x2c7a76), x + (run - 1) / 2, z - 0.6, Math.PI, PLAZA_H)
        place(fishTable(rng), x + (run - 1) / 2, z, Math.PI, PLAZA_H)
        place(signpost('machhli', 0x2c7a76, 2.4), x + (run - 1) / 2 - 1.5, z + 0.3, 0.4, PLAZA_H)
        place(netRack(rng), x + (run - 1) / 2 + 2.0, z - 0.4, 0.2, PLAZA_H)
        continue
      }
      if (isFlower) {
        place(flowerCart(rng), x + (run - 1) / 2, z, Math.PI, PLAZA_H)
        place(signpost('phool', PAL.geranium, 2.1), x + (run - 1) / 2 + 1.3, z, 0, PLAZA_H)
        continue
      }
      // otherwise: a run of covered stalls, two tiles each
      for (let i = 0; i < run; i += 2) {
        const wide = Math.min(2, run - i)
        const st = marketStall(rng, stallCols[Math.floor(rng() * stallCols.length)])
        place(st, x + i + (wide - 1) / 2, z, 0, PLAZA_H)
      }
    }
  }
  // the fruit stall gets a sign so LANDMARKS.fruitStall is unmistakable
  place(signpost('phal wala', 0xe8c56a, 2.3), LANDMARKS.fruitStall[0] - 1.6, LANDMARKS.fruitStall[1], 0, PLAZA_H)

  for (const [cx, cz, kind] of [
    [59, 28, 'c'], [63, 29, 'b'], [67, 28, 'c'], [70, 30, 'b'], [60, 35, 'c'],
    [64, 36, 'b'], [69, 35, 'c'], [71, 29, 'b'], [58.5, 34, 'c'], [72, 25, 'c'],
    [65, 24.5, 'b'], [70, 37, 'c'],
  ]) place(kind === 'c' ? crate(rng) : barrel(rng), cx, cz, rng() * 6.28, PLAZA_H)

  scene.add(bake(bunting(at(58.4, 29.5, 0), at(72.4, 29.5, 0), 5.0, rng)))
  scene.add(bake(bunting(at(58.4, 35.5, 0), at(72.4, 35.5, 0), 5.0, rng)))
  for (const [lx, lz] of [[58, 37], [72, 24], [72, 37], [73, 30]])
    place(lamp(), lx, lz, rng() * 6.28)
  for (let i = 0; i < 8; i++)
    place(flowerPot(rng), 56.6 + (rng() - 0.5), 24 + rng() * 14, 0)

  // ==========================================================================
  // 5e. EL BARRIO — laundry strung between the upper floors of tight lanes
  // ==========================================================================
  for (const lx of [31, 36, 41, 46, 51]) {
    for (const lz of [4, 9, 14, 18]) {
      if (grid[lz][lx] !== '.') continue
      scene.add(laundryLine(
        tileToWorld(lx - 0.62, lz), tileToWorld(lx + 0.62, lz),
        4.6 + rng() * 1.5, rng, 0.35,
      ))
    }
  }
  for (const [ax, az] of [[36, 8], [46, 14], [41, 4]]) {
    place(archway(TILE * 1.25, 3.6), ax, az, 0)
  }
  // the placita
  place(bench(), 44, 9, Math.PI / 2, PLAZA_H)
  place(bench(), 44, 8, -Math.PI / 2, PLAZA_H)
  place(wellHead(rng), 45, 9.5, 0, PLAZA_H)
  scene.add(bake(bunting(at(42, 7.4, 0), at(45, 7.4, 0), 4.6, rng)))
  for (const [lx, lz] of [[26, 6], [33, 11], [39, 17], [48, 6], [54, 11], [29, 17], [43, 11]])
    place(lamp(), lx, lz, rng() * 6.28)
  for (let i = 0; i < 22; i++) {
    const lanes = [31, 36, 41, 46, 51]
    const lx = lanes[Math.floor(rng() * lanes.length)]
    const lz = 2 + Math.floor(rng() * 17)
    if (grid[lz][lx] !== '.') continue
    place(flowerPot(rng), lx + (rng() - 0.5) * 0.7, lz, 0)
  }
  for (const [cx, cz, kind] of [
    [31, 5, 'c'], [36, 13, 'b'], [46, 3, 'c'], [51, 15, 'b'], [41, 16, 'c'],
    [28, 6, 'b'], [44, 17, 'c'], [55, 11, 'b'], [34, 6, 'c'],
  ]) place(kind === 'c' ? crate(rng) : barrel(rng), cx, cz, rng() * 6.28)

  // ==========================================================================
  // 5f. LA IGLESIA — walled square, bell tower, olive trees
  // ==========================================================================
  const [chdX, chdZ] = LANDMARKS.churchDoor
  for (const s of [-1, 1]) {
    // cyl() is centred on its own origin — the post has to be raised by half
    // its height or it sinks into the apron and the finial floats free of it
    const post = cyl(0.22, 0.28, 2.6, 8, PAL.stone)
    place(post, chdX + s * 1.8, chdZ + 0.2, 0, PLAZA_H / 2 + 1.3)
    const ball = sph(0.26, PAL.stone, 1)
    place(ball, chdX + s * 1.8, chdZ + 0.2, 0, PLAZA_H / 2 + 2.75)
  }
  const lantern = lamp()
  place(lantern, chdX + 2.6, chdZ - 0.4, 0, PLAZA_H / 2)
  place(signpost('girja ghar', PAL.woodDark, 2.0), chdX - 3.0, chdZ - 0.3, 0, PLAZA_H / 2)

  // the gate through the west wall
  place(archway(TILE * 1.3, 3.2), 7, 9.5, Math.PI / 2)
  place(wellHead(rng), 12, 9, 0, PLAZA_H)
  for (const [bx, bz, ry] of [[10, 10, -Math.PI / 2], [16, 10, Math.PI / 2], [12, 12.5, 0], [15, 12.5, 0]])
    place(bench(), bx, bz, ry, PLAZA_H)
  for (const [lx, lz] of [[8, 6], [18, 6], [8, 13], [18, 13], [10, 20], [20, 20]])
    place(lamp(), lx, lz, rng() * 6.28)
  for (let i = 0; i < 12; i++)
    place(flowerPot(rng), 8 + rng() * 10, 6 + rng() * 7.5, 0, PLAZA_H)

  // school yard: a fence, a bell on a post, a bench
  const [scX, scZ] = LANDMARKS.school
  place(fence(6, rng), scX + 0.5, scZ + 3.6, 0)
  place(bench(), scX - 0.5, scZ + 2.4, 0)
  const bellPost = cyl(0.09, 0.11, 2.4, 6, PAL.woodDark)
  place(bellPost, scX + 2.2, scZ + 2.6, 0, 1.2)
  const schoolBell = sph(0.24, 0xc9a227, 1)
  place(schoolBell, scX + 2.2, scZ + 2.6, 0, 2.5)
  for (const [cx, cz] of [[8.5, 16], [8.5, 18], [18.5, 15]]) place(crate(rng), cx, cz, rng() * 6.28)

  // ==========================================================================
  // 5g. LAS AFUERAS — grove, farm, the road out
  // ==========================================================================
  const [ogX, ogZ] = LANDMARKS.oliveGrove
  const marker = rbox(0.7, 1.5, 0.5, PAL.stone, 0.06)
  place(marker, ogX + 1.1, ogZ + 0.9, 0.3, 0.75)
  place(signpost('zaitoon ka bagh', PAL.doorOlive, 1.8), ogX + 1.9, ogZ + 1.0, 0)

  for (let i = 0; i < 5; i++) place(fence(2 * TILE, rng), 17 + i * 1.5, 25.4, 0)
  for (let i = 0; i < 3; i++) place(fence(2 * TILE, rng), 17 + i * 1.5, 29.6, 0)
  for (const [hx, hz] of [[17.5, 31.5], [22, 27.5]]) place(haystack(rng), hx, hz, 0)
  place(wellHead(rng), LANDMARKS.oliveGrove[0] + 8, 31, 0)
  place(crate(rng), 17.6, 33.5, 0.4)
  place(barrel(rng), 18.2, 34.4, 0)
  const cart = flowerCart(rng)
  cart.scale.setScalar(0.9)
  place(cart, 18, 36.4, 1.2)
  for (const [lx, lz] of [[16, 24], [24, 30], [16, 39], [6, 24]]) place(lamp(), lx, lz, rng() * 6.28)
  // the road out
  place(signpost('shehar se bahar →', PAL.woodDark, 2.4), 2, 39, 0)
  for (let i = 0; i < 6; i++) place(agave(rng), 1 + rng() * 3, 30 + rng() * 8, 0)
  for (let i = 0; i < 5; i++) place(scrubBush(rng), 1 + rng() * 3, 24 + rng() * 14, 0)

  // ==========================================================================
  // 5h. EL PUERTO — harbour wall, boats, nets, the sea beyond
  // ==========================================================================
  const [heX, heZ] = LANDMARKS.harbourEnd
  place(beacon(), heX, heZ, 0, PLAZA_H)
  place(signpost('bandargah', 0x2c7a76, 2.2), heX - 2, heZ - 1, 0, PLAZA_H)

  place(busShelter(rng), LANDMARKS.busStop[0], LANDMARKS.busStop[1], Math.PI, PLAZA_H)
  place(signpost('bus adda', PAL.doorRed, 2.4), LANDMARKS.busStop[0] + 1.9, LANDMARKS.busStop[1] + 0.6, 0, PLAZA_H)

  place(netRack(rng), 34, 48, 0, PLAZA_H)
  place(netRack(rng, 0x8a9a6a), 50, 48, 0.3, PLAZA_H)
  place(crane(rng), 60, 46, Math.PI, PLAZA_H)

  for (let x = 42; x <= 61; x += 2.5) place(bollard(rng), x, 49.4, rng() * 6.28, PLAZA_H)
  for (const [cx, cz, kind] of [
    [26, 46, 'c'], [31, 47, 'b'], [37, 46.5, 'c'], [40, 48, 'b'], [46, 48.5, 'c'],
    [48, 46, 'b'], [53, 47, 'c'], [56, 48, 'b'], [58, 46, 'c'], [43, 45.5, 'b'],
    [30, 48, 'c'], [35, 45.5, 'b'],
  ]) place(kind === 'c' ? crate(rng) : barrel(rng), cx, cz, rng() * 6.28, PLAZA_H)

  // boats moored under the harbour wall
  const hues = [0x4a8fc9, 0xd94f3d, 0x6f9a4a, 0xe8c56a, 0xf2ede0, 0x2c7a76]
  for (let i = 0; i < 8; i++) {
    const bt = bake(boat(rng, hues[i % hues.length]))
    const bx = 42 + i * 2.4 + rng() * 0.5
    const p = tileToWorld(bx, 51.4)
    bt.position.set(p.x, -0.28, p.z)
    bt.rotation.y = Math.PI / 2 + (rng() - 0.5) * 0.35
    scene.add(bt)
    const rope = cyl(0.03, 0.03, 2.2, 4, 0xbba883)
    rope.position.set(p.x, 0.2, p.z - 1.6)
    rope.rotation.x = 1.1
    rope.castShadow = false
    scene.add(rope)
  }
  // two boats hauled up on the sand
  for (const [bx, bz, hue] of [[29, 51.5, 0xd94f3d], [36, 52.5, 0x4a8fc9]]) {
    const bt = bake(boat(rng, hue))
    const p = tileToWorld(bx, bz)
    bt.position.set(p.x, -0.05, p.z)
    bt.rotation.y = 0.8 + rng() * 0.6
    bt.rotation.z = 0.12
    scene.add(bt)
  }
  for (const [lx, lz] of [[27, 45], [39, 45], [48, 45], [54, 45], [61, 45], [31, 48], [41, 48]])
    place(lamp(), lx, lz, rng() * 6.28, PLAZA_H)
  for (const bx of [26, 32, 38, 45, 52, 59])
    place(bench(), bx, 48.5, Math.PI, PLAZA_H)
  for (let i = 0; i < 6; i++) place(agave(rng), 64 + rng() * 16, 42 + rng() * 7, 0)
  for (let i = 0; i < 8; i++) place(scrubBush(rng), 5 + rng() * 17, 43 + rng() * 10, 0)
  // the little lighthouse on the headland path
  place(beacon(), 70, 48, 0)

  // ==========================================================================
  // 5i. flush the instanced layers
  // ==========================================================================
  dirt.build(props)
  cobbles.build(props)
  slabs.build(props)
  steps.build(props)
  blades.build(props)
  pebbles.build(props)
  blobs.build(props)
  walls.build(props)
  caps.build(props)
  furrows.build(props)
  water.build(sea)

  let meshes = 0
  scene.traverse(o => { if (o.isMesh) meshes++ })
  scene.userData.townMeshes = meshes
  scene.userData.townInstances = {
    dirt: dirt.count, cobbles: cobbles.count, slabs: slabs.count, blades: blades.count,
    pebbles: pebbles.count, blobs: blobs.count, walls: walls.count,
    steps: steps.count, water: water.count,
  }
  scene.userData.townReachability = REACHABILITY

  return { sea }
}
