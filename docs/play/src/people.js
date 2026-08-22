import * as THREE from 'three'
import { PAL, mat, rbox, cyl, sph } from './kit.js'

// One body plan, many people — the 3D version of "one rig, swappable outfits".
// Camera sits low (three-quarter Dota view) so faces and fronts matter: every
// head gets real eyes, brows, nose, mouth, ears, and a proper hairstyle.

// small helpers ---------------------------------------------------------------

function noShadowSph(r, colour, detail = 1) {
  const m = sph(r, colour, detail)
  m.castShadow = false
  return m
}

function makeEye(side) {
  const eye = new THREE.Group()
  const sclera = noShadowSph(0.052, 0xf6f2ea, 1)
  sclera.scale.set(1, 1.18, 0.62)
  eye.add(sclera)
  const pupil = noShadowSph(0.026, 0x241f1a, 1)
  pupil.scale.set(1, 1.25, 0.6)
  pupil.position.z = 0.028
  eye.add(pupil)
  // upper eyelid — skin-toned cap so the eye reads friendly, not startled
  eye.userData.side = side
  return eye
}

function makeGlasses(hairColour) {
  const g = new THREE.Group()
  const frameMat = mat(0x2b2622, { rough: 0.5, metal: 0.3 })
  for (const side of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 14), frameMat)
    ring.position.set(side * 0.105, 0.025, 0.275)
    ring.castShadow = false
    g.add(ring)
  }
  const bridge = rbox(0.07, 0.016, 0.016, 0x2b2622, 0.005)
  bridge.position.set(0, 0.035, 0.278)
  bridge.castShadow = false
  g.add(bridge)
  for (const side of [-1, 1]) {
    const temple = rbox(0.016, 0.014, 0.2, 0x2b2622, 0.005)
    temple.position.set(side * 0.185, 0.03, 0.17)
    temple.castShadow = false
    g.add(temple)
  }
  return g
}

function makeHead(look) {
  const head = new THREE.Group()
  const skin = look.skin
  const hairC = look.hair

  const skull = sph(0.29, skin, 2)
  skull.scale.set(1, 1.08, 0.95)
  head.add(skull)

  // jaw / chin — pushes the lower face forward slightly, less "beach ball"
  const jaw = sph(0.2, skin, 1)
  jaw.scale.set(1.15, 0.8, 0.95)
  jaw.position.set(0, -0.14, 0.05)
  head.add(jaw)

  // ears
  for (const side of [-1, 1]) {
    const ear = sph(0.06, skin, 1)
    ear.scale.set(0.5, 1, 0.8)
    ear.position.set(side * 0.285, -0.01, 0.0)
    ear.castShadow = false
    head.add(ear)
  }

  // eyes: white sclera + dark pupil, slightly oval
  for (const side of [-1, 1]) {
    const eye = makeEye(side)
    eye.position.set(side * 0.105, 0.025, 0.245)
    head.add(eye)
    // eyelid — thin skin ledge above the eye
    const lid = rbox(0.105, 0.028, 0.045, skin, 0.01)
    lid.position.set(side * 0.105, 0.085, 0.255)
    lid.rotation.x = -0.25
    lid.castShadow = false
    head.add(lid)
    // brow
    const brow = rbox(0.1, 0.026, 0.032, hairC, 0.009)
    brow.position.set(side * 0.107, 0.125, 0.262)
    brow.rotation.z = side * -0.12
    brow.castShadow = false
    head.add(brow)
  }

  // nose — small rounded box, sits proud of the face
  const nose = rbox(0.06, 0.085, 0.075, skin, 0.025)
  nose.position.set(0, -0.045, 0.29)
  nose.castShadow = false
  head.add(nose)

  // mouth — thin torus arc read as a gentle smile
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.014, 5, 12, Math.PI * 0.75),
    mat(0x8a4a3f),
  )
  mouth.position.set(0, -0.115, 0.252)
  mouth.rotation.z = Math.PI + Math.PI * 0.125
  mouth.castShadow = false
  head.add(mouth)

  // moustache
  if (look.moustache) {
    const mo = rbox(0.17, 0.05, 0.05, hairC, 0.02)
    mo.position.set(0, -0.1, 0.27)
    mo.castShadow = false
    head.add(mo)
    // hide the mouth arc a touch lower so it peeks below the moustache
    mouth.position.y = -0.155
  }

  if (look.glasses) head.add(makeGlasses(hairC))

  // hair — several distinct styles from a few meshes
  if (look.bald) {
    // bald with a low fringe of hair around the back and sides
    const fringe = new THREE.Mesh(
      new THREE.SphereGeometry(0.297, 12, 6, Math.PI * 0.65, Math.PI * 1.7, Math.PI * 0.42, Math.PI * 0.3),
      mat(hairC),
    )
    fringe.position.y = 0.03
    fringe.castShadow = false
    head.add(fringe)
  } else if (look.curly) {
    // curly cap — cluster of small icosahedra
    const offs = [
      [0, 0.24, 0.02], [0.15, 0.2, 0.08], [-0.15, 0.2, 0.08],
      [0.2, 0.14, -0.1], [-0.2, 0.14, -0.1], [0, 0.2, -0.18],
      [0.12, 0.22, -0.06], [-0.12, 0.22, -0.06], [0, 0.26, -0.1],
    ]
    for (const [x, y, z] of offs) {
      const curl = sph(0.11 + (Math.abs(x) < 0.01 ? 0.02 : 0), hairC, 1)
      curl.position.set(x, y, z)
      head.add(curl)
    }
  } else {
    // side-parted cap
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.307, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
      mat(hairC),
    )
    cap.position.y = 0.04
    cap.castShadow = true
    head.add(cap)
    // fringe swept to one side across the forehead
    const sweep = rbox(0.26, 0.07, 0.1, hairC, 0.03)
    sweep.position.set(0.06, 0.19, 0.22)
    sweep.rotation.z = -0.18
    sweep.castShadow = false
    head.add(sweep)
  }

  if (look.bun) {
    const bun = sph(0.13, hairC, 1)
    bun.position.set(0, 0.12, -0.26)
    head.add(bun)
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 5, 10), mat(0xb4402f))
    tie.position.set(0, 0.09, -0.21)
    tie.rotation.x = 0.5
    tie.castShadow = false
    head.add(tie)
  }

  if (look.hat) {
    const brim = cyl(0.42, 0.42, 0.035, 12, look.hat)
    brim.position.y = 0.21
    head.add(brim)
    const crown = cyl(0.24, 0.26, 0.24, 12, look.hat)
    crown.position.y = 0.33
    head.add(crown)
    const band = cyl(0.265, 0.268, 0.06, 12, 0x8a4a3f)
    band.position.y = 0.245
    band.castShadow = false
    head.add(band)
  }

  return head
}

