
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, AbilityType, Vector2, Entity, Enemy, Particle, SaveData, ShopItem, BiomeType, FloatingText, SkillChainState, SkillRank, WeatherType, LevelConfig, TutorialState, TutorialStep } from './types';
import { getJungleQuote } from './services/geminiService';
import { Zap, Rocket, Grab, Play, RotateCcw, Skull, ShoppingCart, Coins, Home, MousePointer2, Move, Wind, Eye, CloudRain, Snowflake, CloudFog, Leaf, Pause, PlayCircle, Flame, TrendingUp, AlertTriangle, Crosshair, Clock, Flower, Shield, Heart, Trophy, Star, Activity, Sparkles, Hourglass, Gem, Ghost, Lock, Map, CheckCircle, BookOpen, Mountain, Anchor, Scroll, Shirt, Hammer, X, Sprout, Feather, LifeBuoy, Keyboard, PauseCircle, LogOut, Egg, Trash2 } from 'lucide-react';

// --- CONSTANTS ---
const GRAVITY = 0.5; 
const AIR_RESISTANCE = 0.99;
const ROPE_STIFFNESS = 0.15;
const MAX_SPEED = 22;
const CEILING_LIMIT = -200; 
const SPAWN_RATE_BASE = 300;
const ABILITY_COOLDOWN = 600; 
const JUMP_COOLDOWN_FRAMES = 45; 
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 600;
const FEVER_THRESHOLD = 100;
const VOID_THRESHOLD = 1200; 
const COMBO_DECAY = 120;
const VOID_TIMER_MAX_SECONDS = 3.0; // Strict 3s void
const ROPE_BREAK_TIME_SECONDS = 4.5; // Rope holds for 3s, then slips for 1.5s, snaps at 4.5s
const GRAPPLE_ASSIST_RADIUS = 200;
const MAX_LIVES = 3;
const INVULNERABILITY_TIME = 60; 

// SKILL CHAIN CONSTANTS
const CHAIN_TIMEOUT_FRAMES = 150; 
const BACKWARD_TOLERANCE = -2.0; 
const BASE_MULTIPLIER = 1.0;
const MAX_MULTIPLIER = 5.0;

const RANKS: { threshold: number, title: SkillRank, color: string }[] = [
    { threshold: 6000, title: 'LEGEND', color: '#FFD700' },
    { threshold: 3000, title: 'MYTHIC', color: '#D50000' },
    { threshold: 1500, title: 'FEROCIOUS', color: '#E040FB' },
    { threshold: 500, title: 'WILD', color: '#FF9100' },
    { threshold: 0, title: 'GROOVIN', color: '#00E676' }
];

// Biome Configs
const BIOMES: Record<BiomeType, { skyColors: [string, string], treeColor: string, groundColor: string, particle: string }> = {
    JUNGLE: { skyColors: ["#0F2027", "#203A43"], treeColor: "#2E7D32", groundColor: "#1B5E20", particle: 'none' },
    AUTUMN: { skyColors: ["#FF7043", "#FFCCBC"], treeColor: "#D84315", groundColor: "#FFAB91", particle: 'leaf' },
    WINTER: { skyColors: ["#B3E5FC", "#E1F5FE"], treeColor: "#81D4FA", groundColor: "#E1F5FE", particle: 'snow' },
    SWAMP:  { skyColors: ["#263238", "#37474F"], treeColor: "#33691E", groundColor: "#1B5E20", particle: 'rain' },
    VOLCANO: { skyColors: ["#3E0000", "#B71C1C"], treeColor: "#3E2723", groundColor: "#BF360C", particle: 'ash' },
    CAVE:    { skyColors: ["#1a1a1d", "#2d2d30"], treeColor: "#546E7A", groundColor: "#37474F", particle: 'none' }
};

// --- LEVEL CONFIGURATION ---
const LEVELS: LevelConfig[] = [
    // 1-2: ELVEN KINGDOM (Forest/Jungle)
    { id: 1, name: "Elven Outskirts", description: "The edge of the Kingdom.", targetDistance: 600, biome: "JUNGLE", difficulty: 0, allowedEnemies: [], allowedWeather: ['CLEAR'], tutorialType: 'BASIC' },
    { id: 2, name: "Royal Canopy", description: "Deep in the Elven woods.", targetDistance: 1000, biome: "JUNGLE", difficulty: 1, allowedEnemies: ['bird'], allowedWeather: ['CLEAR'], tutorialType: 'ADVANCED' },
    
    // 3-4: THE GREAT LAKE (Swamp/Lake)
    { id: 3, name: "The Great Lake", description: "Endless water below.", targetDistance: 1500, biome: "SWAMP", difficulty: 3, allowedEnemies: ['bird', 'snake', 'crocodile'], allowedWeather: ['CLEAR', 'RAIN'], tutorialType: 'NONE' },
    { id: 4, name: "Misty Waters", description: "Fog rolls over the lake.", targetDistance: 2000, biome: "SWAMP", difficulty: 4, allowedEnemies: ['eagle', 'spider', 'crocodile', 'slug'], allowedWeather: ['FOG', 'RAIN'], tutorialType: 'NONE' },
    
    // 5: TROLL VALLEY (Cave)
    { id: 5, name: "Troll Valley", description: "Dark, damp, and dangerous.", targetDistance: 2500, biome: "CAVE", difficulty: 5, allowedEnemies: ['spider', 'bat', 'troll'], allowedWeather: ['CLEAR'], tutorialType: 'NONE' },
    
    // 6: VOLCANO BASE (Lava Lake)
    { id: 6, name: "Lava Lake", description: "The floor is literal lava.", targetDistance: 3000, biome: "VOLCANO", difficulty: 6, allowedEnemies: ['bat', 'eagle'], allowedWeather: ['CLEAR', 'WINDY'], tutorialType: 'NONE' },
    
    // 7-10: VOLCANO ASCENT
    { id: 7, name: "Rocky Slopes", description: "Steep climb.", targetDistance: 3500, biome: "VOLCANO", difficulty: 7, allowedEnemies: ['eagle', 'spider'], allowedWeather: ['WINDY'], tutorialType: 'NONE' },
    { id: 8, name: "Ash Storm", description: "Visibility low.", targetDistance: 4000, biome: "VOLCANO", difficulty: 8, allowedEnemies: ['eagle', 'spider', 'bat'], allowedWeather: ['WINDY', 'FOG'], tutorialType: 'NONE' },
    { id: 9, name: "The Peak", description: "Almost there.", targetDistance: 4500, biome: "VOLCANO", difficulty: 9, allowedEnemies: ['bird', 'spider', 'eagle', 'crocodile', 'bat'], allowedWeather: ['WINDY'], tutorialType: 'NONE' },
    { id: 10, name: "Magma Core", description: "The final test.", targetDistance: 5000, biome: "VOLCANO", difficulty: 10, allowedEnemies: ['bird', 'spider', 'eagle', 'bat', 'snake', 'troll'], allowedWeather: ['RAIN', 'WINDY', 'FOG'], tutorialType: 'NONE' }
];

// Initial Save Data
const DEFAULT_SAVE: SaveData = {
  totalTokens: 0,
  highScore: 0,
  maxLevelReached: 1, // Start at level 1 normally
  skins: ['default'],
  equippedSkin: 'default',
  upgrades: {
    ropeLength: 1,
    swingForce: 1,
    armor: 0,
    magnetism: 0,
    feverDuration: 0,
    luck: 0,
    launchBoost: 0,
    airControl: 0,
    safetyNet: 0
  }
};

// SKILL TREE LAYOUT (Unchanged)
const SHOP_ITEMS: ShopItem[] = [
  // TIER 1 - ROOTS
  { id: 'upgrade_rope', name: 'Vine Weaver', type: 'UPGRADE', cost: 50, description: 'Longer vines for deeper swings.', upgradeKey: 'ropeLength', maxLevel: 5, icon: Move, x: 50, y: 10 },
  
  // TIER 2
  { id: 'upgrade_force', name: 'Gorilla Strength', type: 'UPGRADE', cost: 75, description: 'Start swings with more power.', upgradeKey: 'swingForce', maxLevel: 5, icon: Zap, x: 30, y: 30, parents: ['upgrade_rope'] },
  { id: 'upgrade_launch', name: 'Springy Tendons', type: 'UPGRADE', cost: 100, description: 'Explosive speed when releasing.', upgradeKey: 'launchBoost', maxLevel: 5, icon: Sprout, x: 70, y: 30, parents: ['upgrade_rope'] },

  // TIER 3
  { id: 'upgrade_magnet', name: 'Coin Magnet', type: 'UPGRADE', cost: 120, description: 'Attract coins nearby.', upgradeKey: 'magnetism', maxLevel: 5, icon: Crosshair, x: 20, y: 55, parents: ['upgrade_force'] },
  { id: 'upgrade_air', name: 'Aerodynamics', type: 'UPGRADE', cost: 120, description: 'Control movement mid-air.', upgradeKey: 'airControl', maxLevel: 5, icon: Feather, x: 80, y: 55, parents: ['upgrade_launch'] },

  // TIER 4
  { id: 'upgrade_armor', name: 'Coconut Helmet', type: 'UPGRADE', cost: 150, description: 'Survive one hit per run.', upgradeKey: 'armor', maxLevel: 3, icon: Shield, x: 40, y: 75, parents: ['upgrade_force', 'upgrade_launch'] },
  { id: 'upgrade_fever', name: 'Banana Smoothie', type: 'UPGRADE', cost: 100, description: 'Extends Fever Mode.', upgradeKey: 'feverDuration', maxLevel: 5, icon: Hourglass, x: 60, y: 75, parents: ['upgrade_launch', 'upgrade_force'] },

  // TIER 5
  { id: 'upgrade_luck', name: 'Lucky Clover', type: 'UPGRADE', cost: 200, description: 'Chance for double coins.', upgradeKey: 'luck', maxLevel: 5, icon: Sparkles, x: 30, y: 95, parents: ['upgrade_magnet'] },
  { id: 'upgrade_net', name: 'Vine Net', type: 'UPGRADE', cost: 500, description: 'Bounce back from the void once.', upgradeKey: 'safetyNet', maxLevel: 1, icon: LifeBuoy, x: 70, y: 95, parents: ['upgrade_air'] },

  // SKINS (Not in tree, separate tab)
  { id: 'skin_cyber', name: 'Cyber Kong', type: 'SKIN', cost: 500, description: 'Neon aesthetics.', icon: Activity },
  { id: 'skin_winter', name: 'Yeti', type: 'SKIN', cost: 800, description: 'Cold resistance visual.', icon: Snowflake },
  { id: 'skin_ninja', name: 'Ninja', type: 'SKIN', cost: 1200, description: 'Stealthy shadows.', icon: Ghost },
  { id: 'skin_golden', name: 'Golden God', type: 'SKIN', cost: 2500, description: 'Pure luxury.', icon: Gem },
];

// --- HELPER FUNCTIONS ---

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

