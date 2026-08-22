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

**The primary reference is Alba: A Wildlife Adventure.** Stylized low-poly 3D, a sun-drenched Spanish Mediterranean town, clean chunky geometry, colour doing the work that texture detail would do in a heavier game. If a screen of Passport could be mistaken for a lost district of Alba's island — but denser, more urban, more lived-in — the art direction is correct.

Secondary influence, used with restraint: **Tunic's** camera and light — the discipline of a fixed isometric-ish view that keeps the world readable, and dramatic sun that gives a simple scene depth. We're borrowing its lighting confidence, not its mystery-ruins mood.

The guiding idea behind both: **this is a diorama.** A small, handmade-feeling model village you look down into, where the sense of quality comes from light, composition and camera — not polygon count.

- **Camera:** high three-quarter view looking down into the town, gently drifting while you wander, easing in when a conversation starts. Shallow depth of field at the frame edges so the town reads like a model.
- **Geometry:** low-poly, clean silhouettes, no surface clutter. Alba's level of simplification, roughly.
- **Light is the main character.** Hard Andalusian sun, long shadows across the plaza, warm bounce off white plaster, deep cool shade under awnings. The town at 8am and at 8pm should feel like different places to be.
- **Palette:** lime-washed white, terracotta, olive, dust, and a deep saturated blue in the shadows. Hot, dry, welcoming.
- **Atmosphere:** laundry lines, chairs left out at the café, worn steps, dust in the light. Signs of people having lived here a long time.

Please avoid: pixel art (we moved past it deliberately), Duolingo-style bright gamification, cartoon mascots, XP bars, fantasy-RPG UI frames, and the flat over-lit look of most mobile 3D.

## The hard problem I most want your thinking on

**How does a conversation look when it's voice-only?**

Every convention I'd normally reach for is wrong here. There's no dialogue tree to render, no text input box, no "press A to continue." The player is *speaking*, and the interface has to make that feel natural rather than like a voice memo app bolted onto a game.

Things that matter:
- The world shouldn't freeze into a fullscreen dialogue box. Rosa should keep existing in her bakery while you talk to her.
- The player needs to know, unambiguously, when the game is listening to them and when it isn't.
- Spanish subtitles appear as *training wheels* the player is meant to eventually switch off — so they should be legible but not the centre of attention, and the design should look right with them turned off entirely.
- A resident should be able to visibly react while you're still mid-sentence (confusion, delight, patience).

## The second hard problem: how do you know someone has something for you?

The game is open-world with side missions, structurally like GTA — free roam anywhere that's unlocked, and missions you pick up from people. But GTA solves discovery with map markers and floating letters, and that solution would wreck this game: the moment a resident has an exclamation point over their head, they stop being a person and become a vending machine.

The intended answer is that **people just tell you.** Rosa mentions her sister needs bread. Carmen complains about the noise upstairs. Your coach says the cousin at the market is expecting you. The coach is the only element allowed to behave like a user interface, and if you've forgotten what you owe whom, you ask him.

So: how do you make a town feel *full of things to do* without marking it up? Is there a diegetic signal — posture, where someone's looking, whether they're free or busy — that reads as "this person would talk to you right now" without becoming an icon? I'd love a proposal here, including the failure case: a player who wanders for five minutes and finds nothing to do.

## Screens I'd like

1. **Overworld** — the player standing in La Plaza, fountain and panadería visible, Rosa sweeping her step. Show the ambient HUD in its resting state (as minimal as you can justify).
2. **Mid-conversation with Rosa** — the player is speaking, Rosa is listening, subtitles on. This is the most important screen.
3. **Same conversation, subtitles off** — to prove the design survives without them.
4. **Coach debrief** — the coach reviewing how the conversation went. This is the only screen where English appears, and it should feel like a friend on a bench, not a report card. This is also where a player would go to ask "what was I supposed to be doing?", so it doubles as the closest thing the game has to a quest log.
5. **A resident with something to offer** — the same plaza, but showing however you've decided to signal that Rosa wants something from the player. If your answer is "nothing visual at all," show that and explain how the player finds out instead.

## Deliverables

For each screen: a mockup, plus a short note on what you decided and why. Then a compact style guide — palette with hex values, type choices, and the rules for the conversation UI so it can be applied consistently to screens you haven't drawn.

Feel free to push back on anything above if you think there's a better answer. I'd rather see one strong opinion than four safe options.

## One note on what happens next

These mockups get handed to an engineer to build in Phaser 4, so a couple of things make that handoff much cheaper:

- **Name your colours.** A palette with hex values and semantic names (`--plaster`, `--shadow-cool`, `--subtitle-bg`) can be lifted straight into code. A picture of a palette can't.
- **Separate the world from the interface.** The town is rendered 3D; the overlay — subtitles, the listening indicator, the coach panel — is regular UI drawn over the canvas, so it can use real fonts and scale cleanly. Please be explicit about which layer each element belongs to.
- **Specify the light and the camera.** Sun angle, shadow softness, colour temperature, field of view, how far the camera pushes in during a conversation. In this direction those settings *are* the art style, so they need to be written down as numbers rather than implied by a picture.
- **Say what animates.** If the listening indicator pulses or a subtitle fades in, describe the timing and easing. Motion is where this UI will live or die, and it's the thing screenshots can't carry.
