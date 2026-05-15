# Agent Guide — Parkour Worlds

Context for AI agents (Claude Code, etc.) working on this repo.

## Project overview

Pixel-art side-scrolling platformer built with **Phaser 4** and bundled via **Webpack**. The primary game output is a single self-contained HTML file at `public/parkour-worlds.html` (the webpack build inlines everything). During development, use the dev server; for release, run a production build.

## Key commands

```bash
npm run dev      # webpack-dev-server on :8080 with hot reload
npm run build    # production build → dist/
npm test         # vitest unit tests (run before every commit)
npm run test:watch
```

## Architecture

```
src/
  game/
    scenes/        # Phaser scenes
      Boot.js      # asset preload
      Preloader.js
      MainMenu.js  # title screen, world select entry
      WorldSelect.js
      Game.js      # core gameplay loop
      GameOver.js
    data/
      worlds.js    # level definitions for all 9 worlds + Gauntlet
      audio.js     # sound effect helpers
      daily.js     # seeded daily challenge logic
      emblems.js   # achievement / emblem definitions
    utils/
      music.js     # procedural Web Audio music per world
      physics.js   # AABB helpers shared with tests
      save.js      # localStorage read/write
  main.js          # Phaser game config + scene registration
public/
  parkour-worlds.html  # built output (commit after every prod build)
  assets/              # sprites, tiles, audio assets
```

## Worlds & level data

All level layout lives in `src/game/data/worlds.js`. Each world entry has:
- `id`, `name`, `accent` color, `mechanic` (optional unique behavior)
- `levels[]` — array of level objects with platform layouts, coin positions, enemies, hazards

Worlds in order: Pirate Seas · Ninja Dojo · Wild West · Deep Ocean · Fire & Brimstone · The Clockwork · Frozen Peaks · Storm Spire · Crystal Realm + Practice + The Gauntlet.

## Tests

Unit tests live alongside the modules they test:
- `src/game/data/worlds.test.js` — level structure validation
- `src/game/utils/daily.test.js` — seeded challenge determinism
- `src/game/utils/physics.test.js` — AABB collision
- `src/game/utils/save.test.js` — localStorage serialization

Run `npm test` — all tests must pass before committing.

## Unique mechanics per world

| World | Mechanic |
|---|---|
| The Clockwork | Conveyor belts push player horizontally |
| Frozen Peaks | Ice friction (ground multiplier 0.985 vs 0.72) |
| Storm Spire | Wind zones apply directional force mid-air |
| Crystal Realm | Bounce pads launch player (vy −16) and reset dash |

## Sensitive info

No API keys, secrets, or tokens in this repo. The game uses only browser-native APIs (Canvas, Web Audio, localStorage). Nothing is ever sent to a server.
