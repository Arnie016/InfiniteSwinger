import React from 'react';
import {
  Anchor,
  BookOpen,
  Eye,
  CheckCircle2,
  Compass,
  Coins,
  ChevronLeft,
  ChevronRight,
  Feather,
  Flame,
  Gauge,
  Leaf,
  Lock,
  Link2,
  Maximize2,
  Map,
  Minus,
  Mountain,
  Play,
  Plus,
  Settings2,
  Shield,
  ShoppingBag,
  Star,
  Sparkles,
  TreePine,
  Trophy,
  Share2,
  Volume2,
  VolumeX,
  Waves,
  Wind,
} from 'lucide-react';

import {
  CurrentBuildSummary,
  Enemy,
  FeaturedRouteCup,
  LevelActTemplate,
  LevelConfig,
  LevelResult,
  SaveData,
  WeatherType,
} from '../../types';
import { LEVELS, ROUTE_SCRIPTS } from '../../gameData';
import { formatDurationMs } from '../../engine/uiFormat';

function ThreatIcon({ type }: { type: Enemy['enemyType'] }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (type) {
    case 'bird':
    case 'bonus_bird':
    case 'eagle':
      return (
        <svg {...common}>
          <path d="M3 13c3-4 6-6 9-6s6 2 9 6" />
          <path d="M8 13l4-2 4 2" />
          <path d="M12 11v6" />
        </svg>
      );
    case 'bat':
      return (
        <svg {...common}>
          <path d="M2.5 14c2.5-4 5.5-6 9.5-6s7 2 9.5 6" />
          <path d="M6 14l2-3 4 2 4-2 2 3" />
          <path d="M12 8.5v5" />
        </svg>
      );
    case 'snake':
      return (
        <svg {...common}>
          <path d="M4 17c3 0 3-6 6-6s3 6 6 6 3-4 4-6" />
          <circle cx="18.5" cy="9" r="1.3" fill="currentColor" stroke="none" />
          <path d="M20.3 9h1.6" />
        </svg>
      );
    case 'spider':
      return (
        <svg {...common}>
          <circle cx="12" cy="12.5" r="3.2" />
          <circle cx="12" cy="8.2" r="1.8" />
          <path d="M8 11 5 9M8 13 5 15M16 11l3-2M16 13l3 2M9 7 6 5M15 7l3-2" />
        </svg>
      );
    case 'crocodile':
      return (
        <svg {...common}>
          <path d="M3 14h11l4-3 3 1-2 3 2 2-3 1-4-2H3" />
          <path d="M7 14v-2M10 14v-2M13 14v-2" />
        </svg>
      );
    case 'slug':
      return (
        <svg {...common}>
          <path d="M5 15c0-4 3-7 7-7 3 0 5 2 5 5 0 2-1.5 4-4 4H5Z" />
          <path d="M8.5 12.5c0-1.3 1-2.3 2.3-2.3 1 0 1.8.8 1.8 1.8 0 .8-.6 1.4-1.4 1.4H9.5" />
          <path d="M17 9.5 18.5 8M15.5 9.5 17 8" />
        </svg>
      );
    case 'troll':
      return (
        <svg {...common}>
          <path d="M8 19v-4l-2-2 2-5h8l2 5-2 2v4" />
          <path d="M10 8 8.5 5M14 8 15.5 5" />
          <path d="M18 10l3-2M18 12l3 1" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="5" />
        </svg>
      );
  }
}

const ropeTypeGlyphs = {
  vine: Leaf,
  braid: Link2,
  chain: Anchor,
  silk: Feather,
  reed: Waves,
  ember: Flame,
} as const;

const threatTone: Record<Enemy['enemyType'], string> = {
  bird: 'border-sky-200/15 bg-sky-500/12 text-sky-100',
  bonus_bird: 'border-sky-200/15 bg-sky-500/12 text-sky-100',
  eagle: 'border-cyan-200/15 bg-cyan-500/12 text-cyan-100',
  bat: 'border-slate-200/15 bg-slate-500/12 text-slate-100',
  snake: 'border-emerald-200/15 bg-emerald-500/12 text-emerald-100',
  spider: 'border-fuchsia-200/15 bg-fuchsia-500/12 text-fuchsia-100',
  crocodile: 'border-amber-200/15 bg-amber-500/12 text-amber-100',
  slug: 'border-lime-200/15 bg-lime-500/12 text-lime-100',
  troll: 'border-rose-200/15 bg-rose-500/12 text-rose-100',
};

const actMeta = {
  recovery: {
    label: 'Recovery',
    icon: Shield,
    tone: 'border-sky-200/15 bg-sky-500/10 text-sky-100',
  },
  reward: {
    label: 'Reward',
    icon: Coins,
    tone: 'border-amber-200/15 bg-amber-500/10 text-amber-100',
  },
  speed: {
    label: 'Speed',
    icon: Gauge,
    tone: 'border-emerald-200/15 bg-emerald-500/10 text-emerald-100',
  },
  hazard: {
    label: 'Hazard',
    icon: Flame,
    tone: 'border-rose-200/15 bg-rose-500/10 text-rose-100',
  },
  finale: {
    label: 'Finale',
    icon: Star,
    tone: 'border-fuchsia-200/15 bg-fuchsia-500/10 text-fuchsia-100',
  },
} satisfies Record<
  LevelActTemplate,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    tone: string;
  }
>;

