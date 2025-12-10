
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
  BANANA = 'BANANA', // Treated as ROCKET
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
    difficulty: number;
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
  polyPoints?: Vector2[];
  health?: number;
  biome?: BiomeType;
  powerupType?: 'length' | 'force';
  flowerType?: 'red' | 'blue';
  angle?: number;
  stability?: number;
  isBroken?: boolean;
  breakVelocity?: Vector2;
}

export interface Enemy extends Entity {
  velocity: Vector2;
  health: number;
  enemyType: 'bird' | 'snake' | 'spider' | 'crocodile' | 'bonus_bird' | 'bat' | 'eagle' | 'slug' | 'troll';
  state?: number;
  anchorY?: number;
  anchorX?: number;
  swingAngle?: number;
  attackTimer?: number;
}

export interface Particle {
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type?: 'snow' | 'rain' | 'leaf' | 'spark' | 'text' | 'ash' | 'wind' | 'speed_line' | 'wood' | 'eyes' | 'cloud_shadow' | 'upgrade_spark' | 'spore' | 'egg_shell' | 'bubble' | 'ant';
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
    ropeLength: number;
    swingForce: number;
    armor: number;
    magnetism: number;
    feverDuration: number;
    luck: number;
    launchBoost: number;
    airControl: number;
    safetyNet: number;
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
  x?: number;
  y?: number;
  parents?: string[];
}

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

export type TutorialStep = 
  'WELCOME' | 'GRAPPLE' | 'MOMENTUM' | 'SWING' | 'JUMP' | 'BRANCH_INFO' | 'COMPLETED' |
  'L2_INTRO' | 'L2_MOMENTUM' | 'L2_BRANCH' | 'L2_DODGE' | 'L2_ABILITY';

export interface TutorialState {
    active: boolean;
    currentStep: TutorialStep;
    showBox: boolean;
    message: string;
    targetPos?: Vector2; 
    timer?: number;
}

export interface PhysicsLesson {
  concept: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  funFact: string;
  diagram?: {
      title: string;
      vectors: { label: string, start: number[], end: number[], color: string }[];
      labels: { text: string, position: number[] }[];
  };
  gameTweak?: {
      parameter: string;
      value: number;
      message: string;
  };
}
