
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, AbilityType, Vector2, Entity, Enemy, Particle, SaveData, ShopItem, BiomeType, FloatingText, SkillChainState, SkillRank, WeatherType, LevelConfig, TutorialState } from './types';
import { Zap, Rocket, Grab, Play, RotateCcw, Skull, ShoppingCart, Coins, Home, MousePointer2, Move, Wind, Eye, CloudRain, Snowflake, CloudFog, Leaf, Pause, PlayCircle, Flame, TrendingUp, AlertTriangle, Crosshair, Clock, Flower, Shield, Heart, Trophy, Star, Activity, Sparkles, Hourglass, Gem, Ghost, Lock, Map, CheckCircle, BookOpen, Mountain, Anchor, Scroll, Shirt, Hammer, X, Sprout, Feather, LifeBuoy, Keyboard, PauseCircle, LogOut, Egg, Trash2, Brain, ChevronDown, Lightbulb, Check, HelpCircle, ArrowRight, SkipForward, Volume2, VolumeX, Repeat, Book } from 'lucide-react';

// --- CONSTANTS ---
const GRAVITY_BASE = 0.5; // Constant downward gravity
const AIR_RESISTANCE = 0.99; // Standard air friction
const MAX_SPEED = 30; 
const CEILING_LIMIT = -200; 
const SPAWN_RATE_BASE = 300;
const JUMP_COOLDOWN_FRAMES = 45; 
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 600;
const VOID_TIMER_MAX_SECONDS = 3.0; 
const ROPE_BREAK_TIME_SECONDS = 4.5; 
const GRAPPLE_ASSIST_RADIUS = 250; 
const MAX_LIVES = 3;
const INVULNERABILITY_TIME = 60; 
const CHAIN_TIMEOUT_FRAMES = 150; 
const BASE_MULTIPLIER = 1.0;
const MAX_MULTIPLIER = 5.0;

// --- AUDIO CONFIG ---
const MUSIC_TRACKS = {
    JUNGLE: "https://www.dropbox.com/scl/fi/ujzpo97h59v1x22flgtz6/Jungle_Jump_Jam_2025-12-10T125948.mp3?rlkey=ot8q7f0djyy1cky3kav3k6xqo&st=hi3rg2fv&dl=1",
    SWAMP: "https://www.dropbox.com/scl/fi/hvjbk97ji2a982943zw1a/Swamp_Dub_Groove_2025-12-10T130057.mp3?rlkey=3hkxbeau4y40p31omfgalyx3l&st=nuvc5c03&dl=1",
    VOLCANO: "https://www.dropbox.com/scl/fi/sm8maaw0oibv8eiacowg6/Swamp_Dub_Groove_2025-12-10T130330.mp3?rlkey=halktdpnkihuebjplts01yq7v&st=s2l03ihf&dl=1"
};

const SFX_URLS = {
    BRANCH_BREAK: "https://www.dropbox.com/scl/fi/5v2emaht8c1nkijhg7zk2/branch_from_aolive_t_-2-1765372064924.mp3?rlkey=ecm1fyoihva1frwvceskte06r&st=r42r4qew&dl=1",
    LEAVES: "https://www.dropbox.com/scl/fi/aaew7b2mi1u49r0ev00in/leaves_ruzzling_-3-1765372117901.mp3?rlkey=tjh8e67zl6h2oyosuc01cpcer&st=y1u46yr0&dl=1",
    GRAPPLE: "https://www.dropbox.com/scl/fi/qg7gm12tju8iu1hw9cji0/grappling_rope_Whip__-2-1765372178207.mp3?rlkey=myarbs18s9cpf8qg3qy8fhmnz&st=4ylfd18l&dl=1"
};

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
    { id: 1, name: "Elven Outskirts", description: "The edge of the Kingdom.", targetDistance: 600, biome: "JUNGLE", difficulty: 0, allowedEnemies: [], allowedWeather: ['CLEAR'], tutorialType: 'BASIC' },
    { id: 2, name: "Royal Canopy", description: "Deep in the Elven woods.", targetDistance: 1000, biome: "JUNGLE", difficulty: 1, allowedEnemies: ['bird'], allowedWeather: ['CLEAR'], tutorialType: 'ADVANCED' },
    { id: 3, name: "The Great Lake", description: "Endless water below.", targetDistance: 1500, biome: "SWAMP", difficulty: 3, allowedEnemies: ['bird', 'snake', 'crocodile'], allowedWeather: ['CLEAR', 'RAIN'], tutorialType: 'NONE' },
    { id: 4, name: "Misty Waters", description: "Fog rolls over the lake.", targetDistance: 2000, biome: "SWAMP", difficulty: 4, allowedEnemies: ['eagle', 'spider', 'crocodile', 'slug'], allowedWeather: ['FOG', 'RAIN'], tutorialType: 'NONE' },
    { id: 5, name: "Troll Valley", description: "Dark, damp, and dangerous.", targetDistance: 2500, biome: "CAVE", difficulty: 5, allowedEnemies: ['spider', 'bat', 'troll'], allowedWeather: ['CLEAR'], tutorialType: 'NONE' },
    { id: 6, name: "Lava Lake", description: "The floor is literal lava.", targetDistance: 3000, biome: "VOLCANO", difficulty: 6, allowedEnemies: ['bat', 'eagle'], allowedWeather: ['CLEAR', 'WINDY'], tutorialType: 'NONE' },
    { id: 7, name: "Rocky Slopes", description: "Steep climb.", targetDistance: 3500, biome: "VOLCANO", difficulty: 7, allowedEnemies: ['eagle', 'spider'], allowedWeather: ['WINDY'], tutorialType: 'NONE' },
    { id: 8, name: "Ash Storm", description: "Visibility low.", targetDistance: 4000, biome: "VOLCANO", difficulty: 8, allowedEnemies: ['eagle', 'spider', 'bat'], allowedWeather: ['WINDY', 'FOG'], tutorialType: 'NONE' },
    { id: 9, name: "The Peak", description: "Almost there.", targetDistance: 4500, biome: "VOLCANO", difficulty: 9, allowedEnemies: ['bird', 'spider', 'eagle', 'crocodile', 'bat'], allowedWeather: ['WINDY'], tutorialType: 'NONE' },
    { id: 10, name: "Magma Core", description: "The final test.", targetDistance: 5000, biome: "VOLCANO", difficulty: 10, allowedEnemies: ['bird', 'spider', 'eagle', 'bat', 'snake', 'troll'], allowedWeather: ['RAIN', 'WINDY', 'FOG'], tutorialType: 'NONE' }
];

// Initial Save Data
const DEFAULT_SAVE: SaveData = {
  totalTokens: 0,
  highScore: 0,
  maxLevelReached: 10, 
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

const SHOP_ITEMS: ShopItem[] = [
  { id: 'upgrade_rope', name: 'Vine Weaver', type: 'UPGRADE', cost: 50, description: 'Longer vines for deeper swings.', upgradeKey: 'ropeLength', maxLevel: 5, icon: Move, x: 50, y: 10 },
  { id: 'upgrade_force', name: 'Gorilla Strength', type: 'UPGRADE', cost: 75, description: 'Start swings with more power.', upgradeKey: 'swingForce', maxLevel: 5, icon: Zap, x: 30, y: 30, parents: ['upgrade_rope'] },
  { id: 'upgrade_launch', name: 'Springy Tendons', type: 'UPGRADE', cost: 100, description: 'Explosive speed when releasing.', upgradeKey: 'launchBoost', maxLevel: 5, icon: Sprout, x: 70, y: 30, parents: ['upgrade_rope'] },
  { id: 'upgrade_magnet', name: 'Coin Magnet', type: 'UPGRADE', cost: 120, description: 'Attract coins nearby.', upgradeKey: 'magnetism', maxLevel: 5, icon: Crosshair, x: 20, y: 55, parents: ['upgrade_force'] },
  { id: 'upgrade_air', name: 'Aerodynamics', type: 'UPGRADE', cost: 120, description: 'Control movement mid-air.', upgradeKey: 'airControl', maxLevel: 5, icon: Feather, x: 80, y: 55, parents: ['upgrade_launch'] },
  { id: 'upgrade_armor', name: 'Coconut Helmet', type: 'UPGRADE', cost: 150, description: 'Survive one hit per run.', upgradeKey: 'armor', maxLevel: 3, icon: Shield, x: 40, y: 75, parents: ['upgrade_force', 'upgrade_launch'] },
  { id: 'upgrade_fever', name: 'Banana Smoothie', type: 'UPGRADE', cost: 100, description: 'Extends Fever Mode.', upgradeKey: 'feverDuration', maxLevel: 5, icon: Hourglass, x: 60, y: 75, parents: ['upgrade_launch', 'upgrade_force'] },
  { id: 'upgrade_luck', name: 'Lucky Clover', type: 'UPGRADE', cost: 200, description: 'Chance for double coins.', upgradeKey: 'luck', maxLevel: 5, icon: Sparkles, x: 30, y: 95, parents: ['upgrade_magnet'] },
  { id: 'upgrade_net', name: 'Vine Net', type: 'UPGRADE', cost: 500, description: 'Bounce back from the void once.', upgradeKey: 'safetyNet', maxLevel: 1, icon: LifeBuoy, x: 70, y: 95, parents: ['upgrade_air'] },
  { id: 'skin_cyber', name: 'Cyber Kong', type: 'SKIN', cost: 500, description: 'Neon aesthetics.', icon: Activity },
  { id: 'skin_winter', name: 'Yeti', type: 'SKIN', cost: 800, description: 'Cold resistance visual.', icon: Snowflake },
  { id: 'skin_ninja', name: 'Ninja', type: 'SKIN', cost: 1200, description: 'Stealthy shadows.', icon: Ghost },
  { id: 'skin_golden', name: 'Golden God', type: 'SKIN', cost: 2500, description: 'Pure luxury.', icon: Gem },
];

// --- SOUND SYNTHESIZER ---
const SoundSynth = {
    ctx: null as AudioContext | null,
    clips: {} as Record<string, HTMLAudioElement>,
    init: () => {
        if (!SoundSynth.ctx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) SoundSynth.ctx = new AudioContextClass();
        }
    },
    playClip: (url: string, vol: number = 0.5) => {
        const audio = new Audio(url);
        audio.volume = vol;
        audio.play().catch(e => console.log("SFX Blocked", e));
    },
    playTone: (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
        if (!SoundSynth.ctx) SoundSynth.init();
        const ctx = SoundSynth.ctx;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    },
    playJump: () => {
        SoundSynth.playTone(400, 'square', 0.1, 0.05);
        setTimeout(() => SoundSynth.playTone(600, 'square', 0.1, 0.05), 50);
    },
    playGrapple: () => SoundSynth.playClip(SFX_URLS.GRAPPLE, 0.4),
    playCoin: () => {
        SoundSynth.playTone(1200, 'sine', 0.1, 0.05);
        setTimeout(() => SoundSynth.playTone(1800, 'sine', 0.2, 0.05), 50);
    },
    playBranchBreak: () => {
        SoundSynth.playClip(SFX_URLS.BRANCH_BREAK, 0.5);
    },
    playLeaves: () => {
        SoundSynth.playClip(SFX_URLS.LEAVES, 0.3);
    },
    playCrash: () => {
        SoundSynth.playTone(100, 'sawtooth', 0.3, 0.1);
        SoundSynth.playTone(50, 'square', 0.3, 0.1);
    }
};

// --- HELPER FUNCTIONS ---
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
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