export function buildPerson(look) {
  const g = new THREE.Group()
  const s = look.scale !== undefined ? look.scale : 1
  const belly = look.belly !== undefined ? look.belly : 0
  const body = new THREE.Group()

  const trouserC = look.trousers ?? 0x4a4550

  // legs + shoes
  for (const side of [-1, 1]) {
    const leg = cyl(0.115, 0.13, 0.6, 8, trouserC)
    leg.position.set(side * 0.14, 0.3, 0)
    body.add(leg)
    const shoe = rbox(0.19, 0.11, 0.32, 0x39322c, 0.045)
    shoe.position.set(side * 0.14, 0.06, 0.06)
    body.add(shoe)
    const toe = rbox(0.15, 0.07, 0.1, 0x2b2620, 0.03)
    toe.position.set(side * 0.14, 0.05, 0.2)
    toe.castShadow = false
    body.add(toe)
  }

  // torso — shirt, wider at the hips, optional belly bulge
  const torso = cyl(0.29, 0.35 + belly * 0.05, 0.78, 10, look.outfit)
  torso.position.y = 1.0
  body.add(torso)
  if (belly > 0) {
    const tum = sph(0.24 + belly * 0.1, look.outfit, 1)
    tum.scale.set(1.15, 0.95, 0.9)
    tum.position.set(0, 0.88, 0.1 + belly * 0.06)
    body.add(tum)
  }

  // belt line where shirt meets trousers
  const belt = cyl(0.315 + belly * 0.05, 0.325 + belly * 0.05, 0.07, 10, 0x3a2e24)
  belt.position.y = 0.63
  belt.castShadow = false
  body.add(belt)
  const buckle = rbox(0.09, 0.06, 0.03, 0xc9a227, 0.012)
  buckle.position.set(0, 0.63, 0.32 + belly * 0.05)
  buckle.castShadow = false
  body.add(buckle)

  // collar — open V-collar band at the neck
  const collar = cyl(0.15, 0.21, 0.1, 8, look.outfit)
  collar.position.y = 1.41
  body.add(collar)
  for (const side of [-1, 1]) {
    const lapel = rbox(0.1, 0.14, 0.04, 0xf7efe4, 0.015)
    lapel.position.set(side * 0.09, 1.32, 0.2)
    lapel.rotation.z = side * 0.5
    lapel.castShadow = false
    body.add(lapel)
  }

  // neck
  const neck = cyl(0.09, 0.1, 0.14, 8, look.skin)
  neck.position.y = 1.44
  body.add(neck)

  if (look.accent) {
    const apron = rbox(0.44, 0.56, 0.14, look.accent, 0.05)
    apron.position.set(0, 0.94, 0.24 + belly * 0.06)
    body.add(apron)
    const strap = rbox(0.3, 0.05, 0.05, look.accent, 0.02)
    strap.position.set(0, 1.26, 0.24)
    strap.castShadow = false
    body.add(strap)
  }

  // arms — shirt sleeve rolled at the elbow, bare forearm, hand
  const arms = []
  for (const side of [-1, 1]) {
    const arm = new THREE.Group()
    const sleeve = cyl(0.095, 0.1, 0.32, 7, look.outfit)
    sleeve.position.y = -0.16
    arm.add(sleeve)
    const cuff = cyl(0.105, 0.105, 0.06, 7, 0xf7efe4)
    cuff.position.y = -0.32
    cuff.castShadow = false
    arm.add(cuff)
    const forearm = cyl(0.075, 0.08, 0.3, 7, look.skin)
    forearm.position.y = -0.49
    arm.add(forearm)
    const hand = sph(0.095, look.skin, 1)
    hand.scale.set(0.9, 1.05, 0.9)
    hand.position.y = -0.68
    arm.add(hand)
    arm.position.set(side * (0.4 + belly * 0.03), 1.3, 0)
    arm.rotation.z = side * 0.14
    body.add(arm)
    arms.push(arm)
  }

  // shoulders — round off the arm joints
  for (const side of [-1, 1]) {
    const sh = sph(0.12, look.outfit, 1)
    sh.position.set(side * (0.36 + belly * 0.03), 1.32, 0)
    body.add(sh)
  }

  const head = makeHead(look)
  head.position.y = 1.68
  body.add(head)

  g.add(body)
  g.userData.head = head
  g.userData.body = body
  g.userData.arms = arms
  g.scale.setScalar(s)
  return g
}

