import * as THREE from 'three'
import { PAL, mat, rbox, cyl, sph } from './kit.js'

// One body plan, many people — the 3D version of "one rig, swappable outfits".

export function buildPerson(look) {
  const g = new THREE.Group()
  const s = look.scale !== undefined ? look.scale : 1
  const body = new THREE.Group()

  for (const side of [-1, 1]) {
    const leg = cyl(0.115, 0.13, 0.6, 8, look.trousers ?? 0x4a4550)
    leg.position.set(side * 0.14, 0.3, 0)
    body.add(leg)
    const shoe = rbox(0.19, 0.11, 0.3, 0x39322c, 0.045)
    shoe.position.set(side * 0.14, 0.06, 0.05)
    body.add(shoe)
  }

  const torso = cyl(0.29, 0.35, 0.78, 10, look.outfit)
  torso.position.y = 1.0
  body.add(torso)

  if (look.accent) {
    const apron = rbox(0.44, 0.56, 0.14, look.accent, 0.05)
    apron.position.set(0, 0.94, 0.24)
    body.add(apron)
  }

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

// --- animals ----------------------------------------------------------------

export function buildDog() {
  const g = new THREE.Group()
  const body = new THREE.Group()
  const trunk = rbox(0.32, 0.3, 0.72, 0xb08a5a, 0.1)
  trunk.position.y = 0.38
  body.add(trunk)
  const head = new THREE.Group()
  const skull = sph(0.17, 0xb08a5a, 1)
  head.add(skull)
  const snout = rbox(0.13, 0.11, 0.18, 0x9a744a, 0.04)
  snout.position.set(0, -0.03, 0.17)
  head.add(snout)
  const nose = sph(0.035, 0x2b2119, 0)
  nose.position.set(0, -0.01, 0.27)
  head.add(nose)
  for (const s of [-1, 1]) {
    const ear = rbox(0.07, 0.14, 0.04, 0x8a6f42, 0.02)
    ear.position.set(s * 0.11, 0.15, 0.02)
    ear.rotation.z = s * -0.3
    head.add(ear)
    const eye = sph(0.028, 0x241f1a, 0)
    eye.position.set(s * 0.07, 0.05, 0.14)
    head.add(eye)
  }
  head.position.set(0, 0.56, 0.34)
  body.add(head)
  for (const [x, z] of [[-0.11, 0.24], [0.11, 0.24], [-0.11, -0.24], [0.11, -0.24]]) {
    const leg = cyl(0.045, 0.05, 0.28, 6, 0x9a744a)
    leg.position.set(x, 0.14, z)
    body.add(leg)
  }
  const tail = cyl(0.03, 0.05, 0.3, 5, 0xb08a5a)
  tail.position.set(0, 0.52, -0.4)
  tail.rotation.x = -0.9
  body.add(tail)
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
  const head = sph(0.12, colour, 1)
  head.position.set(0, 0.38, 0.2)
  g.add(head)
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 4), mat(colour))
    ear.position.set(s * 0.07, 0.5, 0.18)
    ear.castShadow = true
    g.add(ear)
  }
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
  for (const s of [-1, 1]) {
    const wing = rbox(0.16, 0.03, 0.22, 0xd8d3c8, 0.015)
    wing.position.set(s * 0.1, 0.2, -0.02)
    g.add(wing)
  }
  return g
}

// --- the cast ---------------------------------------------------------------

