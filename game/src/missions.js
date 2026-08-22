// ---------------------------------------------------------------------------
// Missions. Authored situations, LLM-judged outcomes — the design doc's rule.
//
// The arc runs three chapters. Chapter 1 recovers the passport: your bag was
// lost in transit and the passport is somewhere in Pueblo's social web.
// Chapter 2 is what you do once you are staying — you become useful, and the
// bag itself turns out to still be in town. Chapter 3 builds the fiesta.
//
// Every mission teaches a DIFFERENT piece of language, not the same shape with
// a new noun: numbers and money, past tense, describing a symptom, asking
// directions, a polite request against a blunt one, hearing a refusal and
// answering it, telling a story back, pinning someone to a time.
//
// The order, the givers, the targets and the fact gates are NOT decided here —
// they come from worldspec.js MISSION_CHAIN, which is the single source of
// truth. This file supplies only the writing. All player-facing Hindi is
// romanized (Latin script) — never Devanagari.
// ---------------------------------------------------------------------------

import { has, FACTS } from './knowledge.js'
import { MISSION_CHAIN } from './worldspec.js'

// --- the writing, keyed by the spec's mission id ----------------------------
// giver / target / chapter / requiresFact are deliberately absent: they are
// merged in from MISSION_CHAIN below so the two files cannot drift.
const CONTENT = {

  // === CHAPTER 1 — the passport ============================================

  kele: {
    title: 'Teen kele khareedo',
    titleEn: 'Buy three bananas',
    brief: 'Pilar has the fruit stall in El Mercado — head east out of the plaza into the covered market row, first stall past the crates. Warm up with something easy: buy three bananas from her, in Hindi. A number and a noun, that is the whole job.',
    objective: 'The player must ask Pilar to buy bananas AND specify the quantity three. Any reasonable phrasing counts: "mujhe teen kele chahiye", "teen kele dena", "teen kele please". Grammar does not need to be perfect — if you understood they want three bananas, it is a success.',
    reward: { item: 'teen kele', repWith: 'pilar' },
    check: (t) => /\bkela\b|\bkele\b|\bkelaa\b|\bbanana\b|\bbananas\b/i.test(t) && /\bteen\b|\btin\b|\b3\b|\bthree\b/i.test(t),
    success: 'Lo beta, teen kele — ekdum meethe hain, taaza aaye hain aaj subah!',
    hint: 'Try: "Namaste! Mujhe teen kele chahiye."',
  },

  roti: {
    title: 'Rosa se milo aur roti maango',
    titleEn: 'Introduce yourself to Rosa and ask for bread',
    brief: 'Rosa\'s bakery is up in El Barrio, the tight lanes north of the plaza — follow the smell, you will not need a map. Tell her your name and ask for bread. Word is there is a room above the shop, and a newcomer with no bag could use a landlady like Rosa.',
    objective: 'The player must introduce themselves by name (e.g. "mera naam … hai", "main … hoon") AND ask for bread in some form. If they succeed, Rosa warmly offers them the room above the bakery to stay in.',
    reward: { item: 'bakery ke upar ka kamra', repWith: 'rosa' },
    check: (t) => /\bmera naam\b|\bmain .{1,25}(hoon|hu\b)|\bmy name\b|\bnaam .{1,25}hai\b/i.test(t) && /\broti\b|\bbread\b|\bpav\b|\bpaav\b|\bdouble roti\b/i.test(t),
    success: 'Arre, kitna accha naam hai! Lo, garam roti. Aur suno — bakery ke upar ek kamra khaali hai. Jab tak tumhara samaan nahi milta, wahin raho.',
    hint: 'Try: "Namaste, mera naam … hai. Mujhe roti chahiye."',
  },

  carmen: {
    title: 'Carmen se apne bag ke baare mein poochho',
    titleEn: 'Ask Carmen about your lost bag',
    brief: 'Doña Carmen sits at her window higher up in El Barrio, two streets past Rosa\'s ovens, and from that chair she sees everything that moves in the lanes below. If anyone noticed your bag it is her. Ask her about it — and be patient, she talks.',
    objective: 'The player must ask Carmen about their lost bag, lost things, or whether she saw anything unusual. If they do, she reveals she saw Chispa the dog carrying something red on the beach.',
    reward: { item: 'Carmen ki gawahi', repWith: 'carmen' },
    check: (t) => /\bbag\b|\bbags\b|\bsaman\b|\bsamaan\b|\bkho\b|\bkhoya\b|\bkhoyi\b|\blost\b|\bdekha\b|\bdekhi\b|\bpassport\b/i.test(t),
    success: 'Haan haan, maine dekha! Chispa — Lucia ka kutta — samundar kinare laal cheez leke bhaag raha tha!',
    hint: 'Try: "Mera bag kho gaya hai. Kya aapne kuch dekha?"',
  },

  lucia: {
    title: 'Lucia se Chispa ke baare mein poochho',
    titleEn: 'Ask Lucia about Chispa and the red thing',
    brief: 'Carmen saw the dog with something red. Chispa belongs to Lucía, who is nine and is almost always at the fountain in the middle of the plaza. Keep it simple and friendly — she is a kid, not an exam — and ask where the dog hides things.',
    objective: 'The player must ask Lucia about Chispa, the red thing, or where the dog hides things. If they do, she reveals Chispa stashes treasures near the church steps and that Padre found something there.',
    reward: { item: 'church ki seedhiyon ka raaz', repWith: 'lucia' },
    check: (t) => /\bchispa\b|\bkutta\b|\bkutte\b|\bdog\b|\blaal\b|\blal\b|\bred\b|\bchhupa\b|\bchupa\b|\bchhupata\b|\bhide\b|\bhides\b|\bkahan\b|\bkahaan\b|\bkaha\b|\bkidhar\b/i.test(t),
    success: 'Chispa church ki seedhiyon ke paas sab chhupata hai! Lekin Padre ne kal wahan kuch laal uthaya tha!',
    hint: 'Try: "Chispa laal cheez kahan chhupata hai?"',
  },

  padre: {
    title: 'Padre se apna passport wapas maango',
    titleEn: 'Ask Padre for your passport back',
    brief: 'The priest found something red on the church steps. La Iglesia is right across town to the west — keep the fountain behind you until you see the bell tower over the olive trees. Ask him for your passport back, politely. Fair warning: he will want you to hear one story about that bell first. Listen. It matters to him.',
    // Success is the asking. The bell-tower story is what Padre DOES, not a
    // second hoop: an objective that waited for the player to agree to hear it
    // meant the hint sentence could not finish the errand, and the judge kept
    // saying NO to a player who had done everything the card told them to.
    objective: 'The player must ask Padre about the red thing or their passport and request it back. Asking for it back is itself the success. Padre admits he has it, tells them one short bell-tower story because he cannot help himself, and then hands the passport over.',
    reward: { item: 'passport', repWith: 'padre' },
    check: (t) => /\bpassport\b|\blaal\b|\blal\b|\bred\b|\bwapas\b|\bvapas\b|\bde dijiye\b|\bdena\b|\bmera hai\b|\bmila\b/i.test(t),
    success: 'Ghanti ki kahani sun li tumne — accha laga. Lo, tumhara passport. Sambhal ke rakhna, beta.',
    hint: 'Try: "Padre, mera passport aapke paas hai? Wapas de dijiye, please."',
  },

  jashn: {
    title: 'Marco ko khushkhabri sunao',
    titleEn: 'Tell Marco the good news',
    brief: 'You did it. Passport in hand. Come back to the plaza — I am at the fountain, where I always am — and tell me how it went, in Hindi obviously. Then we celebrate. Rosa is already baking, which means it is not optional.',
    objective: 'The player must tell Marco (the coach) the good news — that they found their passport / it was recovered — or thank him. Any celebratory phrasing counts.',
    reward: { item: 'Pueblo mein ek ghar', repWith: 'coach' },
    check: (t) => /\bpassport\b|\bmil gaya\b|\bmilgaya\b|\bmil gya\b|\bfound\b|\bshukriya\b|\bdhanyavad\b|\bdhanyawad\b|\bthanks\b|\bthank you\b/i.test(t),
    success: 'Mil gaya! Dekha? Poora sheher tumhare saath tha. Chalo, Rosa ke yahan — aaj jashn hai!',
    hint: 'Try: "Marco, mera passport mil gaya! Shukriya!"',
  },

  // === CHAPTER 2 — you live here now =======================================

  // PAST TENSE. Rafa recounts the morning the coach arrived.
  bus: {
    title: 'Rafa se poochho us subah kya hua',
    titleEn: 'Ask Rafa what happened that morning',
    brief: 'Passport, yes. Your bag, no — that is still out there somewhere. The airport coach unloads at the bus stop down in El Puerto, by the harbour wall, and Rafa was the one throwing cases off it that morning. Go and ask him what happened. This one needs the past tense: hua, tha, aayi, gaya. Ask about that morning, not about right now.',
    objective: 'The player must ask Rafa about a PAST event — what happened on the morning the airport coach arrived, or where their bag went — using past-tense marking rather than a present-tense request. Good attempts: "us subah kya hua?", "mera bag kahan gaya?", "bus kab aayi thi?", "aap ne mera bag dekha tha?". Simply asking for the bag now ("mujhe mera bag chahiye") is NOT it — they must ask about the past. When they do, Rafa recounts it: the coach came at six, he unloaded it alone, a red passport fell into the road and a dog ran off with it, and one bag was left over that he stowed in the harbour shed.',
    reward: { item: 'Rafa ki gawahi', repWith: 'rafa' },
    // NB: no \bthe\b and no English past markers — "what happened to the bag"
    // would sail straight through, and this errand is about producing the
    // Hindi past, not about recognising an English one.
    check: (t) => /\bhua\b|\bhui\b|\bthaa?\b|\bthi\b|\bthee\b|\baaya\b|\baayi\b|\baai\b|\bgaya\b|\bgayi\b|\bdekha\b|\bdekhi\b|\bkiya\b|\butara\b|\brakha\b/i.test(t) && /\bbag\b|\bbags\b|\bsaman\b|\bsamaan\b|\bbus\b|\bcoach\b|\bsubah\b|\bsuitcase\b|\bluggage\b/i.test(t),
    success: 'Haan, mujhe achhe se yaad hai! Bus chhe baje aayi thi. Maine akele saara saman utara — ek laal passport sadak par gir gaya aur kutta use leke bhaag gaya. Aur ek bag bach gaya, kisi ne nahi liya. Maine use bandargah ke godaam mein rakh diya tha.',
    hint: 'Try: "Us subah kya hua? Mera bag kahan gaya?"',
  },

  // DESCRIBING A SYMPTOM. What hurts, and for how long.
  dawa: {
    title: 'Nadia ko dard ke baare mein batao',
    titleEn: 'Describe the pain to Nadia',
    brief: 'Rafa\'s shoulder has been wrecked since he unloaded that coach — two days now — and he cannot leave the stop long enough to get anything for it. Nadia\'s pharmacy is the green cross on the north-east corner of the plaza, on the way up to El Mercado. Describe the pain for him: what hurts, and how long it has hurt. That is a sentence you will use for the rest of your life.',
    objective: 'The player must describe someone else\'s symptom to Nadia the pharmacist and ask for something for it. They must say WHAT hurts — the shoulder, kandha — and ideally HOW LONG it has hurt (two days, do din se). "Uska kandha dukh raha hai", "do din se dard hai, dawa chahiye" both count. Walking in and asking only for "dawa" with no symptom is NOT enough: she is a pharmacist, she needs to know what is wrong before she hands anything over, so make them describe it. Once they do, she gives an ointment and tells them how to use it.',
    reward: { item: 'dard ki dawa', repWith: 'nadia' },
    check: (t) => /\bkandha\b|\bkandhe\b|\bshoulder\b|\bdard\b|\bdukh\b|\bdukhta\b|\bdukh raha\b|\bpain\b|\bchot\b|\bhurts?\b|\bsujan\b/i.test(t) && /\bdawa\b|\bdava\b|\bdawai\b|\bmedicine\b|\bmarham\b|\bointment\b|\bdo din|\b2 din\b|\bdin se\b|\bdays?\b|\bhafte\b/i.test(t),
    success: 'Achha... kandha. Do din se? Ye marham lo — din mein do baar lagana, aur bhaari cheez bilkul mat uthana. Rafa se kehna teen din aaram kare, warna sardiyon tak dukhta rahega.',
    hint: 'Try: "Uska kandha do din se dukh raha hai. Koi dawa dijiye."',
  },

  // NUMBERS AND MONEY. A price, a quantity, and change.
  machhli: {
    title: 'Do machhli kharido — daam poochhkar',
    titleEn: 'Buy two fish — ask the price first',
    brief: 'Rosa is cooking for you tonight, which means you are bringing the fish. Tomás has the stall on the harbour front in El Puerto, right down by the water. This one is pure numbers: ask what it costs, say how many you want, and deal with the price he names. He will inflate it to see whether you are actually listening — so listen. Kitne ka hai? Do machhli. Aath euro?',
    objective: 'The player must buy fish from Tomás handling BOTH a quantity and a price. They have to ask what it costs ("kitne ka hai?", "kitne paise?", "daam kya hai?") AND name how many fish they want ("do machhli"). Both in one breath is success — they do not have to wait for him to name a figure first. Naming fish with no number and no mention of money is NOT enough; this errand is about the numbers. When they manage it he names his price, sells them two fish, tells them a lie about how early he got up, and gives change.',
    reward: { item: 'do machhli', repWith: 'tomas' },
    check: (t) => /\bmachhli\b|\bmachli\b|\bmachhliyan\b|\bfish\b/i.test(t) && /\bkitne\b|\bkitna\b|\bdaam\b|\bpaise\b|\beuro\b|\bkeemat\b|\bprice\b|\bcost\b|\bpaisa\b/i.test(t) && /\bek\b|\bdo\b|\bteen\b|\bchar\b|\bchaar\b|\bpaanch\b|\bpanch\b|\b\d+\b|\bone\b|\btwo\b|\bthree\b/i.test(t),
    success: 'Do machhli? Aap se dus euro, campeon — lekin aapne daam poocha, isliye aath. Ye subah char baje ki hain, char baje! Lo, do euro wapas. Rosa se kehna Tomas ne bheji hain.',
    hint: 'Try: "Machhli kitne ki hai? Mujhe do machhli chahiye."',
  },

  // POLITE vs BLUNT. The same request, twice, and only one of them works.
  phool: {
    title: 'Abuela Sofia se phool maango — izzat se',
    titleEn: 'Ask Abuela Sofía for flowers — politely',
    brief: 'Rosa wants flowers sent to her sister Marisol. They have not spoken in two years and she cannot get the words out herself, so she is sending you. The flower cart belongs to Abuela Sofía, far end of El Mercado past the last stalls. She is ninety-two and she does not sell to people who bark at her — "phool do" will get you a long silence. Use aap, and put a please in it.',
    objective: 'The player must ask Abuela Sofía for flowers POLITELY. That means a respectful form — "aap" rather than "tu/tum" — and/or a real softener: "kya aap mujhe kuch phool de sakti hain", "kripya", "please", "agar aapko taklif na ho", "dijiye" rather than "do". A blunt command that names flowers and nothing else ("phool do", "mujhe phool chahiye") does NOT count as success: she sniffs, tells them she is not a vending machine, and waits for them to ask again properly. Only the polite version counts. When it comes, she wraps the flowers and asks who they are for.',
    reward: { item: 'Marisol ke liye safed gulab', repWith: 'sofia' },
    check: (t) => /\bphool\b|\bphul\b|\bflower\b|\bflowers\b|\bgulab\b|\brose\b|\broses\b/i.test(t) && /\baap\b|\baapse\b|\baapko\b|\bkripya\b|\bkripaya\b|\bplease\b|\bmehrbani\b|\bdijiye\b|\bdijiyega\b|\bde sakti\b|\bde sakte\b|\bzahmat\b|\btaklif\b/i.test(t),
    success: 'Haan... ab theek se poocha. Baitho, main abhi baandh deti hoon. Kiske liye hain? ... Rosa ke liye? Uski behen Marisol ko safed gulab hamesha pasand the. Ye lo — safed hi doongi. Aur Rosa se kehna, do saal bahut hote hain.',
    hint: 'Try: "Namaste, kya aap mujhe kuch phool de sakti hain?"',
  },

  // === CHAPTER 3 — the fiesta ==============================================

  // TELLING A SHORT STORY BACK. Three events, in order, in the past.
  school: {
    title: 'Elena ko apni poori kahani sunao',
    titleEn: 'Tell Elena your story, start to finish',
    brief: 'Elena teaches at the school on the church square and she has nineteen children who have never met a foreigner who could speak to them. She wants your story — the bag, the dog, the priest, the passport — told back to her in Hindi, in order. Three or four sentences. Past tense. A beginning, a middle and an end. Not a list of words: a story.',
    objective: 'The player must tell Elena a short story in the past tense, with at least three events in a sensible order — the shape of their week: the bag or passport was lost, the dog took it, the priest had it, they got it back. Wording and grammar can be rough; what matters is that it is a sequence of past events and not a single sentence, a question, or a bare list of nouns. When they manage a real little narrative, Elena is delighted and asks them to come and tell it to the children at the fiesta.',
    reward: { item: 'school mein kahani ka nyota', repWith: 'elena' },
    // a story is a sequence, so the fallback counts past-tense events rather
    // than looking for one keyword. Two or more, plus enough words to be a
    // narrative and not a question. English "the" is deliberately not a marker.
    check: (t) => (String(t).match(/\b(tha|thaa|thi|thee|hua|hui|gaya|gayi|gaye|aaya|aayi|liya|diya|mila|dekha|uthaya|bhaaga|bhaag|chala|kiya|rakha)\b/gi) || []).length >= 2 && /\bpassport\b|\bbag\b|\bkutta\b|\bkutte\b|\bchispa\b|\bpadre\b|\bsaman\b|\bsamaan\b/i.test(t) && String(t).trim().split(/\s+/).length >= 8,
    success: 'Bas! Yahi! Tumne poori kahani sunayi — shuru se aakhir tak, bina ruke. Bachche pagal ho jayenge. Shanivaar ko fiesta mein aana aur yahi sunana, sab ke saamne.',
    hint: 'Try: "Mera bag kho gaya tha. Kutta passport le gaya. Padre ko seedhiyon par mila. Kal mujhe wapas mil gaya."',
  },

  // NEGOTIATING A TIME. He counters; you have to land on one.
  nao: {
    title: 'Hassan se waqt tay karo',
    titleEn: 'Fix a time with Hassan',
    brief: 'Tomás is sending you on this one: the fiesta needs the harbour launch, and Hassan keeps its register — nobody crosses the bay without his say-so. If you have not already had the boat story out of Tomás, get it — he knows whose hull is whose. Then walk to the far end of the harbour wall, past the nets, red stripe. Hassan is willing, but he runs on tides, not on favours, so you have to pin him to an actual time. Day, hour, place: "kal subah saat baje bandargah par?" He will counter with a different hour. Agree on one, out loud.',
    objective: 'The player must agree a specific time to meet Hassan: a DAY (kal, parso, shanivaar) and an HOUR (saat baje, chhe baje, subah / shaam) — and then settle it after he counters with a time of his own. Vague arrangements ("baad mein", "kal milte hain" with no hour) are NOT enough. Naming a specific day and hour is the success — he will counter with the hour that suits the tide, and that counts as settled either way. When it is settled he confirms it and mentions the unclaimed bag that has been under the bench in his boat for months.',
    reward: { item: 'launch ki jagah — aur tumhara bag', repWith: 'hassan' },
    check: (t) => /\bkal\b|\bparso\b|\bparson\b|\baaj\b|\bsubah\b|\bshaam\b|\bdopahar\b|\braat\b|\bsomvaar\b|\bmangalvaar\b|\bbudhvaar\b|\bshukravaar\b|\bshanivaar\b|\bitvaar\b|\btomorrow\b|\bmorning\b|\bevening\b/i.test(t) && /\bbaje\b|\bbajey\b|\b\d{1,2}\b|o'?clock|\bsaat\b|\bchhe\b|\bchhah\b|\baath\b|\bpaanch\b|\bnau\b|\bdas\b/i.test(t),
    success: 'Saat baje? Nahi nahi — chhe baje. Us waqt paani shaant rehta hai. Chhe baje, bandargah ke aakhri chhor par, main launch taiyar rakhwa dunga. Aur suno dost — woh laawaris bag jo mahino se lost property mein register hua pada hai... aaj le jao. Mujhe laga tha koi kabhi lene nahi aayega.',
    hint: 'Try: "Kal subah saat baje bandargah par milein?"',
  },

  // ASKING DIRECTIONS across districts — and repeating the route back.
  scooter: {
    title: 'Diego se raasta poochho',
    titleEn: 'Ask Diego for the way',
    brief: 'Lucía\'s grandmother needs the scooter brought down for the fiesta, and the one person who knows every shortcut is Diego — seventeen, glued to that scooter of his out on the olive road, bored enough to know this town down to the last pebble. Ask him the way from the grove to the harbour, and which side of the church square you pass. Then say the route back to him so he can correct you — he will enjoy that far too much.',
    objective: 'The player must ask Diego for DIRECTIONS between places in the town — how to get from the farm or the olive grove to the harbour, the plaza, the market or the church — with a route question, not just a naming of a place: "bandargah kaise jaate hain?", "raasta kis taraf hai?", "yahan se plaza kaise pahunchte hain?". Diego answers in landmarks: down past the olive grove, left at the church square, then straight on to the water. Success is when they have asked for the route between two places; better still if they repeat part of it back so he knows it landed. Once satisfied, he tells them to take the scooter, key is in it.',
    reward: { item: 'Lucia ki scooter ki chaabi', repWith: 'diego' },
    check: (t) => /\bkaise\b|\bkahan\b|\bkahaan\b|\bkaha\b|\bkidhar\b|\bkis taraf\b|\braasta\b|\brasta\b|\bwhere\b|\bway\b|\bdirection\b|\bdirections\b|\bhow do i get\b/i.test(t) && /\bbandargah\b|\bharbour\b|\bharbor\b|\bplaza\b|\bchowk\b|\bgirja\b|\bchurch\b|\bbazaar\b|\bbazar\b|\bmarket\b|\bmandi\b|\bschool\b|\bkhet\b|\bfarm\b|\bzaitoon\b|\bolive\b|\bsamundar\b|\bsheher\b|\bshehar\b|\btown\b/i.test(t),
    success: 'Arre simple hai bhai, dhyan se sun. Zaitoon ke ped par baayen, girja ke chowk se hoke seedha paani tak. Har shortcut mujhe pata hai — bachpan se yahin ghoom raha hoon na. Scooter le ja, chaabi usi mein hai. Kharoch mat lagana, warna khatam.',
    hint: 'Try: "Yahan se bandargah kaise jaate hain? Kis taraf?"',
  },

  // UNDERSTANDING A REFUSAL — and answering it instead of folding.
  fiesta: {
    title: 'Marco ko fiesta mein le jao',
    titleEn: 'Get Marco to come to the fiesta',
    brief: 'Elena has sent you to drag me down to the fiesta tonight. Fair warning, so it does not knock you over: I am going to say no. I always say no — I watch from the railing, that is my thing, ask anyone. So here is the last piece of language I owe you, and it is a word nobody teaches you kindly: nahi. Hear the refusal, understand it, and talk me out of it. In Hindi. If you get me down to that harbour, the town is yours.',
    objective: 'Marco refuses the invitation the first time — he says no, he will watch from the railing the way he always does. The player must UNDERSTAND that refusal and answer it instead of giving up: acknowledge the no and push back — ask why not ("kyun nahi?"), insist ("aana hi padega", "sab aapka intezaar kar rahe hain"), or give him a reason he cannot argue with. Inviting him once and then accepting the no is NOT success. Pushing is: answering a refusal he has already given, or leading with insistence he cannot wriggle out of, both count. When they push in Hindi, he gives in and agrees to come.',
    reward: { item: 'Pueblo ka fiesta', repWith: 'coach' },
    // the second half is pushback, not invitation: "fiesta mein aaiye" is the
    // move that fails here, because he has already said no to exactly that.
    check: (t) => /\bfiesta\b|\bjashn\b|\butsav\b|\bmela\b|\bparty\b|\bbandargah\b|\bharbour\b/i.test(t) && /\bkyun\b|\bkyon\b|\bkyu\b|\bwhy not\b|\bnahi\b|\bnahin\b|\bintezaar\b|\bzaroor\b|\bpadega\b|\bmaan jaiye\b|\bmaan jao\b|\bek baar\b|\bmere liye\b/i.test(t),
    success: 'Arre... achha, achha! Chalta hoon. Dekho — kuch hafte pehle tum yahan khade the aur ek shabd nahi nikalta tha. Aur ab tumne mujhe meri hi zabaan mein hara diya. Chalo, bandargah — abhi. Poora sheher wahin hai, aur aaj wo tumhare liye bhi hai.',
    hint: 'Try: "Kyun nahi? Sab aapka intezaar kar rahe hain — chaliye, fiesta mein aaiye!"',
  },
}