// --- animals ----------------------------------------------------------------

export function buildDog() {
  const g = new THREE.Group()
  const body = new THREE.Group()
  const trunk = rbox(0.32, 0.3, 0.72, 0xb08a5a, 0.1)
  trunk.position.y = 0.38
  body.add(trunk)
  const chest = sph(0.16, 0xc9a06b, 1)
  chest.position.set(0, 0.36, 0.32)
  body.add(chest)

  const head = new THREE.Group()
  const skull = sph(0.17, 0xb08a5a, 1)
  head.add(skull)
  const snout = rbox(0.14, 0.11, 0.19, 0x9a744a, 0.045)
  snout.position.set(0, -0.04, 0.17)
  head.add(snout)
  const nose = sph(0.038, 0x2b2119, 1)
  nose.position.set(0, -0.01, 0.28)
  nose.castShadow = false
  head.add(nose)
  // tongue
  const tongue = rbox(0.05, 0.02, 0.09, 0xd97070, 0.01)
  tongue.position.set(0.02, -0.1, 0.22)
  tongue.rotation.x = 0.35
  tongue.castShadow = false
  head.add(tongue)
  for (const s of [-1, 1]) {
    // floppy ears
    const ear = rbox(0.09, 0.17, 0.045, 0x8a6f42, 0.03)
    ear.position.set(s * 0.14, 0.06, -0.02)
    ear.rotation.z = s * -0.55
    head.add(ear)
    // real eyes: sclera + pupil
    const sclera = noShadowSph(0.036, 0xf6f2ea, 1)
    sclera.scale.set(1, 1.1, 0.6)
    sclera.position.set(s * 0.075, 0.05, 0.135)
    head.add(sclera)
    const pupil = noShadowSph(0.02, 0x241f1a, 1)
    pupil.position.set(s * 0.075, 0.05, 0.158)
    head.add(pupil)
    // brow spots — classic friendly-dog markings
    const spot = noShadowSph(0.028, 0xc9a06b, 1)
    spot.position.set(s * 0.075, 0.115, 0.12)
    head.add(spot)
  }
  head.position.set(0, 0.56, 0.34)
  body.add(head)

  for (const [x, z] of [[-0.11, 0.24], [0.11, 0.24], [-0.11, -0.24], [0.11, -0.24]]) {
    const leg = cyl(0.045, 0.05, 0.28, 6, 0x9a744a)
    leg.position.set(x, 0.14, z)
    body.add(leg)
    const paw = sph(0.05, 0x8a6f42, 1)
    paw.scale.set(1, 0.6, 1.2)
    paw.position.set(x, 0.03, z + 0.02)
    body.add(paw)
  }
  const tail = cyl(0.03, 0.05, 0.3, 5, 0xb08a5a)
  tail.position.set(0, 0.52, -0.4)
  tail.rotation.x = -0.9
  body.add(tail)
  const tailTip = sph(0.045, 0xc9a06b, 1)
  tailTip.position.set(0, 0.66, -0.5)
  body.add(tailTip)
  g.add(body)
  g.userData.body = body
  g.userData.head = head
  g.userData.tail = tail
  return g
}

