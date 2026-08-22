import * as THREE from 'three'

// One body plan, many people: every resident is the same rig with different
// colours and proportions — the 3D version of "one rig, swappable outfits".

export interface PersonLook {
  skin: number
  outfit: number
  accent: number   // apron / scarf / waistcoat
  hair: number
  scale?: number
}

export interface Resident {
  id: string
  name: string
  role: string
  look: PersonLook
  tile: [number, number]
  facing: number // radians
  greeting: { es: string; note: string }
  group?: THREE.Group
}

function mat(color: number) {
  return new THREE.MeshLambertMaterial({ color })
}

export function buildPerson(look: PersonLook): THREE.Group {
  const g = new THREE.Group()
  const s = look.scale ?? 1

  // legs
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.55, 8), mat(0x4a4a55))
  legs.position.y = 0.28
  legs.castShadow = true
  g.add(legs)

  // torso — slightly tapered
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.75, 8), mat(look.outfit))
  torso.position.y = 0.95
  torso.castShadow = true
  g.add(torso)

  // accent: apron / sash across the torso front
  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.1), mat(look.accent))
  apron.position.set(0, 0.9, 0.3)
  g.add(apron)

  // arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 6), mat(look.outfit))
    arm.position.set(side * 0.42, 0.98, 0)
    arm.rotation.z = side * 0.25
    arm.castShadow = true
    g.add(arm)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mat(look.skin))
    hand.position.set(side * 0.5, 0.68, 0)
    g.add(hand)
  }

  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), mat(look.skin))
  head.position.y = 1.62
  head.castShadow = true
  g.add(head)

  // hair cap
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.315, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
    mat(look.hair),
  )
  hair.position.y = 1.66
  g.add(hair)

  // eyes — two dark dots so facing reads at a distance
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), mat(0x1f1a16))
    eye.position.set(side * 0.11, 1.64, 0.27)
    g.add(eye)
  }

  g.scale.setScalar(s)
  return g
}

export const RESIDENTS: Resident[] = [
  {
    id: 'rosa',
    name: 'Rosa',
    role: 'panadera',
    look: { skin: 0xe8b48c, outfit: 0xf0e8d8, accent: 0xc0392b, hair: 0x555063, scale: 0.98 },
    tile: [5, 3],
    facing: Math.PI,
    greeting: {
      es: '¡Buenos días! ¿Lo de siempre?',
      note: 'Rosa runs the panadería. She remembers everyone’s order — and everyone’s mistakes.',
    },
  },
  {
    id: 'tomas',
    name: 'Tomás',
    role: 'pescador',
    look: { skin: 0xd9a06b, outfit: 0x3f5f8a, accent: 0xe8c56a, hair: 0x2e2a26, scale: 1.05 },
    tile: [12, 8],
    facing: -Math.PI / 2,
    greeting: {
      es: '¡Hombre! Este atún... ¡era así de grande!',
      note: 'Tomás sells fish and exaggerations. The fish are real; the sizes are not.',
    },
  },
  {
    id: 'carmen',
    name: 'Doña Carmen',
    role: 'vecina',
    look: { skin: 0xe3b598, outfit: 0x4a4258, accent: 0x8a9a5b, hair: 0xd8d3cc, scale: 0.92 },
    tile: [3, 10],
    facing: 0,
    greeting: {
      es: 'Yo lo veo todo, ¿sabes?',
      note: 'Doña Carmen watches the street from her chair. She has never missed anything. Ever.',
    },
  },
  {
    id: 'coach',
    name: 'Marco',
    role: 'your coach',
    look: { skin: 0xc98f66, outfit: 0x6a7b3f, accent: 0xf0e8d8, hair: 0x3a352f, scale: 1.0 },
    tile: [15, 4],
    facing: Math.PI,
    greeting: {
      es: 'Hey! Settling in? Go say hi to Rosa — she already knows who you are.',
      note: 'Marco is the one person here who speaks English. Use him wisely.',
    },
  },
]
