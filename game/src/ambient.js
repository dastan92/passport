import * as THREE from 'three'
import { buildPerson, buildDog, buildCat, buildGull, WANDER_LOOKS } from './people.js'
import { isWalkable, tileToWorld, groundHeight, COLS, ROWS } from './town.js'
import { seeded } from './kit.js'

// ---------------------------------------------------------------------------
// Ambient life: villagers who wander, a dog, cats, gulls. No dialogue —
// they exist so the town feels inhabited between conversations.
// ---------------------------------------------------------------------------

const rng = seeded(777)

function randomWalkable() {
  for (let i = 0; i < 200; i++) {
    const x = Math.floor(rng() * COLS)
    const z = Math.floor(rng() * ROWS)
    if (isWalkable(x, z)) return [x, z]
  }
  return [20, 12]
}

export function spawnAmbient(scene, occupiedTiles) {
  const walkers = []

  for (let i = 0; i < WANDER_LOOKS.length; i++) {
    const g = buildPerson(WANDER_LOOKS[i])
    const [x, z] = randomWalkable()
    g.position.copy(tileToWorld(x, z))
    g.position.y = groundHeight(x, z)
    scene.add(g)
    walkers.push({
      kind: 'person', group: g,
      tile: [x, z], target: [x, z],
      t: 1, speed: 0.35 + rng() * 0.25,
      pauseUntil: 0, bob: rng() * 10,
    })
  }

  const dog = buildDog()
  const [dx, dz] = randomWalkable()
  dog.position.copy(tileToWorld(dx, dz))
  scene.add(dog)
  walkers.push({
    kind: 'dog', group: dog,
    tile: [dx, dz], target: [dx, dz],
    t: 1, speed: 0.75, pauseUntil: 0, bob: 0,
  })

  // cats: stationary, tail flicks
  const cats = []
  for (const [cx, cz] of [[15, 8], [30, 17]]) {
    const cat = buildCat(rng() > 0.5 ? 0x4a4038 : 0xc07a2e)
    const p = tileToWorld(cx, cz)
    cat.position.set(p.x + 0.6, groundHeight(cx, cz), p.z)
    cat.rotation.y = rng() * Math.PI * 2
    scene.add(cat)
    cats.push(cat)
  }

  // gulls on the beach + one on the fountain
  const gulls = []
  const gullSpots = [[6, 24], [17, 25], [28, 24], [38, 25], [21.6, 11.6]]
  for (const [gx, gz] of gullSpots) {
    const gull = buildGull()
    const p = tileToWorld(gx, gz)
    gull.position.set(p.x, gz < 20 ? 2.9 : groundHeight(Math.round(gx), Math.round(gz)), p.z)
    gull.rotation.y = rng() * Math.PI * 2
    scene.add(gull)
    gulls.push(gull)
  }

  function update(dt, time, playerPos) {
    for (const w of walkers) {
      if (w.t >= 1) {
        w.tile = w.target
        if (time > w.pauseUntil) {
          // pick a neighbouring walkable tile; occasionally idle instead
          if (rng() > 0.35) {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]].filter(([ax, az]) =>
              isWalkable(w.tile[0] + ax, w.tile[1] + az) &&
              !occupiedTiles().some(([ox, oz]) => ox === w.tile[0] + ax && oz === w.tile[1] + az))
            if (dirs.length) {
              const [ax, az] = dirs[Math.floor(rng() * dirs.length)]
              w.target = [w.tile[0] + ax, w.tile[1] + az]
              w.t = 0
              const wp = tileToWorld(w.target[0], w.target[1])
              w.group.rotation.y = Math.atan2(wp.x - w.group.position.x, wp.z - w.group.position.z)
            } else {
              w.pauseUntil = time + 1 + rng() * 3
            }
          } else {
            w.pauseUntil = time + 1.5 + rng() * 4
          }
        }
      } else {
        w.t = Math.min(1, w.t + dt * w.speed / 0.42)
        const a = tileToWorld(w.tile[0], w.tile[1])
        const b = tileToWorld(w.target[0], w.target[1])
        const ya = groundHeight(w.tile[0], w.tile[1])
        const yb = groundHeight(w.target[0], w.target[1])
        w.group.position.set(
          a.x + (b.x - a.x) * w.t,
          ya + (yb - ya) * w.t,
          a.z + (b.z - a.z) * w.t,
        )
        w.bob += dt * 12
        if (w.kind === 'person') {
          w.group.userData.body.position.y = Math.abs(Math.sin(w.bob)) * 0.05
          w.group.userData.arms[0].rotation.x = Math.sin(w.bob) * 0.4
          w.group.userData.arms[1].rotation.x = -Math.sin(w.bob) * 0.4
        } else if (w.kind === 'dog') {
          w.group.userData.body.position.y = Math.abs(Math.sin(w.bob * 1.4)) * 0.06
          w.group.userData.tail.rotation.z = Math.sin(time * 8) * 0.4
        }
      }
      // dog trots to the player if they are close
      if (w.kind === 'dog' && playerPos) {
        const d = w.group.position.distanceTo(playerPos)
        if (d < 4 && d > 1.4 && w.t >= 1) {
          w.group.rotation.y = Math.atan2(playerPos.x - w.group.position.x, playerPos.z - w.group.position.z)
          w.group.userData.tail.rotation.z = Math.sin(time * 10) * 0.5
        }
      }
    }
    cats.forEach((c, i) => {
      c.children[3].rotation.z = -1.1 + Math.sin(time * 1.4 + i * 2) * 0.25
    })
    gulls.forEach((g, i) => {
      g.position.y += Math.sin(time * 2.2 + i * 1.9) * 0.0015
      if (Math.sin(time * 0.7 + i * 3.1) > 0.995) g.rotation.y += 0.8
    })
  }

  return { update }
}