export function buildCat(colour = 0x4a4038) {
  const g = new THREE.Group()
  const trunk = rbox(0.2, 0.2, 0.42, colour, 0.07)
  trunk.position.y = 0.2
  g.add(trunk)
  const head = new THREE.Group()
  const skull = sph(0.12, colour, 1)
  head.add(skull)
  // muzzle + pink nose
  const muzzle = sph(0.06, colour, 1)
  muzzle.scale.set(1.2, 0.8, 0.9)
  muzzle.position.set(0, -0.035, 0.09)
  head.add(muzzle)
  const nose = noShadowSph(0.018, 0xd98a8a, 1)
  nose.position.set(0, -0.015, 0.135)
  head.add(nose)
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 4), mat(colour))
    ear.position.set(s * 0.07, 0.12, -0.02)
    ear.castShadow = true
    head.add(ear)
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.05, 4), mat(0xd98a8a))
    inner.position.set(s * 0.07, 0.11, -0.005)
    inner.castShadow = false
    head.add(inner)
    // eyes: green cat eyes with slit pupils
    const iris = noShadowSph(0.026, 0x9ab84a, 1)
    iris.scale.set(1, 1.15, 0.5)
    iris.position.set(s * 0.055, 0.02, 0.1)
    head.add(iris)
    const slit = noShadowSph(0.012, 0x241f1a, 1)
    slit.scale.set(0.55, 1.5, 0.5)
    slit.position.set(s * 0.055, 0.02, 0.113)
    head.add(slit)
    // whiskers
    for (const dy of [-0.005, 0.015]) {
      const wh = rbox(0.11, 0.005, 0.005, 0xd8d3c8, 0.002)
      wh.position.set(s * 0.1, -0.03 + dy, 0.1)
      wh.rotation.y = s * -0.35
      wh.rotation.z = s * (dy > 0 ? 0.12 : -0.08)
      wh.castShadow = false
      head.add(wh)
    }
  }
  head.position.set(0, 0.38, 0.2)
  g.add(head)
  const tail = cyl(0.02, 0.03, 0.35, 5, colour)
  tail.position.set(0.08, 0.28, -0.25)
  tail.rotation.x = -1.1
  g.add(tail)
  return g
}

export function buildGull() {
  const g = new THREE.Group()
  const body = sph(0.12, 0xf2ede0, 1)
  body.scale.set(1, 0.9, 1.35)
  body.position.y = 0.16
  g.add(body)
  const head = sph(0.075, 0xf2ede0, 1)
  head.position.set(0, 0.28, 0.13)
  g.add(head)
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 5), mat(0xe8a03a))
  beak.rotation.x = Math.PI / 2
  beak.position.set(0, 0.27, 0.23)
  g.add(beak)
  // beady black eyes with a white glint
  for (const s of [-1, 1]) {
    const eye = noShadowSph(0.016, 0x241f1a, 1)
    eye.position.set(s * 0.05, 0.3, 0.175)
    g.add(eye)
    const glint = noShadowSph(0.005, 0xffffff, 0)
    glint.position.set(s * 0.055, 0.31, 0.185)
    g.add(glint)
  }
  for (const s of [-1, 1]) {
    const wing = rbox(0.16, 0.03, 0.24, 0xd8d3c8, 0.015)
    wing.position.set(s * 0.1, 0.2, -0.02)
    wing.rotation.z = s * 0.15
    g.add(wing)
    // grey wingtip
    const tip = rbox(0.08, 0.028, 0.09, 0x8a867c, 0.01)
    tip.position.set(s * 0.13, 0.2, -0.14)
    tip.castShadow = false
    g.add(tip)
  }
  // tail feathers
  const tailF = rbox(0.09, 0.025, 0.14, 0xd8d3c8, 0.01)
  tailF.position.set(0, 0.17, -0.2)
  tailF.rotation.x = 0.2
  g.add(tailF)
  // little orange legs
  for (const s of [-1, 1]) {
    const leg = cyl(0.008, 0.008, 0.08, 4, 0xe8a03a)
    leg.position.set(s * 0.035, 0.05, 0.02)
    leg.castShadow = false
    g.add(leg)
  }
  return g
}

// --- the cast ---------------------------------------------------------------

