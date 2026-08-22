import * as THREE from 'three'
import { PAL, mat, rbox, cyl, sph } from './kit.js'

// One body plan, many people — the 3D version of "one rig, swappable outfits".

export function buildPerson(look) {
  const g = new THREE.Group()
  const s = look.scale !== undefined ? look.scale : 1
  const body = new THREE.Group()

  // legs
  for (const side of [-1, 1]) {
    const leg = cyl(0.115, 0.13, 0.6, 8, look.trousers ?? 0x4a4550)
    leg.position.set(side * 0.14, 0.3, 0)
    body.add(leg)
    const shoe = rbox(0.19, 0.11, 0.3, 0x39322c, 0.045)
    shoe.position.set(side * 0.14, 0.06, 0.05)
    body.add(shoe)
  }

  // torso
  const torso = cyl(0.29, 0.35, 0.78, 10, look.outfit)
  torso.position.y = 1.0
  body.add(torso)

  // apron / sash
  if (look.accent) {
    const apron = rbox(0.44, 0.56, 0.14, look.accent, 0.05)
    apron.position.set(0, 0.94, 0.24)
    body.add(apron)
  }

  // arms — slight outward angle so the silhouette reads
  const arms = []
  for (const side of [-1, 1]) {
    const arm = new THREE.Group()
    const upper = cyl(0.085, 0.085, 0.62, 7, look.outfit)
    upper.position.y = -0.31
    arm.add(upper)
    const hand = sph(0.095, look.skin, 1)
    hand.position.y = -0.66
    arm.add(hand)
    arm.position.set(side * 0.4, 1.3, 0)
    arm.rotation.z = side * 0.14
    body.add(arm)
    arms.push(arm)
  }

  // head
  const head = new THREE.Group()
  const skull = sph(0.29, look.skin, 2)
  skull.scale.set(1, 1.08, 0.95)
  head.add(skull)
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.305, 12, 8, 0, Math.PI * 2, 0, Math.PI * (look.bald ? 0.32 : 0.58)),
    mat(look.hair),
  )
  hair.position.y = 0.035
  hair.castShadow = true
  head.add(hair)
  if (look.bun) {
    const bun = sph(0.13, look.hair, 1)
    bun.position.set(0, 0.1, -0.26)
    head.add(bun)
  }
  for (const side of [-1, 1]) {
    const eye = sph(0.034, 0x241f1a, 1)
    eye.position.set(side * 0.105, 0.02, 0.265)
    eye.castShadow = false
    head.add(eye)
    const brow = rbox(0.09, 0.022, 0.03, look.hair, 0.008)
    brow.position.set(side * 0.105, 0.095, 0.265)
    brow.castShadow = false
    head.add(brow)
  }
  if (look.hat) {
    const brim = cyl(0.42, 0.42, 0.035, 12, look.hat)
    brim.position.y = 0.2
    head.add(brim)
    const crown = cyl(0.24, 0.26, 0.24, 12, look.hat)
    crown.position.y = 0.32
    head.add(crown)
  }
  head.position.y = 1.68
  body.add(head)

  g.add(body)
  g.userData.head = head
  g.userData.body = body
  g.userData.arms = arms
  g.scale.setScalar(s)
  return g
}

export const RESIDENTS = [
  {
    id: 'rosa',
    name: 'Rosa',
    age: 58,
    role: 'panadera (baker)',
    persona: 'You run the bakery on the plaza. You open at five and you are cheerful until about noon. You are proud of your bread and you tease people you like. You notice everything about how people speak and you enjoy correcting them gently, like an aunt would.',
    look: { skin: 0xe8b48c, outfit: 0xf2ede2, accent: 0xc0392b, hair: 0x5a5260, trousers: 0x5a5260, bun: true, scale: 0.97 },
    tile: [5, 11],
    facing: 0,
    opener: '¡Buenos días! ¿Lo de siempre?',
    openerEn: 'Good morning! The usual?',
    fallback: {
      greet: '¡Buenos días! ¿Qué te pongo hoy?',
      thanks: 'De nada, hombre. Vuelve mañana.',
      question: 'Uy, no sé... pregúntale a Marco, él sabe de todo.',
      short: '¿Sí...? Habla más, no muerdo.',
      default: 'Ajá. Bueno, aquí tienes pan calentito.',
    },
  },
  {
    id: 'tomas',
    name: 'Tomás',
    age: 44,
    role: 'pescadero (fishmonger)',
    persona: 'You sell fish at the market stall. You exaggerate constantly, especially about the size of fish and how early you got up. You are loud, warm, and you call everyone jefe or campeón. You are a bit of a showman.',
    look: { skin: 0xd9a06b, outfit: 0x3f6f9a, accent: 0xe8c56a, hair: 0x2e2a26, trousers: 0x3a3f4a, hat: 0xe8dcc0, scale: 1.06 },
    tile: [16, 8],
    facing: -Math.PI / 2,
    opener: '¡Jefe! Este atún... ¡era así de grande!',
    openerEn: 'Boss! This tuna... it was THIS big!',
    fallback: {
      greet: '¡Hombre, buenas! ¿Quieres pescado fresco?',
      thanks: '¡A ti, campeón!',
      question: 'Pues mira, eso depende del día...',
      short: '¿Eh? Habla alto, jefe, aquí hay ruido.',
      default: 'Te lo juro, el más grande que he visto.',
    },
  },
  {
    id: 'carmen',
    name: 'Doña Carmen',
    age: 79,
    role: 'vecina (neighbour)',
    persona: 'You sit outside your door and watch the street all day. You know everything about everyone and you share it freely. You are sharp, a little suspicious of newcomers, and you have strong opinions about noise, plants, and young people. You remember every slight.',
    look: { skin: 0xe3b598, outfit: 0x4a4258, accent: 0x8a9a5b, hair: 0xd8d3cc, trousers: 0x4a4258, bun: true, scale: 0.9 },
    tile: [4, 4],
    facing: Math.PI / 2,
    opener: 'Yo lo veo todo desde aquí, ¿sabes?',
    openerEn: 'I see everything from here, you know?',
    fallback: {
      greet: 'Buenas. ¿Tú eres el nuevo, no?',
      thanks: 'Hmm. Educado, al menos.',
      question: 'Ay, preguntas mucho para ser nuevo.',
      short: '¿Cómo? Habla claro, hijo.',
      default: 'Ya. Pues yo no digo nada, pero lo sé todo.',
    },
  },
  {
    id: 'coach',
    name: 'Marco',
    age: 35,
    role: 'your coach',
    persona: 'You are the one person in Pueblo who speaks English. You lived abroad and came back. You help the newcomer settle in: you debrief their conversations, tell them what they avoided, and point them at the next person worth talking to. You are warm, direct, never condescending, and you never do the talking for them.',
    look: { skin: 0xc98f66, outfit: 0x6f8144, accent: 0xf2ede2, hair: 0x3a352f, trousers: 0x3f4550, scale: 1.02 },
    tile: [14, 5],
    facing: Math.PI,
    opener: 'Hey — settling in? Go say hi to Rosa. She already knows who you are.',
    openerEn: '',
    fallback: {
      greet: 'Hey! Good to see you out here.',
      thanks: 'Anytime. That is what I am here for.',
      question: 'Good question. Try asking Rosa — in Spanish. She will be patient with you.',
      short: 'Go on, give me a bit more than that.',
      default: 'Nice. Now go try that on someone who does not speak English.',
    },
  },
]
