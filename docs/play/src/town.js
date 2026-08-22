import * as THREE from 'three'
import {
  PAL, mat, rbox, cyl, sph, seeded,
  flowerPot, oliveTree, palmTree, grassTuft, crate, barrel, bench, lamp,
  marketStall, awning, bunting, boat, rock,
  signboard, hangingPlant, doorstep, chimney, drainpipe, cafeUmbrella, fountainJet,
} from './kit.js'

// ---------------------------------------------------------------------------
// Pueblo — generated logical map, 44x32 tiles. Renders in 3D, thinks in tiles.
// chars: # building · . street · p plaza · F fountain · s step · c cafe
//        m market · T olive · P palm · g grass · b sand · w water · r rocks
// ---------------------------------------------------------------------------
export const COLS = 44
export const ROWS = 32
export const TILE = 2

const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('.'))

function rect(x0, z0, x1, z1, ch) {
  for (let z = z0; z <= z1; z++)
    for (let x = x0; x <= x1; x++)
      if (x >= 0 && z >= 0 && x < COLS && z < ROWS) grid[z][x] = ch
}

// --- the sea and the shore (south edge) ------------------------------------
rect(0, 26, 43, 31, 'w')
rect(0, 24, 43, 25, 'b')
rect(0, 23, 43, 23, 'b')

// --- plaza ------------------------------------------------------------------
rect(16, 9, 27, 16, 'p')
rect(21, 12, 22, 13, 'F')
// steps on each side of the plaza
rect(16, 8, 27, 8, 's')
rect(16, 17, 27, 17, 's')
rect(15, 9, 15, 16, 's')
rect(28, 9, 28, 16, 's')

// --- building blocks --------------------------------------------------------
// north row
rect(2, 1, 8, 4, '#')
rect(11, 1, 17, 4, '#')
rect(20, 1, 26, 4, '#')   // church block
rect(29, 1, 35, 4, '#')
rect(38, 1, 42, 4, '#')
// mid-west
rect(2, 7, 7, 11, '#')
rect(2, 14, 7, 18, '#')
rect(10, 7, 13, 11, '#')
rect(10, 14, 13, 18, '#')
// mid-east
rect(31, 7, 34, 11, '#')
rect(31, 14, 34, 18, '#')
rect(37, 7, 42, 11, '#')
rect(37, 14, 42, 18, '#')
// south row (backs onto the beach walk)
rect(2, 20, 8, 22, '#')
rect(11, 20, 17, 22, '#')
rect(26, 20, 32, 22, '#')
rect(35, 20, 41, 22, '#')

// --- greenery ---------------------------------------------------------------
rect(9, 5, 10, 6, 'g')
rect(18, 5, 19, 6, 'g')
rect(27, 5, 28, 6, 'g')
rect(36, 5, 37, 6, 'g')
rect(8, 12, 9, 13, 'g')
rect(35, 12, 36, 13, 'g')
rect(19, 19, 24, 19, 'g')

// trees
grid[6][10] = 'T'; grid[6][19] = 'T'; grid[6][28] = 'T'; grid[6][37] = 'T'
grid[12][9] = 'T'; grid[12][36] = 'T'
grid[19][20] = 'T'; grid[19][23] = 'T'
// palms along the beach walk
for (const x of [3, 9, 15, 21, 27, 33, 39]) grid[23][x] = 'P'
// rocks in the water
grid[27][5] = 'r'; grid[28][38] = 'r'; grid[26][20] = 'r'

// --- cafe terrace + market row ---------------------------------------------
rect(12, 12, 13, 13, 'c')   // overwrites part of a block edge street — cafe west of plaza
grid[12][12] = 'c'
rect(29, 10, 30, 15, 'm')   // market stalls east of plaza

export const MAP = grid.map(r => r.join(''))

const WALKABLE = new Set(['.', 'p', 'c', 's', 'g', 'b', 'm'])

export function isWalkable(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= COLS || cz >= ROWS) return false
  return WALKABLE.has(grid[cz][cx])
}

export function tileToWorld(cx, cz) {
  return new THREE.Vector3((cx - COLS / 2 + 0.5) * TILE, 0, (cz - ROWS / 2 + 0.5) * TILE)
}

