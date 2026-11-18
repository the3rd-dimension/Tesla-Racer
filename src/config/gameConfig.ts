/**
 * All gameplay tuning lives here. Nothing in the codebase should hard-code
 * speeds, timings, distances or scores - change them in this file.
 * Units: metres, seconds, metres/second unless stated otherwise.
 *
 * World layout: the player stays at z = 0 and faces -z. The world scrolls
 * towards +z. The chaser lives at z = +gap (behind the player).
 */
export const CONFIG = {
  run: {
    countdownSteps: 3,
    countdownStepSeconds: 0.5,
    /** Time between the fatal hit and the game-over screen. */
    deathDelaySeconds: 1.0,
    /** World slows to a stop over this time after a fatal hit. */
    deathSlowSeconds: 0.7,
    fixedStep: 1 / 60,
    maxFrameSeconds: 0.1,
    maxStepsPerFrame: 6,
  },

  road: {
    width: 14,
    segmentLength: 40,
    segmentCount: 9,
    sidewalkWidth: 6,
    /** A segment whose centre passes this z is recycled to the far end. */
    recycleZ: 80,
    /** Keep the vehicle this far from the road edge. */
    edgeMargin: 0.3,
  },

  camera: {
    fov: 62,
    boostFov: 74,
    /** On narrow (portrait) screens the FOV widens so the road stays visible. */
    minHorizontalAspect: 1.25,
    maxFov: 100,
    height: 4.8,
    distance: 8.5,
    lookAhead: 16,
    lookHeight: 0.8,
    followLag: 5,
    fovLag: 4,
    near: 0.1,
    far: 280,
    fogNear: 70,
    fogFar: 235,
    shakeDecay: 5,
    shakeMagnitude: 0.35,
  },

  /** Rear-view mirror (second render pass) - the chaser is behind the player. */
  mirror: {
    enabled: true,
    widthPx: 280,
    maxWidthFraction: 0.4,
    aspect: 0.42,
    topPx: 62,
    fov: 58,
    height: 1.9,
    offsetZ: 1.9,
  },

  player: {
    halfW: 0.85,
    halfL: 1.25,
    modelHeight: 2.1,
    floatingSkin: {
      lift: 0.42,
      bobAmplitude: 0.08,
      bobFrequency: 1.6,
    },
    maxLateralSpeed: 13,
    lateralResponse: 12,
    leanAmount: 0.07,
    yawAmount: 0.05,
  },

  /** Cruise speed rises with difficulty. */
  speed: { start: 20, max: 34 },

  boost: {
    multiplier: 1.5,
    /** How quickly the speed factor eases towards its target. */
    response: 5,
    startCharge: 50,
    max: 100,
    drainPerSecond: 40,
    minToStart: 8,
    regenPerSecond: 1.5,
    pickupCharge: 35,
  },

  jump: {
    durationSeconds: 0.9,
    height: 2.3,
    /** Player y must be above this to pass over a jumpable vehicle. */
    clearHeight: 0.9,
    /** A Jump pickup stays usable for this long. */
    readySeconds: 10,
  },

  collision: {
    /** Footprints are shrunk by this factor so hits feel fair. */
    shrink: 0.9,
    light: {
      speedMultiplier: 0.65,
      recoverSeconds: 0.9,
      scorePenalty: 25,
      knockSpeed: 9,
      knockSpin: 9,
      knockSeconds: 1.5,
    },
  },

  difficulty: {
    /** Forgiving opening: difficulty stays at 0 for this long. */
    graceSeconds: 4,
    /** Time from end of grace to maximum difficulty (smoothstep). */
    rampSeconds: 180,
  },

  traffic: {
    spawnDistance: 175,
    firstSpawnDistance: 95,
    despawnZ: 45,
    maxActive: 16,
    /** Traffic cruises forward at this speed (same for all vehicles so patterns stay rigid). */
    speedStart: 7,
    speedMax: 15,
    /** Never spawn patterns closer together than this (metres of road). */
    minGapMeters: 18,
    /** Minimum reaction time between hazards, shrinking with difficulty. */
    reactionSecondsStart: 1.9,
    reactionSecondsEnd: 1.15,
    /** Extra clearance when checking a spawn area is free. */
    spawnMargin: 1.2,
    /** Smallest free lane the player must always be able to fit through. */
    safeGapMeters: 2.6,
  },

  pickups: {
    halfW: 0.7,
    halfL: 0.7,
    intervalMin: 90,
    intervalMax: 150,
    boostWeight: 0.65,
    jumpWeight: 0.35,
    hoverHeight: 1.1,
    slotXs: [-4.8, -2.4, 0, 2.4, 4.8],
    clearMargin: 5,
  },

  chaser: {
    halfW: 0.85,
    halfL: 1.3,
    startGap: 24,
    /** Closest it can get (bumper-to-bumper). Reaching this = a catch. */
    catchGap: 2.7,
    maxGap: 30,
    /**
     * Chaser speed = player cruise speed * (1 + closeRate).
     * Positive closeRate => it slowly gains on a player who never boosts.
     */
    closeRateStart: 0.035,
    closeRateMax: 0.07,
    /** Chaser pressure ramps in over this many seconds. */
    graceSeconds: 10,
    lateralSpeed: 9,
    lateralResponse: 4,
    /** After ramming, it drops back to this gap... */
    recoverGap: 11,
    recoverResponse: 2.5,
    /** ...over this many seconds, and cannot catch again for catchCooldown. */
    recoverSeconds: 2.2,
    catchCooldownSeconds: 3.2,
    /** Player penalty on a ram. */
    ramSlowMultiplier: 0.4,
    ramSlowSeconds: 1.8,
    ramShove: 6,
    /** The Nth catch ends the run. */
    catchesToEndRun: 2,
    /** If > 0, the catch counter resets after this many seconds without a catch. 0 = never. */
    catchMemorySeconds: 0,
    /** Chaser steers around heavy traffic: how far ahead it looks / clearance. */
    avoidLookAhead: 9,
    avoidMargin: 0.7,
    ramScorePenalty: 100,
    /** HUD bar is full at this gap. */
    dangerGap: 20,
    headlights: {
      offsetX: 0.52,
      y: 0.82,
      z: -1.3,
      intensity: 12,
      distance: 26,
      angle: 0.4,
    },
    sirenY: 2.06,
    sirenFlashSeconds: 0.18,
  },

  score: {
    perMeter: 1,
    perPickup: 50,
  },

  money: {
    bumpReward: 10,
  },

  store: {
    upgrades: {
      speed: { maxLevel: 5, baseCost: 100, costMultiplier: 2, speedPerLevel: 0.05 },
      boost: { maxLevel: 5, baseCost: 100, costMultiplier: 2, chargePerLevel: 10, multiplierPerLevel: 0.05 },
      chaser: { maxLevel: 3, baseCost: 200, costMultiplier: 2, extraCatchesPerLevel: 1 },
    },
    skinCost: 300,
  },
} as const;

export type Config = typeof CONFIG;
