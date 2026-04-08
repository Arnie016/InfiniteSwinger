
export enum GameState {
  LANDING = 'LANDING',
  STORY_MAP = 'STORY_MAP',
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
export type LevelActTemplate = 'recovery' | 'reward' | 'speed' | 'hazard' | 'finale';
export type RouteBeatKind = LevelActTemplate | 'checkpoint';
export type RouteAnchorPattern =
  | 'cave_fork'
  | 'cave_drop'
  | 'cave_checkpoint'
  | 'lava_bridge'
  | 'lava_burst'
  | 'lava_checkpoint'
  | 'slope_climb'
  | 'slope_launch'
  | 'slope_checkpoint'
  | 'ash_weave'
  | 'ash_gust'
  | 'ash_checkpoint'
  | 'final_gauntlet';
export type RouteLane = 'safe' | 'risk' | 'reward' | 'high' | 'mid' | 'low' | 'center';
export type TelegraphType = 'none' | 'dive' | 'cross' | 'gate' | 'burst' | 'gust';
export type HudDensity = 'full' | 'compact' | 'hidden';
export type MotionIntensity = 'full' | 'reduced';
export type VisualDensity = 'lush' | 'balanced' | 'clean';
export type MapCameraStyle = 'steady' | 'cinematic' | 'dynamic';
export type MapFxIntensity = 'low' | 'medium' | 'high';
export type DepthFocus = 'off' | 'subtle' | 'strong';
export type GameplayCameraShake = 'off' | 'reduced' | 'full';
export type MenuParallax = 'off' | 'on';
export type SettingsTab = 'General' | 'Audio' | 'Display' | 'Swing Lab' | 'Data';
export type AssetVariantKind = 'image' | 'audio' | 'procedural';
export type AssetFallbackMode = 'procedural' | 'bundled' | 'silent';
export type RopeType = 'vine' | 'braid' | 'chain' | 'silk';
export type StoryRevealAction =
  | 'focus_camp'
  | 'reveal_path'
  | 'highlight_route'
  | 'warn_biome'
  | 'show_goal';
export type StoryRevealScope = 'camp' | 'segment' | 'region' | 'full_route';
export type CameraEasing = 'linear' | 'easeOut' | 'easeInOut';
export type StoryCastId = 'nara' | 'ivo' | 'pell' | 'suri' | 'chorus' | 'lyra' | 'kellan';
export type PlayerMoodPreset = 'Relaxed' | 'Balanced' | 'Aggressive' | 'Precision' | 'Custom';
export type SettingSafetyState = 'Safe' | 'Caution' | 'Unstable';
export type ShopPresentationGroup = 'Rope Types' | 'Rope Control' | 'Launch & Recovery' | 'Survival & Utility' | 'Cosmetics';

export interface Vector2 {
  x: number;
  y: number;
}

export interface AssetVariant {
  id: string;
  kind: AssetVariantKind;
  src?: string;
  label: string;
  premium?: boolean;
  fallbackMode?: AssetFallbackMode;
}

export interface AssetSet {
  id: string;
  label: string;
  variants: Record<string, AssetVariant[]>;
}

export interface AssetManifest {
  version: number;
  sets: Record<string, AssetSet>;
}

export interface ThemeProfile {
  biome: BiomeType;
  skyColors: [string, string];
  treeColor: string;
  groundColor: string;
  particle: Particle['type'] | 'none';
  hazeColor: string;
  accentColor: string;
  anchorColor: string;
  backgroundDensity: number;
  assetSetId: string;
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
  checkpointCount: number;
  actTemplates: LevelActTemplate[];
  assetSetId: string;
  threatProfile: string;
}

export interface HazardPack {
  kind: 'enemy' | 'entity';
  enemyType?: Enemy['enemyType'];
  entityType?: 'geyser' | 'ash_gust';
  lane: RouteLane;
  count: number;
  spacing?: number;
  telegraph?: TelegraphType;
}

export interface RewardPack {
  kind: 'coins';
  lane: RouteLane;
  count: number;
  spread?: number;
}

export interface RouteBeat {
  kind: RouteBeatKind;
  anchorPattern: RouteAnchorPattern;
  hazards: HazardPack[];
  rewards?: RewardPack[];
  recoveryAnchors: boolean;
  telegraph: TelegraphType;
  label: string;
}

export interface RouteScript {
  beatWidth: number;
  beats: RouteBeat[];
}

export type RouteScriptRegistry = Partial<Record<number, RouteScript>>;

export interface HazardBehavior {
  id: string;
  telegraph: TelegraphType;
  readableName: string;
  collisionEffect: string;
  readabilityRule: string;
}

export type HazardBehaviorRegistry = Record<string, HazardBehavior>;

export interface RewardPattern {
  id: string;
  kind: RewardPack['kind'];
  lane: RouteLane;
  defaultCount: number;
  spread: number;
}

export type RewardPatternRegistry = Record<string, RewardPattern>;

export interface BiomeSceneProfile {
  biome: BiomeType;
  themeId: string;
  hazeStrength: number;
  propDensity: number;
  fallbackProps: string[];
  premiumProps: string[];
}

export type BiomeSceneProfileRegistry = Record<BiomeType, BiomeSceneProfile>;

export interface Entity {
  id: string;
  position: Vector2;
  width: number;
  height: number;
  color: string;
  type: 'tree' | 'enemy' | 'obstacle' | 'coin' | 'ground' | 'branch' | 'lake' | 'lava' | 'mushroom' | 'powerup' | 'apple' | 'vine' | 'updraft' | 'lilypad' | 'sand' | 'flower' | 'projectile' | 'web' | 'portal' | 'stalactite' | 'nest' | 'waterfall' | 'water_pocket' | 'checkpoint' | 'geyser' | 'ash_gust';
  polyPoints?: Vector2[];
  health?: number;
  biome?: BiomeType;
  powerupType?: 'length' | 'force';
  flowerType?: 'red' | 'blue';
  angle?: number;
  stability?: number;
  isBroken?: boolean;
  breakVelocity?: Vector2;
  activated?: boolean;
  checkpointIndex?: number;
  telegraph?: TelegraphType;
  attackTimer?: number;
  collectTimer?: number;
  breakTimer?: number;
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
  telegraph?: TelegraphType;
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

export interface RunHistoryEntry {
  score: number;
  levelId: number;
  levelName: string;
  isWin: boolean;
  elapsedMs: number;
  tokens: number;
  livesLeft: number;
  completedAt: string;
}

export interface FeaturedRouteCupBenchmark extends RunHistoryEntry {
  playerLabel: string;
}

export interface FeaturedRouteCup {
  levelId: number;
  levelName: string;
  title: string;
  detail: string;
  statusLabel: string;
  countdownLabel: string;
  targetLabel: string;
  tone: 'emerald' | 'amber' | 'cyan' | 'rose';
  progressPercent: number;
  targetScore: number | null;
  localBest: RunHistoryEntry | null;
  rivalBest: FeaturedRouteCupBenchmark | null;
}

export interface SaveData {
  version: number;
  totalTokens: number;
  highScore: number;
  maxLevelReached: number; 
  skins: string[];
  equippedSkin: string;
  ropeTypes: RopeType[];
  equippedRopeType: RopeType;
  hasCompletedStoryIntro: boolean;
  selectedMoodPreset: PlayerMoodPreset;
  customSwingLabConfig: SwingLabConfig | null;
  achievements: string[];
  runHistory: RunHistoryEntry[];
  lastSelectedLevelId: number;
  settings: GameSettings;
  levelResults: Record<string, LevelResult>;
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
    grip: number;
    castRange: number;
    branchMastery: number;
    hazardResist: number;
  };
}

export interface SaveBackupV1 {
  version: number;
  exportedAt: string;
  saveData: SaveData;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  hudDensity: HudDensity;
  motionIntensity: MotionIntensity;
  mapClarity: number;
  visualDensity: VisualDensity;
  mapCameraStyle: MapCameraStyle;
  mapFxIntensity: MapFxIntensity;
  depthFocus: DepthFocus;
  gameplayCameraShake: GameplayCameraShake;
  menuParallax: MenuParallax;
}

export interface MapRegion {
  id: string;
  label: string;
  biome: BiomeType;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  focalPoint: Vector2;
  defaultZoom: number;
  hazeColor: string;
  accentColor: string;
  edgeShade: number;
  artTokens: string[];
}

export interface StoryCameraKeyframe {
  x: number;
  y: number;
  zoom: number;
  easing: CameraEasing;
  lingerMs?: number;
}

export type StoryPanelScene = 'camp' | 'floodline' | 'basin' | 'cave' | 'magma';

export interface StoryPanelVisual {
  scene: StoryPanelScene;
  caption: string;
  speaker: string;
  accentWord?: string;
  characterId?: StoryCastId;
  supportCharacterId?: StoryCastId;
}

export interface StoryBeat {
  id: string;
  regionId: string;
  title: string;
  body: string;
  hint?: string;
  kicker?: string;
  focusLevelId?: number;
  highlightLevelIds?: number[];
  revealLevels?: number[];
  revealScope?: StoryRevealScope;
  voiceCueId?: string | null;
  visual?: StoryPanelVisual;
  cameraTarget?: {
    x: number;
    y: number;
    zoom?: number;
  };
  cameraKeyframe?: StoryCameraKeyframe;
  revealAction?: StoryRevealAction;
}

export interface StorySequence {
  id: string;
  title: string;
  beats: StoryBeat[];
}

export interface MonkeyCosmeticState {
  skinId: string;
  furColor: string;
  bellyColor: string;
  limbColor: string;
  accentColor: string;
  wrapColor: string;
  charmColor: string;
  showHelmet: boolean;
  showHarness: boolean;
  showNet: boolean;
  showBranchCharms: boolean;
  showHazardWrap: boolean;
  showFocusHalo: boolean;
}

export interface RopeVisualState {
  color: string;
  thickness: number;
  stressColor: string;
  glowColor: string;
  wrapSegments: number;
}

export interface UpgradeDisplayRule {
  upgradeKey: keyof SaveData['upgrades'];
  minLevel: number;
  token: string;
  description: string;
}

export interface AudioCue {
  id: string;
  category: 'music' | 'sfx';
  variants: AssetVariant[];
  fallbackMode: AssetFallbackMode;
}

export interface AudioPlaylistProfile {
  biome: BiomeType;
  cues: string[];
  rateRange: [number, number];
  startOffsets: number[];
}

export interface LevelAudioProfile {
  levelId: number;
  musicCueId: string;
}

export interface SwingLabConfig {
  gravity: number;
  airResistance: number;
  swingAirResistance: number;
  swingMomentumRetention: number;
  groundFriction: number;
  maxSpeed: number;
  ropeReelSpring: number;
  ropeReelDamping: number;
  ropeReelMaxSpeed: number;
  musicVolume: number;
}

export interface SettingSafetyAssessment {
  state: SettingSafetyState;
  reasons: string[];
  summary: string;
}

export interface EngineConfig {
  physics: {
    gravity: number;
    airResistance: number;
    swingAirResistance: number;
    swingMomentumRetention: number;
    groundFriction: number;
    maxSpeed: number;
    fixedTimestep: number;
    fixedTimestepMs: number;
    maxCatchUpSteps: number;
    ceilingLimit: number;
  };
  rope: {
    breakTimeSeconds: number;
    assistRadius: number;
    releaseRetractTimeSeconds: number;
    retargetGraceSeconds: number;
    reelSpring: number;
    reelDamping: number;
    reelMaxSpeed: number;
  };
  ui: {
    canvasWidth: number;
    canvasHeight: number;
    drawMargin: number;
    hudSyncIntervalSeconds: number;
    maxLives: number;
  };
  audio: {
    masterMusicVolume: number;
  };
}

export interface DebugFlags {
  unlockAllLevels: boolean;
  showRouteBeatOverlay: boolean;
  showHazardTelegraphs: boolean;
  assetFallbackLogging: boolean;
}

export interface CurrentBuildEntry {
  key: string;
  label: string;
  level: number;
  description: string;
}

export interface BuildMilestone {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
  tone: 'emerald' | 'amber' | 'cyan' | 'rose';
}

export interface CurrentBuildSummary {
  equippedSkin: string;
  ropeType: {
    id: RopeType;
    label: string;
    description: string;
  };
  rope: CurrentBuildEntry[];
  movement: CurrentBuildEntry[];
  defense: CurrentBuildEntry[];
  milestones: BuildMilestone[];
  synergies: string[];
  routeFitTags: string[];
}

export interface PurchaseReceipt {
  id: string;
  itemId: string;
  itemName: string;
  changeApplied: string;
  tokenDelta: number;
  accent: 'emerald' | 'amber' | 'cyan';
  timestamp: number;
}

export interface LevelResult {
  bestScore: number;
  bestTimeMs: number | null;
  firstClearedAt: string | null;
  stars: number;
  clears: number;
}

export interface RunDebrief {
  checkpointsSecured: number;
  redeploys: number;
  hazardHits: number;
  jumpsUsed: number;
  maxComboMultiplier: number;
  maxComboRank: SkillRank;
  maxComboScore: number;
  peakSpeed: number;
  usedSafetyNet: boolean;
}

export interface CheckpointState {
  activeId: string | null;
  activatedIds: string[];
  respawnPosition: Vector2 | null;
  respawnVelocity: Vector2;
  label: string | null;
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'UPGRADE' | 'SKIN' | 'ROPE';
  cost: number;
  description: string;
  presentationGroup?: ShopPresentationGroup;
  visualEffectText?: string;
  synergyText?: string;
  routeHelpTags?: string[];
  upgradeKey?: keyof SaveData['upgrades'];
  ropeType?: RopeType;
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
