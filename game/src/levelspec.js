// ---------------------------------------------------------------------------
// levelspec.js — the ten levels of Pueblo.
//
// A level is a SET OF MISSIONS plus the area it unlocks, Overcooked-style:
// finish a level's missions and the next level opens with a ceremony. Levels
// 1–6 each open a district; levels 7–10 return to known districts at a new
// depth, because the town is one continuous place — nothing ever re-locks.
//
// Mission ids marked (new) do not exist yet; the level workflow authors them.
// Everything else references worldspec.js MISSION_CHAIN.
// ---------------------------------------------------------------------------

export const LEVELS = [
  {
    id: 'L1', name: { hi: 'Pahla Din', es: 'Primer Día' }, nameEn: 'First Day',
    district: 'plaza', opens: ['plaza'],
    missions: ['kele', 'chai'],            // chai (new): order at Miguel's cafe
    blurb: 'You just arrived. Your bag is gone. Eat something, learn to ask.',
  },
  {
    id: 'L2', name: { hi: 'Galiyon Mein', es: 'En las Callejuelas' }, nameEn: 'Into the Lanes',
    district: 'barrio', opens: ['barrio'],
    missions: ['roti', 'carmen'],
    blurb: 'A room above the bakery, and a neighbour who sees everything.',
  },
  {
    id: 'L3', name: { hi: 'Passport', es: 'El Pasaporte' }, nameEn: 'The Passport',
    district: 'iglesia', opens: ['iglesia'],
    missions: ['lucia', 'padre', 'jashn'],
    blurb: 'Follow the trail: the girl, the dog, the priest. Get it back.',
  },
  {
    id: 'L4', name: { hi: 'Bazaar', es: 'Día de Mercado' }, nameEn: 'Market Day',
    district: 'mercado', opens: ['mercado'],
    missions: ['phool', 'bhav', 'dawa'],   // bhav (new): haggle; dawa moves here
    blurb: 'Money, numbers, and the fine art of not paying full price.',
  },
  {
    id: 'L5', name: { hi: 'Samundar', es: 'El Mar' }, nameEn: 'The Sea',
    district: 'puerto', opens: ['puerto'],
    missions: ['machhli', 'bus'],
    blurb: 'The harbour: fish, nets, and the bus driver who lost your bag.',
  },
  {
    id: 'L6', name: { hi: 'Sheher Ke Bahar', es: 'Las Afueras' }, nameEn: 'Edge of Town',
    district: 'afueras', opens: ['afueras'],
    missions: ['scooter', 'kheti'],        // kheti (new): help at the farm
    blurb: 'The olive grove, the farm, and the road you arrived on.',
  },
  {
    id: 'L7', name: { hi: 'Padosi', es: 'Vecinos' }, nameEn: 'Neighbours',
    district: 'barrio', opens: [],
    missions: ['jhagda', 'sandesh'],       // (new): mediate a feud; carry a message
    blurb: 'The barrio trusts you now. Which means you are in the gossip.',
  },
  {
    id: 'L8', name: { hi: 'Subah Ki Nao', es: 'La Barca del Alba' }, nameEn: 'The Dawn Boat',
    district: 'puerto', opens: [],
    missions: ['nao', 'jaal'],             // jaal (new): help haul the nets
    blurb: 'Hassan keeps the register. Earn a place on the morning boat.',
  },
  {
    id: 'L9', name: { hi: 'School Mein', es: 'En la Escuela' }, nameEn: 'At the School',
    district: 'iglesia', opens: [],
    missions: ['school', 'kahani'],        // kahani (new): tell YOUR story back
    blurb: 'Elena wants you to talk to the kids. In the language. All of it.',
  },
  {
    id: 'L10', name: { hi: 'Fiesta', es: 'La Fiesta' }, nameEn: 'The Fiesta',
    district: 'plaza', opens: [],
    missions: ['nyota', 'intezam', 'fiesta'], // nyota (new): invite everyone; intezam (new): organise
    blurb: 'The town throws a fiesta. You are not a guest — you are the organiser.',
  },
]

// Level N is playable when level N-1 is complete. Districts accumulate.
export function levelOf(missionId) {
  return LEVELS.find(l => l.missions.includes(missionId)) || null
}
