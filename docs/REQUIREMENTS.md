# TESLA SURFERS

## Pre-Production & Requirements Analysis

**Document type:** Game pre-production / requirements specification\
**Project name:** Tesla Surfers\
**Genre:** Single-player arcade endless driving runner\
**Target platforms:** Desktop and mobile web browsers\
**Delivery format:** Browser-based WebGL game\
**Document status:** Initial production baseline --- requirements to be
confirmed with the client\
**Version:** 0.2 (adds chaser vehicle; base-build decisions from baperrasta.com reference)\
**Prepared for:** Client project\
**Prepared by:** Tamzid Idrish

------------------------------------------------------------------------

## 1. Project Overview

### 1.1 Concept

Tesla Surfers is a cartoon-styled, single-player endless driving game
inspired by the accessible arcade feel of *Baper Rasta*. The player
drives a Bangladeshi electric auto-rickshaw (commonly called a Tesla in
local slang/context) through continuously generated traffic and road
environments.

The primary objective is to survive for as long as possible, avoid
dangerous traffic, collect temporary power-ups, and achieve a high
score. The game should prioritize responsive controls, readable hazards,
satisfying feedback, replayability, and quick restarts over visual
complexity or realism.

The game is designed to run directly in desktop and mobile browsers
using WebGL. It should be easy to understand within seconds, playable in
short sessions, and lightweight enough for a broad range of devices.

> **Naming note:** "Tesla" in the title refers to the electric
> auto-rickshaw concept in Bangladesh, not Tesla, Inc. The vehicle and
> branding should be original and should not use Tesla, Inc. logos or
> protected brand elements.

### 1.2 Product vision

Create a small, polished, immediately enjoyable browser game with: -
Simple controls that are easy to learn. - Smooth lateral movement rather
than fixed lane switching. - Traffic that creates readable risk/reward
decisions. - Different collision outcomes for different vehicle
classes. - Pickups that temporarily change how the player moves or
survives. - Difficulty that rises gradually and fairly. - A clear score
chase and fast replay loop. - Responsive desktop and mobile interfaces.

### 1.3 Design pillars

1.  **Fun before fidelity:** prioritize game feel, control response,
    readable hazards, and satisfying feedback.
2.  **Simple to learn:** three primary actions --- Left, Right, and
    Boost --- with power-ups adding temporary variety.
3.  **Fair challenge:** hazards must be visible early enough to react
    to; difficulty increases progressively.
4.  **Short-session replayability:** a run should start quickly, end
    clearly, and restart without friction.
5.  **Cross-device usability:** desktop keyboard and mobile touch
    controls must both feel intentional.
6.  **Performance-conscious:** stable frame pacing and low memory use
    are more important than expensive effects.

------------------------------------------------------------------------

## 2. Scope and Priorities

### 2.1 Priority definitions

-   **P0 --- Must have:** required for the first complete playable
    release.
-   **P1 --- Should have:** strongly recommended for a polished release,
    but can follow the core prototype.
-   **P2 --- Could have:** optional enhancement if time and budget
    allow.
-   **Out of scope for initial release:** explicitly deferred unless
    separately approved.

### 2.2 In-scope release

The initial release should include: - One playable vehicle: the player's
auto-rickshaw. - One endless road environment, with variation through
reusable segments and scenery. - Smooth left/right steering across the
available road width. - A boost action. - Procedurally selected traffic
and obstacle patterns. - Light and heavy traffic classes with different
collision consequences. - Pickups, including boost and jump-related
abilities. - Score, distance, current run summary, and locally saved
best score. - Gradually increasing difficulty. - Main menu, pause,
game-over, and restart interfaces. - Desktop keyboard and mobile touch
input. - Mobile control UI that can be hidden when a physical keyboard
is detected/used, with a way to restore touch controls. - A rival chaser auto-rickshaw behind the player (section 3.13). - Audio feedback
and basic settings. - Browser deployment and performance testing.

### 2.3 Deferred / low priority

-   Online leaderboard (P2; lowest priority among requested features).
-   Accounts, authentication, cloud saves, multiplayer, and social
    systems.
-   Garage, vehicle purchasing, cosmetics, and progression economy.
-   Multiple maps, story mode, missions, and daily challenges.
-   Complex vehicle simulation or realistic damage physics.
-   Advanced traffic AI with full navigation.
-   Large open-world environments.

------------------------------------------------------------------------

## 3. Gameplay Requirements

### 3.1 Core game loop --- P0

1.  Player opens the game and selects **Play**.
2.  A short countdown or immediate start begins the run.
3.  The vehicle moves forward automatically.
4.  The player steers left and right to avoid traffic and collect
    pickups.
5.  The player uses Boost to gain a temporary advantage.
6.  Traffic and obstacle patterns become more demanding over time.
7.  A collision or other fail condition ends the run.
8.  The game displays the score, distance, pickups collected, and best
    score.
9.  Player can restart immediately or return to the main menu.

### 3.2 Player movement --- P0

-   Movement is continuous and smooth, not a discrete three-lane system.
-   Left and right input should move the vehicle laterally across a
    bounded road area.
-   Movement should have acceleration/easing so it feels responsive
    without snapping.
-   The vehicle should have a small visual lean/tilt while steering, if
    it improves game feel.
