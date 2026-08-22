# Passport — polish audit (2026-08-22)

Written after playing the full ten-level game end to end. Framed the way a
reviewer would score a vertical slice heading for early access: what already
holds up, and what stands between this and "feels finished."

## Verdict in one paragraph

The core loop is genuinely novel and genuinely works: talking to people who
remember you, in a language you're learning, with completion judged on whether
you actually communicated — no other language product plays like this. The
systems layer (levels, gating, knowledge, judging, voices, cost) is deep and
tested. What's missing is almost entirely the *shell* around the game: the
first sixty seconds, the save model, failure feedback, and the dozen small
frictions that separate a strong prototype from a product. None of it is
research; all of it is known work.

---

## A. Onboarding & identity — the biggest gap

| # | Item | Why it matters | Effort |
|---|------|----------------|--------|
| A1 | **No title screen.** The game boots straight into the world behind the intro card. There's no moment of arrival, no "New game / Continue," no place for the game to say what it is. | First impression; also the natural home for profiles, settings and credits. | S |
| A2 | **No characters / save slots.** One implicit save in localStorage. A second player (or a fresh run) means wiping the first. The game is *about* a person the town remembers — the player should be a named someone from minute one. | Identity is the theme; also enables household sharing and safe experimentation. | M |
| A3 | **Name is learned incidentally.** NPCs pick your name up if you happen to introduce yourself. Good mechanic — but the game should also *know* your name from character creation and let NPC knowledge of it remain diegetic (they know it only once you've told them). | Coherence between system and fiction. | S |
| A4 | **No tutorialization of the interface itself.** WASD/E/C/M live in a hint line. First-time players need one guided beat: walk here, talk to Marco, press C. The intro card explains the *story* but nothing teaches the *controls*. | The genre is unfamiliar; thirty seconds of guidance prevents the first-minute bounce. | S |
| A5 | **No language-level onboarding.** The game assumes zero Hindi, but a heritage speaker starts bored. One question at character creation — "kitni Hindi aati hai?" — could seed the learner model level. | Wrong difficulty in minute one is the classic language-app churn point. | S |

## B. Save model & session flow

| # | Item | Why | Effort |
|---|------|-----|--------|
| B1 | **Per-character state snapshots.** All ~12 localStorage keys must namespace per character; switching characters swaps the world's memory of you. | Follows from A2. | M |
| B2 | **No "continue" summary.** Rejoining after days should tell you where you were: level, active errand, who you talked to last. Marco is the natural narrator ("While you were away…"). | Re-entry friction kills long-gap retention. | S |
| B3 | **No export/backup.** localStorage is fragile (browser clear = character gone). A "download passport" JSON export/import is cheap insurance and thematically perfect. | Losing a 10-level character to a cache clear is unforgivable. | S |
| B4 | **Reset is all-or-nothing.** "Reset game" nukes everything; with profiles it should delete *a character*. | Follows from A2. | S |

## C. Moment-to-moment game feel

| # | Item | Why | Effort |
|---|------|-----|--------|
| C1 | **No interaction feedback on NPCs.** The ★ on the talk prompt is the only signal someone is errand-relevant. At distance, nothing distinguishes a mission target from set dressing. A subtle diegetic tell (they look up as you pass; a lifted hand) was designed but never built. | Wandering without signal reads as emptiness. | M |
| C2 | **Silent failure states.** When the judge refuses a completion, the player gets an in-character reply but no signal that they were *close*. A gentle coach nudge after two failed attempts ("You're near — try naming the quantity") turns frustration into teaching. | The judge is the game's teacher; right now it only grades, never coaches. | S |
| C3 | **No footsteps / interaction sound.** Music and speech exist; the body is silent. Footsteps on cobble vs sand, a soft UI tick on prompt appearance. | Sound is half of game feel. | S |
| C4 | **Residents stand at their post forever.** The design doc promised daily schedules ("Rosa opens at seven"). Even two positions per resident (morning/evening) with the town clock would make the town breathe. | Aliveness is the pitch; static positions undercut it. | M–L |
| C5 | **Ambient walkers don't react to you.** They path around you but never glance, greet, or comment. One line of Hindi from a passerby per session would land hard. | Cheap aliveness win. | S |

## D. Learning loop (the actual product)

| # | Item | Why | Effort |
|---|------|-----|--------|
| D1 | **No review surface.** Words the learner has produced (the `shabd` counter) are counted but never shown. A passport-styled vocabulary page — tap a word, hear it — would close the learn/review loop. | Counting without review is a pedometer, not a coach. | M |
| D2 | **Mission language goals are invisible.** Each mission teaches something specific (past tense, haggling) but the player is never told what. One line in the mission card ("sikhoge: aankde aur daam") sets intent. | Learners do better knowing what they're practicing. | S |
| D3 | **No pronunciation loop.** You hear residents; you never hear *yourself*. Even without STT scoring, a "record and compare" against the TTS line is valuable. The mic is the roadmap's next epic anyway. | The doc's thesis is speaking; typing is the placeholder. | L |
| D4 | **Subtitles have no reading help.** Long Hindi replies offer no tap-a-word gloss. The EN toggle is all-or-nothing translation. | Word-level tap-gloss is the single most-used feature in every reading app. | M |

## E. Robustness & platform

| # | Item | Why | Effort |
|---|------|-----|--------|
| E1 | **No offline/degraded banner.** When the server (and thus the LLM/voice) is down, residents quietly go scripted. The status line says it, but a visible mode banner would prevent "the game got dumb" confusion. | Honesty about degraded mode. | S |
| E2 | **No error recovery UX.** A failed TTS or LLM call logs to the status line; there's no retry affordance. | Papercut. | S |
| E3 | **Untested on mobile/touch.** No touch controls; the panel layout is desktop-only. Decide explicitly: desktop-only for now (say so) or add a virtual stick. | Undefined platforms look like bugs. | M–L |
| E4 | **GitHub Pages build silently loses voice/LLM** unless the player brings a key. The docs/play deploy needs a landing note explaining local-server vs static mode. | Expectation setting. | S |

## F. Content depth (post-polish)

- A second town / language campaign is the real long-term test of the
  "country = content" architecture. Not polish — the next game.
- Free-roam endgame is thin: after L10, errands stop. Repeatable "living"
  missions (daily bread run, gossip rounds) would keep the town warm.
- The passport itself could be a viewable object — stamps, vocabulary,
  people met — which would double as B2's continue summary and D1's review
  surface. **This is the highest-leverage single screen in the game.**

## Priority order (if doing them in sequence)

1. **A1+A2+B1** — title screen, characters, per-character saves (this session)
2. **C2** — judge-failure coaching (the teacher half of the judge)
3. **B2 + F-passport** — the passport screen: continue summary + review surface
4. **C1+C5** — NPC signalling and passerby life
5. **D2, B3, E1** — small, high-value
6. **C4** — schedules (biggest aliveness win, most work)
7. **D3** — the mic (the roadmap's next epic)
