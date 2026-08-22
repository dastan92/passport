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

  // === levelspec additions =================================================
  // Nine more errands from levelspec.js. Chain rows for these live in
  // EXTRA_CHAIN below (worldspec.js is frozen).

  // ORDERING A DRINK. The first service transaction: request, receive, thank.
  chai: {
    title: 'Miguel ke cafe mein chai maango',
    titleEn: 'Order a drink at Miguel\'s cafe',
    brief: 'Miguel runs the cafe on the west side of the plaza — striped awning, three little tables, the only place in town with chairs facing the fountain. Sit down and order something to drink, in Hindi. "Ek chai dijiye" is a whole transaction. Bananas were shopping; this is service — someone brings it to you, and you thank them.',
    objective: 'The player must order a drink from Miguel — chai, coffee, juice, water, anything drinkable — using some request form: "ek chai dijiye", "mujhe coffee chahiye", "ek pani milega?". Just naming a drink with no request around it is not an order. Grammar can be rough; if you understood what they want to drink, serve it.',
    reward: { item: 'garam chai', repWith: 'miguel' },
    check: (t) => /\bchai\b|\bchaay\b|\bcoffee\b|\bkaafi\b|\bcafe\b|\bjuice\b|\bpani\b|\bpaani\b|\bdoodh\b|\bnimbu\b|\bwater\b/i.test(t) && /\bchahiye\b|\bdijiye\b|\bdena\b|\bde do\b|\bmilega\b|\bmilegi\b|\bplease\b|\bek\b|\bdo\b|\blaao\b|\blao\b/i.test(t),
    success: 'Ek chai, garam garam! Baitho, baitho. Pueblo mein pehli chai kabhi nahi bhoolti — aur ye ghar ki taraf se hai.',
    hint: 'Try: "Namaste! Ek chai dijiye, please."',
  },

  // HAGGLING. Object to the price and counter with your own number.
  bhav: {
    title: 'Pilar se bhav karo',
    titleEn: 'Haggle the price down with Pilar',
    brief: 'Back to Pilar\'s stall in El Mercado — she remembers you, which is exactly the problem: she quotes newcomers double. She will name a price for a kilo of oranges. Do not pay it. Say it is too much — "bahut mehnga hai!" — and counter with your own number. She respects a haggler and despises a pushover. Meet her in the middle.',
    objective: 'The player is buying fruit from Pilar and must HAGGLE: object that the price is too high ("bahut mehnga hai", "itna zyada?", "kam kijiye") AND counter-offer a specific lower number ("teen euro doonga", "do euro?"). Paying whatever she names, or objecting without naming their own number, is NOT success. When they push a real counter-offer, she groans theatrically, meets them near the middle, and closes the deal.',
    reward: { item: 'ek kilo santre — sahi daam par', repWith: 'pilar' },
    check: (t) => /\bmehnga\b|\bmehngi\b|\bmahanga\b|\bmahangi\b|\bzyada\b|\bjyada\b|\bkam\b|\bsasta\b|\bsasti\b|\bexpensive\b|\btoo much\b/i.test(t) && /\bek\b|\bdo\b|\bteen\b|\btin\b|\bchar\b|\bchaar\b|\bpaanch\b|\bpanch\b|\bchhe\b|\bsaat\b|\baath\b|\b\d+\b|\beuro\b/i.test(t),
    success: 'Aiii, tum toh ekdum local ho gaye! Chalo, chaar euro — na tumhara, na mera. Lo santre. Aur kisi ko mat batana maine daam kam kiya, warna poora bazaar sar par chadh jayega.',
    hint: 'Try: "Bahut mehnga hai! Teen euro mein dijiye."',
  },

  // FOLLOWING SEQUENCED INSTRUCTIONS. First X, then Y — said back in order.
  kheti: {
    title: 'Diego ke khet par haath batao',
    titleEn: 'Help out at Diego\'s farm',
    brief: 'Picking week at the olive plot in Las Afueras — Diego\'s family\'s trees, which means Diego has been dragged off his scooter into a basket line, and he is furious about it. Take the west road past the grove marker until the town stops. Ask him what to do, then FOLLOW THE ORDER he gives — say it back to him, "pehle paani, phir tokri", so he knows it landed. Doing step two first is how city people break farms.',
    objective: 'Diego gives the player two farm tasks in a fixed order — first water the seedlings, then carry the baskets to the shed. The player must show they can follow SEQUENCED instructions: ask what to do and then repeat or confirm the order using sequence words — "pehle paani doon, phir tokri uthaoon?", "theek hai, pehle paani, uske baad tokri". A bare "main madad karunga" with no grasp of the order is NOT success. When they state the steps in the right order, he puts them to work, quietly impressed.',
    reward: { item: 'khet ke taaza santre', repWith: 'diego' },
    check: (t) => /\bpehle\b|\bpahle\b|\bphir\b|\bfir\b|\buske baad\b|\bbaad mein\b|\bfirst\b|\bthen\b/i.test(t) && /\bpaani\b|\bpani\b|\btokri\b|\bbeej\b|\bkhet\b|\bkaam\b|\bwater\b|\bbaskets?\b|\bzaitoon\b|\bolive\b|\bsantre\b/i.test(t),
    success: 'Bhai, tune aadha kaam nipta diya! Chal maan gaya — tu theek hai. Papa ko bolna mat, warna agle hafte bhi bula lenge. Paani pehle, tokri baad mein — yaad rakha na?',
    hint: 'Try: "Kya karoon? Pehle paani doon, phir tokri uthaoon?"',
  },

  // REPORTED SPEECH. Carry a complaint without owning it: 'woh kehti hain ki...'
  jhagda: {
    title: 'Carmen aur Nadia ka jhagda suljhao',
    titleEn: 'Settle Carmen and Nadia\'s feud',
    brief: 'Doña Carmen is at war with her third floor — Nadia rooms right above her, and something up there scrapes across the boards at midnight, every midnight. Carmen will not walk down to the pharmacy and Nadia has no idea she is a villain. Get Carmen\'s side first, then take it to Nadia at the green cross — but say it as REPORTED speech: "Carmen kehti hain ki raat ko shor hota hai." You are the messenger, not the accuser.',
    objective: 'The player must relay Carmen\'s noise complaint to Nadia using REPORTED SPEECH — "Carmen kehti hain ki...", "unka kehna hai ki...", "woh bolti hain ki raat ko awaaz aati hai" — mentioning the noise or the nights. Complaining in their own voice ("aap raat ko shor karti hain") is not the exercise, and neither is vaguely saying Carmen is angry with no clause about what she SAYS. When the player reports it properly, Nadia is mortified — it is the delivery crates she drags in at midnight — and promises to move them to mornings, sending an apology back down.',
    reward: { item: 'teesri manzil par shanti', repWith: 'nadia' },
    check: (t) => /\bkehti\b|\bkehta\b|\bkeh rahi\b|\bkeh rahe\b|\bkehna hai\b|\bkaha ki\b|\bkaha hai\b|\bbolti\b|\bbolta\b|\bboli ki\b|\bbola ki\b|\bshikayat\b|\bsays\b|\bsaid\b/i.test(t) && /\bshor\b|\bawaaz\b|\bawaz\b|\bnoise\b|\braat\b|\bmidnight\b|\bneend\b|\bso nahi\b|\bghaseet/i.test(t),
    success: 'Hai Allah — woh MAIN hoon? Dawai ke crate raat ko aate hain, main unhe andar kheenchti hoon... mujhe laga sab sote hain. Kal se subah karwaungi. Carmen ji se kehna — mujhe maaf karein, aur ye khansi ka sharbat unke liye le jao.',
    hint: 'Try: "Carmen kehti hain ki raat ko upar se bahut shor hota hai."',
  },

  // FAITHFUL RELAY. Memory across the walk: the numbers arrive intact.
  sandesh: {
    title: 'Rosa ka sandesh Elena tak pahunchao',
    titleEn: 'Carry Rosa\'s message to Elena',
    brief: 'Rosa cannot leave the ovens today and Elena needs an answer about the fiesta bread. Get the message from Rosa herself — listen properly, numbers and all — then walk it across to the school on the church square and say it back to Elena. Not the vibe of it: the message. Fifty is not "kuch", and Saturday morning is not "kabhi".',
    objective: 'The player is delivering Rosa\'s message to Elena and must relay it FAITHFULLY: Rosa will send fifty rotis for the children on Saturday morning, and she needs the final count by Friday. Success requires the core content intact — the bread, the number fifty (pachaas), and Saturday morning — ideally framed as a relay ("Rosa ne kaha hai ki..."). A vague "Rosa roti bhejegi" with no number and no day is NOT a faithful delivery; ask what else Rosa said. When the numbers arrive whole, Elena is delighted.',
    reward: { item: 'Elena ka jawaab Rosa ke liye', repWith: 'elena' },
    check: (t) => /\broti\b|\brotiyan\b|\bbread\b/i.test(t) && /\bpachaas\b|\bpachas\b|\b50\b|\bfifty\b/i.test(t) && /\bshanivaar\b|\bshanivar\b|\bsaturday\b|\bsubah\b/i.test(t),
    success: 'Pachaas rotiyan, shanivaar subah, ginti shukravaar tak — ek shabd nahi giraya tumne! Rosa se kehna: ginti pakki. Unnees bachche aur ek lalchi teacher — bees karo.',
    hint: 'Try: "Rosa ne kaha hai ki woh shanivaar subah pachaas rotiyan bhejengi."',
  },

  // IMPERATIVES AND BODY VERBS. Language with your back in it.
  jaal: {
    title: 'Subah jaal kheenchne mein madad karo',
    titleEn: 'Help haul the nets at dawn',
    brief: 'Hassan has put your name about, which means Tomás expects you on the harbour front at dawn when the nets come in. This is language with your back in it: pakdo, kheencho, uthao — grab, pull, lift. Tomás will shout the verbs at you; shout them back, tell him what to do with his end. A man holding forty kilos of wet net does not want a paragraph.',
    objective: 'The player is helping Tomás haul fishing nets and must use IMPERATIVES and body/action verbs about the net work — "jaal pakdo", "kheencho!", "apni taraf kheenchiye", "ab uthao", "ruko, main pakadta hoon". Talking ABOUT helping ("main madad karna chahta hoon") with no action verb directed at the work is NOT it — the errand wants a command or an action in their mouth. When real imperatives fly, the net comes in and Tomás declares them half a fisherman.',
    reward: { item: 'subah ki pakad ka hissa', repWith: 'tomas' },
    check: (t) => /\bjaal\b|\bjal\b|\bnets?\b|\brassi\b|\brope\b/i.test(t) && /\bkheench|\bkhench|\bkhinch|\bpakad|\bpakdo\b|\buthao?\b|\butha lo\b|\buthaiye\b|\bchhodo\b|\bpull\b|\bgrab\b|\bhold\b|\blift\b/i.test(t),
    success: 'Kheencho! Haan, aise! Shabash — jaal aa gaya, poora chandi jaisa chamak raha hai. Ye lo, teri pakad ka hissa — subah uthne walon ko samundar kabhi khaali haath nahi bhejta.',
    hint: 'Try: "Jaal pakdo! Ab apni taraf kheencho!"',
  },

  // THE THESIS MISSION. Your own arc, told back, in the past tense.
  kahani: {
    title: 'Bachchon ke liye apni kahani',
    titleEn: 'Your story, for the children',
    brief: 'This is the one the whole town has been walking you towards. Elena wants the fiesta story rehearsed — YOUR story, in your own words: how you arrived with nothing, what was lost, who helped, how it ended. Past tense, three or four sentences, in order. Not the events — the telling. A few weeks ago you could not say your own name in this language. Say your whole life since the bus.',
    objective: 'The player must tell Elena their own story of the passport arc as a PAST-TENSE NARRATIVE: at least three connected events about what happened — arriving, losing the bag or passport, the dog or the priest or the townspeople, getting it back, staying. The judge must require actual past-tense narration (tha/thi/gaya/mila/hua forms) across multiple events in sequence — a list of words, a present-tense summary, or a single sentence does NOT pass. Rough grammar is fine; the shape of a told story is the requirement. When it lands, Elena is moved.',
    reward: { item: 'fiesta ki kahani — taiyar', repWith: 'elena' },
    // deeper than 'school': three past-tense events and enough words to be a
    // telling. English past markers deliberately absent, as everywhere else.
    check: (t) => (String(t).match(/\b(tha|thaa|thi|thee|the|hua|hui|gaya|gayi|gaye|aaya|aayi|liya|diya|mila|mili|dekha|paaya|uthaya|bhaaga|bhaag|raha|rakha|kiya|ban gaya)\b/gi) || []).length >= 3 && /\bpassport\b|\bbag\b|\bkutta\b|\bchispa\b|\bpadre\b|\bpueblo\b|\bsheher\b|\bbus\b|\bsaman\b|\bsamaan\b/i.test(t) && String(t).trim().split(/\s+/).length >= 12,
    success: 'Bas... perfect. Tumhe pata hai tumne abhi kya kiya? Jis zabaan mein tum apna naam nahi le paate the, usmein tumne apni poori zindagi suna di. Shanivaar ko bachchon ke saamne bilkul aise hi — ek shabd mat badalna.',
    hint: 'Try: "Main bus se aaya tha aur mera bag kho gaya tha. Ek kutta mera passport le gaya tha. Padre ne use seedhiyon par paaya tha. Ab ye sheher mera ghar ban gaya hai."',
  },

  // POLITE INVITATION FORMS. Aap, and a real inviting verb.
  //
  // ENGINE COMPROMISE: the design wants three personal invitations (Pilar,
  // Miguel, Sofia), but the engine judges exactly one target per mission. We
  // target the LAST invitation — Abuela Sofía, the hardest audience in town —
  // and let the brief route the player past the other two on the way. Only
  // the Sofía conversation is formally verified.
  nyota: {
    title: 'Sab ko fiesta ka nyota do',
    titleEn: 'Invite the town to the fiesta',
    brief: 'The fiesta does not have posters; it has you. Walk the town and invite people to Saturday night at the harbour — personally, politely, by name. Start with Pilar at her stall, get Miguel at the cafe, and finish with Abuela Sofía at the flower cart, because if Sofía comes, everyone comes. You know her rule by now: aap, and a real invitation — "aap zaroor aaiye" — not an announcement.',
    objective: 'The player is personally inviting Abuela Sofía to the fiesta — Saturday night at the harbour — and may mention having invited others on the way. Success requires a POLITE INVITATION form: "aap"-register plus a real inviting verb — "aap zaroor aaiye", "aapko nyota hai", "hum chahte hain ki aap aayen". A bare announcement ("shanivaar ko fiesta hai") without inviting HER is not an invitation, and she will say so. When it comes properly, she accepts, moved that somebody walked over to ask her in person.',
    reward: { item: 'Sofia ka haan — aur poore sheher ka', repWith: 'sofia' },
    check: (t) => /\bfiesta\b|\bjashn\b|\butsav\b|\bmela\b|\bparty\b/i.test(t) && /\baaiye\b|\baaiyega\b|\baayiye\b|\baayen\b|\baa jaiye\b|\bzaroor aana\b|\bnyota\b|\bnimantran\b|\bdawat\b|\bdaawat\b|\bpadhariye\b|\binvite\b|\binvitation\b/i.test(t),
    success: 'Nau saal ho gaye kisi ko mere paas aake nyota dete hue... sab sochte hain, budhiya toh aa hi jayegi. Haan beta, main aaoongi — aur apne sabse safed gulab leke aaoongi. Fiesta mein phool toh hone hi chahiye.',
    hint: 'Try: "Abuela, shanivaar raat bandargah par fiesta hai — aap zaroor aaiye!"',
  },

  // TIMES AND QUANTITIES IN ONE NEGOTIATION. Numbers, held under pressure.
  intezam: {
    title: 'Rafa ke saath intezam pakka karo',
    titleEn: 'Lock the fiesta logistics with Rafa',
    brief: 'Last job before the music starts: the benches. Rafa can run them down from the school to the harbour on the bus — but he needs it in numbers, not vibes. How many benches, and what time he loads them. Go to the stop in El Puerto and pin BOTH in one deal: "bees bench, shanivaar chaar baje". He will quibble about the hour — the schedule, the nap, something. Hold your quantity, land the time.',
    objective: 'The player must arrange fiesta logistics with Rafa in ONE negotiation containing BOTH a quantity and a time: how many benches (or tables, chairs) — bees, twenty, any concrete count — AND when he should move them ("shanivaar chaar baje", "dopahar ko"). A quantity with no time, or a time with no quantity, is NOT settled — push for the missing half. He counters the hour once (five, not four, after his nap); the player accepting or restating the deal settles it. When both numbers are landed he confirms the whole plan back.',
    reward: { item: 'fiesta ka poora intezam', repWith: 'rafa' },
    check: (t) => /\bbees\b|\bdas\b|\bpandrah\b|\bpachees\b|\bpachchees\b|\bdus\b|\b\d+\b/i.test(t) && /\bbench\b|\bbenches\b|\bkursi\b|\bkursiyan\b|\bmez\b|\btables?\b|\bchairs?\b/i.test(t) && /\bbaje\b|\bbajey\b|\bsubah\b|\bdopahar\b|\bshaam\b|\bshanivaar\b|o'?clock/i.test(t),
    success: 'Bees bench, shanivaar... chaar nahi, paanch baje — dopahar ki neend ke baad, kandha bhi ab theek hai. Pakka: paanch baje school se uthaunga, chhe baje tak bandargah par laga doonga. Dekho toh — driver ko bhi fiesta mein kaam mil gaya.',
    hint: 'Try: "Bees bench chahiye — shanivaar chaar baje school se le jaoge?"',
  },
}