export const RESIDENTS = [
  {
    id: 'coach',
    name: 'Marco',
    age: 35,
    role: 'tumhara coach · speaks English',
    doing: 'leaning on the plaza railing with a coffee, watching the town wake up',
    agenda: 'you want to know how they are actually finding it here — homesick? frustrated? you have been the foreigner before and you remember',
    persona: 'You are the one person in Pueblo who speaks English. You lived in Manchester for six years and came back. You help the newcomer settle in: you give them small missions, debrief their conversations, and point them at the next person worth talking to. You are warm, direct, never condescending, and you never do the talking for them. If they ask you how to say something, help them — then push them to go say it to a real person.',
    backstory: 'Born in Pueblo, left at 22 for Manchester with terrible English and a suitcase. Six years washing dishes, then managing the restaurant. Came back when his father got sick; stayed after he recovered. Knows exactly what it feels like to stand in a foreign street unable to say anything — it is why he coaches newcomers for free.',
    goal: 'Wants to open a language café on the beachfront where locals and foreigners actually mix. Is quietly saving for the deposit and scouting locations.',
    relationships: 'Rosa fed him after school as a kid and he still cannot say no to her. Thinks Tomás is full of it but loves him. Respects Doña Carmen and is one of three people she actually likes. Miguel reminds him painfully of his own restless younger self.',
    look: { skin: 0xc98f66, outfit: 0x6f8144, accent: 0xf2ede2, hair: 0x3a352f, trousers: 0x3f4550, scale: 1.02, curly: true },
    tile: [19, 11],
    facing: Math.PI / 2,
    opener: 'Hey — you made it in one piece! Deep breath. First things first: food. Pilar runs the fruit stall on the east side. Go buy three bananas — in Hindi. Say: mujhe teen kele chahiye. You can do this.',
    openerEn: '',
    fallback: {
      greet: 'Hey! How is it going out there?',
      request: 'Say that to Pilar, not me. Go on.',
      intro: 'Marco. Good to meet you properly.',
      thanks: 'Anytime. That is literally my job.',
      question: 'Try Pilar at the fruit stall — say: mujhe teen kele chahiye. You have got this.',
      short: 'Give me a bit more than that and I can actually help.',
      default: 'Nice. Now go say that to someone who does not speak English.',
    },
  },
  {
    id: 'pilar',
    name: 'Pilar',
    age: 41,
    role: 'phal wali · fruit seller',
    doing: 'stacking crates at your fruit stall, half an eye on every passer-by',
    agenda: 'the tomatoes came in bad this week and you are furious about it; also you want to know where this foreigner is from and whether they can cook',
    persona: 'You run the fruit stall in the market row. You are quick, funny, and you run the stall like a tiny kingdom. Your bananas (plátanos) are famous and you know it. You like foreigners who try; you playfully refuse to understand English or pointing — words only.',
    backstory: 'Third generation on that stall — her grandmother started it selling lemons from a basket. Raised two kids on it alone after her husband left for Valencia with a hairdresser; she says it was the best thing he ever did for her. Her plátanos come from her cousin in the Canaries.',
    goal: 'Wants her daughter to take over the stall someday, but the daughter wants to study engineering in Sevilla — and Pilar is secretly proud of that and torn about it.',
    relationships: 'Best friends with Rosa since school — they tell each other everything. A running feud with Tomás about whose corner of the market gets the shade. Adores Lucía and slips her fruit. Finds Doña Carmen exhausting and hides behind the crates when she approaches.',
    look: { skin: 0xdca57e, outfit: 0xe8c56a, accent: 0x6f8144, hair: 0x3a2f28, trousers: 0x4a4550, bun: true, scale: 0.99 },
    tile: [28, 11],
    facing: Math.PI / 2,
    opener: 'Namaste namaste! Taaze phal, ekdum taaze! Kya chahiye beta?',
    openerEn: 'Hello hello! Fresh fruit, totally fresh! What do you need, dear?',
    fallback: {
      greet: 'Namaste beta! Kya doon?',
      request: 'Abhi lo! Kitne chahiye?',
      intro: 'Accha! Main Pilar hoon. Poore sheher mein sabse acche phal mere paas.',
      thanks: 'Arre koi baat nahi! Phir aana.',
      question: 'Kele hain, santre hain, tamatar hain... sab ekdum badhiya.',
      short: 'Kya? Bol ke batao beta, ishaaron se nahi bechti.',
      default: 'Hmm... ye haan hai ya na?',
    },
  },
  {
    id: 'rosa',
    name: 'Rosa',
    age: 58,
    role: 'roti wali · baker',
    doing: 'wiping flour off the counter, the morning rush just finished',
    agenda: 'your sister in the next town is not speaking to you and it is eating at you; you also want to feed this skinny foreigner properly',
    persona: 'You run the bakery north of the plaza. You open at five and you are cheerful until about noon. You are proud of your bread and you tease people you like. You notice everything about how people speak and you enjoy correcting them gently, like an aunt would.',
    backstory: 'Married to Paco the fisherman for thirty years until he died at sea eight years ago; the bakery kept her alive afterwards, and she means that literally. Her bread won a provincial prize in 2019, and the framed certificate hangs behind the counter — she pretends it is nothing and it is everything.',
    goal: 'Her sister Marisol in the next town has not spoken to her since a fight about their mother\'s house two years ago. Rosa wants to fix it and does not know how, and it leaks into her conversations as unsolicited advice about calling your family.',
    relationships: 'Pilar is her best friend and co-conspirator. She half-raised Marco and takes credit for his manners. Doña Carmen was her mother\'s friend and Rosa is the other person Carmen likes. She saves the burnt loaves for Lucía\'s family without ever mentioning it.',
    look: { skin: 0xe8b48c, outfit: 0xf2ede2, accent: 0xc0392b, hair: 0x5a5260, trousers: 0x5a5260, bun: true, scale: 0.97, belly: 0.35 },
    tile: [14, 6],
    facing: 0,
    opener: 'Suprabhat beta! Wahi roz waala doon?',
    openerEn: 'Good morning! The usual?',
    fallback: {
      greet: 'Suprabhat beta! Aaj kya doon?',
      request: 'Abhi laayi. Aur kuch chahiye?',
      intro: 'Arre wah, milke accha laga! Main Rosa hoon. Ab toh roz milenge.',
      thanks: 'Koi baat nahi beta. Kal phir aana.',
      question: 'Uff, mujhe nahi pata... Marco se poocho, usko sab pata hai.',
      short: 'Haan...? Aur bolo, main kaat-ti nahi.',
      default: 'Accha accha. Lo, garam roti.',
    },
  },
  {
    id: 'tomas',
    name: 'Tomás',
    age: 44,
    role: 'machhli wala · fishmonger',
    doing: 'gutting fish at your stall, sleeves rolled, shouting at nobody in particular',
    agenda: 'you got up at four and you want everyone to know it; you are also convinced the new harbour rules are a scandal',
    persona: 'You sell fish at the market. You exaggerate constantly, especially about the size of fish and how early you got up. You are loud, warm, and you call everyone jefe or campeón. You are a bit of a showman.',
    backstory: 'Fourth generation fisherman. Went out on his father\'s boat at nine and never seriously considered anything else. His wife Encarna keeps the accounts and is the only person he never exaggerates to, because she checks. The story about the giant tuna is, incredibly, mostly true — there was a photo, but it was lost when his phone fell in the harbour.',
    goal: 'Wants to buy a second boat so his son can skipper his own instead of leaving for the mainland like everyone else\'s kids. The new harbour fees are eating the savings and it genuinely scares him, which is why he shouts about them.',
    relationships: 'The shade feud with Pilar is fifteen years old and both would be lost without it. Drinks one beer with Miguel after close and lectures him about ambition. Was Paco\'s crewmate — he checks on Rosa without ever calling it that, and buys more bread than one man can eat.',
    look: { skin: 0xd9a06b, outfit: 0x3f6f9a, accent: 0xe8c56a, hair: 0x2e2a26, trousers: 0x3a3f4a, hat: 0xe8dcc0, scale: 1.06, moustache: true, belly: 0.6 },
    tile: [28, 14],
    facing: Math.PI / 2,
    opener: 'Arre boss! Ye machhli... itni badi thi, ITNI!',
    openerEn: 'Hey boss! This fish... it was THIS big!',
    fallback: {
      greet: 'Arre bhai, aao aao! Taazi machhli chahiye?',
      request: 'Abhi lo boss! Subah ki pakdi hui, ekdum taazi.',
      intro: 'Milke khushi hui! Tomas — poore sheher ki sabse acchi machhli mere paas.',
      thanks: 'Arre tumhara shukriya, champion!',
      question: 'Dekho bhai, wo toh din pe depend karta hai...',
      short: 'Hain? Zor se bolo boss, yahan shor hai.',
      default: 'Kasam se, itni badi machhli zindagi mein nahi dekhi.',
    },
  },
  {
    id: 'carmen',
    name: 'Doña Carmen',
    age: 79,
    role: 'padosan · neighbour',
    doing: 'sitting in your chair by the door, watching the street',
    agenda: 'the people on the third floor made noise until three in the morning again and NOBODY is doing anything about it; also you have decided to find out exactly who this newcomer is',
    persona: 'You sit outside your door on the west street and watch everything. You know everything about everyone and share it freely. You are sharp, a little suspicious of newcomers, and you have strong opinions about noise, plants, and young people. You remember every slight.',
    backstory: 'Seventy-nine, widowed twice, outlived both without much comment. Taught primary school in Pueblo for forty years, which means she taught half the town to read, including Marco, Rosa and the mayor — and she reminds them when useful. Her balcony faces the plaza on purpose: her late second husband chose the flat for the view, and she chose it for the surveillance.',
    goal: 'Officially: to get the third-floor neighbours to shut up after midnight. Actually: to still matter — to be the person who knows things, because being informed is the last job nobody can retire you from. A newcomer is the most interesting thing to happen in months, and she intends to be the first to fully decode them.',
    relationships: 'Approves of exactly three people: Rosa, Marco, and the priest, in that order. Considers Pilar too loud and Tomás a fabulist, and is correct on both counts. Lucía is the only person allowed to interrupt her, a privilege Carmen pretends she has not noticed granting.',
    look: { skin: 0xe3b598, outfit: 0x4a4258, accent: 0x8a9a5b, hair: 0xd8d3cc, trousers: 0x4a4258, bun: true, scale: 0.9, glasses: true },
    tile: [9, 10],
    facing: Math.PI / 2,
    opener: 'Main yahan se sab dekhti hoon, pata hai?',
    openerEn: 'I see everything from here, you know?',
    fallback: {
      greet: 'Namaste. Tum hi naye ho na?',
      request: 'Arre beta, main yahan kuch bechti nahi.',
      intro: 'Accha. Theek hai, swagat hai... shayad.',
      thanks: 'Hmm. Kam se kam tameez toh hai.',
      question: 'Arre, naye ho ke bade sawaal poochte ho.',
      short: 'Kya? Saaf bolo beta.',
      default: 'Accha. Main kuch nahi kehti, par mujhe sab pata hai.',
    },
  },
  {
    id: 'miguel',
    name: 'Miguel',
    age: 27,
    role: 'chai wala · waiter',
    doing: 'wiping down a table on the terrace, in no particular hurry',
    agenda: 'you are supposed to be saving to move to Madrid and you are not saving; you would rather talk about football or where the foreigner is from',
    persona: 'You wait tables at the café on the west side of the plaza. You are easygoing, a little too relaxed, always about to take a break. You give great recommendations and terrible directions. You want to move to Madrid someday, maybe, probably, some year.',
    backstory: 'Grew up in Pueblo, did two years of business studies in Málaga, came back for the summer four years ago. The café job was temporary then and is temporary now. Plays right wing for the town futsal team, quite well, which is the one thing he never mentions casually because it actually matters to him.',
    goal: 'The Madrid plan: a friend has a bar there and keeps offering him the assistant manager job. He has almost said yes three times. He tells everyone he is saving for the move; his savings have not moved in a year, and deep down he suspects he does not actually want to go — which is scarier than going.',
    relationships: 'Marco is the only one who calls out the Madrid thing honestly, which Miguel both hates and needs. Half in love with Pilar\'s daughter, a fact the entire town knows except possibly her. Tomás lectures him weekly and Miguel would genuinely miss it. Slips Chispa leftovers, so Lucía has decided he is excellent.',
    look: { skin: 0xd9a06b, outfit: 0xf2ede2, accent: 0x2b2119, hair: 0x241f1a, trousers: 0x2b2119, scale: 1.0, curly: true },
    tile: [13, 13],
    facing: Math.PI / 2,
    opener: 'Chai? Coffee? Kahin bhi baitho, abhi aaya.',
    openerEn: 'Tea? Coffee? Sit anywhere, I will be right there.',
    fallback: {
      greet: 'Aao... ek ke liye table?',
      request: 'Abhi laaya. Yahin piyoge?',
      intro: 'Miguel. Milke accha laga yaar.',
      thanks: 'Arre kuch nahi. Aur kuch?',
      question: 'Uff, accha sawaal hai. Cutting chai, bina shak.',
      short: 'Hain?',
      default: 'Theek hai theek hai... abhi laata hoon.',
    },
  },
  {
    id: 'lucia',
    name: 'Lucía',
    age: 9,
    role: 'mohalle ki bacchi · local kid',
    doing: 'crouched on the plaza stones, trying to get Chispa to sit',
    agenda: 'you want to know EVERYTHING about the foreigner — do they have a dog, do they have snow where they live, can they whistle — and you want to show them your dog',
    persona: 'You are nine and you know every corner, cat and shortcut in Pueblo. You talk fast, ask a lot of questions, and find the foreigner absolutely fascinating. You use simple words, which accidentally makes you the best Spanish teacher in town. Your dog is called Chispa.',
    backstory: 'Nine years old, born in Pueblo, youngest of three. Found Chispa as a puppy in a box behind the market two summers ago and negotiated keeping her with a determination that broke her parents in a day. Knows every cat, shortcut, and loose paving stone in town. Is at that exact age where every adult is a potential source of fascinating information.',
    goal: 'Current projects: teach Chispa to sit (failing), find out if it snows where the foreigner comes from (pending), and convince her parents she is old enough to take the bus to the next town alone (long-term campaign).',
    relationships: 'Chispa is the centre of the universe. Pilar gives her fruit and Rosa gives her bread ends, and she has both women wrapped around her finger. She is the only person Doña Carmen lets interrupt her, and Lucía has no idea this is remarkable. The foreigner is currently the most interesting thing in her entire life.',
    look: { skin: 0xe8b48c, outfit: 0xdb6f8f, accent: 0xf2ede2, hair: 0x2e2117, trousers: 0x4a6fa8, scale: 0.62, bun: true },
    tile: [23, 14],
    facing: -Math.PI / 2,
    opener: 'Hello! Tum kahan se ho? Tumhare paas kutta hai? Mere paas hai. Iska naam Chispa hai!',
    openerEn: 'Hi! Where are you from? Do you have a dog? I do. Her name is Chispa!',
    fallback: {
      greet: 'Hello hello! Kheloge?',
      request: 'Main kuch nahi bechti! Par saath chaloon?',
      intro: 'Main Lucia hoon! Aur ye kutta Chispa hai.',
      thanks: 'Koi baat nahi! Suno, tumhare paas kutta hai?',
      question: 'Mujhe pata hai, mujhe pata hai! Accha... nahi pata. Marco se poocho.',
      short: 'Iska kya matlab hai? Aur bolo na.',
      default: 'Hehe, kitna ajeeb bolte ho. Mazaa aata hai.',
    },
  },
  {
    id: 'padre',
    name: 'Padre Antonio',
    age: 66,
    role: 'padri · priest',
    doing: 'sweeping the church steps very slowly',
    agenda: 'the bell mechanism is sticking again and it worries you; any topic will eventually become a story about the tower',
    persona: 'You are the priest of the church on the north side. You are gentle, slightly deaf in one ear, and you love two things: your bell tower and long stories that lose their point halfway. You speak slowly and clearly, which makes you easy to understand.',
    backstory: 'Arrived in Pueblo as a young priest in 1987 for two or three years and simply never left. Half-deaf in the left ear from an artillery accident during military service, a story he tells in nine different versions. Genuinely learned in Roman-era local history; the church tower is his life\'s scholarly work and his retirement plan is a small book about it that he has been finishing for eleven years.',
    goal: 'The bell mechanism sticks on cold mornings and the diocese will not pay for the repair. He is running a quiet, extremely slow fundraising campaign that is mostly him mentioning it sadly to everyone. Also: finish the book. Realistically: mention the book.',
    relationships: 'Doña Carmen is his fiercest critic and most reliable attendee, and their weekly argument after mass is a form of friendship neither would name. He baptised Miguel, Lucía, and Pilar\'s kids. He lets Lucía ring the bell on her birthday, which is illegal by his own rules.',
    look: { skin: 0xe3b598, outfit: 0x2b2830, accent: 0xf2ede2, hair: 0xd8d3cc, trousers: 0x2b2830, bald: true, scale: 1.0, glasses: true, belly: 0.3 },
    tile: [23, 5],
    facing: Math.PI,
    opener: 'Aao beta, swagat hai. Ghantaghar dekha? San 1712 ka hai...',
    openerEn: 'Welcome, child. Have you seen the bell tower? From the year 1712...',
    fallback: {
      greet: 'Aao aao beta. Bhagwan bhala kare.',
      request: 'Yahan toh bas salaah milti hai beta. Aur wo muft hai.',
      intro: 'Swagat hai beta. Main Antonio hoon.',
      thanks: 'Koi baat nahi beta.',
      question: 'Aah... isse ek kahani yaad aayi. Dekho, 1985 mein...',
      short: 'Hain? Is taraf se bolo beta, us kaan se sunai nahi deta.',
      default: 'Sahi hai, sahi hai... is ghantaghar ki tarah, sab jhel jaata hai.',
    },
  },
]