-   The vehicle must remain within road boundaries.
-   Steering should be normalized so keyboard and touch input produce
    comparable movement.
-   Input should be frame-rate independent, using delta time.
-   Boost is a separate action and must not be confused with steering.
-   The initial control model should remain intentionally simple; no
    manual steering wheel, gear shifting, or simulation controls.

**Design decision to validate:** whether Boost means a temporary speed
increase, a forward dash/invulnerability window, or a charge-based
ability. Recommended first implementation: a short, readable speed burst
with a cooldown or limited charge, while ensuring obstacle interactions
remain fair.

### 3.3 Controls --- P0

**Primary actions:** - Left - Right - Boost

**Desktop defaults:** - Left: `A` or `Arrow Left` - Right: `D` or
`Arrow Right` - Boost: `Space` or `Shift` - Pause: `Escape` or `P`

**Mobile defaults:** - Large on-screen Left and Right buttons. - A
distinct Boost button. - Touch controls should support press-and-hold
where appropriate. - Controls must be placed away from browser gesture
areas and important HUD information. - Support both portrait and
landscape layouts only if the gameplay camera and road width remain
usable; preferred orientation must be confirmed with the client.

### 3.4 Mobile UI visibility and input switching --- P0

-   Touch control buttons are visible on touch-first/mobile devices.
-   On desktop, touch controls are hidden by default.
-   If a physical keyboard is detected or keyboard input is used, the
    mobile control overlay should hide.
-   If touch input is detected afterward, touch controls should
    reappear.
-   Provide a settings or pause-menu option to force touch controls
    visible, where practical.
-   Avoid relying only on screen width to identify input type; use
    browser input capability and actual recent input.
-   Do not hide the entire HUD when switching input methods.
-   Input switching must not interrupt a run or leave a control stuck in
    the pressed state.

### 3.5 Traffic generation --- P0

Traffic is generated continuously in front of the player using reusable
spawn points or road segments.

Requirements: - Spawn vehicles at varied distances and lateral
positions. - Use predefined, tested spawn patterns rather than
completely unconstrained randomness. - Ensure a safe reaction window
between successive hazards. - Avoid impossible combinations that block
the full road. - Prevent vehicles from spawning inside the player, on
top of one another, or outside valid road bounds. - Vary vehicle speed,
size, spacing, and behavior within controlled limits. - Increase spawn
frequency and pattern complexity as the run progresses. - Recycle or
pool traffic objects after they pass the player or leave the active
area. - Keep a cap on active traffic objects for performance.

**Initial traffic categories:**

  ------------------------------------------------------------------------
  Category          Examples          Collision result   Priority
  ----------------- ----------------- ------------------ -----------------
  Light /           Bicycle, small    Player can crash   P0
  destructible      motorcycle, small through; vehicle   
                    three-wheeler,    shows              
                    small cart        damage/knockback   
                                      feedback and the   
                                      player receives a  
                                      small penalty or   
                                      temporary slowdown 

  Heavy / dangerous Bus, truck, large Run ends on        P0
                    vehicle           collision          

  Special / moving  Fast motorcycle,  Defined per        P1
  hazard            unusual vehicle,  hazard; must be    
                    road obstruction  clearly            
                                      telegraphed        
  ------------------------------------------------------------------------

The visual size and collision volume must match the perceived danger. A
vehicle must not look safe but behave as a lethal obstacle.

### 3.6 Collision and damage response --- P0

**Light vehicle collision:** - Does not immediately end the run. - Plays
a distinct impact sound and visual effect. - Light vehicle reacts with a
short knockback, spin, wobble, or damage animation. - Player may lose a
small amount of speed or score, or experience brief control
disruption. - Avoid long stun periods that make a second collision
unavoidable. - Define whether repeated light collisions can eventually
end a run; recommended initial rule is that they do not instantly kill
the player but can reduce speed and increase risk.

**Heavy vehicle collision:** - Ends the run. - Plays a stronger impact
sound and game-over transition. - Shows clear collision feedback before
the game-over screen. - Prevent input from continuing to affect the
vehicle after the run has ended.

**Collision implementation:** - Use simple collision shapes/volumes
rather than detailed per-mesh collision. - Tune collision bounds
separately from decorative model dimensions. - Avoid physics simulation
unless it materially improves the experience. - Collision outcomes must
be deterministic and testable.

### 3.7 Pickups and power-ups --- P0/P1

Pickups replace traditional coins as the main collectible gameplay
objects.

Initial proposed pickup types:

  -----------------------------------------------------------------------
  Pickup            Effect            Suggested         Priority
                                      behavior          
  ----------------- ----------------- ----------------- -----------------
  Boost energy      Restores or       Adds charge to    P0
                    charges Boost     the boost meter   

  Jump              Allows the        Temporary ability P0
                    vehicle to jump   with clear        
                    over selected     start/end         
                    hazards           feedback          

  Shield            Protects against  Consumed on       P1
                    one heavy         impact; clear     
                    collision or one  visual state      
                    hit                                 

  Repair            Restores vehicle  Only needed if a  P1
                    condition or      damage/health     
                    removes a damage  system is         
                    penalty           approved          

  Score multiplier  Increases score   Visible timer or  P2
                    earned for a      multiplier        
                    short period      indicator         
  -----------------------------------------------------------------------