// --- MISSIONS = the spec's chain, wearing the writing above -----------------
// Order, giver, target, chapter and every fact gate come from worldspec.js.
// A chain entry with no writing is dropped loudly rather than shipped as a
// mission full of undefined fields.
export const MISSIONS = MISSION_CHAIN.map(entry => {
  const c = CONTENT[entry.id]
  if (!c) {
    console.error('missions.js: no content authored for spec mission "' + entry.id + '"')
    return null
  }
  return { ...entry, ...c }
}).filter(Boolean)

const saved = JSON.parse(localStorage.getItem('passport_missions') || 'null')
const state = saved || { active: 'kele', done: [], inventory: [] }

// A save from the six-mission build finished chapter 1 and parked active at
// null — "free roam", forever. The arc is longer now, so anyone standing in
// that end state gets pointed at the first errand they have not done.
if (!state.active) {
  const resume = nextMission()
  if (resume) { state.active = resume.id; persist() }
}

function persist() {
  localStorage.setItem('passport_missions', JSON.stringify(state))
}

// Which errand should the card point at? Chain order, always — except that a
// gated errand is only worth pointing at once the player could actually
// unlock it, meaning every prerequisite of its fact is already in hand and
// all that is left is to go and ask the person.
//
// Preferring "already unlocked" instead used to skip gated errands outright:
// finishing Lucia's errand set the card to "tell Marco the good news", because
// padre_has_passport is learned FROM Padre and so was not known at that
// instant — sending the player off to celebrate a passport they did not have.
// Padre's errand is the whole point of that moment; it just has a question in
// front of it.
function reachable(m) {
  if (!m.requiresFact || has(m.requiresFact)) return true
  const f = FACTS.find(x => x.id === m.requiresFact)
  return !!f && f.requires.every(r => has(r))
}