// ---------------------------------------------------------------------------
// Sound: no audio files — the Mediterranean is synthesized. Waves (filtered
// noise swells), fountain trickle, church bell on the quarter hour, cicadas.
// Starts on first user gesture (browser autoplay rules).
// ---------------------------------------------------------------------------
export function createSoundscape() {
  let ctx = null
  let started = false
  let muted = localStorage.getItem('passport_mute') === '1'

  function start() {
    if (started || muted) return
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    started = true

    const master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)

    // --- waves: looping noise through a slow-swelling lowpass ---------------
    const noiseLen = 4
    const buf = ctx.createBuffer(1, ctx.sampleRate * noiseLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 400
    const waveGain = ctx.createGain()
    waveGain.gain.value = 0.12
    noise.connect(lp).connect(waveGain).connect(master)
    noise.start()
    // swell LFO
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.09
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.07
    lfo.connect(lfoGain).connect(waveGain.gain)
    lfo.start()

    // --- fountain: high bandpassed trickle ---------------------------------
    const noise2 = ctx.createBufferSource()
    noise2.buffer = buf
    noise2.loop = true
    noise2.playbackRate.value = 1.7
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 3200
    bp.Q.value = 0.8
    const fGain = ctx.createGain()
    fGain.gain.value = 0.018
    noise2.connect(bp).connect(fGain).connect(master)
    noise2.start()

    // --- cicadas: amplitude-modulated high shimmer -------------------------
    const cic = ctx.createOscillator()
    cic.type = 'sawtooth'
    cic.frequency.value = 5600
    const cicMod = ctx.createOscillator()
    cicMod.frequency.value = 22
    const cicModGain = ctx.createGain()
    cicModGain.gain.value = 0.004
    const cicGain = ctx.createGain()
    cicGain.gain.value = 0.004
    cicMod.connect(cicModGain).connect(cicGain.gain)
    cic.connect(cicGain).connect(master)
    cic.start(); cicMod.start()

    // --- church bell: struck every 90s -------------------------------------
    function bell() {
      if (!ctx) return
      const t0 = ctx.currentTime
      for (const [freq, amp] of [[392, 0.16], [523, 0.08], [660, 0.04]]) {
        const o = ctx.createOscillator()
        o.frequency.value = freq
        const g2 = ctx.createGain()
        g2.gain.setValueAtTime(amp, t0)
        g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5)
        o.connect(g2).connect(master)
        o.start(t0)
        o.stop(t0 + 3.6)
      }
      setTimeout(bell, 90000)
    }
    setTimeout(bell, 12000)

    window.__soundscape = { ctx, master }
  }

  function toggleMute() {
    muted = !muted
    localStorage.setItem('passport_mute', muted ? '1' : '0')
    if (muted && ctx) { ctx.suspend() }
    else if (!muted) { started && ctx ? ctx.resume() : start() }
    return muted
  }

  return { start, toggleMute, isMuted: () => muted }
}
