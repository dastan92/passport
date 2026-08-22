import * as THREE from 'three'
import {
  PAL, mat, rbox, cyl, sph, seeded,
  flowerPot, oliveTree, grassTuft, crate, barrel, bench, lamp,
  marketStall, awning, bunting,
} from './kit.js'

// ---------------------------------------------------------------------------
// La Plaza — logical map. The world renders in 3D but THINKS in tiles.
//   #  building   .  street   p  plaza paving   F  fountain
//   T  tree       c  cafe terrace   m  market stall   s  step/edge
// ---------------------------------------------------------------------------
export const MAP = [
  '####..######..######',
  '####..######..######',
  '##................##',
  '##.T..pppppppp..T.##',
  '....spppppppppps....',
  '##..pppppFFpppppp.##',
  '##..pppppFFpppppp.##',
  '##..pppppppppppppmm#',
  '....pppppppppppppmm#',
  '##..sppppppppppps..#',
  '##.cc..pppppppp..T.##',
  '##.cc.............##',
  '####..######..######',
  '####..######..######',
]

export const TILE = 2
export const COLS = MAP[0].length
export const ROWS = MAP.length

const WALKABLE = new Set(['.', 'p', 'c', 's'])

export function isWalkable(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= COLS || cz >= ROWS) return false
  return WALKABLE.has(MAP[cz][cx])
}

export function tileToWorld(cx, cz) {
  return new THREE.Vector3(
    (cx - COLS / 2 + 0.5) * TILE,
    0,
    (cz - ROWS / 2 + 0.5) * TILE,
  )
}

// plaza sits one step above the street — elevation reads as craft
export const PLAZA_H = 0.22
export function groundHeight(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= COLS || cz >= ROWS) return 0
  const ch = MAP[cz][cx]
  if (ch === 'p' || ch === 'F') return PLAZA_H
  if (ch === 's') return PLAZA_H / 2
  return 0
}

// ---------------------------------------------------------------------------
// buildings
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
  // eaves: a thin slab under the roof so it overhangs the wall
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
  if (shuttered) {
    for (const s of [-1, 1]) {
      const sh = rbox(0.34, 1.0, 0.06, colour, 0.02)
      sh.position.set(s * 0.53, 0, 0.06)
      sh.rotation.y = s * -0.5
      g.add(sh)
    }
  }
  // wrought-iron balcony rail on some
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
  const h = 3.0 + floors * 1.6
  const plasters = [PAL.plaster, PAL.plasterWarm, PAL.plasterPink, PAL.plasterOchre]
  const plaster = opts.colour ?? plasters[Math.floor(rng() * plasters.length)]

  const body = rbox(w * 0.97, h, d * 0.97, plaster, 0.12)
  body.position.y = h / 2
  g.add(body)

  // a stone base course — grounds the building
  const base = rbox(w * 0.99, 0.4, d * 0.99, PAL.stoneDark, 0.05)
  base.position.y = 0.2
  g.add(base)

  const rf = hipRoof(w * 1.04, d * 1.04, 1.3 + rng() * 0.5, rng() > 0.35 ? PAL.terracotta : (rng() > 0.5 ? PAL.terracottaDeep : PAL.terracottaLight))
  rf.position.y = h + 0.62
  g.add(rf)

  const shutterCols = [PAL.door, PAL.doorTeal, PAL.doorOlive, PAL.doorRed]
  const shutterCol = shutterCols[Math.floor(rng() * shutterCols.length)]
  const front = -d * 0.485

  // door
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

  // windows across the facade
  const cols = Math.max(1, Math.floor(w / 2.3))
  for (let f = 0; f < floors; f++) {
    const wy = 2.6 + f * 1.6
    for (let i = 0; i < cols; i++) {
      if (rng() < 0.15) continue
      const wx = (i - (cols - 1) / 2) * (w / cols)
      if (f === 0 && Math.abs(wx - doorX) < 1.2) continue
      const win = windowUnit(shutterCol, rng() > 0.35, rng)
      win.position.set(wx, wy, front + 0.02)
      g.add(win)
      if (rng() > 0.5) {
        const pot = flowerPot(rng)
        pot.position.set(wx + (rng() - 0.5) * 0.3, wy - 0.5, front - 0.12)
        pot.scale.setScalar(0.75)
        g.add(pot)
      }
    }
  }

  // shop: awning + sign
  if (opts.shop) {
    const aw = awning(Math.min(w * 0.7, 3.2), opts.awningColour ?? PAL.doorRed)
    aw.position.set(doorX, 2.75, front - 0.42)
    g.add(aw)
    const sign = rbox(1.7, 0.42, 0.08, PAL.woodDark, 0.03)
    sign.position.set(doorX, 3.45, front - 0.08)
    g.add(sign)
  }
  return g
}