// ambient villagers — no dialogue, they just live here
export const WANDER_LOOKS = [
  { skin: 0xdca57e, outfit: 0x8a6f9a, hair: 0x3a2f28, trousers: 0x4a4550, curly: true },
  { skin: 0xe8b48c, outfit: 0x4a8fc9, hair: 0x241f1a, trousers: 0x3a3f4a, moustache: true },
  { skin: 0xc98f66, outfit: 0xc0704a, hair: 0x2e2a26, trousers: 0x4a4550, hat: 0xe8dcc0, belly: 0.5 },
  { skin: 0xe3b598, outfit: 0x6f8144, hair: 0x5a5260, trousers: 0x5a5260, bun: true, glasses: true },
  { skin: 0xd9a06b, outfit: 0xf2ede2, hair: 0x3a352f, trousers: 0x2b2119, moustache: true, belly: 0.3 },
  { skin: 0xdca57e, outfit: 0xdb8f4a, hair: 0xd8d3cc, trousers: 0x4a4258, bun: true, scale: 0.92, glasses: true },
  { skin: 0xe8b48c, outfit: 0x9fc4e8, hair: 0x2e2117, trousers: 0x4a6fa8, scale: 0.6, curly: true },
  { skin: 0xc98f66, outfit: 0xa63a52, hair: 0x241f1a, trousers: 0x3a3f4a, bald: true, belly: 0.4 },
]