// --- SLIDESHOW COMPONENT ---
const IntroSlideshow = ({ onComplete }: { onComplete: () => void }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            title: "THE GREAT ROT",
            text: "Deep in the volcano, a dark rot is spreading. The jungle is dying, and the ancient spirits are silent.",
            icon: <Flame size={120} className="text-red-500 animate-pulse" />,
            color: "bg-red-900/10"
        },
        {
            title: "AGENT MONKEY",
            text: "You are the jungle's last hope. Agile, brave, and armed with the legendary Vine Gauntlets.",
            icon: <Ghost size={120} className="text-green-500" />,
            color: "bg-green-900/10"
        },
        {
            title: "THE MECHANICS",
            text: "Use your momentum! Click & Hold to grapple. Release at the peak of your swing to fly.",
            icon: <Activity size={120} className="text-yellow-500" />,
            color: "bg-yellow-900/10"
        },
        {
            title: "THE DANGERS",
            text: "Avoid the void below. Watch out for spiders, birds, and the unstable volcanic terrain.",
            icon: <Skull size={120} className="text-gray-400" />,
            color: "bg-gray-900/10"
        },
        {
            title: "THE GOAL",
            text: "Ascend through the biomes. Reach the Magma Core. Save the world.",
            icon: <Mountain size={120} className="text-purple-500" />,
            color: "bg-purple-900/10"
        }
    ];

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(s => s + 1);
        } else {
            onComplete();
        }
    };

    return (
        <div className="absolute inset-0 bg-black z-[100] flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-gray-900 border-4 border-gray-700 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[500px] shadow-black/80">
                <div className={`flex-1 flex items-center justify-center p-12 ${slides[currentSlide].color} transition-colors duration-500`}>
                    <div className="transform scale-125 drop-shadow-xl transition-all duration-500 animate-bounce-slow">
                        {slides[currentSlide].icon}
                    </div>
                </div>
                <div className="flex-1 p-8 md:p-12 flex flex-col bg-gray-800 relative justify-center">
                    <div key={currentSlide} className="flex-1 flex flex-col justify-center animate-in slide-in-from-right-8 fade-in duration-500">
                        <h2 className="text-5xl font-black text-white mb-6 font-mono tracking-tighter drop-shadow-lg">
                            {slides[currentSlide].title}
                        </h2>
                        <p className="text-xl text-gray-300 leading-relaxed font-mono font-bold">
                            {slides[currentSlide].text}
                        </p>
                    </div>
                    <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-700">
                        <div className="flex gap-2">
                            {slides.map((_, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i === currentSlide ? 'bg-white' : 'bg-gray-600'}`} />
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={onComplete} className="px-4 py-2 text-gray-400 font-bold hover:text-white transition-colors flex items-center gap-1 text-sm">
                                SKIP <SkipForward size={14}/>
                            </button>
                            <button onClick={handleNext} className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-lg shadow-lg">
                                {currentSlide === slides.length - 1 ? "BEGIN JOURNEY" : "NEXT"} <ArrowRight size={20}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function App() {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [runTokens, setRunTokens] = useState(0);
  const [cooldowns, setCooldowns] = useState({ [AbilityType.PUNCH]: 0, [AbilityType.LASER]: 0, [AbilityType.BANANA]: 0, [AbilityType.SLOW_MO]: 0 });
  const [activeAbility, setActiveAbility] = useState<AbilityType | null>(null);
  const [currentBiome, setCurrentBiome] = useState<BiomeType>('JUNGLE');
  const [isPaused, setIsPaused] = useState(false);
  const [skyColorCurrent, setSkyColorCurrent] = useState(["#0F2027", "#203A43"]);
  const [fallTimerDisplay, setFallTimerDisplay] = useState<number | null>(null);
  const [isInvincible, setIsInvincible] = useState(false);
  const [playerLives, setPlayerLives] = useState(MAX_LIVES);
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);
  const [tutorial, setTutorial] = useState<TutorialState>({ active: false, currentStep: 'WELCOME', showBox: false, message: "" });
  const [activeTab, setActiveTab] = useState<'UPGRADES' | 'SKINS'>('UPGRADES');
  
  // AUDIO STATE
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        if (parsed.upgrades.launchBoost === undefined) parsed.upgrades.launchBoost = 0;
        if (parsed.upgrades.airControl === undefined) parsed.upgrades.airControl = 0;
        if (parsed.upgrades.safetyNet === undefined) parsed.upgrades.safetyNet = 0;
        if (parsed.maxLevelReached === undefined || parsed.maxLevelReached === 1) parsed.maxLevelReached = 10;
        return parsed;
    }
    return DEFAULT_SAVE;
  });

  useEffect(() => {
    localStorage.setItem('polyjungle_save_v2', JSON.stringify(saveData));
  }, [saveData]);

  // --- AUDIO SETUP ---
  useEffect(() => {
      SoundSynth.init();
      // Determine Music Track
      let track = MUSIC_TRACKS.JUNGLE;
      if (currentBiome === 'SWAMP') track = MUSIC_TRACKS.SWAMP;
      if (currentBiome === 'VOLCANO' || currentBiome === 'CAVE' || currentBiome === 'WINTER') track = MUSIC_TRACKS.VOLCANO;
      
      if (!audioRef.current || audioRef.current.src !== track) {
          if (audioRef.current) audioRef.current.pause();
          audioRef.current = new Audio(track);
          audioRef.current.loop = true;
          audioRef.current.volume = 0.3;
      }
      
      if (audioRef.current) {
          if (isMuted || gameState === GameState.MENU) audioRef.current.pause();
          else audioRef.current.play().catch(e => console.log("Audio play blocked", e));
      }
  }, [currentBiome, gameState, isMuted]);

  const toggleMute = () => {
      setIsMuted(prev => !prev);
  };

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
    swingStartAngle: 0,
    totalRotation: 0,
    lastLoopTime: 0,
    hasSurged: false,
    overdriveTimer: 0,
    justDidLoop: false,
    inFog: false,
    hasUsedNet: false,
    ropeTimer: 0, 
    maxSpeedAchieved: 0,
    causeOfDeath: ''
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
      keys: { left: false, right: false, up: false, down: false }
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
      for(let i=0; i<30; i++) {
          bgLayers.current.push({ x: Math.random() * 2000, y: CANVAS_HEIGHT, size: randomRange(2.0, 3.5), type: 0, color: currentBiome === 'CAVE' ? '#0f0f10' : '#004d40', speed: 0.05, shapeVar: 0 });
      }
      for(let i=0; i<60; i++) { 
          bgLayers.current.push({ x: Math.random() * 2000, y: CANVAS_HEIGHT + randomRange(0, 100), size: randomRange(1.5, 4.0), type: 3, color: currentBiome === 'CAVE' ? '#1f1f22' : '#00332c', speed: 0.08, shapeVar: Math.random() });
      }
      for(let i=0; i<40; i++) {
          bgLayers.current.push({ x: Math.random() * 2000, y: CANVAS_HEIGHT + 50, size: randomRange(1.0, 1.8), type: 0, color: currentBiome === 'CAVE' ? '#2d2d30' : '#1b5e20', speed: 0.15, shapeVar: 1 });
      }
      if (currentBiome === 'JUNGLE' || currentBiome === 'SWAMP') {
          for(let i=0; i<40; i++) {
              bgLayers.current.push({ x: Math.random() * 2000, y: -20, size: Math.random() * 150 + 50, type: 1, color: `rgba(20, ${60 + Math.random()*40}, 20, ${Math.random() * 0.4 + 0.2})`, speed: Math.random() * 0.2 + 0.15 });
          }
      }
  }, [currentBiome]);

  // Init Lobby Map Elements
  useEffect(() => {
      mapElements.current = [];
      for(let i=0; i<5; i++) {
          mapElements.current.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, type: 'cloud', speed: randomRange(0.2, 0.5) });
      }
      mapPropsRef.current = [];
      for(let i=0; i<120; i++) {
          const x = Math.random() * CANVAS_WIDTH;
          const y = Math.random() * CANVAS_HEIGHT;
          const t = x / CANVAS_WIDTH;
          const pathY = (CANVAS_HEIGHT - 100) * (1-t) + 100 * t; 
          if (Math.abs(y - pathY) < 80) continue; 
          let type: 'tree' | 'rock' | 'mountain' | 'pine' | 'wave' | 'cave' = 'tree';
          let scale = 0.5 + Math.random() * 0.5;
          if (x < CANVAS_WIDTH * 0.35) { type = Math.random() > 0.6 ? 'tree' : 'pine'; } 
          else if (x < CANVAS_WIDTH * 0.6) { type = Math.random() > 0.6 ? 'wave' : 'rock'; } 
          else if (x < CANVAS_WIDTH * 0.75) { type = Math.random() > 0.6 ? 'cave' : 'rock'; } 
          else { type = Math.random() > 0.5 ? 'mountain' : 'rock'; scale *= 1.2; }
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

      if (!isL2) {
          if (tutorial.currentStep === 'WELCOME') {
              show = true; message = "Welcome! Use 'A' and 'D' keys to swing your body.";
              target = { x: player.position.x, y: player.position.y - 50 };
              if (Math.abs(player.velocity.x) > 2) nextStep = 'GRAPPLE';
          }
          else if (tutorial.currentStep === 'GRAPPLE') {
              show = true; message = "Click & Hold a tree to GRAPPLE!";
              const tree = entities.current.find(e => e.type === 'tree' && e.position.x > player.position.x + 100);
              if (tree) target = { x: tree.position.x, y: tree.position.y + 200 };
              if (player.isSwinging) nextStep = 'MOMENTUM';
          }
          else if (tutorial.currentStep === 'MOMENTUM') {
               show = true; message = "Swing! Hold 'D' when moving Right, 'A' when Left.";
               target = { x: player.position.x, y: player.position.y - 50 };
               const speed = Math.hypot(player.velocity.x, player.velocity.y);
               if (player.isSwinging && speed > 18) nextStep = 'SWING';
          }
          else if (tutorial.currentStep === 'SWING') {
               show = true; message = "Release Click at the peak to FLY!";
               target = { x: player.position.x, y: player.position.y - 50 };
               if (!player.isSwinging && player.velocity.x > 8) nextStep = 'JUMP';
          }
          else if (tutorial.currentStep === 'JUMP') {
              show = true; message = "Press 'W' or 'Space' to Double Jump mid-air!";
              target = { x: player.position.x, y: player.position.y - 50 };
              if (player.jumpCooldown > 0) { nextStep = 'BRANCH_INFO'; timer = 240; }
          }
          else if (tutorial.currentStep === 'BRANCH_INFO') {
              show = true; message = "WARNING: Standing on branches too long will break them!";
              target = { x: player.position.x, y: player.position.y - 50 };
              timer -= dt;
              if (timer <= 0) nextStep = 'COMPLETED';
          }
          else if (tutorial.currentStep === 'COMPLETED') show = false;
      } else {
          // L2 Logic
          if (tutorial.currentStep === 'L2_INTRO') {
              show = true; message = "Level 2: Dangers Ahead! Swing FAST to survive.";
              timer -= dt; if (timer <= 0) nextStep = 'L2_MOMENTUM';
          }
          else if (tutorial.currentStep === 'L2_MOMENTUM') {
              show = true; message = "PUMP IT! Alternate A and D to reach MAX SPEED (22+)!";
              const speed = Math.hypot(player.velocity.x, player.velocity.y);
              if (speed > 22) { nextStep = 'L2_BRANCH'; timer = 0; }
          }
          else if (tutorial.currentStep === 'L2_BRANCH') {
              show = true; message = "Look! A Branch! Grapple it to rest... but be quick!";
              const standingOnBranch = entities.current.some(e => e.type === 'branch' && checkCollision(player, e));
              if (standingOnBranch) { message = "UNSTABLE! It breaks in 1s! JUMP!"; if (player.jumpCooldown > 0) nextStep = 'L2_DODGE'; }
          }
          else if (tutorial.currentStep === 'L2_DODGE') {
              show = true; message = "ENEMY AHEAD! Birds hurt. Swing HIGH or LOW to dodge!";
              if (distanceRef.current > 40) nextStep = 'L2_ABILITY';
          }
          else if (tutorial.currentStep === 'L2_ABILITY') {
              show = true; message = "Here's a free Rocket charge! Press 'E' to BLAST OFF!";
              if (cooldowns[AbilityType.BANANA] > 0) setCooldowns(prev => ({...prev, [AbilityType.BANANA]: 0}));
              if (activeAbility === AbilityType.BANANA) nextStep = 'COMPLETED';
          }
          else if (tutorial.currentStep === 'COMPLETED') show = false;
      }

      // ONLY UPDATE IF CHANGED to prevent render thrashing
      if (nextStep !== tutorial.currentStep || show !== tutorial.showBox || message !== tutorial.message) {
          setTutorial({ ...tutorial, currentStep: nextStep, showBox: show, message, targetPos: target, timer });
          if (nextStep === 'L2_INTRO') setTutorial(prev => ({...prev, timer: 180}));
      }
  };

  const handleBuyItem = (item: ShopItem) => {
      const currentLevel = item.type === 'UPGRADE' ? saveData.upgrades[item.upgradeKey!] : 0;
      if (item.maxLevel && currentLevel >= item.maxLevel) return;
      if (saveData.totalTokens >= item.cost) {
          if (!isMuted) SoundSynth.playCoin();
          setSaveData(prev => {
              const newUpgrades = { ...prev.upgrades };
              const newSkins = [...prev.skins];
              if (item.type === 'UPGRADE' && item.upgradeKey) {
                  newUpgrades[item.upgradeKey] = (newUpgrades[item.upgradeKey] || 0) + 1;
              } else if (item.type === 'SKIN' && !newSkins.includes(item.id)) {
                  newSkins.push(item.id);
              }
              return {
                  ...prev,
                  totalTokens: prev.totalTokens - item.cost,
                  upgrades: newUpgrades,
                  skins: newSkins
              };
          });
      }
  };

  const handleEquipSkin = (skinId: string) => {
      setSaveData(prev => ({ ...prev, equippedSkin: skinId }));
  };

  // ... (Game Logic Helpers omitted for brevity) ...
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
    if (type === 'leaf' && !isMuted) SoundSynth.playLeaves();
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
    for (const r of RANKS) { if (total >= r.threshold) { newRank = r.title; break; } }
    chain.rank = newRank;
    setSkillChainUI({...chain});
    spawnFloatingText(monkey.current.position.x, monkey.current.position.y - 60, `${name} x${chain.multiplier.toFixed(1)}`, color, 16);
  };

  const spawnLevelSegment = (startX: number) => {
    const level = LEVELS[selectedLevelRef.current - 1];
    if (startX > level.targetDistance * 20) {
        if (!entities.current.find(e => e.type === 'portal')) {
            entities.current.push({ id: 'finish-portal', position: { x: level.targetDistance * 20, y: CANVAS_HEIGHT - 300 }, width: 100, height: 200, color: '#00E676', type: 'portal' });
            entities.current.push({ id: 'finish-platform', position: { x: level.targetDistance * 20 - 50, y: CANVAS_HEIGHT - 100 }, width: 200, height: 20, color: '#3E2723', type: 'branch', biome: level.biome, stability: 999 });
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
    
    const baseHeight = CANVAS_HEIGHT - 150;
    const heightVar = Math.sin(startX * 0.003) * 100; 
    const treeHeight = baseHeight + heightVar + randomRange(-300, 300);
    
    const treeX = startX + randomRange(0, 400);

    if (isCave && Math.random() < 0.6) {
        const stalactiteY = -50;
        entities.current.push({ id: `stalactite-${startX}`, position: { x: treeX, y: stalactiteY }, width: 40, height: randomRange(200, 400), color: '#546E7A', type: 'stalactite', biome, polyPoints: createTreePoly(treeX, 0, 'CAVE') });
        if (Math.random() < 0.4) entities.current.push({ id: `sticky-web-${startX}`, position: { x: treeX + 40, y: stalactiteY + 150 }, width: 100, height: 100, color: 'rgba(255, 255, 255, 0.3)', type: 'web', biome });
    }

    if (Math.random() < 0.4 && !isTutorial && !isCave) {
        entities.current.push({ id: `updraft-${startX}`, position: { x: startX, y: CANVAS_HEIGHT + 600 }, width: 80, height: 800, color: 'rgba(255,255,255,0.1)', type: 'updraft', biome });
    }

    if (isSwamp && Math.random() < 0.3) {
        if (Math.random() > 0.5) entities.current.push({ id: `waterfall-${startX}`, position: { x: startX + 100, y: -500 }, width: 60, height: 1500, color: 'rgba(33, 150, 243, 0.4)', type: 'waterfall', biome });
        else entities.current.push({ id: `water_pocket-${startX}`, position: { x: startX + 100, y: CANVAS_HEIGHT - 400 - Math.random() * 200 }, width: randomRange(80, 120), height: randomRange(80, 120), color: 'rgba(1, 87, 155, 0.7)', type: 'water_pocket', biome });
    }

    let liquidChance = 0.3;
    if (isSwamp) liquidChance = 0.8; 
    if (level.id === 6) liquidChance = 0.9; 
    
    if ((isSwamp || isVolcano) && Math.random() < liquidChance) {
        entities.current.push({ id: `fluid-${startX}`, position: { x: startX, y: CANVAS_HEIGHT - 40 }, width: randomRange(150, 400), height: 40, color: isVolcano ? '#D32F2F' : '#2E7D32', type: 'lake', biome });
        if (isSwamp && Math.random() < 0.5) entities.current.push({ id: `lily-${startX}`, position: { x: startX + randomRange(50, 100), y: CANVAS_HEIGHT - 45 }, width: 60, height: 10, color: '#81C784', type: 'lilypad', biome });
        if (isVolcano && Math.random() < 0.4) entities.current.push({ id: `magma-rock-${startX}`, position: { x: startX + randomRange(20, 100), y: CANVAS_HEIGHT - 45 }, width: 50, height: 15, color: '#5D4037', type: 'branch', biome, stability: 60 });
    }
    
    if (!isCave) {
        let trunkColor = isWinter ? '#5D4037' : (isVolcano ? '#212121' : '#3E2723');
        entities.current.push({ id: `trunk-${startX}`, position: { x: treeX - 15, y: CANVAS_HEIGHT - treeHeight }, width: 30, height: treeHeight + 3000, color: trunkColor, type: 'tree', health: 100, biome });

        let canopyColor = BIOMES[biome].treeColor;
        if (biome === 'AUTUMN') canopyColor = Math.random() > 0.5 ? '#D84315' : '#FFAB91';
        if (isVolcano) canopyColor = Math.random() > 0.7 ? '#4E342E' : '#3E2723';
        const canopyY = CANVAS_HEIGHT - treeHeight - 80;
        entities.current.push({ id: `canopy-${startX}`, position: { x: treeX - 60, y: canopyY }, width: 120, height: 120, color: canopyColor, type: 'tree', polyPoints: createTreePoly(treeX, CANVAS_HEIGHT - treeHeight + 40, biome), health: 100, biome });
        
        if (Math.random() < 0.3) entities.current.push({ id: `vine-${startX}`, position: { x: treeX + randomRange(-40, 40), y: canopyY + 80 }, width: 4, height: randomRange(150, 300), color: '#4CAF50', type: 'vine', biome });
    }

    let numBranches = isTutorial ? 5 : (currentBiome === 'JUNGLE' ? Math.floor(randomRange(2, 4)) : Math.floor(randomRange(3, 6)));
    if (isL2Tutorial) { const d = startX / 20; if (d > 200 && d < 400) numBranches = 5; }
    if (isCave || isSwamp) numBranches += 1;
    
    const branchSpread = currentBiome === 'JUNGLE' ? 800 : 300; 

    if ((currentBiome === 'JUNGLE' || currentBiome === 'SWAMP') && Math.random() < 0.4 && !isTutorial) {
        entities.current.push({ id: `low-branch-${startX}`, position: { x: treeX + (Math.random() > 0.5 ? 20 : -100), y: CANVAS_HEIGHT - 150 }, width: 100, height: 15, color: '#5D4037', type: 'branch', biome, stability: 60, isBroken: false });
    }

    for (let b = 0; b < numBranches; b++) {
         const depthStep = branchSpread / (numBranches || 1);
         const depthLevel = b * depthStep;
         const branchY = CANVAS_HEIGHT - treeHeight + 50 + depthLevel + randomRange(-30, 30);
         const dir = Math.random() > 0.5 ? 1 : -1;
         const branchW = randomRange(80, 150);
         const branchX = treeX + (dir === 1 ? 15 : -branchW + 15); 
         const branchId = `branch-${startX}-${b}`;
         if (branchY > CANVAS_HEIGHT - 50) continue;

         entities.current.push({ id: branchId, position: { x: branchX, y: branchY }, width: branchW, height: 15, color: isVolcano ? '#333' : (isWinter ? '#455A64' : '#4E342E'), type: 'branch', biome, stability: isTutorial ? 999 : 40, isBroken: false });
         if (currentBiome === 'JUNGLE' && Math.random() < 0.3) entities.current.push({ id: `flower-${branchId}`, position: { x: branchX + randomRange(10, branchW-10), y: branchY - 10 }, width: 10, height: 10, color: Math.random() > 0.5 ? '#E91E63' : '#9C27B0', type: 'flower', biome });
         if (currentBiome === 'JUNGLE' && Math.random() < 0.1 && b < 2) entities.current.push({ id: `nest-${branchId}`, position: { x: branchX + branchW/2 - 15, y: branchY - 15 }, width: 30, height: 15, color: '#795548', type: 'nest', biome });
    }

    const spawnChance = Math.min(0.9, 0.2 + difficulty * 0.1); 
    if ((Math.random() < spawnChance && startX > 500 && !isTutorial) || (currentBiome === 'JUNGLE' && Math.random() < 0.3 && !isTutorial)) {
      const allowed: Enemy['enemyType'][] = currentBiome === 'JUNGLE' ? ['bird'] : level.allowedEnemies;
      if (allowed.length === 0 && currentBiome !== 'JUNGLE') return;
      const count = difficulty > 5 && Math.random() < 0.4 ? 2 : 1; 

      for(let i=0; i<count; i++) {
        let enemyType = allowed[Math.floor(Math.random() * allowed.length)];
        if (currentBiome === 'JUNGLE') enemyType = 'bird';

        let pos = { x: startX + randomRange(100, 300) + (i*50), y: randomRange(100, 400) };
        let vel = { x: -2, y: 0 };
        let anchorX = 0;

        if (isL2Tutorial) {
            const d = startX / 20;
            if (d > 500 && d < 600) { enemyType = 'bird'; pos.y = CANVAS_HEIGHT - 300; } else continue; 
        }

        if (enemyType === 'spider') {
            pos.x = treeX + (i*30); pos.y = CANVAS_HEIGHT - treeHeight + randomRange(300, 700); vel.y = 1;
            if (i===0) entities.current.push({ id: `web-${startX}`, position: { x: pos.x - 70, y: pos.y + 50 }, width: 140, height: 140, color: 'rgba(255,255,255,0.4)', type: 'web', biome });
        } else if (enemyType === 'eagle' || enemyType === 'bird') {
            pos.y = randomRange(40, 300); vel.x = enemyType === 'eagle' ? -3 : -2;
        } else if (enemyType === 'troll') {
            pos.x = startX + randomRange(100, 300); pos.y = 200; anchorX = pos.x; 
        } else if (enemyType === 'bat') {
             pos.y = randomRange(50, 200); vel.x = -4; vel.y = 2; 
        } else if (enemyType === 'slug') {
             const branch = entities.current.find(e => e.type === 'branch' && e.position.x > startX);
             if (branch) { pos.x = branch.position.x + 10; pos.y = branch.position.y - 20; vel.x = 0.5; vel.y = 0; } else continue; 
        }

        enemies.current.push({ id: `enemy-${startX}-${i}`, position: pos, velocity: vel, width: enemyType === 'eagle' ? 80 : (enemyType === 'troll' ? 50 : 35), height: enemyType === 'eagle' ? 40 : (enemyType === 'troll' ? 60 : 35), color: '#000', type: 'enemy', enemyType: enemyType, health: 1, anchorY: pos.y, anchorX: anchorX, swingAngle: 0, state: 0, attackTimer: 0, biome });
      }
    }
  };

  const startGame = useCallback((levelId: number) => {
    const level = LEVELS[levelId - 1];
    if (level.id > saveData.maxLevelReached) return;

    setSelectedLevelId(levelId);
    selectedLevelRef.current = levelId;
    setCurrentBiome(level.biome);
    
    // Reset State
    setScore(0);
    setDistance(0);
    setRunTokens(0);
    setPlayerLives(MAX_LIVES);
    setIsInvincible(false);
    setFallTimerDisplay(null);
    setGameState(GameState.PLAYING);
    setWeather({ type: level.allowedWeather[0] || 'CLEAR', timer: randomRange(2000, 5000) });
    setSkillChainUI({ active: false, currentScore: 0, multiplier: 1, events: [], timer: 0, rank: 'GROOVIN' });

    // Reset Monkey
    monkey.current = {
      position: { x: 200, y: 300 },
      velocity: { x: 5, y: 0 },
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
      ropeTimer: 0, 
      maxSpeedAchieved: 0,
      causeOfDeath: ''
    };

    // Reset Environment
    entities.current = [];
    enemies.current = [];
    particles.current = [];
    floatingTexts.current = [];
    scoreRef.current = 0;
    distanceRef.current = 0;
    runTokensRef.current = 0;
    cameraOffset.current = { x: 0, y: 0 };
    shakeIntensity.current = 0;

    // Reset Tutorial
    if (level.tutorialType !== 'NONE') {
        setTutorial({ active: true, currentStep: level.tutorialType === 'ADVANCED' ? 'L2_INTRO' : 'WELCOME', showBox: false, message: "", timer: level.tutorialType === 'ADVANCED' ? 180 : 0 });
    } else {
        setTutorial({ active: false, currentStep: 'WELCOME', showBox: false, message: "" });
    }

    spawnLevelSegment(500);
    spawnLevelSegment(1000);
  }, [saveData]);

  const handleGameOver = useCallback((isWin: boolean) => {
    const currentState = isWin ? GameState.LEVEL_COMPLETE : GameState.GAME_OVER;
    setGameState(currentState);
    if (!isMuted) SoundSynth.playCrash();
    
    const newTotalTokens = saveDataRef.current.totalTokens + runTokensRef.current;
    const newHighScore = Math.max(saveDataRef.current.highScore, scoreRef.current);
    
    setSaveData(prev => ({
        ...prev,
        totalTokens: newTotalTokens,
        highScore: newHighScore
    }));

  }, [currentBiome, isMuted]);

  const takeDamage = (amount: number, cause: string = "Collision") => {
    const player = monkey.current;
    if (isInvincible || player.invulnerableTime > 0) return;

    if (player.armorStack > 0) {
        player.armorStack--;
        spawnFloatingText(player.position.x, player.position.y, "ARMOR BROKE!", "#999", 20);
        addShake(5);
        if (!isMuted) SoundSynth.playCrash();
        player.invulnerableTime = INVULNERABILITY_TIME;
        return;
    }

    player.lives -= amount;
    setPlayerLives(player.lives);
    addShake(10);
    player.invulnerableTime = INVULNERABILITY_TIME;
    
    if (player.lives <= 0) {
        player.causeOfDeath = cause;
        handleGameOver(false);
    } else {
        spawnFloatingText(player.position.x, player.position.y, "OUCH!", "#D50000", 30);
        if (!isMuted) SoundSynth.playCrash();
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
         if (dist < bestDist) { bestDist = dist; bestTarget = e; }
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
          if (Math.random() < 0.3) particles.current.push({ position: { x: camX + Math.random() * CANVAS_WIDTH + 200, y: camY - 100 }, velocity: { x: -5, y: 15 + Math.random() * 5 }, life: 60, maxLife: 60, color: '#4FC3F7', size: 2, type: 'rain' });
      } else if (biome === 'WINTER') {
           if (Math.random() < 0.2) particles.current.push({ position: { x: camX + Math.random() * CANVAS_WIDTH, y: camY - 100 }, velocity: { x: Math.random() * 2 - 1, y: 2 + Math.random() }, life: 120, maxLife: 120, color: '#FFF', size: 3, type: 'snow' });
      } else if (biome === 'VOLCANO') {
          if (Math.random() < 0.2) particles.current.push({ position: { x: camX + Math.random() * CANVAS_WIDTH, y: camY + CANVAS_HEIGHT }, velocity: { x: Math.random() * 2 - 1, y: -(1 + Math.random()) }, life: 120, maxLife: 120, color: '#9E9E9E', size: 3, type: 'ash' });
      } else if (type === 'WINDY') {
           if (Math.random() < 0.1) particles.current.push({ position: { x: camX - 100, y: camY + Math.random() * CANVAS_HEIGHT }, velocity: { x: 15 + Math.random() * 5, y: Math.random() * 2 - 1 }, life: 60, maxLife: 60, color: 'rgba(255,255,255,0.1)', size: 40, type: 'wind' });
      }
  };

  const drawMapLobby = (ctx: CanvasRenderingContext2D) => {
     ctx.fillStyle = "#263238"; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
     const g1 = ctx.createRadialGradient(CANVAS_WIDTH*0.15, CANVAS_HEIGHT*0.7, 50, CANVAS_WIDTH*0.15, CANVAS_HEIGHT*0.7, 400);
     g1.addColorStop(0, "rgba(27, 94, 32, 0.4)"); g1.addColorStop(1, "rgba(27, 94, 32, 0)"); ctx.fillStyle = g1; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
     const g2 = ctx.createRadialGradient(CANVAS_WIDTH*0.4, CANVAS_HEIGHT*0.5, 50, CANVAS_WIDTH*0.4, CANVAS_HEIGHT*0.5, 300);
     g2.addColorStop(0, "rgba(2, 119, 189, 0.4)"); g2.addColorStop(1, "rgba(2, 119, 189, 0)"); ctx.fillStyle = g2; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
     const g3 = ctx.createRadialGradient(CANVAS_WIDTH*0.85, CANVAS_HEIGHT*0.2, 50, CANVAS_WIDTH*0.85, CANVAS_HEIGHT*0.2, 500);
     g3.addColorStop(0, "rgba(191, 54, 12, 0.5)"); g3.addColorStop(1, "rgba(191, 54, 12, 0)"); ctx.fillStyle = g3; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

     ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 2;
     for(let i=0; i<5; i++) {
         ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT - i*150);
         ctx.bezierCurveTo(CANVAS_WIDTH/3, CANVAS_HEIGHT - i*150 - 100, CANVAS_WIDTH*2/3, CANVAS_HEIGHT - i*150 + 100, CANVAS_WIDTH, CANVAS_HEIGHT - i*150); ctx.stroke();
     }

     mapPropsRef.current.forEach(prop => {
         const { x, y, type, scale } = prop;
         ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
         if (type === 'tree' || type === 'pine') {
             ctx.fillStyle = type === 'tree' ? '#2E7D32' : '#1B5E20';
             ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(15, 0); ctx.lineTo(-15, 0); ctx.fill();
             if (type === 'tree') { ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(12, -20); ctx.lineTo(-12, -20); ctx.fill(); }
         } else if (type === 'wave') {
             ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-10, 0, 10, 0, Math.PI, true); ctx.arc(10, 0, 10, 0, Math.PI, false); ctx.stroke();
         } else if (type === 'cave') {
             ctx.fillStyle = "#212121"; ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI, 0); ctx.fill();
         } else if (type === 'mountain') {
             ctx.fillStyle = '#3E2723'; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(30, 20); ctx.lineTo(-30, 20); ctx.fill();
             ctx.fillStyle = '#FF5722'; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(8, -25); ctx.lineTo(-8, -25); ctx.fill();
         } else if (type === 'rock') { ctx.fillStyle = '#455A64'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI, true); ctx.fill(); }
         ctx.restore();
     });

     const drawLabel = (txt: string, x: number, y: number, r: number) => {
         ctx.save(); ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.font = "bold 40px 'VT323'"; ctx.textAlign = "center";
         ctx.translate(x, y); ctx.rotate(r); ctx.fillText(txt, 0, 0); ctx.restore();
     }
     drawLabel("ELVEN KINGDOM", CANVAS_WIDTH*0.2, CANVAS_HEIGHT*0.8, -0.1);
     drawLabel("GREAT LAKE", CANVAS_WIDTH*0.5, CANVAS_HEIGHT*0.6, 0.1);
     drawLabel("TROLL VALLEY", CANVAS_WIDTH*0.65, CANVAS_HEIGHT*0.4, -0.15);
     drawLabel("MT. DOOM", CANVAS_WIDTH*0.85, CANVAS_HEIGHT*0.25, 0.1);

     ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 4; ctx.setLineDash([15, 10]);
     ctx.beginPath();
     LEVELS.forEach((level, i) => {
         const x = 100 + (i * (CANVAS_WIDTH - 200) / (LEVELS.length - 1));
         const y = CANVAS_HEIGHT - 100 - (i * (CANVAS_HEIGHT - 150) / (LEVELS.length - 1)) + Math.sin(i * 1.5) * 50;
         if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x,y);
     });
     ctx.stroke(); ctx.setLineDash([]);

     LEVELS.forEach((level, i) => {
         const x = 100 + (i * (CANVAS_WIDTH - 200) / (LEVELS.length - 1));
         const y = CANVAS_HEIGHT - 100 - (i * (CANVAS_HEIGHT - 150) / (LEVELS.length - 1)) + Math.sin(i * 1.5) * 50;
         const isLocked = level.id > saveData.maxLevelReached;
         const isCurrent = level.id === saveData.maxLevelReached;
         ctx.beginPath();
         const radius = isCurrent ? 25 + Math.sin(Date.now() * 0.005)*3 : 20;
         ctx.arc(x, y, radius, 0, Math.PI * 2);
         let nodeColor = "#546E7A";
         if (!isLocked) {
             const biomeConfig = BIOMES[level.biome]; nodeColor = biomeConfig.treeColor;
             if (level.biome === 'SWAMP') nodeColor = '#0288D1';
             if (level.biome === 'VOLCANO') nodeColor = '#D84315';
             if (level.biome === 'CAVE') nodeColor = '#424242';
             if (level.id <= 2) nodeColor = '#66BB6A';
         }
         ctx.fillStyle = nodeColor; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = isCurrent ? "#FFF" : "rgba(0,0,0,0.5)"; ctx.stroke();
         if (isCurrent) {
             const bounceY = y - 40 + Math.sin(Date.now() * 0.01) * 10;
             ctx.fillStyle = "#795548"; ctx.fillRect(x - 15, bounceY - 15, 30, 30);
             ctx.fillStyle = "#FFECB3"; ctx.fillRect(x - 10, bounceY - 5, 20, 10);
             ctx.fillStyle = "#000"; ctx.fillRect(x - 8, bounceY - 2, 4, 4); ctx.fillRect(x + 4, bounceY - 2, 4, 4);
         }
     });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
     if (gameState === GameState.MENU || gameState === GameState.SHOP) { 
         drawMapLobby(ctx); 
         if (gameState === GameState.SHOP) {
             ctx.fillStyle = "rgba(0,0,0,0.5)";
             ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
         }
         return; 
     }

     const config = BIOMES[currentBiome];
    const targetSky = config.skyColors;
    const lerpFactor = 0.005;
    const c1 = lerpColor(skyColorCurrent[0], targetSky[0], lerpFactor);
    const c2 = lerpColor(skyColorCurrent[1], targetSky[1], lerpFactor);
    if (c1 !== skyColorCurrent[0]) setSkyColorCurrent([c1, c2]);

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, skyColorCurrent[0]); gradient.addColorStop(1, skyColorCurrent[1]);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    bgLayers.current.forEach(layer => {
        const parallaxX = (layer.x - cameraOffset.current.x * layer.speed) % 2000;
        const drawX = parallaxX < -100 ? parallaxX + 2000 : parallaxX;
        ctx.fillStyle = layer.color;
        if (layer.speed < 0.08) { ctx.filter = 'blur(2px)'; ctx.globalAlpha = 0.8; } 
        else { ctx.filter = 'none'; ctx.globalAlpha = 1.0; }

        if (layer.type === 0) { ctx.beginPath(); ctx.arc(drawX, layer.y - cameraOffset.current.y * 0.1, layer.size * 100, 0, Math.PI * 2); ctx.fill(); }
        else if (layer.type === 3) {
            const sway = Math.sin(Date.now() * 0.001 + layer.shapeVar!) * 5;
            const w = layer.size * 20; const h = layer.size * 150;
            ctx.beginPath(); ctx.moveTo(drawX, layer.y + 100); ctx.lineTo(drawX + sway, layer.y - h); ctx.lineTo(drawX + w, layer.y + 100); ctx.fill();
        } else if (layer.type === 1) { ctx.fillRect(drawX, layer.y, 2, layer.size); } 
        else if (layer.type === 2) { ctx.beginPath(); ctx.ellipse(drawX, layer.y, 40 * layer.size, 20 * layer.size, 0, 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.filter = 'none'; ctx.globalAlpha = 1.0;

    const sx = (Math.random() - 0.5) * shakeIntensity.current;
    const sy = (Math.random() - 0.5) * shakeIntensity.current;
    ctx.save(); ctx.translate(-cameraOffset.current.x + sx, -cameraOffset.current.y + sy);

    entities.current.forEach(entity => {
      if (entity.type === 'portal') {
          const pulsate = Math.sin(Date.now() * 0.005) * 10;
          const gradient = ctx.createRadialGradient(entity.position.x + entity.width/2, entity.position.y + entity.height/2, 20, entity.position.x + entity.width/2, entity.position.y + entity.height/2, 120 + pulsate);
          gradient.addColorStop(0, '#FFFFFF'); gradient.addColorStop(0.5, '#00E676'); gradient.addColorStop(1, 'rgba(0, 230, 118, 0)');
          ctx.fillStyle = gradient; ctx.fillRect(entity.position.x - 50, entity.position.y - 50, entity.width + 100, entity.height + 100);
          ctx.strokeStyle = "#FFF"; ctx.lineWidth = 5; ctx.strokeRect(entity.position.x, entity.position.y, entity.width, entity.height);
          return;
      }
      if (entity.type === 'tree' || entity.type === 'coin' || entity.type === 'branch' || entity.type === 'stalactite') {
        if (entity.type === 'branch' && entity.isBroken && entity.angle) {
             ctx.save(); ctx.translate(entity.position.x + entity.width/2, entity.position.y + entity.height/2); ctx.rotate(entity.angle);
             ctx.fillStyle = entity.color; ctx.fillRect(-entity.width/2, -entity.height/2, entity.width, entity.height); ctx.restore(); return;
        }
        if (entity.type === 'branch' && entity.stability !== undefined && entity.stability < 20) {
             const wobble = Math.sin(Date.now() * 0.5) * 2;
             ctx.fillStyle = entity.color; ctx.fillRect(entity.position.x, entity.position.y + wobble, entity.width, entity.height); return;
        }
        if (entity.polyPoints) drawPoly(ctx, entity.polyPoints, entity.color);
        else { ctx.fillStyle = entity.color; ctx.fillRect(entity.position.x, entity.position.y, entity.width, entity.height); }
      } else if (entity.type === 'vine') {
          ctx.strokeStyle = entity.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(entity.position.x, entity.position.y);
          ctx.quadraticCurveTo(entity.position.x + Math.sin(Date.now() * 0.003 + entity.position.x)*20, entity.position.y + entity.height/2, entity.position.x, entity.position.y + entity.height); ctx.stroke();
      } else if (entity.type === 'web') {
          ctx.strokeStyle = entity.color; ctx.lineWidth = 1; ctx.beginPath(); const cx = entity.position.x + entity.width/2; const cy = entity.position.y + entity.height/2;
          for(let r=0; r<entity.width/2; r+=15) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke(); }
          for(let a=0; a<Math.PI*2; a+=Math.PI/4) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a)*entity.width/2, cy + Math.sin(a)*entity.height/2); ctx.stroke(); }
      } else if (entity.type === 'lilypad') {
           ctx.fillStyle = entity.color; ctx.beginPath(); const lx = entity.position.x + entity.width/2; const ly = entity.position.y + entity.height/2;
           ctx.ellipse(lx, ly, entity.width/2, entity.height/2, 0, 0, Math.PI * 2); ctx.fill();
           ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, entity.width/2 + 2, 0, 0.5); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      } else if (entity.type === 'flower') {
          ctx.fillStyle = entity.color; ctx.beginPath(); ctx.arc(entity.position.x + 5, entity.position.y + 5, 5, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#FFEB3B"; ctx.beginPath(); ctx.arc(entity.position.x + 5, entity.position.y + 5, 2, 0, Math.PI*2); ctx.fill();
      } else if (entity.type === 'nest') {
          ctx.fillStyle = entity.color; ctx.beginPath(); ctx.arc(entity.position.x + 15, entity.position.y + 15, 15, 0, Math.PI, false); ctx.fill();
          ctx.fillStyle = "#FFF"; ctx.beginPath(); ctx.ellipse(entity.position.x + 10, entity.position.y + 18, 4, 5, 0.2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(entity.position.x + 20, entity.position.y + 18, 4, 5, -0.2, 0, Math.PI*2); ctx.fill();
      } else if (entity.type === 'waterfall') {
          ctx.fillStyle = entity.color; ctx.fillRect(entity.position.x, entity.position.y, entity.width, entity.height);
          ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); const offset = (Date.now() * 0.2) % 20;
          for(let i=0; i<entity.width; i+=10) { ctx.moveTo(entity.position.x + i, entity.position.y + offset); ctx.lineTo(entity.position.x + i, entity.position.y + entity.height); } ctx.stroke();
      } else if (entity.type === 'water_pocket') {
          ctx.fillStyle = entity.color; ctx.strokeStyle = "rgba(129, 212, 250, 0.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(entity.position.x, entity.position.y, entity.width, entity.height); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          for(let i=0; i<5; i++) { const seed = i * 1337; const bx = entity.position.x + ((Date.now() * 0.02 + seed) % entity.width); const by = entity.position.y + entity.height - ((Date.now() * 0.05 + seed) % entity.height); ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill(); }
      } else { ctx.fillStyle = entity.color; ctx.fillRect(entity.position.x, entity.position.y, entity.width, entity.height); }
    });
    
    enemies.current.forEach(enemy => {
        const cx = enemy.position.x + enemy.width/2; const cy = enemy.position.y + enemy.height/2; ctx.fillStyle = enemy.color;
        if (enemy.enemyType === 'eagle' || enemy.enemyType === 'bird') {
             ctx.beginPath(); ctx.ellipse(cx, cy, enemy.width/3, enemy.height/2, 0, 0, Math.PI*2); ctx.fill();
             const wingY = cy - Math.sin(Date.now() * 0.02) * 20; const wingXOffset = enemy.width/2 + 10;
             ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.quadraticCurveTo(cx - 20, wingY, cx - wingXOffset, cy - 10); ctx.lineTo(cx - 5, cy + 5); ctx.fill();
             ctx.beginPath(); ctx.moveTo(cx + 5, cy); ctx.quadraticCurveTo(cx + 20, wingY, cx + wingXOffset, cy - 10); ctx.lineTo(cx + 5, cy + 5); ctx.fill();
        } else if (enemy.enemyType === 'spider') {
             if (enemy.anchorY !== undefined) { ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, enemy.anchorY); ctx.stroke(); }
             ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "red"; ctx.fillRect(cx-4, cy-2, 2, 2); ctx.fillRect(cx+2, cy-2, 2, 2);
        } else if (enemy.enemyType === 'troll') {
             if (enemy.anchorY !== undefined && enemy.anchorX !== undefined) { ctx.strokeStyle = "#558B2F"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(enemy.anchorX, 200); ctx.stroke(); }
             ctx.fillStyle = "#33691E"; ctx.fillRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height);
             ctx.fillStyle = "#5D4037"; ctx.save(); ctx.translate(cx + 20, cy); ctx.rotate(Math.sin(Date.now()*0.01)); ctx.fillRect(0, -5, 40, 10); ctx.restore();
             ctx.fillStyle = "red"; ctx.fillRect(cx-10, cy-10, 5, 5); ctx.fillRect(cx+5, cy-10, 5, 5);
        } else if (enemy.enemyType === 'bat') {
             ctx.fillStyle = "#263238"; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2); ctx.fill();
             const flap = Math.sin(Date.now() * 0.05) * 10;
             ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx-20, cy-flap); ctx.lineTo(cx-10, cy+10); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+20, cy-flap); ctx.lineTo(cx+10, cy+10); ctx.fill();
             ctx.fillStyle = "white"; ctx.fillRect(cx-4, cy-2, 2, 2); ctx.fillRect(cx+2, cy-2, 2, 2);
        } else { ctx.fillRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height); }
    });

    const player = monkey.current;
    
    if (player.isSwinging && player.tetherPoint) {
      const isStressed = player.ropeTimer < 3.0 && saveData.upgrades.ropeLength < 5;
      const isCritical = player.ropeTimer < 1.0;
      const flash = Math.floor(Date.now() / 50) % 2 === 0;
      ctx.strokeStyle = isStressed ? (flash ? (isCritical ? '#FF0000' : '#FF5252') : '#FFF') : '#5D4037';
      ctx.lineWidth = 4;
      
      let anchorX = player.tetherPoint.x; let anchorY = player.tetherPoint.y;
      if (isStressed) { const slipAmount = (3.0 - player.ropeTimer) * 4; anchorX += (Math.random() - 0.5) * slipAmount; anchorY += (Math.random() - 0.5) * slipAmount; }
      const currentDist = Math.hypot(anchorX - (player.position.x+15), anchorY - (player.position.y+15));
      const maxLen = player.ropeLength;
      ctx.beginPath(); const shakeX = isCritical ? (Math.random() - 0.5) * 8 : 0; ctx.moveTo(player.position.x + 15 + shakeX, player.position.y + 15);
      if (currentDist < maxLen - 10) {
          const midX = (player.position.x + 15 + anchorX) / 2; const midY = (player.position.y + 15 + anchorY) / 2; const sagAmount = (maxLen - currentDist) * 0.8; 
          ctx.quadraticCurveTo(midX, midY + sagAmount, anchorX, anchorY);
      } else { ctx.lineTo(anchorX, anchorY); }
      ctx.stroke();
      if (isStressed && Math.random() < 0.3) spawnParticles(anchorX + (player.position.x - anchorX) * 0.1, anchorY + (player.position.y - anchorY) * 0.1, "#8D6E63", 1, 1);
    }

    if (tutorial.active && tutorial.showBox) {
        if ((tutorial.currentStep === 'MOMENTUM' || tutorial.currentStep === 'L2_MOMENTUM') && player.isSwinging) {
            const isMovingRight = player.velocity.x > 0; const hintKey = isMovingRight ? 'D' : 'A'; const hintX = player.position.x + (isMovingRight ? 60 : -60);
            ctx.save(); ctx.translate(hintX, player.position.y);
            ctx.fillStyle = "#FFF"; ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.fillRect(-15, -15, 30, 30); ctx.strokeRect(-15, -15, 30, 30);
            ctx.fillStyle = "#000"; ctx.font = "bold 20px 'VT323'"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(hintKey, 0, 0);
            const pulsate = (Math.sin(Date.now() * 0.01) + 1) * 0.5; ctx.strokeStyle = `rgba(255, 255, 255, ${pulsate})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            const speed = Math.hypot(player.velocity.x, player.velocity.y); const maxTutorialSpeed = 22; const ratio = Math.min(speed / maxTutorialSpeed, 1);
            ctx.save(); ctx.translate(player.position.x + 15, player.position.y + 60); ctx.fillStyle = "#333"; ctx.fillRect(-30, 0, 60, 10); ctx.fillStyle = ratio > 0.8 ? "#00E676" : "#FFC107"; ctx.fillRect(-28, 2, 56 * ratio, 6); ctx.strokeStyle = "#FFF"; ctx.lineWidth = 1; ctx.strokeRect(-30, 0, 60, 10); ctx.restore();
        }
        if (tutorial.currentStep === 'GRAPPLE' && !player.isSwinging) {
             const tree = entities.current.find(e => e.type === 'tree' && e.position.x > player.position.x + 100);
             if (tree) { const cx = tree.position.x + tree.width/2; const cy = tree.position.y + tree.height/2; ctx.save(); ctx.translate(cx, cy); const bob = Math.sin(Date.now() * 0.01) * 10; ctx.fillStyle = "rgba(255,255,0,0.5)"; ctx.beginPath(); ctx.arc(0, 0, 40 + bob, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
        }
    }

    if (smartTargetRef.current && !player.isSwinging) {
        const t = smartTargetRef.current; let cx = t.position.x + t.width/2; let cy = t.position.y + t.height/2;
        if (t.type === 'vine' || t.type === 'stalactite') { cx = t.position.x; const mouseWY = inputRef.current.mousePos.y + cameraOffset.current.y; cy = Math.max(t.position.y, Math.min(mouseWY, t.position.y + t.height)); }
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(Date.now() * 0.005); ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }

    if (player.trail.length > 1) {
        ctx.beginPath(); ctx.moveTo(player.trail[0].x, player.trail[0].y); for(let i=1; i<player.trail.length; i++) ctx.lineTo(player.trail[i].x, player.trail[i].y);
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 10; ctx.stroke();
    }

    ctx.save(); ctx.translate(player.position.x + 15, player.position.y + 15);
    if (player.jumpCooldown > 0) { ctx.beginPath(); ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 3; ctx.arc(0, 0, 25, 0, Math.PI * 2 * (player.jumpCooldown / JUMP_COOLDOWN_FRAMES)); ctx.stroke(); }
    ctx.rotate(player.rotation);
    ctx.fillStyle = player.freezeTime > 0 ? '#4FC3F7' : (player.isFever ? '#FFEB3B' : '#795548');
    if (saveData.equippedSkin === 'skin_cyber') ctx.fillStyle = '#00E5FF'; else if (saveData.equippedSkin === 'skin_golden') ctx.fillStyle = '#FFD700'; else if (saveData.equippedSkin === 'skin_winter') ctx.fillStyle = '#ECEFF1'; else if (saveData.equippedSkin === 'skin_ninja') ctx.fillStyle = '#212121';
    if (isInvincible && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.fillRect(-15, -15, 30, 30);

    const speed = Math.hypot(player.velocity.x, player.velocity.y);
    let faceState = 'NEUTRAL';
    if (player.invulnerableTime > 0) faceState = 'PAIN'; else if ((player.ropeTimer < 1.0 && player.isSwinging) || (fallTimerDisplay && fallTimerDisplay > 0)) faceState = 'SCARED'; else if (speed > 18 || player.isFever) faceState = 'EXCITED';

    ctx.fillStyle = '#FFF';
    if (faceState === 'PAIN') { ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12 + player.eyeOffset.x, -8); ctx.lineTo(-4 + player.eyeOffset.x, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4 + player.eyeOffset.x, -8); ctx.lineTo(12 + player.eyeOffset.x, 0); ctx.stroke(); } 
    else if (faceState === 'SCARED') { ctx.fillRect(-11 + player.eyeOffset.x, -7 + player.eyeOffset.y, 10, 10); ctx.fillRect(1 + player.eyeOffset.x, -7 + player.eyeOffset.y, 10, 10); ctx.fillStyle = '#000'; ctx.fillRect(-8 + player.eyeOffset.x, -4 + player.eyeOffset.y, 4, 4); ctx.fillRect(4 + player.eyeOffset.x, -4 + player.eyeOffset.y, 4, 4); } 
    else { ctx.fillRect(-10 + player.eyeOffset.x, -5 + player.eyeOffset.y, 8, 8); ctx.fillRect(2 + player.eyeOffset.x, -5 + player.eyeOffset.y, 8, 8); ctx.fillStyle = '#000'; ctx.fillRect(-8 + player.eyeOffset.x, -3 + player.eyeOffset.y, 4, 4); ctx.fillRect(4 + player.eyeOffset.x, -3 + player.eyeOffset.y, 4, 4); }

    ctx.fillStyle = '#3E2723'; 
    if (faceState === 'EXCITED') { ctx.beginPath(); ctx.arc(0, 5, 5, 0, Math.PI); ctx.fill(); } else if (faceState === 'SCARED') { ctx.beginPath(); ctx.ellipse(0, 6, 4, 2, 0, 0, Math.PI*2); ctx.fill(); } else if (faceState === 'PAIN') { ctx.beginPath(); ctx.moveTo(-5, 6); ctx.bezierCurveTo(-2, 2, 2, 2, 5, 6); ctx.stroke(); } else { ctx.fillRect(-4, 5, 8, 2); }

    if (player.armorStack > 0) { ctx.strokeStyle = '#A1887F'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.stroke(); }
    if (player.freezeTime > 0) { ctx.fillStyle = "rgba(179, 229, 252, 0.5)"; ctx.fillRect(-20, -20, 40, 40); ctx.strokeStyle = "#FFF"; ctx.strokeRect(-20, -20, 40, 40); }
    if (saveData.equippedSkin === 'skin_ninja') { ctx.fillStyle = '#D50000'; ctx.fillRect(-16, -18, 32, 6); ctx.fillRect(14, -16, 8, 4); }
    ctx.restore(); ctx.globalAlpha = 1.0;
    
    particles.current.forEach(p => {
         ctx.fillStyle = p.color;
         if (p.type === 'snow') { ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI*2); ctx.fill(); }
         else if (p.type === 'wood') { ctx.fillRect(p.position.x, p.position.y, p.size, p.size * 2); }
         else if (p.type === 'spore') { ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.002 + p.position.x) * 0.5; ctx.shadowBlur = 5; ctx.shadowColor = p.color; ctx.beginPath(); ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
         else if (p.type === 'ant') { ctx.fillRect(p.position.x, p.position.y, 3, 2); ctx.fillRect(p.position.x+4, p.position.y, 3, 2); }
         else { ctx.globalAlpha = p.life / p.maxLife; ctx.fillRect(p.position.x, p.position.y, p.size, p.size); ctx.globalAlpha = 1.0; }
    });
    floatingTexts.current.forEach(t => {
        ctx.font = `${t.size}px 'VT323', monospace`; ctx.fillStyle = t.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(t.text, t.position.x, t.position.y); ctx.fillText(t.text, t.position.x, t.position.y);
    });
    
    if (weatherRef.current.type === 'FOG') {
        const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT); grad.addColorStop(0, "rgba(176, 190, 197, 0.6)"); grad.addColorStop(1, "rgba(176, 190, 197, 0.2)"); ctx.fillStyle = grad; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (weatherRef.current.type === 'RAIN') { ctx.fillStyle = "rgba(0, 0, 50, 0.1)"; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }

    ctx.restore();
    
    // VISUAL ONLY: Use state for UI, logic uses REF
    if (fallTimerDisplay !== null) {
         const dangerRatio = fallTimerDisplay / VOID_TIMER_MAX_SECONDS; const opacity = 0.5 + Math.sin(Date.now() * 0.02) * 0.2;
         const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT-200, 0, CANVAS_HEIGHT); gradient.addColorStop(0, `rgba(255,0,0,0)`); gradient.addColorStop(1, `rgba(180,0,0,${Math.min(0.8, dangerRatio)})`); ctx.fillStyle = gradient; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
         ctx.fillStyle = "#FFF"; ctx.font = "40px 'VT323'"; const secondsLeft = Math.max(0, VOID_TIMER_MAX_SECONDS - fallTimerDisplay).toFixed(1); ctx.fillText(`VOID PULL! ${secondsLeft}s`, CANVAS_WIDTH/2 - 100, CANVAS_HEIGHT - 50);
    }
  };

  const updatePhysics = () => {
    // FIX: Loop continues for Menu/Shop to support animations
    if (isPaused) {
        requestRef.current = requestAnimationFrame(updatePhysics);
        return;
    }

    if (gameState === GameState.MENU || gameState === GameState.SHOP) {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.clearRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
            draw(ctx);
        }
        requestRef.current = requestAnimationFrame(updatePhysics);
        return;
    }

    const dt = 1/60;
    cycleWeather(dt*1000);
    if (Math.random() < 0.1) spawnWeatherParticles();

    const player = monkey.current;
    
    if (tutorial.active && tutorial.timer !== undefined) {
         if (tutorial.timer > 0) updateTutorial(1);
         else if (tutorial.currentStep === 'L2_INTRO' && tutorial.timer <= 0) updateTutorial(1);
    }

    if (player.jumpCooldown > 0) player.jumpCooldown--;

    const speed = Math.hypot(player.velocity.x, player.velocity.y);
    if (speed > player.maxSpeedAchieved) player.maxSpeedAchieved = speed;

    // --- PHYSICS UPDATE ---
    
    // 1. Gravity
    player.velocity.y += GRAVITY_BASE;

    // 2. Air Resistance
    player.velocity.x *= AIR_RESISTANCE;
    player.velocity.y *= AIR_RESISTANCE;

    // 3. Input Handling
    if (player.isSwinging && player.tetherPoint) {
        const dx = player.position.x - player.tetherPoint.x;
        const dy = player.position.y - player.tetherPoint.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Normalized vector from tether to player
        const nx = dx / dist; 
        const ny = dy / dist; 
        
        // Tangent vector (perpendicular to radius)
        // If hanging straight down (0, 1), tangent is (-1, 0) or (1, 0).
        // Let's define forward tangent as (-ny, nx).
        const tx = -ny; 
        const ty = nx; 
        
        // Input Force
        const force = 0.5 + (saveData.upgrades.swingForce * 0.1) + player.runForceBonus;
        
        if (inputRef.current.keys.right) {
            // Push forward
            player.velocity.x += tx * force;
            player.velocity.y += ty * force;
            if (tutorial.active && (tutorial.currentStep === 'WELCOME' || tutorial.currentStep === 'MOMENTUM' || tutorial.currentStep === 'L2_MOMENTUM')) updateTutorial(dt);
        }
        
        if (inputRef.current.keys.left) {
            // Push backward (limited)
            if (player.velocity.x > -12) { // Limit backward speed
                 player.velocity.x -= tx * force;
                 player.velocity.y -= ty * force;
            }
            if (tutorial.active && (tutorial.currentStep === 'WELCOME' || tutorial.currentStep === 'MOMENTUM' || tutorial.currentStep === 'L2_MOMENTUM')) updateTutorial(dt);
        }
        
        if (!tutorial.active) player.ropeTimer -= dt;
        if (player.ropeTimer <= 0 && !tutorial.active && saveData.upgrades.ropeLength < 5) {
             player.isSwinging = false; player.tetherPoint = null;
             spawnFloatingText(player.position.x, player.position.y, "SNAP!", "#D50000", 25);
             if (!isMuted) SoundSynth.playBranchBreak();
        }

    } else {
        // Air Control
        const airControl = saveData.upgrades.airControl * 0.05;
        if (inputRef.current.keys.right) player.velocity.x += 0.3 + airControl;
        if (inputRef.current.keys.left) player.velocity.x -= 0.3 + airControl;
        
        // Fast Fall
        if (inputRef.current.keys.down) player.velocity.y += 0.8; 
    }

    // 4. Update Position
    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y;

    // 5. Rope Constraint (Hard Constraint)
    if (player.isSwinging && player.tetherPoint) {
        const dx = player.position.x - player.tetherPoint.x;
        const dy = player.position.y - player.tetherPoint.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist >= player.ropeLength) {
            // A. Clamp Position
            const ratio = player.ropeLength / dist;
            player.position.x = player.tetherPoint.x + dx * ratio;
            player.position.y = player.tetherPoint.y + dy * ratio;
            
            // B. Remove Outward Radial Velocity (Inelastic Tether)
            const nx = dx / dist;
            const ny = dy / dist;
            const vDotN = player.velocity.x * nx + player.velocity.y * ny;
            
            if (vDotN > 0) { // Moving away from center
                player.velocity.x -= vDotN * nx;
                player.velocity.y -= vDotN * ny;
            }
        }
    }

    // 6. World Bounds
    if (player.position.y < CEILING_LIMIT) {
        player.position.y = CEILING_LIMIT;
        player.velocity.y *= -0.5;
    }
    
    const voidLimit = CANVAS_HEIGHT + 300;
    if (player.position.y > voidLimit) {
        if (player.hasUsedNet || saveData.upgrades.safetyNet === 0) {
             if (fallTimerDisplay === null) setFallTimerDisplay(VOID_TIMER_MAX_SECONDS);
             player.fallTimer += dt;
             if (player.fallTimer > VOID_TIMER_MAX_SECONDS) {
                 takeDamage(999, "Fell into the Void");
             }
        } else {
             player.velocity.y = -25;
             player.hasUsedNet = true;
             spawnFloatingText(player.position.x, player.position.y, "SAFETY NET!", "#4CAF50", 30);
             if (!isMuted) SoundSynth.playJump();
        }
    } else {
         if (player.fallTimer > 0) { player.fallTimer = 0; setFallTimerDisplay(null); }
    }
    
    player.trail.push({ x: player.position.x + 15, y: player.position.y + 15 });
    if (player.trail.length > 20) player.trail.shift();

    const targetCamX = player.position.x - CANVAS_WIDTH * 0.3;
    const targetCamY = Math.min(Math.max(player.position.y - CANVAS_HEIGHT * 0.5, -500), 500); 
    cameraOffset.current.x += (targetCamX - cameraOffset.current.x) * 0.1;
    cameraOffset.current.y += (targetCamY - cameraOffset.current.y) * 0.1;

    const newDist = Math.floor(player.position.x / 20);
    if (newDist > distanceRef.current) {
        setDistance(newDist);
        if (newDist % 50 === 0) setScore(s => s + 10);
    }
    
    const currentLevel = LEVELS[selectedLevelRef.current - 1];
    if (distanceRef.current >= currentLevel.targetDistance) {
        handleGameOver(true);
        if (selectedLevelRef.current === saveData.maxLevelReached && saveData.maxLevelReached < 10) {
            setSaveData(prev => ({ ...prev, maxLevelReached: prev.maxLevelReached + 1 }));
        }
    }

    if (player.position.x > entities.current.length * 50 - 2000) {
         const lastEntity = entities.current[entities.current.length - 1];
         if (lastEntity && player.position.x > lastEntity.position.x - 1000) {
              spawnLevelSegment(lastEntity.position.x + randomRange(300, 600));
         }
    }

    entities.current.forEach(entity => {
         if (checkCollision(player, entity)) {
             if (entity.type === 'coin') {
                 entity.position.y = -9999;
                 let amount = 1;
                 if (Math.random() < saveData.upgrades.luck * 0.1) { amount = 2; spawnFloatingText(entity.position.x, entity.position.y, "LUCKY!", "#FFD700", 20); }
                 setRunTokens(t => t + amount);
                 if (!isMuted) SoundSynth.playCoin();
                 spawnParticles(entity.position.x, entity.position.y, '#FFD700', 5);
             } else if (entity.type === 'portal') {
                 handleGameOver(true);
             } else if (entity.type === 'flower') {
                 entity.position.y = -9999;
                 player.velocity.y = -10;
                 spawnParticles(entity.position.x, entity.position.y, entity.color, 5);
             } else if (entity.type === 'web' && !player.isFever) {
                 player.velocity.x *= 0.8; player.velocity.y *= 0.8;
             }
         }
         
         if (entity.type === 'branch' && !entity.isBroken && entity.stability! < 50) {
             if (checkCollision({position: {x: player.position.x, y: player.position.y + 30}, width: 30, height: 1}, entity)) {
                 entity.stability! -= 1;
                 if (entity.stability! <= 0) {
                     entity.isBroken = true; entity.color = '#5D4037';
                     spawnParticles(entity.position.x + entity.width/2, entity.position.y, '#795548', 8, 4, 'wood');
                     if (!isMuted) SoundSynth.playBranchBreak();
                 }
             }
         }
    });

    enemies.current.forEach(enemy => {
        enemy.position.x += enemy.velocity.x;
        enemy.position.y += enemy.velocity.y;
        
        if (enemy.enemyType === 'spider' && enemy.anchorY) {
            if (enemy.position.y > enemy.anchorY + 100) enemy.velocity.y = -2;
            if (enemy.position.y < enemy.anchorY - 50) enemy.velocity.y = 2;
        }

        if (checkCollision(player, enemy) && enemy.health > 0) {
            takeDamage(1, `Hit by ${enemy.enemyType}`);
        }
    });

    entities.current = entities.current.filter(e => e.position.x > cameraOffset.current.x - 200 && e.position.y > -9000);
    enemies.current = enemies.current.filter(e => e.position.x > cameraOffset.current.x - 200);
    particles.current.forEach(p => { p.position.x += p.velocity.x; p.position.y += p.velocity.y; p.life--; });
    particles.current = particles.current.filter(p => p.life > 0);
    floatingTexts.current.forEach(t => { t.position.y += t.velocity.y; t.life--; });
    floatingTexts.current = floatingTexts.current.filter(t => t.life > 0);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        draw(ctx);
    }
    
    if (gameState === GameState.PLAYING) requestRef.current = requestAnimationFrame(updatePhysics);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, isPaused, currentBiome]);

  // --- INPUT HANDLING ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.keys.right = true;
          if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.keys.left = true;
          if (e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.keys.down = true;
          if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
              const player = monkey.current;
              if (player.jumpCooldown <= 0 && !player.isSwinging) {
                   player.velocity.y = -12;
                   player.jumpCooldown = JUMP_COOLDOWN_FRAMES;
                   spawnParticles(player.position.x, player.position.y + 30, '#FFF', 5, 2, 'wind');
                   if (!isMuted) SoundSynth.playJump();
                   if (tutorial.active && tutorial.currentStep === 'JUMP') updateTutorial(1);
                   if (tutorial.active && tutorial.currentStep === 'L2_BRANCH') updateTutorial(1);
              }
          }
      };
      const handleKeyUp = (e: KeyboardEvent) => {
          if (e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.keys.right = false;
          if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.keys.left = false;
          if (e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.keys.down = false;
      };
      const handleMouseDown = (e: MouseEvent) => {
          // Menu Level Selection handled by UI buttons now, or can keep as map click
          if (gameState === GameState.MENU) {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;
              
              // Only trigger level start if NOT clicking a UI element (handled by HTML buttons)
              // Since canvas is behind, we can leave this logic for map interaction
              LEVELS.forEach((level, i) => {
                 const x = 100 + (i * (CANVAS_WIDTH - 200) / (LEVELS.length - 1));
                 const y = CANVAS_HEIGHT - 100 - (i * (CANVAS_HEIGHT - 150) / (LEVELS.length - 1)) + Math.sin(i * 1.5) * 50;
                 if (Math.hypot(mouseX - x, mouseY - y) < 40) {
                     startGame(level.id);
                 }
              });
              return;
          }
          if (gameState !== GameState.PLAYING) return;
          inputRef.current.isMouseDown = true;
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const mouseX = e.clientX - rect.left + cameraOffset.current.x;
          const mouseY = e.clientY - rect.top + cameraOffset.current.y;
          
          const player = monkey.current;
          let target = findSmartTarget(mouseX, mouseY);
          
          if (!target) {
              entities.current.forEach(ent => {
                  if (ent.type === 'tree' || ent.type === 'branch' || ent.type === 'vine') {
                      const dist = Math.hypot((ent.position.x + ent.width/2) - mouseX, (ent.position.y + ent.height/2) - mouseY);
                      if (dist < 100) target = ent;
                  }
              });
          }

          if (target) {
              player.tetherPoint = { x: target.position.x + target.width/2, y: target.position.y + target.height/2 };
              player.isSwinging = true;
              player.ropeLength = Math.hypot(player.position.x - player.tetherPoint.x, player.position.y - player.tetherPoint.y);
              player.ropeTimer = ROPE_BREAK_TIME_SECONDS + (saveData.upgrades.ropeLength * 0.5);
              if (!isMuted) SoundSynth.playGrapple();
              if (tutorial.active && (tutorial.currentStep === 'GRAPPLE' || tutorial.currentStep === 'L2_BRANCH')) updateTutorial(1);
          }
      };
      const handleMouseUp = () => {
          inputRef.current.isMouseDown = false;
          const player = monkey.current;
          if (player.isSwinging) {
              player.isSwinging = false;
              player.tetherPoint = null;
              const boost = saveData.upgrades.launchBoost * 0.5;
              player.velocity.x *= (1.0 + boost/10);
              player.velocity.y *= (1.0 + boost/10);
              if (tutorial.active && tutorial.currentStep === 'SWING') updateTutorial(1);
          }
      };
      const handleMouseMove = (e: MouseEvent) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
              inputRef.current.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
              smartTargetRef.current = findSmartTarget(e.clientX - rect.left + cameraOffset.current.x, e.clientY - rect.top + cameraOffset.current.y);
              const player = monkey.current;
              const screenX = player.position.x - cameraOffset.current.x;
              const screenY = player.position.y - cameraOffset.current.y;
              const dx = inputRef.current.mousePos.x - screenX;
              const dy = inputRef.current.mousePos.y - screenY;
              const angle = Math.atan2(dy, dx);
              player.eyeOffset = { x: Math.cos(angle) * 2, y: Math.sin(angle) * 2 };
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
      
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
          window.removeEventListener('mousedown', handleMouseDown);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('mousemove', handleMouseMove);
      }
  }, [gameState, isMuted, tutorial.active, startGame]);

  return (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center select-none relative overflow-hidden">
      {!hasSeenIntro && <IntroSlideshow onComplete={() => setHasSeenIntro(true)} />}
      
      {/* GAME UI OVERLAY */}
      {gameState === GameState.PLAYING && (
          <div className="absolute inset-0 pointer-events-none p-4 text-white font-mono z-10">
              <div className="flex justify-between items-start">
                  <div>
                      <h1 className="text-4xl font-black drop-shadow-md text-yellow-400 flex items-center gap-2">
                           <Map size={32}/> {distance}m / {LEVELS[selectedLevelRef.current-1].targetDistance}m
                      </h1>
                      <div className="text-2xl mt-2 flex items-center gap-2 text-green-400">
                          <Coins size={24}/> {runTokens}
                      </div>
                      <div className="flex gap-1 mt-2">
                          {[...Array(MAX_LIVES)].map((_, i) => (
                              <Heart key={i} size={24} fill={i < playerLives ? "#F44336" : "none"} className={i < playerLives ? "text-red-500" : "text-gray-600"} />
                          ))}
                      </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                       <div className="bg-black/50 p-2 rounded text-right">
                           <div className="text-sm text-gray-400">SCORE</div>
                           <div className="text-3xl text-white font-bold">{score}</div>
                       </div>
                       <div className="bg-black/50 p-2 rounded text-right flex flex-col items-end">
                            <div className="flex items-center gap-2 text-sm text-gray-300"><Wind size={16}/> WEATHER</div>
                            <div className="font-bold text-blue-300">{weather.type}</div>
                       </div>
                       
                       {/* SKILL CHAIN */}
                       {skillChainUI.active && (
                           <div className="mt-4 text-right animate-bounce-slow">
                               <div className="text-4xl font-black italic" style={{color: RANKS.find(r=>r.title === skillChainUI.rank)?.color}}>
                                   {skillChainUI.rank}
                               </div>
                               <div className="text-xl text-white">x{skillChainUI.multiplier.toFixed(1)} COMBO</div>
                               <div className="h-2 w-32 bg-gray-700 mt-1 rounded-full overflow-hidden">
                                   <div className="h-full bg-yellow-400 transition-all duration-75" style={{width: `${(skillChainUI.timer / CHAIN_TIMEOUT_FRAMES) * 100}%`}} />
                               </div>
                           </div>
                       )}
                  </div>
              </div>

              {/* TUTORIAL OVERLAY */}
              {tutorial.active && tutorial.showBox && (
                  <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-lg">
                      <div className="bg-gray-900/90 border-2 border-yellow-400 p-6 rounded-xl text-center shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
                          <div className="text-yellow-400 font-bold mb-2 flex items-center justify-center gap-2 text-xl tracking-widest">
                              <Lightbulb size={24}/> TUTORIAL
                          </div>
                          <p className="text-2xl text-white font-bold leading-relaxed">{tutorial.message}</p>
                          <div className="mt-4 text-sm text-gray-400 animate-pulse">Follow instructions to proceed...</div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* MENU UI OVERLAY */}
      {gameState === GameState.MENU && (
          <div className="absolute inset-0 pointer-events-none p-4 text-white font-mono z-10 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                  <div>
                      <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-blue-500 drop-shadow-sm filter drop-shadow-lg">
                          POLYJUNGLE SWING
                      </h1>
                      <div className="text-xl text-gray-300 mt-2">Map Selection - Click a Node to Play</div>
                  </div>
                  <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 shadow-xl pointer-events-auto flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-2xl text-yellow-400 font-bold">
                          <Coins size={28}/> {saveData.totalTokens} TOKENS
                      </div>
                      <button 
                        onClick={() => setGameState(GameState.SHOP)}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg"
                      >
                          <ShoppingCart size={24}/> OPEN SHOP
                      </button>
                  </div>
              </div>
              
              <div className="text-center text-gray-400 text-sm">
                  Controls: WASD / Arrows to Move & Swing • Space to Jump • Mouse to Grapple
              </div>
          </div>
      )}

      {/* SHOP UI */}
      {gameState === GameState.SHOP && (
          <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-8">
              <div className="bg-gray-800 border-2 border-gray-700 w-full max-w-5xl h-full max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-900 p-6 flex justify-between items-center border-b border-gray-700">
                      <div className="flex items-center gap-4">
                          <h2 className="text-4xl font-black text-white flex items-center gap-3"><ShoppingCart size={40} className="text-purple-400"/> MONKEY MARKET</h2>
                          <div className="flex bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
                              <Coins className="text-yellow-400 mr-2"/>
                              <span className="text-xl font-bold text-white">{saveData.totalTokens}</span>
                          </div>
                      </div>
                      <button 
                        onClick={() => setGameState(GameState.MENU)}
                        className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                      >
                          <X size={32}/>
                      </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-700">
                      <button 
                        onClick={() => setActiveTab('UPGRADES')}
                        className={`flex-1 py-4 font-bold text-xl flex items-center justify-center gap-2 transition-colors ${activeTab === 'UPGRADES' ? 'bg-gray-800 text-purple-400 border-b-4 border-purple-500' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}
                      >
                          <Zap size={20}/> UPGRADES
                      </button>
                      <button 
                        onClick={() => setActiveTab('SKINS')}
                        className={`flex-1 py-4 font-bold text-xl flex items-center justify-center gap-2 transition-colors ${activeTab === 'SKINS' ? 'bg-gray-800 text-blue-400 border-b-4 border-blue-500' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}
                      >
                          <Shirt size={20}/> SKINS
                      </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-8 bg-gray-800/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {SHOP_ITEMS.filter(item => item.type === (activeTab === 'UPGRADES' ? 'UPGRADE' : 'SKIN')).map(item => {
                              const isUpgrade = item.type === 'UPGRADE';
                              const currentLevel = isUpgrade ? (saveData.upgrades[item.upgradeKey!] || 0) : (saveData.skins.includes(item.id) ? 1 : 0);
                              const isMaxed = isUpgrade ? currentLevel >= item.maxLevel! : currentLevel === 1;
                              const isEquipped = !isUpgrade && saveData.equippedSkin === item.id;
                              const canAfford = saveData.totalTokens >= item.cost;
                              const isLocked = item.parents ? !item.parents.every(pid => {
                                  const parent = SHOP_ITEMS.find(i => i.id === pid);
                                  return parent && saveData.upgrades[parent.upgradeKey!] >= 1;
                              }) : false;

                              return (
                                  <div key={item.id} className={`relative bg-gray-900 border-2 rounded-xl p-5 flex flex-col transition-all group hover:scale-[1.02] ${isLocked ? 'border-gray-800 opacity-50 grayscale' : isMaxed && isUpgrade ? 'border-green-600/50' : isEquipped ? 'border-blue-500 shadow-blue-500/20 shadow-lg' : 'border-gray-700 hover:border-gray-500'}`}>
                                      {isLocked && <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-xl"><Lock size={40} className="text-gray-500"/></div>}
                                      
                                      <div className="flex justify-between items-start mb-4">
                                          <div className={`p-3 rounded-lg ${isMaxed ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-300'}`}>
                                              <item.icon size={32}/>
                                          </div>
                                          {isUpgrade && (
                                              <div className="text-xs font-bold bg-gray-800 px-2 py-1 rounded text-gray-400 border border-gray-700">
                                                  LVL {currentLevel} / {item.maxLevel}
                                              </div>
                                          )}
                                      </div>

                                      <h3 className="text-xl font-bold text-white mb-1">{item.name}</h3>
                                      <p className="text-sm text-gray-400 mb-4 flex-1">{item.description}</p>

                                      <div className="mt-auto">
                                          {isUpgrade ? (
                                              <button
                                                  onClick={() => handleBuyItem(item)}
                                                  disabled={isMaxed || !canAfford || isLocked}
                                                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                                                      isMaxed ? 'bg-green-600/20 text-green-500 cursor-default' :
                                                      canAfford ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg' :
                                                      'bg-gray-800 text-gray-500 cursor-not-allowed'
                                                  }`}
                                              >
                                                  {isMaxed ? (
                                                      <>MAXED OUT <CheckCircle size={18}/></>
                                                  ) : (
                                                      <><Coins size={18}/> {item.cost}</>
                                                  )}
                                              </button>
                                          ) : (
                                              currentLevel === 1 ? (
                                                  <button
                                                      onClick={() => handleEquipSkin(item.id)}
                                                      disabled={isEquipped}
                                                      className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                                                          isEquipped ? 'bg-blue-600/20 text-blue-400 cursor-default border border-blue-500/50' : 'bg-gray-700 hover:bg-gray-600 text-white'
                                                      }`}
                                                  >
                                                      {isEquipped ? "EQUIPPED" : "EQUIP"}
                                                  </button>
                                              ) : (
                                                  <button
                                                      onClick={() => handleBuyItem(item)}
                                                      disabled={!canAfford}
                                                      className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                                                          canAfford ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                                      }`}
                                                  >
                                                      <Coins size={18}/> {item.cost}
                                                  </button>
                                              )
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* GAME OVER / LEVEL COMPLETE MODAL */}
      {(gameState === GameState.GAME_OVER || gameState === GameState.LEVEL_COMPLETE) && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border-4 border-gray-600 p-8 rounded-xl max-w-lg w-full shadow-2xl flex flex-col text-center">
             <div className="mb-6">
                <h2 className={`text-6xl font-black mb-2 ${gameState === GameState.LEVEL_COMPLETE ? 'text-green-400' : 'text-red-500'}`}>
                    {gameState === GameState.LEVEL_COMPLETE ? "LEVEL CONQUERED!" : "WIPEOUT!"}
                </h2>
                <div className="flex justify-center gap-8 text-2xl font-bold text-white mb-4">
                    <div>SCORE: <span className="text-yellow-400">{score}</span></div>
                    <div>DIST: <span className="text-blue-400">{distance}m</span></div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                 <button 
                    onClick={() => startGame(selectedLevelRef.current)} 
                    className="py-4 bg-green-600 hover:bg-green-500 text-white font-black text-2xl rounded-lg shadow-lg hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
                 >
                     <RotateCcw /> TRY AGAIN
                 </button>
                 <button 
                    onClick={() => setGameState(GameState.MENU)} 
                    className="py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xl rounded-lg shadow-lg hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
                 >
                     <Home /> RETURN TO CAMP
                 </button>
             </div>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="shadow-2xl border-4 border-gray-800 rounded-lg cursor-crosshair max-w-full max-h-full"
      />
    </div>
  );
}
