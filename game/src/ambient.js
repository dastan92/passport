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
      const tail = c.children[4]
      if (tail) tail.rotation.z = -1.1 + Math.sin(time * 1.4 + i * 2) * 0.25
    })
    gulls.forEach((g, i) => {
      if (g.userData.baseY === undefined) g.userData.baseY = g.position.y
      g.position.y = g.userData.baseY + Math.sin(time * 2.2 + i * 1.9) * 0.04
      if (Math.sin(time * 0.7 + i * 3.1) > 0.995) g.rotation.y += 0.8
    })
  }

  return { update }
}

// ---------------------------------------------------------------------------
// Sound. Music is real (Scott Buckley, CC-BY 4.0 — see game/assets/CREDITS.md),
// crossfaded track to track. Ambience is deliberately sparse: the old version
// was continuous filtered noise, which is exactly what a desk fan sounds like.
// Waves are now discrete swells with an envelope, and they only come up when
// you are near the shore.
// ---------------------------------------------------------------------------
const TRACKS = [
  './assets/music/HomeWasYou.mp3',
  './assets/music/MemoriesOfStone.mp3',
  './assets/music/Convergence.mp3',
]

export function createSoundscape() {
  let ctx = null
  let started = false
  let muted = localStorage.getItem('passport_mute') === '1'
  let musicGain = null
  let ambGain = null
  let waveTimer = null
  let bellTimer = null
  let audioEl = null
  let trackIndex = Math.floor(Math.random() * TRACKS.length)

  // --- music: HTMLAudio through the graph so we can duck and crossfade ------
  function playNextTrack() {
    if (!ctx || muted) return
    const el = new Audio(TRACKS[trackIndex % TRACKS.length])
    trackIndex++
    el.crossOrigin = 'anonymous'
    el.preload = 'auto'
    const src = ctx.createMediaElementSource(el)
    const g = ctx.createGain()
    g.gain.value = 0
    src.connect(g).connect(musicGain)

    const FADE = 6
    el.addEventListener('canplay', () => {
      g.gain.cancelScheduledValues(ctx.currentTime)
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.85, ctx.currentTime + FADE)
    }, { once: true })
    el.addEventListener('timeupdate', function onTime() {
      if (!el.duration || Number.isNaN(el.duration)) return
      const left = el.duration - el.currentTime
      if (left < FADE + 0.5) {
        el.removeEventListener('timeupdate', onTime)
        g.gain.cancelScheduledValues(ctx.currentTime)
        g.gain.setValueAtTime(g.gain.value, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + FADE)
        setTimeout(() => { try { el.pause() } catch {} }, FADE * 1000 + 200)
        playNextTrack() // overlap: the next one fades in while this fades out
      }
    })
    el.addEventListener('error', () => setTimeout(playNextTrack, 1500), { once: true })
    el.play().catch(() => {})
    audioEl = el
  }

  // --- a single wave: noise burst shaped by an envelope --------------------
  function wave() {
    if (!ctx || muted) return
    const dur = 2.6 + Math.random() * 2.2
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(300, ctx.currentTime)
    lp.frequency.linearRampToValueAtTime(1400, ctx.currentTime + dur * 0.35)
    lp.frequency.linearRampToValueAtTime(220, ctx.currentTime + dur)
    const g = ctx.createGain()
    const t0 = ctx.currentTime
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(0.09, t0 + dur * 0.3)   // swell in
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)  // hiss out
    src.connect(lp).connect(g).connect(ambGain)
    src.start()
    src.stop(t0 + dur + 0.05)
    waveTimer = setTimeout(wave, (dur + 2 + Math.random() * 4) * 1000)
  }

  function bell() {
    if (!ctx || muted) return
    const t0 = ctx.currentTime
    for (const [freq, amp] of [[392, 0.1], [523, 0.05], [660, 0.025], [784, 0.012]]) {
      const o = ctx.createOscillator()
      o.frequency.value = freq
      const g = ctx.createGain()
      g.gain.setValueAtTime(amp, t0)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.2)
      o.connect(g).connect(ambGain)
      o.start(t0)
      o.stop(t0 + 4.3)
    }
    bellTimer = setTimeout(bell, 150000 + Math.random() * 60000)
  }

  function start() {
    if (started || muted) return
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    started = true
    musicGain = ctx.createGain()
    musicGain.gain.value = 0.34          // present but never in the way
    musicGain.connect(ctx.destination)
    ambGain = ctx.createGain()
    ambGain.gain.value = 0.5
    ambGain.connect(ctx.destination)
    playNextTrack()
    setTimeout(wave, 2000)
    bellTimer = setTimeout(bell, 45000)
    window.__soundscape = { ctx, musicGain, ambGain }
  }

  function toggleMute() {
    muted = !muted
    localStorage.setItem('passport_mute', muted ? '1' : '0')
    if (muted) {
      clearTimeout(waveTimer); clearTimeout(bellTimer)
      if (audioEl) { try { audioEl.pause() } catch {} }
      if (ctx) ctx.suspend()
    } else if (started && ctx) {
      ctx.resume()
      if (audioEl) audioEl.play().catch(() => {})
      wave(); bell()
    } else {
      start()
    }
    return muted
  }

  // Duck the music while someone is talking so speech stays legible.
  function duck(on) {
    if (!ctx || !musicGain) return
    musicGain.gain.cancelScheduledValues(ctx.currentTime)
    musicGain.gain.linearRampToValueAtTime(on ? 0.1 : 0.34, ctx.currentTime + 0.6)
  }

  // Waves louder near the shore (south edge of the map).
  function setListener(z) {
    if (!ambGain || !ctx) return
    const near = Math.max(0, Math.min(1, (z + 6) / 26))
    ambGain.gain.setTargetAtTime(0.18 + near * 0.7, ctx.currentTime, 0.8)
  }

  return { start, toggleMute, isMuted: () => muted, duck, setListener }
}