const advisoryTone = {
  emerald: 'border-emerald-200/15 bg-emerald-500/10 text-emerald-100',
  amber: 'border-amber-200/15 bg-amber-500/10 text-amber-100',
  rose: 'border-rose-200/15 bg-rose-500/10 text-rose-100',
} as const;

const ACHIEVEMENT_LIBRARY: Record<
  string,
  {
    title: string;
    detail: string;
  }
> = {
  'first-clear': {
    title: 'First Clear',
    detail: 'Finish a route first time.',
  },
  'route-runner': {
    title: 'Route Runner',
    detail: 'Clear three routes total.',
  },
  'camp-smith': {
    title: 'Camp Smith',
    detail: 'Accumulate at least 8 upgrade levels.',
  },
  'rope-adept': {
    title: 'Rope Adept',
    detail: 'Build a reliable rope-focused loadout.',
  },
  'hazard-ward': {
    title: 'Hazard Ward',
    detail: 'Harden defenses for dense lanes.',
  },
  'star-collector': {
    title: 'Star Collector',
    detail: 'Collect six total route stars.',
  },
  'sky-legend': {
    title: 'Sky Legend',
    detail: 'Score 1,000 points in a single run.',
  },
};

const formatRunDate = (isoDate: string) => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '--';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
};

function getActProfile(level: LevelConfig) {
  const routeScript = ROUTE_SCRIPTS[level.id];
  const order: LevelActTemplate[] = [];
  const counts: Partial<Record<LevelActTemplate, number>> = {};
  const registerAct = (act: LevelActTemplate) => {
    if (!counts[act]) {
      order.push(act);
    }
    counts[act] = (counts[act] ?? 0) + 1;
  };

  if (routeScript) {
    routeScript.beats.forEach((beat) => {
      if (beat.kind !== 'checkpoint') {
        registerAct(beat.kind);
      }
    });
  } else {
    level.actTemplates.forEach(registerAct);
  }

  return order.map((act) => ({ act, count: counts[act] ?? 0 }));
}

function getFallbackRouteNotes(level: LevelConfig) {
  const notes: string[] = [];

  if (level.tutorialType === 'BASIC') {
    notes.push('Training opener with a forgiving checkpoint to teach the release rhythm.');
  } else if (level.tutorialType === 'ADVANCED') {
    notes.push('Advanced tutorial route that expects cleaner momentum control after the first checkpoint.');
  } else {
    notes.push(
      `${level.biome.toLowerCase()} route with ${level.checkpointCount} checkpoint${level.checkpointCount === 1 ? '' : 's'} and a ${Math.max(1, level.difficulty + 1)}/10 danger read.`,
    );
  }

  if (level.actTemplates.includes('reward')) {
    notes.push('Reward lanes split off the safe line, so cleaner catches usually pay back more.');
  }
  if (level.actTemplates.includes('speed')) {
    notes.push('Speed sections reward early drive and releasing close to the arc peak.');
  }
  if (level.actTemplates.includes('hazard')) {
    notes.push('Threat density ramps after the opener, so late recoveries matter more than raw distance.');
  }
  if (notes.length < 2 && level.allowedWeather.length > 1) {
    notes.push(`${level.allowedWeather.length} weather states can roll here, so the route rarely plays the same twice.`);
  }
  if (notes.length < 2) {
    notes.push('Treat the first pass as a scouting run, then push for score once the line feels stable.');
  }

  return notes.slice(0, 2);
}

function getRouteDiagnostics(level: LevelConfig) {
  const routeScript = ROUTE_SCRIPTS[level.id];
  const totalCoins = routeScript
    ? routeScript.beats.reduce(
        (sum, beat) =>
          sum +
          (beat.rewards?.reduce((rewardSum, reward) => rewardSum + reward.count, 0) ?? 0),
        0,
      )
    : Math.max(
        10,
        level.actTemplates.reduce((sum, act) => {
          if (act === 'reward') return sum + 8;
          if (act === 'speed') return sum + 5;
          if (act === 'hazard') return sum + 4;
          if (act === 'finale') return sum + 6;
          return sum + 3;
        }, level.checkpointCount * 4),
      );
  const totalThreats = routeScript
    ? routeScript.beats.reduce(
        (sum, beat) => sum + beat.hazards.reduce((hazardSum, hazard) => hazardSum + hazard.count, 0),
        0,
      )
    : Math.max(level.allowedEnemies.length, 1) + level.difficulty + (level.actTemplates.includes('hazard') ? 2 : 0);
  const checkpoints = routeScript
    ? routeScript.beats.filter((beat) => beat.kind === 'checkpoint').length
    : level.checkpointCount;

  const scriptedNotes =
    routeScript?.beats
      .filter((beat) => beat.kind !== 'checkpoint')
      .slice(0, 2)
      .map((beat) => beat.label) ?? [];
  const notes = scriptedNotes.length > 0 ? scriptedNotes : getFallbackRouteNotes(level);

  return {
    actProfile: getActProfile(level),
    beatCount: routeScript?.beats.length ?? level.actTemplates.length + level.checkpointCount,
    checkpoints,
    notes,
    totalCoins,
    totalThreats,
  };
}

