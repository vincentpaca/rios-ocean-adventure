# Rio's Ocean Adventure

A colourful **low-poly 3D** browser adventure for a 5-year-old — swim, catch, cook, craft, explore biomes, drive a land van, grab rainbow turbo, beat a goofy boss, build a midnight house, and survive a silly ultra-fast zombie chase.

Built with [Three.js](https://threejs.org/). Phone-friendly. Soft fails.

## Open locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` (ES modules need a static server).

| Link | What |
| --- | --- |
| `/?play=1` | Skip title |
| `/?play=1&biome=flower` | Flower land |
| `/?play=1&biome=mountains` | Mountains + van |
| `/?play=1&biome=caves` | Diamond caves + turbo |
| `/?play=1&biome=diamondland` | Boss arena |
| `/?play=1&biome=midnight` | Midnight house / jellies |
| `/?play=1&biome=zombie` | Zombie chase |

## Controls

**Keyboard:** WASD / arrows move · Space catch · **F** attack · **E** action (cook / van / turbo / house) · **C** craft · **Q** cycle weapon  

**Touch:** Joystick · fish catch · sword attack · pot action · craft

## Biomes & set pieces

1. **Starting ocean** — fish, cook, collect, portals  
2. **Flower land** — flowers + **old van** (land only)  
3. **Mountains** — bright peaks + van  
4. **Diamond caves** — diamonds, craft diamond arrows, **free turbo**  
5. **Diamond land** — goofy boss (sticks / arrows / diamond arrows)  
6. **Midnight zone** — glow, jellyfish, friendly colossal squids, **build house** (sticks+stones+shells)  
7. **Zombie chase** — after boss; silly fast zombies; turbo helps  

## Craft

- 2 sticks → stick weapon  
- 2 sticks → 5 arrows (after stick weapon)  
- 1 diamond + 1 stick → 3 diamond arrows  
- Midnight house: 2 sticks + 2 stones + 1 shell per part (×3)

## Credits (CC0)

| Pack | Author | Use |
| --- | --- | --- |
| Animated Fish | Quaternius | Catchable fish |
| Coral Reef Set | MiniPoly | Seafloor coral |
| Food / Survival / Nature kits | Kenney | Pot, camp, rocks, resources |

Diver, boss, zombies, van, biomes UI — original to this project.
