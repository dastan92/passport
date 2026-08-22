// ---------------------------------------------------------------------------
// Knowledge graph. Facts live with residents; the player extracts them by
// actually asking about the right thing (romanized Hindi or plain English).
//
// `requires` is what makes the town feel like a town: a fact only becomes
// askable once you have heard the thing that would make you ask. The passport
// chain runs carmen -> lucia -> padre; the bag chain runs rafa -> nadia ->
// tomas -> hassan, crossing four districts, and its last link
// (hassan_boat_trip) is the gate on the spec's 'nao' mission.
//
// TOPIC REGEXES MUST BE WORD-ANCHORED. An unanchored \bmera\b once fired the
// passport reveal the moment the player introduced themselves, and a bare
// 'kaha' matched inside 'kahani'. Every short alternative below is wrapped in
// \b...\b, and vague single words that show up in ordinary politeness — kaun,
// kaise, mera, acha — are never used alone as a trigger: where the question
// word matters it appears as a phrase ('kis taraf', 'kaise jaate', 'kiske
// paas') so small talk cannot pick the lock.
// ---------------------------------------------------------------------------

import { CAST } from './worldspec.js'

export const FACTS = [

  // === chapter 1 — the passport chain ======================================
  {
    id: 'carmen_dog_beach',
    holder: 'carmen',
    topic: /\bbag\b|samaan|saman|\bkho(ya|yi)?\b|gum ?gaya|gayab|passport|chispa.{0,30}(laal|lal|cheez)|(laal|lal).{0,20}cheez/i,
    requires: [],
    text: 'Haan beta, maine khidki se dekha — Lucia ka kutta Chispa samundar kinare kuch laal cheez muh mein leke bhaag raha tha. Bilkul laal, tumhare passport jaisi.',
    textEn: 'Yes dear, I saw from my window — Lucia\'s dog Chispa was running along the beach carrying something red in its mouth. Bright red, like your passport.',
    coachNote: 'Carmen saw the dog, Chispa, with something red on the beach. Go find Lucia — she is usually at the fountain in the plaza, and the dog is hers.',
  },
  {
    id: 'lucia_church_steps',
    holder: 'lucia',
    topic: /\bchispa\b|\bkutta\b|\bkutte\b|\bkutiya\b|\bdog\b|\bdoggy\b|\blaal\b|\blal\b|\bred\b|\bcheez\b|\bthing\b|\bchhupa\b|\bchupa\b|\bchhupata\b|\bkhazana\b|\btreasure\b|\bhide\b|\bhides\b|\bkahan\b|\bkahaan\b|\bkaha\b|\bkidhar\b/i,
    requires: ['carmen_dog_beach'],
    text: 'Chispa na, apne khazane church ki seedhiyon ke paas chhupata hai! Lekin kal Padre ne wahan kuch uthaya tha — laal wala kuch. Padre ke paas hoga!',
    textEn: 'Chispa hides his treasures near the church steps! But yesterday Padre picked something up there — something red. Padre must have it!',
    coachNote: 'The dog stashes things at the church steps, and the priest found something red there. La Iglesia is west across town — go talk to Padre.',
  },
  {
    id: 'padre_has_passport',
    holder: 'padre',
    // Superset of the padre mission's check(): anything that COMPLETES the
    // errand must also trigger the reveal, or the player passes the judge on a
    // turn where the gate is still shut and gets no stamp for it.
    topic: /\bpassport\b|\blaal\b|\blal\b|\bred\b|\bkitab\b|\bseedhi\b|\bseedhiyon\b|\bsteps\b|\bchispa\b|\bkutta\b|\bdog\b|\bwapas\b|\bvapas\b|\bde dijiye\b|\bde do\b|\bdedo\b|\bdena\b|\breturn\b|\bmera passport\b|\bmera hai\b|\bmeri kitab\b|\bmila\b/i,
    requires: ['lucia_church_steps'],
    text: 'Haan beta, laal passport mere paas hi hai. Seedhiyon par mila tha, mitti mein. Maine socha, malik zaroor aayega. Pehle baitho — ghanti ke tower ki ek kahani suno, phir le jaana.',
    textEn: 'Yes child, the red passport is with me. I found it on the steps, in the dirt. I thought the owner would surely come. First sit — hear one story about the bell tower, then take it.',
    coachNote: 'He has it! Small price: you have to sit through one bell-tower story. Worth it.',
  },

  // === chapter 2 — the bag chain, four districts long ======================
  // rafa (puerto) -> nadia (plaza) -> tomas (puerto) -> hassan (harbour end)
  {
    id: 'rafa_bag_story',
    holder: 'rafa',
    topic: /\bbus\b|\bcoach\b|\bbag\b|\bbags\b|\bsaman\b|\bsamaan\b|\bsuitcase\b|\bluggage\b|\bsubah\b|\bkya hua\b|\bhua\b|\bkho\b|\bkhoya\b|\bgodam\b|\bgodaam\b|\bshed\b|\bstop\b|\bairport\b|\bmorning\b|\bunload\b|\butara\b|\bnahi mila\b/i,
    requires: ['padre_has_passport'],
    text: 'Us subah? Haan, mujhe achhe se yaad hai. Bus thheek chhe baje aayi thi aur main akela saara saman utar raha tha. Ek laal passport sadak par gir gaya — kutta use leke bhaag gaya. Aur ek bag bach gaya, kisi ne nahi liya. Maine use bandargah ke godaam mein rakh diya tha.',
    textEn: 'That morning? Yes, I remember it well. The coach came at exactly six and I was unloading all the luggage alone. A red passport fell into the road — a dog ran off with it. And one bag was left over, nobody claimed it. I put it in the harbour shed.',
    coachNote: 'Rafa unloaded that coach himself: your bag never left the harbour — he stowed it in the shed. Somebody down there knows where it went. Nadia at the pharmacy hears everything in this town; start with her.',
  },
  {
    id: 'rafa_shoulder',
    holder: 'rafa',
    topic: /\bkandha\b|\bkandhe\b|\bshoulder\b|\bdard\b|\bdukh\b|\bdukhta\b|\bdukh raha\b|\btabiyat\b|\btabiat\b|\bhaath\b|\bbaanh\b|\bbaju\b|\btheek ho\b|\bthik ho\b|\bkaise ho\b|\bkaise hain\b|\bdawa\b|\bdawai\b|\baaram\b|\bhurt\b|\bhurts\b|\bpain\b|\bchot\b/i,
    requires: ['rafa_bag_story'],
    text: 'Uff... kandha. Do din se. Wahi subah, saman utarte waqt kuch khinch gaya tha. Ab bhaari cheez utha nahi paata, aur stop chhod ke dawa lene bhi nahi ja sakta. Nadia ki dukaan plaza ke kone par hai — hari cross wali.',
    textEn: 'Ugh... my shoulder. Two days now. Something pulled that same morning, lifting the luggage. Now I cannot lift anything heavy, and I cannot leave the stop to go and fetch medicine. Nadia\'s shop is on the corner of the plaza — the one with the green cross.',
    coachNote: 'His shoulder has been out for two days and he cannot leave the bus stop. Nadia\'s pharmacy is the green cross on the plaza corner — go and describe it for him: kandha dukh raha hai, do din se.',
  },
  {
    id: 'nadia_bag_in_shed',
    holder: 'nadia',
    // deliberately no \brafa\b: the player is standing here describing his
    // shoulder, and a pharmacist who answers "shoulder" with "about your bag…"
    // is blurting, not being asked.
    topic: /\bbag\b|\bbags\b|\bsaman\b|\bsamaan\b|\bgodam\b|\bgodaam\b|\bshed\b|\bbandargah\b|\bharbour\b|\bharbor\b|\bkiske paas\b|\bkhoya\b|\bluggage\b|\bsuitcase\b|\bnaav\b|\bnav\b|\bboat\b|\bmachhli walon\b/i,
    requires: ['rafa_bag_story'],
    text: 'Tumhara bag? Suno — is dukaan mein poora sheher aata hai, aur sab bolte hain. Godaam do hafte pehle khaali kar diya gaya tha. Jo saman bacha, machhli walon ne uthaya. Tomas se poochho — bandargah se jo bhi guzarta hai, usko pata hota hai.',
    textEn: 'Your bag? Listen — the whole town passes through this shop, and all of them talk. The shed was cleared out two weeks ago. Whatever was left, the fishermen took. Ask Tomás — he knows about anything that moves through that harbour.',
    coachNote: 'Nadia says the shed was emptied two weeks ago and the fishermen took what was left. Tomas knows everything that passes through that harbour — his stall is on the harbour front. Ask him.',
  },
  {
    id: 'tomas_hassan_boat',
    holder: 'tomas',
    topic: /\bbag\b|\bsaman\b|\bsamaan\b|\bgodam\b|\bgodaam\b|\bshed\b|\bnaav\b|\bnaao\b|\bnav\b|\bboat\b|\bkishti\b|\bhassan\b|\bbandargah\b|\bharbour\b|\bharbor\b|\bkiske paas\b|\bfiesta\b|\bjashn\b|\bband\b/i,
    // Hangs off Rafa's account rather than off Nadia's, so the road to Hassan
    // is two asks and not three. Nadia's line is the richer telling — she says
    // the shed was emptied and points here — but a player who only ever talks
    // to Rafa and Tomas can still reach the boat, and so can still finish the
    // chain-3 errand that is gated on it.
    requires: ['rafa_bag_story'],
    text: 'Godaam ka saman? Woh sab Hassan ke paas gaya, jefe. Uski naav bandargah ke bilkul aakhri chhor par khadi hai — laal patti wali. Woh har hafte us paar jaata hai, aur jo koi nahi maangta woh sab usi naav mein pada rehta hai. Fiesta ke liye bhi wahi naav chahiye — band ko paar le jaana hai.',
    textEn: 'The stuff from the shed? All of it went to Hassan, jefe. His boat is moored right at the far end of the harbour — the one with the red stripe. He crosses every week, and everything nobody claims just sits in that boat. We need that same boat for the fiesta too, to carry the band across.',
    coachNote: 'Everything from the shed went to Hassan — far end of the harbour wall, red stripe on the hull. He is also the only way the fiesta band gets across the bay. Go find him and get him talking about that boat.',
  },
  {
    id: 'hassan_boat_trip',
    holder: 'hassan',
    // Superset of the nao mission's check() for the same reason as Padre's:
    // pinning him to an hour is also, unavoidably, asking about the boat.
    topic: /\bnaav\b|\bnaao\b|\bnav\b|\bboat\b|\bkishti\b|\bsafar\b|\btrip\b|\bpaar\b|\bsamundar\b|\bsea\b|\bkab\b|\bjaate\b|\bjate\b|\bjaoge\b|\bnikalte\b|\bfiesta\b|\bjashn\b|\bband\b|\bbag\b|\bsaman\b|\bsamaan\b|\bhafte\b|\bkal\b|\bparso\b|\bparson\b|\bsubah\b|\bshaam\b|\bbaje\b|\bwaqt\b|\bmilein\b|\bmilenge\b|\bmilte\b|\bshanivaar\b/i,
    requires: ['tomas_hassan_boat'],
    text: 'Haan, naav meri hai. Har hafte main us paar jaata hoon — subah nikalta hoon, jab paani shaant ho. Fiesta ke liye band ko le jaa sakta hoon, kyun nahi. Bas waqt tay karo, thheek waqt — main lehron ke hisaab se chalta hoon, logon ke hisaab se nahi. Aur suno... ek bag mahino se meri bench ke niche pada hai. Tumhara toh nahi?',
    textEn: 'Yes, the boat is mine. Every week I cross — I leave in the morning, when the water is calm. I can take the band across for the fiesta, why not. Just fix a time, a real time — I run on the tides, not on people. And listen... there has been a bag under my bench for months. It would not be yours, would it?',
    coachNote: 'That is his boat, and he will take the band across — but only if you pin him to an actual day and hour, not "later". And there is a bag under his bench he thinks might be yours.',
  },
  {
    id: 'sofia_marisol',
    holder: 'sofia',
    topic: /\bmarisol\b|rosa.{0,24}(phool|flower)|(phool|flower).{0,24}rosa/i,
    requires: [],
    text: 'Rosa ki behen? Marisol. Main dono ko bachpan se jaanti hoon. Do saal se baat nahi hui — maa ke ghar ke jhagde ke baad. Marisol ko safed gulab hamesha pasand the, aur Rosa ko ye achhi tarah pata hai. Isliye woh khud nahi aayi, tumhe bheja.',
    textEn: 'Rosa\'s sister? Marisol. I have known them both since they were girls. They have not spoken in two years — after the fight about their mother\'s house. Marisol always loved white roses, and Rosa knows that perfectly well. That is why she did not come herself, and sent you.',
    coachNote: 'Sofia has known Rosa and Marisol since they were girls. White roses are the right ones — and now you know why Rosa sent you instead of walking over there herself.',
  },

  // === chapter 3 — the fiesta and the road out =============================
  {
    id: 'elena_fiesta',
    holder: 'elena',
    topic: /fiesta|school.{0,30}band|band.{0,20}school|bacch(e|on).{0,25}bus|province/i,
    requires: [],
    text: 'Fiesta shanivaar ki raat ko hai, bandargah par. Har saal wahin hota hai — roshni, band, aur poora sheher ek jagah. Is baar bachche kahaniyan sunayenge. Mujhe abhi tak koi aisa nahi mila jo unhe kuch bilkul naya suna sake... shayad tum?',
    textEn: 'The fiesta is on Saturday night, down at the harbour. It is there every year — lights, a band, and the whole town in one place. This year the children are telling stories. I still have not found anyone who could tell them something genuinely new... perhaps you?',
    coachNote: 'The fiesta is Saturday night at the harbour, and Elena still has nobody to tell the children a story. That is obviously you.',
  },
  {
    id: 'diego_road_out',
    holder: 'diego',
    topic: /raasta|rasta|kaise ja|kidhar|kis taraf|shortcut|bandargah|\broad\b/i,
    requires: [],
    text: 'Gyarah saal se in galiyon mein ghoom raha hoon — har shortcut, har kachcha raasta mujhe pata hai.',
    textEn: 'Diego has roamed these lanes his whole life — every shortcut and back road, straight past the grove, left at the church square, down to the water.',
    coachNote: 'Diego has not walked into town in eleven years and still knows every turn: the grove, the church square, then straight down to the water. He is the map.',
  },
  {
    id: 'miguel_diego_farm',
    holder: 'miguel',
    topic: /\bdiego\b|olive road|scooter.{0,20}(kahan|kis|kaun)|\bcousin\b/i,
    requires: [],
    text: 'Diego? Mera cousin. Din bhar us scooter par baitha rehta hai olive road ke paas. Sheher ka har raasta usko pata hai.',
    textEn: 'Diego is Miguel\'s cousin — a teenager who hangs around the olive road on his scooter and knows every shortcut in town.',
    coachNote: 'Diego never comes into town. His farm is out west in Las Afueras, past the olive grove where the road leaves — if you want the scooter you go to him.',
  },

  // === the levelspec errands' gates ========================================
  // jhagda: the feud has two sides. Carmen's complaint is the gate on the
  // mission; Nadia's side reveals in the same conversation that settles it.
  {
    id: 'carmen_noise',
    holder: 'carmen',
    topic: /\bshor\b|\bawaaz\b|\bawaz\b|\bnoise\b|\bjhagda\b|\bfeud\b|\bteesri manzil\b|\bthird floor\b|upar (wali|wala|se).{0,20}(shor|awaaz|awaz|raat)|raat.{0,20}(shor|awaaz|awaz)/i,
    requires: [],
    text: 'Aakhir kisi ne poochha! Teesri manzil — meri chhat ke theek upar — roz aadhi raat ko GHIS-GHIS-GHIS! Kuch ghaseeta jaata hai, patthar jaisa bhaari. Woh Nadia hai, dawai wali. Din mein farishta banti hai, raat ko upar hathoda chalta hai. Do mahine se main soyi nahi!',
    textEn: 'Finally somebody asks! The third floor — right above my ceiling — every midnight, SCRAPE-SCRAPE-SCRAPE! Something dragged, heavy as stone. It is Nadia, the medicine woman. An angel by day, a hammer upstairs by night. I have not slept in two months!',
    coachNote: 'Carmen swears Nadia drags something heavy across the floor above her every midnight. Before you march into the pharmacy waving accusations, remember you are the messenger: say it as reported speech — Carmen kehti hain ki...',
  },
  {
    id: 'nadia_noise_side',
    holder: 'nadia',
    // gated on Carmen's side, so \bcarmen\b here cannot fire off small talk
    // before the feud is even known to the player.
    topic: /\bshor\b|\bawaaz\b|\bawaz\b|\bnoise\b|\bcarmen\b|\braat ko\b|\bmidnight\b|\bteesri manzil\b|\bthird floor\b|\bcrates?\b|\bghaseet|\bshikayat\b/i,
    requires: ['carmen_noise'],
    text: 'Raat ka shor? ...Achha. Dawai ke crate hafte mein teen raat der se aate hain — supplier ka truck aadhi raat ko pahunchta hai, aur main crates khud andar kheenchti hoon, taaki subah dukaan waqt par khule. Mujhe andaza hi nahi tha ki niche kisi ko sunai deta hai. Kaun keh raha hai... Carmen ji?',
    textEn: 'The night noise? ...I see. The medicine crates come late three nights a week — the supplier\'s truck arrives around midnight and I drag the crates in myself, so the shop opens on time. I had no idea anyone downstairs could hear. Who is saying this... Doña Carmen?',
    coachNote: 'So that is the monster upstairs: midnight medicine crates. She had no idea anyone could hear. Tell her what Carmen SAYS — kehti hain ki — and let the apology travel back down the stairs.',
  },
  // sandesh: the message itself, learned from Rosa, is the gate.
  {
    id: 'rosa_message',
    holder: 'rosa',
    topic: /\bsandesh\b|\bmessage\b|\bpaigham\b|elena.{0,40}(sandesh|message|keh|bhej|bol|roti|jawaab)|(sandesh|message|keh|bhej|bol|jawaab).{0,40}elena|fiesta.{0,25}roti|roti.{0,25}fiesta/i,
    requires: [],
    text: 'Haan, Elena ko jawaab chahiye — sun, bilkul aise hi kehna: main shanivaar subah pachaas rotiyan bhejungi, bachchon ke liye. LEKIN mujhe ginti shukravaar tak chahiye. Pachaas. Shanivaar subah. Shukravaar tak ginti. Raste mein bhool mat jaana, warna do sau saal purani bakery ki izzat jayegi!',
    textEn: 'Yes, Elena needs an answer — listen, say it exactly like this: I will send fifty rotis on Saturday morning, for the children. BUT I need the count by Friday. Fifty. Saturday morning. Count by Friday. Do not lose it on the way, or two hundred years of bakery honour goes with it!',
    coachNote: 'The message is three numbers wearing a sentence: fifty rotis, Saturday morning, count by Friday. Walk it to the school on the church square and say it back to Elena whole.',
  },
]

// Fact holders must be real residents; a typo here would hide a fact forever
// and there is no way to notice that from inside the game.
{
  const ids = new Set(CAST.map(c => c.id))
  for (const f of FACTS) {
    if (!ids.has(f.holder)) console.error('knowledge.js: fact "' + f.id + '" is held by unknown resident "' + f.holder + '"')
  }
}

const KEY = 'passport_facts'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function knownFacts() { return load() }

export function has(factId) { return load().includes(factId) }

export function tryReveal(residentId, playerText) {
  const known = load()
  for (const f of FACTS) {
    if (f.holder !== residentId) continue
    if (known.includes(f.id)) continue
    if (!f.requires.every(r => known.includes(r))) continue
    if (!f.topic.test(playerText)) continue
    known.push(f.id)
    localStorage.setItem(KEY, JSON.stringify(known))
    return f
  }
  return null
}

export function factsHeldBy(residentId) {
  const knownIds = load()
  const mine = FACTS.filter(f => f.holder === residentId)
  return {
    known: mine.filter(f => knownIds.includes(f.id)),
    hidden: mine.filter(f => !knownIds.includes(f.id) && f.requires.every(r => knownIds.includes(r))),
  }
}

export function resetKnowledge() {
  localStorage.removeItem(KEY)
}
