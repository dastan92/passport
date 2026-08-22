// ---------------------------------------------------------------------------
// worldspec.js — the single source of truth for Pueblo's shape.
//
// The map, the cast and the mission chain are built by separate passes that
// must agree exactly, so every tile coordinate and every id lives HERE and is
// imported by town.js, people.js, missions.js and knowledge.js. Nothing else
// may hardcode a resident tile or a district bound.
//
// Grid is 84 x 60 tiles at TILE = 2 world units (168 x 120 units, ~4.3x the
// old 44 x 32). Origin is the top-left of the grid; +x east, +z south.
// ---------------------------------------------------------------------------

export const COLS = 84
export const ROWS = 60
export const TILE = 2

// --- districts --------------------------------------------------------------
// Rect bounds are inclusive tile coords [x0, z0, x1, z1].
export const DISTRICTS = {
  plaza:   { name: 'La Plaza',      rect: [30, 22, 53, 39], blurb: 'the heart: fountain, cafe terrace, benches' },
  mercado: { name: 'El Mercado',    rect: [56, 20, 79, 40], blurb: 'covered market row, stalls, crates' },
  barrio:  { name: 'El Barrio',     rect: [26, 2, 57, 19],  blurb: 'tight residential lanes, balconies, laundry' },
  iglesia: { name: 'La Iglesia',    rect: [4, 4, 23, 20],   blurb: 'church square, bell tower, olive trees' },
  puerto:  { name: 'El Puerto',     rect: [24, 42, 62, 56], blurb: 'harbour wall, fishing boats, nets, the sea beyond' },
  afueras: { name: 'Las Afueras',   rect: [4, 24, 25, 40],  blurb: 'edge of town: olive grove, a farm, the road out' },
}

// The sea fills everything south of this row; the beach is the two rows above.
export const SEA_Z = 57
export const BEACH_Z = 55

// --- the cast ---------------------------------------------------------------
// tile is where they stand. Every one of these MUST be a walkable tile that is
// reachable from spawn; town.js is responsible for guaranteeing that.
export const CAST = [
  // --- returning ---
  { id: 'coach',  name: 'Marco',        tile: [41, 30], district: 'plaza'   },
  { id: 'pilar',  name: 'Pilar',        tile: [61, 27], district: 'mercado' },
  { id: 'rosa',   name: 'Rosa',         tile: [37, 20], district: 'barrio'  },
  { id: 'tomas',  name: 'Tomás',        tile: [44, 47], district: 'puerto'  },
  { id: 'carmen', name: 'Doña Carmen',  tile: [31, 12], district: 'barrio'  },
  { id: 'miguel', name: 'Miguel',       tile: [34, 33], district: 'plaza'   },
  { id: 'lucia',  name: 'Lucía',        tile: [46, 34], district: 'plaza'   },
  { id: 'padre',  name: 'Padre Antonio',tile: [14, 12], district: 'iglesia' },
  // --- new ---
  { id: 'nadia',  name: 'Nadia',        tile: [52, 21], district: 'plaza'   },
  { id: 'rafa',   name: 'Rafa',         tile: [30, 44], district: 'puerto'  },
  { id: 'elena',  name: 'Elena',        tile: [20, 17], district: 'iglesia' },
  { id: 'hassan', name: 'Hassan',       tile: [55, 49], district: 'puerto'  },
  { id: 'sofia',  name: 'Abuela Sofía', tile: [66, 34], district: 'mercado' },
  { id: 'diego',  name: 'Diego',        tile: [18, 31], district: 'afueras' },
]

export const PLAYER_SPAWN = [41, 34]   // plaza, just south of Marco

// --- landmarks the map must physically build --------------------------------
export const LANDMARKS = {
  fountain:   [41, 29],
  churchDoor: [14, 14],
  bakery:     [37, 18],
  cafe:       [33, 33],
  fruitStall: [61, 26],
  fishStall:  [44, 46],
  pharmacy:   [52, 20],
  busStop:    [29, 45],
  school:     [20, 15],
  flowerCart: [66, 33],
  oliveGrove: [10, 30],
  harbourEnd: [55, 50],
}

// --- mission chain ----------------------------------------------------------
// Chapter 1 recovers the passport (the original arc, respaced across the bigger
// town). Chapters 2 and 3 are what you do once you are staying.
export const MISSION_CHAIN = [
  { id: 'kele',    giver: 'coach',  target: 'pilar',  chapter: 1 },
  { id: 'roti',    giver: 'coach',  target: 'rosa',   chapter: 1 },
  { id: 'carmen',  giver: 'rosa',   target: 'carmen', chapter: 1 },
  { id: 'lucia',   giver: 'carmen', target: 'lucia',  chapter: 1, requiresFact: 'carmen_dog_beach' },
  { id: 'padre',   giver: 'lucia',  target: 'padre',  chapter: 1, requiresFact: 'padre_has_passport' },
  { id: 'jashn',   giver: 'padre',  target: 'coach',  chapter: 1 },

  { id: 'bus',     giver: 'coach',  target: 'rafa',   chapter: 2 },
  { id: 'dawa',    giver: 'rafa',   target: 'nadia',  chapter: 2 },
  { id: 'machhli', giver: 'coach',  target: 'tomas',  chapter: 2 },
  { id: 'phool',   giver: 'rosa',   target: 'sofia',  chapter: 2 },

  { id: 'school',  giver: 'coach',  target: 'elena',  chapter: 3 },
  { id: 'nao',     giver: 'tomas',  target: 'hassan', chapter: 3, requiresFact: 'hassan_boat_trip' },
  { id: 'scooter', giver: 'lucia',  target: 'diego',  chapter: 3 },
  { id: 'fiesta',  giver: 'elena',  target: 'coach',  chapter: 3 },
]

export function districtOf(cx, cz) {
  for (const [key, d] of Object.entries(DISTRICTS)) {
    const [x0, z0, x1, z1] = d.rect
    if (cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1) return key
  }
  return null
}

export function castTile(id) {
  const c = CAST.find(x => x.id === id)
  return c ? c.tile : null
}