// --- chain rows for the levelspec missions ----------------------------------
// worldspec.js is frozen, so the nine levelspec ids get their giver/target/
// chapter rows here, same shape as MISSION_CHAIN, concatenated below.
// Chapters follow the levels: chai is L1 (chapter 1), bhav is L4 (chapter 2),
// the rest are L6–L10 (chapter 3). Level ordering itself lives in levelspec.
const EXTRA_CHAIN = [
  { id: 'chai',    giver: 'coach',  target: 'miguel', chapter: 1 },
  { id: 'bhav',    giver: 'coach',  target: 'pilar',  chapter: 2 },
  { id: 'kheti',   giver: 'miguel', target: 'diego',  chapter: 3 },
  { id: 'jhagda',  giver: 'carmen', target: 'nadia',  chapter: 3, requiresFact: 'carmen_noise' },
  { id: 'sandesh', giver: 'rosa',   target: 'elena',  chapter: 3, requiresFact: 'rosa_message' },
  { id: 'jaal',    giver: 'hassan', target: 'tomas',  chapter: 3 },
  { id: 'kahani',  giver: 'elena',  target: 'elena',  chapter: 3 },
  { id: 'nyota',   giver: 'elena',  target: 'sofia',  chapter: 3 },
  { id: 'intezam', giver: 'elena',  target: 'rafa',   chapter: 3 },
]

// --- MISSIONS = the spec's chain, wearing the writing above -----------------
// Order, giver, target, chapter and every fact gate come from worldspec.js
// (plus EXTRA_CHAIN for the levelspec nine). A chain entry with no writing is
// dropped loudly rather than shipped as a mission full of undefined fields.
export const MISSIONS = [...MISSION_CHAIN, ...EXTRA_CHAIN].map(entry => {
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
