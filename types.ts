export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  SHOP = 'SHOP',
  LEADERBOARD = 'LEADERBOARD'
}

export enum AbilityType {
  PUNCH = 'PUNCH',
  LASER = 'LASER',
  BANANA = 'BANANA',
}

export type BiomeType = 'JUNGLE' | 'WINTER' | 'SWAMP' | 'AUTUMN';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  position: Vector2;
  width: number;
  height: number;
  color: string;
  type: 'tree' | 'enemy' | 'obstacle' | 'coin' | 'ground' | 'branch' | 'lake';
  polyPoints?: Vector2[]; // For low poly rendering
  health?: number; // For destructible trees
  biome?: BiomeType;
}

export interface Enemy extends Entity {
  velocity: Vector2;
  health: number;
  enemyType: 'bird' | 'snake' | 'spider' | 'crocodile' | 'bonus_bird';
  state?: number; // For animation/movement phases
  anchorY?: number; // For spiders (original height)
}

export interface Particle {
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type?: 'snow' | 'rain' | 'leaf' | 'spark';
}

export interface SaveData {
  totalTokens: number;
  highScore: number;
  skins: string[];
  equippedSkin: string;
  upgrades: {
    ropeLength: number; // Level 1-5
    swingForce: number; // Level 1-5
    armor: number; // Level 0-3
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
}