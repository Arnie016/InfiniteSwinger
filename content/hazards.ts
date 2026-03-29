import {
  BiomeSceneProfileRegistry,
  HazardBehaviorRegistry,
  RewardPatternRegistry,
} from '../types';
import { BIOME_SCENE_PROFILES } from './themes';

export const HAZARD_BEHAVIOR_REGISTRY: HazardBehaviorRegistry = {
  bird: {
    id: 'bird',
    telegraph: 'cross',
    readableName: 'Bird crossing',
    collisionEffect: 'Cross-lane impact and momentum disruption',
    readabilityRule: 'Commit to the lane before crossing the player path.',
  },
  eagle: {
    id: 'eagle',
    telegraph: 'cross',
    readableName: 'Eagle sweep',
    collisionEffect: 'Fast intercept across high-risk lanes',
    readabilityRule: 'Show full lane commitment before intercepting.',
  },
  spider: {
    id: 'spider',
    telegraph: 'dive',
    readableName: 'Spider dive',
    collisionEffect: 'Vertical lane denial and panic pressure',
    readabilityRule: 'Silhouette and warning line appear before dive.',
  },
  bat: {
    id: 'bat',
    telegraph: 'cross',
    readableName: 'Bat dart',
    collisionEffect: 'Fast cross-lane pressure',
    readabilityRule: 'Always spawn with visible lead-in space.',
  },
  troll: {
    id: 'troll',
    telegraph: 'gate',
    readableName: 'Troll gate',
    collisionEffect: 'Stationary lane block',
    readabilityRule: 'Acts as a set-piece gate, never surprise spam.',
  },
  geyser: {
    id: 'geyser',
    telegraph: 'burst',
    readableName: 'Lava geyser',
    collisionEffect: 'Upward blast and burn punishment',
    readabilityRule: 'Show a pre-fire burst tell before activation.',
  },
  ash_gust: {
    id: 'ash_gust',
    telegraph: 'gust',
    readableName: 'Ash gust',
    collisionEffect: 'Horizontal route pressure and visibility disruption',
    readabilityRule: 'Use drifting warning language before the shove window.',
  },
};

export const REWARD_PATTERN_REGISTRY: RewardPatternRegistry = {
  safe_short: { id: 'safe_short', kind: 'coins', lane: 'safe', defaultCount: 4, spread: 18 },
  reward_wide: { id: 'reward_wide', kind: 'coins', lane: 'reward', defaultCount: 7, spread: 28 },
  risk_line: { id: 'risk_line', kind: 'coins', lane: 'risk', defaultCount: 5, spread: 22 },
  sky_bonus: { id: 'sky_bonus', kind: 'coins', lane: 'high', defaultCount: 5, spread: 24 },
};

export const BIOME_SCENE_PROFILE_REGISTRY: BiomeSceneProfileRegistry = BIOME_SCENE_PROFILES;