// ---------------------------------------------------------------------------
// fountain
// ---------------------------------------------------------------------------
function fountain() {
  const g = new THREE.Group()
  const step = cyl(3.1, 3.3, 0.22, 12, PAL.stoneDark)
  step.position.y = 0.11
  g.add(step)
  const basin = cyl(2.5, 2.6, 0.7, 12, PAL.stone)
  basin.position.y = 0.55
  g.add(basin)
  const inner = cyl(2.25, 2.25, 0.6, 12, PAL.stoneDark)
  inner.position.y = 0.62
  g.add(inner)
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
    const foot = cyl(0.22, 0.24, 0.04, 8, PAL.iron, { rough: 0.5, metal: 0.5 })
    foot.position.set(tx, 0.02, tz)
    g.add(foot)
    // two cane chairs, slightly askew — nobody pushes chairs in
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
    // a cup left on the table
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
  const rng = seeded(20260822)
  const props = new THREE.Group()
  scene.add(props)

  // --- ground ---------------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(COLS * TILE + 60, ROWS * TILE + 60),
    mat(PAL.dirt, { rough: 1 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.02
  ground.receiveShadow = true
  scene.add(ground)

  // --- paving ---------------------------------------------------------------
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      const ch = MAP[z][x]
      const p = tileToWorld(x, z)

      if (ch === 'p' || ch === 'F' || ch === 'm') {
        // 2x2 cobbles per tile, each nudged — hand-laid, not tiled
        for (let sx = 0; sx < 2; sx++) {
          for (let sz = 0; sz < 2; sz++) {
            const cols = [PAL.paving, PAL.pavingAlt, PAL.pavingWarm]
            const stone = rbox(
              TILE / 2 - 0.06, 0.2, TILE / 2 - 0.06,
              cols[Math.floor(rng() * cols.length)], 0.03,
            )
            stone.position.set(
              p.x + (sx - 0.5) * TILE / 2 + (rng() - 0.5) * 0.04,
              PLAZA_H - 0.1 + (rng() - 0.5) * 0.02,
              p.z + (sz - 0.5) * TILE / 2 + (rng() - 0.5) * 0.04,
            )
            stone.rotation.y = (rng() - 0.5) * 0.05
            stone.castShadow = false
            props.add(stone)
          }
        }
        // grass creeping between stones
        if (rng() > 0.88) {
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

      if (ch === '.') {
        // dirt street with scattered pebbles
        if (rng() > 0.8) {
          const peb = sph(0.05 + rng() * 0.06, PAL.stoneDark, 0)
          peb.position.set(p.x + (rng() - 0.5) * 1.6, 0.02, p.z + (rng() - 0.5) * 1.6)
          peb.castShadow = false
          props.add(peb)
        }
        if (rng() > 0.9) {
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
        // planter ring
        const ring = cyl(0.85, 0.9, 0.3, 10, PAL.stoneDark)
        ring.position.set(p.x, 0.15, p.z)
        props.add(ring)
      }
    }
  }

  // --- fountain -------------------------------------------------------------
  const f = fountain()
  const fp = tileToWorld(9.5, 5.5)
  f.position.set(fp.x, PLAZA_H, fp.z)
  scene.add(f)

  // --- buildings ------------------------------------------------------------
  const used = MAP.map(r => r.split('').map(() => false))
  const shops = [
    { tile: [4, 12], name: 'panadería', colour: PAL.doorRed },
    { tile: [14, 1], name: 'café', colour: PAL.doorTeal },
  ]
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      if (MAP[z][x] !== '#' || used[z][x]) continue
      let w = 0
      while (x + w < COLS && MAP[z][x + w] === '#' && !used[z][x + w]) w++
      let d = 1
      outer: while (z + d < ROWS) {
        for (let i = 0; i < w; i++) if (MAP[z + d][x + i] !== '#' || used[z + d][x + i]) break outer
        d++
      }
      for (let dz = 0; dz < d; dz++) for (let i = 0; i < w; i++) used[z + dz][x + i] = true

      const isShop = shops.find(s => s.tile[0] >= x && s.tile[0] < x + w && s.tile[1] >= z && s.tile[1] < z + d)
      const b = building(w * TILE, d * TILE, rng, {
        shop: !!isShop,
        awningColour: isShop?.colour,
      })
      const c0 = tileToWorld(x + w / 2 - 0.5, z + d / 2 - 0.5)
      b.position.set(c0.x, 0, c0.z)
      if (z + d / 2 > ROWS / 2) b.rotation.y = Math.PI
      scene.add(b)
    }
  }

  // --- café terrace ---------------------------------------------------------
  const cafe = cafeTerrace(rng)
  const cp = tileToWorld(3.5, 10.5)
  cafe.position.set(cp.x, 0, cp.z)
  scene.add(cafe)

  // --- market stalls --------------------------------------------------------
  const stallCols = [0xd94f3d, 0x4a8fc9]
  for (let i = 0; i < 2; i++) {
    const st = marketStall(rng, stallCols[i])
    const sp = tileToWorld(17.5, 7 + i * 1.6)
    st.position.set(sp.x, PLAZA_H, sp.z)
    st.rotation.y = -Math.PI / 2
    scene.add(st)
    const cr = crate(rng)
    cr.position.set(sp.x - 1.2, PLAZA_H, sp.z + 0.6)
    scene.add(cr)
  }
  const bl = barrel(rng)
  const blp = tileToWorld(17, 9)
  bl.position.set(blp.x, PLAZA_H, blp.z)
  scene.add(bl)

  // --- street furniture -----------------------------------------------------
  const benchSpots = [[6, 4], [13, 9], [6, 9]]
  for (const [bx, bz] of benchSpots) {
    const b = bench()
    const bp = tileToWorld(bx, bz)
    b.position.set(bp.x, PLAZA_H, bp.z)
    b.rotation.y = Math.atan2(bp.x, bp.z) + Math.PI
    scene.add(b)
  }

  const lampSpots = [[5, 4], [14, 4], [5, 9], [14, 9]]
  for (const [lx, lz] of lampSpots) {
    const l = lamp()
    const lp = tileToWorld(lx, lz)
    l.position.set(lp.x, PLAZA_H, lp.z)
    l.rotation.y = Math.atan2(-lp.x, -lp.z)
    scene.add(l)
  }

  // pots along the plaza edge
  for (let i = 0; i < 14; i++) {
    const pot = flowerPot(rng)
    const edge = rng() > 0.5
    const px = edge ? (rng() > 0.5 ? -9 : 9) : (rng() - 0.5) * 18
    const pz = edge ? (rng() - 0.5) * 10 : (rng() > 0.5 ? -6.5 : 6.5)
    pot.position.set(px, PLAZA_H, pz)
    scene.add(pot)
  }

  // --- bunting across the plaza --------------------------------------------
  scene.add(bunting(tileToWorld(4, 3), tileToWorld(15, 3), 4.6, rng))
  scene.add(bunting(tileToWorld(4, 11), tileToWorld(15, 11), 4.6, rng))

  // --- laundry over the north street ---------------------------------------
  const lf = tileToWorld(4, 2), lt = tileToWorld(9, 2)
  const pts = [
    new THREE.Vector3(lf.x, 5.4, lf.z),
    new THREE.Vector3((lf.x + lt.x) / 2, 4.9, lf.z),
    new THREE.Vector3(lt.x, 5.4, lt.z),
  ]
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x8a7a63 }),
  ))
  const clothCols = [0xd9694a, 0xf7efe0, 0x5b7fb8, 0xe8c56a, 0xf0dcc8]
  for (let i = 0; i < 5; i++) {
    const t = 0.15 + i * 0.175
    const cloth = rbox(0.55, 0.8, 0.05, clothCols[i], 0.02)
    cloth.position.set(lf.x + (lt.x - lf.x) * t, 4.55 - Math.sin(t * Math.PI) * 0.2, lf.z)
    cloth.rotation.z = (rng() - 0.5) * 0.15
    scene.add(cloth)
  }
}