const lerpColor = (a: string, b: string, amount: number) => {
    const ah = parseInt(a.replace(/#/g, ''), 16),
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
        bh = parseInt(b.replace(/#/g, ''), 16),
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);
    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
};

const checkCollision = (r1: Entity | {position: Vector2, width: number, height: number}, r2: Entity) => {
  return (
    r1.position.x < r2.position.x + r2.width &&
    r1.position.x + r1.width > r2.position.x &&
    r1.position.y < r2.position.y + r2.height &&
    r1.position.y + r1.height > r2.position.y
  );
};

const drawPoly = (ctx: CanvasRenderingContext2D, points: Vector2[], color: string, stroke?: string) => {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

const createTreePoly = (x: number, h: number, type: BiomeType): Vector2[] => {
  if (type === 'WINTER') {
      return [
          { x: x - 50, y: h }, { x: x - 60, y: h - 60 }, { x: x - 40, y: h - 60 },
          { x: x - 50, y: h - 120 }, { x: x - 30, y: h - 120 }, { x: x, y: h - 200 },
          { x: x + 30, y: h - 120 }, { x: x + 50, y: h - 120 }, { x: x + 40, y: h - 60 },
          { x: x + 60, y: h - 60 }, { x: x + 50, y: h }
      ];
  }
  
  if (type === 'CAVE') {
      // Stalactites instead of tree tops sometimes
      return [
          { x: x - 40, y: h },
          { x: x - 20, y: h + 100 },
          { x: x, y: h + 200 },
          { x: x + 20, y: h + 100 },
          { x: x + 40, y: h },
      ];
  }
  
  const points = [
      { x: x - 60, y: h },
      { x: x - 70, y: h - 40 },
      { x: x - 30, y: h - 80 },
      { x: x - 50, y: h - 120 },
      { x: x, y: h - 180 },
      { x: x + 50, y: h - 120 },
      { x: x + 30, y: h - 80 },
      { x: x + 70, y: h - 40 },
      { x: x + 60, y: h },
  ];

  if (type === 'VOLCANO') {
     return points.map(p => ({...p, x: x + (p.x - x) * 0.7 }));
  }
  
  return points;
};

export default function App() {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [runTokens, setRunTokens] = useState(0);
  const [cooldowns, setCooldowns] = useState({ [AbilityType.PUNCH]: 0, [AbilityType.LASER]: 0, [AbilityType.BANANA]: 0, [AbilityType.SLOW_MO]: 0 });
  const [activeAbility, setActiveAbility] = useState<AbilityType | null>(null);
  const [displayedQuote, setDisplayedQuote] = useState("");
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [ropeLengthDisplay, setRopeLengthDisplay] = useState<string>("0.0");
  const [currentBiome, setCurrentBiome] = useState<BiomeType>('JUNGLE');
  const [isPaused, setIsPaused] = useState(false);
  const [skyColorCurrent, setSkyColorCurrent] = useState(["#0F2027", "#203A43"]);
  const [fallTimerDisplay, setFallTimerDisplay] = useState<number | null>(null);
  const [isInvincible, setIsInvincible] = useState(false);
  const [playerLives, setPlayerLives] = useState(MAX_LIVES);
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);
  const [tutorial, setTutorial] = useState<TutorialState>({ active: false, currentStep: 'WELCOME', showBox: false, message: "" });
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [shopTab, setShopTab] = useState<'GEAR' | 'SKINS'>('GEAR');
  const [selectedShopItem, setSelectedShopItem] = useState<string | null>(null);
  const [justUpgraded, setJustUpgraded] = useState<string | null>(null);
  
  // Weather State
  const [weather, setWeather] = useState<{type: WeatherType, timer: number}>({ type: 'CLEAR', timer: 0 });

  // Skill Chain UI State
  const [skillChainUI, setSkillChainUI] = useState<SkillChainState>({
      active: false, currentScore: 0, multiplier: 1, events: [], timer: 0, rank: 'GROOVIN'
  });

  // Persistent Data
  const [saveData, setSaveData] = useState<SaveData>(() => {
    const saved = localStorage.getItem('polyjungle_save_v2'); 
    if (saved) {
        const parsed = JSON.parse(saved);
        // Schema Migration: Check for new fields
        if (parsed.upgrades.launchBoost === undefined) parsed.upgrades.launchBoost = 0;
        if (parsed.upgrades.airControl === undefined) parsed.upgrades.airControl = 0;
        if (parsed.upgrades.safetyNet === undefined) parsed.upgrades.safetyNet = 0;
        return parsed;
    }
    return DEFAULT_SAVE;
  });

  useEffect(() => {
    localStorage.setItem('polyjungle_save_v2', JSON.stringify(saveData));
  }, [saveData]);

  // --- REFS FOR GAME LOOP ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
  const bgLayers = useRef<{x: number, y: number, size: number, type: number, color: string, speed: number, shapeVar?: number}[]>([]);
  const mapElements = useRef<{x: number, y: number, type: 'cloud' | 'tree' | 'wave' | 'rock', speed: number}[]>([]); 
  const mapPropsRef = useRef<{x: number, y: number, type: 'tree' | 'rock' | 'mountain' | 'pine' | 'wave' | 'cave', scale: number}[]>([]); 

  const monkey = useRef({
    position: { x: 200, y: 300 },
    velocity: { x: 5, y: 0 },
    width: 30,
    height: 30,
    rotation: 0,
    isSwinging: false,
    tetherPoint: null as Vector2 | null,
    ropeLength: 0,
    speedBuff: 0, 
    armorStack: 0,
    eyeOffset: { x: 0, y: 0 },
    feverTime: 0,
    isFever: false,
    runLevel: 0,
    fallTimer: 0,
    runRopeBonus: 0,
    runForceBonus: 0,
    trail: [] as Vector2[],
    lives: MAX_LIVES,
    invulnerableTime: 0,
    freezeTime: 0,
    jumpCooldown: 0,
    // Trick Tracking
    swingStartAngle: 0,
    totalRotation: 0,
    lastLoopTime: 0,
    hasSurged: false,
    overdriveTimer: 0,
    justDidLoop: false,
    inFog: false,
    hasUsedNet: false,
    ropeTimer: 0 // Track rope stress
  });

  const skillChain = useRef<SkillChainState>({
      active: false,
      currentScore: 0,
      multiplier: BASE_MULTIPLIER,
      events: [],
      timer: 0,
      rank: 'GROOVIN'
  });

  const entities = useRef<Entity[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const shakeIntensity = useRef(0);
  const cameraOffset = useRef({ x: 0, y: 0 });
  const smartTargetRef = useRef<Entity | null>(null);
  
  const inputRef = useRef({ 
      isMouseDown: false, 
      mousePos: { x: 0, y: 0 }, 
      justPressed: false,
      wheelDelta: 0,
      keys: { left: false, right: false, shift: false }
  });
  
  const saveDataRef = useRef(saveData);
  useEffect(() => { saveDataRef.current = saveData; }, [saveData]);

  const scoreRef = useRef(0);
  const distanceRef = useRef(0);
  const runTokensRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { distanceRef.current = distance; }, [distance]);
  useEffect(() => { runTokensRef.current = runTokens; }, [runTokens]);
  
  const weatherRef = useRef<{type: WeatherType, timer: number}>({ type: 'CLEAR', timer: 0 });
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  const selectedLevelRef = useRef(selectedLevelId);
  useEffect(() => { selectedLevelRef.current = selectedLevelId; }, [selectedLevelId]);

  // Generate Background
  const generateBackground = useCallback(() => {
      bgLayers.current = [];
      const biome = BIOMES[currentBiome];
      
      // 1. Far Background (Mountains/Caves) - Increased count for richness
      for(let i=0; i<30; i++) {
          bgLayers.current.push({
              x: Math.random() * 2000,
              y: CANVAS_HEIGHT,
              size: randomRange(2.0, 3.5), 
              type: 0, 
              color: currentBiome === 'CAVE' ? '#0f0f10' : '#004d40',
              speed: 0.05,
              shapeVar: 0 
          });
      }
      // 2. Mid Background (Dense Silhouettes)
      for(let i=0; i<60; i++) { 
          bgLayers.current.push({
              x: Math.random() * 2000,
              y: CANVAS_HEIGHT + randomRange(0, 100),
              size: randomRange(1.5, 4.0), 
              type: 3, 
              color: currentBiome === 'CAVE' ? '#1f1f22' : '#00332c', 
              speed: 0.08,
              shapeVar: Math.random() 
          });
      }
      // 3. Near Background (Hills/Bushes) - Closer
      for(let i=0; i<40; i++) {
          bgLayers.current.push({
              x: Math.random() * 2000,
              y: CANVAS_HEIGHT + 50,
              size: randomRange(1.0, 1.8),
              type: 0, 
              color: currentBiome === 'CAVE' ? '#2d2d30' : '#1b5e20', 
              speed: 0.15, // Faster speed for depth
              shapeVar: 1 
          });
      }
      // 4. Foreground (Vines/Decor)
      if (currentBiome === 'JUNGLE' || currentBiome === 'SWAMP') {
          for(let i=0; i<40; i++) {
              bgLayers.current.push({
                  x: Math.random() * 2000,
                  y: -20,
                  size: Math.random() * 150 + 50, 
                  type: 1, 
                  color: `rgba(20, ${60 + Math.random()*40}, 20, ${Math.random() * 0.4 + 0.2})`,
                  speed: Math.random() * 0.2 + 0.15
              });
          }
      }
  }, [currentBiome]);

  // Init Lobby Map Elements
  useEffect(() => {
      mapElements.current = [];
      for(let i=0; i<5; i++) {
          mapElements.current.push({
              x: Math.random() * CANVAS_WIDTH,
              y: Math.random() * CANVAS_HEIGHT,
              type: 'cloud',
              speed: randomRange(0.2, 0.5)
          });
      }
      
      mapPropsRef.current = [];
      // Denser world generation
      for(let i=0; i<120; i++) {
          const x = Math.random() * CANVAS_WIDTH;
          const y = Math.random() * CANVAS_HEIGHT;
          
          // Calculate distance to the "path" to avoid cluttering the walkable nodes
          // Path roughly approximates a diagonal with a sine wave
          // Just checking distance to the bezier curve approximation
          const t = x / CANVAS_WIDTH;
          const pathY = (CANVAS_HEIGHT - 100) * (1-t) + 100 * t; // Linear approx
          if (Math.abs(y - pathY) < 80) continue; // Keep clear of the main trail

          let type: 'tree' | 'rock' | 'mountain' | 'pine' | 'wave' | 'cave' = 'tree';
          let scale = 0.5 + Math.random() * 0.5;

          if (x < CANVAS_WIDTH * 0.35) { // Elven
               type = Math.random() > 0.6 ? 'tree' : 'pine';
          } else if (x < CANVAS_WIDTH * 0.6) { // Lake
               type = Math.random() > 0.6 ? 'wave' : 'rock';
          } else if (x < CANVAS_WIDTH * 0.75) { // Cave
               type = Math.random() > 0.6 ? 'cave' : 'rock';
          } else { // Volcano
               type = Math.random() > 0.5 ? 'mountain' : 'rock';
               scale *= 1.2; // Bigger mountains
          }

          mapPropsRef.current.push({ x, y, type, scale });
      }
  }, []);

  useEffect(() => { generateBackground(); }, [generateBackground]);

  // --- TUTORIAL LOGIC ---
  const updateTutorial = (dt: number) => {
      if (!tutorial.active) return;
      const player = monkey.current;
      const level = LEVELS[selectedLevelRef.current - 1];
      const isL2 = level.tutorialType === 'ADVANCED';
      
      let nextStep = tutorial.currentStep;
      let message = tutorial.message;
      let show = tutorial.showBox;
      let target = tutorial.targetPos;
      let timer = tutorial.timer || 0;

      // LEVEL 1 BASIC TUTORIAL
      if (!isL2) {
          if (tutorial.currentStep === 'WELCOME') {
              show = true;
              message = "Welcome! Use 'A' and 'D' keys to swing your body.";
              target = { x: player.position.x, y: player.position.y - 50 };
              if (Math.abs(player.velocity.x) > 2) nextStep = 'GRAPPLE';
          }
          else if (tutorial.currentStep === 'GRAPPLE') {
              show = true;
              message = "Click & Hold on a tree to GRAPPLE!";
              const tree = entities.current.find(e => e.type === 'tree' && e.position.x > player.position.x + 100);
              if (tree) target = { x: tree.position.x, y: tree.position.y + 200 };
              
              if (player.isSwinging) nextStep = 'MOMENTUM';
          }
          else if (tutorial.currentStep === 'MOMENTUM') {
               show = true;
               message = "Swing with the motion! Hold 'D' when swinging Right.";
               target = { x: player.position.x, y: player.position.y - 50 };
               const speed = Math.hypot(player.velocity.x, player.velocity.y);
               if (player.isSwinging && speed > 18) nextStep = 'SWING';
          }
          else if (tutorial.currentStep === 'SWING') {
               show = true;
               message = "Now RELEASE click at the peak to FLY!";
               target = { x: player.position.x, y: player.position.y - 50 };
               if (!player.isSwinging && player.velocity.x > 8) nextStep = 'JUMP';
          }
          else if (tutorial.currentStep === 'JUMP') {
              show = true;
              message = "Press SPACE mid-air to double jump!";
              target = { x: player.position.x, y: player.position.y - 50 };
              if (player.jumpCooldown > 0) {
                  nextStep = 'BRANCH_INFO';
                  timer = 240; // 4 seconds
              }
          }
          else if (tutorial.currentStep === 'BRANCH_INFO') {
              show = true;
              message = "WARNING: Standing on branches too long will break them!";
              target = { x: player.position.x, y: player.position.y - 50 };
              timer -= dt;
              if (timer <= 0) nextStep = 'COMPLETED';
          }
          else if (tutorial.currentStep === 'COMPLETED') {
              show = false;
          }
      } 
      // LEVEL 2 ADVANCED TUTORIAL
      else {
          if (tutorial.currentStep === 'L2_INTRO') {
              show = true;
              message = "Level 2: Dangers Ahead! Swing FAST to survive.";
              target = { x: player.position.x, y: player.position.y - 50 };
              timer -= dt;
              if (timer <= 0) nextStep = 'L2_MOMENTUM';
          }
          else if (tutorial.currentStep === 'L2_MOMENTUM') {
              show = true;
              message = "PUMP IT! Alternate A and D to reach MAX SPEED (22+)!";
              target = { x: player.position.x, y: player.position.y - 50 };
              const speed = Math.hypot(player.velocity.x, player.velocity.y);
              if (speed > 22) {
                  nextStep = 'L2_BRANCH';
                  timer = 0;
              }
          }
          else if (tutorial.currentStep === 'L2_BRANCH') {
              show = true;
              message = "Look! A Branch! Grapple it to rest... but be quick!";
              // Find branch
              const branch = entities.current.find(e => e.type === 'branch' && e.position.x > player.position.x);
              if (branch) target = { x: branch.position.x + branch.width/2, y: branch.position.y };
              
              // Check if standing on branch
              const standingOnBranch = entities.current.some(e => e.type === 'branch' && checkCollision(player, e));
              if (standingOnBranch) {
                  message = "UNSTABLE! It breaks in 1s! JUMP!";
                  if (player.jumpCooldown > 0) nextStep = 'L2_DODGE'; // Jumped off
              }
          }
          else if (tutorial.currentStep === 'L2_DODGE') {
              show = true;
              message = "ENEMY AHEAD! Birds hurt. Swing HIGH or LOW to dodge!";
              const bird = enemies.current.find(e => e.enemyType === 'bird' && e.position.x > player.position.x);
              if (bird) {
                  target = { x: bird.position.x, y: bird.position.y };
                  // Time scale handling is now in updatePhysics
                  if (player.position.x > bird.position.x + 100) {
                      nextStep = 'L2_ABILITY';
                  }
              } else {
                  // If missed bird spawn, just proceed
                  if (distanceRef.current > 40) nextStep = 'L2_ABILITY';
              }
          }
          else if (tutorial.currentStep === 'L2_ABILITY') {
              show = true;
              message = "Here's a free Rocket charge! Press 'E' to BLAST OFF!";
              target = { x: player.position.x, y: player.position.y - 50 };
              // Grant ability if not ready
              if (cooldowns[AbilityType.BANANA] > 0) setCooldowns(prev => ({...prev, [AbilityType.BANANA]: 0}));
              
              if (activeAbility === AbilityType.BANANA) {
                  nextStep = 'COMPLETED';
              }
          }
          else if (tutorial.currentStep === 'COMPLETED') {
              show = false;
          }
      }

      if (nextStep !== tutorial.currentStep || show !== tutorial.showBox) {
          setTutorial({ ...tutorial, currentStep: nextStep, showBox: show, message, targetPos: target, timer });
          // Init timer for new step if needed
          if (nextStep === 'L2_INTRO') setTutorial(prev => ({...prev, timer: 180}));
      } else if (tutorial.showBox) {
           if (tutorial.currentStep !== 'GRAPPLE' && tutorial.currentStep !== 'L2_BRANCH' && tutorial.currentStep !== 'L2_DODGE') {
               setTutorial(prev => ({...prev, targetPos: { x: player.position.x, y: player.position.y - 50 }, timer }));
           } else {
               setTutorial(prev => ({...prev, timer})); 
           }
      }
  };

  // --- GAME LOGIC HELPERS ---

  const addShake = (amount: number) => {
    shakeIntensity.current = Math.min(shakeIntensity.current + amount, 20);
  };

  const spawnParticles = (x: number, y: number, color: string, count: number, sizeBase: number = 3, type?: Particle['type']) => {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.current.push({
            position: { x, y },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            life: randomRange(20, 60),
            maxLife: 60,
            color: color,
            size: sizeBase * randomRange(0.8, 1.2),
            type: type
        });
    }
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string, size: number = 20) => {
    floatingTexts.current.push({
        id: Math.random(),
        position: { x, y },
        text,
        color,
        life: 60,
        velocity: { x: 0, y: -1 },
        size
    });
  };

  const triggerSkillEvent = (name: string, scoreVal: number, multMod: number = 0.0, color: string = "#FFF") => {
    const chain = skillChain.current;
    
    if (!chain.active) {
        chain.active = true;
        chain.multiplier = BASE_MULTIPLIER;
        chain.currentScore = 0;
        chain.events = [];
    }
    
    chain.timer = CHAIN_TIMEOUT_FRAMES;
    chain.multiplier = Math.min(MAX_MULTIPLIER, chain.multiplier + multMod);
    chain.currentScore += Math.floor(scoreVal * chain.multiplier);
    
    chain.events.push({ name, score: scoreVal, multiplierMod: multMod, timestamp: Date.now() });
    if (chain.events.length > 5) chain.events.shift();

    const total = chain.currentScore;
    let newRank: SkillRank = 'GROOVIN';
    for (const r of RANKS) {
        if (total >= r.threshold) {
            newRank = r.title;
            break;
        }
    }
    chain.rank = newRank;

    setSkillChainUI({...chain});
    spawnFloatingText(monkey.current.position.x, monkey.current.position.y - 60, `${name} x${chain.multiplier.toFixed(1)}`, color, 16);
  };

  const bankSkillChain = () => {
    const chain = skillChain.current;
    if (!chain.active) return;

    const total = chain.currentScore;
    setScore(s => s + total);
    spawnFloatingText(monkey.current.position.x, monkey.current.position.y - 80, `CHAIN BROKEN! +${total}`, "#FFD700", 30);
    
    chain.active = false;
    chain.currentScore = 0;
    chain.multiplier = BASE_MULTIPLIER;
    chain.timer = 0;
    setSkillChainUI({...chain});
  };

  const incrementCombo = (pos: Vector2) => {
     if (skillChain.current.active) {
         skillChain.current.timer = CHAIN_TIMEOUT_FRAMES;
     }
  };

  const handleGameOver = useCallback(async () => {
    setGameState(GameState.GAME_OVER);
    setIsLoadingQuote(true);
    
    const newTotalTokens = saveDataRef.current.totalTokens + runTokensRef.current;
    const newHighScore = Math.max(saveDataRef.current.highScore, scoreRef.current);
    
    setSaveData(prev => ({
        ...prev,
        totalTokens: newTotalTokens,
        highScore: newHighScore
    }));

    const quote = await getJungleQuote(scoreRef.current, distanceRef.current);
    setDisplayedQuote(quote);
    setIsLoadingQuote(false);
  }, []);

  const takeDamage = (amount: number) => {
    const player = monkey.current;
    if (isInvincible || player.invulnerableTime > 0) return;

    if (player.armorStack > 0) {
        player.armorStack--;
        spawnFloatingText(player.position.x, player.position.y, "ARMOR BROKE!", "#999", 20);
        addShake(5);
        player.invulnerableTime = INVULNERABILITY_TIME;
        return;
    }

    player.lives -= amount;
    setPlayerLives(player.lives);
    addShake(10);
    player.invulnerableTime = INVULNERABILITY_TIME;
    
    if (player.lives <= 0) {
        handleGameOver();
    } else {
        spawnFloatingText(player.position.x, player.position.y, "OUCH!", "#D50000", 30);
    }
  };

  const findSmartTarget = (mouseX: number, mouseY: number): Entity | null => {
     let bestTarget: Entity | null = null;
     let bestDist = GRAPPLE_ASSIST_RADIUS;

     entities.current.forEach(e => {
         if (e.type !== 'tree' && e.type !== 'branch' && e.type !== 'vine' && e.type !== 'stalactite') return;
         
         const cx = e.position.x + e.width/2;
         const cy = e.position.y + e.height/2;
         const dist = Math.hypot(cx - mouseX, cy - mouseY);
         
         if (dist < bestDist) {
             bestDist = dist;
             bestTarget = e;
         }
     });
     return bestTarget;
  };

  const cycleWeather = (dt: number) => {
    const w = weatherRef.current;
    w.timer -= dt;
    if (w.timer <= 0) {
        const level = LEVELS[selectedLevelRef.current - 1];
        const options = level.allowedWeather;
        const next = options[Math.floor(Math.random() * options.length)];
        setWeather({ type: next, timer: randomRange(1000, 3000) });
    }
  };

  const spawnWeatherParticles = () => {
    const type = weatherRef.current.type;
    const biome = currentBiome;
    
    const camX = cameraOffset.current.x;
    const camY = cameraOffset.current.y;
    
    if (type === 'RAIN' || biome === 'SWAMP') {
        if (Math.random() < 0.3) {
          particles.current.push({
              position: { x: camX + Math.random() * CANVAS_WIDTH + 200, y: camY - 100 },
              velocity: { x: -5, y: 15 + Math.random() * 5 },
              life: 60, maxLife: 60, color: '#4FC3F7', size: 2, type: 'rain'
          });
        }
    } else if (biome === 'WINTER') {
         if (Math.random() < 0.2) {
          particles.current.push({
              position: { x: camX + Math.random() * CANVAS_WIDTH, y: camY - 100 },
              velocity: { x: Math.random() * 2 - 1, y: 2 + Math.random() },
              life: 120, maxLife: 120, color: '#FFF', size: 3, type: 'snow'
          });
         }
    } else if (biome === 'VOLCANO') {
        if (Math.random() < 0.2) {
           particles.current.push({
              position: { x: camX + Math.random() * CANVAS_WIDTH, y: camY + CANVAS_HEIGHT },
              velocity: { x: Math.random() * 2 - 1, y: -(1 + Math.random()) },
              life: 120, maxLife: 120, color: '#9E9E9E', size: 3, type: 'ash'
          });
        }
    } else if (type === 'WINDY') {
         if (Math.random() < 0.1) {
           particles.current.push({
              position: { x: camX - 100, y: camY + Math.random() * CANVAS_HEIGHT },
              velocity: { x: 15 + Math.random() * 5, y: Math.random() * 2 - 1 },
              life: 60, maxLife: 60, color: 'rgba(255,255,255,0.1)', size: 40, type: 'wind'
          });
         }
    }
  };


  const spawnLevelSegment = (startX: number) => {
    const level = LEVELS[selectedLevelRef.current - 1];
    if (startX > level.targetDistance * 20) {
        if (!entities.current.find(e => e.type === 'portal')) {
            entities.current.push({
                id: 'finish-portal',
                position: { x: level.targetDistance * 20, y: CANVAS_HEIGHT - 300 },
                width: 100,
                height: 200,
                color: '#00E676',
                type: 'portal'
            });
            entities.current.push({
                 id: 'finish-platform',
                 position: { x: level.targetDistance * 20 - 50, y: CANVAS_HEIGHT - 100 },
                 width: 200,
                 height: 20,
                 color: '#3E2723',
                 type: 'branch',
                 biome: level.biome,
                 stability: 999
            });
        }
        return;
    }

    const biome = level.biome;
    const difficulty = level.difficulty;
    const isTutorial = level.tutorialType === 'BASIC';
    const isL2Tutorial = level.tutorialType === 'ADVANCED';

    if (biome !== currentBiome) setCurrentBiome(biome);

    const isSwamp = biome === 'SWAMP';
    const isWinter = biome === 'WINTER';
    const isVolcano = biome === 'VOLCANO';
    const isCave = biome === 'CAVE';
    
    // Terrain Height Variation
    const baseHeight = CANVAS_HEIGHT - 150;
    const heightVar = Math.sin(startX * 0.003) * 100; 
    const treeHeight = baseHeight + heightVar + randomRange(-30, 30);
    const treeX = startX + randomRange(20, 100);

    // CAVE CEILINGS & WEBS
    if (isCave && Math.random() < 0.6) {
        // Stalactites hanging from top
        const stalactiteY = -50;
        entities.current.push({
            id: `stalactite-${startX}`,
            position: { x: treeX, y: stalactiteY },
            width: 40, 
            height: randomRange(200, 400),
            color: '#546E7A',
            type: 'stalactite', // Treated as tree for grappling
            biome,
            polyPoints: createTreePoly(treeX, 0, 'CAVE') // Reused poly function but for ceiling
        });

        // STICKY WEBS (Hazards)
        if (Math.random() < 0.4) {
            entities.current.push({
                id: `sticky-web-${startX}`,
                position: { x: treeX + 40, y: stalactiteY + 150 },
                width: 100,
                height: 100,
                color: 'rgba(255, 255, 255, 0.3)',
                type: 'web',
                biome
            });
        }
    }

    if (Math.random() < 0.4 && !isTutorial && !isCave) {
        entities.current.push({
            id: `updraft-${startX}`,
            position: { x: startX, y: CANVAS_HEIGHT + 600 },
            width: 80,
            height: 800,
            color: 'rgba(255,255,255,0.1)',
            type: 'updraft',
            biome
        });
    }

    // SWAMP FEATURES: Water Pockets & Waterfalls
    if (isSwamp && Math.random() < 0.3) {
        if (Math.random() > 0.5) {
            // Waterfall
            entities.current.push({
                id: `waterfall-${startX}`,
                position: { x: startX + 100, y: -500 }, // Starts high
                width: 60,
                height: 1500, // Very tall
                color: 'rgba(33, 150, 243, 0.4)',
                type: 'waterfall',
                biome
            });
        } else {
            // Water Pocket (Square)
            const size = randomRange(80, 120);
            entities.current.push({
                id: `water_pocket-${startX}`,
                position: { x: startX + 100, y: CANVAS_HEIGHT - 400 - Math.random() * 200 },
                width: size,
                height: size,
                color: 'rgba(1, 87, 155, 0.7)', // Deep blue
                type: 'water_pocket',
                biome
            });
        }
    }

    // WATER / LAVA GENERATION
    let liquidChance = 0.3;
    if (isSwamp) liquidChance = 0.8; // High chance in lake levels
    if (level.id === 6) liquidChance = 0.9; // Lava Lake level
    
    if ((isSwamp || isVolcano) && Math.random() < liquidChance) {
        entities.current.push({
            id: `fluid-${startX}`,
            position: { x: startX, y: CANVAS_HEIGHT - 40 },
            width: randomRange(150, 400), // Wider lakes
            height: 40,
            color: isVolcano ? '#D32F2F' : '#2E7D32',
            type: isVolcano ? 'lava' : 'lake',
            biome
        });

        // Add biome-specific floating platforms
        if (isSwamp && Math.random() < 0.5) {
            entities.current.push({
                id: `lily-${startX}`,
                position: { x: startX + randomRange(50, 100), y: CANVAS_HEIGHT - 45 },
                width: 60, height: 10,
                color: '#81C784',
                type: 'lilypad',
                biome
            });
        }
        if (isVolcano && Math.random() < 0.4) {
             entities.current.push({
                id: `magma-rock-${startX}`,
                position: { x: startX + randomRange(20, 100), y: CANVAS_HEIGHT - 45 },
                width: 50, height: 15,
                color: '#5D4037',
                type: 'branch', // Treat as branch for logic
                biome,
                stability: 60 // Crumbles faster
            });
        }
    }
    
    if (!isCave) {
        let trunkColor = '#3E2723';
        if (isWinter) trunkColor = '#5D4037';
        if (isVolcano) trunkColor = '#212121';

        entities.current.push({
          id: `trunk-${startX}`,
          position: { x: treeX - 15, y: CANVAS_HEIGHT - treeHeight },
          width: 30,
          height: treeHeight + 3000, 
          color: trunkColor,
          type: 'tree',
          health: 100,
          biome
        });

        let canopyColor = BIOMES[biome].treeColor;
        if (biome === 'AUTUMN') canopyColor = Math.random() > 0.5 ? '#D84315' : '#FFAB91';
        if (isVolcano) canopyColor = Math.random() > 0.7 ? '#4E342E' : '#3E2723';

        const canopyY = CANVAS_HEIGHT - treeHeight - 80;
        entities.current.push({
          id: `canopy-${startX}`,
          position: { x: treeX - 60, y: canopyY },
          width: 120,
          height: 120,
          color: canopyColor,
          type: 'tree',
          polyPoints: createTreePoly(treeX, CANVAS_HEIGHT - treeHeight + 40, biome),
          health: 100,
          biome
        });
        
        if (Math.random() < 0.3) {
            const vineLen = randomRange(150, 300);
            entities.current.push({
                id: `vine-${startX}`,
                position: { x: treeX + randomRange(-40, 40), y: canopyY + 80 },
                width: 4,
                height: vineLen,
                color: '#4CAF50',
                type: 'vine',
                biome
            });
        }
    }

    // BRANCH GENERATION
    // JUNGLE: Increase Vertical Range & Count for Forest
    let numBranches = isTutorial ? 5 : Math.floor(randomRange(3, 6));
    if (currentBiome === 'JUNGLE') {
        numBranches = Math.floor(randomRange(6, 9)); // Denser forest
    }
    if (isL2Tutorial) {
        const distMeters = startX / 20;
        if (distMeters > 200 && distMeters < 400) numBranches = 5; 
    }
    if (isCave || isSwamp) numBranches += 1;
    
    const branchSpread = currentBiome === 'JUNGLE' ? 600 : 200; // Even taller for jungle

    // LAST CHANCE LOW BRANCH (Jungle/Swamp only)
    if ((currentBiome === 'JUNGLE' || currentBiome === 'SWAMP') && Math.random() < 0.4 && !isTutorial) {
        const lowBranchY = CANVAS_HEIGHT - 150; // Just above void death range
        entities.current.push({
             id: `low-branch-${startX}`,
             position: { x: treeX + (Math.random() > 0.5 ? 20 : -100), y: lowBranchY },
             width: 100,
             height: 15,
             color: '#5D4037',
             type: 'branch',
             biome,
             stability: 60, 
             isBroken: false
         });
    }

    for (let b = 0; b < numBranches; b++) {
         const depthLevel = b * (branchSpread / numBranches); // Distribute over the spread
         const branchY = CANVAS_HEIGHT - treeHeight + 20 + depthLevel + randomRange(-30, 30);
         const dir = Math.random() > 0.5 ? 1 : -1;
         const branchW = randomRange(80, 150);
         const branchX = treeX + (dir === 1 ? 15 : -branchW + 15); 
         const branchId = `branch-${startX}-${b}`;
         
         if (branchY > CANVAS_HEIGHT - 50) continue;

         entities.current.push({
             id: branchId,
             position: { x: branchX, y: branchY },
             width: branchW,
             height: 15,
             color: isVolcano ? '#333' : (isWinter ? '#455A64' : '#4E342E'),
             type: 'branch',
             biome,
             stability: isTutorial ? 999 : 40, 
             isBroken: false
         });

         // JUNGLE FLOWER VISUALS
         if (currentBiome === 'JUNGLE' && Math.random() < 0.3) {
             entities.current.push({
                 id: `flower-${branchId}`,
                 position: { x: branchX + randomRange(10, branchW-10), y: branchY - 10 },
                 width: 10, height: 10,
                 color: Math.random() > 0.5 ? '#E91E63' : '#9C27B0',
                 type: 'flower',
                 biome
             });
         }
         
         // JUNGLE NESTS (Rare)
         if (currentBiome === 'JUNGLE' && Math.random() < 0.1 && b < 2) { // Only high branches
             entities.current.push({
                 id: `nest-${branchId}`,
                 position: { x: branchX + branchW/2 - 15, y: branchY - 15 },
                 width: 30, height: 15,
                 color: '#795548',
                 type: 'nest',
                 biome
             });
         }
    }

    // ENEMY SPAWNING REWORK
    const spawnChance = Math.min(0.9, 0.2 + difficulty * 0.1); 
    // Explicitly allow spawning in Jungle now for birds
    if ((Math.random() < spawnChance && startX > 500 && !isTutorial) || (currentBiome === 'JUNGLE' && Math.random() < 0.3 && !isTutorial)) {
      const allowed = currentBiome === 'JUNGLE' ? ['bird'] : level.allowedEnemies;
      if (allowed.length === 0 && currentBiome !== 'JUNGLE') return;
      
      const count = difficulty > 5 && Math.random() < 0.4 ? 2 : 1; 

      for(let i=0; i<count; i++) {
        let enemyType = allowed[Math.floor(Math.random() * allowed.length)];
        // Forest specific birds
        if (currentBiome === 'JUNGLE') enemyType = 'bird';

        let pos = { x: startX + randomRange(100, 300) + (i*50), y: randomRange(100, 400) };
        let vel = { x: -2, y: 0 };
        let anchorX = 0;

        if (isL2Tutorial) {
            const distMeters = startX / 20;
            if (distMeters > 500 && distMeters < 600) {
                enemyType = 'bird';
                pos.y = CANVAS_HEIGHT - 300; 
            } else {
                continue; 
            }
        }

        if (enemyType === 'spider') {
            pos.x = treeX + (i*30);
            pos.y = CANVAS_HEIGHT - treeHeight + randomRange(300, 700);
            vel.y = 1;
            if (i===0) { 
                entities.current.push({
                    id: `web-${startX}`,
                    position: { x: pos.x - 70, y: pos.y + 50 },
                    width: 140,
                    height: 140,
                    color: 'rgba(255,255,255,0.4)',
                    type: 'web',
                    biome
                });
            }
        } else if (enemyType === 'eagle' || enemyType === 'bird') {
            pos.y = randomRange(40, 300); 
            vel.x = enemyType === 'eagle' ? -3 : -2;
        } else if (enemyType === 'troll') {
            // Trolls hang from ceiling in caves
            pos.x = startX + randomRange(100, 300);
            pos.y = 200; // Hanging down
            anchorX = pos.x; // Pivot point
        } else if (enemyType === 'bat') {
            // Bats in swarms, moving fast
             pos.y = randomRange(50, 200);
             vel.x = -4; 
             vel.y = 2; // Start downward for wave
        } else if (enemyType === 'slug') {
             // Slugs spawn ON branches
             const branch = entities.current.find(e => e.type === 'branch' && e.position.x > startX);
             if (branch) {
                 pos.x = branch.position.x + 10;
                 pos.y = branch.position.y - 20; // Sit on top
                 vel.x = 0.5; // Crawl
                 vel.y = 0;
             } else {
                 continue; // Skip if no branch found
             }
        }

        enemies.current.push({
            id: `enemy-${startX}-${i}`,
            position: pos,
            velocity: vel,
            width: enemyType === 'eagle' ? 80 : (enemyType === 'troll' ? 50 : 35),
            height: enemyType === 'eagle' ? 40 : (enemyType === 'troll' ? 60 : 35),
            color: '#000',
            type: 'enemy',
            enemyType: enemyType,
            health: 1,
            anchorY: pos.y, 
            anchorX: anchorX,
            swingAngle: 0,
            state: 0,
            attackTimer: 0,
            biome
        });
      }
    }
  };

  const getEnemyColor = (type: string) => {
      switch(type) {
          case 'bird': return '#C62828';
          case 'snake': return '#4A148C';
          case 'spider': return '#212121';
          case 'crocodile': return '#33691E';
          case 'bonus_bird': return '#FFD700';
          case 'bat': return '#263238';
          case 'eagle': return '#5D4037';
          case 'slug': return '#795548';
          case 'troll': return '#33691E';
          default: return '#000';
      }
  }

  const startGame = (levelId: number) => {
    setSelectedLevelId(levelId);
    monkey.current = {
      position: { x: 200, y: 300 },
      velocity: { x: 8, y: -5 },
      width: 30,
      height: 30,
      rotation: 0,
      isSwinging: false,
      tetherPoint: null,
      ropeLength: 0,
      speedBuff: 0,
      armorStack: saveData.upgrades.armor,
      eyeOffset: { x: 0, y: 0 },
      feverTime: 0,
      isFever: false,
      runLevel: 0,
      fallTimer: 0,
      runRopeBonus: 0,
      runForceBonus: 0,
      trail: [],
      lives: MAX_LIVES,
      invulnerableTime: 0,
      freezeTime: 0,
      jumpCooldown: 0,
      swingStartAngle: 0,
      totalRotation: 0,
      lastLoopTime: 0,
      hasSurged: false,
      overdriveTimer: 0,
      justDidLoop: false,
      inFog: false,
      hasUsedNet: false,
      ropeTimer: ROPE_BREAK_TIME_SECONDS
    };
    skillChain.current = { active: false, currentScore: 0, multiplier: BASE_MULTIPLIER, events: [], timer: 0, rank: 'GROOVIN' };
    setSkillChainUI(skillChain.current);
    entities.current = [];
    enemies.current = [];
    particles.current = [];
    floatingTexts.current = [];
    cameraOffset.current = { x: 0, y: 0 };
    setScore(0);
    setDistance(0);
    setRunTokens(0);
    setCooldowns({ [AbilityType.PUNCH]: 0, [AbilityType.LASER]: 0, [AbilityType.BANANA]: 0, [AbilityType.SLOW_MO]: 0 });
    setActiveAbility(null);
    
    const config = LEVELS[levelId - 1];
    setCurrentBiome(config.biome);
    setSkyColorCurrent(BIOMES[config.biome].skyColors);
    
    if (config.tutorialType === 'BASIC') {
        setTutorial({ active: true, currentStep: 'WELCOME', showBox: true, message: "Welcome to the Jungle! Use 'A' and 'D' to swing." });
    } else if (config.tutorialType === 'ADVANCED') {
        setTutorial({ active: true, currentStep: 'L2_INTRO', showBox: true, message: "Level 2: Dangers Ahead! Swing FAST to survive.", timer: 180 });
    } else {
        setTutorial({ active: false, currentStep: 'COMPLETED', showBox: false, message: "" });
    }

    setIsPaused(false);
    setFallTimerDisplay(null);
    setIsInvincible(false);
    setPlayerLives(MAX_LIVES);
    setWeather({ type: config.allowedWeather[0], timer: 1000 });
    generateBackground();
    smartTargetRef.current = null;
    
    const spawnRate = config.tutorialType !== 'NONE' ? 250 : SPAWN_RATE_BASE; 
    for (let i = 0; i < 8; i++) {
      spawnLevelSegment(i * spawnRate + 400);
    }
    
    setGameState(GameState.PLAYING);
  };

  const drawMapLobby = (ctx: CanvasRenderingContext2D) => {
     // 1. Base Map Background (Dark Parchment / World Map)
     ctx.fillStyle = "#263238"; // Dark Slate Map Color
     ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

     // 2. Soft Ambient Biome Glows (Not hard stripes)
     // Elven Glow (Left)
     const g1 = ctx.createRadialGradient(CANVAS_WIDTH*0.15, CANVAS_HEIGHT*0.7, 50, CANVAS_WIDTH*0.15, CANVAS_HEIGHT*0.7, 400);
     g1.addColorStop(0, "rgba(27, 94, 32, 0.4)");
     g1.addColorStop(1, "rgba(27, 94, 32, 0)");
     ctx.fillStyle = g1; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

     // Lake Glow (Middle)
     const g2 = ctx.createRadialGradient(CANVAS_WIDTH*0.4, CANVAS_HEIGHT*0.5, 50, CANVAS_WIDTH*0.4, CANVAS_HEIGHT*0.5, 300);
     g2.addColorStop(0, "rgba(2, 119, 189, 0.4)");
     g2.addColorStop(1, "rgba(2, 119, 189, 0)");
     ctx.fillStyle = g2; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

     // Volcano Glow (Right)
     const g3 = ctx.createRadialGradient(CANVAS_WIDTH*0.85, CANVAS_HEIGHT*0.2, 50, CANVAS_WIDTH*0.85, CANVAS_HEIGHT*0.2, 500);
     g3.addColorStop(0, "rgba(191, 54, 12, 0.5)");
     g3.addColorStop(1, "rgba(191, 54, 12, 0)");
     ctx.fillStyle = g3; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

     // 3. Draw Contour Lines (Map feel)
     ctx.strokeStyle = "rgba(255,255,255,0.05)";
     ctx.lineWidth = 2;
     for(let i=0; i<5; i++) {
         ctx.beginPath();
         ctx.moveTo(0, CANVAS_HEIGHT - i*150);
         ctx.bezierCurveTo(CANVAS_WIDTH/3, CANVAS_HEIGHT - i*150 - 100, CANVAS_WIDTH*2/3, CANVAS_HEIGHT - i*150 + 100, CANVAS_WIDTH, CANVAS_HEIGHT - i*150);
         ctx.stroke();
     }

     // 4. Props
     mapPropsRef.current.forEach(prop => {
         const { x, y, type, scale } = prop;
         ctx.save();
         ctx.translate(x, y);
         ctx.scale(scale, scale);
         
         if (type === 'tree' || type === 'pine') {
             ctx.fillStyle = type === 'tree' ? '#2E7D32' : '#1B5E20';
             ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(15, 0); ctx.lineTo(-15, 0); ctx.fill();
             if (type === 'tree') {
                ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(12, -20); ctx.lineTo(-12, -20); ctx.fill();
             }
         } else if (type === 'wave') {
             ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 3;
             ctx.beginPath(); ctx.arc(-10, 0, 10, 0, Math.PI, true); ctx.arc(10, 0, 10, 0, Math.PI, false); ctx.stroke();
         } else if (type === 'cave') {
             ctx.fillStyle = "#212121";
             ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI, 0); ctx.fill();
         } else if (type === 'mountain') {
             ctx.fillStyle = '#3E2723'; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(30, 20); ctx.lineTo(-30, 20); ctx.fill();
             ctx.fillStyle = '#FF5722'; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(8, -25); ctx.lineTo(-8, -25); ctx.fill(); // Lava cap
         } else if (type === 'rock') {
             ctx.fillStyle = '#455A64'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI, true); ctx.fill();
         }
         ctx.restore();
     });

     // 5. Map Text Labels
     ctx.save();
     ctx.fillStyle = "rgba(255,255,255,0.15)";
     ctx.font = "bold 40px 'VT323'";
     ctx.textAlign = "center";
     ctx.translate(CANVAS_WIDTH*0.2, CANVAS_HEIGHT*0.8);
     ctx.rotate(-0.1);
     ctx.fillText("ELVEN KINGDOM", 0, 0);
     ctx.restore();

     ctx.save();
     ctx.fillStyle = "rgba(255,255,255,0.15)";
     ctx.font = "bold 40px 'VT323'";
     ctx.textAlign = "center";
     ctx.translate(CANVAS_WIDTH*0.5, CANVAS_HEIGHT*0.6);
     ctx.rotate(0.1);
     ctx.fillText("GREAT LAKE", 0, 0);
     ctx.restore();

     ctx.save();
     ctx.fillStyle = "rgba(255,255,255,0.15)";
     ctx.font = "bold 40px 'VT323'";
     ctx.textAlign = "center";
     ctx.translate(CANVAS_WIDTH*0.65, CANVAS_HEIGHT*0.4);
     ctx.rotate(-0.15);
     ctx.fillText("TROLL VALLEY", 0, 0);
     ctx.restore();

     ctx.save();
     ctx.fillStyle = "rgba(255,255,255,0.15)";
     ctx.font = "bold 40px 'VT323'";
     ctx.textAlign = "center";
     ctx.translate(CANVAS_WIDTH*0.85, CANVAS_HEIGHT*0.25);
     ctx.rotate(0.1);
     ctx.fillText("MT. DOOM", 0, 0);
     ctx.restore();


     // 6. Path
     ctx.strokeStyle = "rgba(255,255,255,0.5)";
     ctx.lineWidth = 4;
     ctx.setLineDash([15, 10]);
     ctx.beginPath();
     LEVELS.forEach((level, i) => {
         const x = 100 + (i * (CANVAS_WIDTH - 200) / (LEVELS.length - 1));
         const y = CANVAS_HEIGHT - 100 - (i * (CANVAS_HEIGHT - 150) / (LEVELS.length - 1)) + Math.sin(i * 1.5) * 50;
         if (i === 0) ctx.moveTo(x, y);
         else ctx.lineTo(x,y);
     });
     ctx.stroke();
     ctx.setLineDash([]);

     // 7. Nodes
     LEVELS.forEach((level, i) => {
         const x = 100 + (i * (CANVAS_WIDTH - 200) / (LEVELS.length - 1));
         const y = CANVAS_HEIGHT - 100 - (i * (CANVAS_HEIGHT - 150) / (LEVELS.length - 1)) + Math.sin(i * 1.5) * 50;
         const isLocked = level.id > saveData.maxLevelReached;
         const isCurrent = level.id === saveData.maxLevelReached;
         
         ctx.beginPath();
         const radius = isCurrent ? 25 + Math.sin(Date.now() * 0.005)*3 : 20;
         ctx.arc(x, y, radius, 0, Math.PI * 2);
         
         // Biome specific coloring
         let nodeColor = "#546E7A"; // Locked
         if (!isLocked) {
             const biomeConfig = BIOMES[level.biome];
             nodeColor = biomeConfig.treeColor;
             if (level.biome === 'SWAMP') nodeColor = '#0288D1';
             if (level.biome === 'VOLCANO') nodeColor = '#D84315';
             if (level.biome === 'CAVE') nodeColor = '#424242';
             if (level.id <= 2) nodeColor = '#66BB6A'; // Elven
         }
         
         ctx.fillStyle = nodeColor;
         ctx.fill();
         ctx.lineWidth = 4;
         ctx.strokeStyle = isCurrent ? "#FFF" : "rgba(0,0,0,0.5)";
         ctx.stroke();
         
         if (isCurrent) {
             const bounceY = y - 40 + Math.sin(Date.now() * 0.01) * 10;
             ctx.fillStyle = "#795548";
             ctx.fillRect(x - 15, bounceY - 15, 30, 30); // Monkey head
             ctx.fillStyle = "#FFECB3";
             ctx.fillRect(x - 10, bounceY - 5, 20, 10);
             ctx.fillStyle = "#000";
             ctx.fillRect(x - 8, bounceY - 2, 4, 4);
             ctx.fillRect(x + 4, bounceY - 2, 4, 4);
         }
     });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
     if (gameState === GameState.MENU) {
         drawMapLobby(ctx);
         return;
     }

     const config = BIOMES[currentBiome];
    const targetSky = config.skyColors;
    
    // Slowed down transition
    const lerpFactor = 0.005;
    const c1 = lerpColor(skyColorCurrent[0], targetSky[0], lerpFactor);
    const c2 = lerpColor(skyColorCurrent[1], targetSky[1], lerpFactor);
    if (c1 !== skyColorCurrent[0]) setSkyColorCurrent([c1, c2]);

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, skyColorCurrent[0]);
    gradient.addColorStop(1, skyColorCurrent[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    bgLayers.current.forEach(layer => {
        const parallaxX = (layer.x - cameraOffset.current.x * layer.speed) % 2000;
        const drawX = parallaxX < -100 ? parallaxX + 2000 : parallaxX;
        ctx.fillStyle = layer.color;
        
        // Depth of field - Blur further layers
        if (layer.speed < 0.08) {
            ctx.filter = 'blur(2px)';
            ctx.globalAlpha = 0.8;
        } else {
            ctx.filter = 'none';
            ctx.globalAlpha = 1.0;
        }

        if (layer.type === 0) { 
            ctx.beginPath();
            ctx.arc(drawX, layer.y - cameraOffset.current.y * 0.1, layer.size * 100, 0, Math.PI * 2);
            ctx.fill();
        } else if (layer.type === 3) {
            const sway = Math.sin(Date.now() * 0.001 + layer.shapeVar!) * 5;
            const w = layer.size * 20;
            const h = layer.size * 150;
            ctx.beginPath();
            ctx.moveTo(drawX, layer.y + 100);
            ctx.lineTo(drawX + sway, layer.y - h);
            ctx.lineTo(drawX + w, layer.y + 100);
            ctx.fill();
        } else if (layer.type === 1) {
             ctx.fillRect(drawX, layer.y, 2, layer.size);
        } else if (layer.type === 2) { 
            ctx.beginPath();
            ctx.ellipse(drawX, layer.y, 40 * layer.size, 20 * layer.size, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;

    const sx = (Math.random() - 0.5) * shakeIntensity.current;
    const sy = (Math.random() - 0.5) * shakeIntensity.current;
    ctx.save();
    ctx.translate(-cameraOffset.current.x + sx, -cameraOffset.current.y + sy);

    entities.current.forEach(entity => {
      if (entity.type === 'portal') {
          const pulsate = Math.sin(Date.now() * 0.005) * 10;
          const gradient = ctx.createRadialGradient(
              entity.position.x + entity.width/2, entity.position.y + entity.height/2, 20,
              entity.position.x + entity.width/2, entity.position.y + entity.height/2, 120 + pulsate
          );
          gradient.addColorStop(0, '#FFFFFF');
          gradient.addColorStop(0.5, '#00E676');
          gradient.addColorStop(1, 'rgba(0, 230, 118, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(entity.position.x - 50, entity.position.y - 50, entity.width + 100, entity.height + 100);
          ctx.strokeStyle = "#FFF";
          ctx.lineWidth = 5;
          ctx.strokeRect(entity.position.x, entity.position.y, entity.width, entity.height);
          return;
      }
      if (entity.type === 'tree' || entity.type === 'coin' || entity.type === 'branch' || entity.type === 'stalactite') {
        if (entity.type === 'branch' && entity.isBroken && entity.angle) {
             ctx.save();
             ctx.translate(entity.position.x + entity.width/2, entity.position.y + entity.height/2);
             ctx.rotate(entity.angle);
             ctx.fillStyle = entity.color;
             ctx.fillRect(-entity.width/2, -entity.height/2, entity.width, entity.height);
             ctx.restore();
             return;
        }
        if (entity.type === 'branch' && entity.stability !== undefined && entity.stability < 20) {
             const wobble = Math.sin(Date.now() * 0.5) * 2;
             ctx.fillStyle = entity.color;
             ctx.fillRect(entity.position.x, entity.position.y + wobble, entity.width, entity.height);
             return;
        }
        if (entity.polyPoints) {
            drawPoly(ctx, entity.polyPoints, entity.color);
        } else {
            ctx.fillStyle = entity.color;
            ctx.fillRect(entity.position.x, entity.position.y, entity.width, entity.height);
        }
      } else if (entity.type === 'vine') {
          ctx.strokeStyle = entity.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(entity.position.x, entity.position.y);
          ctx.quadraticCurveTo(
              entity.position.x + Math.sin(Date.now() * 0.003 + entity.position.x)*20, 
              entity.position.y + entity.height/2, 
              entity.position.x, 
              entity.position.y + entity.height
          );
          ctx.stroke();
      } else if (entity.type === 'web') {
          ctx.strokeStyle = entity.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          // Spider web pattern
          const cx = entity.position.x + entity.width/2;
          const cy = entity.position.y + entity.height/2;
          for(let r=0; r<entity.width/2; r+=15) {
               ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
          }
          for(let a=0; a<Math.PI*2; a+=Math.PI/4) {
               ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a)*entity.width/2, cy + Math.sin(a)*entity.height/2); ctx.stroke();
          }
      } else if (entity.type === 'lilypad') {
           ctx.fillStyle = entity.color;
           ctx.beginPath();
           const lx = entity.position.x + entity.width/2;
           const ly = entity.position.y + entity.height/2;
           ctx.ellipse(lx, ly, entity.width/2, entity.height/2, 0, 0, Math.PI * 2);
           ctx.fill();
           // Pacman cutout detail
           ctx.globalCompositeOperation = 'destination-out';
           ctx.beginPath();
           ctx.moveTo(lx, ly);
           ctx.arc(lx, ly, entity.width/2 + 2, 0, 0.5);
           ctx.fill();
           ctx.globalCompositeOperation = 'source-over';
      } else if (entity.type === 'flower') {
          ctx.fillStyle = entity.color;
          ctx.beginPath();
          ctx.arc(entity.position.x + 5, entity.position.y + 5, 5, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = "#FFEB3B"; 
          ctx.beginPath();
          ctx.arc(entity.position.x + 5, entity.position.y + 5, 2, 0, Math.PI*2);
          ctx.fill();
      } else if (entity.type === 'projectile') {
          ctx.fillStyle = entity.color;
          ctx.beginPath();
          ctx.ellipse(entity.position.x + entity.width/2, entity.position.y + entity.height/2, entity.width/2, entity.height/1.5, 0, 0, Math.PI*2);
          ctx.fill();
      } else if (entity.type === 'apple') {
          ctx.fillStyle = entity.color;
          ctx.beginPath();
          ctx.arc(entity.position.x + 10, entity.position.y + 10, 8, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = "#4CAF50"; 
          ctx.fillRect(entity.position.x + 10, entity.position.y, 4, -6);
      } else if (entity.type === 'mushroom') {
          ctx.fillStyle = "#FFF"; 
          ctx.fillRect(entity.position.x + 10, entity.position.y + 10, 10, 10);
          ctx.fillStyle = entity.color; 
          ctx.beginPath();
          ctx.arc(entity.position.x + 15, entity.position.y + 10, 15, Math.PI, 0);
          ctx.fill();
      } else if (entity.type === 'nest') {
          ctx.fillStyle = entity.color;
          ctx.beginPath();
          ctx.arc(entity.position.x + 15, entity.position.y + 15, 15, 0, Math.PI, false);
          ctx.fill();
          // Eggs
          ctx.fillStyle = "#FFF";
          ctx.beginPath(); ctx.ellipse(entity.position.x + 10, entity.position.y + 18, 4, 5, 0.2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(entity.position.x + 20, entity.position.y + 18, 4, 5, -0.2, 0, Math.PI*2); ctx.fill();
      } else if (entity.type === 'waterfall') {
          ctx.fillStyle = entity.color;
          ctx.fillRect(entity.position.x, entity.position.y, entity.width, entity.height);
          // Flow lines
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.beginPath();
          const offset = (Date.now() * 0.2) % 20;
          for(let i=0; i<entity.width; i+=10) {
              ctx.moveTo(entity.position.x + i, entity.position.y + offset);
              ctx.lineTo(entity.position.x + i, entity.position.y + entity.height);
          }
          ctx.stroke();
      } else if (entity.type === 'water_pocket') {
          // Draw Square Body
          ctx.fillStyle = entity.color;
          ctx.strokeStyle = "rgba(129, 212, 250, 0.5)";
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.rect(entity.position.x, entity.position.y, entity.width, entity.height);
          ctx.fill();
          ctx.stroke();

          // Internal Bubbles
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          // Deterministic bubbles based on time and position
          for(let i=0; i<5; i++) {
              const seed = i * 1337;
              const bx = entity.position.x + ((Date.now() * 0.02 + seed) % entity.width);
              const by = entity.position.y + entity.height - ((Date.now() * 0.05 + seed) % entity.height);
              
              ctx.beginPath();
              ctx.arc(bx, by, 3, 0, Math.PI * 2);
              ctx.fill();
          }
      } else {
        ctx.fillStyle = entity.color;
        ctx.fillRect(entity.position.x, entity.position.y, entity.width, entity.height);
      }
    });
    
    enemies.current.forEach(enemy => {
        const cx = enemy.position.x + enemy.width/2;
        const cy = enemy.position.y + enemy.height/2;
        ctx.fillStyle = enemy.color;
        if (enemy.enemyType === 'eagle' || enemy.enemyType === 'bird') {
             ctx.beginPath(); ctx.ellipse(cx, cy, enemy.width/3, enemy.height/2, 0, 0, Math.PI*2); ctx.fill();
             const wingY = cy - Math.sin(Date.now() * 0.02) * 20; // Flapping
             const wingXOffset = enemy.width/2 + 10;
             ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.quadraticCurveTo(cx - 20, wingY, cx - wingXOffset, cy - 10); ctx.lineTo(cx - 5, cy + 5); ctx.fill();
             ctx.beginPath(); ctx.moveTo(cx + 5, cy); ctx.quadraticCurveTo(cx + 20, wingY, cx + wingXOffset, cy - 10); ctx.lineTo(cx + 5, cy + 5); ctx.fill();
        } else if (enemy.enemyType === 'spider') {
             // Web Thread
             if (enemy.anchorY !== undefined) {
                ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, enemy.anchorY); ctx.stroke();
             }
             ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.fill();
             // Eyes
             ctx.fillStyle = "red"; ctx.fillRect(cx-4, cy-2, 2, 2); ctx.fillRect(cx+2, cy-2, 2, 2);
        } else if (enemy.enemyType === 'troll') {
             // Vine
             if (enemy.anchorY !== undefined && enemy.anchorX !== undefined) {
                 ctx.strokeStyle = "#558B2F"; ctx.lineWidth = 3;
                 ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(enemy.anchorX, 200); ctx.stroke();
             }
             // Troll Body
             ctx.fillStyle = "#33691E";
             ctx.fillRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height);
             // Club
             ctx.fillStyle = "#5D4037";
             ctx.save();
             ctx.translate(cx + 20, cy);
             ctx.rotate(Math.sin(Date.now()*0.01));
             ctx.fillRect(0, -5, 40, 10);
             ctx.restore();
             // Eyes
             ctx.fillStyle = "red"; ctx.fillRect(cx-10, cy-10, 5, 5); ctx.fillRect(cx+5, cy-10, 5, 5);
        } else if (enemy.enemyType === 'bat') {
             // Bat Visuals
             ctx.fillStyle = "#263238";
             ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2); ctx.fill();
             // Wings
             const flap = Math.sin(Date.now() * 0.05) * 10;
             ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx-20, cy-flap); ctx.lineTo(cx-10, cy+10); ctx.fill();
             ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+20, cy-flap); ctx.lineTo(cx+10, cy+10); ctx.fill();
             ctx.fillStyle = "white"; ctx.fillRect(cx-4, cy-2, 2, 2); ctx.fillRect(cx+2, cy-2, 2, 2);
        } else {
             ctx.fillRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height);
        }
    });

    const player = monkey.current;
    
    if (player.isSwinging && player.tetherPoint) {
      // Rope stress visuals
      const isStressed = player.ropeTimer < 3.0 && saveData.upgrades.ropeLength < 5; // Start showing stress earlier
      const isCritical = player.ropeTimer < 1.0;
      
      // Flash red/white if breaking
      const flash = Math.floor(Date.now() / 50) % 2 === 0;
      ctx.strokeStyle = isStressed 
          ? (flash ? (isCritical ? '#FF0000' : '#FF5252') : '#FFF') 
          : '#5D4037';
      ctx.lineWidth = 4;
      
      let anchorX = player.tetherPoint.x;
      let anchorY = player.tetherPoint.y;

      // DYNAMIC LOOSENING ANIMATION
      if (isStressed) {
          const slipAmount = (3.0 - player.ropeTimer) * 4; 
          anchorX += (Math.random() - 0.5) * slipAmount;
          anchorY += (Math.random() - 0.5) * slipAmount;
      }

      // IMPROVED ROPE PHYSICS ANIMATION (Slack vs Taut)
      const currentDist = Math.hypot(anchorX - (player.position.x+15), anchorY - (player.position.y+15));
      const maxLen = player.ropeLength;
      
      ctx.beginPath();
      const shakeX = isCritical ? (Math.random() - 0.5) * 8 : 0;
      ctx.moveTo(player.position.x + 15 + shakeX, player.position.y + 15);
      
      if (currentDist < maxLen - 10) {
          // SLACK: Curve naturally
          // Calculate midpoint that sags
          const midX = (player.position.x + 15 + anchorX) / 2;
          const midY = (player.position.y + 15 + anchorY) / 2;
          const sagAmount = (maxLen - currentDist) * 0.8; // How much it droops
          
          // Only sag if Y is below anchor, gravity pulls rope down
          ctx.quadraticCurveTo(midX, midY + sagAmount, anchorX, anchorY);
      } else {
         // TAUT: Straight line (snapped)
         ctx.lineTo(anchorX, anchorY);
      }
      ctx.stroke();

      if (isStressed) {
          // Spawn little fiber particles
          if (Math.random() < 0.3) {
             const px = anchorX + (player.position.x - anchorX) * 0.1; 
             const py = anchorY + (player.position.y - anchorY) * 0.1;
             spawnParticles(px, py, "#8D6E63", 1, 1);
          }
      }
    }

    // TUTORIAL HINTS - DRAWING
    if (tutorial.active && tutorial.showBox) {
        if ((tutorial.currentStep === 'MOMENTUM' || tutorial.currentStep === 'L2_MOMENTUM') && player.isSwinging) {
            const isMovingRight = player.velocity.x > 0;
            const hintKey = isMovingRight ? 'D' : 'A';
            const hintX = player.position.x + (isMovingRight ? 60 : -60);
            
            ctx.save();
            ctx.translate(hintX, player.position.y);
            // Draw Key
            ctx.fillStyle = "#FFF";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.fillRect(-15, -15, 30, 30);
            ctx.strokeRect(-15, -15, 30, 30);
            ctx.fillStyle = "#000";
            ctx.font = "bold 20px 'VT323'";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(hintKey, 0, 0);
            
            // Pulse Ring
            const pulsate = (Math.sin(Date.now() * 0.01) + 1) * 0.5;
            ctx.strokeStyle = `rgba(255, 255, 255, ${pulsate})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // SPEED BAR
            const speed = Math.hypot(player.velocity.x, player.velocity.y);
            const maxTutorialSpeed = 22;
            const ratio = Math.min(speed / maxTutorialSpeed, 1);
            
            ctx.save();
            ctx.translate(player.position.x + 15, player.position.y + 60);
            ctx.fillStyle = "#333";
            ctx.fillRect(-30, 0, 60, 10);
            ctx.fillStyle = ratio > 0.8 ? "#00E676" : "#FFC107";
            ctx.fillRect(-28, 2, 56 * ratio, 6);
            ctx.strokeStyle = "#FFF";
            ctx.lineWidth = 1;
            ctx.strokeRect(-30, 0, 60, 10);
            ctx.restore();
        }
        
        if (tutorial.currentStep === 'GRAPPLE' && !player.isSwinging) {
             const tree = entities.current.find(e => e.type === 'tree' && e.position.x > player.position.x + 100);
             if (tree) {
                 const cx = tree.position.x + tree.width/2;
                 const cy = tree.position.y + tree.height/2;
                 ctx.save();
                 ctx.translate(cx, cy);
                 const bob = Math.sin(Date.now() * 0.01) * 10;
                 ctx.fillStyle = "rgba(255,255,0,0.5)";
                 ctx.beginPath();
                 ctx.arc(0, 0, 40 + bob, 0, Math.PI*2);
                 ctx.fill();
                 ctx.restore();
             }
        }
    }

    if (smartTargetRef.current && !player.isSwinging) {
        const t = smartTargetRef.current;
        let cx = t.position.x + t.width/2;
        let cy = t.position.y + t.height/2;
        if (t.angle) {
             cx = t.position.x + (t.width/2 * Math.cos(t.angle));
             cy = t.position.y + (t.width/2 * Math.sin(t.angle));
        }
        if (t.type === 'vine' || t.type === 'stalactite') {
             cx = t.position.x;
             const mouseWY = inputRef.current.mousePos.y + cameraOffset.current.y;
             cy = Math.max(t.position.y, Math.min(mouseWY, t.position.y + t.height));
        }
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Date.now() * 0.005);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
    }

    if (player.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(player.trail[0].x, player.trail[0].y);
        for(let i=1; i<player.trail.length; i++) ctx.lineTo(player.trail[i].x, player.trail[i].y);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 10;
        ctx.stroke();
    }

    ctx.save();
    ctx.translate(player.position.x + 15, player.position.y + 15);
    if (player.jumpCooldown > 0) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 3;
        ctx.arc(0, 0, 25, 0, Math.PI * 2 * (player.jumpCooldown / JUMP_COOLDOWN_FRAMES));
        ctx.stroke();
    }
    let visualRot = player.rotation;
    if (player.isSwinging) visualRot = player.rotation; 
    ctx.rotate(visualRot);
    ctx.fillStyle = player.freezeTime > 0 ? '#4FC3F7' : (player.isFever ? '#FFEB3B' : '#795548');
    
    if (saveData.equippedSkin === 'skin_cyber') ctx.fillStyle = '#00E5FF';
    else if (saveData.equippedSkin === 'skin_golden') ctx.fillStyle = '#FFD700';
    else if (saveData.equippedSkin === 'skin_winter') ctx.fillStyle = '#ECEFF1';
    else if (saveData.equippedSkin === 'skin_ninja') ctx.fillStyle = '#212121';
    
    if (isInvincible && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.fillRect(-15, -15, 30, 30);

    // --- ENHANCED FACIAL EXPRESSIONS ---
    const speed = Math.hypot(player.velocity.x, player.velocity.y);
    let faceState = 'NEUTRAL';
    if (player.invulnerableTime > 0) faceState = 'PAIN';
    else if ((player.ropeTimer < 1.0 && player.isSwinging) || (fallTimerDisplay && fallTimerDisplay > 0)) faceState = 'SCARED';
    else if (speed > 18 || player.isFever) faceState = 'EXCITED';

    // Eyes
    ctx.fillStyle = '#FFF';
    if (faceState === 'PAIN') {
        // X Eyes
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-12 + player.eyeOffset.x, -8); ctx.lineTo(-4 + player.eyeOffset.x, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4 + player.eyeOffset.x, -8); ctx.lineTo(-12 + player.eyeOffset.x, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4 + player.eyeOffset.x, -8); ctx.lineTo(12 + player.eyeOffset.x, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12 + player.eyeOffset.x, -8); ctx.lineTo(4 + player.eyeOffset.x, 0); ctx.stroke();
    } else if (faceState === 'SCARED') {
        // Wide Eyes
        ctx.fillRect(-11 + player.eyeOffset.x, -7 + player.eyeOffset.y, 10, 10);
        ctx.fillRect(1 + player.eyeOffset.x, -7 + player.eyeOffset.y, 10, 10);
        ctx.fillStyle = '#000';
        ctx.fillRect(-8 + player.eyeOffset.x, -4 + player.eyeOffset.y, 4, 4);
        ctx.fillRect(4 + player.eyeOffset.x, -4 + player.eyeOffset.y, 4, 4);
    } else {
        // Normal/Happy
        ctx.fillRect(-10 + player.eyeOffset.x, -5 + player.eyeOffset.y, 8, 8);
        ctx.fillRect(2 + player.eyeOffset.x, -5 + player.eyeOffset.y, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(-8 + player.eyeOffset.x, -3 + player.eyeOffset.y, 4, 4);
        ctx.fillRect(4 + player.eyeOffset.x, -3 + player.eyeOffset.y, 4, 4);
    }

    // Mouth
    ctx.fillStyle = '#3E2723'; // Dark brown mouth
    if (faceState === 'EXCITED') {
        ctx.beginPath(); ctx.arc(0, 5, 5, 0, Math.PI); ctx.fill(); // Open mouth
    } else if (faceState === 'SCARED') {
        ctx.beginPath(); ctx.ellipse(0, 6, 4, 2, 0, 0, Math.PI*2); ctx.fill(); // O mouth
    } else if (faceState === 'PAIN') {
        ctx.beginPath(); ctx.moveTo(-5, 6); ctx.bezierCurveTo(-2, 2, 2, 2, 5, 6); ctx.stroke(); // Frown
    } else {
        ctx.fillRect(-4, 5, 8, 2); // Neutral line
    }

    if (player.armorStack > 0) {
        ctx.strokeStyle = '#A1887F';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI*2);
        ctx.stroke();
    }
    if (player.freezeTime > 0) {
        ctx.fillStyle = "rgba(179, 229, 252, 0.5)";
        ctx.fillRect(-20, -20, 40, 40);
        ctx.strokeStyle = "#FFF";
        ctx.strokeRect(-20, -20, 40, 40);
    }
    if (saveData.equippedSkin === 'skin_ninja') {
        ctx.fillStyle = '#D50000';
        ctx.fillRect(-16, -18, 32, 6);
        ctx.fillRect(14, -16, 8, 4); 
    }
    ctx.restore();
    ctx.globalAlpha = 1.0;
    
    particles.current.forEach(p => {
         ctx.fillStyle = p.color;
         if (p.type === 'snow') { ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI*2); ctx.fill(); }
         else if (p.type === 'wood') { ctx.fillRect(p.position.x, p.position.y, p.size, p.size * 2); }
         else if (p.type === 'spore') {
             ctx.save();
             ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.002 + p.position.x) * 0.5;
             ctx.shadowBlur = 5;
             ctx.shadowColor = p.color;
             ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI*2); ctx.fill();
             ctx.restore();
         }
         else { ctx.globalAlpha = p.life / p.maxLife; ctx.fillRect(p.position.x, p.position.y, p.size, p.size); ctx.globalAlpha = 1.0; }
    });
    floatingTexts.current.forEach(t => {
        ctx.font = `${t.size}px 'VT323', monospace`;
        ctx.fillStyle = t.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(t.text, t.position.x, t.position.y);
        ctx.fillText(t.text, t.position.x, t.position.y);
    });
    
    if (weatherRef.current.type === 'FOG') {
        const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        grad.addColorStop(0, "rgba(176, 190, 197, 0.6)");
        grad.addColorStop(1, "rgba(176, 190, 197, 0.2)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (weatherRef.current.type === 'RAIN') {
        ctx.fillStyle = "rgba(0, 0, 50, 0.1)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.restore();
    
    if (fallTimerDisplay !== null) {
         const dangerRatio = fallTimerDisplay / VOID_TIMER_MAX_SECONDS;
         const opacity = 0.5 + Math.sin(Date.now() * 0.02) * 0.2;
         const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT-200, 0, CANVAS_HEIGHT);
         gradient.addColorStop(0, `rgba(255,0,0,0)`);
         gradient.addColorStop(1, `rgba(180,0,0,${Math.min(0.8, dangerRatio)})`);
         ctx.fillStyle = gradient;
         ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
         
         ctx.fillStyle = "#FFF";
         ctx.font = "40px 'VT323'";
         const secondsLeft = Math.max(0, VOID_TIMER_MAX_SECONDS - fallTimerDisplay).toFixed(1);
         ctx.fillText(`VOID PULL! ${secondsLeft}s`, CANVAS_WIDTH/2 - 100, CANVAS_HEIGHT - 50);
    }
  };

  const updatePhysics = () => {
    if (isPaused || gameState !== GameState.PLAYING) return;
    const player = monkey.current;
    const input = inputRef.current;
    const levelConfig = LEVELS[selectedLevelRef.current - 1];
    const upgrades = saveDataRef.current.upgrades;

    // --- TIME SCALE CALCULATION ---
    let dt = 1.0;
    
    // Ability Slow Mo
    if (activeAbility === AbilityType.SLOW_MO) {
        dt = 0.5;
    }
    
    // Tutorial Slow-mo Override (Priority: High)
    if (tutorial.active && tutorial.currentStep === 'L2_DODGE') {
         const bird = enemies.current.find(e => e.enemyType === 'bird' && e.position.x > player.position.x - 50 && e.position.x < player.position.x + 300);
         if (bird) {
             const dist = Math.hypot(player.position.x - bird.position.x, player.position.y - bird.position.y);
             if (dist < 200 && dist > 50) dt = 0.4;
         }
    }

    // --- VOLCANO CHAOS (SHAKE) ---
    // Only applied in the final levels (8, 9, 10)
    if (currentBiome === 'VOLCANO' && selectedLevelRef.current >= 8) {
        const chaosLevel = (selectedLevelRef.current - 7) * 0.2; // Increase with level
        if (Math.random() < 0.1) addShake(chaosLevel);
    }

    // --- PHYSICS UPDATE ---
    player.velocity.y += GRAVITY * dt;
    
    const effectiveDrag = 1 - (1 - AIR_RESISTANCE) * dt;
    player.velocity.x *= effectiveDrag;
    player.velocity.y *= effectiveDrag;

    // AIR CONTROL UPGRADE
    const airControlMod = (0.5 + (upgrades.airControl * 0.1)) * dt;
    if (input.keys.left) player.velocity.x -= airControlMod;
    if (input.keys.right) player.velocity.x += airControlMod;

    if (player.isSwinging && player.tetherPoint) {
        // ROPE BREAK LOGIC (If not max level)
        if (upgrades.ropeLength < 5) {
            player.ropeTimer -= (0.016 * dt);
            
            // ROPE SLIPPING (Loosening grip)
            if (player.ropeTimer < 3.0) {
                // Slip rate increases as timer decreases
                const slipRate = 0.5 + (3.0 - player.ropeTimer) * 0.5;
                player.ropeLength += slipRate * dt; 
                
                if (Math.random() < 0.1) {
                     spawnParticles(player.tetherPoint.x, player.tetherPoint.y, "#8D6E63", 1, 2, 'wood');
                }
            }

            if (player.ropeTimer <= 0) {
                // SNAP!
                player.isSwinging = false;
                player.tetherPoint = null;
                spawnParticles(player.position.x + 15, player.position.y - 30, '#8D6E63', 10);
                spawnFloatingText(player.position.x, player.position.y - 50, "SNAP!", "#D32F2F", 24);
                addShake(5);
                player.ropeTimer = ROPE_BREAK_TIME_SECONDS; // Reset
            }
        }

        const dx = player.position.x - player.tetherPoint.x;
        const dy = player.position.y - player.tetherPoint.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > player.ropeLength) {
            const angle = Math.atan2(dy, dx);
            const force = (dist - player.ropeLength) * ROPE_STIFFNESS;
            // Apply force scaled by dt
            player.velocity.x -= Math.cos(angle) * force * dt;
            player.velocity.y -= Math.sin(angle) * force * dt;
            
            // Positional correction
            const correction = 0.1 * (dist - player.ropeLength) * dt;
            player.position.x -= Math.cos(angle) * correction;
            player.position.y -= Math.sin(angle) * correction;
        }
        if (input.keys.right) player.velocity.x += 0.3 * dt;
        if (input.keys.left) player.velocity.x -= 0.3 * dt;
    } else {
        // Reset timer when not swinging
        player.ropeTimer = ROPE_BREAK_TIME_SECONDS;
    }

    const vel = Math.hypot(player.velocity.x, player.velocity.y);
    if (vel > MAX_SPEED) {
        player.velocity.x = (player.velocity.x / vel) * MAX_SPEED;
        player.velocity.y = (player.velocity.y / vel) * MAX_SPEED;
    }

    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;

    // --- TIMERS ---
    if (player.jumpCooldown > 0) player.jumpCooldown = Math.max(0, player.jumpCooldown - dt);
    if (player.invulnerableTime > 0) player.invulnerableTime = Math.max(0, player.invulnerableTime - dt);

    // --- CAMERA INERTIA & POV ---
    const targetCamX = player.position.x - CANVAS_WIDTH / 3 + (player.velocity.x * 15);
    const targetCamY = player.position.y - CANVAS_HEIGHT / 2 + (player.velocity.y * 10);
    
    const camLerp = 0.1 * dt; 
    cameraOffset.current.x += (targetCamX - cameraOffset.current.x) * camLerp;
    cameraOffset.current.y += (targetCamY - cameraOffset.current.y) * camLerp;

    if (input.isMouseDown && !player.isSwinging && input.justPressed) {
        input.justPressed = false;
        const target = findSmartTarget(input.mousePos.x + cameraOffset.current.x, input.mousePos.y + cameraOffset.current.y);
        if (target) {
            player.isSwinging = true;
            player.tetherPoint = { x: target.position.x + target.width/2, y: target.position.y + target.height/2 };
            if (target.type === 'vine' || target.type === 'stalactite') {
                player.tetherPoint.x = target.position.x;
                player.tetherPoint.y = Math.min(Math.max(input.mousePos.y + cameraOffset.current.y, target.position.y), target.position.y + target.height);
            }
            player.ropeLength = Math.hypot(player.position.x - player.tetherPoint.x, player.position.y - player.tetherPoint.y);
            triggerSkillEvent("GRAPPLE", 50);
        }
    } else if (!input.isMouseDown && player.isSwinging) {
        const launchBonus = 1.0 + (upgrades.launchBoost * 0.1);
        player.velocity.x *= launchBonus;
        player.velocity.y *= launchBonus;
        
        player.isSwinging = false;
        player.tetherPoint = null;
    }

    const currentDist = Math.floor(player.position.x / 20);
    if (currentDist > distanceRef.current) {
        distanceRef.current = currentDist;
        setDistance(currentDist);
        setScore(s => s + 1);
    }
    
    let maxX = 0;
    entities.current.forEach(e => maxX = Math.max(maxX, e.position.x));
    if (maxX < player.position.x + CANVAS_WIDTH * 1.5) {
        spawnLevelSegment(maxX + randomRange(200, 400));
    }

    // --- AMBIENT PARTICLES ---
    if (currentBiome === 'JUNGLE' && Math.random() < 0.2) {
         particles.current.push({
             position: { x: cameraOffset.current.x + Math.random() * CANVAS_WIDTH, y: cameraOffset.current.y + Math.random() * CANVAS_HEIGHT },
             velocity: { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 },
             life: randomRange(100, 200), maxLife: 200, color: '#C6FF00', size: randomRange(1, 3), type: 'spore'
         });
    }

    entities.current.forEach(e => {
        if (e.type === 'coin' && checkCollision(player, e)) {
             entities.current = entities.current.filter(x => x !== e);
             setRunTokens(t => t + 1);
             triggerSkillEvent("COIN", 100);
        }
        if (e.type === 'portal' && checkCollision(player, e)) {
             setGameState(GameState.LEVEL_COMPLETE);
             if (saveDataRef.current.maxLevelReached < levelConfig.id + 1) {
                 setSaveData(prev => ({...prev, maxLevelReached: levelConfig.id + 1}));
             }
             handleGameOver(); 
        }

        // --- NEW FEATURES COLLISIONS ---
        if (e.type === 'nest' && checkCollision(player, e)) {
            entities.current = entities.current.filter(x => x !== e);
            spawnParticles(e.position.x, e.position.y, '#F5F5F5', 10, 2, 'egg_shell');
            spawnFloatingText(player.position.x, player.position.y - 40, "EGG POWER!", "#FFF", 24);
            
            // Random Powerup effect
            if (Math.random() > 0.5) {
                setCooldowns({ [AbilityType.PUNCH]: 0, [AbilityType.LASER]: 0, [AbilityType.BANANA]: 0, [AbilityType.SLOW_MO]: 0 });
                spawnFloatingText(player.position.x, player.position.y - 60, "REFRESHED!", "#4CAF50", 20);
            } else {
                setRunTokens(t => t + 5);
                spawnFloatingText(player.position.x, player.position.y - 60, "+5 TOKENS", "#FFD700", 20);
            }
        }

        // SWAMP HAZARDS (Water Physics)
        if (e.type === 'waterfall' && checkCollision(player, e)) {
            player.velocity.y += GRAVITY * 2 * dt; // Push down
            player.velocity.x *= 0.95; // Drag
            if (Math.random() < 0.2) spawnParticles(player.position.x, player.position.y, "rgba(255,255,255,0.5)", 1, 2, 'rain');
        }
        if (e.type === 'water_pocket' && checkCollision(player, e)) {
             player.velocity.x *= 0.9; // Heavy Drag
             player.velocity.y *= 0.9;
             if (Math.random() < 0.2) spawnParticles(player.position.x, player.position.y, "rgba(255,255,255,0.5)", 1, 2, 'rain');
        }

        // WEB COLLISION
        if (e.type === 'web' && checkCollision(player, e)) {
             player.velocity.x *= 0.8; // Sticky Drag
             player.velocity.y *= 0.8;
             player.jumpCooldown = 10; // Disable jump momentarily
             if (Math.random() < 0.2) spawnParticles(player.position.x, player.position.y, "rgba(255,255,255,0.5)", 1, 1);
        }
        
        // --- BRANCH COLLISIONS & BREAKING ---
        const isPlatform = (e.type === 'branch' || e.type === 'lilypad');

        if (isPlatform && !e.isBroken && 
            player.position.y + player.height > e.position.y &&
            player.position.y + player.height < e.position.y + e.height + 15 && 
            player.position.x + player.width > e.position.x && 
            player.position.x < e.position.x + e.width &&
            player.velocity.y > 0) 
        {
            // If hitting branch with high velocity, BREAK IT immediately (unless lilypad)
            if (player.velocity.y > 12 && e.type !== 'lilypad') {
                 e.isBroken = true;
                 e.breakVelocity = { x: 0, y: 5 };
                 e.angle = 0;
                 spawnParticles(player.position.x, e.position.y, '#8D6E63', 8, 4, 'wood');
                 spawnParticles(player.position.x, e.position.y, '#4CAF50', 5, 3, 'leaf'); // Falling leaves
                 addShake(3);
            } else {
                // Land safely
                player.position.y = e.position.y - player.height;
                player.velocity.y = 0;
                player.jumpCooldown = 0;
                
                // Break timer logic (if standing too long)
                if (e.stability) {
                    e.stability -= dt;
                    if (e.stability <= 0) {
                         e.isBroken = true;
                         e.breakVelocity = { x: 0, y: 5 };
                         e.angle = 0;
                         spawnParticles(player.position.x, e.position.y, '#8D6E63', 5, 3, 'wood');
                    }
                }
            }
        }
        
        // Animate broken branches falling
        if (isPlatform && e.isBroken && e.breakVelocity) {
            e.breakVelocity.y += GRAVITY * dt;
            e.position.y += e.breakVelocity.y * dt;
            e.angle = (e.angle || 0) + 0.05 * dt;
        }
    });

    enemies.current.forEach(e => {
        // AI LOGIC
        if (e.enemyType === 'spider' && e.anchorY) {
            const freq = 0.02;
            const amp = 100;
            const targetY = e.anchorY + Math.sin(Date.now() * freq + e.position.x) * amp + 100;
            e.velocity.y = (targetY - e.position.y) * 0.05;
        } else if (e.enemyType === 'eagle') {
             const dist = Math.hypot(player.position.x - e.position.x, player.position.y - e.position.y);
             if (dist < 400 && e.state === 0) e.state = 1;
             if (e.state === 1) {
                 const dx = player.position.x - e.position.x;
                 const dy = player.position.y - e.position.y;
                 const angle = Math.atan2(dy, dx);
                 e.velocity.x += Math.cos(angle) * 0.2 * dt;
                 e.velocity.y += Math.sin(angle) * 0.2 * dt;
                 const speed = Math.hypot(e.velocity.x, e.velocity.y);
                 if (speed > 8) {
                     e.velocity.x = (e.velocity.x / speed) * 8;
                     e.velocity.y = (e.velocity.y / speed) * 8;
                 }
             }
        } else if (e.enemyType === 'troll') {
            // SWINGING TROLL AI
            if (e.anchorX && e.anchorY !== undefined) {
                 const swingSpeed = 0.002;
                 const length = 200; // Vine length
                 const angle = Math.sin(Date.now() * swingSpeed + e.id.length); 
                 e.position.x = e.anchorX + Math.sin(angle) * length - e.width/2;
                 e.position.y = 200 + Math.cos(angle) * length;
            }
        } else if (e.enemyType === 'bat') {
             // BAT AI: Sine Wave Movement
             e.velocity.x = -4; // Fly left constantly
             e.velocity.y = Math.sin(Date.now() * 0.01 + e.position.x * 0.1) * 2;
        } else if (e.enemyType === 'slug') {
             // SLUG AI: Crawl Back and Forth
             if (Math.random() < 0.02) e.velocity.x *= -1;
             // Stay on platform? (Simplified)
        } else if (e.enemyType === 'snake') {
             if (Math.random() < 0.02) e.velocity.x *= -1;
        }

        if (e.enemyType !== 'troll') {
            e.position.x += e.velocity.x * dt;
            e.position.y += e.velocity.y * dt;
        }

        if (checkCollision(player, e)) {
             takeDamage(1);
             player.velocity.x = player.position.x < e.position.x ? -10 : 10;
             player.velocity.y = -5;
        }
    });

    // Update Particles
    for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        
        if (p.type === 'spore') {
            p.position.x += Math.sin(Date.now() * 0.002 + p.life) * 0.2;
            p.position.y += p.velocity.y * dt; 
        } else {
            p.position.x += p.velocity.x * dt;
            p.position.y += p.velocity.y * dt;
        }
        
        p.life -= dt;
        if (p.life <= 0) particles.current.splice(i, 1);
    }
    
    // Update Floating Text
    for (let i = floatingTexts.current.length - 1; i >= 0; i--) {
        const t = floatingTexts.current[i];
        t.position.y += t.velocity.y * dt;
        t.life -= dt;
        if (t.life <= 0) floatingTexts.current.splice(i, 1);
    }

    // Weather Update
    cycleWeather(dt);
    spawnWeatherParticles();
    
    // SAFETY NET / VOID LOGIC
    if (player.position.y > CANVAS_HEIGHT + 200) {
         setFallTimerDisplay(t => (t || 0) + 0.016 * dt);
         const currentFallTime = (fallTimerDisplay || 0);

         if (upgrades.safetyNet > 0 && !player.hasUsedNet && currentFallTime > 1.0) {
             player.hasUsedNet = true;
             player.velocity.y = -25; 
             player.fallTimer = 0;
             setFallTimerDisplay(null);
             spawnParticles(player.position.x, player.position.y, "#00E676", 30);
             spawnFloatingText(player.position.x, player.position.y - 100, "SAFETY NET!", "#00E676", 40);
             addShake(10);
         } 
         else if (currentFallTime > VOID_TIMER_MAX_SECONDS) {
             takeDamage(3); // Instant Kill
             setFallTimerDisplay(null);
         }
    } else {
         setFallTimerDisplay(null);
    }
    
    updateTutorial(dt);
    
    setCooldowns(prev => {
        let changed = false;
        const next = { ...prev };
        for (const k in next) {
            if (next[k] > 0) {
                next[k] = Math.max(0, next[k] - dt);
                changed = true;
            }
        }
        return changed ? next : prev;
    });

    if (entities.current.length > 50) entities.current = entities.current.filter(e => e.position.x > player.position.x - 1000);
  };

  useEffect(() => {
    const loop = () => {
      updatePhysics();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, isPaused, currentBiome, activeAbility, tutorial]);

  // ... (Input Handlers remain same) ...
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
          if (gameState === GameState.GAME_OVER && !isLoadingQuote) {
              setGameState(GameState.MENU);
          } else if (gameState === GameState.LEVEL_COMPLETE) {
              setGameState(GameState.MENU);
          } else if (gameState === GameState.PLAYING && !isPaused) {
              if (monkey.current.jumpCooldown <= 0 && monkey.current.freezeTime <= 0) {
                  monkey.current.velocity.y = -12; 
                  monkey.current.isSwinging = false;
                  monkey.current.jumpCooldown = JUMP_COOLDOWN_FRAMES;
                  spawnParticles(monkey.current.position.x, monkey.current.position.y, "#FFF", 10);
                  spawnFloatingText(monkey.current.position.x, monkey.current.position.y - 40, "OOOH OOH!", "#FFF", 24);
                  triggerSkillEvent("SPACE JUMP", 10); 
              }
          }
      }
      if (e.key === 'a' || e.key === 'A') inputRef.current.keys.left = true;
      if (e.key === 'd' || e.key === 'D') inputRef.current.keys.right = true;
      if (e.key === 'p') setIsPaused(p => !p);

      if (gameState === GameState.PLAYING && !isPaused) {
        if (e.key === 'e' || e.key === 'E') {
             if (cooldowns[AbilityType.BANANA] <= 0 && monkey.current.freezeTime <= 0) {
                 setActiveAbility(AbilityType.BANANA);
                 setCooldowns(c => ({...c, [AbilityType.BANANA]: ABILITY_COOLDOWN}));
                 monkey.current.velocity.y = -25; 
                 monkey.current.velocity.x += 10;
                 monkey.current.isSwinging = false;
                 spawnParticles(monkey.current.position.x, monkey.current.position.y, "#FFD700", 30);
                 spawnFloatingText(monkey.current.position.x, monkey.current.position.y - 20, "BLAST OFF!", "#FFD700", 30);
                 triggerSkillEvent("ROCKET LAUNCH", 100, 0.1, "#FFD700");
                 addShake(10);
                 setTimeout(() => setActiveAbility(null), 500); // Reset ability manually after burst
             }
        }
        if (e.key === 'r' || e.key === 'R') {
             if (cooldowns[AbilityType.SLOW_MO] <= 0) {
                setActiveAbility(AbilityType.SLOW_MO);
                setCooldowns(c => ({...c, [AbilityType.SLOW_MO]: ABILITY_COOLDOWN}));
                setTimeout(() => setActiveAbility(null), 3000); 
                triggerSkillEvent("ZEN TIME", 50, 0.0, "#2979FF");
             }
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
       if (e.key === 'a' || e.key === 'A') inputRef.current.keys.left = false;
       if (e.key === 'd' || e.key === 'D') inputRef.current.keys.right = false;
    };
    const handleMouseDown = (e: MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (gameState === GameState.MENU) {
             // Reset Button Click
             if (x > 20 && x < 180 && y > 20 && y < 60) {
                 if (confirm("Reset all progress?")) {
                     localStorage.removeItem('polyjungle_save_v2');
                     window.location.reload();
                 }
                 return;
             }

             LEVELS.forEach((level, i) => {
                 const lx = 100 + (i * (CANVAS_WIDTH - 200) / (LEVELS.length - 1));
                 const ly = CANVAS_HEIGHT - 100 - (i * (CANVAS_HEIGHT - 150) / (LEVELS.length - 1)) + Math.sin(i * 1.5) * 50;
                 const dist = Math.hypot(x - lx, y - ly);
                 if (dist < 30) {
                     if (level.id <= saveData.maxLevelReached) {
                         startGame(level.id);
                     }
                 }
             });
             return;
        }
        
      inputRef.current.isMouseDown = true;
      inputRef.current.justPressed = true;
    };
    const handleMouseUp = () => inputRef.current.isMouseDown = false;
    const handleWheel = (e: WheelEvent) => inputRef.current.wheelDelta = Math.sign(e.deltaY);
    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            inputRef.current.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameState, isPaused, cooldowns, isLoadingQuote, saveData]);


  const renderHearts = () => {
      const hearts = [];
      for (let i=0; i < MAX_LIVES; i++) {
          hearts.push(
              <Heart 
                key={i} 
                size={24} 
                className={i < playerLives ? "text-red-500 fill-red-500" : "text-gray-600"} 
              />
          );
      }
      return <div className="flex gap-1">{hearts}</div>;
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-900 relative">
      <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT} 
        className="border-4 border-gray-700 rounded-lg shadow-2xl cursor-crosshair"
      />
      
      {/* MENU OVERLAY */}
      {gameState === GameState.MENU && (
         <>
         {/* Reset Button */}
         <button 
            className="absolute top-5 left-5 px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-700 rounded flex items-center gap-2 text-sm z-50 transition-colors"
         >
             <Trash2 size={16} /> RESET DATA
         </button>

         <div className="absolute bottom-10 right-10 flex flex-col gap-3 items-end">
              <div className="bg-black/60 p-4 rounded-lg text-white border border-gray-700 max-w-sm backdrop-blur-sm text-right">
                  <h3 className="text-xl font-bold text-green-400 mb-1">THE GREAT ASCENT</h3>
                  <p className="text-sm opacity-80">Click the glowing node to continue your journey up the mountain.</p>
              </div>
              <div className="flex gap-3">
                  <button onClick={() => setShowStoryModal(true)} className="px-6 py-3 bg-amber-700 hover:bg-amber-600 rounded text-xl font-bold flex items-center gap-2 transition-transform hover:scale-105 font-mono text-white border-2 border-amber-900">
                    <Scroll size={24}/> MISSION
                  </button>
                  <button onClick={() => setGameState(GameState.SHOP)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded text-xl font-bold flex items-center gap-2 transition-transform hover:scale-105 font-mono text-white w-fit border-2 border-blue-800">
                    <ShoppingCart /> MARKET
                  </button>
              </div>
         </div>
         </>
      )}
      
      {/* MAP OVERLAY ICONS */}
      {gameState === GameState.MENU && LEVELS.map((level, i) => {
          const x = 100 + (i * (CANVAS_WIDTH - 200) / (LEVELS.length - 1));
          const y = CANVAS_HEIGHT - 100 - (i * (CANVAS_HEIGHT - 150) / (LEVELS.length - 1)) + Math.sin(i * 1.5) * 50;
          const isLocked = level.id > saveData.maxLevelReached;
          if (isLocked) return null;

          let Icon = Map;
          if (level.tutorialType !== 'NONE') Icon = BookOpen;
          else if (level.difficulty > 7) Icon = Skull;
          else if (level.difficulty > 4) Icon = Mountain;
          
          return (
              <div key={level.id} className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 text-white/80" style={{ left: `calc(50% - ${CANVAS_WIDTH/2 - x}px)`, top: `calc(50% - ${CANVAS_HEIGHT/2 - y}px)` }}>
                  <Icon size={16} />
              </div>
          )
      })}

      {/* STORY MODAL */}
      {showStoryModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-8 backdrop-blur-sm">
              <div className="bg-[#D7CCC8] text-[#3E2723] p-8 rounded-lg max-w-2xl w-full border-4 border-[#5D4037] shadow-2xl relative font-mono">
                  <button onClick={() => setShowStoryModal(false)} className="absolute top-4 right-4 p-2 hover:bg-[#A1887F] rounded transition-colors"><X size={24}/></button>
                  <h2 className="text-4xl font-bold mb-4 border-b-2 border-[#5D4037] pb-2 flex items-center gap-2">
                      <Scroll className="text-[#3E2723]"/> MISSION BRIEF
                  </h2>
                  <div className="space-y-4 text-lg">
                      <p>
                          <span className="font-bold">AGENT MONKEY:</span> The Great Rot is spreading from the Volcano summit. The jungle is dying.
                      </p>
                      <p>
                          Your mission is to ascend through the <span className="text-green-700 font-bold">Deep Jungle</span>, cross the <span className="text-orange-700 font-bold">Autumn Ridges</span>, survive the <span className="text-blue-700 font-bold">Frozen Peaks</span>, and reach the <span className="text-red-700 font-bold">Magma Core</span>.
                      </p>
                      <div className="bg-[#EFEBE9] p-4 rounded border border-[#8D6E63] mt-6">
                          <h3 className="font-bold mb-2">FIELD MANUAL:</h3>
                          <ul className="list-disc pl-5 space-y-1 text-base">
                              <li><span className="font-bold">A / D</span> - Swing Momentum (Pump to go faster!)</li>
                              <li><span className="font-bold">CLICK & HOLD</span> - Grapple trees / branches.</li>
                              <li><span className="font-bold">SPACE</span> - Double Jump (Mid-air).</li>
                              <li><span className="font-bold">WARNING:</span> Branches break if you stand on them too long!</li>
                          </ul>
                      </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                      <button onClick={() => setShowStoryModal(false)} className="px-8 py-2 bg-[#5D4037] text-[#D7CCC8] text-xl font-bold rounded hover:bg-[#3E2723] transition-colors">
                          I'M READY
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* TUTORIAL POPUP */}
      {gameState === GameState.PLAYING && tutorial.active && tutorial.showBox && tutorial.targetPos && (
          <div 
             className="absolute p-4 rounded-xl backdrop-blur-md border border-white/20 shadow-xl transition-all duration-300 animate-bounce"
             style={{
                 left: `calc(50% - ${CANVAS_WIDTH/2 - tutorial.targetPos.x}px + 20px)`,
                 top: `calc(50% - ${CANVAS_HEIGHT/2 - tutorial.targetPos.y}px - 10px)`,
                 backgroundColor: 'rgba(30, 41, 59, 0.85)',
                 maxWidth: '250px'
             }}
          >
              <div className="absolute -left-2 top-1/2 w-4 h-4 bg-slate-800 transform -translate-y-1/2 rotate-45 border-l border-b border-white/20"></div>
              <div className="flex gap-3 items-start">
                  <div className="bg-green-500/20 p-2 rounded-lg text-green-400">
                      {tutorial.currentStep === 'WELCOME' && <Move size={20}/>}
                      {tutorial.currentStep === 'GRAPPLE' && <MousePointer2 size={20}/>}
                      {tutorial.currentStep === 'MOMENTUM' && <Zap size={20}/>}
                      {tutorial.currentStep === 'SWING' && <RotateCcw size={20}/>}
                      {tutorial.currentStep === 'JUMP' && <Rocket size={20}/>}
                      {tutorial.currentStep === 'BRANCH_INFO' && <AlertTriangle size={20}/>}
                      {tutorial.currentStep === 'L2_INTRO' && <Skull size={20}/>}
                      {tutorial.currentStep === 'L2_MOMENTUM' && <Zap size={20}/>}
                      {tutorial.currentStep === 'L2_BRANCH' && <AlertTriangle size={20}/>}
                      {tutorial.currentStep === 'L2_DODGE' && <Ghost size={20}/>}
                      {tutorial.currentStep === 'L2_ABILITY' && <Rocket size={20}/>}
                  </div>
                  <div>
                      <h4 className="text-green-400 font-bold text-sm mb-1">HINT</h4>
                      <p className="text-white text-sm leading-tight">{tutorial.message}</p>
                  </div>
              </div>
          </div>
      )}

      {/* HUD */}
      {gameState === GameState.PLAYING && (
        <>
        <div className="absolute top-4 left-4 right-4 flex justify-between text-white font-mono pointer-events-none z-10">
          <div className="flex flex-col gap-2 pointer-events-auto">
            {renderHearts()}
            <div className="flex items-center gap-2">
                <Coins className="text-yellow-400" size={20} />
                <span className="text-xl">{runTokens}</span>
            </div>
            <div className="text-sm opacity-70">
                LEVEL: {LEVELS[selectedLevelRef.current-1].name}
            </div>
            
            <div className="w-48 h-3 bg-gray-700 rounded-full mt-1 border border-gray-500 relative overflow-hidden">
                <div 
                    className="h-full bg-green-500 transition-all duration-300" 
                    style={{ width: `${Math.min(100, (distance / LEVELS[selectedLevelRef.current-1].targetDistance) * 100)}%` }}
                />
            </div>
            <div className="text-xs text-right w-48 mt-1">
                {distance}m / {LEVELS[selectedLevelRef.current-1].targetDistance}m
            </div>

            {ropeLengthDisplay && (
                <div className="text-blue-300 text-sm">Rope: {ropeLengthDisplay}</div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
             {/* PAUSE BUTTON */}
             <button 
                onClick={() => setIsPaused(true)}
                className="p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors mb-2"
                title="Pause Game"
             >
                 <PauseCircle size={28} />
             </button>

             <div className="flex gap-2">
                 <div className={`relative p-2 border-2 rounded transition-all ${cooldowns[AbilityType.BANANA] > 0 ? 'border-gray-600 opacity-50' : 'border-yellow-500 bg-yellow-900/30'}`}>
                     <Rocket size={24} className="text-yellow-400" />
                     <span className="absolute bottom-0 right-1 text-xs font-bold">E</span>
                     {cooldowns[AbilityType.BANANA] > 0 && (
                         <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs">
                             {(cooldowns[AbilityType.BANANA] / 60).toFixed(0)}s
                         </div>
                     )}
                 </div>
                 
                 <div className={`relative p-2 border-2 rounded transition-all ${cooldowns[AbilityType.SLOW_MO] > 0 ? 'border-gray-600 opacity-50' : 'border-blue-500 bg-blue-900/30'}`}>
                     <Clock size={24} className="text-blue-400" />
                     <span className="absolute bottom-0 right-1 text-xs font-bold">R</span>
                     {cooldowns[AbilityType.SLOW_MO] > 0 && (
                         <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs">
                             {(cooldowns[AbilityType.SLOW_MO] / 60).toFixed(0)}s
                         </div>
                     )}
                 </div>
             </div>
             {saveData.upgrades.armor > 0 && (
                 <div className="flex items-center gap-1 text-gray-400 text-sm">
                     <Shield size={16} /> 
                     {monkey.current.armorStack}/{saveData.upgrades.armor}
                 </div>
             )}
          </div>
        </div>

        {skillChainUI.active && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 pointer-events-none flex flex-col items-center z-20">
                <div className="text-2xl font-black tracking-widest animate-bounce" style={{ 
                    color: RANKS.find(r => r.title === skillChainUI.rank)?.color,
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                }}>
                    {skillChainUI.rank}
                </div>
                <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm mt-1">
                    <span className="text-white text-xl font-bold">{skillChainUI.currentScore}</span>
                    <div className="w-px h-6 bg-white/30"></div>
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                           <circle cx="20" cy="20" r="18" fill="none" stroke="#333" strokeWidth="4" />
                           <circle cx="20" cy="20" r="18" fill="none" stroke={RANKS.find(r => r.title === skillChainUI.rank)?.color} strokeWidth="4" 
                                   strokeDasharray={`${(skillChainUI.timer / CHAIN_TIMEOUT_FRAMES) * 113} 999`}
                           />
                        </svg>
                        <span className="text-sm font-bold text-yellow-400">x{skillChainUI.multiplier.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        )}
        </>
      )}

      {/* SHOP */}
      {gameState === GameState.SHOP && (
        <div className="absolute inset-0 bg-gray-900 overflow-hidden flex flex-col font-mono z-50">
          {/* HEADER */}
          <div className="bg-amber-900 border-b-4 border-amber-950 p-4 flex justify-between items-center shadow-lg z-10">
            <div className="flex items-center gap-4">
                <button onClick={() => setGameState(GameState.MENU)} className="p-2 bg-amber-800 hover:bg-amber-700 rounded-lg transition-colors border border-amber-600">
                    <Home size={24} className="text-amber-100"/>
                </button>
                <h1 className="text-3xl text-amber-100 font-bold tracking-wider drop-shadow-md">JUNGLE TRADER</h1>
            </div>
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-amber-500/50">
                <Coins className="text-yellow-400 animate-pulse" size={24} />
                <span className="text-2xl text-white font-bold">{saveData.totalTokens}</span>
            </div>
          </div>

          {/* TABS */}
          <div className="flex justify-center bg-amber-800 border-b border-amber-950 p-2 gap-4">
              <button 
                onClick={() => setShopTab('GEAR')}
                className={`px-6 py-2 rounded-t-lg font-bold text-lg transition-all ${shopTab === 'GEAR' ? 'bg-amber-100 text-amber-900 translate-y-1' : 'bg-amber-900/50 text-amber-300 hover:bg-amber-700'}`}
              >
                  <div className="flex items-center gap-2"><Hammer size={18}/> ROOT SKILLS</div>
              </button>
              <button 
                onClick={() => setShopTab('SKINS')}
                className={`px-6 py-2 rounded-t-lg font-bold text-lg transition-all ${shopTab === 'SKINS' ? 'bg-amber-100 text-amber-900 translate-y-1' : 'bg-amber-900/50 text-amber-300 hover:bg-amber-700'}`}
              >
                  <div className="flex items-center gap-2"><Shirt size={18}/> WARDROBE</div>
              </button>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto bg-[#3E2723] relative">
             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
             
             <div className="p-12 pb-32 max-w-5xl mx-auto relative z-10">
                 {/* TREE VIEW */}
                 {shopTab === 'GEAR' && (
                     <div className="relative min-h-[600px] bg-[#4E342E] rounded-xl border-4 border-[#3E2723] shadow-2xl p-8 overflow-hidden">
                          {/* CONNECTIONS */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none">
                              {SHOP_ITEMS.filter(i => i.type === 'UPGRADE').map(item => {
                                  if (!item.parents) return null;
                                  return item.parents.map(parentId => {
                                      const parent = SHOP_ITEMS.find(p => p.id === parentId);
                                      if (!parent) return null;
                                      return (
                                          <line 
                                            key={`${parent.id}-${item.id}`} 
                                            x1={`${parent.x}%`} y1={`${parent.y}%`} 
                                            x2={`${item.x}%`} y2={`${item.y}%`} 
                                            stroke="#8D6E63" strokeWidth="4" 
                                            className="opacity-50"
                                          />
                                      )
                                  })
                              })}
                          </svg>

                          {SHOP_ITEMS.filter(i => i.type === 'UPGRADE').map(item => {
                              const currentLevel = saveData.upgrades[item.upgradeKey!] || 0;
                              const isMaxed = currentLevel >= (item.maxLevel || 1);
                              const isUnlocked = !item.parents || item.parents.every(pid => {
                                  const p = SHOP_ITEMS.find(x => x.id === pid);
                                  return (saveData.upgrades[p?.upgradeKey!] || 0) > 0;
                              });

                              return (
                                  <button
                                    key={item.id}
                                    onClick={() => setSelectedShopItem(item.id)}
                                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all hover:scale-110 shadow-xl
                                        ${isMaxed ? 'bg-yellow-500 border-yellow-200' : 
                                          isUnlocked ? 'bg-green-600 border-green-300 hover:bg-green-500' : 'bg-gray-700 border-gray-600 grayscale opacity-80 cursor-not-allowed'}
                                        ${selectedShopItem === item.id ? 'ring-4 ring-white scale-110 z-20' : 'z-10'}
                                    `}
                                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                                  >
                                      <item.icon size={24} className="text-white drop-shadow-md" />
                                      {currentLevel > 0 && (
                                          <div className="absolute -bottom-2 -right-2 bg-black text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-white">
                                              {currentLevel}
                                          </div>
                                      )}
                                  </button>
                              )
                          })}
                     </div>
                 )}

                 {/* SKINS GRID */}
                 {shopTab === 'SKINS' && (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                         {SHOP_ITEMS.filter(i => i.type === 'SKIN').map(item => {
                             const isOwned = saveData.skins.includes(item.id);
                             const isEquipped = saveData.equippedSkin === item.id;
                             return (
                                 <button 
                                    key={item.id}
                                    onClick={() => setSelectedShopItem(item.id)}
                                    className={`relative bg-[#5D4037] border-4 rounded-xl p-4 flex flex-col items-center gap-4 transition-transform hover:scale-105 shadow-xl
                                        ${selectedShopItem === item.id ? 'border-amber-400 scale-105' : 'border-[#3E2723]'}
                                        ${isEquipped ? 'ring-4 ring-green-500' : ''}
                                    `}
                                 >
                                     <div className={`p-4 rounded-full ${isOwned ? 'bg-amber-100 text-amber-900' : 'bg-black/30 text-gray-500'}`}>
                                         <item.icon size={40} />
                                     </div>
                                     <div className="text-center">
                                         <h3 className="font-bold text-amber-100">{item.name}</h3>
                                         {isOwned ? (
                                             <span className="text-xs text-green-400 font-bold uppercase tracking-widest">{isEquipped ? 'EQUIPPED' : 'OWNED'}</span>
                                         ) : (
                                             <div className="flex items-center justify-center gap-1 text-yellow-400 font-bold mt-1">
                                                 <Coins size={14} /> {item.cost}
                                             </div>
                                         )}
                                     </div>
                                 </button>
                             )
                         })}
                     </div>
                 )}
             </div>
          </div>

          {/* ITEM INSPECTOR FOOTER */}
          {selectedShopItem && (
              <div className="absolute bottom-0 inset-x-0 bg-[#212121] border-t-4 border-amber-600 p-6 flex items-center justify-between z-50 animate-slide-up shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-6">
                      <div className="p-4 bg-amber-500 rounded-lg text-amber-900">
                          {React.createElement(SHOP_ITEMS.find(i => i.id === selectedShopItem)!.icon, { size: 40 })}
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-white mb-1">{SHOP_ITEMS.find(i => i.id === selectedShopItem)!.name}</h2>
                          <p className="text-gray-400 text-lg">{SHOP_ITEMS.find(i => i.id === selectedShopItem)!.description}</p>
                          {SHOP_ITEMS.find(i => i.id === selectedShopItem)?.type === 'UPGRADE' && (
                              <div className="flex gap-1 mt-2">
                                  {[...Array(SHOP_ITEMS.find(i => i.id === selectedShopItem)!.maxLevel)].map((_, i) => (
                                      <div key={i} className={`h-2 w-8 rounded ${i < (saveData.upgrades[SHOP_ITEMS.find(x => x.id === selectedShopItem)!.upgradeKey!] || 0) ? 'bg-green-500' : 'bg-gray-700'}`} />
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="flex gap-4">
                      {SHOP_ITEMS.find(i => i.id === selectedShopItem)!.type === 'SKIN' && saveData.skins.includes(selectedShopItem) ? (
                          <button 
                            onClick={() => {
                                setSaveData(prev => ({...prev, equippedSkin: selectedShopItem}));
                                addShake(5);
                            }}
                            disabled={saveData.equippedSkin === selectedShopItem}
                            className="px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:opacity-50 rounded-lg font-bold text-white text-xl transition-all"
                          >
                              {saveData.equippedSkin === selectedShopItem ? 'EQUIPPED' : 'EQUIP'}
                          </button>
                      ) : (
                          <button 
                            onClick={() => {
                                const item = SHOP_ITEMS.find(i => i.id === selectedShopItem)!;
                                const cost = item.cost; 
                                const currentLvl = item.type === 'UPGRADE' ? saveData.upgrades[item.upgradeKey!] : 0;
                                
                                if (saveData.totalTokens >= cost && (!item.maxLevel || currentLvl < item.maxLevel)) {
                                    setSaveData(prev => {
                                        const next = { ...prev, totalTokens: prev.totalTokens - cost };
                                        if (item.type === 'UPGRADE') {
                                            next.upgrades = { ...next.upgrades, [item.upgradeKey!]: next.upgrades[item.upgradeKey!] + 1 };
                                        } else {
                                            next.skins = [...next.skins, item.id];
                                            next.equippedSkin = item.id;
                                        }
                                        return next;
                                    });
                                    setJustUpgraded(item.id);
                                    setTimeout(() => setJustUpgraded(null), 1000);
                                    addShake(5);
                                }
                            }}
                            disabled={saveData.totalTokens < SHOP_ITEMS.find(i => i.id === selectedShopItem)!.cost || (SHOP_ITEMS.find(i => i.id === selectedShopItem)!.type === 'UPGRADE' && saveData.upgrades[SHOP_ITEMS.find(i => i.id === selectedShopItem)!.upgradeKey!] >= SHOP_ITEMS.find(i => i.id === selectedShopItem)!.maxLevel!)}
                            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold text-white text-xl flex items-center gap-2 transition-all shadow-lg active:translate-y-1"
                          >
                              {saveData.upgrades[SHOP_ITEMS.find(i => i.id === selectedShopItem)!.upgradeKey!] >= SHOP_ITEMS.find(i => i.id === selectedShopItem)!.maxLevel! 
                                  ? "MAXED OUT" 
                                  : <><Coins size={20}/> {SHOP_ITEMS.find(i => i.id === selectedShopItem)!.cost}</>
                              }
                          </button>
                      )}
                  </div>
              </div>
          )}
        </div>
      )}
      
      {/* GAME OVER */}
      {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
             <div className="bg-gray-800 p-8 rounded-2xl border-4 border-red-500 text-center max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
                 <h2 className="text-5xl font-black text-white mb-2 tracking-tighter">GAME OVER</h2>
                 <div className="text-xl text-gray-400 mb-6 font-mono">Distance: {distanceRef.current}m</div>
                 
                 <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 mb-6 relative overflow-hidden">
                     {isLoadingQuote ? (
                         <div className="flex items-center justify-center gap-2 text-green-400 animate-pulse">
                             <Sparkles size={20} /> Consulting the Spirits...
                         </div>
                     ) : (
                         <div className="relative z-10">
                             <p className="text-green-400 text-lg italic font-serif leading-relaxed">"{displayedQuote}"</p>
                             <div className="text-xs text-gray-500 mt-2 uppercase tracking-widest">- Jungle Spirit</div>
                         </div>
                     )}
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 mb-6">
                     <div className="bg-yellow-900/30 p-3 rounded border border-yellow-700">
                         <div className="text-yellow-500 text-xs font-bold uppercase">Tokens Earned</div>
                         <div className="text-2xl text-white font-bold flex items-center justify-center gap-2">
                             <Coins size={20} className="text-yellow-400"/> +{runTokens}
                         </div>
                     </div>
                     <div className="bg-blue-900/30 p-3 rounded border border-blue-700">
                         <div className="text-blue-400 text-xs font-bold uppercase">High Score</div>
                         <div className="text-2xl text-white font-bold">{saveData.highScore}</div>
                     </div>
                 </div>

                 <button 
                   onClick={() => setGameState(GameState.MENU)}
                   className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                 >
                    <RotateCcw size={24} /> RETURN TO CAMP
                 </button>
             </div>
          </div>
      )}
      
      {/* LEVEL COMPLETE */}
      {gameState === GameState.LEVEL_COMPLETE && (
          <div className="absolute inset-0 bg-green-900/90 flex items-center justify-center z-50">
             <div className="bg-[#1B5E20] p-10 rounded-2xl border-4 border-yellow-400 text-center max-w-lg shadow-2xl animate-bounce-in">
                 <Trophy size={64} className="text-yellow-400 mx-auto mb-4 drop-shadow-lg" />
                 <h2 className="text-5xl font-black text-white mb-2">LEVEL COMPLETE!</h2>
                 <p className="text-green-200 text-xl mb-8">The jungle acknowledges your strength.</p>
                 
                 <button 
                   onClick={() => setGameState(GameState.MENU)}
                   className="px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-green-900 font-black text-2xl rounded-full transition-transform hover:scale-110 shadow-xl"
                 >
                    CONTINUE JOURNEY
                 </button>
             </div>
          </div>
      )}

      {/* PAUSE MENU */}
      {isPaused && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gray-900 text-white p-8 rounded-2xl text-center shadow-2xl border-2 border-gray-700 max-w-sm w-full">
                  <h2 className="text-4xl font-black mb-8 tracking-widest text-amber-500">PAUSED</h2>
                  <div className="flex flex-col gap-4">
                      <button 
                        onClick={() => setIsPaused(false)} 
                        className="px-6 py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-xl flex items-center justify-center gap-2 transition-transform hover:scale-105"
                      >
                          <PlayCircle size={24}/> RESUME
                      </button>
                      <button 
                        onClick={() => setGameState(GameState.MENU)} 
                        className="px-6 py-4 bg-red-900/50 hover:bg-red-900 border-2 border-red-800 rounded-xl font-bold text-xl flex items-center justify-center gap-2 transition-colors"
                      >
                          <LogOut size={24}/> EXIT TO MENU
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