function nextMission() {
  const open = m => !state.done.includes(m.id)
  return MISSIONS.find(m => open(m) && reachable(m))
      || MISSIONS.find(m => open(m) && (!m.requiresFact || has(m.requiresFact)))
      || MISSIONS.find(open)
      || null
}

export function missionState() { return state }

export function activeMission() {
  return MISSIONS.find(m => m.id === state.active) || null
}

// Any errand this person can hand over RIGHT NOW — not merely the one the HUD
// is pointing at. Doing a later errand early is initiative, not a bug: the
// player who walks into the bakery and orders bread correctly should be
// rewarded for it, even if the card still says "buy bananas". Fact-gated
// missions stay locked, because those depend on knowing something.
export function missionFor(npcId) {
  const active = activeMission()
  // ...but the card may now be pointing at a gated errand the player has not
  // unlocked yet, so the shortcut has to respect the gate too. It costs one
  // exchange: the first thing you say to Padre earns the fact, the second
  // completes the errand. That is the shape chapter 1 always had.
  if (active && active.target === npcId && (!active.requiresFact || has(active.requiresFact))) return active
  return MISSIONS.find(m =>
    m.target === npcId &&
    !state.done.includes(m.id) &&
    (!m.requiresFact || has(m.requiresFact))
  ) || null
}

export function completeMission(id) {
  const m = MISSIONS.find(x => x.id === id)
  if (!m || state.done.includes(id)) return null
  // gated missions cannot complete until the required fact has been learned
  if (m.requiresFact && !has(m.requiresFact)) return null
  state.done.push(id)
  if (m.reward?.item) state.inventory.push(m.reward.item)
  // Advance in chain order to the first errand still open and actually
  // reachable — skipping anything the player already finished ahead of
  // schedule, and parking a gated one that is still several questions away.
  const next = nextMission()
  state.active = next ? next.id : null
  persist()
  return m
}

export function resetMissions() {
  localStorage.removeItem('passport_missions')
}
