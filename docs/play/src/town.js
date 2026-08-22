import * as THREE from 'three'

// ---------------------------------------------------------------------------
// La Plaza — the logical map. The world renders in 3D but THINKS in tiles.
//   #  building footprint (blocked)   .  street / dirt (walkable)
//   p  plaza paving (walkable)        F  fountain (blocked)
//   T  olive tree (blocked)           c  cafe terrace (walkable, chairs)
// ---------------------------------------------------------------------------
export const MAP = [
  '######..######..####',
  '######..######..####',
  '##..............####',
  '##...ppppppppp...T..',
  '....ppppppppppp.....',
  '##..ppppFFppppp..###',
  '##..ppppFFppppp..###',
  '##..ppppppppppp..###',
  '....pppppppppppcc###',
  '##...ppppppppp.cc###',
  '##.T.............###',
  '##....##..#####..###',
  '######..............',
  '######..#####..#####',
]

export const TILE = 2 // world units per tile
export const COLS = MAP[0].length
export const ROWS = MAP.length

export function isWalkable(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= COLS || cz >= ROWS) return false
  const ch = MAP[cz][cx]
  return ch === '.' || ch === 'p' || ch === 'c'
}

export function tileToWorld(cx, cz) {
  return new THREE.Vector3(
    (cx - COLS / 2 + 0.5) * TILE,
    0,
    (cz - ROWS / 2 + 0.5) * TILE,
  )
}

// --- palette: lime-wash, terracotta, olive, dust, deep blue shade ----------
export const PAL = {
  plaster: 0xf7efdf,
  plasterWarm: 0xf2e3c8,
  terracotta: 0xc96f4a,
  terracottaDeep: 0xb05c3b,
  door: 0x2450a4,
  doorOlive: 0x6a7b3f,
  paving: 0xe3d3b4,
  pavingLight: 0xecdfc4,
  dirt: 0xd6c19a,
  olive: 0x8a9a5b,
  oliveDark: 0x6f7f49,
  trunk: 0x8a6f4d,
  water: 0x4d7fc4,
  stone: 0xded2bb,
  awning: 0xc0392b,
  awningWhite: 0xf5efe2,
}

function mat(color) {
  return new THREE.MeshLambertMaterial({ color })
}

function box(w, h, d, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color))
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// Pyramid hip roof: 4-sided cone rotated 45 degrees
function roof(w, d, h, color) {
  const r = Math.sqrt(w * w + d * d) / 2
  const g = new THREE.ConeGeometry(r, h, 4)
  const m = new THREE.Mesh(g, mat(color))
  m.rotation.y = Math.PI / 4
  m.scale.set(w / (r * Math.SQRT2) * 1.08, 1, d / (r * Math.SQRT2) * 1.08)
  m.castShadow = true
  return m
}

function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function building(w, d, rng) {
  const g = new THREE.Group()
  const floors = 1 + Math.floor(rng() * 2)
  const h = 2.6 + floors * 1.5 + rng() * 0.8
  const plaster = rng() > 0.4 ? PAL.plaster : PAL.plasterWarm
  const body = box(w * 0.96, h, d * 0.96, plaster)
  body.position.y = h / 2
  g.add(body)
  const r = roof(w * 1.06, d * 1.06, 1.1 + rng() * 0.7, rng() > 0.3 ? PAL.terracotta : PAL.terracottaDeep)
  r.position.y = h + 0.55
  g.add(r)
  // door (street side, -z face)
  const door = box(0.9, 1.7, 0.1, rng() > 0.5 ? PAL.door : PAL.doorOlive)
  door.position.set((rng() - 0.5) * (w - 2), 0.85, -d * 0.48)
  g.add(door)
  // windows: dark recesses with white sills
  const winRows = floors
  for (let f = 0; f < winRows; f++) {
    const wy = 2.2 + f * 1.6
    const n = Math.max(1, Math.floor(w / 2.4))
    for (let i = 0; i < n; i++) {
      if (rng() < 0.25) continue
      const wx = (i - (n - 1) / 2) * 2.2
      const win = box(0.7, 0.95, 0.08, 0x3a3a44)
      win.position.set(wx, wy, -d * 0.485)
      g.add(win)
      const sill = box(0.85, 0.08, 0.14, 0xffffff)
      sill.position.set(wx, wy - 0.5, -d * 0.485)
      g.add(sill)
    }
  }
  return g
}

function oliveTree(rng) {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.4, 6), mat(PAL.trunk))
  trunk.position.y = 0.7
  trunk.castShadow = true
  g.add(trunk)
  for (let i = 0; i < 3; i++) {
    const s = 0.7 + rng() * 0.5
    const blob = new THREE.Mesh(
      new THREE.IcosahedronGeometry(s, 0),
      mat(rng() > 0.5 ? PAL.olive : PAL.oliveDark),
    )
    blob.position.set((rng() - 0.5) * 1.1, 1.6 + rng() * 0.7, (rng() - 0.5) * 1.1)
    blob.castShadow = true
    g.add(blob)
  }
  return g
}

