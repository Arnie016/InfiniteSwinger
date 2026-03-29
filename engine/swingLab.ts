import {
  PlayerMoodPreset,
  SaveData,
  SettingSafetyAssessment,
  SwingLabConfig,
} from '../types';
import { DEFAULT_ENGINE_CONFIG } from './config';

export const BALANCED_SWING_LAB_CONFIG: SwingLabConfig = {
  gravity: DEFAULT_ENGINE_CONFIG.physics.gravity,
  airResistance: DEFAULT_ENGINE_CONFIG.physics.airResistance,
  swingAirResistance: DEFAULT_ENGINE_CONFIG.physics.swingAirResistance,
  swingMomentumRetention: DEFAULT_ENGINE_CONFIG.physics.swingMomentumRetention,
  groundFriction: DEFAULT_ENGINE_CONFIG.physics.groundFriction,
  maxSpeed: DEFAULT_ENGINE_CONFIG.physics.maxSpeed,
  ropeReelSpring: DEFAULT_ENGINE_CONFIG.rope.reelSpring,
  ropeReelDamping: DEFAULT_ENGINE_CONFIG.rope.reelDamping,
  ropeReelMaxSpeed: DEFAULT_ENGINE_CONFIG.rope.reelMaxSpeed,
  musicVolume: DEFAULT_ENGINE_CONFIG.audio.masterMusicVolume,
};

export const SWING_LAB_PRESETS: Record<Exclude<PlayerMoodPreset, 'Custom'>, SwingLabConfig> = {
  Relaxed: {
    ...BALANCED_SWING_LAB_CONFIG,
    gravity: 0.71,
    airResistance: 0.9974,
    swingAirResistance: 0.9987,
    maxSpeed: 40,
    ropeReelSpring: 0.1,
    ropeReelDamping: 0.89,
    ropeReelMaxSpeed: 5.4,
  },
  Balanced: {
    ...BALANCED_SWING_LAB_CONFIG,
  },
  Aggressive: {
    ...BALANCED_SWING_LAB_CONFIG,
    gravity: 0.79,
    airResistance: 0.9964,
    swingAirResistance: 0.9981,
    swingMomentumRetention: 0.9994,
    maxSpeed: 52,
    ropeReelSpring: 0.14,
    ropeReelDamping: 0.84,
    ropeReelMaxSpeed: 7.8,
  },
  Precision: {
    ...BALANCED_SWING_LAB_CONFIG,
    gravity: 0.82,
    airResistance: 0.997,
    swingAirResistance: 0.9983,
    swingMomentumRetention: 0.9989,
    groundFriction: 0.9,
    maxSpeed: 43,
    ropeReelSpring: 0.11,
    ropeReelDamping: 0.88,
    ropeReelMaxSpeed: 5.8,
  },
};

export const SWING_LAB_RANGES: Record<keyof SwingLabConfig, { min: number; max: number; step: number; label: string }> = {
  gravity: { min: 0.4, max: 1.2, step: 0.01, label: 'Gravity' },
  airResistance: { min: 0.96, max: 1, step: 0.0001, label: 'Air Resistance' },
  swingAirResistance: { min: 0.97, max: 1, step: 0.0001, label: 'Swing Air Resistance' },
  swingMomentumRetention: { min: 0.95, max: 1.02, step: 0.0001, label: 'Momentum Retention' },
  groundFriction: { min: 0.7, max: 0.98, step: 0.01, label: 'Ground Friction' },
  maxSpeed: { min: 20, max: 80, step: 1, label: 'Max Speed' },
  ropeReelSpring: { min: 0.02, max: 0.4, step: 0.01, label: 'Reel Spring' },
  ropeReelDamping: { min: 0.6, max: 0.99, step: 0.01, label: 'Reel Damping' },
  ropeReelMaxSpeed: { min: 1, max: 12, step: 0.1, label: 'Reel Max Speed' },
  musicVolume: { min: 0, max: 0.35, step: 0.01, label: 'Run Music Weight' },
};

export const sanitizeSwingLabConfig = (config: SwingLabConfig): SwingLabConfig => {
  const next = { ...config };

  (Object.keys(SWING_LAB_RANGES) as (keyof SwingLabConfig)[]).forEach((key) => {
    const range = SWING_LAB_RANGES[key];
    next[key] = Math.max(range.min, Math.min(range.max, config[key]));
  });

  return next;
};

const matchesPreset = (config: SwingLabConfig, preset: SwingLabConfig) =>
  (Object.keys(preset) as (keyof SwingLabConfig)[]).every((key) => Math.abs(config[key] - preset[key]) < 0.0005);

export const getPresetForConfig = (config: SwingLabConfig): PlayerMoodPreset => {
  for (const preset of Object.keys(SWING_LAB_PRESETS) as (keyof typeof SWING_LAB_PRESETS)[]) {
    if (matchesPreset(config, SWING_LAB_PRESETS[preset])) return preset;
  }
  return 'Custom';
};

export const resolveSwingLabConfig = (save: Pick<SaveData, 'selectedMoodPreset' | 'customSwingLabConfig'>): SwingLabConfig => {
  if (save.selectedMoodPreset === 'Custom' && save.customSwingLabConfig) {
    return sanitizeSwingLabConfig(save.customSwingLabConfig);
  }
  const preset = save.selectedMoodPreset === 'Custom' ? 'Balanced' : save.selectedMoodPreset;
  return sanitizeSwingLabConfig(SWING_LAB_PRESETS[preset]);
};

export const assessSwingLabConfig = (config: SwingLabConfig): SettingSafetyAssessment => {
  const reasons: string[] = [];
  let state: SettingSafetyAssessment['state'] = 'Safe';

  if (config.maxSpeed > 50) reasons.push('High max speed makes over-rotation and loop traps more likely.');
  if (config.gravity < 0.63) reasons.push('Low gravity stretches airtime enough to make timing feel floaty.');
  if (config.gravity > 0.96) reasons.push('High gravity compresses the release window and punishes late catches.');
  if (config.swingMomentumRetention > 1.0005) reasons.push('Momentum retention above neutral can snowball into endless circles.');
  if (config.ropeReelMaxSpeed > 8.8) reasons.push('Fast reel speed can make rope changes feel jerky mid-swing.');
  if (config.ropeReelDamping < 0.8) reasons.push('Low reel damping adds extra oscillation after rope changes.');

  if (
    config.gravity < 0.55 ||
    config.gravity > 1.05 ||
    config.maxSpeed > 60 ||
    config.swingMomentumRetention > 1.002 ||
    config.ropeReelMaxSpeed > 10 ||
    config.ropeReelDamping < 0.74
  ) {
    state = 'Unstable';
  } else if (reasons.length > 0) {
    state = 'Caution';
  }

  const summary =
    state === 'Safe'
      ? 'This setup stays close to the approved feel.'
      : state === 'Caution'
      ? 'This setup is playable, but it pushes the swing away from the approved baseline.'
      : 'This setup can break readability and create loops or snap-heavy rope behavior.';

  return { state, reasons, summary };
};
