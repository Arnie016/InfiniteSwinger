import React from 'react';
import {
  Anchor,
  BookOpen,
  CheckCircle2,
  Coins,
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
  Volume2,
  VolumeX,
  Waves,
  Wind,
} from 'lucide-react';

import {
  CurrentBuildSummary,
  Enemy,
  LevelConfig,
  LevelResult,
  SaveData,
  WeatherType,
} from '../../types';
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

type Props = {
  saveData: SaveData;
  selectedLevel: LevelConfig | null;
  selectedLevelResult: LevelResult | null;
  selectedLevelLocked: boolean;
  highestUnlockedLevel: number;
  hasCompletedStoryIntro: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  currentBuild: CurrentBuildSummary;
  weatherLabels: Record<WeatherType, string>;
  enemyLabels: Record<Enemy['enemyType'], string>;
  onStartGame: () => void;
  onOpenShop: () => void;
  onOpenStory: () => void;
  onOpenSettings: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void | Promise<void>;
  onCenterSelected: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
};

export function MenuScreen({
  saveData,
  selectedLevel,
  selectedLevelResult,
  selectedLevelLocked,
  highestUnlockedLevel,
  hasCompletedStoryIntro,
  isMuted,
  isFullscreen,
  currentBuild,
  weatherLabels,
  enemyLabels,
  onStartGame,
  onOpenShop,
  onOpenStory,
  onOpenSettings,
  onToggleMute,
  onToggleFullscreen,
  onCenterSelected,
  onZoomIn,
  onZoomOut,
  onResetView,
}: Props) {
  const primaryReach = currentBuild.rope[0];
  const primaryDrive = currentBuild.movement[0];
  const primaryGuard = currentBuild.defense[0];
  const RopeIcon = ropeTypeGlyphs[currentBuild.ropeType.id];

  const quickBuildTiles = [
    { label: 'Rope', toneKey: 'cyan' as const, icon: <Wind size={14} />, entry: primaryReach, tone: 'bg-cyan-500/10 text-cyan-100 border-cyan-200/15' },
    { label: 'Launch', toneKey: 'emerald' as const, icon: <Sparkles size={14} />, entry: primaryDrive, tone: 'bg-emerald-500/10 text-emerald-100 border-emerald-200/15' },
    { label: 'Survival', toneKey: 'amber' as const, icon: <Shield size={14} />, entry: primaryGuard, tone: 'bg-amber-500/10 text-amber-100 border-amber-200/15' },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-ui text-white">
      <div className="pointer-events-auto absolute left-4 top-4 w-[140px] atlas-surface atlas-elevated px-3 py-3">
        <div className="atlas-map-label text-xs text-emerald-200/80">Forest To Magma</div>
        <h1 className="atlas-title mt-2 text-[1.56rem] leading-[0.92] text-white">Infinite Swinger</h1>
        <p className="atlas-panel-copy mt-1.5 text-[0.86rem] text-slate-200">Inspect. Launch. Explore.</p>
        <div className="atlas-surface-soft mt-3 rounded-2xl px-3 py-2 text-[0.8rem] text-slate-200">
          Drag to roam. Double click starts.
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button
            onClick={onZoomOut}
            className="atlas-chip rounded-xl px-0 py-2 text-slate-100 transition-colors hover:bg-slate-800"
            title="Zoom out"
          >
            <span className="inline-flex items-center justify-center"><Minus size={15} /></span>
          </button>
          <button
            onClick={onResetView}
            className="atlas-chip rounded-xl px-0 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-100 transition-colors hover:bg-slate-800"
            title="Reset view"
          >
            Map
          </button>
          <button
            onClick={onZoomIn}
            className="atlas-chip rounded-xl px-0 py-2 text-slate-100 transition-colors hover:bg-slate-800"
            title="Zoom in"
          >
            <span className="inline-flex items-center justify-center"><Plus size={15} /></span>
          </button>
        </div>
      </div>

      <div className="pointer-events-auto absolute left-1/2 top-2 w-[min(280px,calc(100vw-20rem))] -translate-x-1/2 atlas-surface atlas-elevated px-3 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="atlas-map-label text-[10px] text-emerald-200/80">Loadout</div>
            <div className="atlas-title truncate text-[0.95rem] text-white">{currentBuild.equippedSkin}</div>
            <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/8 bg-slate-950/65 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-200">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-white/5 text-cyan-200">
                <RopeIcon size={10} />
              </span>
              <span className="text-emerald-200">Rope</span>
              {currentBuild.ropeType.label}
            </div>
                <div className="mt-1.5 flex items-center gap-1.5">
              <div className="atlas-chip rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                Trail
              </div>
              <div className="flex items-center gap-1.5" aria-label={`Camp progress level ${highestUnlockedLevel}`}>
                {Array.from({ length: 10 }).map((_, index) => (
                  <span
                    key={`camp-dot-${index}`}
                    className={`h-3 w-3 rounded-full border border-white/10 ${
                      index < highestUnlockedLevel ? 'bg-emerald-200' : 'bg-white/8 opacity-30'
                    }`}
                  />
                ))}
              </div>
              <div className="atlas-chip rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                L{highestUnlockedLevel}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
              {quickBuildTiles.map(({ label, toneKey, icon, entry, tone }) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-slate-900/72 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${tone}`}>
                        {icon}
                      </span>
                      {label}
                    </span>
                  </div>
                  <div className="mt-1 text-[0.86rem] font-bold text-white">{entry?.label ?? 'Base'}</div>
                  <LevelDots level={entry?.level ?? 0} tone={toneKey} />
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-auto absolute right-3 top-3 flex w-[160px] flex-col gap-2 atlas-surface atlas-elevated p-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-[1.35rem] font-black text-amber-300">
            <Coins size={22} />
            {saveData.totalTokens}
          </div>
          <div className="atlas-chip rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            {highestUnlockedLevel}/10 open
          </div>
        </div>
          <div className="grid grid-cols-2 gap-2">
            <TopActionButton label="Shop" icon={<ShoppingBag size={15} />} onClick={onOpenShop} />
            <TopActionButton label="Settings" icon={<Settings2 size={15} />} onClick={onOpenSettings} />
            <TopActionButton label={hasCompletedStoryIntro ? 'Story' : 'Tour'} icon={<BookOpen size={15} />} onClick={onOpenStory} />
            <TopActionButton label={isMuted ? 'Sound Off' : 'Sound On'} icon={isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />} onClick={onToggleMute} />
            <TopActionButton className="col-span-2 w-full justify-center" label={isFullscreen ? 'Window' : 'Full'} icon={<Maximize2 size={15} />} onClick={onToggleFullscreen} />
          </div>
      </div>

      <div className="pointer-events-auto absolute bottom-2 left-1/2 w-[min(680px,calc(100vw-1rem))] -translate-x-1/2 atlas-surface-strong atlas-elevated p-2">
        {selectedLevel ? (
          <div className="grid h-full gap-2 lg:grid-cols-[minmax(0,1fr),136px]">
            <div className="min-w-0 h-full overflow-hidden">
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
              </div>

              <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
                <div>
                  <div className="atlas-map-label text-[9px] text-slate-400">Route</div>
                  <div className="atlas-title mt-0.5 text-[1.08rem] leading-[0.95] text-white">
                    L{selectedLevel.id} <span className="text-amber-200">{selectedLevel.name}</span>
                  </div>
                </div>
                <div className="atlas-panel-copy text-[0.74rem] text-slate-300">{selectedLevel.description}</div>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {selectedLevel.actTemplates.slice(0, 3).map((act) => (
                  <span key={act} className="atlas-chip rounded-full px-2.5 py-1 text-[10px] text-slate-200">
                    {act === 'reward' ? 'Reward' : act === 'hazard' ? 'Hazard' : act === 'speed' ? 'Speed' : act === 'finale' ? 'Finale' : 'Recovery'}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex h-full flex-col justify-between gap-2 atlas-surface-soft rounded-[1.1rem] p-2">
              <div>
                <div className="atlas-map-label text-[10px] text-slate-400">Launch</div>
                <div className="atlas-panel-copy mt-1 text-[0.7rem] text-slate-300">Center or launch.</div>
                <button
                  onClick={onCenterSelected}
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/72 px-3 py-1.5 text-[10px] font-semibold text-slate-100 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  <Map size={14} />
                  Center
                </button>
              </div>
              <button
                onClick={onStartGame}
                disabled={selectedLevelLocked}
                className={`rounded-2xl px-4 py-2.5 text-[0.9rem] font-bold transition-all ${
                  selectedLevelLocked
                    ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                    : 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/30 hover:-translate-y-0.5 hover:bg-emerald-300'
                }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Play size={18} />
                    {selectedLevelLocked ? 'Locked Route' : 'Play Level'}
                  </span>
              </button>
            </div>
          </div>
        ) : (
            <div className="flex h-full items-center justify-between gap-4">
              <div>
                <div className="atlas-map-label text-sm text-slate-400">Route</div>
                <div className="atlas-title mt-1 text-[1.25rem] text-white">Choose a route</div>
                <div className="atlas-panel-copy mt-1 text-[0.8rem] text-slate-300">Click inspects. Double click launches.</div>
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