function getRouteAdvisory(
  level: LevelConfig,
  saveData: SaveData,
  selectedLevelLocked: boolean,
  highestUnlockedLevel: number,
  selectedLevelResult: LevelResult | null,
  maxLevelId: number,
) {
  if (selectedLevelLocked) {
    const priorLevel = Math.max(1, level.id - 1);
    return {
      badge: 'Locked Branch',
      body: `Camp is currently pushed to L${highestUnlockedLevel}. Clear L${priorLevel} to bring this route online.`,
      title: `Clear L${priorLevel} to unlock this branch`,
      tone: 'rose' as const,
    };
  }

  if ((selectedLevelResult?.clears ?? 0) === 0 && level.id < maxLevelId) {
    return {
      badge: 'Next Unlock',
      body: `This is the current frontier. A first clear here opens L${level.id + 1} and pushes camp deeper into the atlas.`,
      title: `First clear will open L${level.id + 1}`,
      tone: 'emerald' as const,
    };
  }

  if ((level.allowedWeather.includes('WINDY') || level.allowedWeather.includes('FOG')) && saveData.upgrades.airControl === 0) {
    return {
      badge: 'Prep',
      body: 'Wind and low-visibility routes reward steadier mid-air corrections more than raw reach.',
      title: 'Aerodynamics would help here',
      tone: 'amber' as const,
    };
  }

  if ((level.biome === 'SWAMP' || level.biome === 'VOLCANO') && saveData.upgrades.hazardResist === 0) {
    return {
      badge: 'Prep',
      body: 'This biome punishes missed lines harder than the jungle. One level of Hazard Resist will smooth out bad recoveries.',
      title: 'Hazard Resist is the cleanest safety upgrade',
      tone: 'amber' as const,
    };
  }

  if (level.actTemplates.includes('reward') && saveData.upgrades.magnetism === 0) {
    return {
      badge: 'Farm',
      body: 'Reward windows drift off the safest line. Coin Magnet turns near-misses into real payouts.',
      title: 'Coin Magnet can lift the payout',
      tone: 'amber' as const,
    };
  }

  if (level.actTemplates.includes('speed') && saveData.upgrades.swingForce < 2 && saveData.upgrades.launchBoost === 0) {
    return {
      badge: 'Speed',
      body: 'You already have enough rope to survive here. More launch power will make the fast sections feel intentional instead of scrappy.',
      title: 'Gorilla Strength or Springy Tendons fit this route',
      tone: 'amber' as const,
    };
  }

  if (level.difficulty >= 5 && saveData.upgrades.armor === 0) {
    return {
      badge: 'Survival',
      body: 'Threats start punishing single mistakes too hard for a base defense kit once routes get this dense.',
      title: 'Armor would smooth the first clear',
      tone: 'amber' as const,
    };
  }

  if ((selectedLevelResult?.clears ?? 0) > 0) {
    return {
      badge: 'Proven',
      body: 'You already own this route once. Chase a faster best time, cleaner stars, or use it as a token farm for the next unlock.',
      title: 'This branch is now part of your rotation',
      tone: 'emerald' as const,
    };
  }

  return {
    badge: 'Ready',
    body: 'Current rope control and launch upgrades are already aligned with what this branch asks from the player.',
    title: 'The current loadout fits this route',
    tone: 'emerald' as const,
  };
}

type MenuSeasonRun = {
  levelId: number;
  levelName: string;
  score: number;
  tokens: number;
  livesLeft: number;
  isWin: boolean;
  elapsedMs: number;
  completedAt: string;
};

