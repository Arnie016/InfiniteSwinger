import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, AbilityType, Vector2, Entity, Enemy, Particle, SaveData, ShopItem, BiomeType } from './types';
import { getJungleQuote } from './services/geminiService';
import { Zap, Banana, Grab, Play, RotateCcw, Skull, ShoppingCart, Coins, Home, MousePointer2, Move, Wind, Eye, CloudRain, Snowflake, CloudFog, Leaf } from 'lucide-react';

// --- CONSTANTS ---
const GRAVITY = 0.5; 
const AIR_RESISTANCE = 0.99;
const ROPE_STIFFNESS = 0.15;
const MAX_SPEED = 22;
const CEILING_LIMIT = 80;
const SPAWN_RATE = 300;
const ABILITY_COOLDOWN = 300;
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 600;

// Biome Configs
const BIOMES: Record<BiomeType, { skyColors: [string, string], treeColor: string, groundColor: string, particle: string }> = {
    JUNGLE: { skyColors: ["#0F2027", "#203A43"], treeColor: "#2E7D32", groundColor: "#1B5E20", particle: 'none' },
    WINTER: { skyColors: ["#B3E5FC", "#E1F5FE"], treeColor: "#81D4FA", groundColor: "#E1F5FE", particle: 'snow' },
    SWAMP:  { skyColors: ["#263238", "#37474F"], treeColor: "#33691E", groundColor: "#1B5E20", particle: 'rain' },
    AUTUMN: { skyColors: ["#FF7043", "#FFCCBC"], treeColor: "#D84315", groundColor: "#FFAB91", particle: 'none' }
};

// Initial Save Data
const DEFAULT_SAVE: SaveData = {
  totalTokens: 0,
  highScore: 0,
  skins: ['default'],
  equippedSkin: 'default',
  upgrades: {
    ropeLength: 1,
    swingForce: 1,
    armor: 0
  }
};

const SHOP_ITEMS: ShopItem[] = [
  { id: 'upgrade_rope', name: 'Vine Weaver', type: 'UPGRADE', cost: 100, description: 'Better control & reach.', upgradeKey: 'ropeLength', maxLevel: 5 },
  { id: 'upgrade_force', name: 'Gorilla Strength', type: 'UPGRADE', cost: 150, description: 'Start swings with more power.', upgradeKey: 'swingForce', maxLevel: 5 },
  { id: 'upgrade_armor', name: 'Coconut Helmet', type: 'UPGRADE', cost: 300, description: 'Survive one hit per run.', upgradeKey: 'armor', maxLevel: 3 },
  { id: 'skin_cyber', name: 'Cyber Kong', type: 'SKIN', cost: 1000, description: 'Neon aesthetics.' },
  { id: 'skin_golden', name: 'Golden God', type: 'SKIN', cost: 5000, description: 'Pure luxury.' },
  { id: 'skin_winter', name: 'Yeti', type: 'SKIN', cost: 2000, description: 'Cold resistance.' },
];

// --- HELPER FUNCTIONS ---

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

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
  // Different tree shapes based on biome
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
  
  if (type === 'WINTER') {
      // Pointier pine trees
      return [
          { x: x - 50, y: h }, { x: x - 60, y: h - 60 }, { x: x - 40, y: h - 60 },
          { x: x - 50, y: h - 120 }, { x: x - 30, y: h - 120 }, { x: x, y: h - 200 },
          { x: x + 30, y: h - 120 }, { x: x + 50, y: h - 120 }, { x: x + 40, y: h - 60 },
          { x: x + 60, y: h - 60 }, { x: x + 50, y: h }
      ];
  }
  
  return points;
};

