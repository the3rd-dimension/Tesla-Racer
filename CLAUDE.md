# Tesla Surfers - project guide for Claude Code

Browser endless auto-rickshaw runner. Three.js + TypeScript + Vite. Spec: `docs/REQUIREMENTS.md` (sections 3.13 chaser, 16 decisions).

## Commands
- `npm install`, `npm run dev`, `npm run build` (typecheck + build), `npm run test`, `npm run typecheck`

## Architecture (src/)
- `config/gameConfig.ts` - ALL tuning values. Never hard-code numbers elsewhere.
- `app/Game.ts` - state machine, fixed-step loop, collisions, scoring, UI/audio wiring.
- `core/` - renderer (+ rear mirror pass), camera rig, math, pool, shared geometry/material caches.
- `world/Road.ts`, `player/Player.ts`, `chaser/Chaser.ts`, `traffic/`, `pickups/`, `vehicles/models.ts`
- `systems/` - pure logic (difficulty, score, collision, storage) - keep these free of three.js so they stay unit-testable.
- `input/` keyboard + touch (auto mode switching), `audio/` procedural SFX, `ui/` DOM overlays (markup in `index.html`).

## Rules
- World model: player fixed at z=0 facing -z; world scrolls to +z; chaser is at z=+gap.
- Pool everything spawned at runtime; reuse shared geometries/materials; no allocation in the update loop where avoidable.
- Traffic uses validated patterns (`traffic/patterns.ts`); add a pattern -> run `npm test` (it checks a safe gap exists).
- Gameplay must be time-based (dt), never frame-based.
- Never block the input or leave a pressed state stuck: use `InputManager.releaseAll()` on state changes.
- Update `docs/ASSET_REGISTER.md` when adding any external asset.