Pickup rules: - Pickups should spawn in readable, reachable positions. -
Avoid placing a required pickup in an unavoidable collision path. - Use
distinct shapes, colors, icons, and sound cues. - Show the active effect
and remaining duration/charge. - Prevent pickup effects from stacking in
confusing ways. - Define whether the same pickup refreshes duration,
adds charge, or is ignored while active. - Use object pooling for pickup
objects. - The first build should include only the minimum set needed to
make the loop fun.

**Jump interaction rules to define:** which traffic types can be jumped
over, whether jumping avoids all collision, whether the player can steer
in mid-air, and whether jump duration is fixed. The game must
communicate clearly which hazards can and cannot be cleared.

### 3.8 Boost system --- P0

-   Boost is activated by the dedicated Boost input.
-   The player receives immediate and readable feedback.
-   Boost may be limited by a meter/charge system replenished by Boost
    pickups.
-   Include a cooldown or duration indicator.
-   Boost should feel powerful without making the road unreadable or
    causing unfair collisions.
-   Decide whether boost increases forward speed, grants temporary
    protection, or combines both. Avoid combining too many effects in
    the first implementation.
-   The world, traffic, camera, and audio must remain synchronized
    during boost.
-   Prevent repeated input from creating unintended permanent boost.

### 3.9 Difficulty progression --- P0

Difficulty increases with elapsed survival time or distance.

Potential scaling variables: - Forward speed. - Traffic spawn
interval. - Traffic vehicle speed. - Number of vehicles in a pattern. -
Frequency of complex patterns. - Frequency of special hazards. - Reduced
safe gaps, within fair limits.

Requirements: - Begin with a forgiving onboarding period. - Increase
difficulty gradually rather than in sudden spikes. - Use a maximum speed
and maximum spawn-rate cap. - Preserve a minimum reaction time based on
player speed and obstacle visibility. - Introduce one new challenge at a
time. - Avoid random difficulty spikes. - Difficulty should be based on
elapsed run time/distance, not frame count. - Provide a tunable
difficulty curve in configuration rather than hardcoding values
throughout the codebase.

### 3.10 Score and run statistics --- P0

-   Score increases primarily with distance or survival time.
-   Additional score may be awarded for pickups, near misses, or other
    approved actions.
-   Display current score clearly during gameplay.
-   Display distance separately if it is useful to the player.
-   At game over, show final score, distance, pickups collected, and
    best score.
-   Save best score locally using browser storage.
-   Define rounding and score update behavior so it does not vary with
    frame rate.
-   Prevent score farming through repeated collision or pickup exploits.
-   If a leaderboard is added later, the server must validate or
    reasonably protect submitted scores.

### 3.11 Near-miss and feedback systems --- P1

-   Reward narrowly avoided traffic with a near-miss bonus.
-   Use subtle audio/visual feedback.
-   Ensure near-miss detection is consistent and not overly generous.
-   Optional streak or combo system can be added after the base scoring
    loop is balanced.

### 3.12 Pause, restart, and game states --- P0

Required states: - Loading - Main menu - Ready/countdown - Playing -
Paused - Game over

Requirements: - Pause stops gameplay timers, spawning, movement, and
scoring. - Browser tab becoming hidden should pause or safely suspend
the game. - Restart should reset all run-specific state without
reloading the page. - No input should leak from one state to another. -
Main menu and game-over transitions should be quick and readable.

------------------------------------------------------------------------

### 3.13 Chaser vehicle (rival auto-rickshaw) --- P0

