# Tesla Surfers

Browser-based endless auto-rickshaw runner. Weave through Dhaka-style traffic, grab Boost and Jump pickups, and outrun the red chaser rickshaw behind you. Inspired by [baperrasta.com](https://baperrasta.com).

**Stack:** Three.js, TypeScript, Vite, Vitest, Firebase Authentication and Firestore. Procedural placeholder art and audio.

Switch between the external chase camera and the driver's-seat view with the view button in the HUD.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN for phone testing)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm run test       # unit tests (patterns, difficulty, collision, score, storage)
```

Requires Node.js 20.19+.

Run `npm run build` and `npm run test` before deploying changes.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Steer | A / D or Left / Right | on-screen arrows |
| Boost (hold) | Space / Shift | Boost button |
| Jump | W / Up (needs a green spring pickup) | Jump button (appears when available) |
| Horn | H | — |
| Special dialogue | F | Special button |
| Camera view | HUD view button | HUD view button |
| Pause | P / Esc | pause button |

Touch controls appear automatically on touch devices and hide when a keyboard is used; "Always show touch controls" is in Settings.

## Gameplay rules

- **Light vehicles** (motorbikes, handcarts): crashable. Bumping one slows you down, costs a few score points, and earns ৳10.
- **Heavy vehicles** (buses, trucks, cars - marked with a red under-glow): end the run. Cars can be jumped; buses and trucks cannot.
- **Chaser:** the first catch rams you (big slowdown, then it drops back). **The second catch ends the run.** Watch the rear-view mirror, the CHASER bar, and the red screen edge.
- **Pickups:** Boost (blue-green battery) refills the boost meter. Jump (green spring) gives one jump for 10 seconds.
- Score = distance + pickups - penalties. Guest progress is saved in `localStorage`; Google-account progress is saved to Firebase.
- **Store:** spend saved money on engine speed, boost capacity/power, chaser-hit tolerance, and available Tesla skins. Signed-in progress syncs to the player's Firestore profile.
- **Leaderboard:** sign in with Google to save your account's best score and compare it with the top ten players.
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
  ui/                      UI controller, Bangla strings, CSS
  firebase/                Firebase Authentication and Firestore client
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

## Firebase accounts and leaderboard

The game works in guest mode without Firebase configuration. To enable Google sign-in, cloud saves, and the leaderboard on Firebase's no-cost Spark plan:

1. Create a Firebase project and register a **Web app**. Copy its web-app configuration values.
2. In Firebase Console, enable **Authentication → Google** and set a support email.
3. Create a **Cloud Firestore** database.
4. Copy `.env.example` to `.env.local` and fill in the values from the web-app config, including `VITE_FIREBASE_MEASUREMENT_ID` to enable Analytics. These are public client identifiers, not service-account credentials. Never put a service-account key in the browser or commit private credentials.
5. Install the Firebase CLI if needed, sign in, and select the project:

   ```bash
   npx firebase-tools login
   npx firebase-tools use --add
   ```

6. Deploy the Firestore security rules:

   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```

7. Run `npm run dev` or build and deploy the static site. Add the production domain under **Authentication → Settings → Authorized domains** in Firebase Console.

No Blaze plan or billing account is needed: the client talks directly to Firebase Authentication and Firestore. The first Google sign-in creates a profile containing the display name, best score, money, upgrades, owned skins, and equipped skin. Player profiles are private to their owner; the leaderboard contains only display names and scores. The Firestore rules enforce ownership and basic value ranges.

**Cheating and free-tier limits:** without a trusted backend, a player can modify their own score, money, and upgrades using browser tools. The rules prevent changing another player's data, but do not make a player's own progress cheat-proof. Spark has usage quotas; if a quota is reached, Firebase features may pause until usage resets or the project is upgraded. Check Firebase's current Spark limits before launch.

Guest saves are not automatically merged into a Google account. Existing guest progress stays in that browser; a new account starts with a fresh cloud profile.

## Deploying

`npm run build` produces a static `dist/` folder with relative paths. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, or a plain web server). HTTPS is recommended.

## If something breaks

- **Type errors on first `npm run typecheck`:** most likely small three.js typing nits. Fix and continue; the logic is covered separately.
- **Mirror looks wrong / glitchy:** set `mirror.enabled: false` in the config. (The mirror renders the scene a second time with `scene.scale.x = -1`.)
- **No sound:** browsers require a click/tap first; audio unlocks on the first interaction.
- **Choppy on a low-end phone:** lower the pixel ratio cap in `src/core/Renderer.ts` (currently 2) and `road.segmentCount`.

## Roadmap (not in this base build)

Draggable/resizable touch buttons (as on the reference site), near-miss bonus, music, and final 3D models and audio.