export const RESIDENTS = [
  {
    id: 'coach',
    name: 'Marco',
    age: 35,
    role: 'your coach',
    persona: 'You are the one person in Pueblo who speaks English. You lived in Manchester for six years and came back. You help the newcomer settle in: you give them small missions, debrief their conversations, and point them at the next person worth talking to. You are warm, direct, never condescending, and you never do the talking for them. If they ask you how to say something, help them — then push them to go say it to a real person.',
    look: { skin: 0xc98f66, outfit: 0x6f8144, accent: 0xf2ede2, hair: 0x3a352f, trousers: 0x3f4550, scale: 1.02 },
    tile: [19, 11],
    facing: Math.PI / 2,
    opener: 'Hey — you made it! Small job to start you off: Pilar, at the fruit stall over east, sells the best plátanos on the coast. Go buy three. In Spanish. You can do this.',
    openerEn: '',
    fallback: {
      greet: 'Hey! How is it going out there?',
      thanks: 'Anytime. That is literally my job.',
      question: 'Try Pilar at the fruit stall — say "quiero tres plátanos, por favor". You have got this.',
      short: 'Give me a bit more than that and I can actually help.',
      default: 'Nice. Now go say that to someone who does not speak English.',
    },
  },
  {
    id: 'pilar',
    name: 'Pilar',
    age: 41,
    role: 'frutera (fruit seller)',
    persona: 'You run the fruit stall in the market row. You are quick, funny, and you run the stall like a tiny kingdom. Your bananas (plátanos) are famous and you know it. You like foreigners who try; you playfully refuse to understand English or pointing — words only.',
    look: { skin: 0xdca57e, outfit: 0xe8c56a, accent: 0x6f8144, hair: 0x3a2f28, trousers: 0x4a4550, bun: true, scale: 0.99 },
    tile: [28, 11],
    facing: Math.PI / 2,
    opener: '¡Buenas! Fruta fresca. ¿Qué quieres, cariño?',
    openerEn: 'Morning! Fresh fruit. What would you like, dear?',
    fallback: {
      greet: '¡Buenas! ¿Qué te pongo?',
      thanks: '¡A ti! Vuelve pronto.',
      question: 'Tengo plátanos, naranjas, tomates... lo mejor del pueblo.',
      short: '¿Cómo? Con palabras, cariño, que no vendo por señas.',
      default: 'Mmm... ¿eso es un sí o un no?',
    },
  },
  {
    id: 'rosa',
    name: 'Rosa',
    age: 58,
    role: 'panadera (baker)',
    persona: 'You run the bakery north of the plaza. You open at five and you are cheerful until about noon. You are proud of your bread and you tease people you like. You notice everything about how people speak and you enjoy correcting them gently, like an aunt would.',
    look: { skin: 0xe8b48c, outfit: 0xf2ede2, accent: 0xc0392b, hair: 0x5a5260, trousers: 0x5a5260, bun: true, scale: 0.97 },
    tile: [14, 6],
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
    persona: 'You sell fish at the market. You exaggerate constantly, especially about the size of fish and how early you got up. You are loud, warm, and you call everyone jefe or campeón. You are a bit of a showman.',
    look: { skin: 0xd9a06b, outfit: 0x3f6f9a, accent: 0xe8c56a, hair: 0x2e2a26, trousers: 0x3a3f4a, hat: 0xe8dcc0, scale: 1.06 },
    tile: [28, 14],
    facing: Math.PI / 2,
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
    persona: 'You sit outside your door on the west street and watch everything. You know everything about everyone and share it freely. You are sharp, a little suspicious of newcomers, and you have strong opinions about noise, plants, and young people. You remember every slight.',
    look: { skin: 0xe3b598, outfit: 0x4a4258, accent: 0x8a9a5b, hair: 0xd8d3cc, trousers: 0x4a4258, bun: true, scale: 0.9 },
    tile: [9, 10],
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
    id: 'miguel',
    name: 'Miguel',
    age: 27,
    role: 'camarero (waiter)',
    persona: 'You wait tables at the café on the west side of the plaza. You are easygoing, a little too relaxed, always about to take a break. You give great recommendations and terrible directions. You want to move to Madrid someday, maybe, probably, some year.',
    look: { skin: 0xd9a06b, outfit: 0xf2ede2, accent: 0x2b2119, hair: 0x241f1a, trousers: 0x2b2119, scale: 1.0 },
    tile: [13, 13],
    facing: Math.PI / 2,
    opener: '¿Un café? Siéntate donde quieras, ahora voy.',
    openerEn: 'Coffee? Sit wherever, I will be right there.',
    fallback: {
      greet: 'Buenas... ¿mesa para uno?',
      thanks: 'Nada, nada. ¿Algo más?',
      question: 'Uf, buena pregunta. El cortado, sin duda.',
      short: '¿Mande?',
      default: 'Vale, vale... ahora te lo traigo.',
    },
  },
  {
    id: 'lucia',
    name: 'Lucía',
    age: 9,
    role: 'niña del barrio (local kid)',
    persona: 'You are nine and you know every corner, cat and shortcut in Pueblo. You talk fast, ask a lot of questions, and find the foreigner absolutely fascinating. You use simple words, which accidentally makes you the best Spanish teacher in town. Your dog is called Chispa.',
    look: { skin: 0xe8b48c, outfit: 0xdb6f8f, accent: 0xf2ede2, hair: 0x2e2117, trousers: 0x4a6fa8, scale: 0.62 },
    tile: [23, 14],
    facing: -Math.PI / 2,
    opener: '¡Hola! ¿Tú de dónde eres? ¿Tienes perro? Yo sí. Se llama Chispa.',
    openerEn: 'Hi! Where are you from? Do you have a dog? I do. Her name is Chispa.',
    fallback: {
      greet: '¡Hola hola! ¿Jugamos?',
      thanks: '¡De nada! Oye, ¿tienes perro?',
      question: '¡Yo lo sé, yo lo sé! Bueno... no. Pregúntale a Marco.',
      short: '¿Eso qué significa? Habla más, anda.',
      default: 'Jo, qué raro hablas. Me gusta.',
    },
  },
  {
    id: 'padre',
    name: 'Padre Antonio',
    age: 66,
    role: 'cura (priest)',
    persona: 'You are the priest of the church on the north side. You are gentle, slightly deaf in one ear, and you love two things: your bell tower and long stories that lose their point halfway. You speak slowly and clearly, which makes you easy to understand.',
    look: { skin: 0xe3b598, outfit: 0x2b2830, accent: 0xf2ede2, hair: 0xd8d3cc, trousers: 0x2b2830, bald: true, scale: 1.0 },
    tile: [23, 5],
    facing: Math.PI,
    opener: 'Bienvenido, hijo. ¿Has visto la torre? Del año 1712...',
    openerEn: 'Welcome, my child. Have you seen the tower? From the year 1712...',
    fallback: {
      greet: 'Bienvenido, bienvenido. Dios te guarde.',
      thanks: 'No hay de qué, hijo.',
      question: 'Ah... eso me recuerda una historia. Verás, en 1985...',
      short: '¿Eh? Habla por este lado, hijo, que del otro no oigo.',
      default: 'Así es, así es... como la torre, que aguanta todo.',
    },
  },
]

// ambient villagers — no dialogue, they just live here
export const WANDER_LOOKS = [
  { skin: 0xdca57e, outfit: 0x8a6f9a, hair: 0x3a2f28, trousers: 0x4a4550 },
  { skin: 0xe8b48c, outfit: 0x4a8fc9, hair: 0x241f1a, trousers: 0x3a3f4a },
  { skin: 0xc98f66, outfit: 0xc0704a, hair: 0x2e2a26, trousers: 0x4a4550, hat: 0xe8dcc0 },
  { skin: 0xe3b598, outfit: 0x6f8144, hair: 0x5a5260, trousers: 0x5a5260, bun: true },
  { skin: 0xd9a06b, outfit: 0xf2ede2, hair: 0x3a352f, trousers: 0x2b2119 },
  { skin: 0xdca57e, outfit: 0xdb8f4a, hair: 0xd8d3cc, trousers: 0x4a4258, bun: true, scale: 0.92 },
  { skin: 0xe8b48c, outfit: 0x9fc4e8, hair: 0x2e2117, trousers: 0x4a6fa8, scale: 0.6 },
  { skin: 0xc98f66, outfit: 0xa63a52, hair: 0x241f1a, trousers: 0x3a3f4a },
]