export const PLAZA_H = 0.22
export function groundHeight(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= COLS || cz >= ROWS) return 0
  const ch = grid[cz][cx]
  if (ch === 'p' || ch === 'F' || ch === 'm' || ch === 'c') return PLAZA_H
  if (ch === 's') return PLAZA_H / 2
  if (ch === 'b') return -0.12
  if (ch === 'w') return -0.4
  return 0
}

// ---------------------------------------------------------------------------
// pieces
// ---------------------------------------------------------------------------
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
  // stone lintel above — reads clearly at facade-on angles
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
  if (rng() > 0.55) {
    const rail = rbox(0.95, 0.06, 0.28, PAL.iron, 0.02)
    rail.position.set(0, -0.36, 0.16)
    g.add(rail)
    for (let i = 0; i < 5; i++) {
      const bar = cyl(0.017, 0.017, 0.32, 4, PAL.iron, { rough: 0.5, metal: 0.5 })
      bar.position.set((i - 2) * 0.2, -0.5, 0.16)
      g.add(bar)
    }
  }
  return g
}

function building(w, d, rng, opts = {}) {
  const g = new THREE.Group()
  const floors = opts.floors ?? (1 + Math.floor(rng() * 2))
  // per-building height jitter so block rooflines aren't flat
  const h = 3.0 + floors * 1.6 + (rng() - 0.5) * 0.7
  const plasters = [PAL.plaster, PAL.plasterWarm, PAL.plasterPink, PAL.plasterOchre]
  const basePlaster = opts.colour ?? plasters[Math.floor(rng() * plasters.length)]
  // subtle per-building tint so big walls aren't a single flat colour
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

  // chimneys — visible against the sky at the low camera angle
  const nChim = 1 + (rng() > 0.6 ? 1 : 0)
  for (let i = 0; i < nChim; i++) {
    const ch = chimney(rng)
    ch.position.set((rng() - 0.5) * w * 0.5, h + 0.9 + rng() * 0.3, (rng() - 0.5) * d * 0.4)
    g.add(ch)
  }

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
  g.add(knob)
  const step = doorstep(1.5)
  step.position.set(doorX, 0, front - 0.32)
  g.add(step)

  // a drainpipe down one front corner
  if (rng() > 0.3) {
    const dp = drainpipe(h - 0.4)
    const side = rng() > 0.5 ? 1 : -1
    dp.position.set(side * (w * 0.44), 0, front - 0.06)
    g.add(dp)
  }

  const cols = Math.max(1, Math.floor(w / 2.3))
  for (let f = 0; f < floors; f++) {
    const wy = 2.6 + f * 1.6
    // varied window rhythm: upper floors sometimes shift half a bay
    const shift = f > 0 && rng() > 0.55 ? (w / cols) * 0.5 * (rng() > 0.5 ? 1 : -1) : 0
    for (let i = 0; i < cols; i++) {
      if (rng() < 0.15) continue
      const wx = (i - (cols - 1) / 2) * (w / cols) + shift
      if (Math.abs(wx) > w * 0.42) continue
      if (f === 0 && Math.abs(wx - doorX) < 1.2) continue
      const win = windowUnit(shutterCol, rng() > 0.35, rng)
      win.position.set(wx, wy, front + 0.02)
      g.add(win)
      if (rng() > 0.55) {
        const pot = flowerPot(rng)
        pot.position.set(wx + (rng() - 0.5) * 0.3, wy - 0.5, front - 0.12)
        pot.scale.setScalar(0.75)
        g.add(pot)
      }
    }
    // occasional hanging plant between window bays
    if (rng() > 0.55) {
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
  return g
}

function church(w, d, rng) {
  const g = new THREE.Group()
  const h = 7
  const body = rbox(w * 0.94, h, d * 0.94, PAL.plaster, 0.12)
  body.position.y = h / 2
  g.add(body)
  const rf = hipRoof(w, d, 1.6, PAL.terracottaDeep)
  rf.position.y = h + 0.75
  g.add(rf)
  // bell tower
  const tw = 2.2
  const tower = rbox(tw, h + 4.5, tw, PAL.plasterWarm, 0.1)
  tower.position.set(-w / 2 + tw / 2 + 0.4, (h + 4.5) / 2, 0)
  g.add(tower)
  const belfry = rbox(tw * 0.9, 1.6, tw * 0.9, PAL.plaster, 0.08)
  belfry.position.set(tower.position.x, h + 4.5 + 0.6, 0)
  g.add(belfry)
  const bell = sph(0.3, 0xc9a227, 1)
  bell.position.set(tower.position.x, h + 4.6, 0)
  g.add(bell)
  const spire = new THREE.Mesh(new THREE.ConeGeometry(tw * 0.75, 1.4, 4), mat(PAL.terracotta, { flat: true }))
  spire.position.set(tower.position.x, h + 6.2, 0)
  spire.rotation.y = Math.PI / 4
  spire.castShadow = true
  g.add(spire)
  // arched door
  const front = -d * 0.47
  const arch = rbox(1.8, 3.0, 0.16, PAL.stone, 0.04)
  arch.position.set(1, 1.5, front)
  g.add(arch)
  const door = rbox(1.4, 2.7, 0.12, PAL.woodDark, 0.05)
  door.position.set(1, 1.35, front - 0.05)
  g.add(door)
  // rose window
  const rose = cyl(0.55, 0.55, 0.1, 12, 0x4a6fa8)
  rose.rotation.x = Math.PI / 2
  rose.position.set(1, 4.6, front)
  g.add(rose)
  return g
}

function fountain() {
  const g = new THREE.Group()
  const step = cyl(3.1, 3.3, 0.22, 12, PAL.stoneDark)
  step.position.y = 0.11
  g.add(step)
  const basin = cyl(2.5, 2.6, 0.7, 12, PAL.stone)
  basin.position.y = 0.55
  g.add(basin)
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(2.22, 2.22, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: PAL.water, roughness: 0.12, metalness: 0.25 }),
  )
  water.position.y = 0.86
  water.receiveShadow = true
  g.add(water)
  const col = cyl(0.26, 0.42, 1.5, 8, PAL.stone)
  col.position.y = 1.6
  g.add(col)
  const bowl = cyl(0.95, 0.5, 0.3, 12, PAL.stone)
  bowl.position.y = 2.45
  g.add(bowl)
  const top = sph(0.22, PAL.stone, 1)
  top.position.y = 2.75
  g.add(top)
  return g
}