export default function App() {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [runTokens, setRunTokens] = useState(0);
  const [cooldowns, setCooldowns] = useState({ [AbilityType.PUNCH]: 0, [AbilityType.LASER]: 0, [AbilityType.BANANA]: 0 });
  const [activeAbility, setActiveAbility] = useState<AbilityType | null>(null);
  const [gameOverMessage, setGameOverMessage] = useState("");
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [ropeLengthDisplay, setRopeLengthDisplay] = useState<string>("0.0");
  const [timeScale, setTimeScale] = useState(1.0);
  const [currentBiome, setCurrentBiome] = useState<BiomeType>('JUNGLE');

  // Persistent Data
  const [saveData, setSaveData] = useState<SaveData>(() => {
    const saved = localStorage.getItem('polyjungle_save');
    return saved ? JSON.parse(saved) : DEFAULT_SAVE;
  });

  useEffect(() => {
    localStorage.setItem('polyjungle_save', JSON.stringify(saveData));
  }, [saveData]);

  // --- REFS FOR GAME LOOP ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const bgLayers = useRef<{x: number, y: number, size: number, type: number, color: string, speed: number, shapeVar?: number}[]>([]);

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
    eyeOffset: { x: 0, y: 0 }
  });

  const entities = useRef<Entity[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const particles = useRef<Particle[]>([]);
  const cameraOffset = useRef(0);
  const inputRef = useRef({ 
      isMouseDown: false, 
      mousePos: { x: 0, y: 0 }, 
      justPressed: false,
      wheelDelta: 0,
      keys: { left: false, right: false, shift: false }
  });
  
  const saveDataRef = useRef(saveData);
  useEffect(() => { saveDataRef.current = saveData; }, [saveData]);

  // Generate Background
  const generateBackground = useCallback(() => {
      bgLayers.current = [];
      
      // 1. Far Background - Giant Silhouette Trees (Very slow)
      for(let i=0; i<20; i++) {
          bgLayers.current.push({
              x: Math.random() * 2000,
              y: CANVAS_HEIGHT,
              size: randomRange(1.5, 2.5), // Tall
              type: 0, // Tree
              color: '#004d40', // Deep Jungle Green/Teal
              speed: 0.05,
              shapeVar: 0 // Type 0 shape
          });
      }

      // 2. Mid Background - Dense Canopy (Medium slow)
      for(let i=0; i<30; i++) {
          bgLayers.current.push({
              x: Math.random() * 2000,
              y: CANVAS_HEIGHT + 50,
              size: randomRange(1.0, 1.8),
              type: 0, 
              color: '#1b5e20', // Dark Green
              speed: 0.1,
              shapeVar: 1 // Type 1 shape
          });
      }

      // 3. Near Background - Bushes/Trees (Faster)
      for(let i=0; i<40; i++) {
          bgLayers.current.push({
              x: Math.random() * 2000,
              y: CANVAS_HEIGHT + 100,
              size: randomRange(0.8, 1.2),
              type: 0, 
              color: '#2e7d32', // Standard Green
              speed: 0.2,
              shapeVar: 2 // Type 2 shape
          });
      }

      // Vines (Hanging from top)
      for(let i=0; i<40; i++) {
          bgLayers.current.push({
              x: Math.random() * 2000,
              y: -20,
              size: Math.random() * 150 + 50, 
              type: 1, // Vine
              color: `rgba(20, ${60 + Math.random()*40}, 20, ${Math.random() * 0.4 + 0.2})`,
              speed: Math.random() * 0.15 + 0.1
          });
      }
      
      // Clouds (Soft)
      for(let i=0; i<10; i++) {
          bgLayers.current.push({
              x: Math.random() * 2000,
              y: randomRange(20, 150),
              size: randomRange(0.8, 1.5),
              type: 2, // Cloud
              color: `rgba(255, 255, 255, ${randomRange(0.1, 0.3)})`,
              speed: randomRange(0.02, 0.05)
          });
      }
  }, []);

  useEffect(() => { generateBackground(); }, [generateBackground]);

  // --- GAME LOOP LOGIC ---

  const spawnLevelSegment = (startX: number, difficulty: number) => {
    // Determine Biome based on distance
    let biome: BiomeType = 'JUNGLE';
    const biomeDist = startX % 3000;
    if (biomeDist < 1000) biome = 'JUNGLE';
    else if (biomeDist < 1800) biome = 'AUTUMN';
    else if (biomeDist < 2400) biome = 'SWAMP';
    else biome = 'WINTER';
    
    if (startX % 100 === 0 && biome !== currentBiome) {
        setCurrentBiome(biome); // Update UI state roughly when generating
    }

    const isSwamp = biome === 'SWAMP';
    const isWinter = biome === 'WINTER';

    // Lake Generation in Swamp
    if (isSwamp && Math.random() < 0.3) {
        entities.current.push({
            id: `lake-${startX}`,
            position: { x: startX, y: CANVAS_HEIGHT - 40 },
            width: randomRange(150, 300),
            height: 40,
            color: '#2E7D32', // Ignored by lake renderer
            type: 'lake',
            biome
        });
        // Don't spawn tree in middle of lake
        startX += 300; 
    }

    const baseHeight = CANVAS_HEIGHT - 150;
    const heightVar = Math.sin(startX * 0.003) * 100; 
    const treeHeight = baseHeight + heightVar + randomRange(-30, 30);
    const treeX = startX + randomRange(20, 100);
    
    // Tree Trunk
    entities.current.push({
      id: `trunk-${startX}`,
      position: { x: treeX - 15, y: CANVAS_HEIGHT - treeHeight },
      width: 30,
      height: treeHeight,
      color: isWinter ? '#5D4037' : '#3E2723',
      type: 'tree',
      health: 100,
      biome
    });

    // Canopy
    let canopyColor = BIOMES[biome].treeColor;
    // Vary color slightly
    if (biome === 'AUTUMN') canopyColor = Math.random() > 0.5 ? '#D84315' : '#FFAB91';

    entities.current.push({
      id: `canopy-${startX}`,
      position: { x: treeX - 60, y: CANVAS_HEIGHT - treeHeight - 80 },
      width: 120,
      height: 120,
      color: canopyColor,
      type: 'tree',
      polyPoints: createTreePoly(treeX, CANVAS_HEIGHT - treeHeight + 40, biome),
      health: 100,
      biome
    });

    // Branches
    if (Math.random() > 0.5) {
         const branchY = CANVAS_HEIGHT - treeHeight + randomRange(50, treeHeight - 50);
         const dir = Math.random() > 0.5 ? 1 : -1;
         entities.current.push({
             id: `branch-${startX}`,
             position: { x: treeX + (dir === 1 ? 15 : -95), y: branchY },
             width: 80,
             height: 15,
             color: '#4E342E',
             type: 'branch',
             biome
         });
    }

    // Coins
    if (Math.random() > 0.4) {
         entities.current.push({
            id: `coin-${startX}`,
            position: { x: treeX + randomRange(-30, 30), y: CANVAS_HEIGHT - treeHeight - randomRange(50, 150) },
            width: 25,
            height: 25,
            color: '#FFD700',
            type: 'coin',
            polyPoints: [{x:0,y:-12},{x:12,y:0},{x:0,y:12},{x:-12,y:0}].map(p => ({x: treeX + p.x, y: CANVAS_HEIGHT - treeHeight - 150 + p.y})),
            biome
         });
    }

    // Enemies
    if (Math.random() < (0.3 + difficulty * 0.05) && startX > 500) {
      let enemyType: Enemy['enemyType'] = 'bird';
      
      // Biome specific enemies
      if (biome === 'JUNGLE') enemyType = Math.random() > 0.7 ? 'spider' : (Math.random() > 0.5 ? 'bird' : 'snake');
      if (biome === 'SWAMP') enemyType = Math.random() > 0.6 ? 'crocodile' : 'bird';
      if (biome === 'AUTUMN') enemyType = 'bird';
      if (biome === 'WINTER') enemyType = 'snake'; // Ice snakes?

      // Rare bonus bird
      if (Math.random() > 0.95) enemyType = 'bonus_bird';

      let pos = { x: startX + randomRange(100, 300), y: randomRange(100, 400) };
      let vel = { x: -2, y: 0 };

      if (enemyType === 'crocodile') {
          pos.y = CANVAS_HEIGHT - 50;
          vel.x = 0;
      } else if (enemyType === 'spider') {
          pos.x = treeX;
          pos.y = CANVAS_HEIGHT - treeHeight - randomRange(0, 100);
          vel.y = 1;
      } else if (enemyType === 'bonus_bird') {
          vel.x = -6; // Fast
          pos.y = 100;
      }

      enemies.current.push({
        id: `enemy-${startX}`,
        position: pos,
        velocity: vel,
        width: enemyType === 'crocodile' ? 60 : 35,
        height: enemyType === 'crocodile' ? 30 : 35,
        color: getEnemyColor(enemyType),
        type: 'enemy',
        enemyType: enemyType,
        health: 1,
        anchorY: pos.y,
        state: 0,
        biome
      });
    }
  };

  const getEnemyColor = (type: string) => {
      switch(type) {
          case 'bird': return '#C62828';
          case 'snake': return '#4A148C';
          case 'spider': return '#212121';
          case 'crocodile': return '#827717';
          case 'bonus_bird': return '#FFD700';
          default: return '#000';
      }
  }

  const resetGame = () => {
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
      eyeOffset: { x: 0, y: 0 }
    };
    entities.current = [];
    enemies.current = [];
    particles.current = [];
    cameraOffset.current = 0;
    setScore(0);
    setDistance(0);
    setRunTokens(0);
    setCooldowns({ [AbilityType.PUNCH]: 0, [AbilityType.LASER]: 0, [AbilityType.BANANA]: 0 });
    setActiveAbility(null);
    setTimeScale(1.0);
    setCurrentBiome('JUNGLE');
    generateBackground();
    
    for (let i = 0; i < 8; i++) {
      spawnLevelSegment(i * SPAWN_RATE + 400, 0);
    }
    
    setGameState(GameState.PLAYING);
  };

  const spawnParticles = (x: number, y: number, color: string, count: number, speed: number = 3, type: 'spark'|'leaf'|'snow' = 'spark') => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        position: { x, y },
        velocity: { x: randomRange(-speed, speed), y: randomRange(-speed, speed) },
        life: randomRange(20, 40),
        maxLife: 40,
        color: color,
        size: randomRange(2, 6),
        type
      });
    }
  };

  const spawnWeatherParticles = () => {
      // Ambient weather
      const camX = cameraOffset.current;
      const config = BIOMES[currentBiome];
      
      if (config.particle === 'none') return;

      // Spawn rate
      if (Math.random() > 0.4) return;

      const type = config.particle as 'snow' | 'rain' | 'leaf';
      
      // Spawn over a wider area to prevent empty spots when moving fast
      let x = camX + randomRange(-400, CANVAS_WIDTH + 400);
      let y = -50;
      let vx = 0, vy = 0;
      let color = "";
      let size = 0;

      if (type === 'snow') {
          vx = randomRange(-1, 1);
          vy = randomRange(1, 3);
          color = "#FFF";
          size = randomRange(2, 4);
      } else if (type === 'rain') {
          vx = -2;
          vy = randomRange(15, 20);
          color = "#81D4FA";
          size = 2;
      }

      particles.current.push({
          position: { x, y },
          velocity: { x: vx, y: vy },
          life: 200,
          maxLife: 200,
          color,
          size,
          type
      });
  };

  const updatePhysics = () => {
    if (gameState !== GameState.PLAYING) return;
    
    const player = monkey.current;
    const upgrades = saveDataRef.current.upgrades;
    const speedMultiplier = player.speedBuff > 0 ? 1.5 : 1.0;
    const dt = timeScale; 

    if (player.speedBuff > 0) player.speedBuff -= dt;
    if (activeAbility === AbilityType.BANANA && player.speedBuff <= 0) setActiveAbility(null);

    // Cooldowns
    setCooldowns(prev => ({
      [AbilityType.PUNCH]: Math.max(0, prev[AbilityType.PUNCH] - dt),
      [AbilityType.LASER]: Math.max(0, prev[AbilityType.LASER] - dt),
      [AbilityType.BANANA]: Math.max(0, prev[AbilityType.BANANA] - dt),
    }));

    // --- LASER ABILITY ---
    if (activeAbility === AbilityType.LASER) {
        const laserY = player.position.y + player.height/2;
        const laserX = player.position.x + player.width;
        const laserRange = 1200;
        
        // Trees destroy
        entities.current = entities.current.filter(e => {
            if (e.type !== 'tree') return true;
            const inRangeX = e.position.x < laserX + laserRange && e.position.x + e.width > laserX;
            const inRangeY = laserY > e.position.y && laserY < e.position.y + e.height;
            if (inRangeX && inRangeY) {
                spawnParticles(e.position.x + e.width/2, laserY, '#4E342E', 5);
                return false;
            }
            return true;
        });
        // Enemies destroy
        enemies.current.forEach((e, i) => {
            const inRangeX = e.position.x < laserX + laserRange && e.position.x + e.width > laserX;
            const inRangeY = laserY > e.position.y - 50 && laserY < e.position.y + e.height + 50; // Forgiving aim
            if (inRangeX && inRangeY) {
                enemies.current.splice(i, 1);
                spawnParticles(e.position.x, e.position.y, '#FF0000', 10);
                setScore(s => s + 50);
            }
        });
    }

    // --- INPUT & ROPE ---
    
    // Rope Winch (Scroll)
    if (player.isSwinging && inputRef.current.wheelDelta !== 0) {
        player.ropeLength += inputRef.current.wheelDelta * 0.5;
        player.ropeLength = Math.max(50, Math.min(player.ropeLength, 600)); 
        inputRef.current.wheelDelta = 0;
    }

    if (inputRef.current.isMouseDown && !player.isSwinging) {
      let nearest: Entity | null = null;
      let minMouseDist = 500; 
      const mouseWorldX = inputRef.current.mousePos.x + cameraOffset.current;
      const mouseWorldY = inputRef.current.mousePos.y;

      entities.current.forEach(e => {
        // Allow connecting to trees (if polyPoints exists) OR branches
        const isTargetable = (e.type === 'tree' && e.polyPoints) || e.type === 'branch';
        
        if (isTargetable) { 
           const cx = e.position.x + e.width / 2;
           const cy = e.position.y + e.height / 2;
           const distToPlayer = Math.hypot(cx - (player.position.x + player.width/2), cy - player.position.y);
           const rangeLimit = 400 + (upgrades.ropeLength * 50);

           if (distToPlayer < rangeLimit && cx > player.position.x - 100) {
             const distToMouse = Math.hypot(cx - mouseWorldX, cy - mouseWorldY);
             if (distToMouse < minMouseDist) {
                 minMouseDist = distToMouse;
                 nearest = e;
             }
           }
        }
      });

      if (nearest) {
        const target = nearest as Entity;
        player.isSwinging = true;
        player.tetherPoint = { 
          x: target.position.x + target.width / 2, 
          y: target.position.y + target.height / 2 
        };
        const dx = player.position.x + player.width/2 - player.tetherPoint.x;
        const dy = player.position.y + player.height/2 - player.tetherPoint.y;
        // Safety clamp for initial rope length to prevent glitching if too close
        player.ropeLength = Math.max(50, Math.sqrt(dx*dx + dy*dy));
        spawnParticles(player.tetherPoint.x, player.tetherPoint.y, "#8D6E63", 3);
      }
    } else if (!inputRef.current.isMouseDown && player.isSwinging) {
      player.isSwinging = false;
      player.tetherPoint = null;
      setRopeLengthDisplay("");
      // Release Boost
      const boost = 1 + (upgrades.swingForce * 0.1);
      player.velocity.x += 2.0 * boost * dt;
      player.velocity.y -= 1.0 * dt;
    }

    // --- GRAVITY & FORCES ---
    
    let effectiveGravity = GRAVITY;
    if (player.position.y < CEILING_LIMIT) {
        effectiveGravity = GRAVITY * 3;
        player.velocity.y *= 0.9;
    }
    player.velocity.y += effectiveGravity * dt;
    
    // Wind force in Autumn
    if (currentBiome === 'AUTUMN') {
        player.velocity.x -= 0.05 * dt; // Headwind
    }

    // --- SWING PHYSICS ---
    if (player.isSwinging && player.tetherPoint) {
      const centerX = player.position.x + player.width/2;
      const centerY = player.position.y + player.height/2;
      const tetherX = player.tetherPoint.x;
      const tetherY = player.tetherPoint.y;
      
      let dx = centerX - tetherX;
      let dy = centerY - tetherY;
      let currentDist = Math.sqrt(dx*dx + dy*dy);

      // Safety against zero length
      if (currentDist < 10) currentDist = 10;

      setRopeLengthDisplay((currentDist / 20).toFixed(1) + "m");

      const pumpForce = 0.4 * (1 + upgrades.swingForce * 0.1) * dt;
      if (inputRef.current.keys.left) {
          const angle = Math.atan2(dy, dx);
          player.velocity.x += Math.sin(angle) * pumpForce;
          player.velocity.y -= Math.cos(angle) * pumpForce;
      }
      if (inputRef.current.keys.right) {
          const angle = Math.atan2(dy, dx);
          player.velocity.x -= Math.sin(angle) * pumpForce;
          player.velocity.y += Math.cos(angle) * pumpForce;
      }

      if (currentDist >= player.ropeLength) {
          const ropeDirX = dx / currentDist;
          const ropeDirY = dy / currentDist;
          const vDotR = (player.velocity.x * ropeDirX) + (player.velocity.y * ropeDirY);

          if (vDotR > 0) {
              player.velocity.x -= ropeDirX * vDotR;
              player.velocity.y -= ropeDirY * vDotR;
          }
          
          const correction = (player.ropeLength - currentDist) * ROPE_STIFFNESS * dt;
          player.velocity.x += ropeDirX * correction;
          player.velocity.y += ropeDirY * correction;
          
          // Damping - less friction in Winter
          const friction = currentBiome === 'WINTER' ? 0.998 : 0.995;
          player.velocity.x *= friction;
          player.velocity.y *= friction;
      }

      const angle = Math.atan2(dy, dx);
      player.rotation = angle - Math.PI/2;

    } else {
      player.velocity.x *= Math.pow(AIR_RESISTANCE, dt);
      player.velocity.y *= Math.pow(AIR_RESISTANCE, dt);
      
      const speed = Math.sqrt(player.velocity.x**2 + player.velocity.y**2);
      if (speed > 1) {
          player.rotation += (Math.atan2(player.velocity.y, player.velocity.x) * 0.5 - player.rotation) * 0.1 * dt;
      }
    }

    // Cap Speed
    const speed = Math.hypot(player.velocity.x, player.velocity.y);
    const cap = MAX_SPEED * speedMultiplier;
    if (speed > cap) {
        const scale = cap / speed;
        player.velocity.x *= scale;
        player.velocity.y *= scale;
    }

    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;

    // Eye Tracking
    const headX = player.position.x + player.width/2;
    const headY = player.position.y + player.height/2;
    const mouseWX = inputRef.current.mousePos.x + cameraOffset.current;
    const mouseWY = inputRef.current.mousePos.y;
    const angleToMouse = Math.atan2(mouseWY - headY, mouseWX - headX) - player.rotation; 
    const eyeRange = 3;
    player.eyeOffset.x = Math.cos(angleToMouse) * eyeRange;
    player.eyeOffset.y = Math.sin(angleToMouse) * eyeRange;

    // --- WORLD BOUNDS & CAMERA ---
    if (player.position.y > CANVAS_HEIGHT + 100) handleGameOver();
    const targetCamX = player.position.x - CANVAS_WIDTH * 0.3;
    cameraOffset.current += (targetCamX - cameraOffset.current) * 0.1 * dt;
    
    if (player.position.x < cameraOffset.current - 150) handleGameOver();

    // Level Generation
    const lastEntity = entities.current[entities.current.length - 1];
    if (lastEntity && (lastEntity.position.x < cameraOffset.current + CANVAS_WIDTH + 400)) {
       const currentDist = Math.floor(player.position.x / 1000);
       spawnLevelSegment(lastEntity.position.x + SPAWN_RATE, Math.min(currentDist, 10));
    }

    // Cleanup
    entities.current = entities.current.filter(e => e.position.x > cameraOffset.current - 600);
    enemies.current = enemies.current.filter(e => e.position.x > cameraOffset.current - 600);

    // --- COLLISIONS ---
    
    // Lake Hazard
    entities.current.forEach(e => {
        if (e.type === 'lake' && checkCollision(player, e)) {
             player.velocity.x *= 0.5; // Sludge
             player.velocity.y *= 0.5;
             spawnParticles(player.position.x, player.position.y + 20, '#4FC3F7', 2);
        }
        if (e.type === 'branch' && checkCollision(player, e)) {
            // Platform collision simple logic
             if (player.velocity.y > 0 && player.position.y < e.position.y) {
                 player.position.y = e.position.y - player.height;
                 player.velocity.y = 0;
                 player.rotation = 0;
                 player.isSwinging = false;
             }
        }
        if (e.type === 'coin' && checkCollision(player, e)) {
            setRunTokens(t => t + 1);
            spawnParticles(e.position.x, e.position.y, '#FFD700', 10);
            e.position.y = 99999; // Remove logic
        }
    });
    entities.current = entities.current.filter(e => e.position.y < 9000); // Clean removed coins

    // Enemy Logic
    enemies.current.forEach((enemy, index) => {
      enemy.state = (enemy.state || 0) + dt;
      
      if (enemy.enemyType === 'bird') {
          enemy.position.x += enemy.velocity.x * (1 + distance/5000) * dt;
          enemy.position.y += Math.sin(enemy.state / 10) * 2 * dt;
      } else if (enemy.enemyType === 'snake') {
          enemy.position.x += enemy.velocity.x * dt;
      } else if (enemy.enemyType === 'spider') {
          // Oscillate up and down on thread
          const offset = Math.sin(enemy.state / 20) * 100;
          enemy.position.y = (enemy.anchorY || 0) + offset;
      } else if (enemy.enemyType === 'crocodile') {
          // Jump periodically
          if (Math.abs(player.position.x - enemy.position.x) < 200 && enemy.position.y > CANVAS_HEIGHT - 60) {
              if (Math.random() < 0.05) enemy.velocity.y = -15; // JUMP
          }
          enemy.velocity.y += GRAVITY * dt;
          enemy.position.y += enemy.velocity.y * dt;
          if (enemy.position.y > CANVAS_HEIGHT - 40) {
              enemy.position.y = CANVAS_HEIGHT - 40;
              enemy.velocity.y = 0;
          }
      } else if (enemy.enemyType === 'bonus_bird') {
          enemy.position.x += enemy.velocity.x * dt;
      }

      if (checkCollision(player, enemy)) {
          if (activeAbility === AbilityType.PUNCH) {
             spawnParticles(enemy.position.x, enemy.position.y, '#FF0000', 15);
             enemies.current.splice(index, 1);
             setScore(prev => prev + 100);
             if (enemy.enemyType === 'bonus_bird') {
                 setRunTokens(t => t + 50); // Big Bonus
             }
          } else {
             if (player.armorStack > 0) {
                 player.armorStack--;
                 spawnParticles(player.position.x, player.position.y, '#AAAAAA', 20);
                 enemies.current.splice(index, 1); 
             } else {
                 handleGameOver();
             }
          }
      }
    });

    setDistance(Math.max(0, Math.floor(player.position.x / 20)));
    setScore(prev => prev + 1);
    
    // Ambient Weather
    spawnWeatherParticles();

    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.life -= dt;
      if (p.life <= 0) particles.current.splice(i, 1);
    }
  };

  const handleGameOver = async () => {
    if (gameState === GameState.GAME_OVER) return;
    
    const newTotalTokens = saveData.totalTokens + runTokens;
    const newHigh = Math.max(saveData.highScore, distance);
    setSaveData(prev => ({
        ...prev,
        totalTokens: newTotalTokens,
        highScore: newHigh
    }));

    setGameState(GameState.GAME_OVER);
    setIsLoadingQuote(true);
    const quote = await getJungleQuote(score, Math.floor(monkey.current.position.x / 20));
    setGameOverMessage(quote);
    setIsLoadingQuote(false);
  };

  const buyItem = (item: ShopItem) => {
    if (saveData.totalTokens >= item.cost) {
        if (item.type === 'UPGRADE' && item.upgradeKey) {
            const currentLevel = saveData.upgrades[item.upgradeKey];
            if (item.maxLevel && currentLevel >= item.maxLevel) return; 
            setSaveData(prev => ({
                ...prev,
                totalTokens: prev.totalTokens - item.cost,
                upgrades: { ...prev.upgrades, [item.upgradeKey!]: prev.upgrades[item.upgradeKey!] + 1 }
            }));
        } else if (item.type === 'SKIN') {
            if (saveData.skins.includes(item.id)) {
                setSaveData(prev => ({...prev, equippedSkin: item.id}));
            } else {
                setSaveData(prev => ({
                    ...prev,
                    totalTokens: prev.totalTokens - item.cost,
                    skins: [...prev.skins, item.id],
                    equippedSkin: item.id
                }));
            }
        }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const camX = cameraOffset.current;
    const biomeConfig = BIOMES[currentBiome];
    
    // Sky Gradient (Dynamic)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, biomeConfig.skyColors[0]); 
    gradient.addColorStop(1, biomeConfig.skyColors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Parallax Layers
    bgLayers.current.forEach(obj => {
        const parallaxFactor = obj.speed * 3; // Amplify base speed for parallax feel
        let renderX = obj.x - (camX * parallaxFactor); 
        renderX = renderX % (CANVAS_WIDTH * 2.5); // Wrap around larger width
        // Handle wrap
        if (renderX < -200) renderX += CANVAS_WIDTH * 2.5;
        
        if (renderX > -200 && renderX < CANVAS_WIDTH + 200) {
            
            if (obj.type === 2) { // Cloud
                ctx.fillStyle = obj.color;
                ctx.beginPath();
                const s = obj.size * 30;
                // Simple cloud shape
                ctx.arc(renderX, obj.y, s, 0, Math.PI * 2);
                ctx.arc(renderX + s*0.8, obj.y - s*0.5, s*1.2, 0, Math.PI * 2);
                ctx.arc(renderX + s*1.6, obj.y, s, 0, Math.PI * 2);
                ctx.fill();
            } else if (obj.type === 0) { // Tree / Hill
                ctx.fillStyle = obj.color;
                
                if (obj.shapeVar === 1) { // Lush Round Top Tree
                    ctx.beginPath();
                    // Trunk
                    ctx.rect(renderX - 10*obj.size, obj.y, 20*obj.size, -100*obj.size);
                    // Canopy
                    ctx.moveTo(renderX - 60*obj.size, obj.y - 80*obj.size);
                    ctx.lineTo(renderX, obj.y - 180*obj.size);
                    ctx.lineTo(renderX + 60*obj.size, obj.y - 80*obj.size);
                    ctx.lineTo(renderX, obj.y - 40*obj.size);
                    ctx.fill();
                } else if (obj.shapeVar === 2) { // Bushy low tree
                     ctx.beginPath();
                     ctx.arc(renderX, obj.y - 40*obj.size, 60*obj.size, 0, Math.PI, true);
                     ctx.fill();
                } else { // Giant Silhouette (Default)
                    ctx.beginPath();
                    ctx.moveTo(renderX, obj.y);
                    ctx.lineTo(renderX + 30 * obj.size, obj.y - 300 * obj.size); // Tall Trunk
                    ctx.lineTo(renderX + 60 * obj.size, obj.y);
                    ctx.fill();
                    // Add Canopy triangle
                    ctx.beginPath();
                    ctx.moveTo(renderX - 40*obj.size, obj.y - 200*obj.size);
                    ctx.lineTo(renderX + 30*obj.size, obj.y - 350*obj.size);
                    ctx.lineTo(renderX + 100*obj.size, obj.y - 200*obj.size);
                    ctx.fill();
                }

            } else { // Hanging Vine
                ctx.strokeStyle = obj.color;
                ctx.beginPath();
                ctx.moveTo(renderX, 0);
                ctx.bezierCurveTo(
                    renderX + 10, obj.size / 3, 
                    renderX - 10, obj.size / 1.5, 
                    renderX, obj.size
                );
                ctx.lineWidth = 3 * (obj.size / 100);
                ctx.stroke();
            }
        }
    });

    // 2. Game World
    ctx.save();
    ctx.translate(-cameraOffset.current, 0);

    // Entities
    entities.current.forEach(e => {
        if (e.type === 'tree') {
            ctx.fillStyle = e.color;
            ctx.fillRect(e.position.x, e.position.y, e.width, e.height);
            if (e.polyPoints) drawPoly(ctx, e.polyPoints, e.color.replace(/[^,]+(?=\))/, '0.8'), "#00000022");
        } else if (e.type === 'coin') {
             if (e.polyPoints) drawPoly(ctx, e.polyPoints, e.color, "#FFA000");
        } else if (e.type === 'branch') {
             ctx.fillStyle = "#4E342E";
             // Rounded rect for branch
             ctx.beginPath();
             ctx.roundRect(e.position.x, e.position.y, e.width, e.height, 5);
             ctx.fill();
             // Add a highlight
             ctx.fillStyle = "rgba(255,255,255,0.1)";
             ctx.fillRect(e.position.x, e.position.y, e.width, 4);
        } else if (e.type === 'lake') {
             ctx.fillStyle = "#0277BD"; // Water
             ctx.globalAlpha = 0.8;
             ctx.fillRect(e.position.x, e.position.y, e.width, e.height);
             ctx.globalAlpha = 1.0;
        }
    });

    // Enemies
    enemies.current.forEach(e => {
        if (e.enemyType === 'spider') {
            // Thread
            ctx.beginPath();
            ctx.moveTo(e.position.x + 17, 0); // Hang from top of screen roughly
            ctx.lineTo(e.position.x + 17, e.position.y);
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.stroke();
            
            drawPoly(ctx, [
                {x: e.position.x, y: e.position.y + 10},
                {x: e.position.x + 35, y: e.position.y + 10},
                {x: e.position.x + 17, y: e.position.y + 30},
                {x: e.position.x + 17, y: e.position.y - 5},
            ], e.color);
        } else if (e.enemyType === 'crocodile') {
            drawPoly(ctx, [
                {x: e.position.x, y: e.position.y + 10},
                {x: e.position.x + 40, y: e.position.y + 10}, // Body
                {x: e.position.x + 60, y: e.position.y + 20}, // Snout
                {x: e.position.x + 40, y: e.position.y + 30},
                {x: e.position.x, y: e.position.y + 25},
            ], e.color);
            // Teeth
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.moveTo(e.position.x + 40, e.position.y + 20);
            ctx.lineTo(e.position.x + 45, e.position.y + 15);
            ctx.lineTo(e.position.x + 50, e.position.y + 20);
            ctx.fill();
        } else {
            // Bird / Snake
             const pts = e.enemyType === 'bird' || e.enemyType === 'bonus_bird' ? [
                {x: e.position.x, y: e.position.y},
                {x: e.position.x + 35, y: e.position.y + 10},
                {x: e.position.x, y: e.position.y + 20},
                {x: e.position.x - 15, y: e.position.y + 10},
            ] : [
                {x: e.position.x, y: e.position.y + 30},
                {x: e.position.x + 10, y: e.position.y},
                {x: e.position.x + 25, y: e.position.y + 30},
                {x: e.position.x + 35, y: e.position.y},
            ];
            drawPoly(ctx, pts, e.color);
        }
    });

    // Monkey
    const m = monkey.current;
    ctx.save();
    // Rope (Draw before monkey)
    if (m.isSwinging && m.tetherPoint) {
        ctx.beginPath();
        ctx.moveTo(m.position.x + m.width/2, m.position.y + m.height/2);
        ctx.lineTo(m.tetherPoint.x, m.tetherPoint.y);
        ctx.strokeStyle = saveDataRef.current.equippedSkin === 'skin_golden' ? "#FFD700" : "#5D4037";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.translate(m.position.x + m.width/2, m.position.y + m.height/2);
    ctx.rotate(m.rotation);
    
    let bodyColor = activeAbility === AbilityType.PUNCH ? "#FF5252" : "#795548";
    let headColor = "#A1887F";
    if (saveDataRef.current.equippedSkin === 'skin_cyber') { bodyColor = "#00E5FF"; headColor = "#1A237E"; }
    else if (saveDataRef.current.equippedSkin === 'skin_golden') { bodyColor = "#FFD700"; headColor = "#FFAB00"; }
    else if (saveDataRef.current.equippedSkin === 'skin_winter') { bodyColor = "#ECEFF1"; headColor = "#B0BEC5"; }

    drawPoly(ctx, [
        {x: -12, y: -12}, {x: 12, y: -12}, {x: 18, y: 5}, {x: 12, y: 18}, {x: -12, y: 18}, {x: -18, y: 5}
    ], bodyColor);
    drawPoly(ctx, [
        {x: 0, y: -25}, {x: 15, y: -15}, {x: 20, y: -5}, {x: 0, y: -10}, {x: -20, y: -5}, {x: -15, y: -15}
    ], headColor);

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(-6, -12, 4, 0, Math.PI * 2);
    ctx.arc(6, -12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(-6 + m.eyeOffset.x, -12 + m.eyeOffset.y, 2, 0, Math.PI * 2);
    ctx.arc(6 + m.eyeOffset.x, -12 + m.eyeOffset.y, 2, 0, Math.PI * 2);
    ctx.fill();

    if (m.armorStack > 0) {
        ctx.strokeStyle = "#64B5F6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI*2);
        ctx.stroke();
    }

    // Laser Visual
    if (activeAbility === AbilityType.LASER) {
        ctx.rotate(-m.rotation); // Unrotate for global laser direction if wanted, or keep relative
        ctx.beginPath();
        ctx.moveTo(20, -10);
        ctx.lineTo(800, -10); 
        ctx.strokeStyle = "#FF3D00";
        ctx.lineWidth = randomRange(4, 8);
        ctx.lineCap = 'round';
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#FF9100";
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Core
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.restore();

    // Particles
    particles.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.type === 'rain') {
            // Streaks for rain
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.moveTo(p.position.x, p.position.y);
            ctx.lineTo(p.position.x + p.velocity.x * 2, p.position.y + p.velocity.y * 2);
            ctx.stroke();
        } else {
             ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
             ctx.fill();
        }
    });

    ctx.restore();

    // Vignette & HUD Effects
    const grd = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 300, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 900);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,20,10,0.6)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (timeScale < 1.0) {
        ctx.strokeStyle = "rgba(200, 255, 255, 0.3)";
        ctx.lineWidth = 20;
        ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  };

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    updatePhysics();
    draw(ctx);

    if (gameState === GameState.PLAYING) {
        requestRef.current = requestAnimationFrame(animate);
    } else if (gameState === GameState.GAME_OVER) {
        draw(ctx);
    }
  }, [gameState, activeAbility, timeScale, currentBiome]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, animate]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'q') triggerAbility(AbilityType.PUNCH);
        if (e.key.toLowerCase() === 'w') triggerAbility(AbilityType.LASER);
        if (e.key.toLowerCase() === 'e') triggerAbility(AbilityType.BANANA);
        if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') inputRef.current.keys.left = true;
        if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') inputRef.current.keys.right = true;
        if (e.key === 'Shift') inputRef.current.keys.shift = true;
        if (e.code === 'Space') {
             if(gameState === GameState.GAME_OVER) resetGame();
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') inputRef.current.keys.left = false;
        if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') inputRef.current.keys.right = false;
        if (e.key === 'Shift') inputRef.current.keys.shift = false;
    };

    const handleWheel = (e: WheelEvent) => {
        inputRef.current.wheelDelta = e.deltaY > 0 ? 1 : -1;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('wheel', handleWheel);
    };
  }, [cooldowns, gameState]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if(rect) inputRef.current.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    inputRef.current.isMouseDown = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if(rect) inputRef.current.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const triggerAbility = (type: AbilityType) => {
      if (cooldowns[type] > 0 || gameState !== GameState.PLAYING) return;
      setActiveAbility(type);
      setCooldowns(prev => ({ ...prev, [type]: ABILITY_COOLDOWN }));
      if (type === AbilityType.BANANA) monkey.current.speedBuff = 300;
      setTimeout(() => setActiveAbility(null), type === AbilityType.BANANA ? 5000 : 500);
      
      // Sound effect simulation visual
      if(type === AbilityType.PUNCH) spawnParticles(monkey.current.position.x, monkey.current.position.y, "#FFF", 10, 5);
  };

  const renderAbilityButton = (type: AbilityType, icon: React.ReactNode, colorClass: string, label: string, key: string) => (
     <div className="relative group">
        <button 
            onClick={() => triggerAbility(type)}
            disabled={cooldowns[type] > 0}
            className={`p-4 rounded-full border-4 transition-all shadow-xl ${activeAbility === type ? `${colorClass} scale-110 border-white` : 'bg-stone-800 border-stone-600 hover:bg-stone-700'}`}
        >
            {icon}
        </button>
        <div className="absolute top-0 left-0 w-full h-full rounded-full flex items-center justify-center pointer-events-none">
            {cooldowns[type] > 0 && <span className="text-white font-bold text-lg drop-shadow-md">{Math.ceil(cooldowns[type]/60)}</span>}
        </div>
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-white text-xs font-bold bg-black/70 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition border border-stone-500 w-max">{label} ({key})</span>
    </div>
  );

  return (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center overflow-hidden relative select-none font-vt323">
      
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => inputRef.current.isMouseDown = false}
        onMouseLeave={() => inputRef.current.isMouseDown = false}
        className="border-4 border-stone-800 rounded-lg shadow-2xl cursor-crosshair"
      />

      {gameState === GameState.PLAYING && (
          <>
            {/* HUD */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-6 text-white font-mono text-2xl drop-shadow-md pointer-events-none">
                <div className="bg-black/60 px-6 py-2 rounded-lg border border-white/20 flex items-center gap-2 text-yellow-400">
                    <Coins size={24} /> {saveData.totalTokens + runTokens}
                </div>
                <div className="bg-black/60 px-6 py-2 rounded-lg border border-white/20">Dist: {distance}m</div>
                 <div className="bg-black/60 px-4 py-2 rounded-lg border border-white/20 flex items-center gap-2 text-sm">
                    {currentBiome === 'WINTER' ? <Snowflake size={16}/> : 
                     currentBiome === 'SWAMP' ? <CloudFog size={16}/> :
                     currentBiome === 'AUTUMN' ? <Wind size={16}/> : <Leaf size={16}/>}
                    {currentBiome}
                </div>
            </div>

            {/* Controls Helper */}
            <div className="absolute bottom-8 right-8 bg-black/50 p-4 rounded-lg text-white text-sm font-mono pointer-events-none">
                <div className="flex items-center gap-2 mb-1"><MousePointer2 size={16}/> Click to Swing</div>
                <div className="flex items-center gap-2 mb-1"><Move size={16}/> Scroll to Winch</div>
                <div className="flex items-center gap-2 mb-1"><Wind size={16}/> A/D to Pump</div>
                <div className="flex items-center gap-2"><Eye size={16}/> Shift to Aim</div>
            </div>

            {monkey.current.isSwinging && (
                <div className="absolute top-1/2 left-1/2 text-white font-bold text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,1)] pointer-events-none opacity-80"
                     style={{ transform: `translate(${monkey.current.position.x - cameraOffset.current}px, ${monkey.current.position.y - 20}px)` }}>
                     {ropeLengthDisplay}
                </div>
            )}

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-6">
                {renderAbilityButton(AbilityType.PUNCH, <Grab size={32} className="text-white" />, 'bg-red-600', 'KICK', 'Q')}
                {renderAbilityButton(AbilityType.LASER, <Zap size={32} className="text-white" />, 'bg-blue-600', 'LASER', 'W')}
                {renderAbilityButton(AbilityType.BANANA, <Banana size={32} className="text-white" />, 'bg-yellow-500', 'BOOST', 'E')}
            </div>
          </>
      )}

      {gameState === GameState.MENU && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
            <div className="absolute inset-0 overflow-hidden -z-10 opacity-30">
                 {/* Animated background elements for menu */}
                 <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse"></div>
            </div>
            <div className="bg-gradient-to-b from-stone-900 to-stone-800 p-10 rounded-xl border-4 border-green-700 shadow-[0_0_50px_rgba(0,255,0,0.2)] max-w-4xl w-full text-center relative overflow-hidden">
                
                <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-green-600 mb-2 tracking-tighter drop-shadow-xl" style={{fontFamily: 'VT323'}}>POLY JUNGLE</h1>
                <p className="text-green-400 text-xl mb-8 tracking-widest font-bold">SWING • SURVIVE • EVOLVE</p>
                
                <div className="grid grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
                    <div className="bg-black/40 p-6 rounded-lg border border-green-900/50 hover:border-green-500 transition">
                        <div className="text-stone-400 text-xs uppercase tracking-widest mb-2">High Score</div>
                        <div className="text-4xl font-bold text-white font-mono">{saveData.highScore}m</div>
                    </div>
                     <div className="bg-black/40 p-6 rounded-lg border border-green-900/50 hover:border-green-500 transition">
                        <div className="text-stone-400 text-xs uppercase tracking-widest mb-2">Treasury</div>
                        <div className="text-4xl font-bold text-yellow-400 flex justify-center items-center gap-2 font-mono"><Coins size={32}/>{saveData.totalTokens}</div>
                    </div>
                     <div className="bg-black/40 p-6 rounded-lg border border-green-900/50 hover:border-green-500 transition">
                        <div className="text-stone-400 text-xs uppercase tracking-widest mb-2">Active Skin</div>
                        <div className="text-2xl font-bold text-blue-300 truncate font-mono">{SHOP_ITEMS.find(s => s.id === saveData.equippedSkin)?.name || 'Default'}</div>
                    </div>
                </div>

                <div className="flex gap-8 justify-center items-center">
                    <button onClick={() => setGameState(GameState.SHOP)} className="group flex flex-col items-center gap-2 bg-stone-700 hover:bg-stone-600 p-4 rounded-xl w-36 transition border-2 border-stone-500 hover:border-yellow-500">
                        <ShoppingCart size={32} className="group-hover:text-yellow-400 transition"/>
                        <span className="font-bold tracking-wider">SHOP</span>
                    </button>
                    <button onClick={resetGame} className="flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 p-8 rounded-2xl w-64 transition border-b-8 border-green-900 active:border-b-0 active:translate-y-2 hover:scale-105 shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                        <Play size={64} fill="currentColor" className="drop-shadow-lg"/>
                        <span className="text-4xl font-bold tracking-widest drop-shadow-md">PLAY</span>
                    </button>
                </div>
            </div>
        </div>
      )}

      {gameState === GameState.SHOP && (
        <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center text-white z-20">
            <div className="w-full max-w-6xl h-[85vh] bg-stone-900 rounded-xl border-4 border-yellow-700/50 flex flex-col shadow-2xl overflow-hidden">
                <div className="bg-stone-950 p-8 flex justify-between items-center border-b-4 border-stone-800 shadow-lg">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setGameState(GameState.MENU)} className="hover:bg-stone-800 p-3 rounded-lg transition text-stone-400 hover:text-white"><Home size={32}/></button>
                        <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">MONKEY MARKET</h2>
                    </div>
                    <div className="flex items-center gap-3 text-3xl text-yellow-400 bg-black/50 px-6 py-3 rounded-full border border-yellow-900/50 font-mono">
                        <Coins fill="currentColor" size={32}/> {saveData.totalTokens}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]">
                    {SHOP_ITEMS.map(item => {
                        const isOwned = item.type === 'SKIN' && saveData.skins.includes(item.id);
                        const isEquipped = item.type === 'SKIN' && saveData.equippedSkin === item.id;
                        const currentLevel = item.type === 'UPGRADE' && item.upgradeKey ? saveData.upgrades[item.upgradeKey] : 0;
                        const isMaxed = item.type === 'UPGRADE' && currentLevel >= (item.maxLevel || 5);
                        const canAfford = saveData.totalTokens >= item.cost;

                        return (
                            <div key={item.id} className={`bg-stone-800/90 backdrop-blur p-6 rounded-xl border-2 ${isEquipped ? 'border-green-500 ring-2 ring-green-500/30' : 'border-stone-700'} flex flex-col gap-4 relative group hover:border-yellow-500 transition hover:-translate-y-1 hover:shadow-xl`}>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-2xl font-bold text-stone-100">{item.name}</h3>
                                    {item.type === 'UPGRADE' && <span className="text-xs bg-black px-3 py-1 rounded-full text-stone-400 border border-stone-700 font-mono">Lvl {currentLevel}/{item.maxLevel}</span>}
                                </div>
                                <p className="text-stone-400 text-lg leading-tight flex-1">{item.description}</p>
                                
                                <div className="mt-auto pt-6 border-t border-stone-700 flex justify-between items-center">
                                    {item.type === 'UPGRADE' ? (
                                        isMaxed ? <span className="text-green-400 font-bold tracking-widest">MAXED</span> : 
                                        <div className="text-yellow-400 flex items-center gap-2 font-bold text-xl"><Coins size={20}/> {item.cost}</div>
                                    ) : (
                                        isOwned ? <span className="text-green-400 font-bold tracking-widest">OWNED</span> : 
                                        <div className="text-yellow-400 flex items-center gap-2 font-bold text-xl"><Coins size={20}/> {item.cost}</div>
                                    )}

                                    <button 
                                        onClick={() => buyItem(item)}
                                        disabled={(!canAfford && !isOwned) || isMaxed || isEquipped}
                                        className={`px-6 py-2 rounded-lg font-bold transition shadow-md ${
                                            isEquipped ? 'bg-green-600 text-white cursor-default' :
                                            isOwned ? 'bg-stone-600 hover:bg-green-600 text-white' :
                                            isMaxed ? 'bg-stone-700 text-stone-500 cursor-default' :
                                            canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-white hover:scale-105' : 
                                            'bg-stone-700 text-stone-500 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        {isEquipped ? 'EQUIPPED' : isOwned ? 'EQUIP' : isMaxed ? 'MAX' : 'BUY'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-white p-8 text-center z-30">
            <Skull size={100} className="mb-8 text-red-600 animate-bounce" />
            <h2 className="text-7xl font-bold mb-4 text-red-500 tracking-widest drop-shadow-[0_5px_5px_rgba(0,0,0,1)]" style={{fontFamily: 'VT323'}}>GAME OVER</h2>
            
            <div className="flex gap-12 my-8 text-3xl font-mono bg-stone-900/80 p-8 rounded-2xl border-2 border-stone-700 shadow-2xl">
                <div className="flex flex-col gap-2">
                    <span className="text-stone-500 text-sm tracking-widest uppercase">SCORE</span>
                    <span className="text-white font-bold">{score}</span>
                </div>
                <div className="w-px bg-stone-700"></div>
                <div className="flex flex-col gap-2">
                    <span className="text-stone-500 text-sm tracking-widest uppercase">DISTANCE</span>
                    <span className="text-green-400 font-bold">{distance}m</span>
                </div>
            </div>
            
            <div className="bg-stone-800/50 p-8 rounded-xl max-w-2xl mb-10 min-h-[120px] flex items-center justify-center italic border-l-8 border-yellow-600 text-xl relative">
                <span className="absolute top-2 left-2 text-4xl text-stone-600">"</span>
                {isLoadingQuote ? <span className="animate-pulse text-yellow-200">Summoning jungle wisdom...</span> : <p className="px-6">{gameOverMessage}</p>}
                <span className="absolute bottom-2 right-2 text-4xl text-stone-600">"</span>
            </div>

            <div className="flex gap-6">
                <button onClick={() => setGameState(GameState.MENU)} className="flex items-center gap-3 bg-stone-700 text-white px-10 py-5 rounded-xl text-2xl font-bold hover:bg-stone-600 transition border-2 border-transparent hover:border-stone-400">
                    <Home size={28}/> MENU
                </button>
                <button onClick={resetGame} className="flex items-center gap-3 bg-green-600 text-white px-12 py-5 rounded-xl text-2xl font-bold hover:bg-green-500 transition shadow-[0_0_20px_rgba(0,255,0,0.3)] transform hover:scale-105 hover:-translate-y-1">
                    <RotateCcw size={28}/> TRY AGAIN
                </button>
            </div>
        </div>
      )}

    </div>
  );
}