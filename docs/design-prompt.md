# Design prompt — Passport (Pueblo campaign, Phase 1)

*Paste this into a fresh Claude conversation to generate visual direction and screen mockups. It's written to be self-contained — no prior context needed.*

---

I'm designing the visual identity and UI for a game called **Passport** and I'd like you to produce concept mockups. Please read all of this before starting.

## What the game is

You're dropped into a small Spanish town where **nobody speaks English**, and you have to make a life there. It's a top-down open world — think Pokémon Silver's structure, GTA's free-roam-plus-missions shape — except every resident is a live AI character with a name, a job, a daily routine, and a memory of every conversation you've had with them. You talk to them **out loud, with your microphone**, and they answer in real speech. There is no typing and no dialogue-choice menu.

Missions come from people, not a menu: deliver bread for the baker, talk your way out of trouble with the woman whose flowerpot you allegedly broke. One character — your coach — speaks English, and debriefs you after conversations.

## Scope for these mockups

Only the **first district of the first campaign**: *La Plaza* in the town of Pueblo, Spain. A fountain, a café, a bakery (*panadería*), a few residential facades. Three residents live here: **Rosa** (58, baker, proud, teases people she likes), **Tomás** (fisherman, exaggerates), and **Doña Carmen** (watches the street from her balcony, misses nothing). Plus the coach.

## Visual direction

Modern pixel art — the reference points are Sea of Stars, Eastward, and Stardew Valley, *not* Game Boy Color. Detailed sprite work with real lighting and atmosphere, but still honestly pixels.

- **Perspective:** 3/4 top-down, 32px tile grid, characters roughly 64px tall — close enough that faces and body language read.
- **Palette:** Mediterranean golden hour. Warm lime-washed plaster, terracotta roof tiles, deep cool shadow, bright bounce light off stone. The town should feel *hot and lived-in* — laundry lines, worn steps, chairs left outside the café.
- **Mood:** unhurried and welcoming. This is a place you want to be stuck in.

Please avoid: Duolingo-style bright gamification, cartoon mascots, XP bars and streak counters plastered over everything, and generic fantasy-RPG UI frames.

## The hard problem I most want your thinking on

**How does a conversation look when it's voice-only?**

Every convention I'd normally reach for is wrong here. There's no dialogue tree to render, no text input box, no "press A to continue." The player is *speaking*, and the interface has to make that feel natural rather than like a voice memo app bolted onto a game.

Things that matter:
- The world shouldn't freeze into a fullscreen dialogue box. Rosa should keep existing in her bakery while you talk to her.
- The player needs to know, unambiguously, when the game is listening to them and when it isn't.
- Spanish subtitles appear as *training wheels* the player is meant to eventually switch off — so they should be legible but not the centre of attention, and the design should look right with them turned off entirely.
- A resident should be able to visibly react while you're still mid-sentence (confusion, delight, patience).

## Screens I'd like

1. **Overworld** — the player standing in La Plaza, fountain and panadería visible, Rosa sweeping her step. Show the ambient HUD in its resting state (as minimal as you can justify).
2. **Mid-conversation with Rosa** — the player is speaking, Rosa is listening, subtitles on. This is the most important screen.
3. **Same conversation, subtitles off** — to prove the design survives without them.
4. **Coach debrief** — the coach reviewing how the conversation went. This is the only screen where English appears, and it should feel like a friend on a bench, not a report card.

## Deliverables

For each screen: a mockup, plus a short note on what you decided and why. Then a compact style guide — palette with hex values, type choices, and the rules for the conversation UI so it can be applied consistently to screens you haven't drawn.

Feel free to push back on anything above if you think there's a better answer. I'd rather see one strong opinion than four safe options.

## One note on what happens next

These mockups get handed to an engineer to build in Phaser 4, so a couple of things make that handoff much cheaper:

- **Name your colours.** A palette with hex values and semantic names (`--plaster`, `--shadow-cool`, `--subtitle-bg`) can be lifted straight into code. A picture of a palette can't.
- **Separate the world from the interface.** The town itself is pixel art on a 32px grid. The overlay — subtitles, the listening indicator, the coach panel — will be built as regular UI over the game canvas, so it can use real fonts and scale cleanly. Please be explicit about which layer each element belongs to.
- **Say what animates.** If the listening indicator pulses or a subtitle fades in, describe the timing and easing. Motion is where this UI will live or die, and it's the thing screenshots can't carry.