function cafeTerrace(rng) {
  const g = new THREE.Group()
  for (let i = 0; i < 3; i++) {
    const tx = (i - 1) * 1.7
    const tz = (rng() - 0.5) * 1.2
    const top = cyl(0.44, 0.44, 0.07, 12, 0xf7efe0)
    top.position.set(tx, 0.76, tz)
    g.add(top)
    const leg = cyl(0.05, 0.07, 0.76, 6, PAL.iron, { rough: 0.5, metal: 0.5 })
    leg.position.set(tx, 0.38, tz)
    g.add(leg)
    for (const s of [-1, 1]) {
      const ch = new THREE.Group()
      const seat = rbox(0.42, 0.07, 0.42, PAL.doorOlive, 0.03)
      seat.position.y = 0.44
      ch.add(seat)
      const back = rbox(0.42, 0.44, 0.06, PAL.doorOlive, 0.03)
      back.position.set(0, 0.66, -0.18)
      ch.add(back)
      for (const [lx, lz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) {
        const l = cyl(0.025, 0.025, 0.44, 4, PAL.woodDark)
        l.position.set(lx, 0.22, lz)
        ch.add(l)
      }
      ch.position.set(tx + s * 0.85, 0, tz + (rng() - 0.5) * 0.5)
      ch.rotation.y = s * 1.4 + (rng() - 0.5) * 0.8
      g.add(ch)
    }
    if (rng() > 0.4) {
      const cup = cyl(0.06, 0.05, 0.09, 8, 0xf7efe0)
      cup.position.set(tx + (rng() - 0.5) * 0.4, 0.84, tz + (rng() - 0.5) * 0.4)
      g.add(cup)
    }
  }
  return g
}

// ---------------------------------------------------------------------------
export function buildTown(scene) {
  const rng = seeded(20260823)
  const props = new THREE.Group()
  scene.add(props)

  // --- ground: dirt base --------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(COLS * TILE + 80, ROWS * TILE + 80),
    mat(PAL.dirt, { rough: 1 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.02
  ground.receiveShadow = true
  scene.add(ground)

  // --- sea: one animated-ish plane (gentle emissive shimmer via material) --
  const seaGeo = new THREE.PlaneGeometry(COLS * TILE + 120, 40)
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({
    color: 0x3f7fb8, roughness: 0.18, metalness: 0.3,
  }))
  sea.rotation.x = -Math.PI / 2
  const seaZ = tileToWorld(0, 28.5).z
  sea.position.set(0, -0.35, seaZ + 12)
  sea.receiveShadow = true
  scene.add(sea)
  // foam line where sea meets sand
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(COLS * TILE + 120, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xf2ede0, transparent: true, opacity: 0.75 }),
  )
  foam.rotation.x = -Math.PI / 2
  foam.position.set(0, -0.28, tileToWorld(0, 25.9).z)
  scene.add(foam)

  // --- horizon: hazy headland + hills beyond the sea -----------------------
  // the low camera sees past the water; give it silhouettes instead of void
  const hazeCols = [0x8fa8b8, 0x9db2bd, 0x7e9aab]
  const hillMat = i => new THREE.MeshBasicMaterial({ color: hazeCols[i % hazeCols.length], fog: true })
  const farZ = seaZ + 34
  for (let i = 0; i < 6; i++) {
    const hw = 26 + rng() * 30
    const hh = 4.5 + rng() * 5
    const hill = new THREE.Mesh(new THREE.ConeGeometry(hw * 0.5, hh, 7), hillMat(i))
    hill.scale.y = 0.6 + rng() * 0.3
    hill.position.set((i - 2.5) * 22 + (rng() - 0.5) * 10, -0.4, farZ + 4 + rng() * 10)
    hill.castShadow = false
    hill.receiveShadow = false
    scene.add(hill)
  }
  // a long low headland reaching in from the east
  const headland = new THREE.Mesh(new THREE.ConeGeometry(20, 3.2, 6), hillMat(2))
  headland.scale.set(2.6, 0.7, 0.6)
  headland.position.set(52, -0.4, seaZ + 20)
  headland.castShadow = false
  scene.add(headland)

  // --- tiles ---------------------------------------------------------------
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      const ch = grid[z][x]
      const p = tileToWorld(x, z)

      if (ch === 'p' || ch === 'F' || ch === 'm' || ch === 'c') {
        for (let sx = 0; sx < 2; sx++) for (let sz = 0; sz < 2; sz++) {
          const cols = [PAL.paving, PAL.pavingAlt, PAL.pavingWarm]
          const stone = rbox(TILE / 2 - 0.06, 0.2, TILE / 2 - 0.06,
            cols[Math.floor(rng() * cols.length)], 0.03)
          stone.position.set(
            p.x + (sx - 0.5) * TILE / 2 + (rng() - 0.5) * 0.04,
            PLAZA_H - 0.1 + (rng() - 0.5) * 0.02,
            p.z + (sz - 0.5) * TILE / 2 + (rng() - 0.5) * 0.04,
          )
          stone.rotation.y = (rng() - 0.5) * 0.05
          stone.castShadow = false
          props.add(stone)
        }
        if (rng() > 0.9) {
          const t = grassTuft(rng)
          t.position.set(p.x + (rng() - 0.5) * 1.4, PLAZA_H, p.z + (rng() - 0.5) * 1.4)
          props.add(t)
        }
      }

      if (ch === 's') {
        const st = rbox(TILE, PLAZA_H, TILE, PAL.stoneDark, 0.04)
        st.position.set(p.x, PLAZA_H / 2 - 0.06, p.z)
        props.add(st)
      }

      if (ch === 'g') {
        const gr = rbox(TILE, 0.12, TILE, 0x8fae5f, 0.05)
        gr.position.set(p.x, 0.02, p.z)
        gr.castShadow = false
        props.add(gr)
        for (let i = 0; i < 3; i++) {
          const t = grassTuft(rng)
          t.position.set(p.x + (rng() - 0.5) * 1.5, 0.08, p.z + (rng() - 0.5) * 1.5)
          props.add(t)
        }
        if (rng() > 0.7) {
          const fl = sph(0.05, [0xd94f3d, 0xe8c56a, 0xdb6f8f][Math.floor(rng() * 3)], 0)
          fl.position.set(p.x + (rng() - 0.5), 0.14, p.z + (rng() - 0.5))
          props.add(fl)
        }
      }

      if (ch === 'b') {
        const sand = rbox(TILE, 0.14, TILE, 0xe8d9ae, 0.04)
        sand.position.set(p.x, -0.12, p.z)
        sand.castShadow = false
        props.add(sand)
        if (rng() > 0.88) {
          const sh = sph(0.05, 0xf2ede0, 0)
          sh.position.set(p.x + (rng() - 0.5) * 1.5, -0.02, p.z + (rng() - 0.5) * 1.5)
          sh.castShadow = false
          props.add(sh)
        }
      }

      if (ch === '.') {
        if (rng() > 0.85) {
          const peb = sph(0.05 + rng() * 0.06, PAL.stoneDark, 0)
          peb.position.set(p.x + (rng() - 0.5) * 1.6, 0.02, p.z + (rng() - 0.5) * 1.6)
          peb.castShadow = false
          props.add(peb)
        }
        if (rng() > 0.92) {
          const t = grassTuft(rng)
          t.position.set(p.x + (rng() - 0.5) * 1.6, 0, p.z + (rng() - 0.5) * 1.6)
          props.add(t)
        }
      }

      if (ch === 'T') {
        const t = oliveTree(rng, 0.9 + rng() * 0.4)
        t.position.set(p.x, 0, p.z)
        t.rotation.y = rng() * Math.PI * 2
        props.add(t)
        const ring = cyl(0.85, 0.9, 0.3, 10, PAL.stoneDark)
        ring.position.set(p.x, 0.15, p.z)
        props.add(ring)
      }

      if (ch === 'P') {
        const t = palmTree(rng)
        t.position.set(p.x, -0.1, p.z)
        t.rotation.y = rng() * Math.PI * 2
        props.add(t)
      }

      if (ch === 'r') {
        const rk = rock(rng)
        rk.position.set(p.x, -0.35, p.z)
        props.add(rk)
      }
    }
  }

  // --- fountain ------------------------------------------------------------
  const f = fountain()
  const fp = tileToWorld(21.5, 12.5)
  f.position.set(fp.x, PLAZA_H, fp.z)
  scene.add(f)
  const jet = fountainJet()
  jet.position.set(fp.x, PLAZA_H + 2.6, fp.z)
  scene.add(jet)

  // --- buildings -----------------------------------------------------------
  const used = grid.map(r => r.map(() => false))
  const shops = [
    { at: [14, 4], colour: PAL.doorRed, sign: 'roti ghar' },     // bakery (north of plaza, west)
    { at: [12, 14], colour: PAL.doorTeal, sign: 'chai adda' },   // café west
    { at: [32, 9], colour: 0xe8c56a, sign: 'phal wala' },        // fruit shop east
  ]
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

      const isChurch = x === 20 && z === 1
      const isShop = shops.find(s => s.at[0] >= x && s.at[0] < x + w && s.at[1] >= z && s.at[1] < z + d)
      const b = isChurch
        ? church(w * TILE, d * TILE, rng)
        : building(w * TILE, d * TILE, rng, { shop: !!isShop, awningColour: isShop?.colour, signText: isShop?.sign })
      const c0 = tileToWorld(x + w / 2 - 0.5, z + d / 2 - 0.5)
      b.position.set(c0.x, 0, c0.z)
      if (z + d / 2 > 19) b.rotation.y = Math.PI          // south row faces north
      else if (x + w / 2 < 9) b.rotation.y = -Math.PI / 2 // west blocks face east
      else if (x + w / 2 > 35) b.rotation.y = Math.PI / 2 // east blocks face west
      scene.add(b)
    }
  }

  // --- cafe terrace --------------------------------------------------------
  const cafe = cafeTerrace(rng)
  const cp = tileToWorld(12.5, 12.5)
  cafe.position.set(cp.x, PLAZA_H, cp.z)
  scene.add(cafe)
  for (const [ux, uz, uc] of [[-1.7, 0.4, 0xe8c56a], [1.6, -0.5, 0xd9694a]]) {
    const um = cafeUmbrella(rng, uc)
    um.position.set(cp.x + ux, PLAZA_H, cp.z + uz)
    scene.add(um)
  }

  // --- market stalls (frutería row, east of plaza) -------------------------
  const stallCols = [0xe8c56a, 0xd94f3d, 0x4a8fc9]
  for (let i = 0; i < 3; i++) {
    const st = marketStall(rng, stallCols[i])
    const sp = tileToWorld(29.5, 10.5 + i * 2)
    st.position.set(sp.x, PLAZA_H, sp.z)
    st.rotation.y = -Math.PI / 2
    scene.add(st)
  }
  const cr = crate(rng)
  const crp = tileToWorld(29, 15.5)
  cr.position.set(crp.x, PLAZA_H, crp.z)
  scene.add(cr)
  const bl = barrel(rng)
  const blp = tileToWorld(30, 9.4)
  bl.position.set(blp.x, PLAZA_H, blp.z)
  scene.add(bl)

  // --- street furniture ----------------------------------------------------
  for (const [bx, bz, ry] of [[18, 10, 0], [25, 15, Math.PI], [17, 15, Math.PI], [26, 10, 0]]) {
    const b = bench()
    const bp = tileToWorld(bx, bz)
    b.position.set(bp.x, PLAZA_H, bp.z)
    b.rotation.y = ry
    scene.add(b)
  }
  // beach benches facing the sea
  for (const bx of [7, 19, 31]) {
    const b = bench()
    const bp = tileToWorld(bx, 22.5)
    b.position.set(bp.x, 0, bp.z)
    scene.add(b)
  }

  for (const [lx, lz] of [[16, 9], [27, 9], [16, 16], [27, 16], [10, 19], [33, 19], [21, 22], [2, 19], [41, 19]]) {
    const l = lamp()
    const lp = tileToWorld(lx, lz)
    l.position.set(lp.x, groundHeight(lx, lz), lp.z)
    l.rotation.y = rng() * Math.PI * 2
    scene.add(l)
  }

  // crates and barrels tucked against facades — street-level clutter
  for (const [sx, sz, kind] of [
    [9.5, 3, 'c'], [18.5, 2.5, 'b'], [27.5, 3.5, 'c'], [36.5, 2.5, 'b'],
    [8.5, 8, 'b'], [14.5, 16, 'c'], [30.5, 17, 'b'], [36, 15, 'c'],
    [9.5, 21, 'c'], [24.5, 20.5, 'b'], [33.5, 21, 'c'],
  ]) {
    const pr = kind === 'c' ? crate(rng) : barrel(rng)
    const pp = tileToWorld(sx, sz)
    pr.position.set(pp.x, groundHeight(Math.round(sx), Math.round(sz)), pp.z)
    pr.rotation.y = rng() * Math.PI * 2
    scene.add(pr)
  }

  // pots scattered near walls
  for (let i = 0; i < 26; i++) {
    const pot = flowerPot(rng)
    const spots = [[14.5, 6], [20, 6], [26, 6], [33, 6], [9, 9], [9, 16], [35, 9], [35, 16], [14, 19], [25, 19]]
    const [sx, sz] = spots[Math.floor(rng() * spots.length)]
    const pp = tileToWorld(sx + (rng() - 0.5) * 2, sz + (rng() - 0.5))
    pot.position.set(pp.x, groundHeight(Math.round(sx), Math.round(sz)), pp.z)
    scene.add(pot)
  }

  // --- boats on the water --------------------------------------------------
  for (const [bx, hue] of [[12, 0x4a8fc9], [26, 0xd94f3d], [36, 0x6f9a4a]]) {
    const bt = boat(rng, hue)
    const bp = tileToWorld(bx, 27.5)
    bt.position.set(bp.x, -0.3, bp.z)
    bt.rotation.y = rng() * 0.6 - 0.3
    scene.add(bt)
  }

  // --- bunting + laundry ---------------------------------------------------
  scene.add(bunting(tileToWorld(16, 9), tileToWorld(27, 9), 4.8, rng))
  scene.add(bunting(tileToWorld(16, 16), tileToWorld(27, 16), 4.8, rng))
  scene.add(bunting(tileToWorld(10, 5.5), tileToWorld(17, 5.5), 4.4, rng))

  const lf = tileToWorld(30, 19), lt = tileToWorld(35, 19)
  const pts = [
    new THREE.Vector3(lf.x, 5.2, lf.z),
    new THREE.Vector3((lf.x + lt.x) / 2, 4.7, lf.z),
    new THREE.Vector3(lt.x, 5.2, lt.z),
  ]
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x8a7a63 }),
  ))
  const clothCols = [0xd9694a, 0xf7efe0, 0x5b7fb8, 0xe8c56a, 0xf0dcc8]
  for (let i = 0; i < 5; i++) {
    const t = 0.15 + i * 0.175
    const cloth = rbox(0.55, 0.8, 0.05, clothCols[i], 0.02)
    cloth.position.set(lf.x + (lt.x - lf.x) * t, 4.35 - Math.sin(t * Math.PI) * 0.2, lf.z)
    cloth.rotation.z = (rng() - 0.5) * 0.15
    scene.add(cloth)
  }

  return { sea }
}