*Added in v0.2 at client request. Reference/inspiration:
[baperrasta.com](https://baperrasta.com), where a pursuer applies constant
pressure while the player weaves through Dhaka-style traffic.*

**Concept.** A second auto-rickshaw (red, with a roof light bar) chases the
player's rickshaw from behind for the entire run. It is the constant
pressure source alongside traffic: the player must keep pulling away from it
using Boost while avoiding hazards.

**Behaviour.**

-   The chaser follows the player's lateral position with a slight lag, so
    weaving buys distance.
-   It steers around heavy traffic (buses, trucks, cars) and bulldozes light
    traffic (bikes, carts), which is knocked aside visually.
-   Its speed is slightly above the player's normal cruise speed
    (`closeRate` 3.5% rising to 7% with difficulty, ramped in over the first
    10 seconds). An idle player therefore slowly loses distance.
-   The gap to the player grows when the player boosts or collects Boost
    pickups and shrinks when the player is slowed (light collisions, rams).

**Catch rules (confirmed with the client).**

1.  When the chaser reaches the player's bumper with lateral overlap it
    **rams** the player: large slowdown (40% speed recovering over ~1.8 s),
    a sideways shove, score penalty, strong camera shake and sound.
2.  After a ram the chaser drops back to a safe gap (~11 m) and cannot catch
    again for a short cooldown (~3 s) so the player always gets a fair
    chance to recover.
3.  **The second catch ends the run.** The number of catches is configurable
    (`catchesToEndRun`). An optional "forget" timer
    (`catchMemorySeconds`, default off) can reset the counter.

**Player feedback (required, because the chaser is behind the camera).**

-   A rear-view mirror inset at the top of the screen shows the chaser.
-   A "CHASER" proximity bar and catch-counter pips in the HUD.
-   Red screen-edge vignette and a warning horn when the chaser is close.
-   Distinct ram and chase audio.

**Acceptance.** The chaser is always present during a run, never passes
through the player, never spawns on top of traffic, and a ram is always
recoverable. All tuning values live in `CONFIG.chaser`.

**Open for client confirmation.** Whether to add a "chaser banner" on
the game-over screen, a visible driver character, or a chaser-specific
pickup (e.g. oil slick) in a later phase.

------------------------------------------------------------------------

## 4. UI / UX Requirements

### 4.1 Main menu --- P0

-   Game title: **Tesla Surfers**.
-   Play button.
-   Best score.
-   Controls/help prompt.
-   Audio settings.
-   Optional credits.
-   Clear visual hierarchy and large touch targets.

### 4.2 In-game HUD --- P0

-   Current score.
-   Distance or survival time.
-   Boost meter/charge.
-   Active pickup/effect indicator and timer.
-   Pause button.
-   Optional small damage/condition indicator if the damage system
    requires it.

### 4.3 Game-over screen --- P0

-   Final score.
-   Best score / new record indicator.
-   Distance.
-   Pickups collected.
-   Restart button.
-   Main menu button.
-   Optional share action only if supported and approved.

### 4.4 Pause/settings --- P0/P1

-   Resume.
-   Restart.
-   Return to menu.
-   Master volume.
-   Music volume.
-   Sound effects volume.
-   Optional quality/performance setting.
-   Optional control visibility setting.

### 4.5 Responsive layout --- P0

-   Support desktop and mobile browser viewports.
-   Scale HUD and buttons relative to viewport size.
-   Maintain readable text and touch target sizes.
-   Avoid controls being covered by browser UI, notches, or safe-area
    insets.
-   Test common aspect ratios and small screens.
-   Do not allow the canvas to stretch the 3D scene incorrectly.
-   Define whether portrait, landscape, or both are supported before
    final UI production.

------------------------------------------------------------------------

## 5. Visual and Art Direction

### 5.1 Style

-   Cartoon / stylized 3D.
-   Readable silhouettes and exaggerated proportions.
-   Bright, approachable color palette.
-   Simple materials and controlled lighting.
-   Prioritize clarity and performance over detailed textures.
-   The player vehicle should be visually recognizable as a Bangladeshi
    electric auto-rickshaw.
-   Traffic types should be distinguishable at a glance.
-   Road hazards and pickups must have strong visual contrast.

### 5.2 Environment

Initial environment: - One road setting with an endless/repeating
layout. - Roadside props to create motion and a sense of place. - A
limited set of reusable scenery pieces. - Optional Bangladesh-inspired
roadside details, signs, vegetation, buildings, and street elements,
subject to client approval. - Avoid dense scenery that competes with
traffic readability.

### 5.3 Animation and effects

-   Smooth steering lean.
-   Wheel rotation.
-   Vehicle suspension/bounce if affordable.
-   Pickup collection effect.
-   Boost effect (trail, glow, camera response, or particles).
-   Light-vehicle crash reaction.
-   Heavy collision/game-over effect.
-   Jump takeoff and landing.
-   Roadside/environment motion.
-   UI transitions and button feedback.

### 5.4 Asset budget

Create only the assets required for the first release: - Player
auto-rickshaw. - A small set of light traffic vehicles. - A small set of
heavy traffic vehicles. - Road and roadside segment kit. - Pickup
models/icons. - Basic particles and impact effects. - HUD icons and menu
artwork.

Prefer low-poly or optimized models, shared materials, texture atlases
where appropriate, and compressed textures.

------------------------------------------------------------------------

## 6. Audio Requirements and Asset List

Audio is important for making a simple game feel responsive. Use short,
distinct sounds with clear priorities. Avoid constant loud effects or a
cluttered mix.

### 6.1 Required sound effects --- P0

  --------------------------------------------------------------------------
  Asset ID          Audio asset       Trigger / purpose    Notes
  ----------------- ----------------- -------------------- -----------------
  SFX-01            UI button click   Menu/settings button Short, soft
                                      interaction          

  SFX-02            Game start /      Run begins           One-shot
                    countdown cue                          

  SFX-03            Engine idle /     Normal driving       Loop; unobtrusive
                    driving loop                           

  SFX-04            Engine            Speed increases      Blend with
                    acceleration                           driving loop
                    layer                                  

  SFX-05            Steering / tire   Optional feedback    Keep subtle;
                    movement          while steering       avoid repetitive
                                                           noise

  SFX-06            Boost activation  Boost begins         Strong,
                                                           recognizable cue

  SFX-07            Boost loop / wind While boost is       Loop; fade out
                    rush              active               cleanly

  SFX-08            Boost end /       Boost expires or     Short cue
                    recharge          meter refills        

  SFX-09            Light collision   Hit                  Softer impact
                    impact            small/destructible   
                                      vehicle              

  SFX-10            Light vehicle     Small traffic        Optional combined
                    crash reaction    vehicle is hit       or separate cue

  SFX-11            Heavy collision   Hit dangerous        Stronger impact
                    impact            vehicle              

  SFX-12            Pickup collect    Generic pickup       Bright, rewarding
                                      collection           

  SFX-13            Boost pickup      Boost energy         Distinct variant
                                      acquired             or layered cue

  SFX-14            Jump pickup /     Jump acquired or     Distinct cue
                    jump activation   activated            

  SFX-15            Jump takeoff      Vehicle leaves       Short whoosh
                                      ground               

  SFX-16            Jump landing      Vehicle lands        Soft impact

  SFX-17            Shield activation Shield appears or    Only if shield is
                    / break           absorbs hit          included

  SFX-18            Game over         Run ends             Clear end cue

  SFX-19            New best score    Local record beaten  Positive reward

  SFX-20            Pause / resume    Game pauses or       Optional but
                                      resumes              recommended
  --------------------------------------------------------------------------

### 6.2 Music --- P1

  -------------------------------------------------------------------------
  Asset ID          Audio asset       Purpose           Notes
  ----------------- ----------------- ----------------- -------------------
  MUS-01            Main menu music   Menu ambience     Short seamless loop

  MUS-02            Gameplay music    Adds energy       Loop; upbeat
                                      during a run      arcade/electronic

  MUS-03            High-intensity    Optional layer at Can be layered over
                    layer             higher difficulty gameplay music

  MUS-04            Game-over sting   End-of-run        Short, not overly
                                      punctuation       dramatic
  -------------------------------------------------------------------------

For the smallest release, MUS-01 and MUS-02 can be one adaptable track
or gameplay can launch without music and use sound effects only. Confirm
music expectations with the client.

### 6.3 Audio implementation requirements

-   Separate master, music, and SFX volume controls.
-   Respect browser autoplay restrictions; start audio after the user's
    first interaction.
-   Preload or progressively load short critical effects.
-   Use looping audio carefully and stop/fade it on pause, game over, or
    menu transition.
-   Prevent repeated one-shot sounds from becoming excessively loud.
-   Use audio pooling/voice limits if many effects can overlap.
-   Duck or reduce engine audio during important impacts and UI moments.
-   Provide mute controls.
-   Test on mobile browsers and devices with speakers/headphones.
-   Prefer OGG/MP3 or another browser-compatible delivery format; verify
    codec support in target browsers.
-   Keep audio files compressed and short where possible.

### 6.4 Audio sourcing and production

Preferred order: 1. Original sounds created or edited for the project.
2. Properly licensed sound libraries with commercial-use rights. 3.
Procedurally designed sounds using an audio editor/synthesizer. 4.
AI-generated audio only if its commercial-use terms and output rights
are suitable and documented.

Maintain an asset register containing filename, source, creator,
license, attribution requirement, and intended use. Do not use
copyrighted music or ripped game sounds.

------------------------------------------------------------------------

## 7. Technical Stack and Tools

### 7.1 Recommended technology decision

**Recommended implementation: Three.js + TypeScript + Vite.**

Reasoning: - The target is a browser-first WebGL game. - The gameplay is
relatively lightweight and does not require a full editor-driven game
engine. - Three.js provides 3D rendering, cameras, materials, lights,
loaders, and animation support. - TypeScript helps keep AI-generated
code structured and maintainable. - Vite provides a fast development
server and production build pipeline. - HTML/CSS can handle menus and
HUD elements without adding a large UI framework. - The game can be
deployed as a static web application.

**Godot remains a valid alternative** if the project grows into a more
complex game requiring a visual scene editor, built-in physics,
animation workflows, and engine-managed game systems. Do not mix Godot
and Three.js in the same initial implementation. Choose one engine path
and keep the prototype focused.

### 7.2 Core tools

  -----------------------------------------------------------------------
  Tool                    Role                    Planned use
  ----------------------- ----------------------- -----------------------
  Visual Studio Code      IDE                     Main code editing and
                                                  debugging

  Claude Code             AI coding agent         Project scaffolding,
                                                  implementation,
                                                  refactoring, tests,
                                                  documentation

  Ollama                  Local model runtime     Local coding
                                                  assistant/model
                                                  endpoint where
                                                  compatible

  Three.js                3D rendering library    Scene, camera, models,
                                                  lighting, materials,
                                                  animation

  TypeScript              Programming language    Game logic and type
                                                  safety

  Vite                    Development/build tool  Local server, bundling,
                                                  production build

  Blender                 3D content creation     Player vehicle,
                                                  traffic, environment
                                                  props, animation, GLB
                                                  export

  Git                     Version control         Commits, branches,
                                                  rollback, change review

  Browser DevTools        Debugging               Console, performance,
                                                  memory, network,
                                                  responsive testing

  Audacity or equivalent  Audio editing           Trim, clean, normalize,
                                                  export sound effects

  Image editor            2D asset work           Icons, textures, UI
  (e.g. GIMP/Krita)                               artwork if needed
  -----------------------------------------------------------------------

### 7.3 Supporting libraries

Use only when required; avoid unnecessary dependencies.

  -----------------------------------------------------------------------------
  Library / API                 Purpose                 Decision
  ----------------------------- ----------------------- -----------------------
  Three.js `GLTFLoader`         Load `.glb` / `.gltf`   Use
                                models                  

  Three.js `AnimationMixer`     Play imported model     Use if assets need
                                animations              animation

  `@dimforge/rapier3d-compat`   Physics/collision       Optional; begin with
                                                        simple custom collision
                                                        checks unless physics
                                                        is needed

  `howler`                      Audio playback and      Recommended if native
                                audio management        Web Audio handling
                                                        becomes cumbersome

  Browser `localStorage`        Save best               Use for local
                                score/settings          persistence

  Gamepad API                   Controller support      Optional / later

  Full UI framework (React/Vue) Menus and HUD           Not recommended for
                                                        initial build

  Online backend/database       Leaderboard             Deferred
  -----------------------------------------------------------------------------

### 7.4 Browser and platform targets

-   Desktop: current Chromium-based browsers and Firefox; Safari support
    should be tested if included in the client agreement.
-   Mobile: Android Chrome is a key target; iOS Safari should be tested
    if iOS support is required.
-   Rendering: WebGL 2 where available.
-   Input: keyboard and touch.
-   Deployment: static HTTPS hosting.
-   Performance target: aim for smooth 60 FPS on a representative
    mid-range desktop and a practical, stable frame rate on supported
    mobile devices. Final minimum device specification must be agreed
    with the client.
-   The game must handle resize, orientation change, tab switching, and
    context loss gracefully where possible.

------------------------------------------------------------------------

## 8. Claude-Assisted Development Workflow

Claude should act as a coding assistant and implementation agent, not as
an unchecked autonomous developer. The project owner remains responsible
for architecture, gameplay decisions, code review, testing, and
acceptance.

### 8.1 Roles of the tools

**Claude Code** - Read the requirements and project conventions. -
Create and modify files. - Implement one feature at a time. - Explain
architectural changes. - Write or update tests. - Run available commands
and inspect errors. - Refactor only when requested or when a clear
defect is identified. - Update documentation and the task checklist.

**Ollama** - Run a selected local coding model. - Assist with
explanations, code review, small implementation tasks, and
documentation. - Be used through a supported Claude Code-compatible
configuration only after verifying the current model/API
compatibility. - Do not assume every Ollama model supports tool calling
or the same coding-agent features.

**Developer** - Approve the architecture and scope. - Review diffs
before accepting changes. - Test gameplay in a real browser. - Tune
controls, collisions, difficulty, and game feel manually. - Approve
third-party assets and licenses. - Commit working milestones to Git.

### 8.2 Important Claude Code / Ollama setup note

Claude Code and Ollama are separate products. A local Ollama model is
not automatically available to Claude Code just because Ollama is
installed.

Before choosing this workflow: 1. Check the current official Claude Code
documentation for supported model/provider configuration. 2. Check
Ollama's current Claude Code integration instructions and supported
model requirements. 3. Confirm whether the intended local model supports
the needed coding-agent/tool-use behavior. 4. Run a small test task that
reads a project file, edits a file, and runs a command. 5. If
compatibility or quality is insufficient, use Claude Code with its
supported hosted model configuration and keep Ollama as a separate local
assistant.

Never place API keys in source control. Keep secrets in local
environment variables and ignore local `.env` files.

### 8.3 AI implementation rules

-   Do not ask Claude to generate the whole game in one prompt.
-   Work in small, verifiable milestones.
-   Give Claude the requirements document and a short `CLAUDE.md`
    containing architecture, naming, commands, coding rules, and scope
    boundaries.
-   Require Claude to inspect existing code before editing.
-   Ask for a plan before multi-file changes.
-   Keep modules small and responsibilities clear.
-   Prefer deterministic systems and configurable values.
-   Require a summary of changed files and any tests run.
-   Run the game after every meaningful gameplay change.
-   Do not accept placeholder implementations as completed features.
-   Do not add packages without explaining why they are needed.
-   Do not rewrite unrelated working systems during a feature task.
-   Do not let AI invent or download assets without checking their
    licensing and suitability.

### 8.4 Suggested Claude task sequence

**Phase A --- Project foundation** 1. Initialize Vite + TypeScript. 2.
Install Three.js and configure the development/build scripts. 3. Create
the renderer, scene, camera, resize handling, and game loop. 4. Add a
simple placeholder road and placeholder vehicle. 5. Confirm the
production build works.

**Phase B --- Playable movement prototype** 1. Implement continuous
left/right movement. 2. Add road boundaries and camera follow. 3.
Implement Boost input and a basic boost effect. 4. Add keyboard input.
5. Add mobile touch controls and input-mode switching. 6. Test on
desktop and mobile browsers.

**Phase C --- Endless world and traffic** 1. Create reusable road
segments. 2. Implement segment recycling. 3. Create traffic spawn
patterns. 4. Add light and heavy vehicle classes. 5. Implement collision
outcomes. 6. Add object pooling and active-object limits.

**Phase D --- Gameplay systems** 1. Implement pickups. 2. Add boost
energy and jump behavior. 3. Add score and distance tracking. 4. Add
difficulty progression. 5. Add game states, pause, restart, and game
over. 6. Save local best score and settings.

**Phase E --- UI, audio, and art** 1. Replace placeholders with
optimized GLB assets. 2. Implement menu, HUD, pause, settings, and
results screens. 3. Integrate sound effects and music. 4. Add animation,
particles, camera feedback, and polish. 5. Tune difficulty and feedback.

**Phase F --- Testing and delivery** 1. Test desktop keyboard input. 2.
Test mobile touch input and orientation behavior. 3. Test collisions and
edge cases. 4. Profile frame time, memory, and asset loading. 5. Test
production build on the actual hosting environment. 6. Fix critical
issues and prepare release notes.

### 8.5 Suggested repository files

``` text
tesla-racer/
├── public/
│   ├── assets/
│   │   ├── models/
│   │   ├── textures/
│   │   ├── audio/
│   │   └── ui/
│   └── favicon/
├── src/
│   ├── app/
│   ├── core/
│   ├── world/
│   ├── player/
│   ├── traffic/
│   ├── pickups/
│   ├── systems/
│   ├── input/
│   ├── audio/
│   ├── ui/
│   ├── config/
│   └── main.ts
├── tests/
├── docs/
│   ├── REQUIREMENTS.md
│   └── ASSET_REGISTER.md
├── CLAUDE.md
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

The exact structure may be adjusted during implementation, but keep
gameplay, rendering, input, audio, UI, and configuration
responsibilities separated.

------------------------------------------------------------------------

## 9. Performance and Optimization Requirements

-   Use object pooling for traffic, pickups, particles, and road
    segments.
-   Reuse geometries and materials wherever possible.
-   Prefer GLB assets with optimized meshes and compressed textures.
-   Limit dynamic lights and expensive shadows.
-   Use simple collision volumes.
-   Avoid unnecessary per-frame allocations.
-   Use delta time for movement and timers.
-   Clamp unusually large delta-time values after tab suspension.
-   Cap particle counts and active traffic.
-   Dispose of GPU resources when assets are genuinely removed.
-   Avoid loading all optional assets before the first playable screen.
-   Compress and appropriately size audio and textures.
-   Provide a fallback or graceful error message if WebGL is
    unavailable.
-   Profile on real mobile hardware, not only desktop emulation.

**Performance acceptance target:** agree a minimum supported device and
frame-rate target with the client. A reasonable initial goal is 60 FPS
on modern desktop hardware and stable performance on mid-range mobile
devices, with quality settings if necessary.

------------------------------------------------------------------------

## 10. Testing and Quality Assurance

### 10.1 Functional tests

-   Game starts and reaches the playable state.
-   Left/right movement is smooth and bounded.
-   Boost activates and ends correctly.
-   Touch buttons respond to press, hold, and release.
-   Keyboard input works without stuck controls.
-   Touch controls hide/show appropriately when input mode changes.
-   Traffic spawns without overlap or impossible patterns.
-   Light collisions produce the correct non-lethal response.
-   Heavy collisions end the run.
-   Jump interacts correctly with eligible hazards.
-   Pickups activate the intended effect.
-   Difficulty increases at the intended rate.
-   Score and distance remain consistent.
-   Pause freezes gameplay.
-   Restart fully resets the run.
-   Best score persists after refresh.
-   Audio settings work and browser autoplay restrictions are respected.

### 10.2 Compatibility tests

-   Desktop keyboard and mouse.
-   Android touch browser.
-   iOS touch browser if included in scope.
-   Multiple viewport sizes and aspect ratios.
-   Portrait/landscape behavior as agreed.
-   Browser tab hidden and restored.
-   Window resize.
-   WebGL unavailable or context lost.
-   Slow network / delayed asset loading.

### 10.3 Gameplay tests

-   Can a new player understand the controls without a long tutorial?
-   Is the opening period forgiving?
-   Are hazards visible early enough?
-   Can the player reasonably avoid heavy traffic?
-   Are power-ups useful and understandable?
-   Does difficulty rise without feeling unfair?
-   Is restarting quick?
-   Does each run encourage another attempt?

------------------------------------------------------------------------

## 11. Online Leaderboard --- Lowest Priority

Online leaderboard is explicitly not part of the core MVP.

If approved later: - Use a small backend service or managed database. -
Define player identity (guest nickname, account, or anonymous ID). -
Validate score submissions server-side as far as practical. - Apply rate
limiting and basic abuse protection. - Do not trust client-submitted
scores without validation. - Define privacy and data-retention
requirements. - Avoid collecting unnecessary personal information. -
Provide loading, error, empty, and offline states. - Keep the game
playable when the leaderboard service is unavailable.

A local best-score table is sufficient for the first release.

------------------------------------------------------------------------

## 12. Deployment and Delivery

-   Build using Vite's production build.
-   Host over HTTPS.
-   Ensure correct MIME types and compression for JavaScript,
    WebAssembly if ever used, and assets.
-   Configure cache headers for versioned/static assets.
-   Test the deployed build, not only the local development server.
-   Keep the game playable without developer tools or local files.
-   Provide a loading state and useful error feedback.
-   Include a short README with setup, build, and deployment
    instructions.
-   Deliver source code and agreed asset files to the client.
-   Confirm ownership and licensing for all third-party assets and
    libraries.

------------------------------------------------------------------------

## 13. Acceptance Criteria for the First Complete Release

The MVP is considered functionally complete when:

1.  The game runs in supported desktop and mobile browsers.
2.  The player can steer smoothly left and right.
3.  Boost can be activated reliably.
4.  Mobile controls are usable and input-mode switching works.
5.  Traffic is generated continuously with safe, varied patterns.
6.  Light vehicles can be hit without immediately ending the run.
7.  Heavy vehicles end the run on collision.
8.  At least two pickup types are functional, including Boost and Jump.
9.  Difficulty increases progressively and remains fair.
10. Score and distance are displayed and calculated consistently.
11. Best score is saved locally.
12. Main menu, pause, game-over, and restart work.
13. Core sound effects are implemented and volume can be controlled.
14. The production build is tested on agreed target devices.
15. No known critical bugs prevent a normal play session.
16. A chaser rickshaw is present throughout the run, rams the player on
    the first catch (large slowdown, recoverable) and ends the run on
    the second catch.

Online leaderboard, garage, multiple environments, and account systems
are not required for MVP acceptance.

------------------------------------------------------------------------

## 14. Open Questions and Decisions to Confirm

These items require client/developer confirmation before final
production estimates:

1.  **Camera perspective:** third-person chase camera, elevated rear
    camera, or another view?
2.  **Orientation:** portrait, landscape, or responsive support for
    both?
3.  **Road layout:** one road width with continuous lateral movement, or
    multiple road shapes/curves?
4.  **Boost behavior:** speed burst, temporary protection, or another
    effect?
5.  **Jump behavior:** which vehicle types and obstacles can be cleared?
6.  **Light collision penalty:** slowdown, temporary damage, score
    penalty, or a combination?
7.  **Damage system:** visual-only damage, repair pickups, or a limited
    health/condition meter?
8.  **Run-ending conditions:** heavy collision only, or additional
    hazards?
9.  **Art direction:** how closely should the auto-rickshaw resemble a
    real Bangladeshi electric three-wheeler?
10. **Environment:** Bangladesh-inspired city streets, a stylized
    generic road, or multiple environments?
11. **Audio:** original music required, or sound effects only for the
    first release?
12. **Leaderboard:** confirm that it is deferred and not part of the
    initial delivery.
13. **Hosting and domain:** who provides hosting, domain, and deployment
    access?
14. **Supported devices:** minimum mobile and desktop specifications.
15. **Branding:** client-provided logo, colors, and title treatment, or
    developer-created temporary branding?

------------------------------------------------------------------------

## 15. Initial Production Recommendation

Build a greybox prototype before creating final models or UI artwork.

The first prototype should contain: - A placeholder auto-rickshaw. - A
simple road and camera. - Smooth left/right steering. - One light
vehicle and one heavy vehicle. - Basic collision outcomes. - One Boost
pickup and one Jump pickup. - A basic score counter and
game-over/restart flow.

Use this prototype to validate whether the movement, traffic spacing,
collision feedback, and difficulty are enjoyable. Only after the core
loop feels good should final cartoon assets, detailed UI, audio polish,
and optional systems be produced.

**Recommended first technical milestone:** a browser-playable prototype
with smooth movement, one traffic pattern, collision handling, and
restart. This is the fastest way to validate the central design risk
before investing in content production.

------------------------------------------------------------------------

*End of document --- Tesla Surfers Pre-Production & Requirements Analysis,
v0.1*

------------------------------------------------------------------------

## 16. Base-Build Decisions (v0.2)

Decisions taken for the first playable build, inspired by the reference
site [baperrasta.com](https://baperrasta.com). They answer section 14
provisionally and can be changed in `src/config/gameConfig.ts`.

| Topic | Decision in the base build |
|---|---|
| Camera (Q1) | Third-person chase camera behind and above the rickshaw, with FOV kick on boost and a rear-view mirror inset. |
| Orientation (Q2) | Responsive. Landscape and portrait both work; FOV widens on narrow screens. |
| Road (Q3) | One straight road, continuous lateral movement, recycled segments with roadside buildings and lamps. |
| Boost (Q4) | Hold-to-boost speed burst (1.5x) drawing from a charge meter refilled by pickups (plus slow trickle). |
| Jump (Q5) | Jump pickup grants one jump, usable for 10 s. It clears light vehicles and cars; it cannot clear buses or trucks. |
| Light collision (Q6) | Slowdown (65% recovering over ~0.9 s) plus small score penalty; vehicle is knocked aside. |
| Damage (Q7) | No health bar. Visual feedback only. |
| Run end (Q8) | Heavy vehicle collision, or the second chaser catch. |
| Art (Q9, Q10) | Low-poly greybox, Bangladesh-inspired auto-rickshaw, buses, trucks, bikes, carts; red under-glow marks lethal vehicles. |
| Audio (Q11) | Procedural placeholder sound effects. No music in the base build; volume controls included. |
| Leaderboard (Q12) | Deferred. Best score saved locally. |

**Controls.** A/D or arrows steer, Space/Shift boost, W/Up jump,
P/Esc pause. On touch devices: left/right buttons, a Boost button and a
Jump button that appears only when a jump is available.

**Not in the base build (planned):** draggable / resizable touch buttons
(as on the reference site), near-miss bonus, music, final art and audio
assets, online leaderboard, language switch (UI strings are already
isolated in `src/ui/strings.ts`).

