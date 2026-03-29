import { DebugFlags, EngineConfig } from '../types';

export const SAVE_DATA_VERSION = 7;

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  physics: {
    gravity: 0.76,
    airResistance: 0.9968,
    swingAirResistance: 0.9984,
    swingMomentumRetention: 0.9986,
    groundFriction: 0.88,
    maxSpeed: 46,
    fixedTimestep: 1 / 60,
    fixedTimestepMs: 1000 / 60,
    maxCatchUpSteps: 8,
    ceilingLimit: -200,
  },
  rope: {
    breakTimeSeconds: 5.25,
    assistRadius: 470,
    releaseRetractTimeSeconds: 0.26,
    retargetGraceSeconds: 0.22,
    reelSpring: 0.12,
    reelDamping: 0.86,
    reelMaxSpeed: 6.2,
  },
  ui: {
    canvasWidth: 1366,
    canvasHeight: 768,
    drawMargin: 260,
    hudSyncIntervalSeconds: 1 / 15,
    maxLives: 3,
  },
  audio: {
    masterMusicVolume: 0.14,
  },
};

export const DEFAULT_DEBUG_FLAGS: DebugFlags = {
  unlockAllLevels: false,
  showRouteBeatOverlay: false,
  showHazardTelegraphs: true,
  assetFallbackLogging: false,
};
