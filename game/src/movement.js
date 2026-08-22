import * as THREE from 'three'

// ---------------------------------------------------------------------------
// movement.js — continuous character controller + follow camera for Pueblo.
//
// The town still *thinks* in tiles (town.js owns the grid), but the player no
// longer snaps to them. This module turns key input into velocity, resolves
// that velocity against the grid as CIRCLE-vs-TILE collision with wall
// sliding, follows the ground height smoothly (the plaza is a raised step, not
// a cliff), and drives a spring-damped three-quarter follow camera that pulls
// in when a building gets between it and the player.
//
//   const ctl = createController({ scene, camera, player, town })
//   ctl.update(dt, { x, z, run })     // x/z are WORLD axes, -1..1
//   ctl.speed, ctl.gait, ctl.stride   // for idle/walk/run animation blending
//   ctl.setFrozen(true)               // during conversations
//   ctl.moveToTile(cx, cz)            // headless/pathed movement
//
// Nothing in here allocates per frame; every vector is a module scratch.
// ---------------------------------------------------------------------------

export const MOVE_CONFIG = {
  // body
  radius: 0.38,          // collision circle, world units (tile = 2)
  walkSpeed: 4.0,
  runSpeed: 7.2,
  accel: 26,             // m/s^2 toward the wanted velocity (~0.15s to walk)
  brake: 20,             // m/s^2 when the stick is released (~0.36s from a run)
  turnRate: 15,          // rad/s-ish exponential turn toward travel direction
  groundOmega: 15,       // critically damped follow of the ground height
  slideFriction: 0.94,   // speed kept when scraping along a wall
  maxSubstep: 1 / 60,    // physics/camera integration cap for stability

  // camera — a LOW three-quarter Dota-ish angle. Keep the feel.
  camOffset: [0, 9.2, 11.0],
  camFocusY: 0.95,
  camOmega: 8.5,         // spring rate of the focus point
  camLookAhead: 2.1,     // how far ahead of a running player the camera leads
  camLookTau: 0.30,      // smoothing of that lead
  camClearFloor: 0.72,   // how far in we will pull to WIN a clear sightline
  camMinScale: 0.34,     // how far in we will pull to stay out of a wall
  camRise: 0.18,         // the camera climbs as it pulls in, so it clears roofs
  camRoofClear: 0.5,     // sightline / camera must clear a roof by this much
  camLiftMax: 3.5,       // cap on the last-resort climb over a roof
  camSteps: 7,           // candidate positions between full and tightest
  camPullIn: 20,         // fast when a wall appears
  camPullOut: 3.0,       // slow when it clears — no snapping back
  camFloor: 1.3,         // stay this far above the ground

  // navigation (headless tests, click-to-move)
  navArrive: 0.7,
  navWaypoint: 0.6,
  navStuckTime: 0.9,

  // camera occluder harvesting
  occludeMinHeight: 4.2,   // taller than a market stall / umbrella / lamp
  occludeMaxSpan: 30,      // smaller than the ground plane / props group
  occludeMinSpan: 2.2,     // wider than a lamp post or a washing line
}

// --- module scratch --------------------------------------------------------
const _v1 = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _v3 = new THREE.Vector3()
const _box = new THREE.Box3()
const _size = new THREE.Vector3()
const _hit = { x: 0, z: 0, nx: 0, nz: 0, hit: false }

function damp(rate, dt) { return 1 - Math.exp(-rate * dt) }

