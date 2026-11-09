# Roadmap

Ideas that would make the starter stronger, roughly in the order they pay off.
Nothing here is a prerequisite for using the suite as it stands.

## Done since the first release

- `helpers/pathfinding.ts`: A\* over `Grid`, line of sight, smoothing, `PathFollower`.
- `helpers/curve.ts`: `CurvePath` with loop and ping-pong modes, and `RailCamera`.
- `helpers/animation-state.ts`: `Animator`, crossfades and one-shot clips.
- `helpers/mesh-batch.ts`: static merging and instancing, which is where draw
  calls actually come from.
- `helpers/profiler.ts`: per-system timing that wraps the registry, no changes in
  the systems themselves.
- `ui/choice-dialog.ts`: a modal "pick one" for promotion and similar branches.
- `tools/unit.mjs`: a Node test path for pure logic, no framework.

## Helpers that would be genuinely useful next

- **`helpers/screen.ts`** safe-area aware UI placement and a UI scale factor, so
  a HUD does not depend on pixel counts.
- **`helpers/audio-position.ts`** real distance attenuation and cone shaping on
  top of the current stereo panning, for a 3D audio feel.
- **`helpers/nav-grid.ts`** bake a navmesh-style graph from physics colliders, so
  NPCs path around real geometry instead of an authored grid.
- **`helpers/pool.ts`** a generic object pool with a warm-up phase, generalising
  what `ProjectileSystem` already does internally.

## Systems worth adding

- **Behaviour trees or utility AI** for enemy variety. The current `EnemyManager`
  is deliberately dumb: idle, chase, attack. A small tree builder would let a
  template describe "shoot from cover, retreat when hurt" in data.
- **Equipment and stats** on top of `Inventory`: modifiers, slots, and a damage
  calculation that respects them.
- **Quests with prerequisites** on top of `Objectives`: dependency graph,
  rewards, and a journal UI.
- **Localisation** for the UI strings, with a language switch in the pause menu.
  The UI text is already central in `UI_TEXT`.
- **Gamepad remapping UI** driven by `game.input.keyboard.onChange`.
- **A settings screen** bound to audio buses, sensitivity, quality and pixel
  ratio, persisted through `SaveStore`.

## Templates worth adding

- **Kart or bicycle racing**: a simple arcade vehicle model
  (`DynamicRayCastVehicleController` exists inside Rapier but is not wrapped
  yet), checkpoint gates, lap timing.
- **Tower defence**: the board grid plus waves plus an economy.
- **Point and click adventure**: `OrbitController` plus `InteractionRegistry`
  plus a dialogue box.
- **Platformer** as a first-class template rather than a third person variant,
  with coyote time, variable jump height and moving platforms.
- **Stealth**: vision cones (`isInViewCone` already exists), suspicion meters,
  patrol routes.

## Engine level

- **Interpolated rendering for fixed timestep.** `Time.alpha` exists but the
  renderer does not use it yet: with `physicsStep` at 1/60 and a 144 Hz display,
  physics bodies move in 60 Hz steps. Interpolating between the previous and
  current transform would remove that judder.
- **Shadow cascade or a follow shadow frustum.** `followSunWithShadows` exists;
  wiring it into the action templates would let big outdoor levels keep crisp
  shadows.
- **Asset preloading screen** that uses `Assets.onProgress` to show a real loading
  bar before the first frame, instead of the current "start empty and pop in".
- **Web Worker for level generation** so a big procedural world does not block
  the first frame.
- **Optional spatial partitioning.** `overlapSphere` and the pickup, enemy and
  cycle loops are all O(n). Fine into the low hundreds; a uniform grid would
  push it to thousands.

## Game specific

- **Chess**: check, checkmate, stalemate, castling, en passant, promotion, plus a
  simple AI. `board-game.ts` has the move patterns and the turn machine already.
- **Portal**: a portal gun (place on a valid surface via raycast), portal-aware
  fizzler fields, and objects that need to keep momentum (`ProjectileSystem`
  would need to decay when passing through).
- **Light cycles**: 90 degree snap turns as an option, arena obstacles, and a
  scoring run with a chained-combo multiplier.
- **Farm**: tools with energy costs, animals, seasons, a shop interior and NPC
  schedules driven by `DayCycle.hooks`.
- **Delivery**: a ridable bicycle with the third person camera locked behind it,
  traffic, weather and a reputation system.

## Polish

- **An in-engine debug menu** on F1: teleport to spawn, spawn enemy, give item,
  toggle physics, change time of day. `DebugOverlay.log` already accepts custom
  rows.
- **A screenshot key** (`renderer.domElement.toDataURL`) for bug reports.
- **Replay recording** of input events, which is cheap because input is already
  a snapshot per frame.