const compareMenuSeasonRuns = (left: MenuSeasonRun, right: MenuSeasonRun) => {
  const scoreDiff = right.score - left.score;
  if (scoreDiff !== 0) return scoreDiff;
  const tokensDiff = right.tokens - left.tokens;
  if (tokensDiff !== 0) return tokensDiff;
  const livesDiff = right.livesLeft - left.livesLeft;
  if (livesDiff !== 0) return livesDiff;

  const rightTime = Date.parse(right.completedAt ?? '');
  const leftTime = Date.parse(left.completedAt ?? '');
  if (Number.isFinite(rightTime) && Number.isFinite(leftTime) && rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return right.levelId - left.levelId;
};

const pickBestMenuSeasonRuns = (runs: MenuSeasonRun[]) =>
  [...runs]
    .reduce<Record<number, MenuSeasonRun>>((bucket, run) => {
      const previous = bucket[run.levelId];
      if (!previous || compareMenuSeasonRuns(run, previous) < 0) {
        bucket[run.levelId] = run;
      }
      return bucket;
    }, {});

const computeSeasonPoints = (runs: MenuSeasonRun[]) =>
  Object.values(runs).reduce(
    (total, entry) => total + entry.score + entry.tokens * 4 + entry.livesLeft * 30 + (entry.isWin ? 180 : 0),
    0,
  );

const normalizeMenuRunHistory = (run: {
  levelId: number;
  levelName: string;
  score: number;
  tokens: number;
  livesLeft: number;
  isWin: boolean;
  elapsedMs: number;
  completedAt?: string;
}) => ({
  ...run,
  completedAt: run.completedAt ?? new Date().toISOString(),
});

type MenuRivalGap = {
  levelId: number;
  levelName: string;
  local: MenuSeasonRun;
  rival: MenuSeasonRun;
  gap: number;
};

function WeatherIcon({ weatherType }: { weatherType: WeatherType }) {
  switch (weatherType) {
    case 'CLEAR':
      return <CheckCircle2 size={16} />;
    case 'RAIN':
      return <Waves size={16} />;
    case 'WINDY':
      return <Wind size={16} />;
    case 'FOG':
      return <Shield size={16} />;
    default:
      return <CheckCircle2 size={16} />;
  }
}

function BiomeIcon({ biome }: { biome: LevelConfig['biome'] }) {
  switch (biome) {
    case 'JUNGLE':
      return <TreePine size={16} />;
    case 'SWAMP':
      return <Waves size={16} />;
    case 'CAVE':
      return <Mountain size={16} />;
    case 'VOLCANO':
      return <Flame size={16} />;
    default:
      return <TreePine size={16} />;
  }
}

function TopActionButton({
  label,
  icon,
  onClick,
  className = '',
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void | Promise<void>;
  className?: string;
}) {
  return (
    <button
      onClick={() => void onClick()}
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/78 px-2.5 py-1.5 text-[11px] font-semibold text-slate-100 transition-colors hover:bg-slate-800 ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

function LevelDots({
  level,
  tone,
}: {
  level: number;
  tone: 'cyan' | 'emerald' | 'amber';
}) {
  const toneClass =
    tone === 'cyan' ? 'text-cyan-200' : tone === 'emerald' ? 'text-emerald-200' : 'text-amber-200';
  return (
    <div className="mt-2 flex items-center gap-1.5" aria-label={`Level ${level}`} title={`Level ${level}`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={`menu-dot-${tone}-${index}`}
          size={11}
          className={index < level ? toneClass : 'text-white/20'}
          fill={index < level ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

function getCompassHeading(angleDeg: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const normalized = ((angleDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % directions.length;
  return directions[index];
}

function AtlasCompass({ angleDeg }: { angleDeg: number }) {
  const normalized = ((angleDeg % 360) + 360) % 360;
  const heading = getCompassHeading(angleDeg);

  return (
    <div data-ui-control className="pointer-events-none absolute bottom-4 right-4 z-20 hidden text-white lg:block">
      <div className="atlas-panel-glow atlas-compass-card pointer-events-auto rounded-[1.8rem] border border-amber-200/14 bg-[linear-gradient(180deg,rgba(17,24,39,0.84),rgba(7,13,18,0.92))] px-4 py-3.5 shadow-[0_24px_56px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0 rounded-full border border-amber-100/15 bg-[radial-gradient(circle_at_50%_38%,rgba(124,92,45,0.92),rgba(31,24,16,0.96)_52%,rgba(9,12,18,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(0,0,0,0.32)]">
            <div className="absolute inset-[6px] rounded-full border border-amber-100/14 bg-[radial-gradient(circle_at_50%_35%,rgba(112,78,34,0.55),rgba(26,21,15,0.96))]" />
            <div className="atlas-compass-ring absolute inset-[13px] rounded-full border border-amber-100/10" />
            {Array.from({ length: 16 }).map((_, index) => {
              const isCardinal = index % 4 === 0;
              return (
                <span
                  key={`compass-tick-${index}`}
                  className="absolute left-1/2 top-1/2"
                  style={{ transform: `translate(-50%, -50%) rotate(${index * 22.5}deg)` }}
                >
                  <span
                    className={`absolute left-1/2 top-[8px] block -translate-x-1/2 rounded-full ${
                      isCardinal ? 'h-4 w-[2px] bg-amber-50/70' : 'h-2.5 w-px bg-white/28'
                    }`}
                  />
                </span>
              );
            })}
            <span className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.28em] text-amber-50/88">N</span>
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-[0.22em] text-amber-100/42">E</span>
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.22em] text-amber-100/42">S</span>
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-[0.22em] text-amber-100/42">W</span>
            <div className="atlas-compass-glow absolute inset-[18px] rounded-full" />
            <div
              className="atlas-compass-needle absolute left-1/2 top-1/2 h-[66px] w-[18px]"
              style={{ transform: `translate(-50%, -50%) rotate(${angleDeg}deg)` }}
            >
              <span className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[7px] border-x-transparent border-b-[30px] border-b-emerald-100" />
              <span className="absolute left-1/2 top-[22px] h-6 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-100 via-cyan-200 to-amber-200/10" />
              <span className="absolute left-1/2 bottom-0 h-0 w-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[20px] border-t-amber-900/90" />
            </div>
            <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/30 bg-slate-950 shadow-[0_0_16px_rgba(250,204,21,0.14)]" />
            <div className="absolute left-1/2 top-[18px] h-2 w-2 -translate-x-1/2 rounded-full bg-emerald-100/90 shadow-[0_0_14px_rgba(167,243,208,0.5)]" />
          </div>
          <div className="min-w-0 pr-1">
            <div className="atlas-map-label text-[8px] text-amber-100/52">Captain&apos;s bearing</div>
            <div className="mt-1 flex items-end gap-2">
              <div className="text-[1.65rem] font-black leading-none text-emerald-100">{heading}</div>
              <div className="atlas-map-label pb-0.5 text-[10px] text-white/42">{Math.round(normalized)}°</div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-100/12 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-50/72">
              <Compass size={12} />
              Route compass
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-slate-300/90">
              Keep the bow pointed clean before you play.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  saveData: SaveData;
  selectedLevel: LevelConfig | null;
  selectedLevelResult: LevelResult | null;
  selectedLevelLocked: boolean;
  highestUnlockedLevel: number;
  communityRunHistory: Array<{
    score: number;
    levelId: number;
    levelName: string;
    isWin: boolean;
    elapsedMs: number;
    tokens: number;
    livesLeft: number;
    completedAt: string;
    playerLabel: string;
    isLocal: boolean;
  }>;
  hasCompletedStoryIntro: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isAtlasFocusMode: boolean;
  currentBuild: CurrentBuildSummary;
  weatherLabels: Record<WeatherType, string>;
  enemyLabels: Record<Enemy['enemyType'], string>;
  featuredRouteCup: FeaturedRouteCup | null;
  campaignChallenge: {
    levelId: number | null;
    title: string;
    description: string;
    note: string;
    tone: 'emerald' | 'amber' | 'cyan';
    progress: number;
    target: number;
  };
  onFocusChallengeLevel: (levelId: number) => void;
  onStartGame: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenStory: () => void;
  onOpenProgressDrawer: () => void;
  onOpenSettings: () => void;
  onToggleAtlasFocusMode: () => void;
  challengeRouteId: number | null;
  challengeAlias?: string | null;
  onToggleMute: () => void;
  onToggleFullscreen: () => void | Promise<void>;
  onShareRunboard: () => void;
  onFocusFeaturedRoute: (levelId: number) => void;
  onAcceptChallenge?: (levelId: number) => void;
  onCenterSelected: () => void;
  onPreviousRoute: () => void;
  onNextRoute: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onOpenBuildEntry?: (entryKey: string) => void;
  compassAngleDeg?: number;
};

export function MenuScreen({
  saveData,
  selectedLevel,
  selectedLevelResult,
  selectedLevelLocked,
  highestUnlockedLevel,
  communityRunHistory,
  hasCompletedStoryIntro,
  isMuted,
  isFullscreen,
  isAtlasFocusMode,
  currentBuild,
  weatherLabels,
  enemyLabels,
  featuredRouteCup,
  campaignChallenge,
  onFocusChallengeLevel,
  onStartGame,
  onOpenShop,
  onOpenLeaderboard,
  onOpenStory,
  onOpenProgressDrawer,
  onOpenSettings,
  onToggleAtlasFocusMode,
  challengeRouteId,
  challengeAlias,
  onToggleMute,
  onToggleFullscreen,
  onShareRunboard,
  onFocusFeaturedRoute,
  onAcceptChallenge,
  onCenterSelected,
  onPreviousRoute,
  onNextRoute,
  onZoomIn,
  onZoomOut,
  onResetView,
  onOpenBuildEntry,
  compassAngleDeg = 0,
}: Props) {
  const RopeIcon = ropeTypeGlyphs[currentBuild.ropeType.id];
  const selectedRouteDiagnostics = selectedLevel ? getRouteDiagnostics(selectedLevel) : null;
  const routeAdvisory = selectedLevel
    ? getRouteAdvisory(
      selectedLevel,
      saveData,
      selectedLevelLocked,
      highestUnlockedLevel,
      selectedLevelResult,
      LEVELS.length,
    )
    : null;
  const visibleRouteFit = currentBuild.routeFitTags.slice(0, 4);
  const visibleSynergies = currentBuild.synergies.slice(0, 2);
  const levelsProgress = LEVELS.map((level) => ({
    level,
    result: saveData.levelResults[String(level.id)] ?? null,
  }));
  const unlockedRunways = levelsProgress.filter(({ level }) => level.id <= highestUnlockedLevel);
  const selectedLevelLocalBest = selectedLevel
    ? [...(saveData.runHistory ?? [])]
        .filter((entry) => entry.levelId === selectedLevel.id)
        .sort((left, right) => right.score - left.score)[0] ?? null
    : null;
  const selectedLevelRivalBest = selectedLevel
    ? [...communityRunHistory]
        .filter((entry) => entry.levelId === selectedLevel.id)
        .sort((left, right) => right.score - left.score)[0] ?? null
    : null;
  const routeRivalGap =
    selectedLevelLocalBest && selectedLevelRivalBest
      ? selectedLevelRivalBest.score - selectedLevelLocalBest.score
      : null;
  const incomingChallengeRoute = LEVELS.find((level) => level.id === challengeRouteId) ?? null;
  const incomingChallengeAlias = challengeAlias?.trim() || 'A rival crew';
  const isIncomingChallengeRoute = Boolean(
    selectedLevel && incomingChallengeRoute && selectedLevel.id === incomingChallengeRoute.id,
  );
  const campaignTone =
    campaignChallenge.tone === 'amber'
      ? 'border-amber-200/20 bg-amber-500/10 text-amber-100'
      : campaignChallenge.tone === 'emerald'
        ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100'
        : 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100';
  const featuredCupTone =
    featuredRouteCup?.tone === 'rose'
      ? 'border-rose-200/20 bg-rose-500/10 text-rose-100'
      : featuredRouteCup?.tone === 'amber'
        ? 'border-amber-200/20 bg-amber-500/10 text-amber-100'
        : featuredRouteCup?.tone === 'emerald'
          ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100'
          : 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100';
  const navigatorRoute = selectedLevel ?? LEVELS[Math.max(0, highestUnlockedLevel - 1)] ?? LEVELS[0];
  const navigatorIndex = Math.max(0, LEVELS.findIndex((level) => level.id === navigatorRoute.id));
  const hasPreviousRoute = navigatorIndex > 0;
  const hasNextRoute = navigatorIndex < LEVELS.length - 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-ui text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(132,255,207,0.11),transparent_26%),radial-gradient(circle_at_78%_14%,rgba(251,191,36,0.1),transparent_22%),radial-gradient(circle_at_70%_78%,rgba(125,211,252,0.08),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.44))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] opacity-30" />
      <button
        type="button"
        onClick={onOpenProgressDrawer}
        className="pointer-events-auto absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/76 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_44px_rgba(2,6,23,0.28)] backdrop-blur-xl xl:hidden"
      >
        <Map size={14} />
        Atlas
      </button>

      <div data-ui-control className="pointer-events-auto absolute right-4 top-4 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-2 text-left shadow-[0_18px_44px_rgba(2,6,23,0.3)] backdrop-blur-xl">
        <span className="atlas-map-label hidden text-[9px] text-white/45 sm:inline">Build</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-500/12 text-cyan-100">
          <RopeIcon size={15} />
        </span>
        <span className="max-w-[9rem] truncate text-xs font-semibold text-white sm:max-w-[13rem]">
          {currentBuild.ropeType.label}
          <span className="hidden text-white/45 sm:inline"> · {currentBuild.equippedSkin}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            if (onOpenBuildEntry && currentBuild.rope[0]?.key) {
              onOpenBuildEntry(currentBuild.rope[0].key);
              return;
            }
            onOpenShop();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/20 bg-cyan-500/12 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
        >
          <ShoppingBag size={12} />
          Shop
        </button>
      </div>

      <AtlasCompass angleDeg={compassAngleDeg} />

      <div
        data-ui-control
        className={`pointer-events-auto absolute bottom-3 left-1/2 w-[min(1120px,calc(100vw-1rem))] -translate-x-1/2 overflow-hidden rounded-[1.45rem] border border-white/10 bg-slate-950/82 p-2 shadow-[0_24px_70px_rgba(2,6,23,0.38)] backdrop-blur-xl sm:w-[min(1080px,calc(100vw-6rem))] lg:p-1.5 xl:w-[min(1040px,calc(100vw-11rem))] ${
          isAtlasFocusMode
            ? 'max-h-[min(24svh,216px)] lg:max-h-[min(18svh,164px)]'
            : 'max-h-[min(40svh,320px)] lg:max-h-[min(24svh,198px)]'
        }`}
      >
        {selectedLevel ? (
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)] gap-2.5 lg:grid-cols-[minmax(0,1fr),172px] xl:grid-cols-[minmax(0,1fr),176px]">
            <div className="atlas-scroll min-h-0 overflow-y-auto pr-1">
              {incomingChallengeRoute ? (
                <div className="mb-2 rounded-2xl border border-cyan-200/20 bg-cyan-500/10 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="atlas-map-label text-[10px] tracking-[0.16em] text-cyan-200/90">Route Challenge</div>
                    <span className="atlas-chip rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                      {incomingChallengeRoute.name}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm font-black text-white">
                    {incomingChallengeAlias} targets L{incomingChallengeRoute.id}
                    {incomingChallengeRoute.id === selectedLevel.id ? ' — this lane' : ''}
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-200">
                    {isIncomingChallengeRoute
                      ? selectedLevelLocked
                        ? 'Unlock this route first, then hit accept to race for the shared board.'
                        : 'Open this route now and post your run to keep the challenge loop active.'
                      : `Switch to L${incomingChallengeRoute.id} then launch directly from the challenge prompt.`}
                  </div>
                  <div className="mt-2">
                    {isIncomingChallengeRoute ? (
                      <button
                        onClick={() => onAcceptChallenge?.(incomingChallengeRoute.id)}
                        disabled={selectedLevelLocked}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                          selectedLevelLocked
                            ? 'cursor-not-allowed border border-white/10 bg-white/10 text-white/45'
                            : 'border border-cyan-200/40 bg-cyan-200/90 text-slate-950 hover:bg-cyan-100'
                        }`}
                      >
                        {selectedLevelLocked ? 'Locked' : `Accept ${incomingChallengeAlias} Challenge`}
                      </button>
                    ) : (
                      <button
                        onClick={() => onFocusChallengeLevel(incomingChallengeRoute.id)}
                        className="rounded-full border border-cyan-200/40 bg-cyan-200/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 transition-colors hover:bg-cyan-100"
                      >
                        Open L{incomingChallengeRoute.id}
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`atlas-chip inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedLevelLocked ? 'border-rose-200/15 bg-rose-500/10 text-rose-100' : 'border-emerald-200/15 bg-emerald-500/10 text-emerald-100'}`}>
                  {selectedLevelLocked ? <Lock size={15} /> : <CheckCircle2 size={15} />}
                  {selectedLevelLocked ? 'Locked' : 'Ready'}
                </span>
                <span className="atlas-chip inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                  <BiomeIcon biome={selectedLevel.biome} />
                  {selectedLevel.biome}
                </span>
                <span className="atlas-chip inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                  <Gauge size={15} />
                  Danger {Math.max(1, selectedLevel.difficulty + 1)}/10
                </span>
                <span className="atlas-chip inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                  <Trophy size={15} />
                  {selectedLevel.targetDistance}m
                </span>
                <button
                  type="button"
                  onClick={onToggleAtlasFocusMode}
                  aria-pressed={isAtlasFocusMode}
                  aria-label={isAtlasFocusMode ? 'Show full route intel' : 'Switch to brief mode'}
                  className={`atlas-chip inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    isAtlasFocusMode ? 'border-cyan-200/25 bg-cyan-500/12 text-cyan-100' : 'text-slate-100 hover:bg-white/[0.08]'
                  }`}
                >
                  {isAtlasFocusMode ? <BookOpen size={15} /> : <Eye size={15} />}
                  {isAtlasFocusMode ? 'Show Details' : 'Hide Details'}
                </button>
                {!isAtlasFocusMode && featuredRouteCup && selectedLevel.id === featuredRouteCup.levelId ? (
                  <span className={`atlas-chip inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${featuredCupTone}`}>
                    <Sparkles size={15} />
                    Daily Crew Cup
                  </span>
                ) : null}
              </div>

              <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-1">
                <div>
                  <div className="atlas-map-label text-[9px] text-slate-400">Route</div>
                  <div className="atlas-title mt-0.5 text-[1.2rem] leading-[0.95] text-white">
                    L{selectedLevel.id} <span className="text-amber-200">{selectedLevel.name}</span>
                  </div>
                </div>
                <div className="atlas-panel-copy max-w-xl text-[0.74rem] text-slate-300">{selectedLevel.description}</div>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="atlas-chip rounded-full px-2.5 py-1 text-[10px] text-slate-100">
                  Best {formatDurationMs(selectedLevelResult?.bestTimeMs ?? null)}
                </span>
                <span className="atlas-chip rounded-full px-2.5 py-1 text-[10px] text-slate-100">
                  Clears {selectedLevelResult?.clears ?? 0}
                </span>
                <span className="atlas-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] text-amber-200">
                  {[0, 1, 2].map((index) => (
                    <Star
                      key={index}
                      size={12}
                      fill={index < (selectedLevelResult?.stars ?? 0) ? 'currentColor' : 'none'}
                    />
                  ))}
                </span>
                {!isAtlasFocusMode ? (
                  <>
                    {selectedLevel.allowedWeather.map((weatherType) => (
                      <span
                        key={weatherType}
                        title={weatherLabels[weatherType]}
                        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/15 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-100"
                      >
                        <WeatherIcon weatherType={weatherType} />
                        {weatherLabels[weatherType]}
                      </span>
                    ))}
                    <span className="atlas-chip rounded-full border-emerald-200/15 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
                      {selectedLevel.checkpointCount} checkpoints
                    </span>
                    <div className="ml-1 inline-flex items-center gap-1.5">
                      {selectedLevel.allowedEnemies.map((enemyType) => (
                        <span
                          key={enemyType}
                          title={enemyLabels[enemyType]}
                          aria-label={enemyLabels[enemyType]}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${threatTone[enemyType]}`}
                        >
                          <ThreatIcon type={enemyType} />
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              {!isAtlasFocusMode ? (
                <div className="mt-2.5 grid gap-2 border-t border-white/8 pt-2.5 md:grid-cols-2">
                  <div className="atlas-surface-soft rounded-[1.1rem] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="atlas-map-label text-[10px] text-slate-400">Route Intel</div>
                      <div className="atlas-chip rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        {selectedRouteDiagnostics?.beatCount ?? selectedLevel.actTemplates.length} beats
                      </div>
                    </div>

                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      <div className="rounded-2xl border border-white/8 bg-slate-950/65 px-2 py-1.5">
                        <div className="atlas-map-label text-[9px] text-slate-500">Payout</div>
                        <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-amber-200">
                          <Coins size={14} />
                          {selectedRouteDiagnostics?.totalCoins ?? 0}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-slate-950/65 px-2 py-1.5">
                        <div className="atlas-map-label text-[9px] text-slate-500">Threats</div>
                        <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-rose-200">
                          <Flame size={14} />
                          {selectedRouteDiagnostics?.totalThreats ?? 0}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-slate-950/65 px-2 py-1.5">
                        <div className="atlas-map-label text-[9px] text-slate-500">Relays</div>
                        <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-cyan-100">
                          <Anchor size={14} />
                          {selectedRouteDiagnostics?.checkpoints ?? selectedLevel.checkpointCount}
                        </div>
                      </div>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(selectedRouteDiagnostics?.actProfile ?? []).map(({ act, count }) => {
                        const meta = actMeta[act];
                        const Icon = meta.icon;
                        return (
                          <span
                            key={`${act}-${count}`}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${meta.tone}`}
                          >
                            <Icon size={12} />
                            {meta.label}
                            <span className="text-white/70">x{count}</span>
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-1.5 space-y-1.5">
                      {(selectedRouteDiagnostics?.notes ?? []).map((note) => (
                        <div
                          key={note}
                          className="rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-1.5 text-[10px] leading-relaxed text-slate-300"
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="atlas-surface-soft rounded-[1.1rem] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="atlas-map-label text-[10px] text-slate-400">Camp Read</div>
                      <div
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${
                          routeAdvisory ? advisoryTone[routeAdvisory.tone] : 'border-white/8 bg-slate-950/80 text-slate-300'
                        }`}
                      >
                        {routeAdvisory?.badge ?? 'Ready'}
                      </div>
                    </div>

                    <div className="mt-1.5 text-sm font-bold text-white">{routeAdvisory?.title ?? 'Route overview ready'}</div>
                    <div className="mt-1 text-[10px] leading-relaxed text-slate-300">
                      {routeAdvisory?.body ?? 'Inspect the route, center the camera, and launch when the line feels good.'}
                    </div>

                    <div className="mt-2 rounded-2xl border border-cyan-200/12 bg-cyan-500/6 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="atlas-map-label text-[9px] text-cyan-200/80">Route Rivalry</div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ${
                            routeRivalGap === null
                              ? 'border-white/10 bg-white/5 text-white/55'
                              : routeRivalGap > 0
                                ? 'border-amber-200/20 bg-amber-500/10 text-amber-100'
                                : routeRivalGap < 0
                                  ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100'
                                  : 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100'
                          }`}
                        >
                          {routeRivalGap === null
                            ? selectedLevelRivalBest
                              ? 'First mark'
                              : 'No rival'
                            : routeRivalGap > 0
                              ? 'Chasing'
                              : routeRivalGap < 0
                                ? 'Ahead'
                                : 'Tied'}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/8 bg-slate-950/65 px-3 py-1.5">
                          <div className="atlas-map-label text-[9px] text-slate-500">Your best</div>
                          {selectedLevelLocalBest ? (
                            <>
                              <div className="mt-1 text-sm font-black text-white">{selectedLevelLocalBest.score} pts</div>
                              <div className="mt-1 text-[10px] text-white/60">
                                {selectedLevelLocalBest.tokens} tk • {selectedLevelLocalBest.livesLeft}L • {formatDurationMs(selectedLevelLocalBest.elapsedMs)}
                              </div>
                            </>
                          ) : (
                            <div className="mt-1 text-[10px] text-white/55">No recorded run on this route yet.</div>
                          )}
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-slate-950/65 px-3 py-1.5">
                          <div className="atlas-map-label text-[9px] text-slate-500">Top imported rival</div>
                          {selectedLevelRivalBest ? (
                            <>
                              <div className="mt-1 text-sm font-black text-white">
                                {selectedLevelRivalBest.score} pts
                                <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                                  {selectedLevelRivalBest.playerLabel}
                                </span>
                              </div>
                              <div className="mt-1 text-[10px] text-white/60">
                                {selectedLevelRivalBest.tokens} tk • {selectedLevelRivalBest.livesLeft}L • {formatDurationMs(selectedLevelRivalBest.elapsedMs)}
                              </div>
                            </>
                          ) : (
                            <div className="mt-1 text-[10px] text-white/55">Import a runboard to create route pressure.</div>
                          )}
                        </div>
                      </div>
                      <div className="mt-1.5 text-[9px] uppercase tracking-[0.18em] text-white/55">
                        {routeRivalGap === null
                          ? selectedLevelRivalBest
                            ? 'Open the route and set your first benchmark against the imported board.'
                            : 'Share or import a runboard to turn this route into a head-to-head race.'
                          : routeRivalGap > 0
                            ? `Beat the rival by ${routeRivalGap} pts to take this lane.`
                            : routeRivalGap < 0
                              ? `You lead this lane by ${Math.abs(routeRivalGap)} pts. Defend it with a cleaner clear.`
                              : 'Dead even. Cleaner tokens or a faster line breaks the tie.'}
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="atlas-map-label text-[9px] text-slate-500">Build Fit</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {visibleRouteFit.length > 0 ? (
                          visibleRouteFit.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/15 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100"
                            >
                              <Sparkles size={11} />
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="atlas-chip rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Balanced build
                          </span>
                        )}
                      </div>
                    </div>

                    {visibleSynergies.length > 0 ? (
                      <div className="mt-2">
                        <div className="atlas-map-label text-[9px] text-slate-500">Synergy</div>
                        <div className="mt-1 space-y-1.5">
                          {visibleSynergies.map((synergy) => (
                            <div
                              key={synergy}
                              className="rounded-2xl border border-cyan-200/10 bg-cyan-500/5 px-3 py-1.5 text-[10px] leading-relaxed text-cyan-50"
                            >
                              {synergy}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="atlas-scroll flex min-h-0 flex-col gap-2.5 overflow-y-auto rounded-[1.1rem] border border-white/10 bg-slate-950/72 p-2.5">
              <div>
                <div className="atlas-map-label text-[10px] text-slate-400">Launch</div>
                <div className="mt-1 text-sm font-black text-white">
                  {selectedLevelLocked ? 'Route still locked' : 'Launch from the dock'}
                </div>
                <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                  {selectedLevelLocked ? `Needs L${Math.max(1, selectedLevel.id - 1)} clear` : 'Play available'}
                </div>
                <div className="atlas-panel-copy mt-1.5 text-[0.7rem] leading-relaxed text-slate-300">
                  {selectedLevelLocked
                    ? `Clear L${Math.max(1, selectedLevel.id - 1)} first to bring this lane online.`
                    : 'Inspect the line, then play when the swing feels right.'}
                </div>
              </div>
              <button
                onClick={onStartGame}
                disabled={selectedLevelLocked}
                className={`mt-auto rounded-2xl px-4 py-2 text-[0.88rem] font-bold transition-all ${
                  selectedLevelLocked
                    ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                    : 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/30 hover:-translate-y-0.5 hover:bg-emerald-300'
                }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Play size={18} />
                    {selectedLevelLocked ? 'Locked Route' : 'Play Route'}
                  </span>
              </button>
            </div>
          </div>
        ) : (
            <div className="flex h-full items-center justify-between gap-4">
              <div>
                <div className="atlas-map-label text-sm text-slate-400">Route</div>
                <div className="atlas-title mt-1 text-[1.25rem] text-white">Choose a route</div>
                <div className="atlas-panel-copy mt-1 text-[0.8rem] text-slate-300">Click inspects. Double click previews, then launches.</div>
              </div>
            <div className="atlas-chip rounded-full px-4 py-2 text-sm font-semibold text-slate-300">
              Open L{highestUnlockedLevel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