function fountain() {
  const g = new THREE.Group()
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.8, 8), mat(PAL.stone))
  basin.position.y = 0.4
  basin.castShadow = true
  basin.receiveShadow = true
  g.add(basin)
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.1, 8), mat(PAL.water))
  water.position.y = 0.78
  g.add(water)
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 1.5, 6), mat(PAL.stone))
  column.position.y = 1.5
  column.castShadow = true
  g.add(column)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 0.35, 8), mat(PAL.stone))
  bowl.position.y = 2.3
  bowl.castShadow = true
  g.add(bowl)
  return g
}

function cafeTerrace(rng) {
  const g = new THREE.Group()
  for (let i = 0; i < 2; i++) {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 8), mat(0xffffff))
    table.position.set(i * 1.6 - 0.6, 0.75, (rng() - 0.5))
    table.castShadow = true
    g.add(table)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 5), mat(0x555555))
    leg.position.set(table.position.x, 0.37, table.position.z)
    g.add(leg)
    for (let c = 0; c < 2; c++) {
      const chair = box(0.4, 0.45, 0.4, PAL.doorOlive)
      chair.position.set(table.position.x + (c ? 0.8 : -0.8), 0.22, table.position.z + (rng() - 0.5) * 0.6)
      g.add(chair)
    }
  }
  return g
}

export function buildTown(scene) {
  const rng = seeded(20260821)

  // ground plane (dirt, extends past map)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(COLS * TILE + 40, ROWS * TILE + 40),
    mat(PAL.dirt),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.02
  ground.receiveShadow = true
  scene.add(ground)

  // plaza paving: slightly raised tiles, checker of two warm tones
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      const ch = MAP[z][x]
      const p = tileToWorld(x, z)
      if (ch === 'p' || ch === 'c' || ch === 'F') {
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(TILE * 0.98, 0.08, TILE * 0.98),
          mat((x + z) % 2 ? PAL.paving : PAL.pavingLight),
        )
        tile.position.set(p.x, 0.04, p.z)
        tile.receiveShadow = true
        scene.add(tile)
      }
      if (ch === 'T') {
        const t = oliveTree(rng)
        t.position.set(p.x, 0, p.z)
        scene.add(t)
      }
    }
  }

  // fountain at center of the 2x2 F block
  const f = fountain()
  const fPos = tileToWorld(8.5, 5.5)
  f.position.set(fPos.x, 0.08, fPos.z)
  scene.add(f)

  // cafe terrace
  const cafe = cafeTerrace(rng)
  const cPos = tileToWorld(15.5, 8.5)
  cafe.position.set(cPos.x, 0.08, cPos.z)
  scene.add(cafe)

  // buildings: greedily merge rectangular runs of '#' into blocks
  const used = MAP.map(row => row.split('').map(() => false))
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      if (MAP[z][x] !== '#' || used[z][x]) continue
      let w = 0
      while (x + w < COLS && MAP[z][x + w] === '#' && !used[z][x + w]) w++
      let d = 1
      outer: while (z + d < ROWS) {
        for (let i = 0; i < w; i++) {
          if (MAP[z + d][x + i] !== '#' || used[z + d][x + i]) break outer
        }
        d++
      }
      for (let dz = 0; dz < d; dz++)
        for (let i = 0; i < w; i++) used[z + dz][x + i] = true

      const b = building(w * TILE, d * TILE, rng)
      const c0 = tileToWorld(x + w / 2 - 0.5, z + d / 2 - 0.5)
      b.position.set(c0.x, 0, c0.z)
      // crude street-facing: buildings in the lower half face the plaza (north)
      if (z + d / 2 > ROWS / 2) b.rotation.y = Math.PI
      scene.add(b)
    }
  }

  // laundry line strung high across the north street
  const lineFrom = tileToWorld(3, 2)
  const lineTo = tileToWorld(8, 2)
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(lineFrom.x, 5.2, lineFrom.z),
    new THREE.Vector3((lineFrom.x + lineTo.x) / 2, 4.8, lineFrom.z),
    new THREE.Vector3(lineTo.x, 5.2, lineTo.z),
  ])
  scene.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x777777 })))
  const clothColors = [0xd9694a, 0xf0e8d8, 0x5b7fb8, 0xe8c56a]
  for (let i = 0; i < 4; i++) {
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.8),
      new THREE.MeshLambertMaterial({ color: clothColors[i], side: THREE.DoubleSide }),
    )
    const t = 0.2 + i * 0.2
    cloth.position.set(lineFrom.x + (lineTo.x - lineFrom.x) * t, 4.6, lineFrom.z)
    cloth.castShadow = true
    scene.add(cloth)
  }
}