export function createController(opts) {
  const { scene, camera, player, town } = opts
  const cfg = Object.assign({}, MOVE_CONFIG, opts.config || {})
  const { isWalkable, groundHeight, COLS, ROWS, TILE } = town

  // tile <-> world without allocating a Vector3 per query
  const o = town.tileToWorld(0, 0)
  const OX = o.x, OZ = o.z
  const centerX = cx => OX + cx * TILE
  const centerZ = cz => OZ + cz * TILE
  const tileX = x => Math.floor((x - OX) / TILE + 0.5)
  const tileZ = z => Math.floor((z - OZ) / TILE + 0.5)

  // ---- state --------------------------------------------------------------
  const position = player.position           // live reference; we write into it
  const velocity = new THREE.Vector3()       // y unused, kept for convenience
  const focus = new THREE.Vector3()
  const focusVel = new THREE.Vector3()
  const lead = new THREE.Vector3()
  const camWant = new THREE.Vector3()
  const offset = new THREE.Vector3().fromArray(cfg.camOffset)
  const offsetTarget = offset.clone()

  let heading = 0            // where the body points
  let speed = 0              // horizontal speed, m/s
  let stride = 0             // gait phase in radians, advances with speed
  let frozen = false
  let groundY = 0, groundVel = 0
  let camScale = 1           // 0..1 occlusion pull-in on the offset
  let camLift = 0            // extra height when a roof would swallow the camera
  let focusOverride = null
  let inputYaw = 0           // input basis; the roam camera looks down -Z
  let touchedWall = false

  let obstacles = (opts.obstacles || []).map(b => ({ x: b.x, z: b.z, r: b.r ?? 0.5 }))
  let occluders = []
  let occluderObjs = []

  // navigation
  let path = null            // flat array of world [x,z,...]
  let pathI = 0
  let navState = 'idle'
  let stuckT = 0
  let navReplans = 0
  let goalX = 0, goalZ = 0
  let lastX = 0, lastZ = 0

  // ---- ground -------------------------------------------------------------
  // Bilinear blend of the four surrounding tile heights so the plaza steps
  // read as ramps. Non-walkable neighbours borrow the tile you are standing on
  // so you never dip toward a wall footing or into the sea.
  function groundAt(x, z) {
    const bx = tileX(x), bz = tileZ(z)
    const base = groundHeight(bx, bz)
    const fx = (x - OX) / TILE, fz = (z - OZ) / TILE
    const i0 = Math.floor(fx), j0 = Math.floor(fz)
    const u = fx - i0, v = fz - j0
    const a = isWalkable(i0, j0) ? groundHeight(i0, j0) : base
    const b = isWalkable(i0 + 1, j0) ? groundHeight(i0 + 1, j0) : base
    const c = isWalkable(i0, j0 + 1) ? groundHeight(i0, j0 + 1) : base
    const d = isWalkable(i0 + 1, j0 + 1) ? groundHeight(i0 + 1, j0 + 1) : base
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
  }

  // ---- collision ----------------------------------------------------------
  function tileOverlap(x, z, r) {
    const cx0 = tileX(x - r), cx1 = tileX(x + r)
    const cz0 = tileZ(z - r), cz1 = tileZ(z + r)
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (isWalkable(cx, cz)) continue
        const minX = centerX(cx) - TILE / 2, maxX = minX + TILE
        const minZ = centerZ(cz) - TILE / 2, maxZ = minZ + TILE
        const qx = x < minX ? minX : (x > maxX ? maxX : x)
        const qz = z < minZ ? minZ : (z > maxZ ? maxZ : z)
        const dx = x - qx, dz = z - qz
        if (dx * dx + dz * dz < r * r) return true
      }
    }
    return false
  }

  // Resolve a circle out of every blocked tile and body it overlaps.
  // Writes into _hit: final x/z plus the accumulated (normalised) push normal.
  function resolve(x, z, r) {
    let nx = 0, nz = 0, hit = false
    for (let pass = 0; pass < 3; pass++) {
      let moved = false
      const cx0 = tileX(x - r), cx1 = tileX(x + r)
      const cz0 = tileZ(z - r), cz1 = tileZ(z + r)
      for (let cz = cz0; cz <= cz1; cz++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          if (isWalkable(cx, cz)) continue
          const minX = centerX(cx) - TILE / 2, maxX = minX + TILE
          const minZ = centerZ(cz) - TILE / 2, maxZ = minZ + TILE
          const qx = x < minX ? minX : (x > maxX ? maxX : x)
          const qz = z < minZ ? minZ : (z > maxZ ? maxZ : z)
          let dx = x - qx, dz = z - qz
          const d2 = dx * dx + dz * dz
          if (d2 >= r * r) continue
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2), push = r - d
            dx /= d; dz /= d
            x += dx * push; z += dz * push
          } else {
            // centre is inside the tile — leave by the shortest wall
            const l = x - minX, ri = maxX - x, u = z - minZ, dn = maxZ - z
            const m = Math.min(l, ri, u, dn)
            if (m === l) { dx = -1; dz = 0; x = minX - r }
            else if (m === ri) { dx = 1; dz = 0; x = maxX + r }
            else if (m === u) { dx = 0; dz = -1; z = minZ - r }
            else { dx = 0; dz = 1; z = maxZ + r }
          }
          nx += dx; nz += dz; hit = true; moved = true
        }
      }
      // people are soft cylinders — you bump around them, not through them
      for (let i = 0; i < obstacles.length; i++) {
        const b = obstacles[i]
        let dx = x - b.x, dz = z - b.z
        const need = r + b.r
        const d2 = dx * dx + dz * dz
        if (d2 >= need * need) continue
        let d = Math.sqrt(d2)
        if (d < 1e-6) { dx = 1; dz = 0; d = 1 } else { dx /= d; dz /= d }
        const push = need - d
        x += dx * push; z += dz * push
        nx += dx; nz += dz; hit = true; moved = true
      }
      if (!moved) break
    }
    const nl = Math.hypot(nx, nz)
    _hit.x = x; _hit.z = z; _hit.hit = hit
    _hit.nx = nl > 1e-6 ? nx / nl : 0
    _hit.nz = nl > 1e-6 ? nz / nl : 0
    return _hit
  }

  // ---- camera occluders ---------------------------------------------------
  // One AABB per building. Cheap slab tests beat a full scene raycast and stay
  // deterministic in headless runs.
  function refreshOccluders() {
    occluders = []
    occluderObjs = []
    if (opts.occluders) {
      for (const obj of opts.occluders) {
        occluders.push(new THREE.Box3().setFromObject(obj))
        occluderObjs.push(obj)
      }
      buildRoofMap()
      return occluders.length
    }
    if (!scene) return 0
    const halfW = COLS * TILE / 2 + 6, halfD = ROWS * TILE / 2 + 6
    for (const child of scene.children) {
      if (child === player || child.isLight || child.isCamera) continue
      if (child.userData && child.userData.noOcclude) continue
      _box.makeEmpty()
      _box.setFromObject(child)
      if (_box.isEmpty()) continue
      if (_box.max.y < cfg.occludeMinHeight) continue
      _box.getSize(_size)
      if (_size.x > cfg.occludeMaxSpan || _size.z > cfg.occludeMaxSpan) continue
      if (Math.min(_size.x, _size.z) < cfg.occludeMinSpan) continue
      _box.getCenter(_v1)
      if (Math.abs(_v1.x) > halfW || Math.abs(_v1.z) > halfD) continue
      occluders.push(_box.clone())
      occluderObjs.push(child)
    }
    buildRoofMap()
    return occluders.length
  }

  // Per-tile roofline. A building's bounding box overhangs its tiles (eaves,
  // doorsteps), so testing the box directly says "occluded" whenever you stand
  // next to a wall. The grid does not lie: a tile is either a building column
  // of a known height, or it is open sky.
  let roof = new Float32Array(COLS * ROWS)
  function buildRoofMap() {
    roof = new Float32Array(COLS * ROWS)   // 0 = open sky (water, trees, sand…)
    for (const obj of occluderObjs) {
      obj.updateWorldMatrix(true, true)
      obj.traverse(m => {
        if (!m.isMesh || !m.geometry) return
        _box.makeEmpty()
        _box.setFromObject(m)
        if (_box.isEmpty()) return
        // inset so eaves and doorsteps do not claim the street they hang over
        const cx0 = tileX(_box.min.x + 0.3), cx1 = tileX(_box.max.x - 0.3)
        const cz0 = tileZ(_box.min.z + 0.3), cz1 = tileZ(_box.max.z - 0.3)
        for (let cz = Math.max(0, cz0); cz <= Math.min(ROWS - 1, cz1); cz++) {
          for (let cx = Math.max(0, cx0); cx <= Math.min(COLS - 1, cx1); cx++) {
            if (isWalkable(cx, cz)) continue
            const i = cz * COLS + cx
            if (_box.max.y > roof[i]) roof[i] = _box.max.y
          }
        }
      })
    }
  }

  function roofAt(x, z) {
    const cx = tileX(x), cz = tileZ(z)
    if (cx < 0 || cz < 0 || cx >= COLS || cz >= ROWS) return 0
    return roof[cz * COLS + cx]
  }

  // is the line focus -> (cx,cy,cz) clear of every roof it passes over?
  function sightClear(cx, cy, cz) {
    const dx = cx - focus.x, dy = cy - focus.y, dz = cz - focus.z
    const distH = Math.hypot(dx, dz)
    const steps = Math.max(2, Math.ceil(distH / (TILE * 0.4)))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const h = roofAt(focus.x + dx * t, focus.z + dz * t)
      if (h > 0 && focus.y + dy * t < h + cfg.camRoofClear) return false
    }
    return true
  }

  // ---- pathfinding --------------------------------------------------------
  function bfs(sx, sz, tx, tz) {
    if (!isWalkable(tx, tz)) return null
    const seen = new Int32Array(COLS * ROWS).fill(-1)
    const q = new Int32Array(COLS * ROWS)
    let head = 0, tail = 0
    const start = sz * COLS + sx
    seen[start] = start
    q[tail++] = start
    const goal = tz * COLS + tx
    let found = seen[goal] >= 0
    while (head < tail && !found) {
      const cur = q[head++]
      const cx = cur % COLS, cz = (cur - cx) / COLS
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0)
        const nz = cz + (k === 2 ? 1 : k === 3 ? -1 : 0)
        if (nx < 0 || nz < 0 || nx >= COLS || nz >= ROWS) continue
        const ni = nz * COLS + nx
        if (seen[ni] >= 0 || !isWalkable(nx, nz)) continue
        seen[ni] = cur
        if (ni === goal) { found = true; break }
        q[tail++] = ni
      }
    }
    if (seen[goal] < 0) return null
    const tiles = []
    let cur = goal
    while (cur !== start) { tiles.unshift(cur); cur = seen[cur] }
    const out = []
    for (const idx of tiles) {
      const cx = idx % COLS, cz = (idx - cx) / COLS
      out.push(centerX(cx), centerZ(cz))
    }
    return out
  }

  // straight-line clearance for string pulling
  function lineClear(ax, az, bx, bz, r) {
    const dx = bx - ax, dz = bz - az
    const len = Math.hypot(dx, dz)
    const steps = Math.max(1, Math.ceil(len / (TILE * 0.4)))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      if (tileOverlap(ax + dx * t, az + dz * t, r)) return false
    }
    return true
  }

  function moveToTile(tx, tz) {
    const p = bfs(tileX(position.x), tileZ(position.z), tx, tz)
    if (!p) { path = null; navState = 'unreachable'; return { ok: false, reason: 'unreachable' } }
    goalX = tx; goalZ = tz
    if (p.length === 0) { path = null; navState = 'arrived'; return { ok: true, tiles: 0 } }
    path = p
    pathI = 0
    navState = 'moving'
    stuckT = 0
    navReplans = 0
    lastX = position.x; lastZ = position.z
    return { ok: true, tiles: p.length / 2 }
  }

  function stopNav() { path = null; if (navState === 'moving') navState = 'idle' }

  // how close counts as "there" — if somebody is standing on the goal tile you
  // can only ever get as close as the two bodies allow
  function arriveRadius(gx, gz) {
    let r = cfg.navArrive
    for (let i = 0; i < obstacles.length; i++) {
      const b = obstacles[i]
      if (Math.hypot(b.x - gx, b.z - gz) < cfg.navArrive) {
        r = Math.max(r, cfg.radius + b.r + 0.25)
      }
    }
    // never so loose that "arrived" lands on a different tile than the goal
    return Math.min(r, TILE * 0.475)
  }

  // steer around people rather than shouldering into them
  const _steer = { x: 0, z: 0 }
  function avoidBodies(dx, dz) {
    let ax = 0, az = 0
    const perpX = -dz, perpZ = dx
    for (let i = 0; i < obstacles.length; i++) {
      const b = obstacles[i]
      const ox = b.x - position.x, oz = b.z - position.z
      const d = Math.hypot(ox, oz)
      if (d > 2.6 || d < 1e-4) continue
      const fx = ox / d, fz = oz / d
      const ahead = dx * fx + dz * fz
      if (ahead <= 0.15) continue
      const perp = perpX * fx + perpZ * fz
      const lateral = Math.abs(perp) * d
      const need = cfg.radius + b.r + 0.45
      if (lateral > need) continue
      let side = perp >= 0 ? -1 : 1
      // don't dodge into a wall: if the natural side is blocked, take the other
      const probe = (s) => tileOverlap(
        position.x + perpX * s * need + dx * 0.9,
        position.z + perpZ * s * need + dz * 0.9, cfg.radius)
      if (probe(side) && !probe(-side)) side = -side
      const w = (1 - lateral / need) * Math.min(1, (2.6 - d) / 1.4) * ahead * 1.8
      ax += perpX * side * w
      az += perpZ * side * w
    }
    const nx = dx + ax, nz = dz + az
    const l = Math.hypot(nx, nz) || 1
    _steer.x = nx / l; _steer.z = nz / l
    return _steer
  }

  // pick the furthest waypoint we can walk to in a straight line
  function navInput(out) {
    if (!path) return false
    const n = path.length / 2
    const gx = path[(n - 1) * 2], gz = path[(n - 1) * 2 + 1]
    if (Math.hypot(gx - position.x, gz - position.z) < arriveRadius(gx, gz)) {
      path = null; navState = 'arrived'; return false
    }
    const r = cfg.radius + 0.06
    let best = pathI
    for (let i = Math.min(n - 1, pathI + 10); i > pathI; i--) {
      if (lineClear(position.x, position.z, path[i * 2], path[i * 2 + 1], r)) { best = i; break }
    }
    pathI = best
    let wx = path[pathI * 2], wz = path[pathI * 2 + 1]
    if (Math.hypot(wx - position.x, wz - position.z) < cfg.navWaypoint && pathI < n - 1) {
      pathI++
      wx = path[pathI * 2]; wz = path[pathI * 2 + 1]
    }
    const dx = wx - position.x, dz = wz - position.z
    const l = Math.hypot(dx, dz) || 1
    const s = avoidBodies(dx / l, dz / l)
    out.x = s.x; out.z = s.z
    return true
  }

  // ---- the step -----------------------------------------------------------
  const _in = { x: 0, z: 0, run: false }

  function integrate(dt, input) {
    // --- wanted velocity ---------------------------------------------------
    let ix = 0, iz = 0, run = false
    if (!frozen) {
      if (input && (input.x || input.z)) {
        ix = input.x; iz = input.z; run = !!input.run
        if (path) stopNav()                    // player input always wins
      } else if (path) {
        if (navInput(_in)) { ix = _in.x; iz = _in.z; run = true }
      }
    }
    let il = Math.hypot(ix, iz)
    if (il > 1) { ix /= il; iz /= il; il = 1 }
    if (inputYaw && il > 0) {
      const c = Math.cos(inputYaw), s = Math.sin(inputYaw)
      const rx = ix * c - iz * s, rz = ix * s + iz * c
      ix = rx; iz = rz
    }

    const top = run ? cfg.runSpeed : cfg.walkSpeed
    const wantX = ix * top, wantZ = iz * top
    const rate = il > 0 ? cfg.accel : cfg.brake
    const dvx = wantX - velocity.x, dvz = wantZ - velocity.z
    const dvl = Math.hypot(dvx, dvz)
    if (dvl > 1e-6) {
      const s = Math.min(dvl, rate * dt) / dvl
      velocity.x += dvx * s
      velocity.z += dvz * s
    }

    // --- move + collide ----------------------------------------------------
    let nx = position.x + velocity.x * dt
    let nz = position.z + velocity.z * dt
    const h = resolve(nx, nz, cfg.radius)
    touchedWall = h.hit
    if (h.hit) {
      // cancel only the component pushing into the wall — the rest slides
      const into = velocity.x * h.nx + velocity.z * h.nz
      if (into < 0) {
        velocity.x -= h.nx * into
        velocity.z -= h.nz * into
        velocity.x *= cfg.slideFriction
        velocity.z *= cfg.slideFriction
      }
    }
    position.x = h.x
    position.z = h.z

    speed = Math.hypot(velocity.x, velocity.z)
    if (speed < 0.02) { velocity.x = 0; velocity.z = 0; speed = 0 }

    // --- ground follow (plaza step is a ramp, never a pop) -----------------
    const gTarget = groundAt(position.x, position.z)
    const k = cfg.groundOmega
    groundVel += ((gTarget - groundY) * k * k - groundVel * 2 * k) * dt
    groundY += groundVel * dt
    if (Math.abs(gTarget - groundY) < 0.0005) { groundY = gTarget; groundVel = 0 }
    position.y = groundY

    // --- turn toward travel ------------------------------------------------
    if (speed > 0.15) {
      const want = Math.atan2(velocity.x, velocity.z)
      let d = want - heading
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      heading += d * damp(cfg.turnRate, dt)
    }
    player.rotation.y = heading
    stride += speed * dt * 2.4

    // --- nav bookkeeping ---------------------------------------------------
    if (path) {
      const prog = Math.hypot(position.x - lastX, position.z - lastZ)
      if (prog < 0.02) {
        stuckT += dt
        if (stuckT > cfg.navStuckTime) {
          stuckT = 0
          const n = path.length / 2
          const gx = path[(n - 1) * 2], gz = path[(n - 1) * 2 + 1]
          if (navReplans < 3) {
            // wedged on somebody or on a corner — re-path from where we are
            navReplans++
            const p = bfs(tileX(position.x), tileZ(position.z), goalX, goalZ)
            if (p && p.length) { path = p; pathI = navReplans > 1 && p.length > 2 ? 1 : 0 }
            else { path = null; navState = 'stuck' }
          } else {
            const close = Math.hypot(gx - position.x, gz - position.z) < arriveRadius(gx, gz) + 0.4
            path = null; navState = close ? 'arrived' : 'stuck'
          }
        }
      } else { stuckT = 0 }
      lastX = position.x; lastZ = position.z
    }
  }

  function updateCamera(dt) {
    // focus: the player's chest, led slightly in the direction of travel
    const lx = speed > 0.2 ? (velocity.x / speed) * cfg.camLookAhead * Math.min(1, speed / cfg.runSpeed) : 0
    const lz = speed > 0.2 ? (velocity.z / speed) * cfg.camLookAhead * Math.min(1, speed / cfg.runSpeed) : 0
    const lk = damp(1 / cfg.camLookTau, dt)
    lead.x += (lx - lead.x) * lk
    lead.z += (lz - lead.z) * lk
    // never lead the focus into a wall — the sightline test starts there
    for (let i = 0; i < 3 && roofAt(position.x + lead.x, position.z + lead.z) > 0; i++) {
      lead.x *= 0.5; lead.z *= 0.5
    }

    if (focusOverride) _v1.copy(focusOverride)
    else _v1.set(position.x + lead.x, position.y + cfg.camFocusY, position.z + lead.z)

    // critically damped spring — weight without overshoot
    const k = cfg.camOmega
    _v2.copy(_v1).sub(focus).multiplyScalar(k * k)
    _v3.copy(focusVel).multiplyScalar(2 * k)
    focusVel.add(_v2.sub(_v3).multiplyScalar(dt))
    focus.add(_v3.copy(focusVel).multiplyScalar(dt))

    offset.lerp(offsetTarget, damp(3.2, dt))

    // Occlusion, in two tiers.
    //
    // Pulling the camera down its own offset would drag it *into* the wall it
    // is dodging, because that offset points down as well as back — so we only
    // shorten the horizontal reach and let the camera keep (slightly gain) its
    // height: it climbs the roofline instead of diving through it.
    //
    // Tier A wins a clear sightline, but only if a modest nudge buys one. In a
    // town of five-tile blocks and two-tile streets, standing north of a block
    // there is NO sane camera position that sees past it — chasing one would
    // yo-yo the camera between three-quarter and top-down every time you cross
    // a street. So we don't chase.
    // Tier B is the floor we never give up: the camera stays out of the walls.
    const want = solveScale()
    camScale += (want - camScale) * damp(want < camScale ? cfg.camPullIn : cfg.camPullOut, dt)

    camAt(camScale, camera.position)
    // last resort — if even the tightest pull-in leaves us buried in a roof,
    // rise above it. Eased, so it reads as the camera lifting over the tiles.
    const rh = roofAt(camera.position.x, camera.position.z)
    const need = rh > 0
      ? Math.min(cfg.camLiftMax, Math.max(0, rh + cfg.camRoofClear - camera.position.y))
      : 0
    camLift += (need - camLift) * damp(need > camLift ? cfg.camPullIn : cfg.camPullOut, dt)
    camera.position.y += camLift

    const floor = groundAt(camera.position.x, camera.position.z) + cfg.camFloor
    if (camera.position.y < floor) camera.position.y = floor
    camera.lookAt(focus)
  }

  function solveScale() {
    const n = cfg.camSteps
    for (let i = 0; i < n; i++) {          // tier A — buy a clear line, cheaply
      const s = 1 - (1 - cfg.camClearFloor) * (i / (n - 1))
      camAt(s, camWant)
      if (sightClear(camWant.x, camWant.y, camWant.z)) return s
    }
    for (let i = 0; i < n; i++) {          // tier B — at least stay out of walls
      const s = 1 - (1 - cfg.camMinScale) * (i / (n - 1))
      camAt(s, camWant)
      const h = roofAt(camWant.x, camWant.z)
      if (h === 0 || camWant.y > h + cfg.camRoofClear) return s
    }
    return cfg.camMinScale
  }

  function camAt(s, out) {
    out.set(
      focus.x + offset.x * s,
      focus.y + offset.y * (1 + (1 - s) * cfg.camRise),
      focus.z + offset.z * s,
    )
    return out
  }

  function update(dt, input) {
    if (!(dt > 0)) return speed
    const n = Math.max(1, Math.ceil(dt / cfg.maxSubstep))
    const h = dt / n
    for (let i = 0; i < n; i++) {
      integrate(h, input)
      updateCamera(h)
    }
    return speed
  }

  // ---- init ---------------------------------------------------------------
  function teleportToTile(cx, cz) {
    position.set(centerX(cx), groundHeight(cx, cz), centerZ(cz))
    groundY = position.y; groundVel = 0
    velocity.set(0, 0, 0); speed = 0
    path = null; navState = 'idle'
    focus.set(position.x, position.y + cfg.camFocusY, position.z)
    focusVel.set(0, 0, 0)
    lead.set(0, 0, 0)
    camScale = 1
    camLift = 0
    camAt(1, camera.position)
    camera.lookAt(focus)
  }

  const api = {
    update,
    position,
    velocity,
    focus,
    setFrozen(v) { frozen = !!v; if (frozen) { stopNav(); } },
    isFrozen: () => frozen,
    get speed() { return speed },
    get speed01() { return Math.min(1, speed / cfg.runSpeed) },
    get gait() { return speed / cfg.walkSpeed },   // 0 idle · 1 walk · ~1.8 run
    get stride() { return stride },
    get heading() { return heading },
    get onWall() { return touchedWall },
    get tileX() { return tileX(position.x) },
    get tileZ() { return tileZ(position.z) },
    tileOf: (x, z) => ({ x: tileX(x), z: tileZ(z) }),
    groundAt,
    roofAt,
    isFree: (x, z) => !tileOverlap(x, z, cfg.radius),
    setCameraOffset(v) { offsetTarget.set(v.x ?? v[0], v.y ?? v[1], v.z ?? v[2]) },
    setFocusOverride(v) { focusOverride = v ? _vecCopy(focusOverride, v) : null },
    setObstacles(list) { obstacles = list.map(b => ({ x: b.x, z: b.z, r: b.r ?? 0.5 })) },
    setInputYaw(y) { inputYaw = y },
    refreshOccluders,
    get occluderCount() { return occluders.length },
    debugOccluders: () => occluders,
    get camPullIn() { return camScale },   // 1 = free, <1 = pulled in by a wall
    moveToTile,
    stopNav,
    get navState() { return navState },
    navBusy: () => !!path,
    teleportToTile,
    config: cfg,
  }

  function _vecCopy(dst, v) {
    if (!dst) dst = new THREE.Vector3()
    dst.copy(v)
    return dst
  }

  teleportToTile(tileX(position.x), tileZ(position.z))
  refreshOccluders()
  return api
}
