
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  SHOP = 'SHOP',
  LEADERBOARD = 'LEADERBOARD'
}

export enum AbilityType {
  PUNCH = 'PUNCH',
  LASER = 'LASER',
  BANANA = 'BANANA', // We will treat this as ROCKET in the UI/Logic now
  SLOW_MO = 'SLOW_MO'
}

export type BiomeType = 'JUNGLE' | 'WINTER' | 'SWAMP' | 'AUTUMN' | 'VOLCANO' | 'CAVE';
export type WeatherType = 'CLEAR' | 'WINDY' | 'RAIN' | 'FOG';
export type TutorialType = 'NONE' | 'BASIC' | 'ADVANCED';

export interface Vector2 {
  x: number;
  y: number;
}

export interface LevelConfig {
    id: number;
    name: string;
    description: string;
    targetDistance: number; // in meters (1m = 20px)
    biome: BiomeType;
    difficulty: number; // 0-10, affects spawn rates
    allowedEnemies: Enemy['enemyType'][];
    allowedWeather: WeatherType[];
    tutorialType: TutorialType;
}

export interface Entity {
  id: string;
  position: Vector2;
  width: number;
  height: number;
  color: string;
  type: 'tree' | 'enemy' | 'obstacle' | 'coin' | 'ground' | 'branch' | 'lake' | 'lava' | 'mushroom' | 'powerup' | 'apple' | 'vine' | 'updraft' | 'lilypad' | 'sand' | 'flower' | 'projectile' | 'web' | 'portal' | 'stalactite' | 'nest' | 'waterfall' | 'water_pocket';
  polyPoints?: Vector2[]; // For low poly rendering
  health?: number; // For destructible trees
  biome?: BiomeType;
  powerupType?: 'length' | 'force'; // For powerup entities
  flowerType?: 'red' | 'blue';
  angle?: number; // For angled branches
  stability?: number; // For branches breaking
  isBroken?: boolean; // If the branch has snapped
  breakVelocity?: Vector2; // Falling animation
}

export interface Enemy extends Entity {
  velocity: Vector2;
  health: number;
  enemyType: 'bird' | 'snake' | 'spider' | 'crocodile' | 'bonus_bird' | 'bat' | 'eagle' | 'slug' | 'troll';
  state?: number; // For animation/movement phases
  anchorY?: number; // For spiders (original height)
  anchorX?: number; // For trolls (pivot point)
  swingAngle?: number; // For trolls
  attackTimer?: number; // For eagle shooting
}

export interface Particle {
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type?: 'snow' | 'rain' | 'leaf' | 'spark' | 'text' | 'ash' | 'wind' | 'speed_line' | 'wood' | 'eyes' | 'cloud_shadow' | 'upgrade_spark' | 'spore' | 'egg_shell' | 'bubble';
}

export interface FloatingText {
  id: number;
  position: Vector2;
  text: string;
  color: string;
  life: number;
  velocity: Vector2;
  size: number;
}

export interface SaveData {
  totalTokens: number;
  highScore: number;
  maxLevelReached: number; 
  skins: string[];
  equippedSkin: string;
  upgrades: {
    ropeLength: number; // Level 1-5
    swingForce: number; // Level 1-5
    armor: number; // Level 0-3
    magnetism: number; // Level 0-5
    feverDuration: number; // Level 0-5
    luck: number; // Level 0-5
    launchBoost: number; // Level 0-5 (NEW)
    airControl: number; // Level 0-5 (NEW)
    safetyNet: number; // Level 0-1 (NEW)
  };
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'UPGRADE' | 'SKIN';
  cost: number;
  description: string;
  upgradeKey?: keyof SaveData['upgrades'];
  maxLevel?: number;
  icon?: any;
  // Tree Visuals
  x?: number; // 0-100% position
  y?: number; // 0-100% position
  parents?: string[]; // IDs of parent nodes
}

// --- SKILL CHAIN TYPES ---
export type SkillRank = 'GROOVIN' | 'WILD' | 'FEROCIOUS' | 'MYTHIC' | 'LEGEND';

export interface SkillEvent {
  name: string;
  score: number;
  multiplierMod: number;
  timestamp: number;
}

export interface SkillChainState {
  active: boolean;
  currentScore: number;
  multiplier: number;
  events: SkillEvent[]; 
  timer: number;
  rank: SkillRank;
}

// --- TUTORIAL TYPES ---
export type TutorialStep = 
  // Level 1 Basic
  'WELCOME' | 'GRAPPLE' | 'MOMENTUM' | 'SWING' | 'JUMP' | 'BRANCH_INFO' | 'COMPLETED' |
  // Level 2 Advanced
  'L2_INTRO' | 'L2_MOMENTUM' | 'L2_BRANCH' | 'L2_DODGE' | 'L2_ABILITY';

export interface TutorialState {
    active: boolean;
    currentStep: TutorialStep;
    showBox: boolean;
    message: string;
    targetPos?: Vector2; 
    timer?: number;
}
