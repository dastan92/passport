# Asset credits

## Music — Scott Buckley (CC-BY 4.0)

Cinematic tracks from <https://www.scottbuckley.com.au> — free to use, including
commercially, with attribution.

- *Home Was You* — Scott Buckley
- *Memories of Stone* — Scott Buckley
- *Convergence* — Scott Buckley

> Music by Scott Buckley – www.scottbuckley.com.au
> Licensed under Creative Commons Attribution 4.0 International
> https://creativecommons.org/licenses/by/4.0/

This credit must remain visible in the game (see the in-game credits line) and
in any distribution.

## Characters — Quaternius (CC0 1.0, public domain)

Rigged, skinned, animated glTF characters from the **Ultimate Animated
Character Pack** by Quaternius. Released under
[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) —
public domain dedication, no attribution required. Credited here anyway.

- Author: Quaternius — <https://quaternius.com> · <https://www.patreon.com/quaternius>
- Pack: Ultimate Animated Character Pack — <https://quaternius.com/packs/ultimatedanimatedcharacter.html>
- Licence: CC0 1.0 Universal (the pack ships its own `License.txt` saying so)

Files in `characters/`, all converted by us from the pack's `.gltf` to `.glb`
and stripped to the Idle / Walk / Run clips (the pack ships 17 clips per
character; we kept 3). Geometry, rig and animation are otherwise unmodified.

| File | Used for | Size |
| --- | --- | --- |
| `Casual_Male.glb` | Marco (coach), a wandering villager | 614 KB |
| `Casual2_Male.glb` | the player, a wandering villager | 448 KB |
| `Casual_Female.glb` | Lucía, two wandering villagers | 621 KB |
| `Casual_Bald.glb` | a wandering villager | 367 KB |
| `OldClassy_Male.glb` | Padre Antonio (hair hidden — he is bald) | 571 KB |
| `Chef_Female.glb` | Rosa (baker) | 732 KB |
| `Chef_Hat.glb` | Tomás (fishmonger), a wandering villager | 458 KB |
| `Worker_Female.glb` | Pilar (fruit seller), a wandering villager | 593 KB |
| `OldClassy_Female.glb` | Doña Carmen, a wandering villager | 653 KB |
| `Suit_Male.glb` | Miguel (waiter) | 617 KB |

`Casual_Bald.glb` has no Run clip in the source pack; it falls back to Walk.
Nine models cover eight residents, eight ambient villagers and the player,
because each one is retinted and rescaled per character.

## Animals — Quaternius (CC0 1.0, public domain)

- Author: Quaternius — <https://quaternius.com>
- Pack: Ultimate Animated Animals Pack — <https://quaternius.com/packs/ultimateanimatedanimals.html>
- Licence: CC0 1.0 Universal

| File | Used for | Size |
| --- | --- | --- |
| `ShibaInu.glb` | Chispa, Lucía's dog | 777 KB |

Converted from `.gltf` to `.glb` and stripped to the Idle / Idle_2 / Walk /
Gallop clips (of 12).

The cats and the gulls are still hand-built geometry in `src/people.js` — the
CC0 packs had no cat or seabird worth the download.

## Code — three.js (MIT)

`vendor/jsm/loaders/GLTFLoader.js` is vendored verbatim from three.js r185
(`three/examples/jsm/loaders/GLTFLoader.js`), MIT licence, © three.js authors.
Its two dependencies, `utils/BufferGeometryUtils.js` and `utils/SkeletonUtils.js`,
were already vendored here.


## Music — Kevin MacLeod (CC-BY 4.0)

Oud-led Middle Eastern pieces from <https://incompetech.com>.

- *Desert City* — Kevin MacLeod
- *Ibn Al-Noor* — Kevin MacLeod
- *Tabuk* — Kevin MacLeod

> Music by Kevin MacLeod (incompetech.com)
> Licensed under Creative Commons: By Attribution 4.0
> https://creativecommons.org/licenses/by/4.0/
