# Tesla Racer

Browser-based endless auto-rickshaw runner. Weave through Dhaka-style traffic, grab Boost and Jump pickups, and outrun the red chaser rickshaw behind you. Inspired by [baperrasta.com](https://baperrasta.com).

**Stack:** Three.js, TypeScript, Vite, Vitest. No backend. Procedural placeholder art and audio (no asset files needed).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN for phone testing)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm run test       # unit tests (patterns, difficulty, collision, score, storage)
```

Requires Node 18+.

> **First run note:** this code was written without being able to run `npm install` / `tsc` in the authoring environment. The pure logic was unit-tested and simulated headlessly, but the first `npm run dev` / `npm run typecheck` is the real test. Expect to fix a few small type or runtime issues; see "If something breaks" below.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Steer | A / D or Left / Right | on-screen arrows |
| Boost (hold) | Space / Shift | Boost button |
| Jump | W / Up (needs a green spring pickup) | Jump button (appears when available) |
| Horn | H | — |
| Special dialogue | F | Special button |
| Pause | P / Esc | pause button |

Touch controls appear automatically on touch devices and hide when a keyboard is used; "Always show touch controls" is in Settings.

## Gameplay rules

- **Light vehicles** (motorbikes, handcarts): crashable. Bumping one slows you down, costs a few score points, and earns $10.
- **Heavy vehicles** (buses, trucks, cars - marked with a red under-glow): end the run. Cars can be jumped; buses and trucks cannot.
- **Chaser:** the first catch rams you (big slowdown, then it drops back). **The second catch ends the run.** Watch the rear-view mirror, the CHASER bar, and the red screen edge.
- **Pickups:** Boost (blue-green battery) refills the boost meter. Jump (green spring) gives one jump for 10 seconds.
- Score = distance + pickups - penalties. Money is earned per light-vehicle bump and the total is saved in `localStorage`; best score is saved there too.
- **Store:** spend saved money on engine speed, boost capacity/power, chaser-hit tolerance, and available Tesla skins. Upgrade levels, skin ownership, and the equipped skin persist locally.
- **TeslaSkin3** floats above the road with a gentle hover animation when equipped.
- **Speedometer:** current speed is shown in km/h in the HUD. The H key honks the horn while a run is active.
- **Audio assets:** all paths and random sound arrays are configured in `src/config/audioConfig.ts`. Add entries to `vehicleHit`, `chaserClose`, `mainMenuMusic`, or `backgroundMusic` to register more variants.

## Project structure

```
index.html                 DOM overlays (menu, HUD, pause, game over, settings, touch controls)
public/                    static assets (models / textures / audio / ui placeholders) + favicon
docs/
  REQUIREMENTS.md          the pre-production spec (v0.2: chaser + base-build decisions)
  ASSET_REGISTER.md        licence tracking for any external asset
src/
  main.ts                  entry: WebGL check, dev pattern validation, start Game
  config/gameConfig.ts     ALL tuning values (speeds, boost, chaser, traffic, camera, scoring, money)
  config/modelPaths.ts    configurable building and vehicle GLB path arrays
  app/Game.ts              state machine, fixed-step loop, collisions, scoring
  core/                    renderer (+ rear mirror), camera rig, math, pool, shared caches
  world/Road.ts            recycled road segments + roadside scenery
  player/Player.ts         steering, boost, jump, slowdown
  chaser/Chaser.ts         rival rickshaw AI + catch/ram logic
  traffic/                 vehicle specs, validated spawn patterns, TrafficManager (pooled)
  pickups/PickupManager.ts boost / jump pickups
  vehicles/models.ts       primitive-built placeholder models (replace with GLB later)
  systems/                 difficulty, score, collision, storage (pure, unit-tested)
  input/                   keyboard + touch with automatic mode switching
  audio/AudioManager.ts    procedural SFX (Web Audio), volume settings
  ui/                      UI controller, strings (i18n-ready), CSS
tests/                     Vitest unit tests
```

## Tuning the game

Everything lives in `src/config/gameConfig.ts`. Most useful knobs:

- `chaser.closeRateStart/closeRateMax` - how fast the chaser gains on you.
- `chaser.catchesToEndRun` - 2 by default; `chaser.catchMemorySeconds` - forgive old catches (0 = never).
- `chaser.ramSlowMultiplier/ramSlowSeconds/recoverGap` - how harsh a ram is.
- `speed`, `boost`, `difficulty.rampSeconds`, `traffic.*`, `pickups.interval*`.
- `mirror.enabled` - turn the rear-view mirror off.

GLB paths are listed as arrays in `src/config/modelPaths.ts`. Add building variants to `buildings`; add optional vehicle models to the matching vehicle array. Missing vehicle models use the procedural placeholders.
Add player skin GLBs to `skins`; the store only enables skins whose files load. Upgrade prices, level caps, and benefits are configured in `src/config/gameConfig.ts`.

To add a traffic pattern, edit `src/traffic/patterns.ts` and run `npm test` (it verifies a safe gap always exists).

## Deploying

`npm run build` produces a static `dist/` folder with relative paths. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, or a plain web server). HTTPS is recommended.

## If something breaks

- **Type errors on first `npm run typecheck`:** most likely small three.js typing nits. Fix and continue; the logic is covered separately.
- **Mirror looks wrong / glitchy:** set `mirror.enabled: false` in the config. (The mirror renders the scene a second time with `scene.scale.x = -1`.)
- **No sound:** browsers require a click/tap first; audio unlocks on the first interaction.
- **Choppy on a low-end phone:** lower the pixel ratio cap in `src/core/Renderer.ts` (currently 2) and `road.segmentCount`.

## Roadmap (not in this base build)

Draggable/resizable touch buttons (as on the reference site), near-miss bonus, music, final 3D models and audio, language switch (Bangla), online leaderboard.
