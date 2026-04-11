
import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { GameState, AbilityType, Vector2, Entity, Enemy, Particle, SaveData, ShopItem, BiomeType, FloatingText, SkillChainState, SkillRank, WeatherType, LevelConfig, TutorialState, CheckpointState, GameSettings, LevelResult, RouteBeat, RouteLane, DebugFlags, PurchaseReceipt, SwingLabConfig, PlayerMoodPreset, MapRegion, SettingsTab, SaveBackupV1, VisualDensity, RunDebrief, RunHistoryEntry, StoryBeat, StoryCastId, StoryPanelScene, FeaturedRouteCup } from './types';
import { Zap, Rocket, Grab, Play, RotateCcw, Skull, ShoppingCart, Coins, Home, MousePointer2, Move, Wind, Eye, CloudRain, Snowflake, CloudFog, Leaf, Pause, PlayCircle, TrendingUp, AlertTriangle, Crosshair, Clock, Compass, Flower, Shield, Heart, Trophy, Star, Activity, Sparkles, Hourglass, Gem, Ghost, Lock, Map as MapIcon, CheckCircle, BookOpen, Anchor, Scroll, Shirt, Hammer, X, Sprout, Feather, LifeBuoy, Keyboard, PauseCircle, LogOut, Egg, Trash2, Brain, ChevronDown, Lightbulb, Check, HelpCircle, ArrowRight, Volume2, VolumeX, Repeat, Book, Settings, Flag } from 'lucide-react';
import { audioManager } from './services/audioManager';
import { clearPersistedSaveData, createSaveBackup, loadSaveData, parseSaveBackup, persistSaveData } from './services/persistence';
import { LandingScreen } from './components/ui/LandingScreen';
import { StoryCastPortrait } from './components/ui/StoryCastPortrait';
import { STORY_SCENE_PALETTE } from './content/storyCast';
import { BIOMES, DEFAULT_SAVE, INTRO_STORY_SEQUENCE, LEVELS, MAP_REGIONS, ROUTE_SCRIPTS, SHOP_ITEMS, THEME_PROFILES } from './gameData';
import { DEFAULT_DEBUG_FLAGS, DEFAULT_ENGINE_CONFIG } from './engine/config';
import { getBundledMonkeySprite, pickMusicProfileForBiome, resolveAudioCueUrl } from './engine/assets';
import { drawMonkeyUpgradeGear, getMonkeyCosmeticState, getRopeVisualState } from './engine/cosmetics';
import { getCurrentBuildSummary, withDerivedProgression } from './engine/playerProfile';
import { BALANCED_SWING_LAB_CONFIG, resolveSwingLabConfig } from './engine/swingLab';
import { formatDurationMs } from './engine/uiFormat';
import { playRouteSelectSound, prefetchRouteSelectSound } from './services/routeSelectSound';

const SettingsModal = lazy(() =>
    import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal })),
);
const EndRunModal = lazy(() =>
    import('./components/ui/EndRunModal').then((module) => ({ default: module.EndRunModal })),
);
const MenuScreen = lazy(() =>
    import('./components/ui/MenuScreen').then((module) => ({ default: module.MenuScreen })),
);
const ProgressSidebar = lazy(() =>
    import('./components/ui/ProgressSidebar').then((module) => ({ default: module.ProgressSidebar })),
);
const LeaderboardScreen = lazy(() =>
    import('./components/ui/LeaderboardScreen').then((module) => ({ default: module.LeaderboardScreen })),
);
const ShopScreen = lazy(() =>
    import('./components/ui/ShopScreen').then((module) => ({ default: module.ShopScreen })),
);
const StoryMapOverlay = lazy(() =>
    import('./components/ui/StoryMapOverlay').then((module) => ({ default: module.StoryMapOverlay })),
);

function SurfaceLoader({ label }: { label: string }) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/72">
            <div className="rounded-2xl border border-white/10 bg-slate-950/88 px-6 py-4 text-white shadow-2xl">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/65">Loading</div>
                <div className="mt-2 text-2xl font-black">{label}</div>
            </div>
        </div>
    );
}

const getCompassHeading = (angleDeg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const normalized = ((angleDeg % 360) + 360) % 360;
    const index = Math.round(normalized / 45) % directions.length;
    return directions[index];
};

function LaunchIntroOverlay({
    intro,
    currentTimeMs,
    compassAngleDeg,
    onSkip,
}: {
    intro: LaunchIntroState;
    currentTimeMs: number;
    compassAngleDeg: number;
    onSkip: () => void;
}) {
    const launchButtonRef = useRef<HTMLButtonElement | null>(null);
    const level = LEVELS[intro.levelId - 1] ?? null;
    const palette = STORY_SCENE_PALETTE[intro.banner.scene];
    const remainingMs = Math.max(0, intro.endsAtMs - currentTimeMs);
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const progress = Math.max(0, Math.min(1, 1 - remainingMs / Math.max(1, intro.durationMs)));
    const heading = getCompassHeading(compassAngleDeg);
    const routeLabel = level ? `L${level.id} ${level.name}` : intro.banner.title;

    useEffect(() => {
        launchButtonRef.current?.focus({ preventScroll: true });
    }, [intro.levelId]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return;

            const target = event.target as HTMLElement | null;
            const tagName = target?.tagName;
            if (target && (target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT')) {
                return;
            }

            if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSkip();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onSkip]);

    return (
        <div
            className="fixed inset-0 z-50 overflow-hidden bg-slate-950/96 font-ui text-white"
            role="dialog"
            aria-modal="true"
            aria-label={`Launch preview for ${routeLabel}`}
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_80%_18%,rgba(52,211,153,0.13),transparent_24%),radial-gradient(circle_at_50%_82%,rgba(251,191,36,0.12),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.42))]" />
            <div className="pointer-events-auto relative grid h-full w-full grid-rows-[minmax(0,0.98fr)_minmax(0,1.02fr)] lg:grid-cols-[1.08fr_0.92fr] lg:grid-rows-none">
                <div className="relative min-h-[48svh] overflow-hidden border-b border-white/10 lg:border-b-0 lg:border-r">
                        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 960 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="presentation">
                            <defs>
                                <linearGradient id={`launch-sky-${intro.levelId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={palette.skyFrom} />
                                    <stop offset="100%" stopColor={palette.skyTo} />
                                </linearGradient>
                                <radialGradient id={`launch-glow-${intro.levelId}`} cx="50%" cy="26%" r="54%">
                                    <stop offset="0%" stopColor={palette.glow} stopOpacity="0.96" />
                                    <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
                                </radialGradient>
                                <radialGradient id={`launch-vignette-${intro.levelId}`} cx="50%" cy="48%" r="70%">
                                    <stop offset="55%" stopColor="rgba(2,6,23,0)" />
                                    <stop offset="100%" stopColor="rgba(2,6,23,0.56)" />
                                </radialGradient>
                            </defs>
                            <rect x="0" y="0" width="960" height="720" fill={`url(#launch-sky-${intro.levelId})`} />
                            <ellipse cx="488" cy="148" rx="238" ry="114" fill={`url(#launch-glow-${intro.levelId})`}>
                                <animate attributeName="ry" values="110;124;110" dur="4.4s" repeatCount="indefinite" />
                            </ellipse>
                            <path d="M0 500C114 448 208 428 304 460C392 490 472 496 558 462C650 426 748 430 960 506V720H0Z" fill={palette.ridge} opacity="0.94" />
                            <path d="M0 566C126 528 238 514 342 538C434 560 512 564 602 540C704 512 804 518 960 574V720H0Z" fill="#08111d" opacity="0.84" />
                            <path d="M176 156L188 588" stroke="#1f2937" strokeWidth="20" strokeLinecap="round" />
                            <path d="M188 188C226 184 258 170 284 144" stroke="#2a4a3f" strokeWidth="12" strokeLinecap="round" />
                            <path d="M188 222C228 228 262 220 292 196" stroke="#2a4a3f" strokeWidth="11" strokeLinecap="round" />
                            <path d="M760 150L744 588" stroke="#1f2937" strokeWidth="20" strokeLinecap="round" />
                            <path d="M744 188C706 182 672 168 640 140" stroke="#263646" strokeWidth="12" strokeLinecap="round" />
                            <path d="M230 140C314 164 396 214 476 292" fill="none" stroke={palette.accent} strokeWidth="5.5" strokeLinecap="round" strokeDasharray="10 10">
                                <animate attributeName="stroke-dashoffset" values="0;-84" dur="3.1s" repeatCount="indefinite" />
                            </path>
                            <g transform="translate(0 0)">
                                <animateTransform attributeName="transform" type="translate" values="0 0;0 -10;0 0" dur="3.4s" repeatCount="indefinite" />
                                <path d="M484 288C502 264 520 256 540 260C558 264 574 278 584 300C552 318 520 326 490 324C486 314 484 300 484 288Z" fill="#0b1020" />
                                <circle cx="522" cy="240" r="24" fill="#0b1020" />
                                <circle cx="532" cy="233" r="6" fill={palette.accent} />
                                <path d="M510 264L500 324" stroke="#0b1020" strokeWidth="10" strokeLinecap="round" />
                                <path d="M534 266L568 312" stroke="#0b1020" strokeWidth="10" strokeLinecap="round" />
                                <path d="M496 286L448 300" stroke="#0b1020" strokeWidth="10" strokeLinecap="round" />
                                <path d="M574 286L610 250" stroke="#0b1020" strokeWidth="10" strokeLinecap="round" />
                                <path d="M610 250L646 204" stroke={palette.accent} strokeWidth="6" strokeLinecap="round" />
                            </g>
                            <rect x="0" y="0" width="960" height="720" fill={`url(#launch-vignette-${intro.levelId})`} />
                        </svg>

                        <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-slate-950/72 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-100">
                            Route preview
                        </div>
                        <div className="absolute right-5 top-5 rounded-full border border-white/15 bg-slate-950/72 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/82">
                            {intro.banner.kicker}
                        </div>
                        <div className="absolute bottom-5 left-5 max-w-[80%] rounded-[1.1rem] border border-white/15 bg-slate-950/80 px-4 py-3 shadow-2xl shadow-black/40">
                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">{intro.banner.speaker}</div>
                            <div className="mt-1 text-sm font-semibold leading-relaxed text-white">{intro.banner.caption}</div>
                        </div>
                    </div>

                <div className="flex min-h-0 flex-col overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="atlas-map-label text-[10px] uppercase tracking-[0.34em] text-emerald-200/70">Route briefing</div>
                            </div>
                            <button
                                ref={launchButtonRef}
                                type="button"
                                onClick={onSkip}
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/[0.08]"
                            >
                                <X size={12} />
                                Skip
                            </button>
                        </div>

                        <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_24px_60px_rgba(2,6,23,0.24)]">
                            <div className="flex items-center gap-3">
                                <div className="relative h-14 w-14 rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.14),rgba(15,23,42,0.92))]">
                                    <span className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/75">N</span>
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">E</span>
                                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">S</span>
                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">W</span>
                                    <div
                                        className="absolute left-1/2 top-1/2 h-[24px] w-[3px] -translate-x-1/2 -translate-y-[90%] rounded-full bg-gradient-to-b from-emerald-200 via-cyan-200 to-transparent shadow-[0_0_14px_rgba(125,211,252,0.45)] transition-transform duration-500"
                                        style={{ transform: `translate(-50%, -90%) rotate(${compassAngleDeg}deg)` }}
                                    />
                                    <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-slate-950" />
                                </div>
                                <div className="min-w-0">
                                    <div className="atlas-map-label text-[9px] uppercase tracking-[0.22em] text-white/55">Compass</div>
                                    <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-emerald-100">
                                        <Compass size={14} />
                                        {heading}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Route bearing</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5">
                            <div className="atlas-map-label text-[11px] uppercase tracking-[0.34em] text-white/55">{intro.banner.kicker}</div>
                            <div className="atlas-title mt-2 text-4xl text-white">{routeLabel}</div>
                            <div className="mt-3 text-[1.02rem] leading-relaxed text-slate-300">{level?.description ?? intro.banner.subtitle}</div>
                        </div>

                        {level ? (
                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="atlas-chip rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100">
                                    {level.biome}
                                </span>
                                <span className="atlas-chip rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100">
                                    {level.targetDistance}m route
                                </span>
                                <span className="atlas-chip rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100">
                                    {level.checkpointCount} checkpoints
                                </span>
                            </div>
                        ) : null}

                        <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_24px_60px_rgba(2,6,23,0.24)]">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex shrink-0 items-start -space-x-3">
                                        {intro.banner.characterId ? (
                                            <StoryCastPortrait characterId={intro.banner.characterId} scene={intro.banner.scene} size={56} />
                                        ) : null}
                                        {intro.banner.supportCharacterId ? (
                                            <StoryCastPortrait
                                                characterId={intro.banner.supportCharacterId}
                                                scene={intro.banner.scene}
                                                size={48}
                                                priority="support"
                                                className="mt-5"
                                            />
                                        ) : null}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="atlas-map-label text-[9px] uppercase tracking-[0.22em] text-white/45">Crew signal</div>
                                        <div className="mt-1 text-sm font-black text-white">{intro.banner.speaker}</div>
                                        <div className="mt-1 text-[11px] leading-relaxed text-slate-300">{intro.banner.caption}</div>
                                    </div>
                                </div>
                                <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/65">
                                    {intro.banner.rivalStatus}
                                </div>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                                <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3">
                                    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-100/70">Mission</div>
                                    <div className="mt-1 text-sm font-black text-white">{intro.banner.missionTitle}</div>
                                    <div className="mt-1 text-[11px] leading-relaxed text-slate-300">{intro.banner.missionDetail}</div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3">
                                    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Rival detail</div>
                                    <div className="mt-1 text-[11px] leading-relaxed text-white">{intro.banner.rivalDetail}</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto rounded-[1.4rem] border border-white/10 bg-slate-950/55 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-100/70">
                                        <Clock size={12} />
                                        Launch countdown
                                    </div>
                                    <div className="mt-1 text-2xl font-black text-white">{remainingSeconds}s</div>
                                </div>
                                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                                    Skip available
                                </div>
                            </div>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-200 transition-[width] duration-100"
                                    style={{ width: `${Math.round(progress * 100)}%` }}
                                />
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-white/45">
                                <span>Esc / Enter / Space skip the preview</span>
                                <button
                                    type="button"
                                    onClick={onSkip}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-emerald-500/12 px-3 py-1.5 font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/18"
                                >
                                    <Play size={12} />
                                    Launch now
                                </button>
                            </div>
                        </div>
                </div>
            </div>
        </div>
    );
}

// --- CONSTANTS ---
const GRAVITY_BASE = DEFAULT_ENGINE_CONFIG.physics.gravity;
const AIR_RESISTANCE = DEFAULT_ENGINE_CONFIG.physics.airResistance;
const MAX_SPEED = DEFAULT_ENGINE_CONFIG.physics.maxSpeed;
const CEILING_LIMIT = Math.max(-220, DEFAULT_ENGINE_CONFIG.physics.ceilingLimit - 120);
const SPAWN_RATE_BASE = 300;
const JUMP_MAX_CHARGES = 3;
const JUMP_RECHARGE_SECONDS = 5;
const JUMP_BASE_POWER = 16.5;
const JUMP_POWER_PER_LEVEL = 0.42;
const JUMP_COOLDOWN_REDUCTION_PER_LEVEL = 0.18;
const CANVAS_WIDTH = DEFAULT_ENGINE_CONFIG.ui.canvasWidth;
const CANVAS_HEIGHT = DEFAULT_ENGINE_CONFIG.ui.canvasHeight;
const VOID_TIMER_MAX_SECONDS = 3.0;
const ROPE_BREAK_TIME_SECONDS = DEFAULT_ENGINE_CONFIG.rope.breakTimeSeconds;
const GRAPPLE_ASSIST_RADIUS = DEFAULT_ENGINE_CONFIG.rope.assistRadius;
const MAX_LIVES = DEFAULT_ENGINE_CONFIG.ui.maxLives;
const INVULNERABILITY_TIME = 60;
const CHAIN_TIMEOUT_FRAMES = 150;
const BASE_MULTIPLIER = 1.0;
const MAX_MULTIPLIER = 5.0;
const MASTER_MUSIC_VOLUME = DEFAULT_ENGINE_CONFIG.audio.masterMusicVolume;
const STARTER_ZONE_END = 900;
const DRAW_MARGIN = DEFAULT_ENGINE_CONFIG.ui.drawMargin;
const FIXED_TIMESTEP = DEFAULT_ENGINE_CONFIG.physics.fixedTimestep;
const FIXED_TIMESTEP_MS = DEFAULT_ENGINE_CONFIG.physics.fixedTimestepMs;
const MAX_CATCH_UP_STEPS = DEFAULT_ENGINE_CONFIG.physics.maxCatchUpSteps;
const SWING_AIR_RESISTANCE = DEFAULT_ENGINE_CONFIG.physics.swingAirResistance;
const SWING_MOMENTUM_RETENTION = DEFAULT_ENGINE_CONFIG.physics.swingMomentumRetention;
const GROUND_FRICTION = DEFAULT_ENGINE_CONFIG.physics.groundFriction;
const COYOTE_TIME_SECONDS = 0.14;
const PLATFORM_DROP_TIME_SECONDS = 0.18;
const HUD_SYNC_INTERVAL_SECONDS = DEFAULT_ENGINE_CONFIG.ui.hudSyncIntervalSeconds;
const RELEASE_RETRACT_TIME_SECONDS = DEFAULT_ENGINE_CONFIG.rope.releaseRetractTimeSeconds;
const RETARGET_GRACE_SECONDS = DEFAULT_ENGINE_CONFIG.rope.retargetGraceSeconds;
const ROPE_REEL_SPRING = DEFAULT_ENGINE_CONFIG.rope.reelSpring;
const ROPE_REEL_DAMPING = DEFAULT_ENGINE_CONFIG.rope.reelDamping;
const ROPE_REEL_MAX_SPEED = DEFAULT_ENGINE_CONFIG.rope.reelMaxSpeed;
const NON_PLAYING_FRAME_INTERVAL_MS = 1000 / 30;
const MAX_PARTICLES = 260;
const MAX_FLOATING_TEXTS = 40;
const MENU_MAP_WORLD_SCALE = 1.46;
const MENU_MAP_WORLD_WIDTH = CANVAS_WIDTH * MENU_MAP_WORLD_SCALE;
const MENU_MAP_WORLD_HEIGHT = CANVAS_HEIGHT * MENU_MAP_WORLD_SCALE;
const MENU_CAMERA_MIN_ZOOM = 0.74;
const MENU_CAMERA_MAX_ZOOM = 1.04;
const LEVEL_NODE_HIT_RADIUS = 118;
const MENU_DRAG_THRESHOLD = 1;
const MENU_DRAG_FRICTION = 0.88;
const ATLAS_FRAME_LOW_MS = 24;
const ATLAS_FRAME_MEDIUM_MS = 18;
const MAX_ROUTE_DIFFICULTY = Math.max(...LEVELS.map((level) => level.difficulty), 1);
const ROUTE_PROFILE_THRESHOLD = {
    speedTemplateCap: 4 / MAX_ROUTE_DIFFICULTY,
    microBranchCap: 3 / MAX_ROUTE_DIFFICULTY,
    helperBranchCap: 4 / MAX_ROUTE_DIFFICULTY,
    hazardBranchCap: 5 / MAX_ROUTE_DIFFICULTY,
    lateRouteAidCap: 6 / MAX_ROUTE_DIFFICULTY,
} as const;
const ROUTE_DIFFICULTY_PROFILE = {
    earlySupportCap: 3 / MAX_ROUTE_DIFFICULTY,
    midGemCap: 5 / MAX_ROUTE_DIFFICULTY,
    midEnemyCap: 4 / MAX_ROUTE_DIFFICULTY,
    lateEnemyCap: 6 / MAX_ROUTE_DIFFICULTY,
} as const;

const getRouteProgress = (level: LevelConfig): number => {
    return clamp(level.difficulty / MAX_ROUTE_DIFFICULTY, 0, 1);
};

const getRouteSpawnProfile = (level: LevelConfig) => {
    const routeProgress = getRouteProgress(level);
    return {
        routeProgress,
        spawnChance: clamp(0.22 + routeProgress * 0.72 + (routeProgress >= ROUTE_PROFILE_THRESHOLD.lateRouteAidCap ? 0.06 : 0), 0.22, 0.95),
        allowEarlySupportVines: routeProgress <= ROUTE_DIFFICULTY_PROFILE.earlySupportCap,
        includeMidGemBonus: routeProgress >= ROUTE_DIFFICULTY_PROFILE.midGemCap,
        hasMidThreatWindow: routeProgress > ROUTE_DIFFICULTY_PROFILE.midEnemyCap,
        hasLateThreatWindow: routeProgress > ROUTE_DIFFICULTY_PROFILE.lateEnemyCap,
    };
};

type RouteSegmentTemplate = 'recovery' | 'speed' | 'vertical' | 'hazard' | 'gem';

type EnemyWeight = {
    enemyType: Enemy['enemyType'];
    weight: number;
};

const ENEMY_BASE_WEIGHTS: Record<Enemy['enemyType'], number> = {
    bird: 1.05,
    bonus_bird: 0.55,
    eagle: 0.45,
    bat: 0.95,
    snake: 0.9,
    spider: 1.1,
    crocodile: 0.8,
    slug: 0.68,
    troll: 0.58,
};

const buildRouteEnemyWeights = (
    level: LevelConfig,
    routeProgress: number,
    routeTemplate: RouteSegmentTemplate,
) => {
    if (level.biome === 'JUNGLE') {
        return [{ enemyType: 'bird' as const, weight: 1 }];
    }

    const allowedEnemies = level.allowedEnemies;
    if (allowedEnemies.length === 0) {
        return [];
    }

    const isVolcano = level.biome === 'VOLCANO';
    const isSwamp = level.biome === 'SWAMP';
    const isCave = level.biome === 'CAVE';
    const isHazardRoute = routeTemplate === 'hazard';
    const isSpeedRoute = routeTemplate === 'speed';
    const isVerticalRoute = routeTemplate === 'vertical';

    const latePhase = clamp((routeProgress - 0.42) / 0.58, 0, 1);
    const baseAirBias = clamp(0.64 - routeProgress * 0.3, 0.22, 0.78);
    const routeTemplateAirShift = isSpeedRoute ? 0.08 : isHazardRoute ? -0.1 : isVerticalRoute ? 0.06 : 0;
    const biomeGroundBias =
        isVolcano ? 0.16 : isCave ? 0.1 : isSwamp ? -0.08 : 0;
    const airBias = clamp(
        baseAirBias + routeTemplateAirShift + biomeGroundBias * -1 + latePhase * -0.16,
        0.2,
        0.85,
    );
    const groundBias = 1 - airBias;

    const isLate = routeProgress > ROUTE_DIFFICULTY_PROFILE.lateEnemyCap;
    const isMid = routeProgress > ROUTE_DIFFICULTY_PROFILE.midEnemyCap && !isLate;

    const weightedEnemies = allowedEnemies.reduce<EnemyWeight[]>((entries, enemyType) => {
        const baseWeight = ENEMY_BASE_WEIGHTS[enemyType];
        const isAerial = enemyType === 'bird' || enemyType === 'bonus_bird' || enemyType === 'eagle' || enemyType === 'bat';
        const isGround = enemyType === 'snake' || enemyType === 'spider' || enemyType === 'slug' || enemyType === 'crocodile' || enemyType === 'troll';
        let finalWeight = baseWeight * (isAerial ? airBias : groundBias);

        if (isVolcano && isGround) finalWeight *= 1.15;
        if (isSwamp && isGround) finalWeight *= 1.16;
        if (isCave && isGround && enemyType === 'spider') finalWeight *= 1.28;
        if (isCave && isGround && enemyType === 'troll') finalWeight *= 1.16;
        if (isHazardRoute && isGround) finalWeight *= isLate ? 1.35 : 1.22;
        if (isMid && enemyType === 'snake') finalWeight *= 1.16;
        if (isLate && enemyType === 'crocodile') finalWeight *= 1.22;
        if (isLate && (enemyType === 'bat' || enemyType === 'bonus_bird')) finalWeight *= 0.82;

        if (isSpeedRoute && isAerial) finalWeight *= 1.14;
        if (isVerticalRoute && enemyType === 'eagle') finalWeight *= 1.22;

        return finalWeight > 0 ? [...entries, { enemyType, weight: finalWeight }] : entries;
    }, []);

    const totalWeight = weightedEnemies.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return [];
    return weightedEnemies;
};

const pickWeighted = <T extends { weight: number }>(options: T[], randomValue: () => number): T | null => {
    if (options.length === 0) return null;
    const totalWeight = options.reduce((sum, option) => sum + Math.max(0, option.weight), 0);
    if (totalWeight <= 0) return null;

    const pick = randomValue() * totalWeight;
    let cursor = 0;

    for (let index = 0; index < options.length; index += 1) {
        const current = options[index];
        const safeWeight = Math.max(0, current.weight);
        cursor += safeWeight;
        if (pick <= cursor) {
            return current;
        }
    }

    return options[options.length - 1];
};

type AtlasQuality = 'low' | 'medium' | 'high';

const DEFAULT_RUNTIME_SETTINGS: SwingLabConfig = {
    ...BALANCED_SWING_LAB_CONFIG,
    gravity: GRAVITY_BASE,
    airResistance: AIR_RESISTANCE,
    swingAirResistance: SWING_AIR_RESISTANCE,
    swingMomentumRetention: SWING_MOMENTUM_RETENTION,
    groundFriction: GROUND_FRICTION,
    maxSpeed: MAX_SPEED,
    ropeReelSpring: ROPE_REEL_SPRING,
    ropeReelDamping: ROPE_REEL_DAMPING,
    ropeReelMaxSpeed: ROPE_REEL_MAX_SPEED,
    musicVolume: MASTER_MUSIC_VOLUME,
};

type RuntimeSettings = SwingLabConfig;
type MusicProfile = {
    url: string | null;
    rate: number;
    startOffset: number;
    signature: string;
};

const UI_PREFERENCES_KEY = 'polyjungle_ui_preferences_v1';
const RECOMMENDATION_METRICS_KEY = 'polyjungle_recommendation_metrics_v1';
const RECOMMENDATION_TREND_KEY = 'polyjungle_recommendation_trend_v1';
const LEADERBOARD_COMMUNITY_STORAGE_KEY = 'polyjungle_leaderboard_community_v1';
const LEADERBOARD_ALIAS_KEY = 'polyjungle_leaderboard_alias_v1';
const LEADERBOARD_REMOTE_SOURCE_KEY = 'polyjungle_leaderboard_remote_source_v1';
const LEADERBOARD_REMOTE_SYNC_AT_KEY = 'polyjungle_leaderboard_remote_sync_at_v1';
const LEADERBOARD_SHARE_QUERY_KEY = 'board';
const LEADERBOARD_ROUTE_QUERY_KEY = 'route';
const LEADERBOARD_VIEW_QUERY_KEY = 'view';
const LEADERBOARD_VIEW_LEADERBOARD = 'leaderboard';
const LEADERBOARD_SHARE_VERSION = 1;

type UiPreferenceKey = 'isMuted' | 'isProgressSidebarCollapsed' | 'isRunHudDetailsOpen' | 'isAtlasFocusMode';
const LEADERBOARD_REMOTE_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const RECOMMENDATION_TREND_WINDOW_SIZE = 7;
const RECOMMENDATION_TREND_HISTORY_SIZE = RECOMMENDATION_TREND_WINDOW_SIZE * 2;
const LEADERBOARD_SHARE_LIMIT = 10;
const COMMUNITY_BOARD_ENTRY_LIMIT = 80;
const RUN_HISTORY_RECENT_LIMIT = 80;
const RUN_HISTORY_BEST_PER_LEVEL_LIMIT = 3;
const RUN_HISTORY_ARCHIVE_LIMIT = 120;
const DEFAULT_BOARD_ALIAS = 'Swinger';
const LEADERBOARD_DELIMITED_HEADERS = [
    'playerLabel',
    'levelId',
    'levelName',
    'score',
    'tokens',
    'livesLeft',
    'isWin',
    'elapsedMs',
    'elapsed',
    'completedAt',
] as const;
const ENEMY_LABELS: Record<Enemy['enemyType'], string> = {
    bird: 'Birds',
    snake: 'Snakes',
    spider: 'Spiders',
    crocodile: 'Crocodiles',
    bonus_bird: 'Bonus Birds',
    bat: 'Bats',
    eagle: 'Eagles',
    slug: 'Slugs',
    troll: 'Trolls',
};

type RecommendationTrace = {
    itemId: string;
    itemName: string;
    levelId: number;
    levelName: string;
    offeredAt: number;
    openedAt: number | null;
};

type RecommendationMetrics = {
    offers: number;
    opens: number;
    purchases: number;
    skips: number;
    openDelayTotalMs: number;
    openDelaySamples: number;
    skipDelayTotalMs: number;
    skipDelaySamples: number;
    openToBuyTotalMs: number;
    openToBuySamples: number;
};

type RecommendationTrendSample = {
    runId: number;
    outcome: 'win' | 'fail' | null;
    offers: number;
    opens: number;
    purchases: number;
    skips: number;
    openDelayTotalMs: number;
    openDelaySamples: number;
    skipDelayTotalMs: number;
    skipDelaySamples: number;
    openToBuyTotalMs: number;
    openToBuySamples: number;
    completedAt: number;
};

type RecommendationTrendSummary = {
    offers: number;
    opens: number;
    purchases: number;
    skips: number;
    openRatePercent: number | null;
    buyRatePercent: number | null;
    avgOpenDelaySeconds: number | null;
    avgOpenToBuySeconds: number | null;
    avgSkipDelaySeconds: number | null;
    runSamples: number;
};

type CampaignChallenge = {
    levelId: number | null;
    title: string;
    description: string;
    note: string;
    tone: 'emerald' | 'amber' | 'cyan';
    progress: number;
    target: number;
};

type FeaturedRouteCupRunOutcome = {
    title: string;
    description: string;
    tone: 'emerald' | 'amber' | 'cyan' | 'rose';
};

type RouteRivalMarker = {
    status: 'first-mark' | 'trailing' | 'leading' | 'tied';
    label: string;
    detail: string;
    tone: {
        fill: string;
        stroke: string;
        text: string;
        glow: string;
    };
    isPriority: boolean;
};

type LeaderboardBoardEntry = RunHistoryEntry & {
    playerLabel: string;
    isLocal: boolean;
};

type LeaderboardSharePayload = {
    version: number;
    game: 'Infinite Swinger';
    sharedAt: number;
    alias: string;
    entries: Array<
        Pick<RunHistoryEntry, 'score' | 'levelId' | 'levelName' | 'isWin' | 'elapsedMs' | 'tokens' | 'livesLeft' | 'completedAt'> & {
            playerLabel: string;
        }
    >;
};

type SidebarAchievement = {
    id: string;
    title: string;
    detail: string;
    progress: string;
    unlocked: boolean;
};

type RunAchievementUnlock = Pick<SidebarAchievement, 'id' | 'title' | 'detail' | 'progress'>;

type RunIntroBannerState = {
    title: string;
    subtitle: string;
    kicker: string;
    speaker: string;
    accentWord: string;
    scene: StoryPanelScene;
    characterId?: StoryCastId;
    supportCharacterId?: StoryCastId;
    caption: string;
    missionTitle: string;
    missionDetail: string;
    rivalStatus: string;
    rivalDetail: string;
};

type LaunchIntroState = {
    levelId: number;
    banner: RunIntroBannerState;
    endsAtMs: number;
    durationMs: number;
};

type IncomingRouteChallenge = {
    levelId: number;
    challengerAlias: string;
};

type ActiveRoutePressure = {
    label: string;
    title: string;
    detail: string;
    targetScore: number | null;
    gapScore: number | null;
    progressPercent: number;
    tone: 'emerald' | 'cyan' | 'rose' | 'amber';
};

type ActiveFeaturedRoutePressure = ActiveRoutePressure & {
    statusLabel: string;
    countdownLabel: string;
    targetLabel: string;
};

const getRoutePressureToneClass = (tone: ActiveRoutePressure['tone']) =>
    tone === 'rose'
        ? 'border-rose-200/20 bg-rose-500/10 text-rose-100'
        : tone === 'cyan'
            ? 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100'
            : tone === 'amber'
                ? 'border-amber-200/20 bg-amber-500/10 text-amber-100'
                : 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
const readStringValue = (value: unknown, fallback = '') => (typeof value === 'string' && value.length > 0 ? value : fallback);
const readBooleanValue = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
const readStrictNumericValue = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const numeric = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
};

const findStoryBeatForLevel = (levelId: number): StoryBeat | null =>
    INTRO_STORY_SEQUENCE.beats.find((beat) => beat.focusLevelId === levelId)
    ?? INTRO_STORY_SEQUENCE.beats.find((beat) => beat.highlightLevelIds?.includes(levelId))
    ?? null;

const buildRunIntroBanner = (
    level: LevelConfig,
    saveData: SaveData,
    communityBoardEntries: LeaderboardBoardEntry[],
): RunIntroBannerState => {
    const storyBeat = findStoryBeatForLevel(level.id);
    const visual = storyBeat?.visual;
    const localBest = saveData.runHistory
        .filter((entry) => entry.levelId === level.id)
        .sort((left, right) => right.score - left.score || right.tokens - left.tokens || right.livesLeft - left.livesLeft)[0] ?? null;
    const rivalBest = communityBoardEntries
        .filter((entry) => entry.levelId === level.id)
        .sort((left, right) => right.score - left.score || right.tokens - left.tokens || right.livesLeft - left.livesLeft)[0] ?? null;

    let missionTitle = localBest ? 'Beat your route best' : 'Post the first benchmark';
    let missionDetail = localBest
        ? `Target ${localBest.score + Math.max(40, Math.round(level.targetDistance * 0.035))} pts and keep the line cleaner through the finish.`
        : `Land a clean clear on ${level.name} so this route finally gets a score to chase.`;
    let rivalStatus = rivalBest ? 'Imported rival online' : 'Solo route';
    let rivalDetail = rivalBest
        ? `${rivalBest.playerLabel} holds ${rivalBest.score} pts on this lane.`
        : 'No imported board yet. Share or import one to turn this route into a race.';

    if (rivalBest && localBest) {
        const gap = rivalBest.score - localBest.score;
        if (gap > 0) {
            missionTitle = `Close ${gap} pts on ${rivalBest.playerLabel}`;
            missionDetail = `Your best is ${localBest.score}. Beat ${rivalBest.score} to steal the route lead before the checkpoint chain ends.`;
            rivalStatus = 'Chasing rival';
            rivalDetail = `${rivalBest.playerLabel} leads by ${gap} pts on this route.`;
        } else if (gap < 0) {
            missionTitle = `Defend your ${Math.abs(gap)} pt lead`;
            missionDetail = `You own the route right now. Another clean run keeps ${rivalBest.playerLabel} behind and extends the margin.`;
            rivalStatus = 'Route under control';
            rivalDetail = `You lead ${rivalBest.playerLabel} by ${Math.abs(gap)} pts.`;
        } else {
            missionTitle = 'Break the deadlock';
            missionDetail = `You and ${rivalBest.playerLabel} are tied at ${localBest.score}. Cleaner tokens or a faster finish decides the lane.`;
            rivalStatus = 'Route tied';
            rivalDetail = `${rivalBest.playerLabel} exactly matched your best run.`;
        }
    } else if (!rivalBest && localBest) {
        rivalDetail = `Your standing route best is ${localBest.score} pts.`;
    }

    return {
        title: `Level ${level.id} • ${level.name}`,
        subtitle: storyBeat?.body.split('\n')[0] ?? level.description,
        kicker: storyBeat?.kicker ?? `Route ${String(level.id).padStart(2, '0')}`,
        speaker: visual?.speaker ?? 'Camp Log',
        accentWord: visual?.accentWord ?? 'Launch',
        scene: visual?.scene ?? (level.biome === 'VOLCANO' ? 'magma' : level.biome === 'CAVE' ? 'cave' : level.biome === 'SWAMP' ? 'basin' : level.id <= 2 ? 'camp' : 'floodline'),
        characterId: visual?.characterId,
        supportCharacterId: visual?.supportCharacterId,
        caption: visual?.caption ?? level.description,
        missionTitle,
        missionDetail,
        rivalStatus,
        rivalDetail,
    };
};

type RouteRivalSummary = {
    importedRuns: number;
    importedRoutes: number;
    contestedRoutes: number;
    leadCount: number;
    trailCount: number;
    tieCount: number;
    firstMarkRoute: {
        levelId: number;
        levelName: string;
        rivalBest: LeaderboardBoardEntry;
    } | null;
    closestDeficit: {
        levelId: number;
        levelName: string;
        localBest: RunHistoryEntry;
        rivalBest: LeaderboardBoardEntry;
        gap: number;
    } | null;
    tiedRoute: {
        levelId: number;
        levelName: string;
        rivalBest: LeaderboardBoardEntry;
    } | null;
};

const buildRouteRivalSummary = (
    localRunHistory: RunHistoryEntry[],
    communityBoardEntries: LeaderboardBoardEntry[],
    highestUnlockedLevel = LEVELS.length,
): RouteRivalSummary => {
    const unlockedLevelIds = new Set(
        LEVELS.filter((level) => level.id <= highestUnlockedLevel).map((level) => level.id),
    );
    const levelNameLookup = new globalThis.Map<number, string>(
        LEVELS.map((level) => [level.id, level.name]),
    );
    const localBestByLevel = new globalThis.Map<number, RunHistoryEntry>();
    const rivalBestByLevel = new globalThis.Map<number, LeaderboardBoardEntry>();

    localRunHistory.forEach((entry) => {
        if (!unlockedLevelIds.has(entry.levelId)) return;
        const previous = localBestByLevel.get(entry.levelId);
        if (!previous || compareRunHistoryEntries(entry, previous) < 0) {
            localBestByLevel.set(entry.levelId, entry);
        }
    });

    communityBoardEntries.forEach((entry) => {
        if (!unlockedLevelIds.has(entry.levelId)) return;
        const previous = rivalBestByLevel.get(entry.levelId);
        if (!previous || compareRunHistoryEntries(entry, previous) < 0) {
            rivalBestByLevel.set(entry.levelId, entry);
        }
    });

    let leadCount = 0;
    let trailCount = 0;
    let tieCount = 0;
    let firstMarkRoute: RouteRivalSummary['firstMarkRoute'] = null;
    let closestDeficit: RouteRivalSummary['closestDeficit'] = null;
    let tiedRoute: RouteRivalSummary['tiedRoute'] = null;

    rivalBestByLevel.forEach((rivalBest, levelId) => {
        const localBest = localBestByLevel.get(levelId) ?? null;
        const levelName = levelNameLookup.get(levelId) ?? rivalBest.levelName ?? `Level ${levelId}`;

        if (!localBest) {
            if (!firstMarkRoute) {
                firstMarkRoute = { levelId, levelName, rivalBest };
            }
            return;
        }

        const gap = rivalBest.score - localBest.score;
        if (gap > 0) {
            trailCount += 1;
            if (!closestDeficit || gap < closestDeficit.gap) {
                closestDeficit = { levelId, levelName, localBest, rivalBest, gap };
            }
            return;
        }

        if (gap < 0) {
            leadCount += 1;
            return;
        }

        tieCount += 1;
        if (!tiedRoute) {
            tiedRoute = { levelId, levelName, rivalBest };
        }
    });

    return {
        importedRuns: communityBoardEntries.length,
        importedRoutes: rivalBestByLevel.size,
        contestedRoutes: [...rivalBestByLevel.keys()].filter((levelId) => localBestByLevel.has(levelId)).length,
        leadCount,
        trailCount,
        tieCount,
        firstMarkRoute,
        closestDeficit,
        tiedRoute,
    };
};

const buildRouteRivalMarkers = (
    localRunHistory: RunHistoryEntry[],
    communityBoardEntries: LeaderboardBoardEntry[],
    highestUnlockedLevel: number,
    priorityLevelId: number | null = null,
) => {
    const localBestByLevel = new globalThis.Map<number, RunHistoryEntry>();
    const rivalBestByLevel = new globalThis.Map<number, LeaderboardBoardEntry>();

    localRunHistory.forEach((entry) => {
        if (entry.levelId > highestUnlockedLevel) return;
        const previous = localBestByLevel.get(entry.levelId);
        if (!previous || compareRunHistoryEntries(entry, previous) < 0) {
            localBestByLevel.set(entry.levelId, entry);
        }
    });

    communityBoardEntries.forEach((entry) => {
        if (entry.levelId > highestUnlockedLevel) return;
        const previous = rivalBestByLevel.get(entry.levelId);
        if (!previous || compareRunHistoryEntries(entry, previous) < 0) {
            rivalBestByLevel.set(entry.levelId, entry);
        }
    });

    const markers = new globalThis.Map<number, RouteRivalMarker>();
    const highlightLevelIds = new Set<number>();
    if (priorityLevelId) highlightLevelIds.add(priorityLevelId);

    rivalBestByLevel.forEach((rivalBest, levelId) => {
        const localBest = localBestByLevel.get(levelId) ?? null;

        if (!localBest) {
            markers.set(levelId, {
                status: 'first-mark',
                label: 'Scout',
                detail: `${rivalBest.playerLabel} posted first here.`,
                tone: {
                    fill: 'rgba(8, 145, 178, 0.86)',
                    stroke: 'rgba(165, 243, 252, 0.92)',
                    text: '#ecfeff',
                    glow: 'rgba(34, 211, 238, 0.28)',
                },
                isPriority: highlightLevelIds.has(levelId),
            });
            return;
        }

        const gap = rivalBest.score - localBest.score;
        if (gap > 0) {
            markers.set(levelId, {
                status: 'trailing',
                label: `-${Math.min(999, gap)}`,
                detail: `${rivalBest.playerLabel} leads by ${gap} pts.`,
                tone: {
                    fill: 'rgba(190, 24, 93, 0.86)',
                    stroke: 'rgba(253, 164, 175, 0.9)',
                    text: '#fff1f2',
                    glow: 'rgba(244, 63, 94, 0.26)',
                },
                isPriority: true,
            });
            return;
        }

        if (gap < 0) {
            markers.set(levelId, {
                status: 'leading',
                label: `+${Math.min(999, Math.abs(gap))}`,
                detail: `You lead ${rivalBest.playerLabel} by ${Math.abs(gap)} pts.`,
                tone: {
                    fill: 'rgba(6, 95, 70, 0.86)',
                    stroke: 'rgba(167, 243, 208, 0.9)',
                    text: '#ecfdf5',
                    glow: 'rgba(16, 185, 129, 0.22)',
                },
                isPriority: highlightLevelIds.has(levelId),
            });
            return;
        }

        markers.set(levelId, {
            status: 'tied',
            label: 'Tie',
            detail: `${rivalBest.playerLabel} matched your score.`,
            tone: {
                fill: 'rgba(67, 56, 202, 0.84)',
                stroke: 'rgba(196, 181, 253, 0.9)',
                text: '#eef2ff',
                glow: 'rgba(129, 140, 248, 0.24)',
            },
            isPriority: true,
        });
    });

    return markers;
};

const resolveMenuAchievements = (
    saveData: SaveData,
    communityBoardEntries: LeaderboardBoardEntry[] = [],
): SidebarAchievement[] => {
    const totalClears = Object.values(saveData.levelResults).reduce((sum, result) => sum + Math.max(0, result?.clears ?? 0), 0);
    const completedLevels = Object.values(saveData.levelResults).filter((result) => (result?.clears ?? 0) > 0).length;
    const perfectRoutes = Object.values(saveData.levelResults).filter((result) => (result?.stars ?? 0) >= 3).length;
    const finalLevelId = LEVELS.reduce((maxId, level) => Math.max(maxId, level.id), 0);
    const branchExpansionTarget = Math.max(6, Math.ceil(Math.max(1, finalLevelId * 0.55)));
    const finalCampClearCount = saveData.levelResults[finalLevelId]?.clears ?? 0;
    const bestHighScore = saveData.highScore;
    const winStreaks = computeRunWinStreaks(saveData.runHistory);
    const rivalSummary = buildRouteRivalSummary(saveData.runHistory, communityBoardEntries);

    return [
        {
            id: 'first-clear',
            title: 'First Clear',
            detail: 'Finish one route.',
            progress: `${Math.min(1, totalClears)}/1`,
            unlocked: totalClears >= 1,
        },
        {
            id: 'route-runner',
            title: 'Route Runner',
            detail: 'Clear three routes total.',
            progress: `${Math.min(3, totalClears)}/3`,
            unlocked: totalClears >= 3,
        },
        {
            id: 'branch-expansion',
            title: 'Branch Expansion',
            detail: `Clear ${branchExpansionTarget} routes for full branch confidence.`,
            progress: `${Math.min(branchExpansionTarget, completedLevels)}/${branchExpansionTarget}`,
            unlocked: completedLevels >= branchExpansionTarget,
        },
        {
            id: 'star-master',
            title: 'Star Master',
            detail: 'Take any route to three stars.',
            progress: `${Math.min(1, perfectRoutes)}/1 route`,
            unlocked: perfectRoutes >= 1,
        },
        {
            id: 'magma-clear',
            title: 'Magma Clear',
            detail: finalLevelId > 0 ? `Clear level ${finalLevelId} to expose the final camp.` : 'Clear the final camp to expose the final camp.',
            progress: `${Math.min(1, finalCampClearCount)}/1`,
            unlocked: finalCampClearCount >= 1,
        },
        {
            id: 'high-score-burst',
            title: 'High Score Burst',
            detail: 'Push atlas score above 1000.',
            progress: `${Math.min(bestHighScore, 1000)}/1000`,
            unlocked: bestHighScore >= 1000,
        },
        {
            id: 'branch-consistency',
            title: 'Branch Consistency',
            detail: 'Chain 5 clears without a failed route.',
            progress: `${winStreaks.current}/5 (best ${winStreaks.best})`,
            unlocked: winStreaks.best >= 5,
        },
        {
            id: 'board-scout',
            title: 'Board Scout',
            detail: 'Import one rival runboard.',
            progress: `${Math.min(1, rivalSummary.importedRuns > 0 ? 1 : 0)}/1`,
            unlocked: rivalSummary.importedRuns > 0,
        },
        {
            id: 'route-taker',
            title: 'Route Taker',
            detail: 'Lead one contested route against an imported board.',
            progress: `${Math.min(1, rivalSummary.leadCount)}/1 route`,
            unlocked: rivalSummary.leadCount >= 1,
        },
        {
            id: 'crew-climber',
            title: 'Crew Climber',
            detail: 'Lead three contested routes at once.',
            progress: `${Math.min(3, rivalSummary.leadCount)}/3 routes`,
            unlocked: rivalSummary.leadCount >= 3,
        },
    ];
};

const computeRunWinStreaks = (entries: RunHistoryEntry[]) => {
    const sorted = [...entries]
        .map((entry) => ({
            entry,
            completedAt: Date.parse(entry.completedAt),
        }))
        .filter((sample) => Number.isFinite(sample.completedAt))
        .sort((left, right) => right.completedAt - left.completedAt);

    let current = 0;
    for (let i = 0; i < sorted.length; i += 1) {
        if (!sorted[i].entry.isWin) break;
        current += 1;
    }

    let best = 0;
    let running = 0;
    sorted.forEach(({ entry }) => {
        if (entry.isWin) {
            running += 1;
            best = Math.max(best, running);
            return;
        }
        running = 0;
    });

    return { current, best };
};

const sortLeaderboardBoardEntries = (entries: LeaderboardBoardEntry[]) =>
    entries.sort((left, right) => {
        const scoreDiff = right.score - left.score;
        if (scoreDiff !== 0) return scoreDiff;
        const tokenDiff = right.tokens - left.tokens;
        if (tokenDiff !== 0) return tokenDiff;
        const lifeDiff = right.livesLeft - left.livesLeft;
        if (lifeDiff !== 0) return lifeDiff;
        const rightTime = Date.parse(right.completedAt);
        const leftTime = Date.parse(left.completedAt);
        return Number.isFinite(rightTime) && Number.isFinite(leftTime) ? rightTime - leftTime : 0;
    });

const normalizeBoardSharePayload = (raw: unknown): LeaderboardSharePayload | null => {
    if (!isRecord(raw)) return null;
    const version = Number(raw.version);
    if (raw.game !== 'Infinite Swinger' || Number.isNaN(version) || version < 1 || !Array.isArray(raw.entries)) {
        return null;
    }

    const normalized = {
        version: Math.max(1, Math.min(99, version)),
        game: 'Infinite Swinger' as const,
        sharedAt: readNumericValue(raw.sharedAt, Date.now()),
        alias: readStringValue(raw.alias, DEFAULT_BOARD_ALIAS),
        entries: raw.entries
            .map((entry) => {
                if (!isRecord(entry)) return null;
                const score = readNumericValue(entry.score, -1);
                const levelId = readNumericValue(entry.levelId, -1);
                const elapsedMs = readNumericValue(entry.elapsedMs, -1);
                const tokens = readNumericValue(entry.tokens, 0);
                const livesLeft = readNumericValue(entry.livesLeft, 0);

                if (score < 0 || levelId <= 0 || elapsedMs < 0 || livesLeft < 0) return null;

                return {
                    score,
                    levelId,
                    levelName: readStringValue(entry.levelName, `Level ${levelId}`),
                    isWin: readBooleanValue(entry.isWin, false),
                    elapsedMs,
                    tokens,
                    livesLeft,
                    completedAt: readStringValue(entry.completedAt, new Date().toISOString()),
                    playerLabel: readStringValue(entry.playerLabel, DEFAULT_BOARD_ALIAS),
                };
            })
            .filter((entry): entry is LeaderboardSharePayload['entries'][number] => entry !== null),
    };

    return normalized;
};

const buildCampaignChallenge = (
    saveData: SaveData,
    highestUnlockedLevel: number,
    communityBoardEntries: LeaderboardBoardEntry[] = [],
): CampaignChallenge => {
    const unlockedLevels = LEVELS.filter((level) => level.id <= highestUnlockedLevel).map((level) => ({
        level,
        result: saveData.levelResults[String(level.id)],
    }));
    const rivalSummary = buildRouteRivalSummary(saveData.runHistory, communityBoardEntries, highestUnlockedLevel);

    const firstUnclear = unlockedLevels.find((entry) => (entry.result?.clears ?? 0) === 0);
    if (firstUnclear) {
        return {
            levelId: firstUnclear.level.id,
            title: `Clear ${firstUnclear.level.name}`,
            description: 'This branch is the next campaign step. Finish it to unlock the next atlas lane.',
            note: `Camp target: Route ${firstUnclear.level.id}.`,
            tone: 'amber',
            progress: Math.min(1, Math.max(0, firstUnclear.result?.clears ?? 0)),
            target: 1,
        };
    }

    if (rivalSummary.closestDeficit) {
        const { levelId, levelName, localBest, rivalBest, gap } = rivalSummary.closestDeficit;
        return {
            levelId,
            title: `Take Back ${levelName}`,
            description: `${rivalBest.playerLabel} leads this imported rivalry lane by ${gap} pts. One cleaner clear flips the route back into your column.`,
            note: `Your best ${localBest.score} vs ${rivalBest.playerLabel} ${rivalBest.score}.`,
            tone: 'cyan',
            progress: Math.min(localBest.score, rivalBest.score + 1),
            target: rivalBest.score + 1,
        };
    }

    if (rivalSummary.firstMarkRoute) {
        const { levelId, levelName, rivalBest } = rivalSummary.firstMarkRoute;
        return {
            levelId,
            title: `Mark ${levelName}`,
            description: `${rivalBest.playerLabel} already posted a run here. Put your first score on the board to activate the head-to-head route.`,
            note: `Imported benchmark: ${rivalBest.score} pts on Route ${levelId}.`,
            tone: 'amber',
            progress: 0,
            target: 1,
        };
    }

    if (rivalSummary.tiedRoute) {
        const { levelId, levelName, rivalBest } = rivalSummary.tiedRoute;
        return {
            levelId,
            title: `Break The Tie On ${levelName}`,
            description: `You and ${rivalBest.playerLabel} are dead even here. A cleaner token line or faster finish steals the route.`,
            note: `Tie score: ${rivalBest.score} pts.`,
            tone: 'cyan',
            progress: 0,
            target: 1,
        };
    }

    const masteryGap = unlockedLevels.find(
        (entry) => (entry.result?.stars ?? 0) < 3 && (entry.result?.clears ?? 0) > 0,
    );
    if (masteryGap) {
        return {
            levelId: masteryGap.level.id,
            title: `${masteryGap.level.name} Mastery`,
            description: 'Collect all stars on this route to stabilize unlock pacing and improve consistency.',
            note: `Current stars: ${masteryGap.result?.stars ?? 0}/3.`,
            tone: 'emerald',
            progress: Math.min(3, Math.max(0, masteryGap.result?.stars ?? 0)),
            target: 3,
        };
    }

    const nextMilestone = Math.max(500, Math.ceil((Math.max(saveData.highScore, 1) + 1) / 500) * 500);
    return {
        levelId: null,
        title: 'Atlas Milestone Sprint',
        description:
            'Hit a fresh score milestone to raise pressure, then use the gained consistency from your next clear race.',
        note: `Current atlas best ${saveData.highScore} / ${nextMilestone} pts.`,
        tone: 'cyan',
        progress: Math.min(saveData.highScore, nextMilestone),
        target: nextMilestone,
    };
};

const encodeLeaderboardPayload = (payload: LeaderboardSharePayload) => {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const decodeLeaderboardPayload = (raw: string): LeaderboardSharePayload | null => {
    try {
        const safeBase64 = raw.replace(/-/g, '+').replace(/_/g, '/');
        const padLength = (4 - (safeBase64.length % 4)) % 4;
        const padded = safeBase64 + '='.repeat(padLength);
        const json = decodeURIComponent(escape(atob(padded)));
        return normalizeBoardSharePayload(JSON.parse(json));
    } catch {
        return null;
    }
};

const readCommunityBoardStorage = (): LeaderboardBoardEntry[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(LEADERBOARD_COMMUNITY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        const normalized = normalizeBoardSharePayload(parsed);

        if (!normalized || normalized.version !== LEADERBOARD_SHARE_VERSION) return [];
        return sortLeaderboardBoardEntries(
            normalized.entries.map((entry) => ({
                ...entry,
                playerLabel: readStringValue(entry.playerLabel, DEFAULT_BOARD_ALIAS),
                isLocal: false,
            })),
        );
    } catch {
        return [];
    }
};

const escapeDelimitedField = (value: string, delimiter: string) => {
    if (!value.includes(delimiter) && !/["\n\r]/.test(value)) return value;
    return `"${value.replace(/"/g, '""')}"`;
};

const serializeBoardRowsToDelimitedText = (
    rows: Array<RunHistoryEntry | LeaderboardBoardEntry>,
    resolveAlias: (entry: RunHistoryEntry | LeaderboardBoardEntry) => string,
    delimiter = ',',
) => {
    const headerRow = LEADERBOARD_DELIMITED_HEADERS.join(delimiter);
    const bodyRows = rows.map((entry) =>
        [
            resolveAlias(entry),
            String(entry.levelId),
            entry.levelName,
            String(entry.score),
            String(entry.tokens),
            String(entry.livesLeft),
            entry.isWin ? 'WIN' : 'TRY',
            String(entry.elapsedMs),
            formatDurationMs(entry.elapsedMs),
            entry.completedAt,
        ]
            .map((value) => escapeDelimitedField(value, delimiter))
            .join(delimiter),
    );

    return [headerRow, ...bodyRows].join('\n');
};

const detectDelimitedBoardSeparator = (raw: string) => {
    const sampleLine = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? '';
    if (!sampleLine) return null;

    const candidates = ['\t', ',', ';'] as const;
    let detected: (typeof candidates)[number] | null = null;
    let bestScore = 0;

    candidates.forEach((candidate) => {
        const score = sampleLine.split(candidate).length - 1;
        if (score > bestScore) {
            detected = candidate;
            bestScore = score;
        }
    });

    return bestScore > 0 ? detected : null;
};

const parseDelimitedBoardRow = (line: string, delimiter: string) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];

        if (character === '"') {
            const nextCharacter = line[index + 1];
            if (inQuotes && nextCharacter === '"') {
                current += '"';
                index += 1;
                continue;
            }

            inQuotes = !inQuotes;
            continue;
        }

        if (character === delimiter && !inQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += character;
    }

    values.push(current.trim());
    return values;
};

const normalizeDelimitedBoardHeader = (value: string) => {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

    switch (normalized) {
        case 'player':
        case 'playerlabel':
        case 'alias':
        case 'crew':
        case 'name':
            return 'playerLabel' as const;
        case 'levelid':
        case 'routeid':
        case 'level':
            return 'levelId' as const;
        case 'levelname':
        case 'routename':
        case 'route':
        case 'stage':
        case 'title':
            return 'levelName' as const;
        case 'score':
        case 'points':
        case 'pts':
            return 'score' as const;
        case 'tokens':
        case 'coins':
        case 'tk':
            return 'tokens' as const;
        case 'livesleft':
        case 'lives':
        case 'life':
        case 'hp':
            return 'livesLeft' as const;
        case 'iswin':
        case 'result':
        case 'outcome':
        case 'win':
            return 'isWin' as const;
        case 'elapsedms':
        case 'durationms':
        case 'timems':
        case 'ms':
            return 'elapsedMs' as const;
        case 'elapsed':
        case 'duration':
        case 'time':
            return 'elapsed' as const;
        case 'completedat':
        case 'timestamp':
        case 'date':
        case 'completed':
        case 'finishedat':
            return 'completedAt' as const;
        default:
            return null;
    }
};

const parseImportedLevelId = (raw: string) => {
    const numericMatch = raw.match(/-?\d+/);
    if (!numericMatch) return null;

    const levelId = Number.parseInt(numericMatch[0], 10);
    return LEVELS.some((level) => level.id === levelId) ? levelId : null;
};

const parseImportedElapsedMs = (raw: string) => {
    const numeric = readStrictNumericValue(raw);
    if (numeric !== null) return Math.max(0, Math.round(numeric));

    const trimmed = raw.trim();
    if (!trimmed) return null;

    const secondsMatch = trimmed.match(/^(\d+(?:\.\d+)?)s$/i);
    if (secondsMatch) {
        return Math.max(0, Math.round(Number(secondsMatch[1]) * 1000));
    }

    const parts = trimmed.split(':');
    if (parts.length < 2 || parts.length > 3) return null;

    const lastPart = parts[parts.length - 1];
    const [secondsText, millisecondsText = '0'] = lastPart.split('.');
    const seconds = Number.parseInt(secondsText, 10);
    const minutes = Number.parseInt(parts[parts.length - 2], 10);
    const hours = parts.length === 3 ? Number.parseInt(parts[0], 10) : 0;

    if (![hours, minutes, seconds].every((value) => Number.isFinite(value))) return null;

    const normalizedMilliseconds = Number.parseInt(millisecondsText.padEnd(3, '0').slice(0, 3), 10);
    if (!Number.isFinite(normalizedMilliseconds)) return null;

    return (((hours * 60) + minutes) * 60 + seconds) * 1000 + normalizedMilliseconds;
};

const parseImportedOutcome = (raw: string) => {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return false;
    return ['win', 'won', 'clear', 'cleared', 'true', '1', 'yes'].includes(normalized);
};

const parseDelimitedBoardEntries = (raw: string): LeaderboardBoardEntry[] => {
    const delimiter = detectDelimitedBoardSeparator(raw);
    if (!delimiter) return [];

    const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (lines.length === 0) return [];

    const parsedRows = lines.map((line) => parseDelimitedBoardRow(line, delimiter));
    const normalizedHeaderRow = parsedRows[0].map(normalizeDelimitedBoardHeader);
    const recognizedHeaders = normalizedHeaderRow.filter((value) => value !== null).length;
    const fallbackHeaderRow = [
        'playerLabel',
        'levelId',
        'levelName',
        'score',
        'tokens',
        'livesLeft',
        'isWin',
        'elapsedMs',
        'completedAt',
    ] as const;
    const headerRow =
        recognizedHeaders >= 3
            ? normalizedHeaderRow
            : parsedRows[0].map((_, index) => fallbackHeaderRow[index] ?? null);
    const dataRows = recognizedHeaders >= 3 ? parsedRows.slice(1) : parsedRows;
    const getColumnIndex = (key: (typeof LEADERBOARD_DELIMITED_HEADERS)[number]) =>
        headerRow.findIndex((value) => value === key);
    const getValueForRow = (cells: string[], key: (typeof LEADERBOARD_DELIMITED_HEADERS)[number]) => {
        const index = getColumnIndex(key);
        return index >= 0 ? cells[index] ?? '' : '';
    };

    return dataRows.reduce<LeaderboardBoardEntry[]>((entries, cells) => {
        const levelId = parseImportedLevelId(getValueForRow(cells, 'levelId'));
        const score = readStrictNumericValue(getValueForRow(cells, 'score'));
        if (levelId === null || score === null) return entries;

        const levelName =
            readStringValue(getValueForRow(cells, 'levelName'), '')
            || LEVELS.find((level) => level.id === levelId)?.name
            || `Route ${levelId}`;
        const elapsedMs =
            parseImportedElapsedMs(getValueForRow(cells, 'elapsedMs'))
            ?? parseImportedElapsedMs(getValueForRow(cells, 'elapsed'))
            ?? 0;
        const completedAtRaw = readStringValue(getValueForRow(cells, 'completedAt'), '');
        const completedAtTimestamp = Date.parse(completedAtRaw);
        const completedAt = Number.isFinite(completedAtTimestamp)
            ? new Date(completedAtTimestamp).toISOString()
            : new Date().toISOString();
        const playerLabel = normalizeLeaderboardAliasInput(
            readStringValue(getValueForRow(cells, 'playerLabel'), DEFAULT_BOARD_ALIAS),
        );

        entries.push({
            playerLabel,
            isLocal: false,
            levelId,
            levelName,
            score: Math.max(0, Math.round(score)),
            tokens: Math.max(0, Math.round(readStrictNumericValue(getValueForRow(cells, 'tokens')) ?? 0)),
            livesLeft: Math.max(0, Math.round(readStrictNumericValue(getValueForRow(cells, 'livesLeft')) ?? 0)),
            isWin: parseImportedOutcome(getValueForRow(cells, 'isWin')),
            elapsedMs,
            completedAt,
        });

        return entries;
    }, []);
};

const extractFirstUrlFromText = (raw: string) =>
    raw.match(/https?:\/\/[^\s]+/i)?.[0]?.replace(/[)>.,;!?]+$/, '') ?? '';

type RemoteBoardImportTarget = {
    url: string;
    sourceLabel: string;
};

type RemoteBoardImportResult =
    | {
          kind: 'success';
          rows: LeaderboardBoardEntry[];
          sourceLabel: string;
          sourceUrl: string;
      }
    | {
          kind: 'unsupported';
      }
    | {
          kind: 'error';
          message: string;
      };

const parseUrlCandidate = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const extractedUrl = extractFirstUrlFromText(trimmed);
    const candidateUrl =
        extractedUrl && extractedUrl !== trimmed
            ? extractedUrl
            : trimmed.includes('://')
            ? trimmed
            : extractedUrl;
    if (!candidateUrl) return null;

    try {
        return new URL(candidateUrl);
    } catch {
        return null;
    }
};

const readGoogleSheetsGid = (url: URL) => {
    const searchGid = readStringValue(url.searchParams.get('gid') ?? '', '');
    if (searchGid) return searchGid;

    const hashGid = url.hash.match(/gid=(\d+)/i)?.[1] ?? '';
    return readStringValue(hashGid, '');
};

const resolveRemoteBoardImportTarget = (raw: string): RemoteBoardImportTarget | null => {
    const parsedUrl = parseUrlCandidate(raw);
    if (!parsedUrl) return null;

    const normalizedHostname = parsedUrl.hostname.toLowerCase();
    const normalizedPathname = parsedUrl.pathname.toLowerCase();

    if (normalizedHostname === 'docs.google.com' && normalizedPathname.startsWith('/spreadsheets/d/')) {
        const sheetId = parsedUrl.pathname.match(/^\/spreadsheets\/d\/([^/]+)/)?.[1] ?? '';
        if (!sheetId) return null;

        const normalizedUrl = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/export`);
        const requestedFormat = readStringValue(
            parsedUrl.searchParams.get('format') ?? parsedUrl.searchParams.get('output') ?? '',
            'csv',
        ).toLowerCase();
        const format = requestedFormat === 'tsv' ? 'tsv' : 'csv';
        const gid = readGoogleSheetsGid(parsedUrl);

        normalizedUrl.searchParams.set('format', format);
        if (gid) normalizedUrl.searchParams.set('gid', gid);

        return {
            url: normalizedUrl.toString(),
            sourceLabel: 'Google Sheets',
        };
    }

    const requestedFormat = readStringValue(
        parsedUrl.searchParams.get('format') ?? parsedUrl.searchParams.get('output') ?? '',
        '',
    ).toLowerCase();
    const isDelimitedUrl =
        normalizedPathname.endsWith('.csv')
        || normalizedPathname.endsWith('.tsv')
        || requestedFormat === 'csv'
        || requestedFormat === 'tsv';

    if (!isDelimitedUrl) return null;

    return {
        url: parsedUrl.toString(),
        sourceLabel:
            normalizedPathname.endsWith('.tsv') || requestedFormat === 'tsv'
                ? 'TSV link'
                : 'CSV link',
    };
};

const fetchRemoteBoardImport = async (raw: string): Promise<RemoteBoardImportResult> => {
    const target = resolveRemoteBoardImportTarget(raw);
    if (!target) {
        return { kind: 'unsupported' };
    }

    try {
        const response = await fetch(target.url, {
            headers: {
                Accept: 'text/csv,text/tab-separated-values,text/plain;q=0.9,*/*;q=0.8',
            },
        });

        if (!response.ok) {
            return {
                kind: 'error',
                message:
                    target.sourceLabel === 'Google Sheets'
                        ? `Could not fetch the Google Sheets board (${response.status}). Publish the sheet or allow public CSV export, then try again.`
                        : `Could not fetch that ${target.sourceLabel.toLowerCase()} (${response.status}). Check that it is public and returns raw rows.`,
            };
        }

        const remoteText = await response.text();
        const importedRows = parseDelimitedBoardEntries(remoteText);

        if (importedRows.length === 0) {
            return {
                kind: 'error',
                message:
                    target.sourceLabel === 'Google Sheets'
                        ? 'The Google Sheets link loaded, but the sheet did not contain recognizable leaderboard columns.'
                        : `That ${target.sourceLabel.toLowerCase()} loaded, but it did not contain recognizable leaderboard rows.`,
            };
        }

        return {
            kind: 'success',
            rows: importedRows,
            sourceLabel: target.sourceLabel,
            sourceUrl: target.url,
        };
    } catch (error) {
        console.warn('Failed to fetch remote leaderboard import target', error);
        return {
            kind: 'error',
            message:
                target.sourceLabel === 'Google Sheets'
                    ? 'Could not reach that Google Sheets board. Make sure the link is public or published as CSV.'
                    : `Could not reach that ${target.sourceLabel.toLowerCase()}. Make sure the link is public and points to raw rows.`,
        };
    }
};

const parseSharedBoardUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const parsed = parseUrlCandidate(trimmed);
    if (!parsed) return null;
    try {
        return {
            boardToken: parsed.searchParams.get(LEADERBOARD_SHARE_QUERY_KEY) ?? trimmed,
            routeLevelId: normalizeLeaderboardRouteLevelId(parsed.searchParams.get(LEADERBOARD_ROUTE_QUERY_KEY)),
            openLeaderboard: parsed.searchParams.get(LEADERBOARD_VIEW_QUERY_KEY) === LEADERBOARD_VIEW_LEADERBOARD,
        };
    } catch {
        return null;
    }
};

const extractBoardToken = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';

    const parsedUrl = parseUrlCandidate(trimmed);
    if (parsedUrl) {
        try {
            return parsedUrl.searchParams.get(LEADERBOARD_SHARE_QUERY_KEY) ?? trimmed;
        } catch {
            return trimmed;
        }
    }

    return trimmed;
};

const normalizeLeaderboardRouteLevelId = (raw: string | null | undefined) => {
    const numeric = Number.parseInt(readStringValue(raw ?? '', ''), 10);
    if (!Number.isFinite(numeric)) return null;

    const normalized = Math.trunc(numeric);
    return LEVELS.some((level) => level.id === normalized) ? normalized : null;
};

const parseLeaderboardShareInput = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
        return {
            boardToken: '',
            routeLevelId: null as number | null,
            openLeaderboard: false,
        };
    }

    const sharedUrlInput = parseSharedBoardUrl(trimmed);
    if (sharedUrlInput) {
        return sharedUrlInput;
    }

    return {
        boardToken: extractBoardToken(trimmed),
        routeLevelId: null as number | null,
        openLeaderboard: false,
    };
};

const summarizeImportedBoardRows = (rows: LeaderboardBoardEntry[]) => {
    const importedCrewCount = new Set(rows.map((entry) => entry.playerLabel)).size;
    return importedCrewCount > 1
        ? `${importedCrewCount} crews`
        : rows[0]?.playerLabel ?? DEFAULT_BOARD_ALIAS;
};

const readLeaderboardAlias = () =>
    typeof window === 'undefined'
        ? DEFAULT_BOARD_ALIAS
        : readStringValue(window.localStorage.getItem(LEADERBOARD_ALIAS_KEY), DEFAULT_BOARD_ALIAS);

const readLeaderboardRemoteSource = () =>
    typeof window === 'undefined'
        ? ''
        : readStringValue(window.localStorage.getItem(LEADERBOARD_REMOTE_SOURCE_KEY), '');

const readLeaderboardRemoteSyncAt = () => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(LEADERBOARD_REMOTE_SYNC_AT_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeLeaderboardAliasInput = (alias: string) => {
    const normalized = alias.trim().replace(/\s+/g, ' ');
    return readStringValue(normalized.slice(0, 24), DEFAULT_BOARD_ALIAS);
};

const persistLeaderboardAlias = (alias: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LEADERBOARD_ALIAS_KEY, normalizeLeaderboardAliasInput(alias));
};

const persistLeaderboardRemoteSource = (source: string) => {
    if (typeof window === 'undefined') return;

    const normalized = source.trim();
    if (normalized) {
        window.localStorage.setItem(LEADERBOARD_REMOTE_SOURCE_KEY, normalized);
        return;
    }

    window.localStorage.removeItem(LEADERBOARD_REMOTE_SOURCE_KEY);
};

const persistLeaderboardRemoteSyncAt = (syncAt: number | null) => {
    if (typeof window === 'undefined') return;
    if (syncAt && Number.isFinite(syncAt)) {
        window.localStorage.setItem(LEADERBOARD_REMOTE_SYNC_AT_KEY, `${Math.trunc(syncAt)}`);
        return;
    }

    window.localStorage.removeItem(LEADERBOARD_REMOTE_SYNC_AT_KEY);
};

const mergeCommunityBoardRows = (
    previousRows: LeaderboardBoardEntry[],
    incomingRows: LeaderboardBoardEntry[],
) => sortLeaderboardBoardEntries(dedupeBoardEntries([...incomingRows, ...previousRows]));

const hydrateCommunityBoard = (payload: LeaderboardSharePayload) =>
    payload.entries.map((entry) => ({
        ...entry,
        playerLabel: readStringValue(entry.playerLabel, payload.alias),
        isLocal: false,
    }));

const createCommunitySharePayload = (
    runHistory: RunHistoryEntry[],
    alias: string,
): LeaderboardSharePayload => ({
    game: 'Infinite Swinger',
    version: LEADERBOARD_SHARE_VERSION,
    sharedAt: Date.now(),
    alias: readStringValue(alias, DEFAULT_BOARD_ALIAS),
    entries: runHistory.slice(0, LEADERBOARD_SHARE_LIMIT).map((entry) => ({
        playerLabel: readStringValue(alias, DEFAULT_BOARD_ALIAS),
        score: entry.score,
        levelId: entry.levelId,
        levelName: entry.levelName,
        isWin: entry.isWin,
        elapsedMs: entry.elapsedMs,
        tokens: entry.tokens,
        livesLeft: entry.livesLeft,
        completedAt: entry.completedAt,
    })),
});

const dedupeBoardEntries = (entries: LeaderboardBoardEntry[]) => {
    const buckets = new Map<string, LeaderboardBoardEntry>();

    entries.forEach((entry) => {
        const key = `${entry.playerLabel}|${entry.score}|${entry.levelId}|${entry.elapsedMs}|${entry.completedAt}`;
        buckets.set(key, entry);
    });

    return [...buckets.values()];
};

const compareRunHistoryEntries = (left: RunHistoryEntry, right: RunHistoryEntry) => {
    const scoreDiff = right.score - left.score;
    if (scoreDiff !== 0) return scoreDiff;
    const tokenDiff = right.tokens - left.tokens;
    if (tokenDiff !== 0) return tokenDiff;
    const lifeDiff = right.livesLeft - left.livesLeft;
    if (lifeDiff !== 0) return lifeDiff;
    return Date.parse(right.completedAt) - Date.parse(left.completedAt);
};

const compareRunHistoryEntriesByRecency = (left: RunHistoryEntry, right: RunHistoryEntry) => {
    const rightTime = Date.parse(right.completedAt);
    const leftTime = Date.parse(left.completedAt);
    const rightIsFinite = Number.isFinite(rightTime);
    const leftIsFinite = Number.isFinite(leftTime);

    if (rightIsFinite && leftIsFinite && rightTime !== leftTime) {
        return rightTime - leftTime;
    }

    if (rightIsFinite !== leftIsFinite) {
        return rightIsFinite ? 1 : -1;
    }

    return compareRunHistoryEntries(left, right);
};

const getRunHistoryEntryKey = (entry: RunHistoryEntry) =>
    `${entry.levelId}|${entry.score}|${entry.elapsedMs}|${entry.tokens}|${entry.livesLeft}|${entry.completedAt}`;

const buildRunHistoryArchive = (entries: RunHistoryEntry[]) => {
    const dedupedEntries = [...new globalThis.Map(
        entries.map((entry) => [getRunHistoryEntryKey(entry), entry]),
    ).values()];
    const recentEntries = [...dedupedEntries]
        .sort(compareRunHistoryEntriesByRecency)
        .slice(0, RUN_HISTORY_RECENT_LIMIT);
    const bestEntriesPerLevel = new Map<number, RunHistoryEntry[]>();

    [...dedupedEntries]
        .sort(compareRunHistoryEntries)
        .forEach((entry) => {
            const previousEntries = bestEntriesPerLevel.get(entry.levelId) ?? [];
            if (previousEntries.length >= RUN_HISTORY_BEST_PER_LEVEL_LIMIT) return;
            previousEntries.push(entry);
            bestEntriesPerLevel.set(entry.levelId, previousEntries);
        });

    return [...new globalThis.Map(
        [...recentEntries, ...[...bestEntriesPerLevel.values()].flat()].map((entry) => [getRunHistoryEntryKey(entry), entry]),
    ).values()]
        .sort(compareRunHistoryEntriesByRecency)
        .slice(0, RUN_HISTORY_ARCHIVE_LIMIT);
};

const selectBestRunPerLevel = (entries: RunHistoryEntry[], limit = entries.length) => {
    const bestByLevel = new Map<number, RunHistoryEntry>();

    entries.forEach((entry) => {
        const previous = bestByLevel.get(entry.levelId);
        if (!previous || compareRunHistoryEntries(entry, previous) < 0) {
            bestByLevel.set(entry.levelId, entry);
        }
    });

    return [...bestByLevel.values()]
        .sort(compareRunHistoryEntries)
        .slice(0, limit);
};

const getFeaturedRouteCupCountdownLabel = (remainingMs: number) => {
    const safeRemainingMs = Math.max(0, remainingMs);
    const totalMinutes = Math.max(1, Math.ceil(safeRemainingMs / (1000 * 60)));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return remainingHours > 0 ? `Resets in ${days}d ${remainingHours}h` : `Resets in ${days}d`;
    }

    if (hours > 0) {
        return `Resets in ${hours}h ${String(minutes).padStart(2, '0')}m`;
    }

    return `Resets in ${Math.max(1, totalMinutes)}m`;
};

const pickFeaturedRouteCupIndex = (levels: LevelConfig[], now: Date) => {
    const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${levels.length}-${levels[0]?.id ?? 0}`;
    let hash = 7;

    for (let index = 0; index < dayKey.length; index += 1) {
        hash = Math.imul(hash, 31) + dayKey.charCodeAt(index);
    }

    return (hash >>> 0) % levels.length;
};

const buildFeaturedRouteCup = (
    saveData: SaveData,
    highestUnlockedLevel: number,
    communityBoardEntries: LeaderboardBoardEntry[],
    now = new Date(),
): FeaturedRouteCup | null => {
    const unlockedLevels = LEVELS.filter((level) => level.id <= highestUnlockedLevel);
    if (unlockedLevels.length === 0) return null;

    const localBestByLevel = new globalThis.Map<number, RunHistoryEntry>();
    const rivalBestByLevel = new globalThis.Map<number, LeaderboardBoardEntry>();

    saveData.runHistory.forEach((entry) => {
        if (entry.levelId > highestUnlockedLevel) return;
        const previous = localBestByLevel.get(entry.levelId);
        if (!previous || compareRunHistoryEntries(entry, previous) < 0) {
            localBestByLevel.set(entry.levelId, entry);
        }
    });

    communityBoardEntries.forEach((entry) => {
        if (entry.levelId > highestUnlockedLevel) return;
        const previous = rivalBestByLevel.get(entry.levelId);
        if (!previous || compareRunHistoryEntries(entry, previous) < 0) {
            rivalBestByLevel.set(entry.levelId, entry);
        }
    });

    const rivalAttackLevels: LevelConfig[] = [];
    const rivalDefenseLevels: LevelConfig[] = [];
    const frontierLevels: LevelConfig[] = [];
    const masteryLevels: LevelConfig[] = [];
    const replayLevels: LevelConfig[] = [];

    unlockedLevels.forEach((level) => {
        const localBest = localBestByLevel.get(level.id) ?? null;
        const rivalBest = rivalBestByLevel.get(level.id) ?? null;
        const result = saveData.levelResults[String(level.id)] ?? null;

        if (rivalBest) {
            if (!localBest || rivalBest.score >= localBest.score) {
                rivalAttackLevels.push(level);
            } else {
                rivalDefenseLevels.push(level);
            }
            return;
        }

        if ((result?.clears ?? 0) === 0) {
            frontierLevels.push(level);
            return;
        }

        if ((result?.stars ?? 0) < 3) {
            masteryLevels.push(level);
            return;
        }

        replayLevels.push(level);
    });

    const featuredPool =
        rivalAttackLevels.length > 0
            ? rivalAttackLevels
            : rivalDefenseLevels.length > 0
            ? rivalDefenseLevels
            : frontierLevels.length > 0
            ? frontierLevels
            : masteryLevels.length > 0
            ? masteryLevels
            : replayLevels.length > 0
            ? replayLevels
            : unlockedLevels;
    const featuredLevel = featuredPool[pickFeaturedRouteCupIndex(featuredPool, now)] ?? unlockedLevels[0];
    const localBest = localBestByLevel.get(featuredLevel.id) ?? null;
    const rivalBest = rivalBestByLevel.get(featuredLevel.id) ?? null;
    const levelResult = saveData.levelResults[String(featuredLevel.id)] ?? null;
    const targetStep = Math.max(40, Math.round(featuredLevel.targetDistance * 0.035));
    const nextReset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    let title = `Push ${featuredLevel.name}`;
    let detail = 'Daily cup route. Clean up this lane to keep the atlas rotation moving.';
    let statusLabel = 'Live';
    let tone: FeaturedRouteCup['tone'] = 'cyan';
    let targetScore: number | null = null;
    let progressPercent = 0;
    let targetLabel = 'First score claims the cup';

    if (rivalBest && localBest) {
        const gap = rivalBest.score - localBest.score;

        if (gap > 0) {
            title = `Close ${gap} pts on ${featuredLevel.name}`;
            detail = `${rivalBest.playerLabel} owns today's route at ${rivalBest.score} pts. Beat that mark before reset to flip the cup.`;
            statusLabel = 'Chasing';
            tone = 'rose';
            targetScore = rivalBest.score + 1;
            progressPercent = clamp((localBest.score / Math.max(1, targetScore)) * 100, 0, 100);
        } else if (gap < 0) {
            title = `Defend ${featuredLevel.name}`;
            detail = `You lead ${rivalBest.playerLabel} by ${Math.abs(gap)} pts on today's cup. Extend the gap so the lane stays clearly yours.`;
            statusLabel = 'Ahead';
            tone = 'emerald';
            targetScore = localBest.score + targetStep;
            progressPercent = clamp((localBest.score / Math.max(1, targetScore)) * 100, 0, 100);
        } else {
            title = `Break the tie on ${featuredLevel.name}`;
            detail = `You and ${rivalBest.playerLabel} are dead even on today's route. A cleaner clear decides the cup before midnight.`;
            statusLabel = 'Tied';
            tone = 'cyan';
            targetScore = localBest.score + targetStep;
            progressPercent = clamp((localBest.score / Math.max(1, targetScore)) * 100, 0, 100);
        }
    } else if (rivalBest) {
        title = `Post the first mark on ${featuredLevel.name}`;
        detail = `${rivalBest.playerLabel} already posted ${rivalBest.score} pts on today's cup. Put your first benchmark on the board.`;
        statusLabel = 'Open rivalry';
        tone = 'amber';
        targetScore = rivalBest.score + 1;
        progressPercent = 0;
    } else if (!localBest) {
        title = `Open ${featuredLevel.name}`;
        detail = 'No benchmark exists on today’s featured route yet. Land the first clean score to own the cup outright.';
        statusLabel = 'Unclaimed';
        tone = 'amber';
        targetScore = null;
        progressPercent = (levelResult?.clears ?? 0) > 0 ? 100 : 0;
    } else if ((levelResult?.stars ?? 0) < 3) {
        title = `Perfect ${featuredLevel.name}`;
        detail = 'Today’s cup is set to a mastery lane. Improve the route and chase the missing stars while the focus is live.';
        statusLabel = `${levelResult?.stars ?? 0}/3 stars`;
        tone = 'cyan';
        targetScore = localBest.score + targetStep;
        progressPercent = clamp((localBest.score / Math.max(1, targetScore)) * 100, 0, 100);
    } else {
        title = `Extend ${featuredLevel.name}`;
        detail = 'This route is already stable. Use the daily cup to raise the benchmark and make the next import chase harder.';
        statusLabel = 'Personal push';
        tone = 'cyan';
        targetScore = localBest.score + targetStep;
        progressPercent = clamp((localBest.score / Math.max(1, targetScore)) * 100, 0, 100);
    }

    if (targetScore !== null) {
        targetLabel = `Target ${targetScore} pts`;
    } else if (localBest) {
        targetLabel = `Best ${localBest.score} pts`;
    }

    return {
        levelId: featuredLevel.id,
        levelName: featuredLevel.name,
        title,
        detail,
        statusLabel,
        countdownLabel: getFeaturedRouteCupCountdownLabel(nextReset.getTime() - now.getTime()),
        targetLabel,
        tone,
        progressPercent,
        targetScore,
        localBest,
        rivalBest: rivalBest
            ? {
                score: rivalBest.score,
                levelId: rivalBest.levelId,
                levelName: rivalBest.levelName,
                isWin: rivalBest.isWin,
                elapsedMs: rivalBest.elapsedMs,
                tokens: rivalBest.tokens,
                livesLeft: rivalBest.livesLeft,
                completedAt: rivalBest.completedAt,
                playerLabel: rivalBest.playerLabel,
            }
            : null,
    };
};

const buildFeaturedRouteCupRunOutcome = (
    levelId: number,
    isWin: boolean,
    priorCup: FeaturedRouteCup | null,
    postCup: FeaturedRouteCup | null,
): FeaturedRouteCupRunOutcome | null => {
    if (!priorCup || !postCup) return null;
    if (priorCup.levelId !== levelId || postCup.levelId !== levelId || priorCup.levelId !== postCup.levelId) return null;

    const priorLocalBest = priorCup.localBest?.score ?? null;
    const postLocalBest = postCup.localBest?.score ?? null;
    if (postLocalBest === null) return null;
    if (priorLocalBest !== null && postLocalBest <= priorLocalBest) return null;

    const localGain = postLocalBest - (priorLocalBest ?? 0);
    const priorRivalBest = priorCup.rivalBest?.score ?? null;
    const priorRivalLabel = priorCup.rivalBest?.playerLabel ?? 'the rival';

    if (priorLocalBest === null) {
        if (priorRivalBest !== null) {
            return {
                title: `First featured cup post`,
                description: `You entered ${priorCup.levelName} with ${postLocalBest} points, so the lane is now yours to defend until reset.`,
                tone: isWin ? 'emerald' : 'cyan',
            };
        }

        return {
            title: `Featured cup opened`,
            description: `Your first score on ${priorCup.levelName} is now a live benchmark for today's lane pressure.`,
            tone: isWin ? 'cyan' : 'amber',
        };
    }

    if (priorRivalBest === null) {
        const targetGainText = postCup.targetScore === null ? '' : `Target moved to ${postCup.targetScore} points.`;
        return {
            title: `Daily cup pressure raised`,
            description: `You raised this featured lane by ${localGain} points. ${targetGainText}`,
            tone: isWin ? 'emerald' : 'cyan',
        };
    }

    const priorGap = priorRivalBest - priorLocalBest;
    const postGap = priorRivalBest - postLocalBest;
    const gapClosed = priorGap - postGap;

    if (priorGap > 0 && postGap <= 0) {
        return {
            title: `Featured lane flipped`,
            description: `You beat ${priorRivalLabel} and took the featured lane with ${postLocalBest} points on ${postCup.levelName}.`,
            tone: 'emerald',
        };
    }

    if (priorGap > 0) {
        return {
            title: `Featured gap narrowed`,
            description: `You reduced the featured lane deficit by ${gapClosed} points, now down ${Math.max(0, postGap)} from ${priorRivalLabel}.`,
            tone: isWin ? 'emerald' : 'amber',
        };
    }

    if (priorGap <= 0 && gapClosed > 0) {
        return {
            title: `Featured lead extended`,
            description: `You pulled further ahead on ${postCup.levelName}, extending daily pressure by ${Math.abs(gapClosed)} points.`,
            tone: 'emerald',
        };
    }

    return null;
};

const EMPTY_RECOMMENDATION_METRICS: RecommendationMetrics = {
    offers: 0,
    opens: 0,
    purchases: 0,
    skips: 0,
    openDelayTotalMs: 0,
    openDelaySamples: 0,
    skipDelayTotalMs: 0,
    skipDelaySamples: 0,
    openToBuyTotalMs: 0,
    openToBuySamples: 0,
};
const WEATHER_LABELS: Record<WeatherType, string> = {
    CLEAR: 'Clear',
    WINDY: 'Wind',
    RAIN: 'Rain',
    FOG: 'Fog',
};
const MAP_REGION_LOOKUP = new globalThis.Map<string, MapRegion>(MAP_REGIONS.map((region) => [region.id, region]));
const DEFAULT_MENU_MAP_CAMERA = { x: CANVAS_WIDTH * 0.5, y: CANVAS_HEIGHT * 0.5, zoom: 0.84 };

const lerpNumber = (a: number, b: number, amount: number) => a + (b - a) * amount;
const easeValue = (value: number, easing: 'linear' | 'easeOut' | 'easeInOut' = 'easeInOut') => {
    const t = clamp(value, 0, 1);
    if (easing === 'linear') return t;
    if (easing === 'easeOut') return 1 - Math.pow(1 - t, 3);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const scaleMenuMapPoint = (point: Vector2) => ({
    x: point.x * MENU_MAP_WORLD_SCALE,
    y: point.y * MENU_MAP_WORLD_SCALE,
});
const scaleMenuMapRect = (rect: { x: number; y: number; width: number; height: number }) => ({
    x: rect.x * MENU_MAP_WORLD_SCALE,
    y: rect.y * MENU_MAP_WORLD_SCALE,
    width: rect.width * MENU_MAP_WORLD_SCALE,
    height: rect.height * MENU_MAP_WORLD_SCALE,
});
const clampMenuCameraTarget = (camera: { x: number; y: number; zoom: number }) => {
    const halfWidth = CANVAS_WIDTH / (2 * camera.zoom);
    const halfHeight = CANVAS_HEIGHT / (2 * camera.zoom);
    return {
        x: clamp(camera.x, halfWidth, MENU_MAP_WORLD_WIDTH - halfWidth),
        y: clamp(camera.y, halfHeight, MENU_MAP_WORLD_HEIGHT - halfHeight),
        zoom: clamp(camera.zoom, MENU_CAMERA_MIN_ZOOM, MENU_CAMERA_MAX_ZOOM),
    };
};
const clampMenuPanOffset = (offset: { x: number; y: number }) => ({
    x: clamp(offset.x, -MENU_MAP_WORLD_WIDTH * 0.82, MENU_MAP_WORLD_WIDTH * 0.82),
    y: clamp(offset.y, -MENU_MAP_WORLD_HEIGHT * 0.66, MENU_MAP_WORLD_HEIGHT * 0.66),
});
const getEffectiveDisplaySettings = (settings: GameSettings) => {
    const reducedMotion = settings.motionIntensity === 'reduced';
    const mapCameraStyle = reducedMotion ? 'steady' : settings.mapCameraStyle;
    const depthFocus = reducedMotion && settings.depthFocus === 'strong' ? 'subtle' : settings.depthFocus;
    const menuParallax = reducedMotion ? 'off' : settings.menuParallax;
    const shakeScale =
        settings.gameplayCameraShake === 'off'
            ? 0
            : settings.gameplayCameraShake === 'reduced'
            ? 0.48
            : reducedMotion
            ? 0.42
            : 1;
    const fxScale =
        settings.mapFxIntensity === 'low'
            ? 0.58
            : settings.mapFxIntensity === 'medium'
            ? 0.82
            : 1;
    return { mapCameraStyle, depthFocus, menuParallax, shakeScale, fxScale };
};

const getAtlasQualityForFrameMs = (frameMs: number): AtlasQuality => {
    if (frameMs > ATLAS_FRAME_LOW_MS) return 'low';
    if (frameMs > ATLAS_FRAME_MEDIUM_MS) return 'medium';
    return 'high';
};

const readUiPreferenceFlag = (key: UiPreferenceKey, fallback: boolean) => {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(UI_PREFERENCES_KEY);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'boolean') {
            return key === 'isMuted' ? parsed : fallback;
        }
        return typeof parsed?.[key] === 'boolean' ? parsed[key] : fallback;
    } catch {
        return fallback;
    }
};

const readNumericValue = (value: unknown, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const safeRatePercent = (numerator: number, denominator: number) => (denominator > 0 ? Math.round((numerator / denominator) * 100) : null);
const safeSeconds = (totalMs: number, sampleCount: number) =>
    sampleCount > 0 ? Math.round(totalMs / sampleCount / 1000) : null;

const readRecommendationMetrics = (): RecommendationMetrics => {
    if (typeof window === 'undefined') return EMPTY_RECOMMENDATION_METRICS;
    try {
        const raw = window.localStorage.getItem(RECOMMENDATION_METRICS_KEY);
        if (!raw) return EMPTY_RECOMMENDATION_METRICS;
        const parsed = JSON.parse(raw);

        return {
            offers: readNumericValue(parsed?.offers),
            opens: readNumericValue(parsed?.opens),
            purchases: readNumericValue(parsed?.purchases),
            skips: readNumericValue(parsed?.skips),
            openDelayTotalMs: readNumericValue(parsed?.openDelayTotalMs),
            openDelaySamples: readNumericValue(parsed?.openDelaySamples),
            skipDelayTotalMs: readNumericValue(parsed?.skipDelayTotalMs),
            skipDelaySamples: readNumericValue(parsed?.skipDelaySamples),
            openToBuyTotalMs: readNumericValue(parsed?.openToBuyTotalMs),
            openToBuySamples: readNumericValue(parsed?.openToBuySamples),
        };
    } catch {
        return EMPTY_RECOMMENDATION_METRICS;
    }
};

const readRecommendationTrendHistory = (): RecommendationTrendSample[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(RECOMMENDATION_TREND_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        const values = parsed
            .map((entry) => ({
                runId: readNumericValue(entry?.runId, -1),
                outcome:
                    entry?.outcome === 'win' || entry?.outcome === 'fail'
                        ? entry.outcome
                        : null,
                offers: readNumericValue(entry?.offers),
                opens: readNumericValue(entry?.opens),
                purchases: readNumericValue(entry?.purchases),
                skips: readNumericValue(entry?.skips),
                openDelayTotalMs: readNumericValue(entry?.openDelayTotalMs),
                openDelaySamples: readNumericValue(entry?.openDelaySamples),
                skipDelayTotalMs: readNumericValue(entry?.skipDelayTotalMs),
                skipDelaySamples: readNumericValue(entry?.skipDelaySamples),
                openToBuyTotalMs: readNumericValue(entry?.openToBuyTotalMs),
                openToBuySamples: readNumericValue(entry?.openToBuySamples),
                completedAt: readNumericValue(entry?.completedAt),
            }))
            .filter((entry) => entry.runId >= 0);

        return values
            .sort((a, b) => a.completedAt - b.completedAt)
            .slice(-RECOMMENDATION_TREND_HISTORY_SIZE);
    } catch {
        return [];
    }
};

const createRecommendationTrendSample = (
    runId: number,
    metrics: RecommendationMetrics,
    outcome: 'win' | 'fail' | null,
): RecommendationTrendSample => ({
    runId,
    outcome,
    offers: Math.max(0, Math.round(metrics.offers)),
    opens: Math.max(0, Math.round(metrics.opens)),
    purchases: Math.max(0, Math.round(metrics.purchases)),
    skips: Math.max(0, Math.round(metrics.skips)),
    openDelayTotalMs: Math.max(0, Math.round(metrics.openDelayTotalMs)),
    openDelaySamples: Math.max(0, Math.round(metrics.openDelaySamples)),
    skipDelayTotalMs: Math.max(0, Math.round(metrics.skipDelayTotalMs)),
    skipDelaySamples: Math.max(0, Math.round(metrics.skipDelaySamples)),
    openToBuyTotalMs: Math.max(0, Math.round(metrics.openToBuyTotalMs)),
    openToBuySamples: Math.max(0, Math.round(metrics.openToBuySamples)),
    completedAt: Date.now(),
});

const summarizeRecommendationTrendSamples = (samples: RecommendationTrendSample[]): RecommendationTrendSummary => {
    const totals = samples.reduce(
        (acc, sample) => ({
            offers: acc.offers + sample.offers,
            opens: acc.opens + sample.opens,
            purchases: acc.purchases + sample.purchases,
            skips: acc.skips + sample.skips,
            openDelayTotalMs: acc.openDelayTotalMs + sample.openDelayTotalMs,
            openDelaySamples: acc.openDelaySamples + sample.openDelaySamples,
            skipDelayTotalMs: acc.skipDelayTotalMs + sample.skipDelayTotalMs,
            skipDelaySamples: acc.skipDelaySamples + sample.skipDelaySamples,
            openToBuyTotalMs: acc.openToBuyTotalMs + sample.openToBuyTotalMs,
            openToBuySamples: acc.openToBuySamples + sample.openToBuySamples,
        }),
        {
            offers: 0,
            opens: 0,
            purchases: 0,
            skips: 0,
            openDelayTotalMs: 0,
            openDelaySamples: 0,
            skipDelayTotalMs: 0,
            skipDelaySamples: 0,
            openToBuyTotalMs: 0,
            openToBuySamples: 0,
        },
    );

    return {
        offers: totals.offers,
        opens: totals.opens,
        purchases: totals.purchases,
        skips: totals.skips,
        openRatePercent: safeRatePercent(totals.opens, totals.offers),
        buyRatePercent: safeRatePercent(totals.purchases, totals.offers),
        avgOpenDelaySeconds: safeSeconds(totals.openDelayTotalMs, totals.openDelaySamples),
        avgOpenToBuySeconds: safeSeconds(totals.openToBuyTotalMs, totals.openToBuySamples),
        avgSkipDelaySeconds: safeSeconds(totals.skipDelayTotalMs, totals.skipDelaySamples),
        runSamples: samples.length,
    };
};

const summarizeRecommendationTrendSamplesByOutcome = (samples: RecommendationTrendSample[]) => ({
    all: summarizeRecommendationTrendSamples(samples),
    win: summarizeRecommendationTrendSamples(samples.filter((entry) => entry.outcome === 'win')),
    fail: summarizeRecommendationTrendSamples(samples.filter((entry) => entry.outcome === 'fail')),
});

const createRunHistoryEntry = (
  level: LevelConfig,
  isWin: boolean,
  elapsedMs: number,
  score: number,
  tokens: number,
  livesLeft: number,
): RunHistoryEntry => ({
    score,
    levelId: level.id,
    levelName: level.name,
    isWin,
    elapsedMs,
    tokens,
    livesLeft,
    completedAt: new Date().toISOString(),
});

const buildActiveRoutePressure = (
    level: LevelConfig | null,
    localRunHistory: RunHistoryEntry[],
    communityBoardEntries: LeaderboardBoardEntry[],
    currentScore: number,
) : ActiveRoutePressure | null => {
    if (!level) return null;

    const localBest = [...localRunHistory]
        .filter((entry) => entry.levelId === level.id)
        .sort((left, right) => compareRunHistoryEntries(left, right))[0] ?? null;
    const rivalBest = [...communityBoardEntries]
        .filter((entry) => entry.levelId === level.id)
        .sort((left, right) => compareRunHistoryEntries(left, right))[0] ?? null;

    const progressPercent = (targetScore: number) =>
        Math.max(0, Math.min(100, Math.round((currentScore / Math.max(1, targetScore)) * 100)));

    if (rivalBest && localBest) {
        const rivalGap = rivalBest.score - localBest.score;
        if (rivalGap > 0) {
            const gapToLead = Math.max(0, rivalBest.score + 1 - currentScore);
            return {
                label: 'Rival chase',
                title: gapToLead > 0 ? `${gapToLead} pts to take the lane` : `Lead secured on ${rivalBest.playerLabel}`,
                detail: gapToLead > 0
                    ? `${rivalBest.playerLabel} owns this route at ${rivalBest.score}. Beat it to flip the board.`
                    : `Current run is past ${rivalBest.playerLabel}'s benchmark. Finish clean to bank the takeover.`,
                targetScore: rivalBest.score + 1,
                gapScore: currentScore - (rivalBest.score + 1),
                progressPercent: progressPercent(rivalBest.score + 1),
                tone: gapToLead > 0 ? 'rose' : 'emerald',
            };
        }

        if (rivalGap < 0) {
            const extendLeadBy = Math.abs(rivalGap) + Math.max(25, Math.round(level.targetDistance * 0.018));
            const targetScore = localBest.score + extendLeadBy;
            const gapToTarget = Math.max(0, targetScore - currentScore);
            return {
                label: 'Route defense',
                title: gapToTarget > 0 ? `${gapToTarget} pts to widen the lead` : 'Defensive run ahead of pace',
                detail: `You lead ${rivalBest.playerLabel} by ${Math.abs(rivalGap)}. Push beyond ${targetScore} to make the route harder to steal back.`,
                targetScore,
                gapScore: currentScore - targetScore,
                progressPercent: progressPercent(targetScore),
                tone: gapToTarget > 0 ? 'cyan' : 'emerald',
            };
        }

        const gapToBreakTie = Math.max(0, localBest.score + 1 - currentScore);
        return {
            label: 'Dead heat',
            title: gapToBreakTie > 0 ? `${gapToBreakTie} pts to break the tie` : 'Tie broken on current pace',
            detail: `${rivalBest.playerLabel} matched your ${localBest.score}-point benchmark. One cleaner finish decides the route.`,
            targetScore: localBest.score + 1,
            gapScore: currentScore - (localBest.score + 1),
            progressPercent: progressPercent(localBest.score + 1),
            tone: gapToBreakTie > 0 ? 'amber' : 'emerald',
        };
    }

    if (rivalBest) {
        const gapToFirstLead = Math.max(0, rivalBest.score + 1 - currentScore);
        return {
            label: 'First marker',
            title: gapToFirstLead > 0 ? `${gapToFirstLead} pts to post above rival` : 'First local benchmark is ahead',
            detail: `${rivalBest.playerLabel} already posted ${rivalBest.score}. This run can open the head-to-head route for your board.`,
            targetScore: rivalBest.score + 1,
            gapScore: currentScore - (rivalBest.score + 1),
            progressPercent: progressPercent(rivalBest.score + 1),
            tone: gapToFirstLead > 0 ? 'cyan' : 'emerald',
        };
    }

    if (localBest) {
        const nextPersonalBest = localBest.score + Math.max(25, Math.round(level.targetDistance * 0.018));
        const gapToBest = Math.max(0, nextPersonalBest - currentScore);
        return {
            label: 'Personal best',
            title: gapToBest > 0 ? `${gapToBest} pts to raise the route best` : 'Current run beats your route best',
            detail: `Your standing best is ${localBest.score}. A cleaner finish here raises the shareable benchmark.`,
            targetScore: nextPersonalBest,
            gapScore: currentScore - nextPersonalBest,
            progressPercent: progressPercent(nextPersonalBest),
            tone: gapToBest > 0 ? 'amber' : 'emerald',
        };
    }

    const openingBenchmark = Math.max(180, Math.round(level.targetDistance * 0.24));
    const gapToBenchmark = Math.max(0, openingBenchmark - currentScore);
    return {
        label: 'Opening benchmark',
        title: gapToBenchmark > 0 ? `${gapToBenchmark} pts to establish a scoreline` : 'Opening route score established',
        detail: 'No prior run owns this route yet. Land a clean score so future imports have something to chase.',
        targetScore: openingBenchmark,
        gapScore: currentScore - openingBenchmark,
        progressPercent: progressPercent(openingBenchmark),
        tone: gapToBenchmark > 0 ? 'amber' : 'emerald',
    };
};

const buildActiveFeaturedCupPressure = (
    level: LevelConfig | null,
    featuredRouteCup: FeaturedRouteCup | null,
    currentScore: number,
): ActiveFeaturedRoutePressure | null => {
    if (!level || !featuredRouteCup || level.id !== featuredRouteCup.levelId) {
        return null;
    }

    const targetScore = featuredRouteCup.targetScore;
    const targetLabel = targetScore === null ? featuredRouteCup.targetLabel : `Target ${targetScore} pts`;
    const progressPercent =
        targetScore === null
            ? featuredRouteCup.progressPercent
            : clamp(Math.round((currentScore / Math.max(1, targetScore)) * 100), 0, 100);
    const gapToTarget = targetScore === null ? null : targetScore - currentScore;
    const gapScore = targetScore === null ? null : currentScore - targetScore;

    return {
        label: 'Daily Crew Cup',
        title:
            targetScore === null
                ? featuredRouteCup.statusLabel
                : gapToTarget > 0
                    ? `${gapToTarget} pts to hit today's cup mark`
                    : 'You already hit the featured cup mark',
        detail: featuredRouteCup.detail,
        targetScore,
        gapScore,
        progressPercent,
        tone: featuredRouteCup.tone,
        statusLabel: featuredRouteCup.statusLabel,
        countdownLabel: featuredRouteCup.countdownLabel,
        targetLabel,
    };
};

// --- AUDIO CONFIG ---
const SFX_URLS = {
    BRANCH_BREAK: resolveAudioCueUrl('branch_break') ?? '',
    LEAVES: resolveAudioCueUrl('leaves') ?? '',
    GRAPPLE: resolveAudioCueUrl('grapple') ?? '',
};

const RANKS: { threshold: number, title: SkillRank, color: string }[] = [
    { threshold: 6000, title: 'LEGEND', color: '#FFD700' },
    { threshold: 3000, title: 'MYTHIC', color: '#D50000' },
    { threshold: 1500, title: 'FEROCIOUS', color: '#E040FB' },
    { threshold: 500, title: 'WILD', color: '#FF9100' },
    { threshold: 0, title: 'GROOVIN', color: '#00E676' }
];

// --- SOUND SYNTHESIZER ---
const SoundSynth = {
    ctx: null as AudioContext | null,
    init: () => {
        if (!SoundSynth.ctx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) SoundSynth.ctx = new AudioContextClass();
        }
    },
    playClip: (url: string, vol: number = 0.5) => {
        audioManager.playClip(url, vol);
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
        SoundSynth.playTone(260, 'triangle', 0.08, 0.02);
        setTimeout(() => SoundSynth.playTone(420, 'sine', 0.09, 0.014), 35);
    },
    playGrapple: () => SoundSynth.playClip(SFX_URLS.GRAPPLE, 0.18),
    playRelease: () => {
        SoundSynth.playTone(330, 'triangle', 0.08, 0.018);
        setTimeout(() => SoundSynth.playTone(520, 'sine', 0.08, 0.012), 30);
    },
    playCoin: () => {
        SoundSynth.playTone(1200, 'sine', 0.1, 0.05);
        setTimeout(() => SoundSynth.playTone(1800, 'sine', 0.2, 0.05), 50);
    },
    playBranchBreak: () => {
        SoundSynth.playClip(SFX_URLS.BRANCH_BREAK, 0.22);
    },
    playLeaves: () => {
        SoundSynth.playClip(SFX_URLS.LEAVES, 0.14);
    },
    playCrash: () => {
        SoundSynth.playTone(100, 'sawtooth', 0.3, 0.1);
        SoundSynth.playTone(50, 'square', 0.3, 0.1);
    }
};

// --- HELPER FUNCTIONS ---
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const mixSeed = (...parts: number[]) =>
    parts.reduce((seed, part, index) => {
        const normalized = Number.isFinite(part) ? Math.round(part * (index % 2 === 0 ? 1 : 1000)) : 0;
        const next = (seed ^ (normalized + 0x9e3779b9 + (seed << 6) + (seed >>> 2))) >>> 0;
        return next === 0 ? 0x6d2b79f5 : next;
    }, 0x811c9dc5);
const createSeededRandom = (seed: number) => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const getMapNodePosition = (index: number) => {
    const horizontalPadding = MENU_MAP_WORLD_WIDTH * 0.12;
    const verticalPaddingTop = MENU_MAP_WORLD_HEIGHT * 0.14;
    const verticalPaddingBottom = MENU_MAP_WORLD_HEIGHT * 0.16;
    const progress = LEVELS.length > 1 ? index / (LEVELS.length - 1) : 0;
    return {
        x: horizontalPadding + progress * (MENU_MAP_WORLD_WIDTH - horizontalPadding * 2),
        y:
            MENU_MAP_WORLD_HEIGHT -
            verticalPaddingBottom -
            progress * (MENU_MAP_WORLD_HEIGHT - verticalPaddingTop - verticalPaddingBottom) +
            Math.sin(index * 1.45) * 64 * MENU_MAP_WORLD_SCALE,
    };
};
const getLevelAtMapPoint = (x: number, y: number) => {
    let nearestLevel: LevelConfig | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < LEVELS.length; index += 1) {
        const point = getMapNodePosition(index);
        const distance = Math.hypot(x - point.x, y - point.y);
        if (distance < LEVEL_NODE_HIT_RADIUS) return LEVELS[index];
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestLevel = LEVELS[index];
        }
    }
    return nearestDistance < LEVEL_NODE_HIT_RADIUS * 1.5 ? nearestLevel : null;
};
const getLevelNodePosition = (index: number) => ({
    x: getMapNodePosition(index).x,
    y: getMapNodePosition(index).y,
});
const getMapRegionForLevel = (levelId: number) => {
    if (levelId <= 1) return MAP_REGION_LOOKUP.get('jungle-camp') ?? null;
    if (levelId <= 2) return MAP_REGION_LOOKUP.get('floodline-rise') ?? null;
    if (levelId <= 4) return MAP_REGION_LOOKUP.get('great-lake-basin') ?? null;
    if (levelId <= 6) return MAP_REGION_LOOKUP.get('troll-valley') ?? null;
    if (levelId <= 11) return MAP_REGION_LOOKUP.get('magma-frontier') ?? null;
    if (levelId <= 12) return MAP_REGION_LOOKUP.get('storm-crown') ?? null;
    return MAP_REGION_LOOKUP.get('aether-bastion') ?? MAP_REGION_LOOKUP.get('storm-crown') ?? MAP_REGION_LOOKUP.get('magma-frontier') ?? null;
};
const getMenuFocusAnchorForLevel = (levelId: number, zoom: number) => {
    const progress = LEVELS.length > 1 ? (levelId - 1) / (LEVELS.length - 1) : 0;
    const xRatio =
        progress < 0.22 ? 0.36 :
        progress < 0.45 ? 0.44 :
        progress < 0.75 ? 0.5 :
        0.56;
    const yRatio =
        progress < 0.25 ? 0.28 :
        progress < 0.6 ? 0.3 :
        0.32;
    return {
        xRatio,
        yRatio,
        xOffset: (0.5 - xRatio) * CANVAS_WIDTH / zoom,
        yOffset: (0.5 - yRatio) * CANVAS_HEIGHT / zoom,
    };
};
const getMenuCameraTargetFromState = (
    gameState: GameState,
    selectedLevelId: number | null,
    storyBeat = INTRO_STORY_SEQUENCE.beats[0],
) => {
    if (gameState === GameState.STORY_MAP) {
        const keyframe = storyBeat.cameraKeyframe ?? storyBeat.cameraTarget;
        if (keyframe) {
            const scaled = scaleMenuMapPoint(keyframe);
            return { x: scaled.x, y: scaled.y, zoom: keyframe.zoom ?? 1 };
        }
    }
    if (gameState === GameState.LANDING) {
        const region = MAP_REGION_LOOKUP.get('jungle-camp');
        if (region) {
            const focal = scaleMenuMapPoint(region.focalPoint);
            return { x: focal.x + 180 * MENU_MAP_WORLD_SCALE, y: focal.y - 40 * MENU_MAP_WORLD_SCALE, zoom: 0.84 };
        }
    }
    const selectedLevel = selectedLevelId ? LEVELS[selectedLevelId - 1] : null;
    if (selectedLevel) {
        const node = getMapNodePosition(selectedLevel.id - 1);
        const region = getMapRegionForLevel(selectedLevel.id);
        const earlyRouteShiftX = selectedLevel.id <= 3 ? -78 : selectedLevel.id >= 8 ? 66 : 0;
        const earlyRouteShiftY = selectedLevel.id <= 3 ? -156 : selectedLevel.id >= 8 ? -42 : -68;
        return {
            x: clamp(node.x + earlyRouteShiftX * MENU_MAP_WORLD_SCALE, CANVAS_WIDTH * 0.18, MENU_MAP_WORLD_WIDTH - CANVAS_WIDTH * 0.18),
            y: clamp(node.y + (region ? (scaleMenuMapPoint(region.focalPoint).y - node.y) * 0.08 : 0) + earlyRouteShiftY * MENU_MAP_WORLD_SCALE, CANVAS_HEIGHT * 0.2, MENU_MAP_WORLD_HEIGHT - CANVAS_HEIGHT * 0.22),
            zoom: region ? Math.max(0.72, Math.min(0.82, region.defaultZoom - 0.2)) : 0.78,
        };
    }
    return clampMenuCameraTarget({ ...DEFAULT_MENU_MAP_CAMERA, zoom: 0.82 });
};
const getMenuCameraTargetForLevel = (levelId: number) => {
    const level = LEVELS[levelId - 1];
    if (!level) return clampMenuCameraTarget({ ...DEFAULT_MENU_MAP_CAMERA, zoom: 0.82 });
    const node = getMapNodePosition(level.id - 1);
    const region = getMapRegionForLevel(level.id);
    const zoomTarget =
        level.id <= 2 ? 0.92 :
        level.id <= 4 ? 0.88 :
        level.id <= 7 ? 0.84 :
        0.8;
    const anchor = getMenuFocusAnchorForLevel(level.id, zoomTarget);
    const regionFocal = region ? scaleMenuMapPoint(region.focalPoint) : node;
    const regionBias = level.id <= 2 ? 0.18 : level.id >= 8 ? 0.08 : 0.12;
    return clampMenuCameraTarget({
        x: node.x + anchor.xOffset + (regionFocal.x - node.x) * regionBias,
        y: node.y + anchor.yOffset + (regionFocal.y - node.y) * 0.08,
        zoom: zoomTarget,
    });
};
const screenPointToMenuMapWorld = (x: number, y: number, camera: { x: number; y: number; zoom: number }) => ({
    x: (x - CANVAS_WIDTH / 2) / camera.zoom + camera.x,
    y: (y - CANVAS_HEIGHT / 2) / camera.zoom + camera.y,
});
const getSeasonalFlow = (worldTime: number, levelId: number) => Math.sin(worldTime * 0.26 + levelId * 0.41);
const getAmbientFlow = (
    worldTime: number,
    levelId: number,
    biome: BiomeType,
    weather: WeatherType,
    x: number,
    y: number,
    intensity: number = 1,
) => {
    const seasonalFlow = getSeasonalFlow(worldTime, levelId);
    const isMonsoon = (biome === 'JUNGLE' || biome === 'SWAMP') && (weather === 'RAIN' || weather === 'WINDY');
    const baseBreeze =
        biome === 'JUNGLE' ? 0.92 :
        biome === 'SWAMP' ? 0.74 :
        biome === 'VOLCANO' ? 0.4 :
        biome === 'CAVE' ? 0.16 :
        0.5;
    const gustFactor = isMonsoon ? 1.45 : weather === 'WINDY' ? 1.05 : 0.45;
    const phase = worldTime * (0.82 + gustFactor * 0.24) + x * 0.0032 + y * 0.0014 + levelId * 0.17;
    return {
        x: (Math.sin(phase) * baseBreeze + seasonalFlow * gustFactor) * intensity,
        y: Math.cos(phase * 0.84 + 1.7) * baseBreeze * 0.26 * intensity,
        gustFactor,
        isMonsoon,
        seasonalFlow,
    };
};
const isWorldRectVisible = (x: number, y: number, width: number, height: number, camera: Vector2, margin: number = DRAW_MARGIN) => {
    return !(
        x + width < camera.x - margin ||
        x > camera.x + CANVAS_WIDTH + margin ||
        y + height < camera.y - margin ||
        y > camera.y + CANVAS_HEIGHT + margin
    );
};
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
const getMonsoonStrength = (biome: BiomeType, weatherType: WeatherType, seasonalFlow: number) => {
    const monsoonBiome = biome === 'JUNGLE' || biome === 'SWAMP';
    const monsoonWeather = weatherType === 'RAIN' || weatherType === 'WINDY';
    if (!monsoonBiome || !monsoonWeather) return 0;
    return 0.55 + (seasonalFlow + 1) * 0.24;
};
const getAmbientSway = (worldTime: number, x: number, amplitude: number, speed: number = 1, phase: number = 0) =>
    Math.sin(worldTime * speed + x * 0.01 + phase) * amplitude;
const isUiControlTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(target.closest('[data-ui-control], button, a, input, select, textarea, label, [role="button"]'));
const isRecoveryAnchorEntity = (entity: Entity) =>
    entity.id.startsWith('entry-') ||
    entity.id.startsWith('guide-') ||
    entity.id.startsWith('rescue-') ||
    entity.id.startsWith('bailout-') ||
    entity.id.startsWith('support-') ||
    entity.id.startsWith('exit-') ||
    entity.id.startsWith('script-recovery-') ||
    entity.id.startsWith('script-checkpoint-') ||
    entity.id.startsWith('script-exit-');
const checkCollision = (r1: Entity | {position: Vector2, width: number, height: number}, r2: Entity) => {
  return (
    r1.position.x < r2.position.x + r2.width &&
    r1.position.x + r1.width > r2.position.x &&
    r1.position.y < r2.position.y + r2.height &&
    r1.position.y + r1.height > r2.position.y
  );
};
const isSupportSurface = (entity: Entity) => (entity.type === 'branch' && !entity.isBroken) || entity.type === 'lilypad';
const canLandOnSurface = (
    player: { position: Vector2; width: number; height: number; velocity: Vector2 },
    previousPosition: Vector2,
    surface: Entity,
) => {
    if (!isSupportSurface(surface)) return false;
    const previousBottom = previousPosition.y + player.height;
    const currentBottom = player.position.y + player.height;
    const surfaceTop = surface.position.y + (surface.type === 'lilypad' ? 0 : 2);
    const horizontalInset = surface.type === 'lilypad' ? 4 : Math.min(14, surface.width * 0.1);
    const horizontalOverlap =
        player.position.x + player.width - 6 > surface.position.x + horizontalInset &&
        player.position.x + 6 < surface.position.x + surface.width - horizontalInset;
    const crossedTop = previousBottom <= surfaceTop + 10 && currentBottom >= surfaceTop;
    const wasAbove = previousPosition.y + player.height <= surfaceTop + 14;
    return horizontalOverlap && crossedTop && wasAbove && player.velocity.y >= -0.2;
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

type GrappleTarget = {
  entity: Entity;
  anchor: Vector2;
};

const createInitialCheckpointState = (): CheckpointState => ({
    activeId: null,
    activatedIds: [],
    respawnPosition: null,
    respawnVelocity: { x: 0, y: 0 },
    label: null,
});

const createEmptyLevelResult = (): LevelResult => ({
    bestScore: 0,
    bestTimeMs: null,
    firstClearedAt: null,
    stars: 0,
    clears: 0,
});

const createInitialRunDebrief = (): RunDebrief => ({
    checkpointsSecured: 0,
    redeploys: 0,
    hazardHits: 0,
    jumpsUsed: 0,
    maxComboMultiplier: BASE_MULTIPLIER,
    maxComboRank: 'GROOVIN',
    maxComboScore: 0,
    peakSpeed: 0,
    usedSafetyNet: false,
});

const computeLevelStars = (level: LevelConfig, timeMs: number, livesRemaining: number) => {
    const parMs = Math.max(50000, level.targetDistance * 95);
    let stars = 1;
    if (timeMs <= parMs) stars += 1;
    if (livesRemaining >= 2) stars += 1;
    return clamp(stars, 1, 3);
};

const buildSessionMusicProfile = (biome: BiomeType, levelId: number, sessionNumber: number): MusicProfile => {
    return pickMusicProfileForBiome(biome, sessionNumber * 17 + levelId * 13);
};

const getSegmentRouteTemplate = (level: LevelConfig, startX: number): 'recovery' | 'speed' | 'vertical' | 'hazard' | 'gem' => {
    if (level.tutorialType === 'BASIC') return 'recovery';
    const routeSpawnProfile = getRouteSpawnProfile(level);
    const routeProgress = routeSpawnProfile.routeProgress;

    const routeBudget = Math.max(1, level.targetDistance * 20);
    const progress = clamp(startX / routeBudget, 0, 0.999);
    const actIndex = Math.min(level.actTemplates.length - 1, Math.floor(progress * level.actTemplates.length));
    const act = level.actTemplates[actIndex] ?? 'recovery';

    if (act === 'recovery') return 'recovery';
    if (act === 'reward') return 'gem';
    if (act === 'speed') return 'speed';
    if (act === 'hazard') return 'hazard';
    if (routeProgress <= ROUTE_PROFILE_THRESHOLD.speedTemplateCap || level.threatProfile === 'starter') return 'speed';
    return level.biome === 'SWAMP' ? 'vertical' : 'hazard';
};

const getScriptedRouteBeat = (level: LevelConfig, startX: number) => {
    const routeScript = ROUTE_SCRIPTS[level.id];
    if (!routeScript || startX < STARTER_ZONE_END) return null;
    const routeBudget = Math.max(1, level.targetDistance * 20 - STARTER_ZONE_END);
    const scriptBudget = Math.min(routeBudget, routeScript.beatWidth * routeScript.beats.length);
    const progress = clamp((startX - STARTER_ZONE_END) / scriptBudget, 0, 0.999);
    const beatIndex = Math.min(routeScript.beats.length - 1, Math.floor(progress * routeScript.beats.length));
    return { beat: routeScript.beats[beatIndex], beatIndex, routeScript };
};

export default function App() {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.LANDING);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('General');
  const [storyBeatIndex, setStoryBeatIndex] = useState(0);
  const [hoveredLevelId, setHoveredLevelId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [runTokens, setRunTokens] = useState(0);
  const [cooldowns, setCooldowns] = useState({ [AbilityType.PUNCH]: 0, [AbilityType.LASER]: 0, [AbilityType.BANANA]: 0, [AbilityType.SLOW_MO]: 0 });
  const [activeAbility, setActiveAbility] = useState<AbilityType | null>(null);
  const [currentBiome, setCurrentBiome] = useState<BiomeType>('JUNGLE');
  const [isPaused, setIsPaused] = useState(false);
  const [isInvincible, setIsInvincible] = useState(false);
  const [playerLives, setPlayerLives] = useState(MAX_LIVES);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [tutorial, setTutorial] = useState<TutorialState>({ active: false, currentStep: 'WELCOME', showBox: false, message: "" });
  const [hideTutorialTips, setHideTutorialTips] = useState(false);
  const [activeTab, setActiveTab] = useState<'UPGRADES' | 'ROPES' | 'SKINS'>('UPGRADES');
  const [recommendedShopItemId, setRecommendedShopItemId] = useState<string | null>(null);
  const [recommendationTrace, setRecommendationTrace] = useState<RecommendationTrace | null>(null);
  const [recommendationMetrics, setRecommendationMetrics] = useState<RecommendationMetrics>(readRecommendationMetrics);
  const [recommendationSessionMetrics, setRecommendationSessionMetrics] = useState<RecommendationMetrics>(EMPTY_RECOMMENDATION_METRICS);
  const [recommendationRunHistory, setRecommendationRunHistory] = useState<RecommendationTrendSample[]>(
    readRecommendationTrendHistory,
  );
  const [runCampaignChallengeResult, setRunCampaignChallengeResult] = useState<{
    title: string;
    description: string;
    tone: CampaignChallenge['tone'];
  } | null>(null);
  const [runFeaturedRouteCupResult, setRunFeaturedRouteCupResult] = useState<FeaturedRouteCupRunOutcome | null>(null);
  const [runAchievementUnlocks, setRunAchievementUnlocks] = useState<RunAchievementUnlock[]>([]);
  const [purchaseReceipt, setPurchaseReceipt] = useState<PurchaseReceipt | null>(null);
  const recommendationSessionMetricsRef = useRef(recommendationSessionMetrics);
  const recommendationRunIdRef = useRef(0);
  
  // AUDIO STATE
  const [isMuted, setIsMuted] = useState(() => readUiPreferenceFlag('isMuted', false));
  const [isFullscreen, setIsFullscreen] = useState(() => typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>(DEFAULT_RUNTIME_SETTINGS);

  // Weather State
  const [weather, setWeather] = useState<{type: WeatherType, timer: number}>({ type: 'CLEAR', timer: 0 });

  // Skill Chain UI State
  const [skillChainUI, setSkillChainUI] = useState<SkillChainState>({
      active: false, currentScore: 0, multiplier: 1, events: [], timer: 0, rank: 'GROOVIN'
  });

  // Persistent Data
  const [saveData, setSaveData] = useState<SaveData>(DEFAULT_SAVE);
  const [isSaveHydrated, setIsSaveHydrated] = useState(false);
  const [saveRecoveryNotice, setSaveRecoveryNotice] = useState<string | null>(null);
  const [checkpointBanner, setCheckpointBanner] = useState<string | null>(null);
  const [communityBoardEntries, setCommunityBoardEntries] = useState<LeaderboardBoardEntry[]>([]);
  const [leaderboardAlias, setLeaderboardAlias] = useState(() => readLeaderboardAlias());
  const [leaderboardRemoteSource, setLeaderboardRemoteSource] = useState(() => readLeaderboardRemoteSource());
  const [leaderboardRemoteSyncAt, setLeaderboardRemoteSyncAt] = useState<number | null>(() => readLeaderboardRemoteSyncAt());
  const [isProgressDrawerOpen, setIsProgressDrawerOpen] = useState(false);
  const [isProgressSidebarCollapsed, setIsProgressSidebarCollapsed] = useState(() => readUiPreferenceFlag('isProgressSidebarCollapsed', true));
  const [isRunHudDetailsOpen, setIsRunHudDetailsOpen] = useState(() => readUiPreferenceFlag('isRunHudDetailsOpen', false));
  const [isAtlasFocusMode, setIsAtlasFocusMode] = useState(() => readUiPreferenceFlag('isAtlasFocusMode', true));
  const [launchIntro, setLaunchIntro] = useState<LaunchIntroState | null>(null);
  const [launchIntroClockMs, setLaunchIntroClockMs] = useState(() => Date.now());
  const [pendingSharedLeaderboardOpen, setPendingSharedLeaderboardOpen] = useState(false);
  const [incomingRouteChallenge, setIncomingRouteChallenge] = useState<IncomingRouteChallenge | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadSaveData(DEFAULT_SAVE)
      .then(({ saveData: loadedSave, recoveryNotice }) => {
        if (cancelled) return;
        setSaveData(loadedSave);
        setSaveRecoveryNotice(recoveryNotice);
        setRuntimeSettings(resolveSwingLabConfig(loadedSave));
        setSelectedLevelId(loadedSave.hasCompletedStoryIntro ? null : loadedSave.lastSelectedLevelId);
      })
      .catch((error) => {
        console.warn('Failed to load save data', error);
        setSaveRecoveryNotice('Save data could not be loaded and was reset. Open Settings > Data to export or restore a backup.');
      })
      .finally(() => {
        if (!cancelled) setIsSaveHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
      if (!isSaveHydrated) return;
      persistSaveData(saveData).catch((error) => {
          console.warn('Failed to persist save data', error);
      });
  }, [isSaveHydrated, saveData]);

  useEffect(() => {
      if (typeof window === 'undefined') return;

      const incomingFromStorage = readCommunityBoardStorage();
      if (incomingFromStorage.length > 0) {
          setCommunityBoardEntries(incomingFromStorage);
      }

      const query = new URLSearchParams(window.location.search);
      const routeLevelId = normalizeLeaderboardRouteLevelId(query.get(LEADERBOARD_ROUTE_QUERY_KEY));
      if (routeLevelId !== null) {
          setSelectedLevelId(routeLevelId);
          selectedLevelRef.current = routeLevelId;
      }

      const incomingCode = query.get(LEADERBOARD_SHARE_QUERY_KEY);
      const extractedCode = extractBoardToken(incomingCode ?? '');
      const openSharedLeaderboard = query.get(LEADERBOARD_VIEW_QUERY_KEY) === LEADERBOARD_VIEW_LEADERBOARD;
      if (!extractedCode) {
          query.delete(LEADERBOARD_ROUTE_QUERY_KEY);
          query.delete(LEADERBOARD_VIEW_QUERY_KEY);
          const queryEntries = query.toString();
          const cleanUrl = `${window.location.pathname}${queryEntries ? `?${queryEntries}` : ''}${window.location.hash}`;
          window.history.replaceState({}, '', cleanUrl);
          setIncomingRouteChallenge(null);
          return;
      }

      const incomingPayload = decodeLeaderboardPayload(extractedCode);
      if (!incomingPayload || incomingPayload.entries.length === 0) {
          setSaveRecoveryNotice('Could not read leaderboard share code from URL.');
          setIncomingRouteChallenge(null);
      } else {
          setLeaderboardRemoteSource('');
          setLeaderboardRemoteSyncAt(null);
          const incomingRows: LeaderboardBoardEntry[] = hydrateCommunityBoard(incomingPayload);
          setCommunityBoardEntries((previous) =>
              mergeCommunityBoardRows(previous, incomingRows),
          );
          if (routeLevelId !== null) {
              const level = LEVELS.find((entry) => entry.id === routeLevelId);
              setIncomingRouteChallenge({
                  levelId: routeLevelId,
                  challengerAlias: readStringValue(incomingPayload.alias, DEFAULT_BOARD_ALIAS),
              });
              setSaveRecoveryNotice(
                  `Imported ${incomingPayload.entries.length} community runs from ${incomingPayload.alias} and focused ${level ? `L${level.id} ${level.name}` : `L${routeLevelId}`}.`,
              );
          } else {
              setIncomingRouteChallenge(null);
              setSaveRecoveryNotice(`Imported ${incomingPayload.entries.length} community runs from ${incomingPayload.alias}.`);
          }
          if (openSharedLeaderboard) {
              setPendingSharedLeaderboardOpen(true);
          }
      }

      query.delete(LEADERBOARD_SHARE_QUERY_KEY);
      query.delete(LEADERBOARD_ROUTE_QUERY_KEY);
      query.delete(LEADERBOARD_VIEW_QUERY_KEY);
      const queryEntries = query.toString();
      const cleanUrl = `${window.location.pathname}${queryEntries ? `?${queryEntries}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', cleanUrl);
  }, []);

  useEffect(() => {
      if (gameState !== GameState.MENU) return;
      if (selectedLevelId !== null) return;
      const fallbackLevel = Math.max(1, Math.min(saveDataRef.current.lastSelectedLevelId || 1, Math.max(1, saveDataRef.current.maxLevelReached)));
      setSelectedLevelId(fallbackLevel);
      selectedLevelRef.current = fallbackLevel;
  }, [gameState, selectedLevelId]);

  useEffect(() => {
    if (!purchaseReceipt) return;
    const timeoutId = window.setTimeout(() => setPurchaseReceipt(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [purchaseReceipt]);

  useEffect(() => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify({
        isMuted,
        isProgressSidebarCollapsed,
        isRunHudDetailsOpen,
        isAtlasFocusMode,
      }));
  }, [isMuted, isProgressSidebarCollapsed, isRunHudDetailsOpen, isAtlasFocusMode]);

  useEffect(() => {
      if (!isAtlasFocusMode) return;
      setIsProgressSidebarCollapsed(true);
  }, [isAtlasFocusMode]);

  useEffect(() => {
      persistLeaderboardAlias(leaderboardAlias);
  }, [leaderboardAlias]);

  useEffect(() => {
      persistLeaderboardRemoteSource(leaderboardRemoteSource);
  }, [leaderboardRemoteSource]);

  useEffect(() => {
      persistLeaderboardRemoteSyncAt(leaderboardRemoteSyncAt);
  }, [leaderboardRemoteSyncAt]);

  useEffect(() => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(RECOMMENDATION_METRICS_KEY, JSON.stringify(recommendationMetrics));
  }, [recommendationMetrics]);

  useEffect(() => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(RECOMMENDATION_TREND_KEY, JSON.stringify(recommendationRunHistory));
  }, [recommendationRunHistory]);

  useEffect(() => {
      if (typeof window === 'undefined') return;
      if (communityBoardEntries.length === 0) {
          window.localStorage.removeItem(LEADERBOARD_COMMUNITY_STORAGE_KEY);
          return;
      }

      const payload: LeaderboardSharePayload = {
          game: 'Infinite Swinger',
          version: LEADERBOARD_SHARE_VERSION,
          sharedAt: Date.now(),
          alias: 'Community Merge',
          entries: communityBoardEntries.slice(-COMMUNITY_BOARD_ENTRY_LIMIT).map((entry) => ({
              playerLabel: entry.playerLabel,
              score: entry.score,
              levelId: entry.levelId,
              levelName: entry.levelName,
              isWin: entry.isWin,
              elapsedMs: entry.elapsedMs,
              tokens: entry.tokens,
              livesLeft: entry.livesLeft,
              completedAt: entry.completedAt,
          })),
      };

      window.localStorage.setItem(
          LEADERBOARD_COMMUNITY_STORAGE_KEY,
          JSON.stringify(payload),
      );
  }, [communityBoardEntries]);

  useEffect(() => {
      recommendationSessionMetricsRef.current = recommendationSessionMetrics;
  }, [recommendationSessionMetrics]);

  const updateRecommendationMetrics = useCallback((recipe: (prev: RecommendationMetrics) => RecommendationMetrics) => {
      setRecommendationMetrics((previous) => recipe(previous));
      setRecommendationSessionMetrics((previous) => recipe(previous));
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

      const preloadUiSurfaces = () => {
      void import('./components/SettingsModal');
      void import('./components/ui/EndRunModal');
      void import('./components/ui/MenuScreen');
      void import('./components/ui/LeaderboardScreen');
      void import('./components/ui/ShopScreen');
      void import('./components/ui/StoryMapOverlay');
    };

    const useIdleCallback = 'requestIdleCallback' in window;
    const idleLoader = useIdleCallback
      ? (window as Window & typeof globalThis & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(preloadUiSurfaces)
      : window.setTimeout(preloadUiSurfaces, 1200);

    return () => {
      if (useIdleCallback && 'cancelIdleCallback' in window) {
        (window as Window & typeof globalThis & { cancelIdleCallback: (handle: number) => void }).cancelIdleCallback(idleLoader);
      } else {
        window.clearTimeout(idleLoader);
      }
    };
  }, []);

  // --- AUDIO SETUP ---
  useEffect(() => {
      SoundSynth.init();
      const effectiveMusicVolume = runtimeSettings.musicVolume * saveData.settings.musicVolume;
      const musicProfile = currentMusicProfileRef.current;
      audioManager.setMuted(isMuted);
      audioManager.setMasterVolume(saveData.settings.masterVolume);
      audioManager.setSfxVolume(saveData.settings.sfxVolume);
      audioManager.setMusicVolume(effectiveMusicVolume);

      if (isMuted || gameState !== GameState.PLAYING) audioManager.pauseMusic();
      else audioManager.playMusic(musicProfile.url, effectiveMusicVolume, musicProfile);
  }, [currentBiome, gameState, isMuted, runtimeSettings.musicVolume, saveData.settings.masterVolume, saveData.settings.musicVolume, saveData.settings.sfxVolume]);

  const toggleMute = useCallback(() => {
      setIsMuted(prev => !prev);
  }, []);

  const togglePause = useCallback(() => {
      const mode = gameStateRef.current;
      if (mode !== GameState.PLAYING && !isPausedRef.current) return;
      setIsPaused(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(async () => {
      if (typeof document === 'undefined') return;
      try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await (gameShellRef.current ?? document.documentElement).requestFullscreen();
      } catch (error) {
          console.warn('Fullscreen toggle failed', error);
      }
  }, []);

  const commitSaveData = useCallback((recipe: (prev: SaveData) => SaveData) => {
      setSaveData((prev) => withDerivedProgression(recipe(prev)));
  }, []);

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
      commitSaveData(prev => ({
          ...prev,
          settings: {
              ...prev.settings,
              ...patch,
          },
      }));
  }, [commitSaveData]);

  const cycleHudDensity = useCallback(() => {
      const order: GameSettings['hudDensity'][] = ['full', 'compact', 'hidden'];
      const currentIndex = order.indexOf(saveDataRef.current.settings.hudDensity);
      const nextDensity = order[(currentIndex + 1) % order.length];
      updateSettings({ hudDensity: nextDensity });
  }, [updateSettings]);

  const unlockAllLevels = useCallback(() => {
      debugFlagsRef.current.unlockAllLevels = true;
      commitSaveData(prev => ({
          ...prev,
          maxLevelReached: LEVELS.length,
      }));
  }, [commitSaveData]);

  const resetLocalProgress = useCallback(() => {
      void clearPersistedSaveData().catch((error) => {
          console.warn('Failed to clear persisted save data', error);
      });
      setSaveData(withDerivedProgression({
          ...DEFAULT_SAVE,
          settings: saveDataRef.current.settings,
          hasCompletedStoryIntro: saveDataRef.current.hasCompletedStoryIntro,
          selectedMoodPreset: saveDataRef.current.selectedMoodPreset,
          customSwingLabConfig: saveDataRef.current.customSwingLabConfig,
      }));
      setRuntimeSettings(resolveSwingLabConfig(saveDataRef.current));
      setSaveRecoveryNotice(null);
      setSelectedLevelId(null);
      selectedLevelRef.current = 1;
      checkpointRef.current = createInitialCheckpointState();
      checkpointBannerTimerRef.current = 0;
      setCheckpointBanner(null);
      setShowSettings(false);
      setStoryBeatIndex(0);
      setPurchaseReceipt(null);
      setGameState(GameState.LANDING);
      setActiveTab('UPGRADES');
  }, []);

  const openSettings = useCallback((tab: SettingsTab = 'General') => {
      setSettingsTab(tab);
      setShowSettings(true);
  }, []);

  const getPreferredMenuFocusLevelId = useCallback(() => {
      return Math.max(
          1,
          Math.min(
              selectedLevelId ?? saveDataRef.current.lastSelectedLevelId ?? selectedLevelRef.current ?? 1,
              LEVELS.length,
          ),
      );
  }, [selectedLevelId]);

  const enableManualMenuCameraControl = useCallback(() => {
      if (gameStateRef.current === GameState.PLAYING || menuCameraControlModeRef.current === 'manual') return;
      const storyBeat = INTRO_STORY_SEQUENCE.beats[storyBeatIndexRef.current] ?? INTRO_STORY_SEQUENCE.beats[0];
      const baseTarget = getMenuCameraTargetFromState(
          gameStateRef.current,
          null,
          storyBeat,
      );
      const currentCamera = menuMapCameraRef.current;
      menuPanOffsetRef.current = clampMenuPanOffset({
          x: currentCamera.x - baseTarget.x,
          y: currentCamera.y - baseTarget.y,
      });
      menuCameraZoomOffsetRef.current = clamp(currentCamera.zoom - baseTarget.zoom, -0.2, 0.18);
      menuPanVelocityRef.current = { x: 0, y: 0 };
      menuFocusTransitionRef.current = null;
      menuCameraControlModeRef.current = 'manual';
  }, []);

  const handleSelectLevel = useCallback((levelId: number, options?: { focus?: boolean }) => {
      const focus = options?.focus ?? false;
      const focusTarget = getMenuCameraTargetForLevel(levelId);
      const currentCamera = menuMapCameraRef.current;
      const isSameSelection = selectedLevelRef.current === levelId;
      const selectedLevelEntry = LEVELS.find((level) => level.id === levelId) ?? null;
      const focusDistance = Math.hypot(currentCamera.x - focusTarget.x, currentCamera.y - focusTarget.y);
      const zoomDistance = Math.abs(currentCamera.zoom - focusTarget.zoom);
      const shouldRetargetCamera = focus && (!isSameSelection || focusDistance > 36 || zoomDistance > 0.035);
      const isLockedRoute = levelId > Math.min(saveDataRef.current.maxLevelReached, LEVELS.length);

      if (!isSameSelection) {
          setSelectedLevelId(levelId);
      }
      selectedLevelRef.current = levelId;
      if (focus && gameStateRef.current !== GameState.PLAYING && selectedLevelEntry) {
          const highestUnlockedLevel = Math.max(1, Math.min(saveDataRef.current.maxLevelReached, LEVELS.length));
          const levelIndex = LEVELS.findIndex((level) => level.id === levelId);
          if (levelIndex >= 0) {
              [levelIndex - 1, levelIndex, levelIndex + 1].forEach((neighborIndex) => {
                  const neighborLevel = LEVELS[neighborIndex];
                  if (!neighborLevel) return;
                  void prefetchRouteSelectSound(neighborLevel, neighborLevel.id > highestUnlockedLevel);
              });
          }
      }
      if (gameStateRef.current !== GameState.PLAYING && shouldRetargetCamera) {
          const transitionDurationMs = clamp(
              440 + focusDistance * 0.18 + zoomDistance * 1800,
              460,
              940,
          );
          const immediateCamera = clampMenuCameraTarget({
              x: lerpNumber(currentCamera.x, focusTarget.x, 0.12),
              y: lerpNumber(currentCamera.y, focusTarget.y, 0.12),
              zoom: lerpNumber(currentCamera.zoom, focusTarget.zoom, 0.1),
          });
          menuMapCameraRef.current = immediateCamera;
          menuCameraControlModeRef.current = 'auto';
          menuFocusTransitionRef.current = {
              from: { ...immediateCamera },
              to: focusTarget,
              startTime: performance.now(),
              durationMs: gameStateRef.current === GameState.STORY_MAP ? 260 : transitionDurationMs,
          };
          menuPanOffsetRef.current = { x: 0, y: 0 };
          menuPanVelocityRef.current = { x: 0, y: 0 };
          menuCameraZoomOffsetRef.current = 0;
          menuDragRef.current.active = false;
          menuDragRef.current.dragged = false;
      }
      commitSaveData((prev) => {
          if (prev.lastSelectedLevelId === levelId) return prev;
          return {
              ...prev,
              lastSelectedLevelId: levelId,
          };
      });
      if (focus && gameStateRef.current !== GameState.PLAYING && selectedLevelEntry) {
          void playRouteSelectSound(selectedLevelEntry, {
              locked: isLockedRoute,
              muted: isMutedRef.current,
          });
      }
  }, [commitSaveData]);

  const stepSelectedRoute = useCallback((direction: -1 | 1) => {
      const currentHighestUnlockedLevel = Math.max(1, Math.min(saveDataRef.current.maxLevelReached, LEVELS.length));
      const currentLevelId = selectedLevelId ?? currentHighestUnlockedLevel;
      const currentIndex = LEVELS.findIndex((level) => level.id === currentLevelId);
      if (currentIndex < 0) return;
      const nextLevel = LEVELS[currentIndex + direction];
      if (!nextLevel) return;
      handleSelectLevel(nextLevel.id, { focus: true });
  }, [handleSelectLevel, selectedLevelId]);

  const adjustMenuZoom = useCallback((delta: number) => {
      if (gameStateRef.current === GameState.PLAYING) return;
      enableManualMenuCameraControl();
      const storyBeat = INTRO_STORY_SEQUENCE.beats[storyBeatIndexRef.current] ?? INTRO_STORY_SEQUENCE.beats[0];
      const baseTarget = getMenuCameraTargetFromState(
          gameStateRef.current,
          null,
          storyBeat,
      );
      menuFocusTransitionRef.current = null;
      menuCameraZoomOffsetRef.current = clamp(menuCameraZoomOffsetRef.current + delta, -0.2, 0.18);
      menuPanOffsetRef.current = clampMenuPanOffset(menuPanOffsetRef.current);
      menuPanVelocityRef.current = { x: 0, y: 0 };
      menuMapCameraRef.current = clampMenuCameraTarget({
          x: baseTarget.x + menuPanOffsetRef.current.x,
          y: baseTarget.y + menuPanOffsetRef.current.y,
          zoom: clamp(baseTarget.zoom + menuCameraZoomOffsetRef.current, MENU_CAMERA_MIN_ZOOM, MENU_CAMERA_MAX_ZOOM),
      });
  }, [enableManualMenuCameraControl]);

  const resetMenuView = useCallback(() => {
      menuFocusTransitionRef.current = null;
      menuPanOffsetRef.current = { x: 0, y: 0 };
      menuPanVelocityRef.current = { x: 0, y: 0 };
      menuCameraZoomOffsetRef.current = 0;
      menuCameraControlModeRef.current = 'auto';
      if (gameStateRef.current === GameState.PLAYING) return;
      const currentHighestUnlockedLevel = Math.max(1, Math.min(saveDataRef.current.maxLevelReached, LEVELS.length));
      handleSelectLevel(selectedLevelId ?? currentHighestUnlockedLevel, { focus: true });
  }, [handleSelectLevel, selectedLevelId]);

  const completeStoryIntro = useCallback(() => {
      setStoryBeatIndex(0);
      setHoveredLevelId(null);
      const focusLevelId = getPreferredMenuFocusLevelId();
      handleSelectLevel(focusLevelId, { focus: true });
      menuFocusTransitionRef.current = null;
      menuPanOffsetRef.current = { x: 0, y: 0 };
      menuPanVelocityRef.current = { x: 0, y: 0 };
      menuCameraZoomOffsetRef.current = 0;
      menuCameraControlModeRef.current = 'auto';
      commitSaveData((prev) => ({
          ...prev,
          hasCompletedStoryIntro: true,
          lastSelectedLevelId: focusLevelId,
      }));
      setGameState(GameState.MENU);
  }, [commitSaveData, getPreferredMenuFocusLevelId, handleSelectLevel]);

  const openStoryMap = useCallback(() => {
      setIsProgressDrawerOpen(false);
      setShowSettings(false);
      setStoryBeatIndex(0);
      setHoveredLevelId(null);
      const focusLevelId = getPreferredMenuFocusLevelId();
      setSelectedLevelId(focusLevelId);
      selectedLevelRef.current = focusLevelId;
      menuFocusTransitionRef.current = null;
      menuPanOffsetRef.current = { x: 0, y: 0 };
      menuPanVelocityRef.current = { x: 0, y: 0 };
      menuCameraZoomOffsetRef.current = 0;
      menuCameraControlModeRef.current = 'auto';
      setGameState(GameState.STORY_MAP);
  }, [getPreferredMenuFocusLevelId]);

  const returnToMainMenu = useCallback(() => {
      setIsProgressDrawerOpen(false);
      setIsPaused(false);
      setShowSettings(false);
      setRunAchievementUnlocks([]);
      setIncomingRouteChallenge(null);
      setGameState(GameState.MENU);
      menuDragRef.current.active = false;
      menuDragRef.current.dragged = false;
      menuPanVelocityRef.current = { x: 0, y: 0 };
      menuFocusTransitionRef.current = null;
      menuCameraControlModeRef.current = 'auto';
      handleSelectLevel(getPreferredMenuFocusLevelId(), { focus: true });
  }, [getPreferredMenuFocusLevelId, handleSelectLevel]);

  const openLeaderboardScreen = useCallback(() => {
      setIsProgressDrawerOpen(false);
      setGameState(GameState.LEADERBOARD);
      setIsPaused(false);
      setShowSettings(false);
      menuDragRef.current.active = false;
      menuDragRef.current.dragged = false;
      menuPanVelocityRef.current = { x: 0, y: 0 };
      menuFocusTransitionRef.current = null;
      menuCameraControlModeRef.current = 'auto';
      const focusLevelId = getPreferredMenuFocusLevelId();
      if (focusLevelId) {
          handleSelectLevel(focusLevelId, { focus: true });
      }
  }, [getPreferredMenuFocusLevelId, handleSelectLevel]);

  useEffect(() => {
      if (!pendingSharedLeaderboardOpen || !isSaveHydrated) return;

      if (saveDataRef.current.hasCompletedStoryIntro) {
          openLeaderboardScreen();
      }

      setPendingSharedLeaderboardOpen(false);
  }, [isSaveHydrated, openLeaderboardScreen, pendingSharedLeaderboardOpen]);

  const clearRecommendationTrace = useCallback(() => {
      setRecommendationTrace((current) => {
          if (!current) return null;

          const now = Date.now();
          updateRecommendationMetrics((previous) => ({
              ...previous,
              skips: previous.skips + 1,
              skipDelayTotalMs: previous.skipDelayTotalMs + (now - current.offeredAt),
              skipDelaySamples: previous.skipDelaySamples + 1,
          }));
          return null;
      });
  }, [updateRecommendationMetrics]);

  const markRecommendationOffer = useCallback((itemId: string, levelId: number, levelName: string) => {
      const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
      if (!item) return;

      setRecommendationTrace((current) => {
          const now = Date.now();

          if (current) {
              updateRecommendationMetrics((previous) => ({
                  ...previous,
                  offers: previous.offers + 1,
                  skips: previous.skips + 1,
                  skipDelayTotalMs: previous.skipDelayTotalMs + (now - current.offeredAt),
                  skipDelaySamples: previous.skipDelaySamples + 1,
              }));
          } else {
              updateRecommendationMetrics((previous) => ({ ...previous, offers: previous.offers + 1 }));
          }
          return {
              itemId,
              itemName: item.name,
              levelId,
              levelName,
              offeredAt: now,
              openedAt: null,
          };
      });
  }, [updateRecommendationMetrics]);

  const markRecommendationOpened = useCallback((itemId: string) => {
      const now = Date.now();

      setRecommendationTrace((current) => {
          if (!current || current.itemId !== itemId || current.openedAt) return current;
          updateRecommendationMetrics((previous) => ({
              ...previous,
              opens: previous.opens + 1,
              openDelayTotalMs: previous.openDelayTotalMs + (now - current.offeredAt),
              openDelaySamples: previous.openDelaySamples + 1,
          }));
          return { ...current, openedAt: now };
      });
  }, [updateRecommendationMetrics]);

  const markRecommendationPurchase = useCallback((itemId: string) => {
      const now = Date.now();
      setRecommendationTrace((current) => {
          if (!current || current.itemId !== itemId) return current;
          if (current.openedAt) {
              const openToBuyMs = now - current.openedAt;
              updateRecommendationMetrics((previous) => ({
                  ...previous,
                  purchases: previous.purchases + 1,
                  openToBuyTotalMs: previous.openToBuyTotalMs + openToBuyMs,
                  openToBuySamples: previous.openToBuySamples + 1,
              }));
          } else {
              updateRecommendationMetrics((previous) => ({
                  ...previous,
                  purchases: previous.purchases + 1,
              }));
          }
          return null;
      });
  }, [updateRecommendationMetrics]);

  const appendRecommendationRunHistory = useCallback(
      (runId: number, metrics: RecommendationMetrics, outcome: 'win' | 'fail' | null) => {
      setRecommendationRunHistory((previous) => {
          const sample = createRecommendationTrendSample(runId, metrics, outcome);
          return [...previous, sample].slice(-RECOMMENDATION_TREND_HISTORY_SIZE);
      });
  }, []);

  const openShopScreen = useCallback((targetItemId: string | null = null) => {
      setIsProgressDrawerOpen(false);
      if (targetItemId) {
          markRecommendationOpened(targetItemId);
      }
      const targetItem = targetItemId ? SHOP_ITEMS.find((item) => item.id === targetItemId) ?? null : null;
      setActiveTab(targetItem?.type === 'ROPE' ? 'ROPES' : targetItem?.type === 'SKIN' ? 'SKINS' : 'UPGRADES');
      setRecommendedShopItemId(targetItemId);
      setGameState(GameState.SHOP);
  }, [markRecommendationOpened]);

  const openShopForBuildEntry = useCallback((entryKey: string) => {
      const targetItem = SHOP_ITEMS.find((item) => item.upgradeKey === entryKey) ?? null;
      openShopScreen(targetItem?.id ?? null);
  }, [openShopScreen]);

  const grantTestWallet = useCallback(() => {
      commitSaveData((prev) => ({
          ...prev,
          totalTokens: Math.max(prev.totalTokens, 5000),
      }));
      setSaveRecoveryNotice('Test wallet topped up to 5000 tokens.');
  }, [commitSaveData]);

  const handleLandingPlay = useCallback(() => {
      if (saveDataRef.current.hasCompletedStoryIntro) {
          setStoryBeatIndex(0);
          setHoveredLevelId(null);
          handleSelectLevel(getPreferredMenuFocusLevelId(), { focus: true });
          setGameState(GameState.MENU);
          return;
      }
      openStoryMap();
  }, [getPreferredMenuFocusLevelId, handleSelectLevel, openStoryMap]);

  const handleStoryNext = useCallback(() => {
      if (storyBeatIndexRef.current >= INTRO_STORY_SEQUENCE.beats.length - 1) {
          completeStoryIntro();
          return;
      }
      setStoryBeatIndex((current) => current + 1);
  }, [completeStoryIntro]);

  const handleStoryPrevious = useCallback(() => {
      setStoryBeatIndex((current) => Math.max(0, current - 1));
  }, []);

  const handleStorySkip = useCallback(() => {
      completeStoryIntro();
  }, [completeStoryIntro]);

  const exportSaveBackup = useCallback(() => {
      if (typeof window === 'undefined') return;
      const backup: SaveBackupV1 = createSaveBackup(saveDataRef.current);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `infinite-swinger-save-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setSaveRecoveryNotice(null);
  }, []);

  const buildRunboardSharePackage = useCallback((aliasOverride?: string) => {
      if (typeof window === 'undefined') return null;

      const topRuns = selectBestRunPerLevel(saveDataRef.current.runHistory, LEADERBOARD_SHARE_LIMIT);

      if (topRuns.length === 0) return null;

      const alias = normalizeLeaderboardAliasInput(aliasOverride ?? leaderboardAlias);
      const payload = createCommunitySharePayload(topRuns, alias);
      const boardCode = encodeLeaderboardPayload(payload);
      const boardUrl = `${window.location.origin}${window.location.pathname}?${LEADERBOARD_SHARE_QUERY_KEY}=${boardCode}`;
      const lines = topRuns.map((entry, index) => {
          const outcome = entry.isWin ? 'WIN' : 'TRY';
          return `${String(index + 1).padStart(2, '0')}. ${outcome} L${entry.levelId} ${entry.levelName} · ${entry.score} pts · ${entry.tokens} tk · ${entry.livesLeft}L · ${formatDurationMs(entry.elapsedMs)}`;
      });

      return {
          alias,
          boardCode,
          boardUrl,
          topRuns,
          shareText: [
              `Infinite Swinger Runboard • ${alias}`,
              `Shared by ${alias} at ${new Date().toLocaleString()}`,
              `Best level reached: L${saveDataRef.current.maxLevelReached}`,
              '',
              `Open this board: ${boardUrl}`,
              '',
              ...lines,
          ].join('\n'),
      };
  }, [leaderboardAlias]);

  const buildRunboardCsv = useCallback((aliasOverride?: string) => {
      const sharePackage = buildRunboardSharePackage(aliasOverride);
      if (!sharePackage) return null;

      return serializeBoardRowsToDelimitedText(
          sharePackage.topRuns,
          () => sharePackage.alias,
      );
  }, [buildRunboardSharePackage]);

  const buildRouteChallengeSharePackage = useCallback((routeLevelId: number, aliasOverride?: string) => {
      const sharePackage = buildRunboardSharePackage(aliasOverride);
      if (!sharePackage || typeof window === 'undefined') return null;

      const level = LEVELS.find((entry) => entry.id === routeLevelId);
      if (!level) return null;

      const routeBest =
          selectBestRunPerLevel(saveDataRef.current.runHistory, LEADERBOARD_SHARE_LIMIT)
              .find((entry) => entry.levelId === routeLevelId) ?? null;
      const routeUrl = new URL(sharePackage.boardUrl);
      routeUrl.searchParams.set(LEADERBOARD_ROUTE_QUERY_KEY, String(routeLevelId));
      routeUrl.searchParams.set(LEADERBOARD_VIEW_QUERY_KEY, LEADERBOARD_VIEW_LEADERBOARD);

      const routeShareText = [
          `Infinite Swinger Route Challenge • ${sharePackage.alias}`,
          `Route: L${level.id} ${level.name}`,
          routeBest
              ? `Benchmark: ${routeBest.score} pts · ${routeBest.tokens} tk · ${routeBest.livesLeft}L · ${formatDurationMs(routeBest.elapsedMs)}`
              : `Focus route only. This board still carries ${sharePackage.topRuns.length} total shared runs.`,
          '',
          `Open challenge: ${routeUrl.toString()}`,
          `Full crew board: ${sharePackage.boardUrl}`,
      ].join('\n');

      return {
          ...sharePackage,
          boardUrl: routeUrl.toString(),
          routeLevelId,
          routeName: level.name,
          routeBest,
          shareText: routeShareText,
      };
  }, [buildRunboardSharePackage]);

  const copyTextWithFallback = useCallback(async (
      text: string,
      filenamePrefix: string,
      successNotice: string,
      options?: {
          mimeType?: string;
          extension?: string;
          fallbackNotice?: string;
      },
  ) => {
      if (typeof window === 'undefined') return false;

      try {
          if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(text);
              setSaveRecoveryNotice(successNotice);
              return true;
          }
      } catch (error) {
          console.warn('Clipboard write failed, using download fallback.', error);
      }

      const blob = new Blob([text], { type: options?.mimeType ?? 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${filenamePrefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.${options?.extension ?? 'txt'}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setSaveRecoveryNotice(options?.fallbackNotice ?? 'Clipboard unavailable; export downloaded instead.');
      return false;
  }, []);

  const shareRunboard = useCallback(async () => {
      const sharePackage = buildRunboardSharePackage();
      if (!sharePackage) {
          setSaveRecoveryNotice('No runs yet. Finish a route to build a shareable runboard.');
          return;
      }
      const { alias, boardUrl, shareText } = sharePackage;

      const sharePayload = {
          title: `Infinite Swinger Runboard • ${alias}`,
          text: shareText,
          url: boardUrl,
      };

      try {
          if (typeof navigator.share === 'function') {
              await navigator.share(sharePayload);
              setSaveRecoveryNotice('Runboard shared.');
              return;
          }
      } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.warn('Navigator share failed, using clipboard fallback.', error);
      }

      await copyTextWithFallback(shareText, 'infinite-swinger-runboard', 'Runboard copied to clipboard.');
  }, [buildRunboardSharePackage, copyTextWithFallback, setSaveRecoveryNotice]);

  const shareRouteChallenge = useCallback(async (routeLevelId: number) => {
      const sharePackage = buildRouteChallengeSharePackage(routeLevelId);
      if (!sharePackage) {
          setSaveRecoveryNotice('No shareable runboard yet. Finish a route first to throw a challenge.');
          return;
      }

      const sharePayload = {
          title: `Infinite Swinger Route Challenge • L${sharePackage.routeLevelId} ${sharePackage.routeName}`,
          text: sharePackage.shareText,
          url: sharePackage.boardUrl,
      };

      try {
          if (typeof navigator.share === 'function') {
              await navigator.share(sharePayload);
              setSaveRecoveryNotice(`Challenge link shared for L${sharePackage.routeLevelId} ${sharePackage.routeName}.`);
              return;
          }
      } catch (error) {
          console.warn('Navigator share failed for route challenge, using clipboard fallback.', error);
      }

      await copyTextWithFallback(
          sharePackage.shareText,
          `infinite-swinger-route-challenge-l${sharePackage.routeLevelId}`,
          `Route challenge copied for L${sharePackage.routeLevelId} ${sharePackage.routeName}.`,
      );
  }, [buildRouteChallengeSharePackage, copyTextWithFallback, setSaveRecoveryNotice]);

  const copyRunboardShareUrl = useCallback(async () => {
      const sharePackage = buildRunboardSharePackage();
      if (!sharePackage) {
          setSaveRecoveryNotice('No runs yet. Finish a route to build a shareable runboard.');
          return;
      }

      await copyTextWithFallback(sharePackage.boardUrl, 'infinite-swinger-runboard-link', 'Runboard link copied.');
  }, [buildRunboardSharePackage, copyTextWithFallback]);

  const copyRunboardShareCode = useCallback(async () => {
      const sharePackage = buildRunboardSharePackage();
      if (!sharePackage) {
          setSaveRecoveryNotice('No runs yet. Finish a route to build a shareable runboard.');
          return;
      }

      await copyTextWithFallback(sharePackage.boardCode, 'infinite-swinger-runboard-code', 'Runboard code copied.');
  }, [buildRunboardSharePackage, copyTextWithFallback]);

  const copyRunboardCsv = useCallback(async () => {
      const csv = buildRunboardCsv();
      if (!csv) {
          setSaveRecoveryNotice('No runs yet. Finish a route to build a Sheets-ready runboard.');
          return;
      }

      await copyTextWithFallback(
          csv,
          'infinite-swinger-runboard-sheet',
          'Runboard CSV copied for Sheets.',
          {
              mimeType: 'text/csv;charset=utf-8',
              extension: 'csv',
              fallbackNotice: 'Clipboard unavailable; runboard CSV downloaded instead.',
          },
      );
  }, [buildRunboardCsv, copyTextWithFallback]);

  const copyRouteChallengeText = useCallback(async (routeLevelId: number) => {
      const sharePackage = buildRouteChallengeSharePackage(routeLevelId);
      if (!sharePackage) {
          setSaveRecoveryNotice('No shareable runboard yet. Finish a route first to copy a route challenge.');
          return;
      }

      await copyTextWithFallback(
          sharePackage.shareText,
          `infinite-swinger-route-challenge-l${sharePackage.routeLevelId}-copy`,
          `Route challenge text copied for L${sharePackage.routeLevelId} ${sharePackage.routeName}.`,
      );
  }, [buildRouteChallengeSharePackage, copyTextWithFallback, setSaveRecoveryNotice]);

  const importRunboardFromText = useCallback(async (rawInput?: string) => {
      const raw = readStringValue(rawInput, '');
      const parsedInput = parseLeaderboardShareInput(raw);
      const extractedCode = parsedInput.boardToken;

      if (!extractedCode) {
          setSaveRecoveryNotice('Paste a leaderboard code, share URL, public Google Sheet, or CSV/TSV board to import.');
          return;
      }

      const incomingPayload = decodeLeaderboardPayload(extractedCode);
      if (!incomingPayload || incomingPayload.entries.length === 0) {
          const importedDelimitedRows = parseDelimitedBoardEntries(raw);
          if (importedDelimitedRows.length === 0) {
              const remoteImport = await fetchRemoteBoardImport(raw);
              if (remoteImport.kind === 'error') {
                  setSaveRecoveryNotice(remoteImport.message);
                  return;
              }

          if (remoteImport.kind === 'unsupported') {
              setSaveRecoveryNotice('That input could not be decoded as a runboard, public Google Sheet, or CSV/TSV import.');
              return;
          }

          const importedAliasSummary = summarizeImportedBoardRows(remoteImport.rows);
          setLeaderboardRemoteSource(remoteImport.sourceUrl);
          setLeaderboardRemoteSyncAt(Date.now());
          setCommunityBoardEntries((previous) => mergeCommunityBoardRows(previous, remoteImport.rows));
          setSaveRecoveryNotice(
                  `Imported ${remoteImport.rows.length} runs from ${importedAliasSummary} via ${remoteImport.sourceLabel}. Rival source saved for quick sync.`,
              );
              return;
          }

          const importedAliasSummary = summarizeImportedBoardRows(importedDelimitedRows);
          setLeaderboardRemoteSource('');
          setLeaderboardRemoteSyncAt(null);
          setCommunityBoardEntries((previous) => mergeCommunityBoardRows(previous, importedDelimitedRows));
          setSaveRecoveryNotice(`Imported ${importedDelimitedRows.length} runs from ${importedAliasSummary} via CSV/TSV.`);
          return;
      }

      setLeaderboardRemoteSource('');
      setLeaderboardRemoteSyncAt(null);

      const incomingRows: LeaderboardBoardEntry[] = hydrateCommunityBoard(incomingPayload);
      setCommunityBoardEntries((previous) => mergeCommunityBoardRows(previous, incomingRows));
      if (parsedInput.routeLevelId !== null) {
          const routeLevel = LEVELS.find((entry) => entry.id === parsedInput.routeLevelId) ?? null;
          handleSelectLevel(parsedInput.routeLevelId, { focus: true });
          setIncomingRouteChallenge({
              levelId: parsedInput.routeLevelId,
              challengerAlias: incomingPayload.alias,
          });
          setSaveRecoveryNotice(
              `Imported ${incomingRows.length} runs from ${incomingPayload.alias} and focused ${routeLevel ? `L${routeLevel.id} ${routeLevel.name}` : `L${parsedInput.routeLevelId}`}.`,
          );
      } else {
          setIncomingRouteChallenge(null);
          setSaveRecoveryNotice(`Imported ${incomingRows.length} runs from ${incomingPayload.alias}.`);
      }

      if (parsedInput.openLeaderboard) {
          openLeaderboardScreen();
      }
  }, [handleSelectLevel, openLeaderboardScreen, setSaveRecoveryNotice]);

  const importRunboardFromClipboard = useCallback(async () => {
      if (typeof navigator === 'undefined' || typeof navigator.clipboard?.readText !== 'function') {
          setSaveRecoveryNotice('Clipboard paste is unavailable here. Paste a runboard link or code manually.');
          return;
      }

      try {
          const clipboardText = await navigator.clipboard.readText();
          if (!clipboardText.trim()) {
              setSaveRecoveryNotice('Clipboard is empty. Copy a runboard link or code first.');
              return;
          }

          await importRunboardFromText(clipboardText);
      } catch (error) {
          console.warn('Failed to read clipboard for runboard import', error);
          setSaveRecoveryNotice('Clipboard access was blocked. Paste a runboard link or code manually.');
      }
  }, [importRunboardFromText, setSaveRecoveryNotice]);

  const clearCommunityRunboard = useCallback(() => {
      setCommunityBoardEntries([]);
      setSaveRecoveryNotice('Imported community runs cleared.');
  }, []);

  const refreshCommunityBoardFromRemoteSource = useCallback(
      async (showNotice = false) => {
          const trimmedSource = readStringValue(leaderboardRemoteSource, '').trim();
          if (!trimmedSource) {
              if (showNotice) {
                  setSaveRecoveryNotice(
                      'No pinned rivalry source yet. Import a public Google Sheet or CSV board once to lock a live rivalry feed.',
                  );
              }

              return;
          }

          const remoteImport = await fetchRemoteBoardImport(trimmedSource);
          if (remoteImport.kind === 'error') {
              if (showNotice) {
                  setSaveRecoveryNotice(remoteImport.message);
              }
              return;
          }

          if (remoteImport.kind === 'unsupported') {
              if (showNotice) {
                  setSaveRecoveryNotice('Saved rivalry source is not valid for direct import. Paste it again from the leaderboard screen.');
              }
              return;
          }

          setLeaderboardRemoteSyncAt(Date.now());
          setCommunityBoardEntries((previous) => mergeCommunityBoardRows(previous, remoteImport.rows));

          if (showNotice) {
              setSaveRecoveryNotice(
                  `Rival board refreshed from ${remoteImport.sourceLabel}: ${remoteImport.rows.length} runs merged.`,
              );
          }
      },
      [leaderboardRemoteSource, setSaveRecoveryNotice],
  );

  useEffect(() => {
      if (!isSaveHydrated) return;
      if (!leaderboardRemoteSource) return;
      if (typeof window === 'undefined') return;

      void refreshCommunityBoardFromRemoteSource();

      const timerId = window.setInterval(() => {
          if (document.visibilityState === 'hidden') return;
          void refreshCommunityBoardFromRemoteSource();
      }, LEADERBOARD_REMOTE_SYNC_INTERVAL_MS);

      return () => window.clearInterval(timerId);
  }, [isSaveHydrated, leaderboardRemoteSource, refreshCommunityBoardFromRemoteSource]);

  const importSaveBackup = useCallback(async (file: File) => {
      try {
          const raw = await file.text();
          const imported = parseSaveBackup(raw, DEFAULT_SAVE);
          await clearPersistedSaveData();
          const normalized = withDerivedProgression(imported);
          setSaveData(normalized);
          setRuntimeSettings(resolveSwingLabConfig(normalized));
          setSelectedLevelId(normalized.hasCompletedStoryIntro ? null : normalized.lastSelectedLevelId);
          setGameState(normalized.hasCompletedStoryIntro ? GameState.MENU : GameState.LANDING);
          setSaveRecoveryNotice('Backup imported successfully.');
      } catch (error) {
          console.warn('Failed to import save backup', error);
          setSaveRecoveryNotice('That backup could not be read. Export a fresh save or reset progress from Settings > Data.');
      }
  }, []);

  useEffect(() => {
      if (gameState !== GameState.STORY_MAP) return;
      const beat = INTRO_STORY_SEQUENCE.beats[storyBeatIndex] ?? INTRO_STORY_SEQUENCE.beats[0];
      const keyframe = beat.cameraKeyframe ?? beat.cameraTarget;
      if (!keyframe) return;
      storyCameraTransitionRef.current = {
          from: { ...menuMapCameraRef.current },
          to: {
              x: keyframe.x,
              y: keyframe.y,
              zoom: keyframe.zoom ?? 1,
          },
          startTime: performance.now(),
          durationMs: Math.max(500, Math.min(1800, beat.cameraKeyframe?.lingerMs ?? 980)),
          easing: beat.cameraKeyframe?.easing ?? 'easeInOut',
      };
  }, [gameState, storyBeatIndex]);

  const applySwingLabSettings = useCallback((preset: PlayerMoodPreset, config: SwingLabConfig) => {
      setRuntimeSettings(config);
      commitSaveData((prev) => ({
          ...prev,
          selectedMoodPreset: preset,
          customSwingLabConfig: preset === 'Custom' ? config : null,
      }));
  }, [commitSaveData]);

  // --- REFS FOR GAME LOOP ---
  const gameShellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const fixedStepAccumulatorRef = useRef(0);
  const manualStepHoldUntilRef = useRef(0);
  const hudSyncTimerRef = useRef(0);
  const worldTimeRef = useRef(0);
  const focusTimerRef = useRef(0);
  const focusCooldownRef = useRef(0);
  const checkpointBannerTimerRef = useRef(0);
  const musicSessionCounterRef = useRef(0);
  const atlasPerformanceRef = useRef<{ avgFrameMs: number; quality: AtlasQuality }>({ avgFrameMs: 16.7, quality: 'high' });
  const currentMusicProfileRef = useRef<MusicProfile>(buildSessionMusicProfile('JUNGLE', 1, 0));
  const skyColorRef = useRef<[string, string]>(["#0F2027", "#203A43"]);
  const routeLinkRef = useRef<Vector2 | null>(null);
  const checkpointRef = useRef<CheckpointState>(createInitialCheckpointState());
  
  const bgLayers = useRef<{x: number, y: number, size: number, type: number, color: string, speed: number, shapeVar?: number}[]>([]);
  const mapElements = useRef<{x: number, y: number, type: 'cloud' | 'tree' | 'wave' | 'rock', speed: number}[]>([]); 
  const mapPropsRef = useRef<{x: number, y: number, type: 'tree' | 'rock' | 'mountain' | 'pine' | 'wave' | 'cave', scale: number}[]>([]); 
  const menuMapCameraRef = useRef({ ...DEFAULT_MENU_MAP_CAMERA });
  const menuBackdropCacheRef = useRef<{ canvas: HTMLCanvasElement | null; key: string }>({ canvas: null, key: '' });
  const menuPanOffsetRef = useRef({ x: 0, y: 0 });
  const menuPanVelocityRef = useRef({ x: 0, y: 0 });
  const menuCameraZoomOffsetRef = useRef(0);
  const menuCameraControlModeRef = useRef<'auto' | 'manual'>('auto');
  const menuFocusTransitionRef = useRef<{
      from: { x: number; y: number; zoom: number };
      to: { x: number; y: number; zoom: number };
      startTime: number;
      durationMs: number;
  } | null>(null);
  const menuDragRef = useRef({
      active: false,
      dragged: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      pointerId: -1,
  });
  const storyCameraTransitionRef = useRef({
      from: { ...DEFAULT_MENU_MAP_CAMERA },
      to: { ...DEFAULT_MENU_MAP_CAMERA },
      startTime: 0,
      durationMs: 900,
      easing: 'easeInOut' as const,
  });
  const launchIntroRef = useRef<LaunchIntroState | null>(null);

  const monkey = useRef({
    position: { x: 200, y: 300 },
    velocity: { x: 5, y: 0 },
    width: 30,
    height: 30,
    rotation: 0,
    isSwinging: false,
    tetherPoint: null as Vector2 | null,
    ropeLength: 0,
    ropeTargetLength: 0,
    ropeReelVelocity: 0,
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
    causeOfDeath: '',
    grounded: false,
    coyoteTimer: 0,
    platformDropTimer: 0,
    controlLean: 0,
    grappleCooldown: 0,
    retargetGraceTimer: 0,
    releaseAimDirection: 1,
    releaseTetherPoint: null as Vector2 | null,
    releaseTetherLength: 0,
    releaseTetherTimer: 0,
    releaseTetherMaxTimer: 0,
    jumpCharges: JUMP_MAX_CHARGES,
    jumpRechargeTimer: 0,
    ropeBreakTimer: 0,
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
  const smartTargetRef = useRef<GrappleTarget | null>(null);
  
  const inputRef = useRef({ 
      isMouseDown: false, 
      mouseGrappleHeld: false,
      keyboardGrappleHeld: false,
      grappleHeld: false,
      mousePos: { x: 0, y: 0 }, 
      justPressed: false,
      wheelDelta: 0,
      keys: { left: false, right: false, up: false, down: false },
      keyHold: { left: 0, right: 0, up: 0, down: 0 },
  });
  const syncGrappleHoldState = () => {
      inputRef.current.grappleHeld = inputRef.current.mouseGrappleHeld || inputRef.current.keyboardGrappleHeld;
  };
  
  const saveDataRef = useRef(saveData);
  useEffect(() => { saveDataRef.current = saveData; }, [saveData]);
  const runtimeSettingsRef = useRef(runtimeSettings);
  useEffect(() => { runtimeSettingsRef.current = runtimeSettings; }, [runtimeSettings]);
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  const currentBiomeRef = useRef(currentBiome);
  useEffect(() => { currentBiomeRef.current = currentBiome; }, [currentBiome]);
  const tutorialRef = useRef(tutorial);
  useEffect(() => { tutorialRef.current = tutorial; }, [tutorial]);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playerLivesRef = useRef(playerLives);
  useEffect(() => { playerLivesRef.current = playerLives; }, [playerLives]);

  useEffect(() => {
      return () => {
          audioManager.dispose();
      };
  }, []);

  useEffect(() => {
      if (!import.meta.env.DEV || typeof window === 'undefined') return;
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('debugSwingLab') !== '1') return;

      let disposed = false;
      let paneInstance: { dispose: () => void } | null = null;
      const paneHost = document.createElement('div');
      paneHost.style.position = 'fixed';
      paneHost.style.top = '16px';
      paneHost.style.right = '16px';
      paneHost.style.zIndex = '120';
      paneHost.style.pointerEvents = 'auto';
      document.body.appendChild(paneHost);

      const paneState = { ...runtimeSettingsRef.current };

      import('tweakpane').then((mod) => {
          if (disposed) return;

          const pane: any = new mod.Pane({
              title: 'Swing Lab',
              container: paneHost,
              expanded: false,
          });

          pane.addBinding(paneState, 'gravity', { min: 0.4, max: 1.2, step: 0.01 });
          pane.addBinding(paneState, 'airResistance', { min: 0.96, max: 1, step: 0.0001 });
          pane.addBinding(paneState, 'swingAirResistance', { min: 0.97, max: 1, step: 0.0001 });
          pane.addBinding(paneState, 'swingMomentumRetention', { min: 0.95, max: 1.02, step: 0.0001 });
          pane.addBinding(paneState, 'groundFriction', { min: 0.7, max: 0.98, step: 0.01 });
          pane.addBinding(paneState, 'maxSpeed', { min: 20, max: 80, step: 1 });
          pane.addBinding(paneState, 'ropeReelSpring', { min: 0.02, max: 0.4, step: 0.01 });
          pane.addBinding(paneState, 'ropeReelDamping', { min: 0.6, max: 0.99, step: 0.01 });
          pane.addBinding(paneState, 'ropeReelMaxSpeed', { min: 1, max: 12, step: 0.1 });
          pane.addBinding(paneState, 'musicVolume', { min: 0, max: 0.35, step: 0.01 });

          pane.on('change', () => {
              setRuntimeSettings({ ...paneState });
          });

          paneInstance = pane;
      });

      return () => {
          disposed = true;
          paneInstance?.dispose();
          paneHost.remove();
      };
  }, []);

  const scoreRef = useRef(0);
  const distanceRef = useRef(0);
  const runTokensRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { distanceRef.current = distance; }, [distance]);
  useEffect(() => { runTokensRef.current = runTokens; }, [runTokens]);
  
  const weatherRef = useRef<{type: WeatherType, timer: number}>({ type: 'CLEAR', timer: 0 });
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  const runDebriefRef = useRef<RunDebrief>(createInitialRunDebrief());
  const selectedLevelRef = useRef<number>(1);
  useEffect(() => {
      if (selectedLevelId !== null) selectedLevelRef.current = selectedLevelId;
  }, [selectedLevelId]);
  const storyBeatIndexRef = useRef(storyBeatIndex);
  useEffect(() => { storyBeatIndexRef.current = storyBeatIndex; }, [storyBeatIndex]);
  const hoveredLevelRef = useRef<number | null>(hoveredLevelId);
  useEffect(() => { hoveredLevelRef.current = hoveredLevelId; }, [hoveredLevelId]);
  const monkeySpriteRef = useRef<HTMLImageElement | null>(null);
  const monkeySpriteReadyRef = useRef(false);
  const debugFlagsRef = useRef<DebugFlags>(DEFAULT_DEBUG_FLAGS);

  useEffect(() => {
      const spriteSrc = getBundledMonkeySprite();
      if (!spriteSrc) {
          monkeySpriteRef.current = null;
          monkeySpriteReadyRef.current = false;
          return;
      }
      const sprite = new Image();
      sprite.src = spriteSrc;
      sprite.onload = () => {
          monkeySpriteRef.current = sprite;
          monkeySpriteReadyRef.current = true;
      };
      sprite.onerror = () => {
          monkeySpriteRef.current = null;
          monkeySpriteReadyRef.current = false;
      };
  }, []);

  // Generate Background
  const generateBackground = useCallback(() => {
      const biome = currentBiome;
      const themeProfile = THEME_PROFILES[biome];
      const isJungle = biome === 'JUNGLE';
      const isSwamp = biome === 'SWAMP';
      const isVolcano = biome === 'VOLCANO';
      const isCave = biome === 'CAVE';
      bgLayers.current = [];
      for(let i=0; i<26; i++) {
          bgLayers.current.push({ x: Math.random() * 2200, y: CANVAS_HEIGHT + randomRange(-20, 40), size: randomRange(2.0, 3.8), type: 0, color: isCave ? '#101114' : isVolcano ? '#2f1714' : isSwamp ? '#093f39' : '#0b5a4c', speed: 0.045 * themeProfile.backgroundDensity, shapeVar: Math.random() });
      }
      for(let i=0; i<52; i++) { 
          bgLayers.current.push({ x: Math.random() * 2200, y: CANVAS_HEIGHT + randomRange(0, 120), size: randomRange(1.4, 4.2), type: 3, color: isCave ? '#1f1f24' : isVolcano ? '#2a1713' : isSwamp ? '#042d2a' : '#033e36', speed: 0.08, shapeVar: Math.random() });
      }
      for(let i=0; i<38; i++) {
          bgLayers.current.push({ x: Math.random() * 2200, y: CANVAS_HEIGHT + 40, size: randomRange(1.0, 1.8), type: 0, color: isCave ? '#2b2c30' : isVolcano ? '#4a271a' : isSwamp ? '#1f5f39' : '#2f7a23', speed: 0.15, shapeVar: 1 });
      }
      for (let i = 0; i < 14; i++) {
          bgLayers.current.push({ x: Math.random() * 2200, y: randomRange(80, CANVAS_HEIGHT - 90), size: randomRange(1.1, 2.4), type: 6, color: themeProfile.hazeColor, speed: randomRange(0.05, 0.12), shapeVar: Math.random() });
      }
      if (isJungle || isSwamp) {
          for(let i=0; i<44; i++) {
              bgLayers.current.push({ x: Math.random() * 2200, y: randomRange(-40, 140), size: randomRange(0.8, 2.1), type: 4, color: isSwamp ? `rgba(45, ${90 + Math.random()*40}, 70, ${Math.random() * 0.38 + 0.18})` : `rgba(30, ${70 + Math.random()*50}, 24, ${Math.random() * 0.42 + 0.18})`, speed: Math.random() * 0.2 + 0.16, shapeVar: Math.random() });
          }
          for (let i = 0; i < (isSwamp ? 34 : 26); i++) {
              bgLayers.current.push({ x: Math.random() * 2200, y: randomRange(90, CANVAS_HEIGHT - 120), size: randomRange(0.35, 0.95), type: 5, color: isSwamp ? 'rgba(208,255,152,0.8)' : 'rgba(171,255,221,0.72)', speed: randomRange(0.08, 0.18), shapeVar: Math.random() });
          }
      } else if (isVolcano) {
          for (let i = 0; i < 40; i++) {
              bgLayers.current.push({ x: Math.random() * 2200, y: randomRange(80, CANVAS_HEIGHT + 40), size: randomRange(0.25, 0.85), type: 5, color: Math.random() > 0.35 ? 'rgba(255,180,72,0.9)' : 'rgba(255,94,58,0.88)', speed: randomRange(0.06, 0.16), shapeVar: Math.random() });
          }
      } else if (isCave) {
          for (let i = 0; i < 24; i++) {
              bgLayers.current.push({ x: Math.random() * 2200, y: randomRange(0, 180), size: randomRange(1.1, 2.2), type: 4, color: 'rgba(48,50,56,0.45)', speed: randomRange(0.05, 0.11), shapeVar: Math.random() });
          }
      }
  }, [currentBiome]);

  // Init Lobby Map Elements
  useEffect(() => {
      mapElements.current = [];
      for(let i=0; i<5; i++) {
          mapElements.current.push({ x: Math.random() * MENU_MAP_WORLD_WIDTH, y: Math.random() * MENU_MAP_WORLD_HEIGHT, type: 'cloud', speed: randomRange(0.2, 0.5) });
      }
      mapPropsRef.current = [];
      for(let i=0; i<120; i++) {
          const x = Math.random() * MENU_MAP_WORLD_WIDTH;
          const y = Math.random() * MENU_MAP_WORLD_HEIGHT;
          const t = x / MENU_MAP_WORLD_WIDTH;
          const pathY = (MENU_MAP_WORLD_HEIGHT - 100 * MENU_MAP_WORLD_SCALE) * (1-t) + 100 * MENU_MAP_WORLD_SCALE * t; 
          if (Math.abs(y - pathY) < 80) continue; 
          let type: 'tree' | 'rock' | 'mountain' | 'pine' | 'wave' | 'cave' = 'tree';
          let scale = 0.5 + Math.random() * 0.5;
          if (x < MENU_MAP_WORLD_WIDTH * 0.35) { type = Math.random() > 0.6 ? 'tree' : 'pine'; } 
          else if (x < MENU_MAP_WORLD_WIDTH * 0.6) { type = Math.random() > 0.6 ? 'wave' : 'rock'; } 
          else if (x < MENU_MAP_WORLD_WIDTH * 0.75) { type = Math.random() > 0.6 ? 'cave' : 'rock'; } 
          else { type = Math.random() > 0.5 ? 'mountain' : 'rock'; scale *= 1.2; }
          mapPropsRef.current.push({ x, y, type, scale });
      }
      mapPropsRef.current.sort((a, b) => a.scale - b.scale);
  }, []);

  useEffect(() => { generateBackground(); }, [generateBackground]);

  const buildMenuBackdropCanvas = useCallback((quality: AtlasQuality, densityMode: VisualDensity) => {
      if (typeof document === 'undefined') return null;
      const cacheKey = `${quality}:${densityMode}:${MENU_MAP_WORLD_WIDTH.toFixed(0)}x${MENU_MAP_WORLD_HEIGHT.toFixed(0)}:${mapPropsRef.current.length}`;
      const cached = menuBackdropCacheRef.current;
      if (cached.canvas && cached.key === cacheKey) return cached.canvas;

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(MENU_MAP_WORLD_WIDTH);
      canvas.height = Math.ceil(MENU_MAP_WORLD_HEIGHT);
      const backdropCtx = canvas.getContext('2d');
      if (!backdropCtx) return null;

      const qualityFactor = quality === 'low' ? 0.74 : quality === 'medium' ? 0.88 : 1;
      const propSkip = quality === 'low' ? 2 : quality === 'medium' ? 1.4 : 1;
      const labelFont = quality === 'low'
          ? `700 ${Math.round(22 * MENU_MAP_WORLD_SCALE)}px 'Rajdhani', 'Space Grotesk', sans-serif`
          : `700 ${Math.round(24 * MENU_MAP_WORLD_SCALE)}px 'Rajdhani', 'Space Grotesk', sans-serif`;
      const smallLabelFont = quality === 'low'
          ? `700 ${Math.round(15 * MENU_MAP_WORLD_SCALE)}px 'Rajdhani', 'Space Grotesk', sans-serif`
          : `700 ${Math.round(18 * MENU_MAP_WORLD_SCALE)}px 'Rajdhani', 'Space Grotesk', sans-serif`;

      const skyGradient = backdropCtx.createLinearGradient(0, 0, 0, MENU_MAP_WORLD_HEIGHT);
      skyGradient.addColorStop(0, '#f7c57d');
      skyGradient.addColorStop(0.24, '#d98e67');
      skyGradient.addColorStop(0.54, '#4d6470');
      skyGradient.addColorStop(1, '#101a24');
      backdropCtx.fillStyle = skyGradient;
      backdropCtx.fillRect(0, 0, MENU_MAP_WORLD_WIDTH, MENU_MAP_WORLD_HEIGHT);

      const sunColumn = backdropCtx.createRadialGradient(MENU_MAP_WORLD_WIDTH * 0.36, MENU_MAP_WORLD_HEIGHT * 0.12, 22, MENU_MAP_WORLD_WIDTH * 0.36, MENU_MAP_WORLD_HEIGHT * 0.16, MENU_MAP_WORLD_WIDTH * 0.52);
      sunColumn.addColorStop(0, 'rgba(255, 245, 196, 0.24)');
      sunColumn.addColorStop(0.42, 'rgba(255, 210, 146, 0.12)');
      sunColumn.addColorStop(1, 'rgba(255, 210, 146, 0)');
      backdropCtx.fillStyle = sunColumn;
      backdropCtx.fillRect(0, 0, MENU_MAP_WORLD_WIDTH, MENU_MAP_WORLD_HEIGHT);

      backdropCtx.fillStyle = `rgba(12, 34, 27, ${0.18 + (1 - qualityFactor) * 0.08})`;
      backdropCtx.fillRect(0, MENU_MAP_WORLD_HEIGHT * 0.58, MENU_MAP_WORLD_WIDTH, MENU_MAP_WORLD_HEIGHT * 0.42);

      backdropCtx.fillStyle = `rgba(19, 40, 36, ${0.12 + (1 - qualityFactor) * 0.06})`;
      const terrainBands = quality === 'low' ? 3 : quality === 'medium' ? 4 : 5;
      for (let i = 0; i < terrainBands; i += 1) {
          const centerY = MENU_MAP_WORLD_HEIGHT * (0.18 + i * 0.15);
          const width = MENU_MAP_WORLD_WIDTH * (0.36 + i * 0.08);
          backdropCtx.beginPath();
          backdropCtx.ellipse(MENU_MAP_WORLD_WIDTH * (0.28 + i * 0.16), centerY, width, MENU_MAP_WORLD_HEIGHT * (0.06 + i * 0.012), -0.04 + i * 0.01, 0, Math.PI * 2);
          backdropCtx.fill();
      }

      backdropCtx.save();
      backdropCtx.globalAlpha = 0.26 + (1 - qualityFactor) * 0.06;
      backdropCtx.fillStyle = 'rgba(255, 230, 171, 0.18)';
      const rayCount = quality === 'low' ? 2 : quality === 'medium' ? 3 : 5;
      for (let i = 0; i < rayCount; i += 1) {
          const rayX = MENU_MAP_WORLD_WIDTH * 0.14 + i * MENU_MAP_WORLD_WIDTH * 0.13;
          backdropCtx.beginPath();
          backdropCtx.moveTo(rayX, 0);
          backdropCtx.lineTo(rayX + MENU_MAP_WORLD_WIDTH * 0.06, MENU_MAP_WORLD_HEIGHT);
          backdropCtx.lineTo(rayX - MENU_MAP_WORLD_WIDTH * 0.03, MENU_MAP_WORLD_HEIGHT);
          backdropCtx.closePath();
          backdropCtx.fill();
      }
      backdropCtx.restore();

      MAP_REGIONS.forEach((region, index) => {
          const scaledRegion = {
              ...region,
              focalPoint: scaleMenuMapPoint(region.focalPoint),
              bounds: scaleMenuMapRect(region.bounds),
          };
          backdropCtx.fillStyle = region.hazeColor;
          backdropCtx.globalAlpha = quality === 'low' ? 0.18 : 0.24;
          backdropCtx.beginPath();
          backdropCtx.ellipse(
              scaledRegion.focalPoint.x,
              scaledRegion.focalPoint.y - 90 * MENU_MAP_WORLD_SCALE,
              scaledRegion.bounds.width * (0.46 + index * 0.03),
              scaledRegion.bounds.height * 0.24,
              -0.06 + index * 0.015,
              0,
              Math.PI * 2,
          );
          backdropCtx.fill();
      });
      backdropCtx.globalAlpha = 1;

      backdropCtx.save();
      backdropCtx.strokeStyle = 'rgba(255,255,255,0.05)';
      backdropCtx.lineWidth = 2;
      const contourBands = quality === 'low' ? 3 : 5;
      for (let i = 0; i < contourBands; i += 1) {
          backdropCtx.beginPath();
          backdropCtx.moveTo(0, MENU_MAP_WORLD_HEIGHT - i * 150 * MENU_MAP_WORLD_SCALE);
          backdropCtx.bezierCurveTo(
              MENU_MAP_WORLD_WIDTH / 3,
              MENU_MAP_WORLD_HEIGHT - i * 150 * MENU_MAP_WORLD_SCALE - 100 * MENU_MAP_WORLD_SCALE,
              MENU_MAP_WORLD_WIDTH * 2 / 3,
              MENU_MAP_WORLD_HEIGHT - i * 150 * MENU_MAP_WORLD_SCALE + 100 * MENU_MAP_WORLD_SCALE,
              MENU_MAP_WORLD_WIDTH,
              MENU_MAP_WORLD_HEIGHT - i * 150 * MENU_MAP_WORLD_SCALE,
          );
          backdropCtx.stroke();
      }
      backdropCtx.restore();

      backdropCtx.save();
      backdropCtx.fillStyle = `rgba(8, 20, 18, ${0.16 + (1 - qualityFactor) * 0.1})`;
      const propLimit = quality === 'low' ? 64 : quality === 'medium' ? 92 : mapPropsRef.current.length;
      mapPropsRef.current.slice(0, propLimit).forEach((prop, propIndex) => {
          if (densityMode === 'clean' && propIndex % 2 === 1) return;
          if (quality === 'low' && propIndex % 2 === 1) return;
          if (quality === 'medium' && propIndex % 3 === 2) return;
          const { x, y, type, scale } = prop;
          const isFarProp = scale < 0.82;
          backdropCtx.save();
          backdropCtx.translate(x, y);
          backdropCtx.scale(scale, scale);
          backdropCtx.globalAlpha = isFarProp ? 0.36 : scale < 1 ? 0.62 : 0.82;
          if (type === 'tree' || type === 'pine') {
              backdropCtx.fillStyle = type === 'tree' ? '#345e34' : '#224927';
              backdropCtx.fillRect(-3, -6, 6, 22);
              if (type === 'tree') {
                  backdropCtx.fillStyle = 'rgba(12, 28, 20, 0.18)';
                  backdropCtx.beginPath();
                  backdropCtx.ellipse(3, -20, 15, 12, -0.24, 0, Math.PI * 2);
                  backdropCtx.fill();
                  backdropCtx.fillStyle = '#3d8a44';
                  backdropCtx.beginPath();
                  backdropCtx.ellipse(-5, -18, 17, 13, 0.12, 0, Math.PI * 2);
                  backdropCtx.fill();
                  backdropCtx.beginPath();
                  backdropCtx.ellipse(8, -26, 13, 10, -0.15, 0, Math.PI * 2);
                  backdropCtx.fill();
                  backdropCtx.fillStyle = '#2d6f34';
                  backdropCtx.beginPath();
                  backdropCtx.ellipse(-1, -31, 12, 9, 0, 0, Math.PI * 2);
                  backdropCtx.fill();
              } else {
                  backdropCtx.fillStyle = '#28572d';
                  backdropCtx.beginPath();
                  backdropCtx.moveTo(0, -44);
                  backdropCtx.lineTo(16, -10);
                  backdropCtx.lineTo(-16, -10);
                  backdropCtx.closePath();
                  backdropCtx.fill();
                  backdropCtx.fillStyle = '#1d4724';
                  backdropCtx.beginPath();
                  backdropCtx.moveTo(0, -30);
                  backdropCtx.lineTo(13, -2);
                  backdropCtx.lineTo(-13, -2);
                  backdropCtx.closePath();
                  backdropCtx.fill();
              }
          } else if (type === 'wave') {
              backdropCtx.strokeStyle = 'rgba(255,255,255,0.22)';
              backdropCtx.lineWidth = 3;
              backdropCtx.beginPath();
              backdropCtx.arc(-10, 0, 10, 0, Math.PI, true);
              backdropCtx.arc(10, 0, 10, 0, Math.PI, false);
              backdropCtx.stroke();
          } else if (type === 'cave') {
              backdropCtx.fillStyle = '#212121';
              backdropCtx.beginPath();
              backdropCtx.arc(0, 0, 20, Math.PI, 0);
              backdropCtx.fill();
          } else if (type === 'mountain') {
              backdropCtx.fillStyle = '#3E2723';
              backdropCtx.beginPath();
              backdropCtx.moveTo(0, -40);
              backdropCtx.lineTo(30, 20);
              backdropCtx.lineTo(-30, 20);
              backdropCtx.fill();
              backdropCtx.fillStyle = '#FF5722';
              backdropCtx.beginPath();
              backdropCtx.moveTo(0, -40);
              backdropCtx.lineTo(8, -25);
              backdropCtx.lineTo(-8, -25);
              backdropCtx.fill();
          } else if (type === 'rock') {
              backdropCtx.fillStyle = '#455A64';
              backdropCtx.beginPath();
              backdropCtx.arc(0, 0, 15, 0, Math.PI, true);
              backdropCtx.fill();
          }
          backdropCtx.restore();
      });
      backdropCtx.restore();

      const drawLabel = (txt: string, x: number, y: number, r: number, color: string = 'rgba(255,255,255,0.16)', scale = 1) => {
          backdropCtx.save();
          backdropCtx.fillStyle = color;
          backdropCtx.textAlign = 'center';
          backdropCtx.translate(x, y);
          backdropCtx.rotate(r);
          backdropCtx.font = `600 ${Math.round(40 * scale)}px 'Rajdhani', 'Space Grotesk', sans-serif`;
          backdropCtx.shadowColor = 'rgba(0, 0, 0, 0.28)';
          backdropCtx.shadowBlur = quality === 'low' ? 0 : 8;
          backdropCtx.fillText(txt, 0, 0);
          backdropCtx.restore();
      };

      drawLabel('ELVEN KINGDOM', MENU_MAP_WORLD_WIDTH * 0.2, MENU_MAP_WORLD_HEIGHT * 0.8, -0.08, 'rgba(255,255,255,0.14)', 1);
      drawLabel('GREAT LAKE', MENU_MAP_WORLD_WIDTH * 0.5, MENU_MAP_WORLD_HEIGHT * 0.6, 0.06, 'rgba(255,255,255,0.14)', 0.92);
      drawLabel('TROLL VALLEY', MENU_MAP_WORLD_WIDTH * 0.65, MENU_MAP_WORLD_HEIGHT * 0.4, -0.12, 'rgba(255,255,255,0.14)', 0.92);
      drawLabel('MT. DOOM', MENU_MAP_WORLD_WIDTH * 0.85, MENU_MAP_WORLD_HEIGHT * 0.25, 0.08, 'rgba(255,255,255,0.14)', 0.92);

      MAP_REGIONS.forEach((region) => {
          const scaledRegion = {
              ...region,
              focalPoint: scaleMenuMapPoint(region.focalPoint),
              bounds: scaleMenuMapRect(region.bounds),
          };
          backdropCtx.save();
          backdropCtx.globalAlpha = 0.88;
          backdropCtx.fillStyle = region.accentColor;
          backdropCtx.textAlign = 'center';
          backdropCtx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          backdropCtx.shadowBlur = quality === 'low' ? 0 : 6;
          backdropCtx.font = quality === 'low'
              ? `700 ${Math.round(19 * MENU_MAP_WORLD_SCALE)}px 'Rajdhani', 'Space Grotesk', sans-serif`
              : `700 ${Math.round(22 * MENU_MAP_WORLD_SCALE)}px 'Rajdhani', 'Space Grotesk', sans-serif`;
          backdropCtx.fillText(region.label.toUpperCase(), scaledRegion.focalPoint.x, scaledRegion.bounds.y + 28 * MENU_MAP_WORLD_SCALE);
          backdropCtx.restore();
      });

      const sideFade = backdropCtx.createLinearGradient(0, 0, MENU_MAP_WORLD_WIDTH, 0);
      sideFade.addColorStop(0, 'rgba(5, 12, 16, 0.16)');
      sideFade.addColorStop(0.08, 'rgba(5, 12, 16, 0)');
      sideFade.addColorStop(0.92, 'rgba(5, 12, 16, 0)');
      sideFade.addColorStop(1, 'rgba(5, 12, 16, 0.16)');
      backdropCtx.fillStyle = sideFade;
      backdropCtx.fillRect(0, 0, MENU_MAP_WORLD_WIDTH, MENU_MAP_WORLD_HEIGHT);

      const edgeShade = backdropCtx.createRadialGradient(MENU_MAP_WORLD_WIDTH / 2, MENU_MAP_WORLD_HEIGHT * 0.55, 220, MENU_MAP_WORLD_WIDTH / 2, MENU_MAP_WORLD_HEIGHT * 0.55, MENU_MAP_WORLD_WIDTH * 0.72);
      edgeShade.addColorStop(0, 'rgba(0,0,0,0)');
      edgeShade.addColorStop(1, `rgba(3, 8, 12, ${0.2 + qualityFactor * 0.12})`);
      backdropCtx.fillStyle = edgeShade;
      backdropCtx.fillRect(0, 0, MENU_MAP_WORLD_WIDTH, MENU_MAP_WORLD_HEIGHT);

      menuBackdropCacheRef.current = { canvas, key: cacheKey };
      return canvas;
  }, []);

  // --- TUTORIAL LOGIC ---
  const updateTutorial = (dt: number) => {
      const tutorialState = tutorialRef.current;
      if (!tutorialState.active) return;
      const player = monkey.current;
      const level = LEVELS[selectedLevelRef.current - 1];
      const isL2 = level.tutorialType === 'ADVANCED';
      
      let nextStep = tutorialState.currentStep;
      let message = tutorialState.message;
      let show = tutorialState.showBox;
      let target = tutorialState.targetPos;
      let timer = tutorialState.timer || 0;

      if (!isL2) {
          if (tutorialState.currentStep === 'WELCOME') {
              show = true; message = "Welcome! E latches, A brakes the arc, D drives it, and Space jumps with 3 charges.";
              target = { x: player.position.x, y: player.position.y - 50 };
              if (Math.abs(player.velocity.x) > 2) nextStep = 'GRAPPLE';
          }
          else if (tutorialState.currentStep === 'GRAPPLE') {
              show = true; message = "Hold E or hold click to latch onto a tree, branch, or vine.";
              const tree = entities.current.find(e => e.type === 'tree' && e.position.x > player.position.x + 100);
              if (tree) target = { x: tree.position.x, y: tree.position.y + 200 };
              if (player.isSwinging) nextStep = 'MOMENTUM';
          }
          else if (tutorialState.currentStep === 'MOMENTUM') {
               show = true; message = "Pump with D, brake with A, and keep the rope low for cleaner launches.";
               target = { x: player.position.x, y: player.position.y - 50 };
               const speed = Math.hypot(player.velocity.x, player.velocity.y);
               if (player.isSwinging && speed > 18) nextStep = 'SWING';
          }
          else if (tutorialState.currentStep === 'SWING') {
               show = true; message = "Release mouse or E near the peak to launch. Space stays a jump.";
               target = { x: player.position.x, y: player.position.y - 50 };
               if (!player.isSwinging && player.velocity.x > 8) nextStep = 'JUMP';
          }
          else if (tutorialState.currentStep === 'JUMP') {
              show = true; message = "Space jumps. Use W and S to shape the rope while swinging.";
              target = { x: player.position.x, y: player.position.y - 50 };
              if (player.jumpCooldown > 0) { nextStep = 'BRANCH_INFO'; timer = 240; }
          }
          else if (tutorialState.currentStep === 'BRANCH_INFO') {
              show = true; message = "WARNING: Standing on branches too long will break them!";
              target = { x: player.position.x, y: player.position.y - 50 };
              timer -= dt;
              if (timer <= 0) nextStep = 'COMPLETED';
          }
          else if (tutorialState.currentStep === 'COMPLETED') show = false;
      } else {
          // L2 Logic
          if (tutorialState.currentStep === 'L2_INTRO') {
              show = true; message = "Level 2: Dangers Ahead! Swing FAST to survive.";
              timer -= dt; if (timer <= 0) nextStep = 'L2_MOMENTUM';
          }
          else if (tutorialState.currentStep === 'L2_MOMENTUM') {
              show = true; message = "Use D to drive, A to brake, and Space to jump in short bursts.";
              const speed = Math.hypot(player.velocity.x, player.velocity.y);
              if (speed > 22) { nextStep = 'L2_BRANCH'; timer = 0; }
          }
          else if (tutorialState.currentStep === 'L2_BRANCH') {
              show = true; message = "Look! A branch. Grip it, then move on before it snaps.";
              const standingOnBranch = entities.current.some(e => e.type === 'branch' && checkCollision(player, e));
              if (standingOnBranch) { message = "UNSTABLE! It breaks in 1s! JUMP!"; if (player.jumpCooldown > 0) nextStep = 'L2_DODGE'; }
          }
          else if (tutorialState.currentStep === 'L2_DODGE') {
              show = true; message = "Enemy ahead. Swing high or low to slip it.";
              if (distanceRef.current > 40) nextStep = 'L2_ABILITY';
          }
          else if (tutorialState.currentStep === 'L2_ABILITY') {
              show = true; message = "Focus is online. Press Q to slow danger and tighten recovery.";
              if (focusTimerRef.current > 0) nextStep = 'COMPLETED';
          }
          else if (tutorialState.currentStep === 'COMPLETED') show = false;
      }

      // ONLY UPDATE IF CHANGED to prevent render thrashing
      if (nextStep !== tutorialState.currentStep || show !== tutorialState.showBox || message !== tutorialState.message || timer !== tutorialState.timer) {
          const nextTutorial = { ...tutorialState, currentStep: nextStep, showBox: show, message, targetPos: target, timer: nextStep === 'L2_INTRO' ? 180 : timer };
          tutorialRef.current = nextTutorial;
          setTutorial(nextTutorial);
      }
  };

  const handleBuyItem = (item: ShopItem) => {
      const currentLevel =
          item.type === 'UPGRADE'
              ? saveData.upgrades[item.upgradeKey!]
              : item.type === 'ROPE'
              ? saveData.ropeTypes.includes(item.ropeType!)
                  ? 1
                  : 0
              : saveData.skins.includes(item.id)
              ? 1
              : 0;
      const missingParents = (item.parents ?? []).filter((parentId) => {
          const parent = SHOP_ITEMS.find((candidate) => candidate.id === parentId);
          return !parent || saveDataRef.current.upgrades[parent.upgradeKey!] < 1;
      });
      if (missingParents.length > 0) return;
      if (item.maxLevel && currentLevel >= item.maxLevel) return;
      if (saveData.totalTokens >= item.cost) {
          if (!isMuted) SoundSynth.playCoin();
          markRecommendationPurchase(item.id);
          commitSaveData(prev => {
              const newUpgrades = { ...prev.upgrades };
              const newSkins = [...prev.skins];
              const newRopeTypes = [...prev.ropeTypes];
              if (item.type === 'UPGRADE' && item.upgradeKey) {
                  newUpgrades[item.upgradeKey] = (newUpgrades[item.upgradeKey] || 0) + 1;
              } else if (item.type === 'ROPE' && item.ropeType) {
                  if (!newRopeTypes.includes(item.ropeType)) newRopeTypes.push(item.ropeType);
              } else if (item.type === 'SKIN' && !newSkins.includes(item.id)) {
                  newSkins.push(item.id);
              }
              return {
                  ...prev,
                  totalTokens: prev.totalTokens - item.cost,
                  upgrades: newUpgrades,
                  skins: newSkins,
                  ropeTypes: newRopeTypes,
                  equippedRopeType: item.type === 'ROPE' && item.ropeType ? item.ropeType : prev.equippedRopeType,
              };
          });
          setPurchaseReceipt({
              id: `${item.id}-${Date.now()}`,
              itemId: item.id,
              itemName: item.name,
              changeApplied: item.type === 'UPGRADE'
                  ? `${item.name} advanced to level ${currentLevel + 1}.`
                  : item.type === 'ROPE'
                  ? `${item.name} is now owned and equipped.`
                  : `${item.name} is now owned and ready to equip.`,
              tokenDelta: -item.cost,
              accent: item.type === 'UPGRADE' ? 'emerald' : item.type === 'ROPE' ? 'cyan' : 'amber',
              timestamp: Date.now(),
          });
      }
  };

  const handleEquipRopeType = (ropeTypeId: string) => {
      const ropeItem = SHOP_ITEMS.find((item) => item.type === 'ROPE' && item.ropeType === ropeTypeId);
      commitSaveData(prev => {
          const ropeTypes = ropeItem && !prev.ropeTypes.includes(ropeTypeId as SaveData['equippedRopeType'])
              ? [...prev.ropeTypes, ropeTypeId as SaveData['equippedRopeType']]
              : prev.ropeTypes;
          return {
              ...prev,
              ropeTypes,
              equippedRopeType: ropeTypeId as SaveData['equippedRopeType'],
          };
      });
      setPurchaseReceipt({
          id: `${ropeTypeId}-equip-${Date.now()}`,
          itemId: ropeTypeId,
          itemName: ropeItem?.name ?? ropeTypeId,
          changeApplied: `${ropeItem?.name ?? ropeTypeId} is now equipped.`,
          tokenDelta: 0,
          accent: 'cyan',
          timestamp: Date.now(),
      });
  };

  const handleEquipSkin = (skinId: string) => {
      const skin = SHOP_ITEMS.find((item) => item.id === skinId);
      commitSaveData(prev => ({ ...prev, equippedSkin: skinId }));
      setPurchaseReceipt({
          id: `${skinId}-equip-${Date.now()}`,
          itemId: skinId,
          itemName: skin?.name ?? skinId,
          changeApplied: `${skin?.name ?? skinId} is now equipped.`,
          tokenDelta: 0,
          accent: 'cyan',
          timestamp: Date.now(),
      });
  };

  // ... (Game Logic Helpers omitted for brevity) ...
  const addShake = (amount: number) => {
    const presentation = getEffectiveDisplaySettings(saveDataRef.current.settings);
    shakeIntensity.current = Math.min(shakeIntensity.current + amount * presentation.shakeScale, 20);
  };

  const spawnParticles = (x: number, y: number, color: string, count: number, sizeBase: number = 3, type?: Particle['type']) => {
    const motionScale = saveDataRef.current.settings.motionIntensity === 'reduced' ? 0.45 : 1;
    const actualCount = Math.max(1, Math.round(count * motionScale));
    for (let i = 0; i < actualCount; i++) {
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
    runDebriefRef.current.maxComboMultiplier = Math.max(runDebriefRef.current.maxComboMultiplier, chain.multiplier);
    if (chain.currentScore >= runDebriefRef.current.maxComboScore) {
        runDebriefRef.current.maxComboScore = chain.currentScore;
        runDebriefRef.current.maxComboRank = chain.rank;
    }
    setSkillChainUI({...chain});
    spawnFloatingText(monkey.current.position.x, monkey.current.position.y - 60, `${name} x${chain.multiplier.toFixed(1)}`, color, 16);
  };

  const cashOutSkillChain = (label: string = 'BANKED') => {
    const chain = skillChain.current;
    if (!chain.active || chain.currentScore <= 0) return;

    const bonusTokens = clamp(Math.floor(chain.currentScore / 180), 1, 15);
    const bonusScore = Math.floor(chain.currentScore * 0.35);
    runTokensRef.current += bonusTokens;
    scoreRef.current += bonusScore;
    spawnFloatingText(monkey.current.position.x, monkey.current.position.y - 82, `${label} +${bonusTokens} TOKENS`, '#fde68a', 18);
    spawnParticles(monkey.current.position.x, monkey.current.position.y - 26, '#fde68a', 14, 3, 'spark');
    spawnParticles(monkey.current.position.x, monkey.current.position.y - 18, '#ffffff', 10, 2.6, 'wind');
    if (!isMutedRef.current) SoundSynth.playCoin();

    chain.active = false;
    chain.currentScore = 0;
    chain.multiplier = BASE_MULTIPLIER;
    chain.events = [];
    chain.timer = 0;
    chain.rank = 'GROOVIN';
    setSkillChainUI({ ...chain });
  };

  const spawnStarterZone = (level: LevelConfig) => {
    const biome = level.biome;
    const isSwamp = biome === 'SWAMP';
    const isWinter = biome === 'WINTER';
    const isVolcano = biome === 'VOLCANO';
    const isCave = biome === 'CAVE';
    const trunkColor = isWinter ? '#5D4037' : (isVolcano ? '#212121' : '#3E2723');
    const branchColor = isVolcano ? '#40302b' : (isWinter ? '#566370' : '#5c4033');
    let canopyColor = THEME_PROFILES[biome].treeColor;
    if (isVolcano) canopyColor = '#4E342E';
    if (isWinter) canopyColor = '#607D8B';

    const starterTrees = [
      {
        x: 250,
        canopyTop: 185,
        vineY: 220,
        vineH: 250,
        branches: [
          { x: 130, y: 380, w: 160 },
          { x: 250, y: 455, w: 145 },
        ],
      },
      {
        x: 470,
        canopyTop: 145,
        vineY: 180,
        vineH: 310,
        branches: [
          { x: 350, y: 320, w: 150 },
          { x: 505, y: 410, w: 160 },
          { x: 410, y: 468, w: 138 },
          { x: 310, y: 515, w: 150 },
        ],
      },
      {
        x: 715,
        canopyTop: 125,
        vineY: 168,
        vineH: 345,
        branches: [
          { x: 620, y: 280, w: 150 },
          { x: 785, y: 370, w: 160 },
          { x: 600, y: 480, w: 165 },
        ],
      },
    ];

    starterTrees.forEach((tree, index) => {
      if (!isCave) {
        const trunkTop = Math.max(24, tree.canopyTop - 20);
        entities.current.push({
          id: `starter-trunk-${index}`,
          position: { x: tree.x - 18, y: trunkTop },
          width: 36,
          height: CANVAS_HEIGHT - trunkTop + 3200,
          color: trunkColor,
          type: 'tree',
          biome,
        });
        entities.current.push({
          id: `starter-canopy-${index}`,
          position: { x: tree.x - 74, y: tree.canopyTop },
          width: 148,
          height: 136,
          color: canopyColor,
          type: 'tree',
          biome,
          polyPoints: createTreePoly(tree.x, tree.canopyTop + 180, biome),
        });
      }

      entities.current.push({
        id: `starter-vine-${index}`,
        position: { x: tree.x + 86, y: tree.vineY },
        width: 6,
        height: tree.vineH,
        color: '#58d27d',
        type: 'vine',
        biome,
      });

      if (index < starterTrees.length - 1) {
        entities.current.push({
          id: `starter-cross-vine-${index}`,
          position: { x: tree.x + 156, y: tree.vineY + 24 },
          width: 5,
          height: tree.vineH - 34,
          color: '#6ee08d',
          type: 'vine',
          biome,
        });
      }

      tree.branches.forEach((branch, branchIndex) => {
        entities.current.push({
          id: `starter-branch-${index}-${branchIndex}`,
          position: { x: branch.x, y: branch.y },
          width: branch.w,
          height: 16,
          color: branchColor,
          type: 'branch',
          biome,
          stability: 82,
          isBroken: false,
        });
      });

      entities.current.push({
        id: `starter-coin-${index}`,
        position: { x: tree.x + 26, y: tree.canopyTop + 150 },
        width: 18,
        height: 18,
        color: isSwamp ? '#7dd3fc' : '#8ef7ff',
        type: 'coin',
        biome,
      });
    });

    if (isSwamp) {
      entities.current.push({
        id: 'starter-water-pocket',
        position: { x: 760, y: CANVAS_HEIGHT - 170 },
        width: 120,
        height: 82,
        color: 'rgba(1, 87, 155, 0.68)',
        type: 'water_pocket',
        biome,
      });
      entities.current.push({
        id: 'starter-lilypad',
        position: { x: 785, y: CANVAS_HEIGHT - 108 },
        width: 84,
        height: 12,
        color: '#81C784',
        type: 'lilypad',
        biome,
      });
    }

    routeLinkRef.current = { x: 807, y: 300 };
  };

  const spawnCheckpointStructures = (level: LevelConfig) => {
    if (level.checkpointCount <= 0) return;

    const routeBudget = level.targetDistance * 20;
    const isCave = level.biome === 'CAVE';
    const trunkColor = level.biome === 'VOLCANO' ? '#212121' : level.biome === 'WINTER' ? '#5D4037' : '#3E2723';
    const branchColor = level.biome === 'VOLCANO' ? '#4c3428' : level.biome === 'CAVE' ? '#455A64' : '#72513c';
    const checkpointColor = level.biome === 'SWAMP' ? '#7dd3fc' : level.biome === 'VOLCANO' ? '#fb7185' : '#86efac';

    for (let index = 0; index < level.checkpointCount; index += 1) {
      const progress = (index + 1) / (level.checkpointCount + 1);
      const checkpointX = Math.floor(routeBudget * progress);
      const laneY = clamp(252 + Math.sin(index + level.id * 0.7) * 66 + (level.biome === 'SWAMP' ? 42 : 0), 188, CANVAS_HEIGHT - 230);
      const branchWidth = 176;
      const branchX = checkpointX - branchWidth / 2;
      const branchY = laneY + 72;

      if (entities.current.some(entity => entity.id === `checkpoint-${level.id}-${index + 1}`)) continue;

      if (!isCave) {
        entities.current.push({
          id: `checkpoint-trunk-${level.id}-${index + 1}`,
          position: { x: checkpointX - 18, y: Math.max(20, laneY - 44) },
          width: 36,
          height: CANVAS_HEIGHT - laneY + 3400,
          color: trunkColor,
          type: 'tree',
          biome: level.biome,
        });
        entities.current.push({
          id: `checkpoint-vine-${level.id}-${index + 1}`,
          position: { x: checkpointX + 74, y: Math.max(36, laneY - 124) },
          width: 5,
          height: 254,
          color: '#66d884',
          type: 'vine',
          biome: level.biome,
        });
      } else {
        entities.current.push({
          id: `checkpoint-stalactite-${level.id}-${index + 1}`,
          position: { x: checkpointX + 42, y: -48 },
          width: 40,
          height: laneY + 86,
          color: '#546E7A',
          type: 'stalactite',
          biome: level.biome,
          polyPoints: createTreePoly(checkpointX + 42, 0, 'CAVE'),
        });
      }

      entities.current.push({
        id: `checkpoint-branch-${level.id}-${index + 1}`,
        position: { x: branchX, y: branchY },
        width: branchWidth,
        height: 16,
        color: branchColor,
        type: 'branch',
        biome: level.biome,
        stability: 999,
        isBroken: false,
      });
      entities.current.push({
        id: `checkpoint-support-${level.id}-${index + 1}`,
        position: { x: checkpointX - 156, y: branchY + 42 },
        width: 134,
        height: 14,
        color: branchColor,
        type: 'branch',
        biome: level.biome,
        stability: 999,
        isBroken: false,
      });
      entities.current.push({
        id: `checkpoint-exit-${level.id}-${index + 1}`,
        position: { x: checkpointX + 54, y: branchY - 28 },
        width: 152,
        height: 14,
        color: branchColor,
        type: 'branch',
        biome: level.biome,
        stability: 999,
        isBroken: false,
      });
      entities.current.push({
        id: `checkpoint-${level.id}-${index + 1}`,
        position: { x: checkpointX - 28, y: laneY - 10 },
        width: 56,
        height: 56,
        color: checkpointColor,
        type: 'checkpoint',
        biome: level.biome,
        activated: false,
        checkpointIndex: index + 1,
      });

      for (let coinIndex = 0; coinIndex < 4; coinIndex += 1) {
        entities.current.push({
          id: `checkpoint-coin-${level.id}-${index + 1}-${coinIndex}`,
          position: { x: checkpointX - 42 + coinIndex * 28, y: laneY - 64 + Math.sin(coinIndex) * 10 },
          width: 18,
          height: 18,
          color: level.biome === 'SWAMP' ? '#7dd3fc' : '#8ef7ff',
          type: 'coin',
          biome: level.biome,
        });
      }
    }
  };

  const activateCheckpoint = (entity: Entity) => {
    if (entity.activated) return;

    entity.activated = true;
    entity.color = '#fef08a';
    const nextActivatedIds = [...new Set([...checkpointRef.current.activatedIds, entity.id])];
    const label = `Checkpoint ${entity.checkpointIndex ?? checkpointRef.current.activatedIds.length + 1}`;
    checkpointRef.current = {
      activeId: entity.id,
      activatedIds: nextActivatedIds,
      respawnPosition: {
        x: entity.position.x - 8,
        y: entity.position.y + entity.height + 18,
      },
      respawnVelocity: { x: 6.2 + (entity.checkpointIndex ?? 1) * 0.25, y: -1.2 },
      label,
    };
    runDebriefRef.current.checkpointsSecured = nextActivatedIds.length;
    checkpointBannerTimerRef.current = 2.8;
    setCheckpointBanner(label);
    spawnFloatingText(entity.position.x - 12, entity.position.y - 18, label.toUpperCase(), '#fef08a', 22);
    spawnParticles(entity.position.x + entity.width / 2, entity.position.y + entity.height / 2, '#fde68a', 14, 3, 'spark');
    if (!isMutedRef.current) {
      SoundSynth.playCoin();
      setTimeout(() => SoundSynth.playTone(920, 'triangle', 0.12, 0.04), 35);
    }
  };

  const respawnFromCheckpoint = (cause: string) => {
    const checkpoint = checkpointRef.current;
    if (!checkpoint.respawnPosition) return false;

    const player = monkey.current;
    player.position = { ...checkpoint.respawnPosition };
    player.velocity = { ...checkpoint.respawnVelocity };
    player.rotation = 0;
    player.isSwinging = false;
    player.tetherPoint = null;
    player.ropeLength = 0;
    player.ropeTargetLength = 0;
    player.ropeReelVelocity = 0;
    player.fallTimer = 0;
    player.grounded = true;
    player.coyoteTimer = COYOTE_TIME_SECONDS;
    player.platformDropTimer = 0;
    player.releaseTetherPoint = null;
    player.releaseTetherLength = 0;
    player.releaseTetherTimer = 0;
    player.releaseTetherMaxTimer = 0;
    player.retargetGraceTimer = 0;
    player.grappleCooldown = 0;
    player.jumpCooldown = 0;
    player.invulnerableTime = INVULNERABILITY_TIME * 1.5;
    player.causeOfDeath = '';
    cameraOffset.current.x = Math.max(0, checkpoint.respawnPosition.x - CANVAS_WIDTH * 0.28);
    cameraOffset.current.y = clamp(checkpoint.respawnPosition.y - CANVAS_HEIGHT * 0.48, -500, 820);
    runDebriefRef.current.redeploys += 1;
    checkpointBannerTimerRef.current = 1.8;
    setCheckpointBanner(`${checkpoint.label} secured`);
    spawnFloatingText(checkpoint.respawnPosition.x, checkpoint.respawnPosition.y - 20, 'REDEPLOYED', '#86efac', 24);
    spawnFloatingText(checkpoint.respawnPosition.x, checkpoint.respawnPosition.y + 12, cause.toUpperCase(), '#fca5a5', 14);
    spawnParticles(checkpoint.respawnPosition.x + 15, checkpoint.respawnPosition.y + 15, '#a7f3d0', 16, 3, 'spark');
    return true;
  };

  const spawnScriptedLevelSegment = (
    level: LevelConfig,
    startX: number,
    treeX: number,
    carriedLaneY: number | null,
  ) => {
    const scripted = getScriptedRouteBeat(level, startX);
    if (!scripted) return false;

    const { beat, beatIndex } = scripted;
    const biome = level.biome;
    const isCave = biome === 'CAVE';
    const isVolcano = biome === 'VOLCANO';
    const routeProgress = getRouteProgress(level);
    const useLateRouteColorScheme = routeProgress >= ROUTE_PROFILE_THRESHOLD.lateRouteAidCap;
    const beatBias = Math.sin((startX + beatIndex * 111) * 0.0028);
    const safeY = clamp((carriedLaneY ?? (isCave ? 320 : 292)) + beatBias * 26, 118, CANVAS_HEIGHT - 200);
    const highY = clamp(safeY - (beat.anchorPattern === 'slope_launch' ? 156 : 136), 54, CANVAS_HEIGHT - 300);
    const midY = clamp(safeY - 48, 96, CANVAS_HEIGHT - 240);
    const lowY = clamp(safeY + 126, 210, CANVAS_HEIGHT - 115);
    const rewardY = clamp(lowY - (beat.kind === 'reward' ? 24 : 0), 148, CANVAS_HEIGHT - 126);
    const riskY = clamp((highY + safeY) * 0.5 + (beat.kind === 'hazard' ? -18 : 10), 104, CANVAS_HEIGHT - 180);
    const branchColor =
      biome === 'JUNGLE'
        ? '#5c4033'
        : biome === 'SWAMP'
          ? '#5a4a3c'
          : isVolcano
            ? '#4b3028'
            : '#4f5a63';
    const supportColor =
      biome === 'JUNGLE'
        ? '#72513c'
        : biome === 'SWAMP'
          ? '#6d594a'
          : isVolcano
            ? '#6b412d'
            : '#6f5b46';
    const vineColor =
      biome === 'JUNGLE'
        ? '#58d27d'
        : biome === 'SWAMP'
          ? '#74d6b3'
          : isVolcano
            ? '#f6a75f'
            : '#8ecabf';
    const routeEndX = startX + 900;

    const getLaneY = (lane: RouteLane) => {
      switch (lane) {
        case 'safe':
          return safeY;
        case 'risk':
          return riskY;
        case 'reward':
          return rewardY;
        case 'high':
          return highY;
        case 'mid':
        case 'center':
          return midY;
        case 'low':
          return lowY;
        default:
          return safeY;
      }
    };

    const addBranch = (
      idPrefix: string,
      x: number,
      y: number,
      width: number,
      recovery: boolean,
      stability: number = 82,
      color: string = branchColor,
    ) => {
      entities.current.push({
        id: `${recovery ? 'script-recovery' : idPrefix}-${startX}-${Math.round(x)}`,
        position: { x, y },
        width,
        height: 16,
        color,
        type: 'branch',
        biome,
        stability,
        isBroken: false,
      });
    };

    const addVine = (idPrefix: string, x: number, y: number, height: number, recovery: boolean) => {
      entities.current.push({
        id: `${recovery ? 'script-recovery' : idPrefix}-${startX}-${Math.round(x)}`,
        position: { x, y },
        width: 5,
        height,
        color: vineColor,
        type: 'vine',
        biome,
      });
    };

    const addStalactite = (idPrefix: string, x: number, height: number, recovery: boolean) => {
      entities.current.push({
        id: `${recovery ? 'script-recovery' : idPrefix}-${startX}-${Math.round(x)}`,
        position: { x, y: -36 },
        width: 42,
        height,
        color: '#59646d',
        type: 'stalactite',
        biome,
        polyPoints: createTreePoly(x, 0, 'CAVE'),
      });
    };

    const addCoinPack = (lane: RouteLane, originX: number, count: number, spread: number = 26) => {
      const y = getLaneY(lane);
      for (let index = 0; index < count; index += 1) {
        entities.current.push({
          id: `script-coin-${startX}-${lane}-${index}`,
          position: {
            x: originX + index * spread,
            y: y - 36 + Math.sin(index * 0.8) * 12,
          },
          width: 18,
          height: 18,
          color: useLateRouteColorScheme ? '#ffb74d' : '#8ef7ff',
          type: 'coin',
          biome,
        });
      }
    };

    const addEnemy = (enemyType: Enemy['enemyType'], lane: RouteLane, offsetX: number, index: number, telegraph: Enemy['telegraph']) => {
      const laneY = getLaneY(lane);
      const x = startX + offsetX + index * 150;
      let position = { x, y: laneY - 48 };
      let velocity = { x: enemyType === 'eagle' ? -3.1 : enemyType === 'bat' ? -3.6 : -2.1, y: 0 };
      let anchorY = laneY - 96;
      let anchorX = x;

      if (enemyType === 'spider') {
        position = { x, y: laneY + 24 };
        velocity = { x: 0, y: 1.2 };
        anchorY = laneY - 88;
      } else if (enemyType === 'troll') {
        position = { x, y: laneY - 20 };
        velocity = { x: 0, y: 0 };
        anchorY = laneY - 20;
      } else if (enemyType === 'bat') {
        position = { x, y: laneY - 78 };
        velocity = { x: -3.6, y: 1.1 };
      } else if (enemyType === 'eagle' || enemyType === 'bird') {
        position = { x, y: laneY - 88 };
      }

      enemies.current.push({
        id: `script-enemy-${enemyType}-${startX}-${index}`,
        position,
        velocity,
        width: enemyType === 'eagle' ? 80 : enemyType === 'troll' ? 54 : 35,
        height: enemyType === 'eagle' ? 40 : enemyType === 'troll' ? 62 : 35,
        color: '#000',
        type: 'enemy',
        enemyType,
        health: 1,
        anchorY,
        anchorX,
        swingAngle: 0,
        state: 0,
        attackTimer: telegraph === 'gate' ? 80 : telegraph === 'cross' ? 54 : 42,
        telegraph,
        biome,
      });
    };

    const addHazardEntity = (type: 'geyser' | 'ash_gust', lane: RouteLane, offsetX: number, index: number, telegraph: Entity['telegraph']) => {
      const laneY = getLaneY(lane);
      const x = startX + offsetX + index * 240;
      if (type === 'geyser') {
        entities.current.push({
          id: `script-geyser-${startX}-${index}`,
          position: { x, y: CANVAS_HEIGHT - 220 },
          width: 90,
          height: 170,
          color: 'rgba(255, 128, 80, 0.7)',
          type: 'geyser',
          biome,
          attackTimer: 82 + index * 6,
          activated: false,
          telegraph,
        });
        entities.current.push({
          id: `script-lava-${startX}-${index}`,
          position: { x: x - 60, y: CANVAS_HEIGHT - 40 },
          width: 220,
          height: 40,
          color: '#91291d',
          type: 'lake',
          biome,
        });
      } else {
        entities.current.push({
          id: `script-gust-${startX}-${index}`,
          position: { x, y: laneY - 120 },
          width: 130,
          height: 210,
          color: 'rgba(205, 214, 224, 0.22)',
          type: 'ash_gust',
          biome,
          attackTimer: 94 + index * 8,
          activated: false,
          telegraph,
        });
      }
    };

    switch (beat.anchorPattern) {
      case 'cave_fork':
        addStalactite('script-risk-stalactite', startX + 240, highY + 50, false);
        addBranch('script-checkpoint-high', startX + 180, highY, 190, true, 88, supportColor);
        addBranch('script-risk-mid', startX + 440, riskY, 140, false, 72);
        addBranch('script-reward-low', startX + 340, rewardY, 180, false, 74, supportColor);
        addBranch('script-exit-branch', startX + 680, safeY - 10, 180, true, 88, supportColor);
        break;
      case 'cave_drop':
        addStalactite('script-risk-drop', startX + 210, highY + 60, false);
        addBranch('script-checkpoint-high', startX + 150, highY, 170, true, 86, supportColor);
        addBranch('script-risk-mid', startX + 430, midY + 20, 120, false, 68);
        addBranch('script-reward-low', startX + 520, lowY, 150, false, 72, supportColor);
        addBranch('script-exit-branch', startX + 760, safeY + 8, 186, true, 88, supportColor);
        break;
      case 'cave_checkpoint':
        addBranch('script-checkpoint-branch', startX + 150, safeY - 4, 180, true, 92, supportColor);
        addBranch('script-recovery-side', startX + 405, midY + 12, 140, true, 88);
        addBranch('script-exit-branch', startX + 690, safeY + 6, 190, true, 90, supportColor);
        addStalactite('script-checkpoint-stalactite', startX + 502, highY + 40, true);
        break;
      case 'lava_bridge':
        addBranch('script-checkpoint-high', startX + 150, safeY, 176, true, 84, supportColor);
        addVine('script-risk-vine', startX + 340, highY - 140, 250, false);
        addBranch('script-risk-mid', startX + 410, riskY, 130, false, 70);
        addBranch('script-reward-low', startX + 530, rewardY, 140, false, 68, supportColor);
        addBranch('script-exit-branch', startX + 760, safeY - 12, 186, true, 88, supportColor);
        entities.current.push({
          id: `script-lava-base-${startX}`,
          position: { x: startX + 250, y: CANVAS_HEIGHT - 40 },
          width: 560,
          height: 40,
          color: '#8d2819',
          type: 'lake',
          biome,
        });
        break;
      case 'lava_burst':
        addBranch('script-checkpoint-high', startX + 130, highY + 20, 160, true, 84, supportColor);
        addVine('script-risk-vine', startX + 320, highY - 130, 260, false);
        addBranch('script-risk-mid', startX + 420, riskY + 6, 110, false, 68);
        addBranch('script-reward-low', startX + 570, rewardY, 142, false, 68, supportColor);
        addBranch('script-exit-branch', startX + 770, safeY - 6, 180, true, 88, supportColor);
        entities.current.push({
          id: `script-lava-base-${startX}`,
          position: { x: startX + 220, y: CANVAS_HEIGHT - 40 },
          width: 620,
          height: 40,
          color: '#96291c',
          type: 'lake',
          biome,
        });
        break;
      case 'lava_checkpoint':
        addBranch('script-checkpoint-branch', startX + 140, safeY, 180, true, 92, supportColor);
        addVine('script-checkpoint-vine', startX + 420, highY - 140, 250, true);
        addBranch('script-recovery-side', startX + 480, midY + 8, 136, true, 88);
        addBranch('script-exit-branch', startX + 750, safeY - 8, 190, true, 90, supportColor);
        entities.current.push({
          id: `script-lava-base-${startX}`,
          position: { x: startX + 230, y: CANVAS_HEIGHT - 40 },
          width: 590,
          height: 40,
          color: '#8f2417',
          type: 'lake',
          biome,
        });
        break;
      case 'slope_climb':
        addBranch('script-checkpoint-high', startX + 120, lowY - 10, 154, true, 84, supportColor);
        addBranch('script-risk-mid', startX + 310, midY - 6, 146, false, 72);
        addVine('script-risk-vine', startX + 505, highY - 140, 250, false);
        addBranch('script-reward-low', startX + 530, highY + 32, 136, false, 70, supportColor);
        addBranch('script-exit-branch', startX + 740, highY - 6, 188, true, 88, supportColor);
        break;
      case 'slope_launch':
        addBranch('script-checkpoint-high', startX + 120, lowY - 18, 150, true, 86, supportColor);
        addVine('script-risk-vine', startX + 320, midY - 130, 270, false);
        addBranch('script-risk-mid', startX + 440, midY - 8, 118, false, 68);
        addVine('script-reward-vine', startX + 615, highY - 160, 300, false);
        addBranch('script-exit-branch', startX + 790, highY - 18, 180, true, 88, supportColor);
        break;
      case 'slope_checkpoint':
        addBranch('script-checkpoint-branch', startX + 140, safeY + 12, 176, true, 92, supportColor);
        addBranch('script-recovery-side', startX + 390, midY, 144, true, 88);
        addVine('script-checkpoint-vine', startX + 575, highY - 150, 290, true);
        addBranch('script-exit-branch', startX + 780, highY - 10, 188, true, 90, supportColor);
        break;
      case 'ash_weave':
        addBranch('script-checkpoint-high', startX + 120, safeY - 12, 170, true, 84, supportColor);
        addVine('script-risk-vine', startX + 330, highY - 150, 260, false);
        addBranch('script-risk-mid', startX + 440, midY + 8, 132, false, 70);
        addBranch('script-reward-low', startX + 575, rewardY - 10, 138, false, 70, supportColor);
        addBranch('script-exit-branch', startX + 770, safeY - 20, 188, true, 88, supportColor);
        break;
      case 'ash_gust':
        addBranch('script-checkpoint-high', startX + 140, safeY - 16, 164, true, 84, supportColor);
        addVine('script-risk-vine', startX + 350, riskY - 150, 250, false);
        addBranch('script-risk-mid', startX + 450, riskY + 10, 110, false, 68);
        addBranch('script-reward-low', startX + 600, rewardY, 130, false, 68, supportColor);
        addBranch('script-exit-branch', startX + 790, safeY - 10, 178, true, 88, supportColor);
        break;
      case 'ash_checkpoint':
        addBranch('script-checkpoint-branch', startX + 150, safeY - 8, 176, true, 92, supportColor);
        addVine('script-checkpoint-vine', startX + 405, highY - 148, 286, true);
        addBranch('script-recovery-side', startX + 520, midY + 2, 140, true, 88);
        addBranch('script-exit-branch', startX + 760, safeY - 16, 186, true, 90, supportColor);
        break;
      case 'final_gauntlet':
      default:
        addBranch('script-checkpoint-high', startX + 120, safeY - 14, 160, true, 86, supportColor);
        addBranch('script-risk-mid', startX + 340, riskY + 4, 120, false, 68);
        addVine('script-risk-vine', startX + 520, highY - 150, 270, false);
        addBranch('script-reward-low', startX + 610, rewardY, 132, false, 68, supportColor);
        addBranch('script-exit-branch', startX + 820, safeY - 18, 190, true, 90, supportColor);
        break;
    }

    beat.rewards?.forEach((reward, rewardIndex) => {
      addCoinPack(reward.lane, startX + 250 + rewardIndex * 140, reward.count, reward.spread ?? 24);
    });

    beat.hazards.forEach((hazard, hazardIndex) => {
      for (let index = 0; index < hazard.count; index += 1) {
        if (hazard.kind === 'enemy' && hazard.enemyType) {
          addEnemy(hazard.enemyType, hazard.lane, 360 + hazardIndex * 140 + index * (hazard.spacing ?? 120), index, hazard.telegraph ?? beat.telegraph);
        } else if (hazard.kind === 'entity' && hazard.entityType) {
          addHazardEntity(hazard.entityType, hazard.lane, 300 + hazardIndex * 120 + index * (hazard.spacing ?? 220), index, hazard.telegraph ?? beat.telegraph);
        }
      }
    });

    if (isCave) {
      addStalactite('script-prop-stalactite', treeX + 120, Math.max(240, safeY + 140), beat.recoveryAnchors);
    } else if (isVolcano) {
      entities.current.push({
        id: `script-scorch-rock-${startX}`,
        position: { x: startX + 240, y: CANVAS_HEIGHT - 52 },
        width: 90,
        height: 16,
        color: '#3d2920',
        type: 'branch',
        biome,
        stability: 64,
        isBroken: false,
      });
    }

    routeLinkRef.current = { x: routeEndX, y: safeY - 18 };
    return true;
  };

  const spawnLevelSegment = (startX: number) => {
    const level = LEVELS[selectedLevelRef.current - 1];
    const segmentSeed = mixSeed(level.id, startX, level.targetDistance, level.difficulty);
    const segmentRandom = createSeededRandom(segmentSeed);
    const segmentRandomRange = (min: number, max: number) => segmentRandom() * (max - min) + min;
    const segmentChance = (probability: number) => segmentRandom() < probability;
    const segmentInt = (min: number, max: number) => Math.floor(segmentRandomRange(min, max));
    const segmentPick = <T,>(values: T[]) => values[Math.floor(segmentRandom() * values.length)];
    if (startX > level.targetDistance * 20) {
        if (!entities.current.find(e => e.type === 'portal')) {
            entities.current.push({ id: 'finish-portal', position: { x: level.targetDistance * 20, y: CANVAS_HEIGHT - 300 }, width: 100, height: 200, color: '#00E676', type: 'portal' });
            entities.current.push({ id: 'finish-platform', position: { x: level.targetDistance * 20 - 50, y: CANVAS_HEIGHT - 100 }, width: 200, height: 20, color: '#3E2723', type: 'branch', biome: level.biome, stability: 999 });
        }
        return;
    }
    const biome = level.biome;
    const difficulty = level.difficulty;
    const routeSpawnProfile = getRouteSpawnProfile(level);
    const routeProgress = routeSpawnProfile.routeProgress;
    const isMicroBranchWindow = routeProgress <= ROUTE_PROFILE_THRESHOLD.microBranchCap;
    const isHelperBranchWindow = routeProgress <= ROUTE_PROFILE_THRESHOLD.helperBranchCap;
    const isHazardBranchWindow = routeProgress <= ROUTE_PROFILE_THRESHOLD.hazardBranchCap;
    const isLateRouteAidWindow = routeProgress <= ROUTE_PROFILE_THRESHOLD.lateRouteAidCap;
    const useLateRouteColorScheme = routeProgress >= ROUTE_PROFILE_THRESHOLD.lateRouteAidCap;
    const isTutorial = level.tutorialType === 'BASIC';
    const isL2Tutorial = level.tutorialType === 'ADVANCED';
    if (biome !== currentBiomeRef.current) {
        currentBiomeRef.current = biome;
        setCurrentBiome(biome);
    }

    const isSwamp = biome === 'SWAMP';
    const isWinter = biome === 'WINTER';
    const isVolcano = biome === 'VOLCANO';
    const isCave = biome === 'CAVE';
    
    const baseHeight = CANVAS_HEIGHT - 150;
    const heightVar = Math.sin(startX * 0.003) * 100; 
    const treeHeight = baseHeight + heightVar + segmentRandomRange(-360, 340);
    
    const treeX = startX + segmentRandomRange(0, 400);

    if (isCave && segmentChance(0.6)) {
        const stalactiteY = -50;
        entities.current.push({ id: `stalactite-${startX}`, position: { x: treeX, y: stalactiteY }, width: 40, height: segmentRandomRange(200, 400), color: '#546E7A', type: 'stalactite', biome, polyPoints: createTreePoly(treeX, 0, 'CAVE') });
        if (segmentChance(0.4)) entities.current.push({ id: `sticky-web-${startX}`, position: { x: treeX + 40, y: stalactiteY + 150 }, width: 100, height: 100, color: 'rgba(255, 255, 255, 0.3)', type: 'web', biome });
    }

    if (startX > STARTER_ZONE_END && segmentChance(0.4) && !isTutorial && !isCave) {
        entities.current.push({ id: `updraft-${startX}`, position: { x: startX, y: CANVAS_HEIGHT + 600 }, width: 80, height: 800, color: 'rgba(255,255,255,0.1)', type: 'updraft', biome });
    }

    if (startX > STARTER_ZONE_END && isSwamp && segmentChance(0.3)) {
        if (segmentChance(0.5)) entities.current.push({ id: `waterfall-${startX}`, position: { x: startX + 100, y: -500 }, width: 60, height: 1500, color: 'rgba(33, 150, 243, 0.4)', type: 'waterfall', biome });
        else entities.current.push({ id: `water_pocket-${startX}`, position: { x: startX + 100, y: CANVAS_HEIGHT - 400 - segmentRandom() * 200 }, width: segmentRandomRange(80, 120), height: segmentRandomRange(80, 120), color: 'rgba(1, 87, 155, 0.7)', type: 'water_pocket', biome });
    }

    let liquidChance = 0.3;
    if (isSwamp) liquidChance = 0.8;
    if (routeProgress >= ROUTE_PROFILE_THRESHOLD.lateRouteAidCap) liquidChance = 0.9;
    
    if (startX > STARTER_ZONE_END && (isSwamp || isVolcano) && segmentChance(liquidChance)) {
        entities.current.push({ id: `fluid-${startX}`, position: { x: startX, y: CANVAS_HEIGHT - 40 }, width: segmentRandomRange(150, 400), height: 40, color: isVolcano ? '#D32F2F' : '#2E7D32', type: 'lake', biome });
        if (isSwamp && segmentChance(0.5)) entities.current.push({ id: `lily-${startX}`, position: { x: startX + segmentRandomRange(50, 100), y: CANVAS_HEIGHT - 45 }, width: 60, height: 10, color: '#81C784', type: 'lilypad', biome });
        if (isVolcano && segmentChance(0.4)) entities.current.push({ id: `magma-rock-${startX}`, position: { x: startX + segmentRandomRange(20, 100), y: CANVAS_HEIGHT - 45 }, width: 50, height: 15, color: '#5D4037', type: 'branch', biome, stability: 60 });
    }
    
    if (!isCave) {
        let trunkColor = isWinter ? '#5D4037' : (isVolcano ? '#212121' : '#3E2723');
        entities.current.push({ id: `trunk-${startX}`, position: { x: treeX - 15, y: CANVAS_HEIGHT - treeHeight }, width: 30, height: treeHeight + 3000, color: trunkColor, type: 'tree', health: 100, biome });

        let canopyColor = THEME_PROFILES[biome].treeColor;
        if (biome === 'AUTUMN') canopyColor = segmentChance(0.5) ? '#D84315' : '#FFAB91';
        if (isVolcano) canopyColor = segmentChance(0.3) ? '#4E342E' : '#3E2723';
        const canopyY = CANVAS_HEIGHT - treeHeight - 80;
        entities.current.push({ id: `canopy-${startX}`, position: { x: treeX - 60, y: canopyY }, width: 120, height: 120, color: canopyColor, type: 'tree', polyPoints: createTreePoly(treeX, CANVAS_HEIGHT - treeHeight + 40, biome), health: 100, biome });
        
        if (segmentChance(0.82)) entities.current.push({ id: `vine-${startX}`, position: { x: treeX + segmentRandomRange(-50, 50), y: canopyY + 56 }, width: 4, height: segmentRandomRange(190, 400), color: '#4CAF50', type: 'vine', biome });
    if (!isTutorial && !isCave && (isLateRouteAidWindow || routeSpawnProfile.allowEarlySupportVines)) {
            entities.current.push({ id: `support-vine-${startX}`, position: { x: treeX + segmentRandomRange(-125, 125), y: canopyY + 24 }, width: 4, height: segmentRandomRange(210, 360), color: '#5ecf75', type: 'vine', biome });
        }
    }

    if (spawnScriptedLevelSegment(level, startX, treeX, routeLinkRef.current?.y ?? null)) {
        return;
    }

    const routeTemplate = getSegmentRouteTemplate(level, startX);

    let numBranches = isTutorial ? 6 : segmentInt(7, 10);
    if (isL2Tutorial) { const d = startX / 20; if (d > 200 && d < 400) numBranches = 5; }
    if (isCave || isSwamp) numBranches += 1;
    if (isMicroBranchWindow) numBranches += 1;
    if (routeTemplate === 'recovery') numBranches += 2;
    if (routeTemplate === 'vertical') numBranches += 1;
    if (routeTemplate === 'hazard' || isHazardBranchWindow) numBranches += 1;
    
    const branchSpread = routeTemplate === 'vertical' ? 460 : biome === 'JUNGLE' ? 680 : 430; 
    const gemAnchors: Vector2[] = [];
    const carriedLaneY = routeLinkRef.current ? clamp(routeLinkRef.current.y + segmentRandomRange(-56, 52), 108, CANVAS_HEIGHT - 175) : null;

    if (carriedLaneY !== null && !isTutorial) {
        const entryBranchWidth = segmentRandomRange(150, 194);
        const entryBranchX = startX + 34;
        const entryBranchY = carriedLaneY + 44;
        entities.current.push({
            id: `entry-branch-${startX}`,
            position: { x: entryBranchX, y: entryBranchY },
            width: entryBranchWidth,
            height: 16,
            color: isVolcano ? '#4c3428' : '#6D4C41',
            type: 'branch',
            biome,
            stability: 88,
            isBroken: false,
        });
        gemAnchors.push({ x: entryBranchX + entryBranchWidth / 2, y: entryBranchY - 24 });

        if (!isCave) {
            entities.current.push({
                id: `entry-vine-${startX}`,
                position: { x: startX + 118, y: clamp(carriedLaneY - 168, 48, CANVAS_HEIGHT - 360) },
                width: 5,
                height: 228,
                color: '#5fcf74',
                type: 'vine',
                biome,
            });
        }
    }

    if ((biome === 'JUNGLE' || biome === 'SWAMP') && (!isTutorial || isMicroBranchWindow)) {
        const lowBranchX = treeX + (segmentChance(0.5) ? 20 : -100);
        const lowBranchY = CANVAS_HEIGHT - 150;
        entities.current.push({ id: `low-branch-${startX}`, position: { x: lowBranchX, y: lowBranchY }, width: 100, height: 15, color: '#5D4037', type: 'branch', biome, stability: 60, isBroken: false });
        gemAnchors.push({ x: lowBranchX + 50, y: lowBranchY - 30 });
    }

    if (!isTutorial && isHelperBranchWindow && !isCave) {
        const helperWidth = segmentRandomRange(136, 182);
        const helperX = carriedLaneY !== null ? startX + 120 + segmentRandomRange(-25, 45) : treeX + segmentRandomRange(-80, 40);
        const helperY = clamp((carriedLaneY ?? (CANVAS_HEIGHT - treeHeight + 170)) + segmentRandomRange(-34, 20), 116, CANVAS_HEIGHT - 170);
        entities.current.push({
            id: `guide-branch-${startX}`,
            position: { x: helperX, y: helperY },
            width: helperWidth,
            height: 16,
            color: '#6D4C41',
            type: 'branch',
            biome,
            stability: 85,
            isBroken: false,
        });
        gemAnchors.push({ x: helperX + helperWidth / 2, y: helperY - 26 });
    }

    if (!isTutorial && routeTemplate === 'vertical') {
        for (let i = 0; i < 3; i++) {
            const guideY = clamp((carriedLaneY ?? (CANVAS_HEIGHT - treeHeight + 220)) + i * 82 + segmentRandomRange(-22, 18), 82, CANVAS_HEIGHT - 120);
            const guideX = treeX + (i % 2 === 0 ? 70 : -160);
            const guideWidth = 100 + i * 18;
            entities.current.push({
                id: `vertical-guide-${startX}-${i}`,
                position: { x: guideX, y: guideY },
                width: guideWidth,
                height: 14,
                color: '#7a5540',
                type: 'branch',
                biome,
                stability: 70,
                isBroken: false,
            });
            gemAnchors.push({ x: guideX + guideWidth / 2, y: guideY - 24 });
        }
    }

    if (!isTutorial && routeTemplate === 'speed' && !isCave) {
        for (let i = 0; i < 3; i++) {
            entities.current.push({
                id: `speed-vine-${startX}-${i}`,
                position: { x: treeX + 112 + i * 118, y: clamp((carriedLaneY ?? (CANVAS_HEIGHT - treeHeight - 10)) - 118 + i * 22, 60, CANVAS_HEIGHT - 320) },
                width: 4,
                height: 220 + i * 30,
                color: '#5fcf74',
                type: 'vine',
                biome,
            });
        }
    }

    if (!isTutorial && !isCave && (isLateRouteAidWindow || routeTemplate === 'hazard' || routeTemplate === 'speed')) {
        const rescueVineX = startX + branchSpread * (routeTemplate === 'speed' ? 0.56 : 0.44);
        const rescueVineY = clamp((carriedLaneY ?? (CANVAS_HEIGHT - treeHeight + 120)) - 192, 16, CANVAS_HEIGHT - 380);
        const rescueBranchY = clamp((carriedLaneY ?? (CANVAS_HEIGHT - treeHeight + 220)) + (routeTemplate === 'vertical' ? 36 : 74), 132, CANVAS_HEIGHT - 165);
        const rescueBranchWidth = segmentRandomRange(124, 172);
        entities.current.push({
            id: `rescue-vine-${startX}`,
            position: { x: rescueVineX, y: rescueVineY },
            width: 5,
            height: 248,
            color: '#66d884',
            type: 'vine',
            biome,
        });
        entities.current.push({
            id: `rescue-branch-${startX}`,
            position: { x: rescueVineX - rescueBranchWidth * 0.35, y: rescueBranchY },
            width: rescueBranchWidth,
            height: 15,
            color: isVolcano ? '#4c3428' : '#72513c',
            type: 'branch',
            biome,
            stability: 78,
            isBroken: false,
        });
        gemAnchors.push({ x: rescueVineX, y: rescueBranchY - 26 });
    }

    for (let b = 0; b < numBranches; b++) {
         const depthStep = branchSpread / (numBranches || 1);
         const depthLevel = b * depthStep;
         const templateWave = routeTemplate === 'vertical' ? Math.sin(b * 1.25) * 36 : routeTemplate === 'speed' ? Math.sin(b * 0.85) * 24 : routeTemplate === 'gem' ? Math.cos(b * 0.9) * 18 : 0;
         const linkedBaseY = carriedLaneY !== null ? carriedLaneY - 148 : CANVAS_HEIGHT - treeHeight + 28;
         const branchY = clamp(linkedBaseY + depthLevel + templateWave + segmentRandomRange(-26, 24), 60, CANVAS_HEIGHT - 68);
         const dir = routeTemplate === 'speed' ? 1 : routeTemplate === 'recovery' && b % 2 === 0 ? -1 : segmentChance(0.5) ? 1 : -1;
         const branchW = routeTemplate === 'speed' ? segmentRandomRange(132, 198) : routeTemplate === 'recovery' ? segmentRandomRange(110, 172) : segmentRandomRange(90, 158);
         const branchX = treeX + (routeTemplate === 'vertical' ? (b % 2 === 0 ? 25 : -branchW + 20) : dir === 1 ? 15 + b * 6 : -branchW + 15 - b * 4); 
         const branchId = `branch-${startX}-${b}`;
         if (branchY > CANVAS_HEIGHT - 50) continue;

         entities.current.push({ id: branchId, position: { x: branchX, y: branchY }, width: branchW, height: 15, color: isVolcano ? '#333' : (isWinter ? '#455A64' : '#4E342E'), type: 'branch', biome, stability: isTutorial ? 999 : routeTemplate === 'recovery' ? 48 : 40, isBroken: false });
         gemAnchors.push({ x: branchX + branchW / 2, y: branchY - segmentRandomRange(24, 52) });
         if (biome === 'JUNGLE' && segmentChance(0.3)) entities.current.push({ id: `flower-${branchId}`, position: { x: branchX + segmentRandomRange(10, branchW-10), y: branchY - 10 }, width: 10, height: 10, color: segmentChance(0.5) ? '#E91E63' : '#9C27B0', type: 'flower', biome });
         if (biome === 'JUNGLE' && segmentChance(0.1) && b < 2) entities.current.push({ id: `nest-${branchId}`, position: { x: branchX + branchW/2 - 15, y: branchY - 15 }, width: 30, height: 15, color: '#795548', type: 'nest', biome });
    }

    if (!isTutorial && isLateRouteAidWindow) {
        const exitGuideX = startX + branchSpread + 70;
        const exitGuideY = clamp((carriedLaneY ?? (CANVAS_HEIGHT - treeHeight + 190)) + (routeTemplate === 'vertical' ? -72 : routeTemplate === 'hazard' ? 24 : -8) + segmentRandomRange(-24, 18), 112, CANVAS_HEIGHT - 175);
        const exitWidth = segmentRandomRange(144, 182);
        entities.current.push({
            id: `exit-branch-${startX}`,
            position: { x: exitGuideX, y: exitGuideY },
            width: exitWidth,
            height: 16,
            color: isVolcano ? '#4c3428' : '#7a5540',
            type: 'branch',
            biome,
            stability: 84,
            isBroken: false,
        });
        gemAnchors.push({ x: exitGuideX + exitWidth / 2, y: exitGuideY - 24 });

        if (!isCave) {
            entities.current.push({
                id: `bailout-vine-${startX}`,
                position: { x: exitGuideX + exitWidth * 0.7, y: clamp(exitGuideY - 176, 36, CANVAS_HEIGHT - 360) },
                width: 5,
                height: 230,
                color: '#58d27d',
                type: 'vine',
                biome,
            });
        }

        routeLinkRef.current = { x: exitGuideX + exitWidth * 0.7, y: exitGuideY - 18 };
    } else {
        routeLinkRef.current = { x: startX + branchSpread * 0.9, y: clamp((carriedLaneY ?? (CANVAS_HEIGHT - treeHeight + 170)) + segmentRandomRange(-34, 28), 108, CANVAS_HEIGHT - 180) };
    }

    const gemCount = Math.min(gemAnchors.length, isTutorial ? 4 : segmentInt(5, 8) + (routeSpawnProfile.includeMidGemBonus ? 1 : 0));
    for (let g = 0; g < gemCount; g++) {
        const anchor = segmentPick(gemAnchors);
        if (!anchor) break;
        entities.current.push({
            id: `coin-${startX}-${g}`,
            position: { x: anchor.x + segmentRandomRange(-24, 24), y: anchor.y + segmentRandomRange(-14, 14) },
            width: 18,
            height: 18,
            color: useLateRouteColorScheme ? '#ffb74d' : biome === 'SWAMP' ? '#7dd3fc' : '#8ef7ff',
            type: 'coin',
            biome,
        });
    }

    const spawnChance = routeSpawnProfile.spawnChance;
    if ((segmentChance(spawnChance) && startX > STARTER_ZONE_END && !isTutorial) || (biome === 'JUNGLE' && startX > STARTER_ZONE_END && segmentChance(0.3) && !isTutorial)) {
      const enemyWeights = buildRouteEnemyWeights(level, routeSpawnProfile.routeProgress, routeTemplate);
      if (enemyWeights.length === 0) return;
      const count = routeSpawnProfile.hasLateThreatWindow
        ? (segmentChance(0.5) ? 3 : 2)
        : routeSpawnProfile.hasMidThreatWindow
        ? (segmentChance(0.45) ? 2 : 1)
        : 1;

      for(let i=0; i<count; i++) {
        const selectedEnemy = pickWeighted(enemyWeights, segmentRandom);
        if (!selectedEnemy) break;
        let enemyType = selectedEnemy.enemyType;

        let pos = { x: startX + segmentRandomRange(100, 300) + (i*50), y: segmentRandomRange(100, 400) };
        let vel = { x: -2, y: 0 };
        let anchorX = 0;

        if (isL2Tutorial) {
            const d = startX / 20;
            if (d > 500 && d < 600) { enemyType = 'bird'; pos.y = CANVAS_HEIGHT - 300; } else continue; 
        }

        if (enemyType === 'spider') {
            pos.x = treeX + (i*30); pos.y = CANVAS_HEIGHT - treeHeight + segmentRandomRange(300, 700); vel.y = 1;
            if (i===0) entities.current.push({ id: `web-${startX}`, position: { x: pos.x - 70, y: pos.y + 50 }, width: 140, height: 140, color: 'rgba(255,255,255,0.4)', type: 'web', biome });
        } else if (enemyType === 'eagle' || enemyType === 'bird') {
            pos.y = segmentRandomRange(40, 300); vel.x = enemyType === 'eagle' ? -3 : -2;
        } else if (enemyType === 'troll') {
            pos.x = startX + segmentRandomRange(100, 300); pos.y = 200; anchorX = pos.x;
        } else if (enemyType === 'bat') {
             pos.y = segmentRandomRange(50, 200); vel.x = -4; vel.y = 2;
        } else if (enemyType === 'slug') {
             const branch = entities.current.find(e => e.type === 'branch' && e.position.x > startX);
             if (branch) { pos.x = branch.position.x + 10; pos.y = branch.position.y - 20; vel.x = 0.5; vel.y = 0; } else continue; 
        } else if (enemyType === 'snake') {
             const branch = entities.current.find(e => e.type === 'branch' && e.position.x > startX);
             if (branch) {
                 pos.x = branch.position.x + branch.width * 0.25;
                 pos.y = branch.position.y - 14;
                 vel.x = 0.9;
                 anchorX = pos.x;
             } else continue;
        } else if (enemyType === 'crocodile') {
             const water = entities.current.find(e => (e.type === 'lake' || e.type === 'water_pocket') && e.position.x > startX);
             if (water) {
                 pos.x = water.position.x + water.width * 0.5;
                 pos.y = water.position.y - 24;
                 vel.x = 1.1;
                 anchorX = pos.x;
             } else continue;
        }

        enemies.current.push({ id: `enemy-${startX}-${i}`, position: pos, velocity: vel, width: enemyType === 'eagle' ? 80 : enemyType === 'troll' ? 50 : enemyType === 'crocodile' ? 64 : enemyType === 'snake' ? 46 : 35, height: enemyType === 'eagle' ? 40 : enemyType === 'troll' ? 60 : enemyType === 'crocodile' ? 28 : enemyType === 'snake' ? 18 : 35, color: '#000', type: 'enemy', enemyType: enemyType, health: 1, anchorY: pos.y, anchorX: anchorX, swingAngle: 0, state: 0, attackTimer: 0, biome });
      }
    }
  };

  const startGameImmediate = useCallback((levelId: number) => {
    clearRecommendationTrace();
    recommendationRunIdRef.current += 1;
    setRecommendationSessionMetrics(EMPTY_RECOMMENDATION_METRICS);
    const level = LEVELS[levelId - 1];
    if (!level || level.id > saveData.maxLevelReached) return;

    launchIntroRef.current = null;
    setLaunchIntro(null);

    musicSessionCounterRef.current += 1;
    currentMusicProfileRef.current = buildSessionMusicProfile(level.biome, level.id, musicSessionCounterRef.current);

    commitSaveData((prev) => ({
        ...prev,
        hasCompletedStoryIntro: true,
        lastSelectedLevelId: levelId,
    }));
    setShowSettings(false);
    setStoryBeatIndex(0);
    setHoveredLevelId(null);
    checkpointRef.current = createInitialCheckpointState();
    checkpointBannerTimerRef.current = 0;
    setCheckpointBanner(null);
    setSelectedLevelId(levelId);
    selectedLevelRef.current = levelId;
    setCurrentBiome(level.biome);
    
    // Reset State
    setScore(0);
    setDistance(0);
    setRunTokens(0);
    setPlayerLives(MAX_LIVES);
    setIsInvincible(false);
    setIsPaused(false);
    setPurchaseReceipt(null);
    setRunCampaignChallengeResult(null);
    setRunFeaturedRouteCupResult(null);
    setGameState(GameState.PLAYING);
    setWeather({ type: level.allowedWeather[0] || 'CLEAR', timer: randomRange(2000, 5000) });
    setSkillChainUI({ active: false, currentScore: 0, multiplier: 1, events: [], timer: 0, rank: 'GROOVIN' });
    runDebriefRef.current = createInitialRunDebrief();
    focusTimerRef.current = 0;
    focusCooldownRef.current = 0;
    currentBiomeRef.current = level.biome;
    playerLivesRef.current = MAX_LIVES;

    // Reset Monkey
    monkey.current = {
      position: { x: 190, y: 360 },
      velocity: { x: 4.2, y: 0 },
      width: 30,
      height: 30,
      rotation: 0,
      isSwinging: false,
      tetherPoint: null,
      ropeLength: 0,
      ropeTargetLength: 0,
      ropeReelVelocity: 0,
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
      causeOfDeath: '',
      grounded: true,
      coyoteTimer: COYOTE_TIME_SECONDS,
      platformDropTimer: 0,
      controlLean: 0,
      grappleCooldown: 0,
      retargetGraceTimer: 0,
      releaseAimDirection: 1,
      releaseTetherPoint: null,
      releaseTetherLength: 0,
      releaseTetherTimer: 0,
      releaseTetherMaxTimer: 0,
      jumpCharges: JUMP_MAX_CHARGES,
      jumpRechargeTimer: 0,
      ropeBreakTimer: 0,
    };

    // Reset Environment
    entities.current = [];
    enemies.current = [];
    particles.current = [];
    floatingTexts.current = [];
    scoreRef.current = 0;
    distanceRef.current = 0;
    runTokensRef.current = 0;
    hudSyncTimerRef.current = 0;
    cameraOffset.current = { x: 0, y: 0 };
    shakeIntensity.current = 0;
    smartTargetRef.current = null;
    skyColorRef.current = [...THEME_PROFILES[level.biome].skyColors];
    routeLinkRef.current = null;
    worldTimeRef.current = 0;
    inputRef.current.isMouseDown = false;
    inputRef.current.mouseGrappleHeld = false;
    inputRef.current.keyboardGrappleHeld = false;
    syncGrappleHoldState();
    inputRef.current.justPressed = false;
    inputRef.current.wheelDelta = 0;
    inputRef.current.keys.left = false;
    inputRef.current.keys.right = false;
    inputRef.current.keys.up = false;
    inputRef.current.keys.down = false;
    setHideTutorialTips(false);
    setRunAchievementUnlocks([]);

    // Reset Tutorial
    if (level.tutorialType !== 'NONE') {
        setTutorial({ active: true, currentStep: level.tutorialType === 'ADVANCED' ? 'L2_INTRO' : 'WELCOME', showBox: false, message: "", timer: level.tutorialType === 'ADVANCED' ? 180 : 0 });
    } else {
        setTutorial({ active: false, currentStep: 'WELCOME', showBox: false, message: "" });
    }

    spawnStarterZone(level);
    spawnCheckpointStructures(level);
    spawnLevelSegment(STARTER_ZONE_END);
    spawnLevelSegment(STARTER_ZONE_END + 500);
  }, [clearRecommendationTrace, commitSaveData, saveData]);

    const queueGameLaunch = useCallback((levelId: number) => {
    const level = LEVELS[levelId - 1];
    if (!level || level.id > saveDataRef.current.maxLevelReached) return;

    setShowSettings(false);
    setIsProgressDrawerOpen(false);
    setGameState(GameState.MENU);
    setIsPaused(false);
    setStoryBeatIndex(0);
    setHoveredLevelId(null);
    menuFocusTransitionRef.current = null;
    menuPanOffsetRef.current = { x: 0, y: 0 };
    menuPanVelocityRef.current = { x: 0, y: 0 };
    menuCameraZoomOffsetRef.current = 0;
    menuCameraControlModeRef.current = 'auto';
    handleSelectLevel(levelId, { focus: true });

    const banner = buildRunIntroBanner(level, saveDataRef.current, communityBoardEntries);
    const launchDelayMs = 5000;
    const nextLaunch: LaunchIntroState = {
      levelId,
      banner,
      endsAtMs: Date.now() + launchDelayMs,
      durationMs: launchDelayMs,
    };

    launchIntroRef.current = nextLaunch;
    setLaunchIntro(nextLaunch);
    setLaunchIntroClockMs(Date.now());
  }, [communityBoardEntries, handleSelectLevel]);

  const launchQueuedGame = useCallback((levelId: number) => {
    launchIntroRef.current = null;
    setLaunchIntro(null);
    startGameImmediate(levelId);
  }, [startGameImmediate]);

  useEffect(() => {
    if (!launchIntro) return undefined;

    const timerId = window.setInterval(() => {
      setLaunchIntroClockMs(Date.now());
    }, 100);

    return () => {
      window.clearInterval(timerId);
    };
  }, [launchIntro]);

  useEffect(() => {
    if (!launchIntro) return;
    if (launchIntroClockMs < launchIntro.endsAtMs) return;
    launchQueuedGame(launchIntro.levelId);
  }, [launchIntro, launchIntroClockMs, launchQueuedGame]);

  const acceptSharedRouteChallenge = useCallback(
      (levelId: number) => {
      const level = LEVELS.find((entry) => entry.id === levelId);
      if (!level || level.id > saveData.maxLevelReached) {
          setSaveRecoveryNotice('Complete route unlock progression before accepting this challenge.');
          return;
      }

          clearRecommendationTrace();
          setIncomingRouteChallenge(null);
          queueGameLaunch(levelId);
      },
      [clearRecommendationTrace, queueGameLaunch, saveData.maxLevelReached, setSaveRecoveryNotice],
  );

  const handleGameOver = useCallback((isWin: boolean) => {
    if (!isWin) cashOutSkillChain('BANK');
    const currentState = isWin ? GameState.LEVEL_COMPLETE : GameState.GAME_OVER;
    appendRecommendationRunHistory(recommendationRunIdRef.current, recommendationSessionMetricsRef.current, isWin ? 'win' : 'fail');
    setGameState(currentState);
    if (!isMutedRef.current) {
        if (isWin) {
            SoundSynth.playCoin();
            setTimeout(() => SoundSynth.playTone(980, 'triangle', 0.16, 0.05), 40);
            setTimeout(() => SoundSynth.playTone(1320, 'sine', 0.22, 0.04), 100);
        } else {
            SoundSynth.playCrash();
        }
    }
    
    const newTotalTokens = saveDataRef.current.totalTokens + runTokensRef.current;
    const newHighScore = Math.max(saveDataRef.current.highScore, scoreRef.current);
    const levelId = selectedLevelRef.current;
    const level = LEVELS[levelId - 1];
    if (!level) return;
    const elapsedMs = Math.round(worldTimeRef.current * 1000);
    const priorHighestUnlocked = Math.min(saveDataRef.current.maxLevelReached, LEVELS.length);
    const priorChallenge = buildCampaignChallenge(
      saveDataRef.current,
      priorHighestUnlocked,
      communityBoardEntries,
    );
    const priorFeaturedCup = buildFeaturedRouteCup(
      saveDataRef.current,
      priorHighestUnlocked,
      communityBoardEntries,
    );
    const priorLevelResult = saveDataRef.current.levelResults[String(levelId)] ?? createEmptyLevelResult();
    const clearStars = isWin ? computeLevelStars(level, elapsedMs, playerLivesRef.current) : priorLevelResult.stars;
    const nextLevelResult = {
      ...priorLevelResult,
      bestScore: Math.max(priorLevelResult.bestScore, scoreRef.current),
      bestTimeMs: isWin
        ? priorLevelResult.bestTimeMs === null
          ? elapsedMs
          : Math.min(priorLevelResult.bestTimeMs, elapsedMs)
        : priorLevelResult.bestTimeMs,
      firstClearedAt: isWin ? priorLevelResult.firstClearedAt ?? new Date().toISOString() : priorLevelResult.firstClearedAt,
      stars: Math.max(priorLevelResult.stars, clearStars),
      clears: priorLevelResult.clears + (isWin ? 1 : 0),
    };
    const nextRunHistoryEntry = createRunHistoryEntry(
        level,
        isWin,
        elapsedMs,
        scoreRef.current,
        runTokensRef.current,
        playerLivesRef.current,
    );

    const nextComputedLevelResults = {
      ...saveDataRef.current.levelResults,
      [String(levelId)]: nextLevelResult,
    };
    const nextComputedRunHistory = buildRunHistoryArchive([
      nextRunHistoryEntry,
      ...saveDataRef.current.runHistory,
    ]);
    const nextComputedMaxLevel =
      isWin && levelId === saveDataRef.current.maxLevelReached && saveDataRef.current.maxLevelReached < LEVELS.length
        ? saveDataRef.current.maxLevelReached + 1
        : saveDataRef.current.maxLevelReached;
    const computedAchievements = resolveMenuAchievements(
      {
        ...saveDataRef.current,
        totalTokens: newTotalTokens,
        highScore: newHighScore,
        maxLevelReached: nextComputedMaxLevel,
        levelResults: nextComputedLevelResults,
        runHistory: nextComputedRunHistory,
      },
      communityBoardEntries,
    );
    const previousAchievementIds = new Set(saveDataRef.current.achievements);
    const nextAchievementIds = computedAchievements.filter((achievement) => achievement.unlocked).map((achievement) => achievement.id);
    const newlyUnlockedAchievements = computedAchievements
      .filter((achievement) => achievement.unlocked && !previousAchievementIds.has(achievement.id))
      .map(({ id, title, detail, progress }) => ({ id, title, detail, progress }));

    setRunAchievementUnlocks(newlyUnlockedAchievements);

    if (isWin) {
        const player = monkey.current;
        spawnFloatingText(player.position.x, player.position.y - 72, 'ROUTE SECURED', '#fef08a', 28);
        spawnParticles(player.position.x, player.position.y - 10, '#fef08a', 28, 3.6, 'spark');
        spawnParticles(player.position.x + 10, player.position.y + 4, '#a7f3d0', 20, 3.2, 'wind');
        spawnParticles(player.position.x - 8, player.position.y + 20, '#ffffff', 10, 2.4, 'spark');
        addShake(12);
    }
    
    commitSaveData(prev => ({
        ...prev,
        totalTokens: newTotalTokens,
        achievements: nextAchievementIds,
        highScore: newHighScore,
        runHistory: nextComputedRunHistory,
        maxLevelReached: isWin && levelId === prev.maxLevelReached && prev.maxLevelReached < LEVELS.length
            ? prev.maxLevelReached + 1
            : prev.maxLevelReached,
        levelResults: {
            ...prev.levelResults,
            [String(levelId)]: nextLevelResult,
        },
    }));
    const nextMaxLevel =
      isWin && levelId === saveDataRef.current.maxLevelReached && saveDataRef.current.maxLevelReached < LEVELS.length
        ? saveDataRef.current.maxLevelReached + 1
        : saveDataRef.current.maxLevelReached;
    const postChallenge = buildCampaignChallenge(
      {
        ...saveDataRef.current,
        highScore: newHighScore,
        maxLevelReached: nextMaxLevel,
        totalTokens: newTotalTokens,
        levelResults: {
          ...saveDataRef.current.levelResults,
          [String(levelId)]: nextLevelResult,
        },
      },
      Math.min(nextMaxLevel, LEVELS.length),
      communityBoardEntries,
    );
    const postFeaturedCup = buildFeaturedRouteCup(
      {
        ...saveDataRef.current,
        highScore: newHighScore,
        maxLevelReached: nextMaxLevel,
        totalTokens: newTotalTokens,
        levelResults: {
          ...saveDataRef.current.levelResults,
          [String(levelId)]: nextLevelResult,
        },
        runHistory: nextComputedRunHistory,
      },
      Math.min(nextMaxLevel, LEVELS.length),
      communityBoardEntries,
    );
    const featuredCupOutcome = buildFeaturedRouteCupRunOutcome(
      levelId,
      isWin,
      priorFeaturedCup,
      postFeaturedCup,
    );
    const completedChallenge = priorChallenge.levelId === null
      ? priorChallenge.progress < priorChallenge.target && postChallenge.progress >= postChallenge.target
      : priorChallenge.levelId === postChallenge.levelId
      ? priorChallenge.progress < priorChallenge.target && postChallenge.progress >= postChallenge.target
      : false;
    setRunCampaignChallengeResult(
      completedChallenge
        ? {
            title: `Campaign objective complete: ${priorChallenge.title}`,
            description: `${priorChallenge.note} Objective progress advanced from ${priorChallenge.progress}/${priorChallenge.target} to ${postChallenge.progress}/${postChallenge.target}.`,
            tone: priorChallenge.tone,
          }
        : null,
    );
    setRunFeaturedRouteCupResult(featuredCupOutcome);

  }, [appendRecommendationRunHistory, commitSaveData, communityBoardEntries, isMuted]);

  const takeDamage = (amount: number, cause: string = "Collision") => {
    const player = monkey.current;
    if (isInvincible || player.invulnerableTime > 0) return;
    const hasCheckpoint = Boolean(checkpointRef.current.respawnPosition);
    const damageAmount = hasCheckpoint ? Math.min(amount, 1) : amount;

    if (player.armorStack > 0) {
        player.armorStack--;
        spawnFloatingText(player.position.x, player.position.y, "ARMOR BROKE!", "#999", 20);
        addShake(5);
        if (!isMutedRef.current) SoundSynth.playCrash();
        player.invulnerableTime = INVULNERABILITY_TIME;
        return;
    }

    player.lives = Math.max(0, player.lives - damageAmount);
    runDebriefRef.current.hazardHits += 1;
    playerLivesRef.current = player.lives;
    setPlayerLives(player.lives);
    addShake(10);
    player.invulnerableTime = INVULNERABILITY_TIME;
    
    if (player.lives <= 0) {
        player.causeOfDeath = cause;
        handleGameOver(false);
    } else {
        spawnFloatingText(player.position.x, player.position.y, "OUCH!", "#D50000", 30);
        if (!isMutedRef.current) SoundSynth.playCrash();
        if (checkpointRef.current.respawnPosition) {
            respawnFromCheckpoint(cause);
        }
    }
  };

  const getKeyPressure = (pressed: boolean, heldSeconds: number) => pressed ? clamp(heldSeconds / 0.22, 0.18, 1) : 0;
  const getMoveDirection = () => getKeyPressure(inputRef.current.keys.right, inputRef.current.keyHold.right) - getKeyPressure(inputRef.current.keys.left, inputRef.current.keyHold.left);
  const getSwingDriveInput = () => getKeyPressure(inputRef.current.keys.right, inputRef.current.keyHold.right);
  const getSwingBrakeInput = () => getKeyPressure(inputRef.current.keys.left, inputRef.current.keyHold.left);
  const getSwingControlIntent = () => getSwingDriveInput() - getSwingBrakeInput() * 0.82;
  const getTravelDirection = () => {
      const player = monkey.current;
      if (Math.abs(player.velocity.x) > 0.2) return Math.sign(player.velocity.x);
      if (player.isSwinging && player.tetherPoint) return Math.sign((player.position.x + player.width / 2) - player.tetherPoint.x) || 1;
      if (player.retargetGraceTimer > 0) return player.releaseAimDirection || 1;
      return getMoveDirection() || 1;
  };
  const getGrappleRadius = () =>
      GRAPPLE_ASSIST_RADIUS +
      saveDataRef.current.upgrades.castRange * 65 +
      saveDataRef.current.upgrades.ropeLength * 12 +
      saveDataRef.current.upgrades.feverDuration * 18;
  const isAnchorEntity = (entity: Entity) => entity.type === 'tree' || entity.type === 'branch' || entity.type === 'vine' || entity.type === 'stalactite';
  const getAnchorCandidatesForEntity = (entity: Entity, hint?: Vector2): Vector2[] => {
      const player = monkey.current;
      const playerCenterX = player.position.x + player.width / 2;
      const playerCenterY = player.position.y + player.height / 2;
      const directionalBias = hint ? Math.sign(hint.x - playerCenterX) || getMoveDirection() || Math.sign(player.velocity.x) || 1 : getMoveDirection() || Math.sign(player.velocity.x) || 1;

      if (entity.type === 'vine' || entity.type === 'stalactite') {
          const x = entity.position.x + entity.width / 2;
          const top = entity.position.y + 18;
          const mid = entity.position.y + entity.height * 0.46;
          const low = entity.position.y + entity.height - 20;
          return [
              { x, y: top },
              { x, y: clamp(hint?.y ?? mid, top, low) },
              { x, y: mid },
              { x, y: low },
          ];
      }

      if (entity.type === 'branch') {
          const edgePadding = Math.min(22, entity.width * 0.18);
          const y = entity.position.y + entity.height / 2;
          return [
              { x: entity.position.x + edgePadding, y },
              { x: entity.position.x + entity.width * 0.5, y: y - 2 },
              { x: entity.position.x + entity.width - edgePadding, y },
          ];
      }

      const anchorY = clamp(hint?.y ?? playerCenterY - 24, entity.position.y + 24, entity.position.y + Math.min(entity.height - 24, 280));
      return [
          { x: entity.position.x + entity.width * 0.28, y: clamp(anchorY - 12, entity.position.y + 26, entity.position.y + Math.min(entity.height - 20, 270)) },
          { x: entity.position.x + entity.width * 0.5, y: anchorY },
          { x: entity.position.x + entity.width * 0.72, y: clamp(anchorY - 12, entity.position.y + 26, entity.position.y + Math.min(entity.height - 20, 270)) },
          { x: directionalBias >= 0 ? entity.position.x + entity.width * 0.76 : entity.position.x + entity.width * 0.24, y: clamp(anchorY + 18, entity.position.y + 40, entity.position.y + Math.min(entity.height - 18, 280)) },
      ];
  };

  const getAnchorPointForEntity = (entity: Entity, hint?: Vector2): Vector2 => {
      const candidates = getAnchorCandidatesForEntity(entity, hint);
      if (candidates.length === 0) return { x: entity.position.x, y: entity.position.y };
      if (!hint) {
          const dir = getMoveDirection() || Math.sign(monkey.current.velocity.x) || 1;
          return candidates.reduce((best, candidate) => (
              dir >= 0 ? (candidate.x > best.x ? candidate : best) : (candidate.x < best.x ? candidate : best)
          ));
      }
      return candidates.reduce((best, candidate) => (
          Math.hypot(candidate.x - hint.x, candidate.y - hint.y) < Math.hypot(best.x - hint.x, best.y - hint.y) ? candidate : best
      ));
  };

  const findSmartTarget = (mouseX: number, mouseY: number): GrappleTarget | null => {
     const player = monkey.current;
     const playerCenterX = player.position.x + player.width / 2;
     const playerCenterY = player.position.y + player.height / 2;
     let bestTarget: GrappleTarget | null = null;
     let bestScore = Number.POSITIVE_INFINITY;
     const preferredDirection = getTravelDirection();
     const radius = getGrappleRadius() + (player.retargetGraceTimer > 0 ? 86 + saveDataRef.current.upgrades.feverDuration * 14 : 0);

     entities.current.forEach(entity => {
         if (!isAnchorEntity(entity)) return;
         for (const anchor of getAnchorCandidatesForEntity(entity, { x: mouseX, y: mouseY })) {
             if (player.tetherPoint && Math.hypot(anchor.x - player.tetherPoint.x, anchor.y - player.tetherPoint.y) < 18) continue;
             const pointerDist = Math.hypot(anchor.x - mouseX, anchor.y - mouseY);
             const playerDist = Math.hypot(anchor.x - playerCenterX, anchor.y - playerCenterY);
             if (playerDist > radius) continue;
             const dx = anchor.x - playerCenterX;
             const dy = anchor.y - playerCenterY;
             const directAimBonus = Math.abs(anchor.x - mouseX) < 28 ? 10 : 0;
             const vineBonus = entity.type === 'vine' ? 34 : entity.type === 'branch' ? 16 : 7;
             const forwardBonus = preferredDirection >= 0 ? Math.max(0, dx) * 0.06 : Math.max(0, -dx) * 0.06;
             const reversePenalty = preferredDirection >= 0 ? Math.max(0, -dx) * 0.22 : Math.max(0, dx) * 0.22;
             const verticalBonus = dy < 0 ? Math.min(16, Math.abs(dy) * 0.05) : 0;
             const recoveryBonus = isRecoveryAnchorEntity(entity) ? 18 : 0;
             const score = pointerDist * 0.72 + playerDist * 0.18 + reversePenalty - vineBonus - directAimBonus - forwardBonus - verticalBonus - recoveryBonus;
             if (score < bestScore) {
                 bestScore = score;
                 bestTarget = { entity, anchor };
             }
         }
     });
     return bestTarget;
  };

  const findKeyboardSwingTarget = (): GrappleTarget | null => {
      const player = monkey.current;
      const playerCenterX = player.position.x + player.width / 2;
      const playerCenterY = player.position.y + player.height / 2;
      const desiredDirection = getTravelDirection();
      let bestTarget: GrappleTarget | null = null;
      let bestScore = Number.POSITIVE_INFINITY;
      const radius = getGrappleRadius() + (player.retargetGraceTimer > 0 ? 74 + saveDataRef.current.upgrades.feverDuration * 12 : 0);

      entities.current.forEach(entity => {
          if (!isAnchorEntity(entity)) return;
          for (const anchor of getAnchorCandidatesForEntity(entity)) {
              if (player.tetherPoint && Math.hypot(anchor.x - player.tetherPoint.x, anchor.y - player.tetherPoint.y) < 18) continue;
              const dx = anchor.x - playerCenterX;
              const dy = anchor.y - playerCenterY;
              const dist = Math.hypot(dx, dy);
              if (dist > radius) continue;

              const directionPenalty = desiredDirection >= 0 ? Math.max(0, -dx) * 0.18 : Math.max(0, dx) * 0.18;
              const verticalPenalty = dy > 240 ? 26 : dy < -360 ? 8 : 0;
              const anchorBonus = entity.type === 'vine' ? -34 : entity.type === 'branch' ? -14 : -4;
              const upperBonus = dy < 0 ? -8 : 0;
              const recoveryBonus = isRecoveryAnchorEntity(entity) ? -16 : 0;
              const score = dist + directionPenalty + verticalPenalty + anchorBonus + upperBonus + recoveryBonus;

              if (score < bestScore) {
                  bestScore = score;
                  bestTarget = { entity, anchor };
              }
          }
      });

      return bestTarget;
  };

  const findMouseSwingTarget = (mouseX: number, mouseY: number): GrappleTarget | null => {
      let target = findSmartTarget(mouseX, mouseY);
      if (target) return target;

      entities.current.forEach(ent => {
          if (target || !isAnchorEntity(ent)) return;
          for (const anchor of getAnchorCandidatesForEntity(ent, { x: mouseX, y: mouseY })) {
              const dist = Math.hypot(anchor.x - mouseX, anchor.y - mouseY);
              if (dist < 128) {
                  target = { entity: ent, anchor };
                  break;
              }
          }
      });

      return target ?? findKeyboardSwingTarget();
  };

  const startSwing = (target: GrappleTarget | null) => {
      const player = monkey.current;
      if (!target || player.isSwinging || player.grappleCooldown > 0) return;
      const centerX = player.position.x + player.width / 2;
      const centerY = player.position.y + player.height / 2;
      const swingDirection = Math.sign(target.anchor.x - centerX) || getMoveDirection() || Math.sign(player.velocity.x) || 1;
      const engageBoost = 0.74 + saveDataRef.current.upgrades.swingForce * 0.18 + player.runForceBonus * 0.05;
      player.tetherPoint = { ...target.anchor };
      player.isSwinging = true;
      player.grounded = false;
      player.coyoteTimer = 0;
      player.retargetGraceTimer = 0;
      player.releaseTetherPoint = null;
      player.releaseTetherLength = 0;
      player.releaseTetherTimer = 0;
      player.releaseTetherMaxTimer = 0;
      const ropeReachBonus = saveDataRef.current.upgrades.ropeLength * 12;
      player.ropeLength = Math.max(92, Math.hypot(centerX - player.tetherPoint.x, centerY - player.tetherPoint.y) * 0.9 + ropeReachBonus);
      player.ropeTargetLength = player.ropeLength;
      player.ropeReelVelocity = 0;
      player.ropeTimer = ROPE_BREAK_TIME_SECONDS + (saveDataRef.current.upgrades.ropeLength * 0.5) + saveDataRef.current.upgrades.grip * 0.35;
      player.velocity.x += swingDirection * engageBoost;
      player.velocity.y = Math.min(player.velocity.y - 0.55, -1.35);
      if (!isMutedRef.current) SoundSynth.playGrapple();
      const tutorialState = tutorialRef.current;
      if (tutorialState.active && (tutorialState.currentStep === 'GRAPPLE' || tutorialState.currentStep === 'L2_BRANCH')) updateTutorial(1);
  };

  const releaseSwing = () => {
      const player = monkey.current;
      if (!player.isSwinging || !player.tetherPoint) return;
      const centerX = player.position.x + player.width / 2;
      const centerY = player.position.y + player.height / 2;
      const dx = centerX - player.tetherPoint.x;
      const dy = centerY - player.tetherPoint.y;
      const dist = Math.max(0.001, Math.hypot(dx, dy));
      const tangentA = { x: -dy / dist, y: dx / dist };
      const tangentB = { x: dy / dist, y: -dx / dist };
      const dotA = player.velocity.x * tangentA.x + player.velocity.y * tangentA.y;
      const tangent = dotA >= 0 ? tangentA : tangentB;
      const tangentialSpeed = Math.max(0, player.velocity.x * tangent.x + player.velocity.y * tangent.y);
      const baseLaunch = 1.45 + saveDataRef.current.upgrades.swingForce * 0.18 + saveDataRef.current.upgrades.launchBoost * 0.4;
      const preservedLaunch = tangentialSpeed * (1.028 + saveDataRef.current.upgrades.launchBoost * 0.026 + saveDataRef.current.upgrades.airControl * 0.012);
      const radialCarry = Math.min(0, player.velocity.x * (dx / dist) + player.velocity.y * (dy / dist));
      const inputDirection = getSwingDriveInput() - getSwingBrakeInput() * 0.75;
      const directionalBias = inputDirection * (0.95 + saveDataRef.current.upgrades.airControl * 0.16);
      const upBias = inputRef.current.keyHold.up > 0 ? 0.9 + inputRef.current.keyHold.up * 0.65 : 0;
      const downBias = inputRef.current.keyHold.down > 0 ? 0.35 + inputRef.current.keyHold.down * 0.3 : 0;
      const releaseSpeed = Math.max(9.2, preservedLaunch + baseLaunch);
      const releaseTimer = RELEASE_RETRACT_TIME_SECONDS + Math.min(0.08, tangentialSpeed * 0.003);

      player.isSwinging = false;
      player.releaseTetherPoint = { ...player.tetherPoint };
      player.releaseTetherLength = dist;
      player.releaseTetherTimer = releaseTimer;
      player.releaseTetherMaxTimer = releaseTimer;
      player.tetherPoint = null;
      player.ropeTargetLength = 0;
      player.ropeReelVelocity = 0;
      player.retargetGraceTimer = RETARGET_GRACE_SECONDS + saveDataRef.current.upgrades.feverDuration * 0.04;
      player.releaseAimDirection = Math.sign(tangent.x) || Math.sign(player.velocity.x) || 1;
      player.grounded = false;
      player.coyoteTimer = 0;
      player.grappleCooldown = 0.04;
      player.velocity.x = tangent.x * releaseSpeed + (dx / dist) * radialCarry * 0.2 + directionalBias;
      player.velocity.y = tangent.y * releaseSpeed + (dy / dist) * radialCarry * 0.2 - upBias + downBias;
      if (!isMutedRef.current) SoundSynth.playRelease();
      const tutorialState = tutorialRef.current;
      if (tutorialState.active && tutorialState.currentStep === 'SWING') updateTutorial(1);
  };

  const retargetSwing = (target: GrappleTarget | null) => {
      const player = monkey.current;
      if (!player.isSwinging || !player.tetherPoint || !target) return false;
      if (Math.hypot(target.anchor.x - player.tetherPoint.x, target.anchor.y - player.tetherPoint.y) < 18) return false;

      const centerX = player.position.x + player.width / 2;
      const centerY = player.position.y + player.height / 2;
      const dx = centerX - target.anchor.x;
      const dy = centerY - target.anchor.y;
      const dist = Math.max(0.001, Math.hypot(dx, dy));
      const nx = dx / dist;
      const ny = dy / dist;
      const radialVelocity = player.velocity.x * nx + player.velocity.y * ny;
      const ropeReachBonus = saveDataRef.current.upgrades.ropeLength * 10;

      player.tetherPoint = { ...target.anchor };
      player.releaseTetherPoint = null;
      player.releaseTetherLength = 0;
      player.releaseTetherTimer = 0;
      player.releaseTetherMaxTimer = 0;
      player.ropeLength = clamp(Math.max(104, dist * 0.95 + ropeReachBonus), 92, Math.max(190 + ropeReachBonus, dist + 58 + ropeReachBonus));
      player.ropeTargetLength = player.ropeLength;
      player.ropeReelVelocity *= 0.35;
      player.retargetGraceTimer = 0;
      player.grappleCooldown = 0.03;

      if (radialVelocity > 0) {
          player.velocity.x -= nx * radialVelocity * 0.55;
          player.velocity.y -= ny * radialVelocity * 0.55;
      }
      player.velocity.y = Math.min(player.velocity.y - 0.25, player.velocity.y);
      if (!isMutedRef.current) SoundSynth.playGrapple();
      return true;
  };

  const extendSwingRope = useCallback(() => {
      const player = monkey.current;
      if (!player.isSwinging || !player.tetherPoint) return false;

      const ropeReachBonus = saveDataRef.current.upgrades.ropeLength * 12;
      const maxRopeLength = Math.max(220 + ropeReachBonus, player.ropeLength + 120 + saveDataRef.current.upgrades.castRange * 16);
      const extension = 34 + saveDataRef.current.upgrades.ropeLength * 6 + saveDataRef.current.upgrades.castRange * 4;
      player.ropeTargetLength = clamp(player.ropeTargetLength + extension, player.ropeLength, maxRopeLength);
      player.ropeReelVelocity = Math.max(player.ropeReelVelocity, 2.4);
      spawnFloatingText(player.position.x - 12, player.position.y - 26, 'REEL OUT', '#a7f3d0', 16);
      spawnParticles(player.position.x + 15, player.position.y + 12, '#bbf7d0', 8, 2, 'spark');
      return true;
  }, []);

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
      const biome = currentBiomeRef.current;
      const camX = cameraOffset.current.x;
      const camY = cameraOffset.current.y;
      const monsoonFlow = (biome === 'JUNGLE' || biome === 'SWAMP') && (type === 'RAIN' || type === 'WINDY');
      
      if (type === 'RAIN' || biome === 'SWAMP') {
          if (Math.random() < 0.3) particles.current.push({ position: { x: camX + Math.random() * CANVAS_WIDTH + 200, y: camY - 100 }, velocity: { x: -5, y: 15 + Math.random() * 5 }, life: 60, maxLife: 60, color: '#4FC3F7', size: 2, type: 'rain' });
          if (Math.random() < 0.12) particles.current.push({ position: { x: camX + Math.random() * CANVAS_WIDTH, y: camY + randomRange(120, CANVAS_HEIGHT - 80) }, velocity: { x: 0.2 + Math.random() * 0.4, y: -0.1 - Math.random() * 0.25 }, life: 120, maxLife: 120, color: '#d7ff9e', size: 2 + Math.random() * 2, type: 'spore' });
          if (monsoonFlow && Math.random() < 0.18) particles.current.push({ position: { x: camX - 80, y: camY + randomRange(40, CANVAS_HEIGHT - 40) }, velocity: { x: 12 + Math.random() * 6, y: -1 + Math.random() * 2 }, life: 38, maxLife: 38, color: 'rgba(196,255,232,0.12)', size: 28 + Math.random() * 26, type: 'wind' });
          if (monsoonFlow && Math.random() < 0.12) particles.current.push({ position: { x: camX + Math.random() * CANVAS_WIDTH, y: camY + randomRange(30, CANVAS_HEIGHT - 120) }, velocity: { x: 0.8 + Math.random() * 1.6, y: 0.3 + Math.random() * 0.5 }, life: 90, maxLife: 90, color: 'rgba(141, 211, 148, 0.7)', size: 3 + Math.random() * 2, type: 'leaf' });
      } else if (biome === 'JUNGLE') {
          if (Math.random() < 0.18) particles.current.push({ position: { x: camX + Math.random() * CANVAS_WIDTH, y: camY + randomRange(40, CANVAS_HEIGHT - 120) }, velocity: { x: 0.1 + Math.random() * 0.35, y: -0.08 - Math.random() * 0.2 }, life: 130, maxLife: 130, color: '#aef9dd', size: 2 + Math.random() * 2.5, type: 'spore' });
      } else if (biome === 'WINTER') {
           if (Math.random() < 0.2) particles.current.push({ position: { x: camX + Math.random() * CANVAS_WIDTH, y: camY - 100 }, velocity: { x: Math.random() * 2 - 1, y: 2 + Math.random() }, life: 120, maxLife: 120, color: '#FFF', size: 3, type: 'snow' });
      } else if (biome === 'VOLCANO') {
          if (Math.random() < 0.2) particles.current.push({ position: { x: camX + Math.random() * CANVAS_WIDTH, y: camY + CANVAS_HEIGHT }, velocity: { x: Math.random() * 2 - 1, y: -(1 + Math.random()) }, life: 120, maxLife: 120, color: '#9E9E9E', size: 3, type: 'ash' });
          if (Math.random() < 0.16) particles.current.push({ position: { x: camX + Math.random() * CANVAS_WIDTH, y: camY + CANVAS_HEIGHT - 40 }, velocity: { x: Math.random() * 0.8 - 0.4, y: -(1.8 + Math.random() * 1.2) }, life: 80, maxLife: 80, color: '#FFB74D', size: 2 + Math.random() * 2, type: 'spore' });
      } else if (type === 'WINDY') {
           if (Math.random() < 0.1) particles.current.push({ position: { x: camX - 100, y: camY + Math.random() * CANVAS_HEIGHT }, velocity: { x: 15 + Math.random() * 5, y: Math.random() * 2 - 1 }, life: 60, maxLife: 60, color: 'rgba(255,255,255,0.1)', size: 40, type: 'wind' });
      }
  };

  const drawMapLobby = (ctx: CanvasRenderingContext2D) => {
     const now = performance.now();
     const storyBeat = gameStateRef.current === GameState.STORY_MAP ? INTRO_STORY_SEQUENCE.beats[storyBeatIndexRef.current] : null;
     const storyRegion = storyBeat ? MAP_REGION_LOOKUP.get(storyBeat.regionId) ?? null : null;
     const selectedLevel = selectedLevelId !== null ? LEVELS[selectedLevelId - 1] ?? null : null;
     const selectedRegion = selectedLevel ? getMapRegionForLevel(selectedLevel.id) : MAP_REGION_LOOKUP.get('floodline-rise') ?? null;
     const focusRegion = storyRegion ?? selectedRegion ?? MAP_REGION_LOOKUP.get('floodline-rise') ?? null;
     const presentation = getEffectiveDisplaySettings(saveData.settings);
     const atlasQuality = atlasPerformanceRef.current.quality;
     const highestUnlockedLevel = Math.min(saveData.maxLevelReached, LEVELS.length);
     const routeRivalMarkers = buildRouteRivalMarkers(
         saveData.runHistory,
         communityBoardEntries,
         highestUnlockedLevel,
         campaignChallenge.levelId,
     );
     const storyRevealLevel = storyBeat?.revealLevels?.[storyBeat.revealLevels.length - 1] ?? storyBeat?.focusLevelId ?? LEVELS.length;
     const storyHighlights = new Set(storyBeat?.highlightLevelIds ?? []);
     const mapClarity = saveData.settings.mapClarity;
     const densityMode = saveData.settings.visualDensity;
     const shouldFollowSelectedLevel =
        gameStateRef.current !== GameState.STORY_MAP &&
        menuCameraControlModeRef.current === 'auto';
     const selectedTarget = shouldFollowSelectedLevel && selectedLevel ? getMenuCameraTargetForLevel(selectedLevel.id) : null;

     if (gameStateRef.current !== GameState.PLAYING && !menuDragRef.current.active) {
         menuPanOffsetRef.current.x += menuPanVelocityRef.current.x;
         menuPanOffsetRef.current.y += menuPanVelocityRef.current.y;
         menuPanOffsetRef.current = clampMenuPanOffset(menuPanOffsetRef.current);
         menuPanVelocityRef.current.x *= MENU_DRAG_FRICTION;
         menuPanVelocityRef.current.y *= MENU_DRAG_FRICTION;
         if (Math.abs(menuPanVelocityRef.current.x) < 0.01) menuPanVelocityRef.current.x = 0;
         if (Math.abs(menuPanVelocityRef.current.y) < 0.01) menuPanVelocityRef.current.y = 0;
     }

     let cameraTarget = selectedTarget ?? getMenuCameraTargetFromState(
        gameStateRef.current,
        shouldFollowSelectedLevel ? selectedLevelId ?? selectedLevelRef.current : null,
        storyBeat ?? INTRO_STORY_SEQUENCE.beats[0],
     );
     if (gameStateRef.current === GameState.STORY_MAP) {
         const transition = storyCameraTransitionRef.current;
         const progress = transition.durationMs > 0 ? clamp((now - transition.startTime) / transition.durationMs, 0, 1) : 1;
         const eased = easeValue(progress, transition.easing);
         cameraTarget = {
             x: lerpNumber(transition.from.x, transition.to.x, eased),
             y: lerpNumber(transition.from.y, transition.to.y, eased),
             zoom: lerpNumber(transition.from.zoom, transition.to.zoom, eased),
         };
     } else if (gameStateRef.current !== GameState.PLAYING && menuFocusTransitionRef.current) {
         const transition = menuFocusTransitionRef.current;
         const progress = transition.durationMs > 0 ? clamp((now - transition.startTime) / transition.durationMs, 0, 1) : 1;
         const eased = easeValue(progress, 'easeInOut');
         const travelDistance = Math.hypot(transition.to.x - transition.from.x, transition.to.y - transition.from.y);
         const zoomPullback = Math.sin(progress * Math.PI) * Math.min(0.08, travelDistance / 5200);
         cameraTarget = {
             x: lerpNumber(transition.from.x, transition.to.x, eased),
             y: lerpNumber(transition.from.y, transition.to.y, eased),
             zoom: lerpNumber(transition.from.zoom, transition.to.zoom, eased) - zoomPullback,
         };
         if (progress >= 1) menuFocusTransitionRef.current = null;
     } else if (!selectedTarget && presentation.mapCameraStyle !== 'steady' && presentation.menuParallax === 'on') {
         const motionFactor = presentation.mapCameraStyle === 'dynamic' ? 1 : 0.55;
         cameraTarget = {
             x: cameraTarget.x + Math.sin(now * 0.00026) * 14 * motionFactor,
             y: cameraTarget.y + Math.cos(now * 0.00021 + 1.2) * 8 * motionFactor,
             zoom: cameraTarget.zoom + Math.sin(now * 0.00019 + 0.3) * 0.012 * motionFactor,
         };
     }

     cameraTarget = clampMenuCameraTarget({
         x: cameraTarget.x + menuPanOffsetRef.current.x,
         y: cameraTarget.y + menuPanOffsetRef.current.y,
         zoom: clamp(cameraTarget.zoom + menuCameraZoomOffsetRef.current, MENU_CAMERA_MIN_ZOOM, MENU_CAMERA_MAX_ZOOM),
     });

     const cameraLerp = gameStateRef.current === GameState.STORY_MAP ? 0.34 : menuFocusTransitionRef.current ? 0.32 : selectedTarget ? 0.24 : presentation.mapCameraStyle === 'steady' ? 0.2 : 0.18;
     menuMapCameraRef.current = {
        x: lerpNumber(menuMapCameraRef.current.x, cameraTarget.x, cameraLerp),
        y: lerpNumber(menuMapCameraRef.current.y, cameraTarget.y, cameraLerp),
        zoom: lerpNumber(menuMapCameraRef.current.zoom, cameraTarget.zoom, cameraLerp * 0.92),
     };
     menuMapCameraRef.current = clampMenuCameraTarget(menuMapCameraRef.current);
     const menuCamera = menuMapCameraRef.current;
     const worldToScreen = (x: number, y: number) => ({
         x: (x - menuCamera.x) * menuCamera.zoom + CANVAS_WIDTH / 2,
         y: (y - menuCamera.y) * menuCamera.zoom + CANVAS_HEIGHT / 2,
     });

     const focusPoint = focusRegion ? worldToScreen(focusRegion.focalPoint.x, focusRegion.focalPoint.y) : { x: CANVAS_WIDTH * 0.48, y: CANVAS_HEIGHT * 0.24 };
     const backdropCanvas = buildMenuBackdropCanvas(atlasQuality, densityMode);
     ctx.save();
     ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
     ctx.scale(menuCamera.zoom, menuCamera.zoom);
     ctx.translate(-menuCamera.x, -menuCamera.y);
     if (backdropCanvas) {
         ctx.drawImage(backdropCanvas, 0, 0);
     } else {
         const skyGradient = ctx.createLinearGradient(0, 0, 0, MENU_MAP_WORLD_HEIGHT);
         skyGradient.addColorStop(0, '#f6c47a');
         skyGradient.addColorStop(0.22, '#d98a63');
         skyGradient.addColorStop(0.48, '#496270');
         skyGradient.addColorStop(1, '#13202a');
         ctx.fillStyle = skyGradient;
         ctx.fillRect(0, 0, MENU_MAP_WORLD_WIDTH, MENU_MAP_WORLD_HEIGHT);
     }
     ctx.restore();

     const focusGlow = ctx.createRadialGradient(focusPoint.x, focusPoint.y - 60, 18, focusPoint.x, focusPoint.y - 60, 420);
     focusGlow.addColorStop(0, `rgba(255, 236, 178, ${0.66 + mapClarity * 0.16})`);
     focusGlow.addColorStop(0.34, focusRegion?.hazeColor ?? 'rgba(255, 198, 108, 0.28)');
     focusGlow.addColorStop(1, 'rgba(255, 170, 96, 0)');
     ctx.fillStyle = focusGlow;
     ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

     if (atlasQuality !== 'low') {
         for (let i = 0; i < (atlasQuality === 'medium' ? 2 : 3); i += 1) {
             const rayX = focusPoint.x - 110 + i * 96;
             ctx.fillStyle = `rgba(255, 230, 168, ${0.024 + mapClarity * 0.012 - i * 0.004})`;
             ctx.beginPath();
             ctx.moveTo(rayX, 36);
             ctx.lineTo(rayX + 96, CANVAS_HEIGHT);
             ctx.lineTo(rayX - 28, CANVAS_HEIGHT);
             ctx.closePath();
             ctx.fill();
         }
     }

     ctx.save();
     ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
     ctx.scale(menuCamera.zoom, menuCamera.zoom);
     ctx.translate(-menuCamera.x, -menuCamera.y);

     const scaledRegions = MAP_REGIONS.map((region) => ({
         ...region,
         focal: scaleMenuMapPoint(region.focalPoint),
         bounds: {
             x: region.bounds.x * MENU_MAP_WORLD_SCALE,
             y: region.bounds.y * MENU_MAP_WORLD_SCALE,
             width: region.bounds.width * MENU_MAP_WORLD_SCALE,
             height: region.bounds.height * MENU_MAP_WORLD_SCALE,
         },
     }));

     scaledRegions.forEach((region) => {
         const isFocus = focusRegion?.id === region.id;
         const plateCx = region.bounds.x + region.bounds.width * 0.52;
         const plateCy = region.bounds.y + region.bounds.height * 0.58;
         const plateWidth = region.bounds.width * 0.42;
         const plateHeight = region.bounds.height * 0.18;
         const lift = isFocus ? 26 : 18;
         const shadowOffset = isFocus ? 34 : 24;
         const plateDepth = isFocus ? 30 : 22;

         ctx.save();
         ctx.globalAlpha = 0.92;

         ctx.fillStyle = `rgba(0, 0, 0, ${0.14 + region.edgeShade * 0.28})`;
         ctx.beginPath();
         ctx.ellipse(plateCx + 18, plateCy + shadowOffset, plateWidth * 0.94, plateHeight * 0.82, -0.08, 0, Math.PI * 2);
         ctx.fill();

         const skirtGradient = ctx.createLinearGradient(plateCx, plateCy - lift * 0.2, plateCx, plateCy + shadowOffset);
         skirtGradient.addColorStop(0, `${region.accentColor}18`);
         skirtGradient.addColorStop(0.58, 'rgba(18, 24, 32, 0.28)');
         skirtGradient.addColorStop(1, 'rgba(4, 8, 16, 0)');
         ctx.fillStyle = skirtGradient;
         ctx.beginPath();
         ctx.ellipse(plateCx, plateCy + 10, plateWidth * 0.88, plateHeight * 0.72, -0.06, 0, Math.PI * 2);
         ctx.fill();

         const cliffGradient = ctx.createLinearGradient(plateCx, plateCy - lift + plateHeight * 0.08, plateCx, plateCy + plateDepth);
         cliffGradient.addColorStop(0, 'rgba(43, 56, 74, 0.34)');
         cliffGradient.addColorStop(0.52, 'rgba(12, 18, 28, 0.3)');
         cliffGradient.addColorStop(1, 'rgba(5, 8, 14, 0.02)');
         ctx.fillStyle = cliffGradient;
         ctx.beginPath();
         ctx.moveTo(plateCx - plateWidth * 0.94, plateCy - lift + plateHeight * 0.08);
         ctx.bezierCurveTo(
             plateCx - plateWidth * 0.88,
             plateCy + plateHeight * 0.42,
             plateCx - plateWidth * 0.52,
             plateCy + plateDepth,
             plateCx - plateWidth * 0.14,
             plateCy + plateDepth * 0.96,
         );
         ctx.lineTo(plateCx + plateWidth * 0.22, plateCy + plateDepth * 0.92);
         ctx.bezierCurveTo(
             plateCx + plateWidth * 0.58,
             plateCy + plateDepth * 0.7,
             plateCx + plateWidth * 0.88,
             plateCy + plateHeight * 0.38,
             plateCx + plateWidth * 0.94,
             plateCy - lift + plateHeight * 0.08,
         );
         ctx.closePath();
         ctx.fill();

         ctx.strokeStyle = 'rgba(255,255,255,0.04)';
         ctx.lineWidth = 1;
         ctx.beginPath();
         ctx.moveTo(plateCx - plateWidth * 0.92, plateCy - lift + plateHeight * 0.16);
         ctx.quadraticCurveTo(
             plateCx,
             plateCy + plateDepth * 0.78,
             plateCx + plateWidth * 0.92,
             plateCy - lift + plateHeight * 0.16,
         );
         ctx.stroke();

         const topGradient = ctx.createLinearGradient(plateCx, plateCy - lift - plateHeight, plateCx, plateCy + plateHeight);
         topGradient.addColorStop(0, `${region.accentColor}${isFocus ? '52' : '36'}`);
         topGradient.addColorStop(0.42, region.hazeColor.replace(/0\.\d+\)/, isFocus ? '0.28)' : '0.2)'));
         topGradient.addColorStop(1, 'rgba(15, 22, 34, 0.08)');
         ctx.fillStyle = topGradient;
         ctx.beginPath();
         ctx.ellipse(plateCx, plateCy - lift, plateWidth, plateHeight, -0.06, 0, Math.PI * 2);
         ctx.fill();

         ctx.strokeStyle = isFocus ? `${region.accentColor}a8` : `${region.accentColor}66`;
         ctx.lineWidth = isFocus ? 2.4 : 1.6;
         ctx.beginPath();
         ctx.ellipse(plateCx, plateCy - lift, plateWidth, plateHeight, -0.06, 0, Math.PI * 2);
         ctx.stroke();

         ctx.strokeStyle = 'rgba(255,255,255,0.08)';
         ctx.lineWidth = 1.2;
         ctx.beginPath();
         ctx.ellipse(plateCx - plateWidth * 0.1, plateCy - lift - plateHeight * 0.15, plateWidth * 0.74, plateHeight * 0.42, -0.06, Math.PI * 1.02, Math.PI * 1.92);
         ctx.stroke();
         ctx.restore();
     });

     ctx.save();
     ctx.strokeStyle = `rgba(7, 14, 22, ${0.28 + mapClarity * 0.16})`;
     ctx.lineWidth = 20;
     ctx.lineCap = 'round';
     ctx.lineJoin = 'round';
     ctx.beginPath();
     LEVELS.forEach((level, i) => {
         const { x, y } = getMapNodePosition(i);
         if (i === 0) ctx.moveTo(x + 4, y + 16);
         else ctx.lineTo(x + 4, y + 16);
     });
     ctx.stroke();
     ctx.restore();

     ctx.save();
     ctx.strokeStyle = `rgba(183, 230, 255, ${0.14 + mapClarity * 0.12})`;
     ctx.lineWidth = 14;
     ctx.lineCap = 'round';
     ctx.lineJoin = 'round';
     ctx.beginPath();
     LEVELS.forEach((level, i) => {
         const { x, y } = getMapNodePosition(i);
         if (i === 0) ctx.moveTo(x, y);
         else ctx.lineTo(x, y);
     });
     ctx.stroke();
     ctx.restore();

     ctx.strokeStyle = `rgba(255,255,255,${0.24 + mapClarity * 0.24 + presentation.fxScale * 0.08})`;
     ctx.lineWidth = 4;
     ctx.lineCap = 'round';
     ctx.lineJoin = 'round';
     ctx.setLineDash([15, 10]);
     ctx.beginPath();
     LEVELS.forEach((level, i) => {
         const { x, y } = getMapNodePosition(i);
         if (i === 0) ctx.moveTo(x, y);
         else ctx.lineTo(x, y);
     });
     ctx.stroke();
     ctx.setLineDash([]);

     if (selectedLevel) {
         ctx.save();
         ctx.strokeStyle = 'rgba(129, 255, 194, 0.18)';
         ctx.lineWidth = 18;
         ctx.lineCap = 'round';
         ctx.lineJoin = 'round';
         ctx.beginPath();
         LEVELS.slice(0, selectedLevel.id).forEach((level, index) => {
             const { x, y } = getMapNodePosition(index);
             if (index === 0) ctx.moveTo(x, y);
             else ctx.lineTo(x, y);
         });
         ctx.stroke();
         ctx.strokeStyle = 'rgba(191, 255, 219, 0.92)';
         ctx.lineWidth = 7;
         ctx.beginPath();
         LEVELS.slice(0, selectedLevel.id).forEach((level, index) => {
             const { x, y } = getMapNodePosition(index);
             if (index === 0) ctx.moveTo(x, y);
             else ctx.lineTo(x, y);
         });
         ctx.stroke();

         const routePoints = LEVELS.slice(0, selectedLevel.id).map((_, index) => getMapNodePosition(index));
         if (routePoints.length > 1) {
             const segmentLengths = routePoints.slice(1).map((point, index) => {
                 const previous = routePoints[index];
                 return Math.hypot(point.x - previous.x, point.y - previous.y);
             });
             const totalLength = segmentLengths.reduce((sum, value) => sum + value, 0);
             if (totalLength > 0) {
                 for (let pulseIndex = 0; pulseIndex < 3; pulseIndex += 1) {
                     const distanceAlongPath = ((now * 0.11) + pulseIndex * totalLength * 0.28) % totalLength;
                     let traversed = 0;
                     let pulseX = routePoints[0].x;
                     let pulseY = routePoints[0].y;

                     for (let segmentIndex = 0; segmentIndex < segmentLengths.length; segmentIndex += 1) {
                         const segmentLength = segmentLengths[segmentIndex];
                         if (distanceAlongPath <= traversed + segmentLength || segmentIndex === segmentLengths.length - 1) {
                             const from = routePoints[segmentIndex];
                             const to = routePoints[segmentIndex + 1];
                             const segmentProgress = clamp((distanceAlongPath - traversed) / Math.max(1, segmentLength), 0, 1);
                             pulseX = lerpNumber(from.x, to.x, segmentProgress);
                             pulseY = lerpNumber(from.y, to.y, segmentProgress);
                             break;
                         }
                         traversed += segmentLength;
                     }

                     const pulseRadius = 5 + Math.sin(now * 0.005 + pulseIndex) * 1.8;
                     ctx.save();
                     ctx.shadowColor = pulseIndex === 0 ? 'rgba(191, 255, 219, 0.9)' : 'rgba(125, 211, 252, 0.8)';
                     ctx.shadowBlur = 18;
                     ctx.fillStyle = pulseIndex === 0 ? 'rgba(236, 253, 245, 0.96)' : 'rgba(186, 230, 253, 0.88)';
                     ctx.beginPath();
                     ctx.arc(pulseX, pulseY, pulseRadius, 0, Math.PI * 2);
                     ctx.fill();
                     ctx.restore();
                 }
             }
         }
         ctx.restore();
     }

     if (selectedLevel) {
         const selectedPoint = getMapNodePosition(selectedLevel.id - 1);
         const region = getMapRegionForLevel(selectedLevel.id);
         const selectedTheme = THEME_PROFILES[selectedLevel.biome];
         const auraRadius =
             selectedLevel.id <= 2 ? 240 :
             selectedLevel.id <= 4 ? 220 :
             selectedLevel.id <= 7 ? 200 :
             180;
         ctx.save();
         const regionGlow = ctx.createRadialGradient(selectedPoint.x, selectedPoint.y, 14, selectedPoint.x, selectedPoint.y, auraRadius);
         regionGlow.addColorStop(0, `${selectedTheme.accentColor}55`);
         regionGlow.addColorStop(0.36, `${selectedTheme.accentColor}22`);
         regionGlow.addColorStop(1, 'rgba(0,0,0,0)');
         ctx.fillStyle = regionGlow;
         ctx.fillRect(selectedPoint.x - auraRadius, selectedPoint.y - auraRadius, auraRadius * 2, auraRadius * 2);

         const regionPulse = 0.5 + Math.sin(now * 0.004) * 0.5;
         ctx.strokeStyle = `${selectedTheme.anchorColor}${selectedLevel.id >= 7 ? '88' : 'aa'}`;
         ctx.lineWidth = 3;
         ctx.beginPath();
         ctx.arc(selectedPoint.x, selectedPoint.y, 48 + regionPulse * 10, -0.6, Math.PI * 1.1);
         ctx.stroke();

         if (region) {
             const focal = scaleMenuMapPoint(region.focalPoint);
             ctx.strokeStyle = `${selectedTheme.anchorColor}40`;
             ctx.lineWidth = 2;
             ctx.setLineDash([10, 12]);
             ctx.beginPath();
             ctx.moveTo(selectedPoint.x, selectedPoint.y);
             ctx.lineTo(
                 lerpNumber(selectedPoint.x, focal.x, 0.34),
                 lerpNumber(selectedPoint.y, focal.y, 0.34),
             );
             ctx.stroke();
             ctx.setLineDash([]);
         }

         for (let mote = 0; mote < 3; mote += 1) {
             const angle = now * 0.0016 + mote * (Math.PI * 2 / 3);
             const orbit = 56 + mote * 12;
             const mx = selectedPoint.x + Math.cos(angle) * orbit;
             const my = selectedPoint.y + Math.sin(angle * 1.12) * (orbit * 0.54);
             ctx.fillStyle = `${selectedTheme.anchorColor}${mote === 0 ? 'cc' : '88'}`;
             ctx.beginPath();
             ctx.arc(mx, my, mote === 0 ? 4 : 3, 0, Math.PI * 2);
             ctx.fill();
         }

         if (selectedLevel.biome === 'JUNGLE') {
             ctx.fillStyle = 'rgba(118, 255, 189, 0.2)';
             ctx.beginPath();
             ctx.ellipse(selectedPoint.x - 62, selectedPoint.y + 34, 24, 10, -0.5, 0, Math.PI * 2);
             ctx.ellipse(selectedPoint.x + 56, selectedPoint.y - 24, 18, 8, 0.45, 0, Math.PI * 2);
             ctx.fill();
         } else if (selectedLevel.biome === 'SWAMP') {
             ctx.strokeStyle = 'rgba(128, 226, 255, 0.2)';
             ctx.lineWidth = 2;
             for (let ripple = 0; ripple < 2; ripple += 1) {
                 ctx.beginPath();
                 ctx.ellipse(selectedPoint.x, selectedPoint.y + 48 + ripple * 10, 26 + ripple * 12 + regionPulse * 5, 7 + ripple * 2, 0, 0, Math.PI * 2);
                 ctx.stroke();
             }
         } else if (selectedLevel.biome === 'CAVE') {
             ctx.fillStyle = 'rgba(255, 196, 120, 0.18)';
             ctx.beginPath();
             ctx.moveTo(selectedPoint.x - 72, selectedPoint.y - 34);
             ctx.lineTo(selectedPoint.x - 54, selectedPoint.y - 74);
             ctx.lineTo(selectedPoint.x - 38, selectedPoint.y - 30);
             ctx.closePath();
             ctx.fill();
             ctx.beginPath();
             ctx.moveTo(selectedPoint.x + 68, selectedPoint.y + 22);
             ctx.lineTo(selectedPoint.x + 84, selectedPoint.y - 14);
             ctx.lineTo(selectedPoint.x + 48, selectedPoint.y + 8);
             ctx.closePath();
             ctx.fill();
         } else if (selectedLevel.biome === 'VOLCANO') {
             ctx.fillStyle = 'rgba(255, 155, 102, 0.4)';
             for (let ember = 0; ember < 4; ember += 1) {
                 const ex = selectedPoint.x - 36 + ember * 24 + Math.sin(now * 0.003 + ember) * 6;
                 const ey = selectedPoint.y + 42 - ember * 18 - Math.cos(now * 0.0038 + ember) * 8;
                 ctx.beginPath();
                 ctx.arc(ex, ey, 2.8 + (ember % 2), 0, Math.PI * 2);
                 ctx.fill();
             }
         }
         ctx.restore();
     }

     if (storyBeat) {
         ctx.save();
         ctx.strokeStyle = 'rgba(255, 226, 144, 0.82)';
         ctx.lineWidth = 6;
         ctx.setLineDash([18, 8]);
         ctx.beginPath();
         LEVELS.slice(0, storyRevealLevel).forEach((level, index) => {
             const { x, y } = getMapNodePosition(index);
             if (index === 0) ctx.moveTo(x, y);
             else ctx.lineTo(x, y);
         });
         ctx.stroke();
         ctx.setLineDash([]);
         ctx.restore();
     }

     LEVELS.forEach((level, i) => {
         const { x, y } = getMapNodePosition(i);
         const isLocked = level.id > highestUnlockedLevel;
         const isCurrent = level.id === highestUnlockedLevel;
         const isSelected = selectedLevelId === level.id;
         const isHovered = hoveredLevelRef.current === level.id;
         const isStoryFocus = storyBeat?.focusLevelId === level.id;
         const isStoryHighlight = storyHighlights.has(level.id);
         const isStoryVisible = !storyBeat || level.id <= storyRevealLevel;
         const rivalMarker = routeRivalMarkers.get(level.id) ?? null;
         ctx.beginPath();
         const pulse = Math.sin(now * 0.005);
         const radius =
            isSelected ? 34 + pulse * 4 :
            isCurrent ? 31 + pulse * 3 :
            isHovered || isStoryFocus ? 28 :
            24;
         const nodeLift = isSelected ? 15 : isCurrent ? 12 : isHovered ? 10 : 8;
         ctx.fillStyle = 'rgba(4, 8, 16, 0.32)';
         ctx.beginPath();
         ctx.ellipse(x + 6, y + radius * 0.82, radius * 0.88, radius * 0.34, 0, 0, Math.PI * 2);
         ctx.fill();
         ctx.strokeStyle = 'rgba(7, 12, 20, 0.28)';
         ctx.lineWidth = Math.max(3, radius * 0.18);
         ctx.beginPath();
         ctx.moveTo(x, y + nodeLift * 0.18);
         ctx.lineTo(x + 4, y + radius * 0.68);
         ctx.stroke();
         ctx.arc(x, y, radius, 0, Math.PI * 2);
         let nodeColor = '#546E7A';
         if (!isLocked) {
             const biomeConfig = THEME_PROFILES[level.biome];
             nodeColor = biomeConfig.treeColor;
             if (level.biome === 'SWAMP') nodeColor = '#0288D1';
             if (level.biome === 'VOLCANO') nodeColor = '#D84315';
             if (level.biome === 'CAVE') nodeColor = '#424242';
             if (level.id <= 2) nodeColor = '#66BB6A';
         }
         ctx.globalAlpha = isStoryVisible ? 1 : 0.22;
         const nodeGlow = ctx.createRadialGradient(x, y, 8, x, y, radius + 16);
         nodeGlow.addColorStop(0, isSelected ? 'rgba(255,255,255,0.26)' : isStoryFocus ? 'rgba(253, 230, 138, 0.22)' : 'rgba(255,255,255,0.08)');
         nodeGlow.addColorStop(1, 'rgba(255,255,255,0)');
         ctx.fillStyle = nodeGlow;
         ctx.fillRect(x - radius - 20, y - radius - 20, radius * 2 + 40, radius * 2 + 40);
         const nodeSurface = ctx.createLinearGradient(x, y - radius, x, y + radius);
         nodeSurface.addColorStop(0, 'rgba(255,255,255,0.12)');
         nodeSurface.addColorStop(0.18, nodeColor);
         nodeSurface.addColorStop(1, 'rgba(20, 27, 37, 0.94)');
         ctx.fillStyle = nodeSurface;
         ctx.fill();
         ctx.lineWidth = isSelected || isStoryFocus ? 5 : 4;
         ctx.strokeStyle =
             isSelected ? '#f8fafc' :
             isStoryFocus ? '#fde68a' :
             isCurrent ? '#FFF' :
             isHovered ? 'rgba(191, 255, 219, 0.85)' :
             isStoryHighlight ? 'rgba(255, 226, 144, 0.66)' :
             'rgba(0,0,0,0.5)';
         ctx.stroke();
         ctx.beginPath();
         ctx.arc(x - radius * 0.22, y - radius * 0.28, Math.max(4, radius * 0.22), 0, Math.PI * 2);
         ctx.fillStyle = 'rgba(255,255,255,0.12)';
         ctx.fill();
         ctx.globalAlpha = 1;
         ctx.save();
         ctx.font = `700 ${Math.round((isSelected || isCurrent ? 20 : 17) * MENU_MAP_WORLD_SCALE * 0.72)}px 'Rajdhani', 'Space Grotesk', sans-serif`;
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.fillStyle = isSelected || isCurrent || isStoryFocus ? '#f8fafc' : isHovered ? '#d9f9ff' : 'rgba(241,245,249,0.92)';
         ctx.strokeStyle = 'rgba(0,0,0,0.35)';
         ctx.lineWidth = 3;
         ctx.strokeText(`L${level.id}`, x, y + 1);
         ctx.fillText(`L${level.id}`, x, y + 1);
         ctx.restore();
         if (isSelected || isStoryFocus || isHovered || isCurrent) {
             const label = `${level.name}`;
             ctx.save();
             ctx.font = `700 ${Math.round(13 * MENU_MAP_WORLD_SCALE * 0.72)}px 'Rajdhani', 'Space Grotesk', sans-serif`;
             const labelWidth = ctx.measureText(label).width + 26;
             const labelX = x - labelWidth / 2;
             const placeAbove = y + radius + 48 > MENU_MAP_WORLD_HEIGHT - 12;
             const labelY = placeAbove ? y - radius - 44 : y + radius + 14;
             ctx.beginPath();
             ctx.roundRect(labelX, labelY, labelWidth, 30, 12);
             ctx.fillStyle = isSelected ? 'rgba(6, 20, 16, 0.94)' : isStoryFocus ? 'rgba(28, 18, 4, 0.9)' : 'rgba(6, 13, 22, 0.86)';
             ctx.fill();
             ctx.strokeStyle = isSelected ? 'rgba(191,255,219,0.55)' : isStoryFocus ? 'rgba(253,230,138,0.5)' : 'rgba(255,255,255,0.18)';
             ctx.lineWidth = 1.5;
             ctx.stroke();
             ctx.fillStyle = '#f8fafc';
             ctx.fillText(label, x, labelY + 15);
             ctx.restore();
         }
         if (!isLocked && rivalMarker && isStoryVisible) {
             const chipText = rivalMarker.label.toUpperCase();
             ctx.save();
             ctx.font = `700 ${Math.round(11 * MENU_MAP_WORLD_SCALE * 0.72)}px 'Rajdhani', 'Space Grotesk', sans-serif`;
             const chipPaddingX = 10;
             const chipWidth = ctx.measureText(chipText).width + chipPaddingX * 2;
             const chipHeight = rivalMarker.isPriority ? 21 : 18;
             const chipX = x - chipWidth / 2;
             const chipY = y - radius - (isSelected || isHovered || isCurrent ? 38 : 24);

             ctx.shadowColor = rivalMarker.tone.glow;
             ctx.shadowBlur = rivalMarker.isPriority ? 18 : 10;
             ctx.beginPath();
             ctx.roundRect(chipX, chipY, chipWidth, chipHeight, chipHeight / 2);
             ctx.fillStyle = rivalMarker.tone.fill;
             ctx.fill();
             ctx.shadowBlur = 0;
             ctx.strokeStyle = rivalMarker.tone.stroke;
             ctx.lineWidth = rivalMarker.isPriority ? 1.8 : 1.2;
             ctx.stroke();
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillStyle = rivalMarker.tone.text;
             ctx.fillText(chipText, x, chipY + chipHeight / 2 + 0.5);
             ctx.restore();
         }
         if (isSelected || isStoryFocus || isHovered || isCurrent) {
             ctx.save();
             ctx.strokeStyle = isSelected ? 'rgba(191, 255, 219, 0.82)' : isStoryFocus ? 'rgba(253, 230, 138, 0.8)' : 'rgba(125, 211, 252, 0.74)';
             ctx.lineWidth = 4;
             ctx.beginPath();
             ctx.arc(x, y, radius + 10, 0.18, Math.PI * 1.88);
             ctx.stroke();
             ctx.restore();
         }
         if (isCurrent) {
             ctx.save();
             const bounceY = y - 40 + Math.sin(now * 0.01) * 10;
             ctx.fillStyle = '#795548';
             ctx.fillRect(x - 15, bounceY - 15, 30, 30);
             ctx.fillStyle = '#FFECB3';
             ctx.fillRect(x - 10, bounceY - 5, 20, 10);
             ctx.fillStyle = '#000';
             ctx.fillRect(x - 8, bounceY - 2, 4, 4);
             ctx.fillRect(x + 4, bounceY - 2, 4, 4);
             ctx.restore();
         }
     });
     ctx.restore();

     if (gameState === GameState.MENU && routeRivalMarkers.size > 0 && !storyBeat) {
         const markerLegend = [
             {
                 label: 'Scout',
                 fill: 'rgba(8, 145, 178, 0.9)',
                 stroke: 'rgba(165, 243, 252, 0.92)',
             },
             {
                 label: 'Chase',
                 fill: 'rgba(190, 24, 93, 0.88)',
                 stroke: 'rgba(253, 164, 175, 0.9)',
             },
             {
                 label: 'Lead',
                 fill: 'rgba(6, 95, 70, 0.88)',
                 stroke: 'rgba(167, 243, 208, 0.9)',
             },
         ];
         const legendWidth = 244;
         const legendHeight = 54;
         const legendX = 38;
         const legendY = 38;

         ctx.save();
         ctx.fillStyle = 'rgba(3, 10, 18, 0.72)';
         ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
         ctx.lineWidth = 1.4;
         ctx.beginPath();
         ctx.roundRect(legendX, legendY, legendWidth, legendHeight, 18);
         ctx.fill();
         ctx.stroke();

         ctx.textAlign = 'left';
         ctx.textBaseline = 'alphabetic';
         ctx.fillStyle = 'rgba(226, 232, 240, 0.66)';
         ctx.font = `700 ${Math.round(11 * MENU_MAP_WORLD_SCALE * 0.72)}px 'Rajdhani', 'Space Grotesk', sans-serif`;
         ctx.fillText('ATLAS PRESSURE', legendX + 16, legendY + 16);

         let chipCursorX = legendX + 14;
         markerLegend.forEach((item) => {
             ctx.font = `700 ${Math.round(11 * MENU_MAP_WORLD_SCALE * 0.72)}px 'Rajdhani', 'Space Grotesk', sans-serif`;
             const chipWidth = ctx.measureText(item.label.toUpperCase()).width + 18;
             const chipY = legendY + 26;
             ctx.beginPath();
             ctx.roundRect(chipCursorX, chipY, chipWidth, 16, 8);
             ctx.fillStyle = item.fill;
             ctx.fill();
             ctx.strokeStyle = item.stroke;
             ctx.stroke();
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillStyle = '#f8fafc';
             ctx.fillText(item.label.toUpperCase(), chipCursorX + chipWidth / 2, chipY + 8.5);
             chipCursorX += chipWidth + 8;
         });

         ctx.textAlign = 'left';
         ctx.textBaseline = 'alphabetic';
         ctx.fillStyle = 'rgba(226, 232, 240, 0.58)';
         ctx.font = `600 ${Math.round(10 * MENU_MAP_WORLD_SCALE * 0.72)}px 'Rajdhani', 'Space Grotesk', sans-serif`;
         ctx.fillText('Imported boards now tag contested routes directly on the atlas.', legendX + 16, legendY + 49);
         ctx.restore();
     }

     const parallaxX = ((menuCamera.x - DEFAULT_MENU_MAP_CAMERA.x) / MENU_MAP_WORLD_WIDTH) * 120;
     const parallaxY = ((menuCamera.y - DEFAULT_MENU_MAP_CAMERA.y) / MENU_MAP_WORLD_HEIGHT) * 84;

     ctx.save();
     ctx.globalCompositeOperation = 'multiply';
     ctx.fillStyle = 'rgba(6, 11, 18, 0.24)';
     ctx.beginPath();
     ctx.moveTo(-40, 0);
     ctx.bezierCurveTo(80 - parallaxX * 0.3, 30, 140 - parallaxX * 0.55, 180, 110 - parallaxX * 0.45, CANVAS_HEIGHT * 0.44);
     ctx.bezierCurveTo(96 - parallaxX * 0.4, CANVAS_HEIGHT * 0.62, 26 - parallaxX * 0.2, CANVAS_HEIGHT * 0.82, -40, CANVAS_HEIGHT + 40);
     ctx.closePath();
     ctx.fill();
     ctx.beginPath();
     ctx.moveTo(CANVAS_WIDTH + 40, -20);
     ctx.bezierCurveTo(CANVAS_WIDTH - 120 - parallaxX * 0.2, 54, CANVAS_WIDTH - 150 - parallaxX * 0.35, 180, CANVAS_WIDTH - 80 - parallaxX * 0.45, CANVAS_HEIGHT * 0.32);
     ctx.bezierCurveTo(CANVAS_WIDTH - 32 - parallaxX * 0.2, CANVAS_HEIGHT * 0.54, CANVAS_WIDTH + 16, CANVAS_HEIGHT * 0.74, CANVAS_WIDTH + 40, CANVAS_HEIGHT + 24);
     ctx.closePath();
     ctx.fill();
     ctx.restore();

     if (atlasQuality !== 'low') {
         ctx.save();
         ctx.globalAlpha = atlasQuality === 'medium' ? 0.18 : 0.24;
         const frondOffsets = [
             { x: 92, y: -28, size: 1.08 },
             { x: CANVAS_WIDTH - 124, y: 24, size: 0.94 },
             { x: CANVAS_WIDTH - 64, y: CANVAS_HEIGHT - 86, size: 0.82 },
         ];
         frondOffsets.forEach(({ x, y, size }, index) => {
             const px = x - parallaxX * (0.58 + index * 0.08);
             const py = y - parallaxY * (0.42 + index * 0.06);
             ctx.save();
             ctx.translate(px, py);
             ctx.scale(size, size);
             ctx.fillStyle = index === 1 ? 'rgba(9, 18, 24, 0.44)' : 'rgba(8, 16, 22, 0.52)';
             for (let leaf = 0; leaf < 5; leaf += 1) {
                 ctx.save();
                 ctx.rotate((-0.86 + leaf * 0.38) + Math.sin(now * 0.0008 + leaf) * 0.02);
                 ctx.beginPath();
                 ctx.moveTo(0, 0);
                 ctx.quadraticCurveTo(34, -26, 88, -8);
                 ctx.quadraticCurveTo(36, 8, 0, 0);
                 ctx.closePath();
                 ctx.fill();
                 ctx.restore();
             }
             ctx.restore();
         });
         ctx.restore();
     }

     ctx.save();
     ctx.fillStyle = `rgba(4, 12, 13, ${0.28 + presentation.fxScale * 0.07})`;
     for (let i = 0; i < 5; i++) {
         const x = 60 + i * 360 + Math.sin(now * 0.00018 + i) * 14;
         ctx.beginPath();
         ctx.moveTo(x, -20);
         ctx.quadraticCurveTo(x + 60, 160, x + (i % 2 === 0 ? 20 : -20), CANVAS_HEIGHT + 40);
         ctx.lineWidth = 16 + i * 2;
         ctx.strokeStyle = `rgba(6, 16, 14, ${0.26 + i * 0.035})`;
         ctx.stroke();
     }
     ctx.restore();

     const sideFade = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
     sideFade.addColorStop(0, 'rgba(5, 12, 16, 0.16)');
     sideFade.addColorStop(0.08, 'rgba(5, 12, 16, 0)');
     sideFade.addColorStop(0.92, 'rgba(5, 12, 16, 0)');
     sideFade.addColorStop(1, 'rgba(5, 12, 16, 0.16)');
     ctx.fillStyle = sideFade;
     ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
     const edgeShade = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.55, 220, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.55, CANVAS_WIDTH * 0.72);
     edgeShade.addColorStop(0, 'rgba(0,0,0,0)');
     edgeShade.addColorStop(1, `rgba(3, 8, 12, ${0.2 + (focusRegion?.edgeShade ?? 0.16) * 0.45})`);
     ctx.fillStyle = edgeShade;
     ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
     if (gameState === GameState.LANDING || gameState === GameState.STORY_MAP || gameState === GameState.MENU || gameState === GameState.SHOP) { 
         drawMapLobby(ctx); 
         if (gameState === GameState.SHOP) {
             ctx.fillStyle = "rgba(0,0,0,0.5)";
             ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
         }
         return; 
     }

     const config = THEME_PROFILES[currentBiomeRef.current];
    const seasonFlow = getSeasonalFlow(worldTimeRef.current, selectedLevelRef.current);
    const monsoonStrength = getMonsoonStrength(currentBiomeRef.current, weatherRef.current.type, seasonFlow);
    const isMonsoon = monsoonStrength > 0;
    const targetSky = config.skyColors;
    const lerpFactor = 0.05;
    skyColorRef.current = [
        lerpColor(skyColorRef.current[0], targetSky[0], lerpFactor),
        lerpColor(skyColorRef.current[1], targetSky[1], lerpFactor),
    ];

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, skyColorRef.current[0]); gradient.addColorStop(1, skyColorRef.current[1]);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (isMonsoon) {
        ctx.fillStyle = `rgba(120, 180, 170, ${0.045 + (seasonFlow + 1) * 0.015})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        for (let i = 0; i < 4; i++) {
            const bandY = 110 + i * 145 + Math.sin(worldTimeRef.current * 0.7 + i) * 18;
            ctx.fillStyle = `rgba(188, 232, 220, ${0.035 + i * 0.01})`;
            ctx.beginPath();
            ctx.ellipse(CANVAS_WIDTH * (0.18 + i * 0.22), bandY, 220 + i * 36, 42 + i * 8, -0.08, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    bgLayers.current.forEach(layer => {
        const parallaxX = (layer.x - cameraOffset.current.x * layer.speed) % 2200;
        const drawX = parallaxX < -140 ? parallaxX + 2200 : parallaxX;
        const layerY = layer.y - cameraOffset.current.y * layer.speed * 0.2;
        const time = worldTimeRef.current * (0.7 + layer.speed * 1.4);
        ctx.fillStyle = layer.color;
        if (layer.speed < 0.08) { ctx.globalAlpha = 0.8; } 
        else { ctx.filter = 'none'; ctx.globalAlpha = 1.0; }

        if (layer.type === 0) { ctx.beginPath(); ctx.arc(drawX, layerY, layer.size * 100, 0, Math.PI * 2); ctx.fill(); }
        else if (layer.type === 3) {
            const sway = Math.sin(time + layer.shapeVar!) * 8;
            const w = layer.size * 20; const h = layer.size * 150;
            ctx.beginPath(); ctx.moveTo(drawX, layerY + 100); ctx.lineTo(drawX + sway, layerY - h); ctx.lineTo(drawX + w, layerY + 100); ctx.fill();
        } else if (layer.type === 1) { ctx.fillRect(drawX, layerY, 2, layer.size); } 
        else if (layer.type === 2) { ctx.beginPath(); ctx.ellipse(drawX, layerY, 40 * layer.size, 20 * layer.size, 0, 0, Math.PI * 2); ctx.fill(); }
        else if (layer.type === 4) {
            const sway = Math.sin(time + layer.shapeVar! * 8) * layer.size * 18;
            ctx.beginPath();
            ctx.moveTo(drawX, layerY);
            ctx.quadraticCurveTo(drawX + sway, layerY + layer.size * 55, drawX + layer.size * 18, layerY + layer.size * 130);
            ctx.lineTo(drawX + layer.size * 2, layerY + layer.size * 132);
            ctx.quadraticCurveTo(drawX + sway * 0.4, layerY + layer.size * 66, drawX - layer.size * 6, layerY + layer.size * 8);
            ctx.fill();
        } else if (layer.type === 5) {
            ctx.save();
            ctx.globalAlpha = 0.28 + Math.sin(time * 2 + layer.shapeVar! * 6) * 0.18;
            ctx.shadowBlur = 12;
            ctx.shadowColor = layer.color;
            ctx.beginPath();
            ctx.arc(drawX, layerY, layer.size * 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (layer.type === 6) {
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.beginPath();
            ctx.ellipse(drawX, layerY + Math.sin(time + layer.shapeVar! * 10) * 8, layer.size * 95, layer.size * 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    });
    ctx.filter = 'none'; ctx.globalAlpha = 1.0;
    if (isMonsoon) {
        ctx.save();
        ctx.strokeStyle = 'rgba(220, 255, 246, 0.08)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const offset = (worldTimeRef.current * 120 + i * 180) % (CANVAS_WIDTH + 220);
            ctx.beginPath();
            ctx.moveTo(offset - 160, 80 + i * 90);
            ctx.lineTo(offset, 50 + i * 90);
            ctx.stroke();
        }
        ctx.restore();
    }
    const sunColumn = ctx.createRadialGradient(CANVAS_WIDTH * 0.55, CANVAS_HEIGHT * 0.16, 24, CANVAS_WIDTH * 0.55, CANVAS_HEIGHT * 0.16, 300);
    sunColumn.addColorStop(0, 'rgba(255, 233, 173, 0.3)');
    sunColumn.addColorStop(0.45, currentBiomeRef.current === 'VOLCANO' ? 'rgba(255, 144, 82, 0.16)' : 'rgba(255, 208, 140, 0.12)');
    sunColumn.addColorStop(1, 'rgba(255, 208, 140, 0)');
    ctx.fillStyle = sunColumn;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'rgba(10, 24, 22, 0.18)';
    for (let i = 0; i < 5; i++) {
        const canopyY = 94 + i * 82;
        ctx.beginPath();
        ctx.ellipse(CANVAS_WIDTH * (0.15 + i * 0.18), canopyY, 180 + i * 20, 44 + i * 6, -0.03, 0, Math.PI * 2);
        ctx.fill();
    }
    const vignette = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.65, 0, CANVAS_HEIGHT);
    vignette.addColorStop(0, 'rgba(7, 19, 20, 0)');
    vignette.addColorStop(1, 'rgba(4, 10, 11, 0.24)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (currentBiomeRef.current === 'CAVE') {
        ctx.fillStyle = 'rgba(6, 10, 14, 0.32)';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(CANVAS_WIDTH * (0.18 + i * 0.24), 120 + i * 34, 170 + i * 24, 58 + i * 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < 3; i++) {
            const glowX = CANVAS_WIDTH * (0.22 + i * 0.28);
            const glow = ctx.createRadialGradient(glowX, CANVAS_HEIGHT * 0.34 + i * 70, 8, glowX, CANVAS_HEIGHT * 0.34 + i * 70, 110);
            glow.addColorStop(0, 'rgba(255, 190, 112, 0.22)');
            glow.addColorStop(1, 'rgba(255, 190, 112, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(glowX - 120, CANVAS_HEIGHT * 0.18, 240, 260);
        }
    } else if (currentBiomeRef.current === 'VOLCANO' && selectedLevelRef.current >= 6 && selectedLevelRef.current <= 8) {
        const lavaGlow = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.58, 0, CANVAS_HEIGHT);
        lavaGlow.addColorStop(0, 'rgba(255, 122, 62, 0)');
        lavaGlow.addColorStop(1, 'rgba(255, 108, 54, 0.22)');
        ctx.fillStyle = lavaGlow;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'rgba(18, 8, 6, 0.18)';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 340 - 90, CANVAS_HEIGHT);
            ctx.lineTo(i * 340 + 110, CANVAS_HEIGHT * (0.56 + (i % 2) * 0.06));
            ctx.lineTo(i * 340 + 250, CANVAS_HEIGHT);
            ctx.closePath();
            ctx.fill();
        }
    }

    const shakeScale = getEffectiveDisplaySettings(saveData.settings).shakeScale;
    const sx = (Math.random() - 0.5) * shakeIntensity.current * shakeScale;
    const sy = (Math.random() - 0.5) * shakeIntensity.current * shakeScale;
    ctx.save(); ctx.translate(-cameraOffset.current.x + sx, -cameraOffset.current.y + sy);

    entities.current.forEach(entity => {
      if (!isWorldRectVisible(entity.position.x, entity.position.y, entity.width, entity.height, cameraOffset.current)) return;
      if (entity.type === 'portal') {
          const pulsate = Math.sin(Date.now() * 0.005) * 10;
          const gradient = ctx.createRadialGradient(entity.position.x + entity.width/2, entity.position.y + entity.height/2, 20, entity.position.x + entity.width/2, entity.position.y + entity.height/2, 120 + pulsate);
          gradient.addColorStop(0, '#FFFFFF'); gradient.addColorStop(0.5, '#00E676'); gradient.addColorStop(1, 'rgba(0, 230, 118, 0)');
          ctx.fillStyle = gradient; ctx.fillRect(entity.position.x - 50, entity.position.y - 50, entity.width + 100, entity.height + 100);
          ctx.strokeStyle = "#FFF"; ctx.lineWidth = 5; ctx.strokeRect(entity.position.x, entity.position.y, entity.width, entity.height);
          return;
      }
        if (entity.type === 'coin') {
            const collectTimer = entity.collectTimer ?? 0;
            const collectRatio = collectTimer > 0 ? collectTimer / 0.22 : 0;
            const pulse = 1 + Math.sin(Date.now() * 0.012 + entity.position.x * 0.03) * 0.07;
            const coinSize = 9 + (collectTimer > 0 ? (1 - collectRatio) * 5 : 0);
            ctx.save();
            ctx.translate(entity.position.x + entity.width / 2, entity.position.y + entity.height / 2);
            ctx.scale(pulse, pulse);
            ctx.rotate(Math.sin(Date.now() * 0.004 + entity.position.x * 0.01) * 0.18);
            ctx.globalAlpha = collectTimer > 0 ? 0.25 + (1 - collectRatio) * 0.7 : 1;
            const coinGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, coinSize + 12);
            coinGlow.addColorStop(0, 'rgba(255, 248, 196, 0.98)');
            coinGlow.addColorStop(0.6, 'rgba(253, 224, 71, 0.45)');
            coinGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
            ctx.fillStyle = coinGlow;
            ctx.beginPath();
            ctx.arc(0, 0, coinSize + 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(0, 0, coinSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, coinSize - 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(-coinSize * 0.22, -coinSize * 0.22, Math.max(1.5, coinSize * 0.28), 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 244, 214, 0.55)';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(-coinSize * 0.55, 0);
            ctx.lineTo(coinSize * 0.55, 0);
            ctx.moveTo(0, -coinSize * 0.55);
            ctx.lineTo(0, coinSize * 0.55);
            ctx.stroke();
            if (collectTimer > 0) {
                ctx.strokeStyle = `rgba(255, 241, 188, ${0.24 + (1 - collectRatio) * 0.38})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, coinSize + 10 + (1 - collectRatio) * 4, -0.8, 0.8);
                ctx.stroke();
            }
            ctx.restore();
        } else if (entity.type === 'tree' || entity.type === 'branch' || entity.type === 'stalactite') {
        if (entity.type === 'branch' && entity.isBroken && entity.angle) {
             ctx.save();
             ctx.translate(entity.position.x + entity.width/2, entity.position.y + entity.height/2);
             ctx.rotate(entity.angle);
             ctx.fillStyle = entity.color;
             ctx.fillRect(-entity.width/2, -entity.height/2, entity.width, entity.height);
             ctx.fillStyle = 'rgba(255,255,255,0.12)';
             ctx.fillRect(-entity.width/2 + 6, -entity.height/2 + 2, entity.width * 0.35, 2.5);
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
            ctx.save();
            const canopySway = getAmbientSway(worldTimeRef.current, entity.position.x, 2.8 + monsoonStrength * 1.5, 1.1, entity.position.y * 0.0015);
            ctx.translate(canopySway, 0);
            if (entity.type === 'tree') {
                ctx.fillStyle = 'rgba(8, 16, 14, 0.18)';
                ctx.beginPath();
                ctx.ellipse(entity.position.x + entity.width * 0.45, entity.position.y + entity.height * 0.92, entity.width * 0.42, entity.height * 0.12, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            drawPoly(ctx, entity.polyPoints, entity.color);
            if (entity.type === 'tree') {
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.beginPath();
                ctx.ellipse(entity.position.x + entity.width * 0.35, entity.position.y + entity.height * 0.28, entity.width * 0.24, entity.height * 0.11, -0.2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
        else {
            const branchSway = entity.type === 'branch'
                ? getAmbientSway(worldTimeRef.current, entity.position.x, Math.min(3.4 + monsoonStrength, entity.width * 0.016), 2.1, entity.position.y * 0.003)
                : 0;
            const drawY = entity.position.y + branchSway;
            if (entity.type === 'tree') {
                const trunkGradient = ctx.createLinearGradient(entity.position.x, drawY, entity.position.x + entity.width, drawY);
                trunkGradient.addColorStop(0, '#34231a');
                trunkGradient.addColorStop(0.45, entity.color);
                trunkGradient.addColorStop(1, '#20130f');
                ctx.fillStyle = trunkGradient;
                ctx.fillRect(entity.position.x, drawY, entity.width, entity.height);
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.fillRect(entity.position.x + entity.width * 0.2, drawY, Math.max(2, entity.width * 0.12), entity.height);
            } else if (entity.type === 'branch') {
                ctx.save();
                ctx.fillStyle = entity.color;
                const roundRect = (ctx as CanvasRenderingContext2D & { roundRect?: (...args: any[]) => void }).roundRect;
                if (roundRect) {
                    ctx.beginPath();
                    roundRect.call(ctx, entity.position.x, drawY, entity.width, entity.height, 8);
                    ctx.fill();
                } else {
                    ctx.fillRect(entity.position.x, drawY, entity.width, entity.height);
                }
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.fillRect(entity.position.x + 6, drawY + 2, entity.width * 0.32, 2.5);
                ctx.fillStyle = 'rgba(47, 92, 55, 0.58)';
                for (let leaf = 0; leaf < Math.min(4, Math.floor(entity.width / 34)); leaf += 1) {
                    const lx = entity.position.x + 14 + leaf * (entity.width / 4.8);
                    ctx.beginPath();
                    ctx.ellipse(lx, drawY - 4 - (leaf % 2) * 2, 5, 3, -0.35, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else {
                ctx.fillStyle = entity.color;
                ctx.fillRect(entity.position.x, drawY, entity.width, entity.height);
            }
        }
      } else if (entity.type === 'vine') {
          const vineSway = getAmbientSway(worldTimeRef.current, entity.position.x, 16 + monsoonStrength * 8, 2.35, entity.position.y * 0.002);
          ctx.strokeStyle = entity.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(entity.position.x, entity.position.y);
          ctx.quadraticCurveTo(entity.position.x + vineSway, entity.position.y + entity.height/2, entity.position.x + vineSway * 0.35, entity.position.y + entity.height); ctx.stroke();
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
          const waterDrift = getAmbientSway(worldTimeRef.current, entity.position.x, 5 + monsoonStrength * 3, 1.8);
          ctx.fillStyle = entity.color; ctx.fillRect(entity.position.x + waterDrift * 0.15, entity.position.y, entity.width, entity.height);
          ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); const offset = (Date.now() * 0.2) % 20;
          for(let i=0; i<entity.width; i+=10) { ctx.moveTo(entity.position.x + waterDrift * 0.15 + i, entity.position.y + offset); ctx.lineTo(entity.position.x + waterDrift * 0.15 + i, entity.position.y + entity.height); } ctx.stroke();
      } else if (entity.type === 'water_pocket') {
          const waterBob = getAmbientSway(worldTimeRef.current, entity.position.x, 3.2 + monsoonStrength, 1.6);
          ctx.fillStyle = entity.color; ctx.strokeStyle = "rgba(129, 212, 250, 0.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(entity.position.x, entity.position.y + waterBob * 0.2, entity.width, entity.height); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          for(let i=0; i<5; i++) { const seed = i * 1337; const bx = entity.position.x + ((Date.now() * 0.02 + seed) % entity.width); const by = entity.position.y + waterBob * 0.2 + entity.height - ((Date.now() * 0.05 + seed) % entity.height); ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill(); }
      } else if (entity.type === 'geyser') {
          const cx = entity.position.x + entity.width / 2;
          const burst = entity.activated ? 1 : 0;
          ctx.fillStyle = '#65261a';
          ctx.beginPath();
          ctx.ellipse(cx, entity.position.y + entity.height - 10, entity.width * 0.6, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          if (entity.activated) {
              const flameHeight = 90 + Math.sin(Date.now() * 0.02 + entity.position.x) * 18;
              const gradient = ctx.createLinearGradient(cx, entity.position.y + entity.height, cx, entity.position.y - flameHeight);
              gradient.addColorStop(0, 'rgba(255, 118, 54, 0.15)');
              gradient.addColorStop(0.45, 'rgba(255, 155, 89, 0.85)');
              gradient.addColorStop(1, 'rgba(255, 223, 167, 0)');
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.moveTo(cx - 28, entity.position.y + entity.height);
              ctx.quadraticCurveTo(cx - 8, entity.position.y + 22, cx, entity.position.y - flameHeight);
              ctx.quadraticCurveTo(cx + 16, entity.position.y + 24, cx + 30, entity.position.y + entity.height);
              ctx.closePath();
              ctx.fill();
          } else if ((entity.attackTimer ?? 0) > 0) {
              ctx.save();
              ctx.strokeStyle = 'rgba(255, 197, 143, 0.6)';
              ctx.setLineDash([8, 6]);
              ctx.beginPath();
              ctx.ellipse(cx, entity.position.y + entity.height - 18, entity.width * 0.7, 18, 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
          }
      } else if (entity.type === 'ash_gust') {
          const centerX = entity.position.x + entity.width / 2;
          const activeAlpha = entity.activated ? 0.18 : 0.08;
          ctx.save();
          ctx.fillStyle = `rgba(221, 229, 236, ${activeAlpha})`;
          ctx.beginPath();
          ctx.ellipse(centerX, entity.position.y + entity.height / 2, entity.width * 0.48, entity.height * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = entity.activated ? 'rgba(255, 244, 214, 0.48)' : 'rgba(203, 213, 225, 0.3)';
          for (let streak = 0; streak < 4; streak += 1) {
              const offsetY = entity.position.y + 22 + streak * 40;
              ctx.beginPath();
              ctx.moveTo(entity.position.x + 10, offsetY);
              ctx.lineTo(entity.position.x + entity.width - 10, offsetY - 10);
              ctx.stroke();
          }
          ctx.restore();
      } else if (entity.type === 'checkpoint') {
          const pulse = 1 + Math.sin(Date.now() * 0.006) * 0.08;
          const cx = entity.position.x + entity.width / 2;
          const cy = entity.position.y + entity.height / 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(pulse, pulse);
          ctx.fillStyle = entity.activated ? 'rgba(254, 240, 138, 0.18)' : 'rgba(134, 239, 172, 0.14)';
          ctx.beginPath();
          ctx.arc(0, 0, 34, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.fillStyle = entity.activated ? '#fef08a' : entity.color;
          ctx.fillRect(entity.position.x + 24, entity.position.y - 16, 8, entity.height + 18);
          ctx.beginPath();
          ctx.moveTo(entity.position.x + 32, entity.position.y - 12);
          ctx.lineTo(entity.position.x + 66, entity.position.y - 2);
          ctx.lineTo(entity.position.x + 32, entity.position.y + 8);
          ctx.closePath();
          ctx.fillStyle = entity.activated ? '#f59e0b' : '#34d399';
          ctx.fill();
          ctx.strokeStyle = entity.activated ? '#fef3c7' : '#d1fae5';
          ctx.lineWidth = 2;
          ctx.stroke();
      } else { ctx.fillStyle = entity.color; ctx.fillRect(entity.position.x, entity.position.y, entity.width, entity.height); }
    });
    
    enemies.current.forEach(enemy => {
        if (!isWorldRectVisible(enemy.position.x, enemy.position.y, enemy.width, enemy.height, cameraOffset.current)) return;
        const cx = enemy.position.x + enemy.width/2; const cy = enemy.position.y + enemy.height/2; ctx.fillStyle = enemy.color;
        if (debugFlagsRef.current.showHazardTelegraphs && (enemy.attackTimer ?? 0) > 0) {
             ctx.save();
             if (enemy.telegraph === 'cross') {
                 ctx.strokeStyle = 'rgba(252, 211, 77, 0.65)';
                 ctx.lineWidth = 2;
                 ctx.setLineDash([8, 8]);
                 ctx.beginPath();
                 ctx.moveTo(enemy.position.x - 90, cy);
                 ctx.lineTo(enemy.position.x + enemy.width + 90, cy);
                 ctx.stroke();
             } else if (enemy.telegraph === 'dive') {
                 ctx.strokeStyle = 'rgba(125, 211, 252, 0.6)';
                 ctx.lineWidth = 2;
                 ctx.beginPath();
                 ctx.moveTo(cx, cy - 90);
                 ctx.lineTo(cx, cy + 60);
                 ctx.stroke();
             } else if (enemy.telegraph === 'gate') {
                 ctx.strokeStyle = 'rgba(248, 113, 113, 0.68)';
                 ctx.lineWidth = 2;
                 ctx.strokeRect(enemy.position.x - 12, enemy.position.y - 12, enemy.width + 24, enemy.height + 24);
             }
             ctx.restore();
        }
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
        } else if (enemy.enemyType === 'snake') {
             ctx.fillStyle = "#4E6E50";
             ctx.beginPath();
             ctx.roundRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height, 10);
             ctx.fill();
             ctx.fillStyle = "#FFF";
             ctx.fillRect(enemy.position.x + enemy.width - 12, enemy.position.y + 2, 3, 3);
             ctx.fillRect(enemy.position.x + enemy.width - 7, enemy.position.y + 2, 3, 3);
        } else if (enemy.enemyType === 'crocodile') {
             ctx.fillStyle = "#355C4A";
             ctx.beginPath();
             ctx.roundRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height, 12);
             ctx.fill();
             ctx.fillStyle = "#d9f99d";
             ctx.fillRect(enemy.position.x + enemy.width - 12, enemy.position.y + 4, 3, 3);
             ctx.fillRect(enemy.position.x + enemy.width - 7, enemy.position.y + 4, 3, 3);
        } else { ctx.fillRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height); }
    });

    const player = monkey.current;
    const ropeVisuals = getRopeVisualState(saveData, player.ropeTimer, player.isSwinging);
    const monkeyCosmetics = getMonkeyCosmeticState(saveData);
    
    if (player.isSwinging && player.tetherPoint) {
      const isStressed = player.ropeTimer < 3.0 && saveData.upgrades.ropeLength < 5;
      const isCritical = player.ropeTimer < 1.0;
      const flash = Math.floor(Date.now() / 50) % 2 === 0;
      let anchorX = player.tetherPoint.x; let anchorY = player.tetherPoint.y;
      if (isStressed) { const slipAmount = (3.0 - player.ropeTimer) * 4; anchorX += (Math.random() - 0.5) * slipAmount; anchorY += (Math.random() - 0.5) * slipAmount; }
      const currentDist = Math.hypot(anchorX - (player.position.x+15), anchorY - (player.position.y+15));
      const maxLen = player.ropeLength;
      const shakeX = isCritical ? (Math.random() - 0.5) * 8 : 0;
      const midX = (player.position.x + 15 + anchorX) / 2;
      const midY = (player.position.y + 15 + anchorY) / 2;
      const slack = Math.max(0, maxLen - currentDist);
      const horizontalGap = Math.abs(anchorX - (player.position.x + 15));
      const verticalFactor = Math.min(1, Math.abs(anchorY - (player.position.y + 15)) / Math.max(1, currentDist));
      const sagAmount = Math.max(18, slack * 0.66 + Math.min(34, horizontalGap * 0.06) + verticalFactor * 22);
      const bendAmount = Math.max(-18, Math.min(18, (anchorX - (player.position.x + 15)) * 0.08));
      const strandCount = isCritical ? 4 : isStressed ? 3 : 1;
      for (let strand = 0; strand < strandCount; strand += 1) {
          const strandOffset = strand - (strandCount - 1) * 0.5;
          const jitter = isCritical ? Math.sin(Date.now() * 0.04 + strand) * 2.2 : 0;
          const wobble = isCritical ? Math.cos(Date.now() * 0.05 + strand * 0.7) * 2.4 : 0;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(player.position.x + 15 + shakeX + strandOffset * 0.9, player.position.y + 15 + strandOffset * 0.35);
          ctx.quadraticCurveTo(
              midX + bendAmount + strandOffset * 1.4 + jitter,
              midY + sagAmount + strandOffset * 1.25 + wobble,
              anchorX + strandOffset * 0.65,
              anchorY + strandOffset * 0.25,
          );
          ctx.strokeStyle =
              strand === 0 && isCritical
                  ? ropeVisuals.stressColor
                  : strand === 1 && isStressed
                  ? ropeVisuals.glowColor
                  : ropeVisuals.color;
          ctx.lineWidth = Math.max(1.1, ropeVisuals.thickness - 1.25 + strand * 0.4);
          ctx.globalAlpha = isCritical ? 0.72 + strand * 0.07 : isStressed ? 0.78 + strand * 0.06 : 1;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (isStressed) {
          ctx.save();
          ctx.strokeStyle = `rgba(255, 244, 214, ${isCritical ? 0.3 : 0.18})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let fiber = 0; fiber < 3; fiber += 1) {
              const fiberOffset = (fiber - 1) * 4;
              ctx.moveTo(midX + fiberOffset, midY + sagAmount * 0.82);
              ctx.lineTo(midX + fiberOffset + Math.sin(Date.now() * 0.045 + fiber) * 6, midY + sagAmount * 0.82 + 10 + fiber * 3);
          }
          ctx.stroke();
          ctx.restore();
      }
      if (isCritical) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 210, 180, 0.34)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 7]);
          ctx.beginPath();
          ctx.moveTo(midX - 5, midY + sagAmount * 0.64);
          ctx.lineTo(midX + Math.sin(Date.now() * 0.06) * 10, midY + sagAmount * 0.64 + 18);
          ctx.stroke();
          ctx.restore();
      }
    } else if (player.releaseTetherTimer > 0 && player.releaseTetherPoint) {
      const handX = player.position.x + 15;
      const handY = player.position.y + 15;
      const dx = handX - player.releaseTetherPoint.x;
      const dy = handY - player.releaseTetherPoint.y;
      const dist = Math.max(0.001, Math.hypot(dx, dy));
      const ropeRatio = Math.min(1, player.releaseTetherLength / dist);
      const tailX = player.releaseTetherPoint.x + dx * ropeRatio;
      const tailY = player.releaseTetherPoint.y + dy * ropeRatio;
      const alpha = player.releaseTetherTimer / Math.max(player.releaseTetherMaxTimer, 0.001);
      ctx.save();
      if (player.ropeBreakTimer > 0) {
        const breakAlpha = clamp(player.ropeBreakTimer / 0.72, 0, 1);
        const fray = 1 - breakAlpha;
        ctx.lineCap = 'round';
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = `rgba(222, 207, 187, ${0.18 + breakAlpha * 0.38})`;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(player.releaseTetherPoint.x, player.releaseTetherPoint.y);
        ctx.quadraticCurveTo(
          (player.releaseTetherPoint.x + tailX) * 0.5 + Math.sin(performance.now() * 0.03) * 4,
          (player.releaseTetherPoint.y + tailY) * 0.5 + alpha * 10,
          tailX,
          tailY
        );
        ctx.stroke();
        ctx.setLineDash([]);
        for (let strand = 0; strand < 3; strand += 1) {
          const offset = strand - 1;
          ctx.strokeStyle = `rgba(250, 244, 230, ${0.08 + breakAlpha * 0.18})`;
          ctx.lineWidth = 1.6 + strand * 0.2;
          ctx.beginPath();
          ctx.moveTo(player.releaseTetherPoint.x + offset * 2, player.releaseTetherPoint.y + offset * 1.5);
          ctx.quadraticCurveTo(
            (player.releaseTetherPoint.x + tailX) * 0.5 + offset * 10 + Math.sin(performance.now() * 0.05 + strand) * (6 + fray * 8),
            (player.releaseTetherPoint.y + tailY) * 0.5 + 10 + offset * 6,
            tailX + offset * 18 + Math.sin(performance.now() * 0.06 + strand) * (10 + fray * 6),
            tailY + offset * 8
          );
          ctx.stroke();
        }
        for (let shard = 0; shard < 5; shard += 1) {
          const progress = shard / 4;
          const fragX = player.releaseTetherPoint.x + (tailX - player.releaseTetherPoint.x) * progress;
          const fragY = player.releaseTetherPoint.y + (tailY - player.releaseTetherPoint.y) * progress;
          ctx.strokeStyle = `rgba(255, 236, 212, ${0.08 + breakAlpha * 0.16})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(fragX, fragY);
          ctx.lineTo(
            fragX + Math.sin(performance.now() * 0.08 + shard) * (8 + fray * 10),
            fragY + 8 + shard * 2
          );
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = `rgba(206, 214, 220, ${0.2 + alpha * 0.35})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(player.releaseTetherPoint.x, player.releaseTetherPoint.y);
        ctx.quadraticCurveTo((player.releaseTetherPoint.x + tailX) * 0.5, (player.releaseTetherPoint.y + tailY) * 0.5 + alpha * 12, tailX, tailY);
        ctx.stroke();
      }
      ctx.restore();
    }

    const tutorialState = tutorialRef.current;
    if (tutorialState.active && tutorialState.showBox) {
        if ((tutorialState.currentStep === 'MOMENTUM' || tutorialState.currentStep === 'L2_MOMENTUM') && player.isSwinging) {
            const isMovingRight = player.velocity.x > 0; const hintKey = 'D'; const hintX = player.position.x + (isMovingRight ? 60 : -60);
            ctx.save(); ctx.translate(hintX, player.position.y);
            ctx.fillStyle = "#FFF"; ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.fillRect(-15, -15, 30, 30); ctx.strokeRect(-15, -15, 30, 30);
            ctx.fillStyle = "#000"; ctx.font = "700 16px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(hintKey, 0, 0);
            const pulsate = (Math.sin(Date.now() * 0.01) + 1) * 0.5; ctx.strokeStyle = `rgba(255, 255, 255, ${pulsate})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            const speed = Math.hypot(player.velocity.x, player.velocity.y); const maxTutorialSpeed = 22; const ratio = Math.min(speed / maxTutorialSpeed, 1);
            ctx.save(); ctx.translate(player.position.x + 15, player.position.y + 60); ctx.fillStyle = "#333"; ctx.fillRect(-30, 0, 60, 10); ctx.fillStyle = ratio > 0.8 ? "#00E676" : "#FFC107"; ctx.fillRect(-28, 2, 56 * ratio, 6); ctx.strokeStyle = "#FFF"; ctx.lineWidth = 1; ctx.strokeRect(-30, 0, 60, 10); ctx.restore();
        }
        if (tutorialState.currentStep === 'GRAPPLE' && !player.isSwinging) {
             const tree = entities.current.find(e => e.type === 'tree' && e.position.x > player.position.x + 100);
             if (tree) { const cx = tree.position.x + tree.width/2; const cy = tree.position.y + tree.height/2; ctx.save(); ctx.translate(cx, cy); const bob = Math.sin(Date.now() * 0.01) * 10; ctx.fillStyle = "rgba(255,255,0,0.5)"; ctx.beginPath(); ctx.arc(0, 0, 40 + bob, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
        }
    }

    if (smartTargetRef.current && !player.isSwinging) {
        const cx = smartTargetRef.current.anchor.x;
        const cy = smartTargetRef.current.anchor.y;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(Date.now() * 0.005); ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }

    if (player.trail.length > 1) {
        ctx.beginPath(); ctx.moveTo(player.trail[0].x, player.trail[0].y); for(let i=1; i<player.trail.length; i++) ctx.lineTo(player.trail[i].x, player.trail[i].y);
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 10; ctx.stroke();
    }

    ctx.save(); ctx.translate(player.position.x + 15, player.position.y + 15);
    ctx.save();
    ctx.translate(0, -30);
    for (let jumpIndex = 0; jumpIndex < JUMP_MAX_CHARGES; jumpIndex += 1) {
        const xOffset = (jumpIndex - 1) * 10;
        ctx.beginPath();
        ctx.fillStyle = jumpIndex < player.jumpCharges ? '#67e8f9' : 'rgba(255,255,255,0.14)';
        ctx.strokeStyle = jumpIndex < player.jumpCharges ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 2;
        ctx.arc(xOffset, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    if (player.jumpCooldown > 0) {
        const rechargeRatio = clamp(player.jumpCooldown / Math.max(0.001, Math.max(1.3, JUMP_RECHARGE_SECONDS)), 0, 1);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.34)';
        ctx.lineWidth = 2.5;
        ctx.arc(0, 0, 18, 0, Math.PI * 2 * rechargeRatio);
        ctx.stroke();
    }
    ctx.restore();
    const speed = Math.hypot(player.velocity.x, player.velocity.y);
    const fallTimerDisplay = player.fallTimer > 0 ? player.fallTimer : null;
    let faceState = 'NEUTRAL';
    if (player.invulnerableTime > 0) faceState = 'PAIN'; else if ((player.ropeTimer < 1.0 && player.isSwinging) || fallTimerDisplay !== null) faceState = 'SCARED'; else if (speed > 18 || player.isFever) faceState = 'EXCITED';
    const sprite = monkeySpriteReadyRef.current ? monkeySpriteRef.current : null;
    if (sprite) {
        let frameIndex = 0;
        if (player.isSwinging) frameIndex = player.velocity.x < -1 ? 1 : 2;
        else if (!player.grounded && Math.abs(player.velocity.y) > 6) frameIndex = 3;
        else if (!player.grounded) frameIndex = 4;
        else if (Math.abs(player.velocity.x) > 1.25) frameIndex = 5;

        const frameWidth = sprite.naturalWidth / 3;
        const frameHeight = sprite.naturalHeight / 2;
        const sx = (frameIndex % 3) * frameWidth;
        const sy = Math.floor(frameIndex / 3) * frameHeight;
        ctx.rotate(player.rotation * 0.45 + clamp(player.velocity.x / runtimeSettingsRef.current.maxSpeed, -0.15, 0.15));
        ctx.drawImage(sprite, sx, sy, frameWidth, frameHeight, -32, -34, 64, 68);
    } else {
    const bodyColor = player.freezeTime > 0 ? '#4FC3F7' : player.isFever ? '#FFEB3B' : monkeyCosmetics.furColor;
    const bellyColor = monkeyCosmetics.bellyColor;
    const limbColor = monkeyCosmetics.limbColor;
    const poseLean = clamp(player.velocity.x / runtimeSettingsRef.current.maxSpeed, -0.85, 0.85);
    const bodyStretch = clamp(Math.abs(player.velocity.y) * 0.05, 0, 3.2);
    const armReach = player.isSwinging ? 16 : 9;
    const legTrail = player.isSwinging ? 10 : clamp(player.velocity.x * 0.12, -8, 8);
    if (isInvincible && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.rotate(player.rotation + poseLean * 0.16);

    ctx.strokeStyle = limbColor;
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.bezierCurveTo(-28, 12, -28 - poseLean * 4, -6, -14, -22);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-15 - poseLean * 4, 12 + legTrail * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -1);
    ctx.lineTo(12 + poseLean * 4, 15 - legTrail * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.lineTo(-14 - poseLean * 3, -14 - armReach);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, -9);
    ctx.lineTo(14 + poseLean * 4, -10 + armReach * 0.45);
    ctx.stroke();

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 4, 12.5, 17 + bodyStretch, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(1, 7, 7, 10 + bodyStretch * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, -15, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); ctx.arc(-6, -22, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -22, 3.6, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#f5e6cf';
    ctx.beginPath();
    ctx.ellipse(0, -12, 8.2, 7.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF';
    if (faceState === 'PAIN') {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8 + player.eyeOffset.x, -16); ctx.lineTo(-2 + player.eyeOffset.x, -10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2 + player.eyeOffset.x, -16); ctx.lineTo(8 + player.eyeOffset.x, -10); ctx.stroke();
    } else if (faceState === 'SCARED') {
        ctx.beginPath(); ctx.arc(-4 + player.eyeOffset.x, -13 + player.eyeOffset.y, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4 + player.eyeOffset.x, -13 + player.eyeOffset.y, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-4 + player.eyeOffset.x, -13 + player.eyeOffset.y, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4 + player.eyeOffset.x, -13 + player.eyeOffset.y, 1.5, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.beginPath(); ctx.arc(-4 + player.eyeOffset.x, -13 + player.eyeOffset.y, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4 + player.eyeOffset.x, -13 + player.eyeOffset.y, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-4 + player.eyeOffset.x, -13 + player.eyeOffset.y, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4 + player.eyeOffset.x, -13 + player.eyeOffset.y, 1.2, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = '#3E2723'; 
    if (faceState === 'EXCITED') {
        ctx.beginPath(); ctx.arc(0, -7, 4.3, 0, Math.PI); ctx.fill();
    } else if (faceState === 'SCARED') {
        ctx.beginPath(); ctx.ellipse(0, -6, 3.2, 2.3, 0, 0, Math.PI * 2); ctx.fill();
    } else if (faceState === 'PAIN') {
        ctx.beginPath(); ctx.moveTo(-4, -6); ctx.bezierCurveTo(-2, -10, 2, -10, 4, -6); ctx.stroke();
    } else {
        ctx.fillRect(-3.5, -7.5, 7, 1.8);
    }
    }

    drawMonkeyUpgradeGear(ctx, player, saveData);
    if (player.armorStack > 0) { ctx.strokeStyle = '#A1887F'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.stroke(); }
    if (player.freezeTime > 0) { ctx.fillStyle = "rgba(179, 229, 252, 0.5)"; ctx.fillRect(-20, -20, 40, 40); ctx.strokeStyle = "#FFF"; ctx.strokeRect(-20, -20, 40, 40); }
    if (saveData.equippedSkin === 'skin_ninja') { ctx.fillStyle = monkeyCosmetics.accentColor; ctx.fillRect(-12, -21, 24, 4); ctx.fillRect(12, -20, 7, 3); }
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
        ctx.font = `700 ${Math.max(12, t.size - 2)}px system-ui, sans-serif`; ctx.fillStyle = t.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(t.text, t.position.x, t.position.y); ctx.fillText(t.text, t.position.x, t.position.y);
    });
    
    if (weatherRef.current.type === 'FOG') {
        const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT); grad.addColorStop(0, "rgba(176, 190, 197, 0.6)"); grad.addColorStop(1, "rgba(176, 190, 197, 0.2)"); ctx.fillStyle = grad; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (weatherRef.current.type === 'RAIN') { ctx.fillStyle = "rgba(0, 0, 50, 0.1)"; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }

    ctx.restore();
    
    // VISUAL ONLY: Use state for UI, logic uses REF
    if (fallTimerDisplay !== null) {
         const dangerRatio = fallTimerDisplay / VOID_TIMER_MAX_SECONDS; const opacity = 0.5 + Math.sin(Date.now() * 0.02) * 0.2;
         const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT-200, 0, CANVAS_HEIGHT); gradient.addColorStop(0, `rgba(255,0,0,0)`); gradient.addColorStop(1, `rgba(180,0,0,${Math.min(0.8, dangerRatio)})`); ctx.fillStyle = gradient; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
         ctx.fillStyle = "#FFF"; ctx.font = "700 32px system-ui, sans-serif"; const secondsLeft = Math.max(0, VOID_TIMER_MAX_SECONDS - fallTimerDisplay).toFixed(1); ctx.fillText(`VOID PULL! ${secondsLeft}s`, CANVAS_WIDTH/2 - 110, CANVAS_HEIGHT - 50);
    }
  };

  const stepPhysics = (dt: number) => {
    const player = monkey.current;
    const tutorialState = tutorialRef.current;
    const save = saveDataRef.current;
    const muted = isMutedRef.current;
    const focusActive = focusTimerRef.current > 0;
    const focusScale = focusActive ? clamp(0.72 - save.upgrades.feverDuration * 0.05, 0.42, 0.72) : 1;
    const previousPosition = { x: player.position.x, y: player.position.y };
    const wasGrounded = player.grounded;
    worldTimeRef.current += dt;
    const seasonalFlow = getSeasonalFlow(worldTimeRef.current * 1.45, selectedLevelRef.current);
    const ambientFlow = getAmbientFlow(worldTimeRef.current, selectedLevelRef.current, currentBiomeRef.current, weatherRef.current.type, player.position.x, player.position.y, focusScale);
    const monsoonStrength = getMonsoonStrength(currentBiomeRef.current, weatherRef.current.type, seasonalFlow) * 0.22
        + (weatherRef.current.type === 'WINDY' ? 0.04 : 0);

    cycleWeather(dt * 1000);
    if (Math.random() < 0.1) spawnWeatherParticles();
    if (focusTimerRef.current > 0) focusTimerRef.current = Math.max(0, focusTimerRef.current - dt);
    if (focusCooldownRef.current > 0) focusCooldownRef.current = Math.max(0, focusCooldownRef.current - dt);
    if (skillChain.current.active) {
        skillChain.current.timer = Math.max(0, skillChain.current.timer - dt * 60);
        if (skillChain.current.timer === 0) {
            cashOutSkillChain(skillChain.current.rank === 'GROOVIN' ? 'CHAIN' : skillChain.current.rank);
        } else {
            setSkillChainUI({ ...skillChain.current });
        }
    }

    if (!player.isSwinging && inputRef.current.grappleHeld && player.grappleCooldown <= 0) {
        const heldTarget = inputRef.current.isMouseDown
            ? findMouseSwingTarget(inputRef.current.mousePos.x + cameraOffset.current.x, inputRef.current.mousePos.y + cameraOffset.current.y)
            : findKeyboardSwingTarget();
        if (heldTarget) startSwing(heldTarget);
    }

    if (player.isSwinging && !inputRef.current.grappleHeld) {
        releaseSwing();
    }

    if (tutorialState.active && tutorialState.timer !== undefined) {
         if (tutorialState.timer > 0) updateTutorial(1);
         else if (tutorialState.currentStep === 'L2_INTRO' && tutorialState.timer <= 0) updateTutorial(1);
    }

    if (player.jumpCooldown > 0) {
        player.jumpCooldown = Math.max(0, player.jumpCooldown - dt);
        if (player.jumpCooldown === 0 && player.jumpCharges < JUMP_MAX_CHARGES) {
            player.jumpCharges = JUMP_MAX_CHARGES;
            spawnFloatingText(player.position.x + 10, player.position.y - 26, 'JUMPS READY', '#a7f3d0', 14);
        }
    }
    if (player.ropeBreakTimer > 0) player.ropeBreakTimer = Math.max(0, player.ropeBreakTimer - dt);
    if (player.coyoteTimer > 0) player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
    if (player.platformDropTimer > 0) player.platformDropTimer = Math.max(0, player.platformDropTimer - dt);
    if (player.grappleCooldown > 0) player.grappleCooldown = Math.max(0, player.grappleCooldown - dt);
    if (player.retargetGraceTimer > 0) player.retargetGraceTimer = Math.max(0, player.retargetGraceTimer - dt);
    inputRef.current.keyHold.left = inputRef.current.keys.left ? Math.min(inputRef.current.keyHold.left + dt, 0.95) : Math.max(0, inputRef.current.keyHold.left - dt * 3.8);
    inputRef.current.keyHold.right = inputRef.current.keys.right ? Math.min(inputRef.current.keyHold.right + dt, 0.95) : Math.max(0, inputRef.current.keyHold.right - dt * 3.8);
    inputRef.current.keyHold.up = inputRef.current.keys.up ? Math.min(inputRef.current.keyHold.up + dt, 0.95) : Math.max(0, inputRef.current.keyHold.up - dt * 3.8);
    inputRef.current.keyHold.down = inputRef.current.keys.down ? Math.min(inputRef.current.keyHold.down + dt, 0.95) : Math.max(0, inputRef.current.keyHold.down - dt * 3.8);
    player.grounded = false;
    const swingDriveInput = getSwingDriveInput();
    const swingBrakeInput = getSwingBrakeInput();
    const targetLean = player.isSwinging ? getSwingControlIntent() : getMoveDirection();
    const leanRate = player.isSwinging ? 0.08 : wasGrounded ? 0.22 : 0.15;
    player.controlLean += (targetLean - player.controlLean) * leanRate;

    const speed = Math.hypot(player.velocity.x, player.velocity.y);
    if (speed > player.maxSpeedAchieved) player.maxSpeedAchieved = speed;
    if (speed > runDebriefRef.current.peakSpeed) runDebriefRef.current.peakSpeed = speed;
    const tuning = runtimeSettingsRef.current;
    if (player.releaseTetherTimer > 0) {
        player.releaseTetherTimer = Math.max(0, player.releaseTetherTimer - dt);
        const retractForce = 1 - player.releaseTetherTimer / Math.max(player.releaseTetherMaxTimer, 0.001);
        player.releaseTetherLength = Math.max(0, player.releaseTetherLength - (240 + speed * 10) * dt * (0.8 + retractForce * 0.7));
        if (player.releaseTetherTimer === 0 || player.releaseTetherLength <= 6) {
            player.releaseTetherPoint = null;
            player.releaseTetherLength = 0;
            player.releaseTetherMaxTimer = 0;
        }
    }

    player.velocity.y += tuning.gravity;
    player.velocity.x *= player.isSwinging ? tuning.swingAirResistance : tuning.airResistance;
    player.velocity.y *= player.isSwinging ? 0.999 : tuning.airResistance;
    if (monsoonStrength > 0) {
        player.velocity.x += ambientFlow.x * (player.isSwinging ? 0.055 : 0.072) * monsoonStrength;
        player.velocity.y += ambientFlow.y * 0.06 * monsoonStrength;
    }

    if (player.isSwinging && player.tetherPoint) {
        const dx = player.position.x - player.tetherPoint.x;
        const dy = player.position.y - player.tetherPoint.y;
        const dist = Math.max(0.001, Math.sqrt(dx*dx + dy*dy));
        const nx = dx / dist;
        const ny = dy / dist;
        const tx = -ny;
        const ty = nx;
        const tangentialVelocity = player.velocity.x * tx + player.velocity.y * ty;
        const radialVelocity = player.velocity.x * nx + player.velocity.y * ny;
        const controlLean = player.controlLean;
        const motionSign = Math.sign(tangentialVelocity) || getTravelDirection() || 1;
        const controlForce = 0.58 + (save.upgrades.swingForce * 0.1) + player.runForceBonus * 0.3;
        const syncBoost = swingDriveInput > 0 ? Math.min(0.18, Math.abs(tangentialVelocity) * 0.01) : 0;
        const catchUpBoost = swingDriveInput > 0 && Math.abs(tangentialVelocity) < 10 ? 0.06 : 0;
        const ropeReachBonus = save.upgrades.ropeLength * 10;
        const ropeMin = Math.max(92, 108 - save.upgrades.grip * 4);
        const ropeMax = Math.max(180 + ropeReachBonus, dist + 110 + save.upgrades.castRange * 18 + ropeReachBonus);
        player.ropeTargetLength = clamp(player.ropeTargetLength || player.ropeLength, ropeMin, ropeMax);

        if (swingDriveInput > 0) {
            const steerForce = (controlForce + syncBoost + catchUpBoost) * swingDriveInput;
            player.velocity.x += tx * motionSign * steerForce;
            player.velocity.y += ty * motionSign * steerForce;
            const ropePump = -(0.1 + save.upgrades.grip * 0.012) * swingDriveInput;
            player.ropeTargetLength = clamp(player.ropeTargetLength + ropePump, ropeMin, ropeMax);
            player.velocity.x -= nx * ropePump * 0.03;
            player.velocity.y -= ny * ropePump * 0.03;
        }

        if (swingBrakeInput > 0) {
            const brakeStrength = 0.1 + swingBrakeInput * (0.18 + save.upgrades.airControl * 0.012 + save.upgrades.grip * 0.008);
            const damping = Math.min(Math.abs(tangentialVelocity) * brakeStrength, 0.9 + save.upgrades.grip * 0.04);
            player.velocity.x -= tx * motionSign * damping;
            player.velocity.y -= ty * motionSign * damping;
            player.ropeTargetLength = clamp(player.ropeTargetLength + (0.16 + save.upgrades.grip * 0.02) * swingBrakeInput, ropeMin, ropeMax);
            const loopClamp = Math.max(0, Math.abs(tangentialVelocity) - 16);
            if (loopClamp > 0) {
                player.velocity.x -= tx * motionSign * loopClamp * 0.018;
                player.velocity.y -= ty * motionSign * loopClamp * 0.018;
            }
        }

        if (Math.abs(controlLean) > 0.04 || swingBrakeInput > 0) {
            const outwardDrift = Math.max(0, radialVelocity);
            if (outwardDrift > 0) {
                player.velocity.x -= nx * outwardDrift * 0.12;
                player.velocity.y -= ny * outwardDrift * 0.12;
            }

            if (tutorialState.active && (tutorialState.currentStep === 'WELCOME' || tutorialState.currentStep === 'MOMENTUM' || tutorialState.currentStep === 'L2_MOMENTUM')) updateTutorial(dt);
        }

        if (inputRef.current.keys.up) {
            player.ropeTargetLength = Math.max(ropeMin, player.ropeTargetLength - (0.9 + save.upgrades.grip * 0.06));
            player.velocity.y -= 0.15;
        }

        if (inputRef.current.keys.down) {
            player.ropeTargetLength = Math.min(ropeMax, player.ropeTargetLength + (1.02 + save.upgrades.castRange * 0.06));
            player.velocity.y += 0.18;
        }

        const reelDelta = player.ropeTargetLength - player.ropeLength;
        player.ropeReelVelocity += reelDelta * tuning.ropeReelSpring;
        player.ropeReelVelocity *= tuning.ropeReelDamping;
        player.ropeReelVelocity = clamp(player.ropeReelVelocity, -tuning.ropeReelMaxSpeed, tuning.ropeReelMaxSpeed);
        player.ropeLength = clamp(player.ropeLength + player.ropeReelVelocity, ropeMin, ropeMax);

        if (!tutorialState.active) {
            const gripDrainMultiplier = Math.max(0.45, 1 - save.upgrades.grip * 0.11 - (focusActive ? 0.18 : 0));
            player.ropeTimer -= dt * gripDrainMultiplier;
        }
        if (player.ropeTimer <= 0 && !tutorialState.active && save.upgrades.ropeLength < 5) {
             const brokenTetherPoint = player.tetherPoint ? { ...player.tetherPoint } : null;
             player.isSwinging = false;
             player.ropeBreakTimer = 0.72;
             if (brokenTetherPoint) {
                 player.releaseTetherPoint = brokenTetherPoint;
                 player.releaseTetherLength = Math.max(player.ropeLength, 64);
                 player.releaseTetherTimer = Math.max(player.releaseTetherTimer, 0.62);
                 player.releaseTetherMaxTimer = Math.max(player.releaseTetherMaxTimer, 0.62);
             }
             player.tetherPoint = null;
             player.ropeTargetLength = 0;
             player.ropeReelVelocity = 0;
             spawnFloatingText(player.position.x, player.position.y, "SNAP!", "#D50000", 25);
             spawnParticles(player.position.x, player.position.y, '#F7E5C8', 16, 2.8, 'wood');
             spawnParticles(player.position.x, player.position.y, '#FFF2C8', 10, 2.2, 'spark');
             spawnParticles(player.position.x, player.position.y, '#FFFFFF', 8, 2.2, 'wind');
             if (!muted) SoundSynth.playBranchBreak();
        }
    } else {
        player.ropeTargetLength = 0;
        player.ropeReelVelocity *= 0.7;
        const airControl = save.upgrades.airControl * 0.06 + (focusActive ? 0.08 : 0);
        const groundedAcceleration = 0.66 + save.upgrades.airControl * 0.05;
        player.velocity.x += player.controlLean * (wasGrounded ? groundedAcceleration * 0.72 : 0.22 + airControl * 0.75);
        if (wasGrounded) {
            player.velocity.x *= tuning.groundFriction;
            if (Math.abs(player.velocity.x) < 0.08) player.velocity.x = 0;
        }
        if (inputRef.current.keys.down) {
            if (wasGrounded && player.platformDropTimer <= 0) {
                player.platformDropTimer = PLATFORM_DROP_TIME_SECONDS;
                player.coyoteTimer = 0;
                player.position.y += 6;
                player.velocity.y = Math.max(player.velocity.y, 5.5);
            } else {
                player.velocity.y += 0.9;
            }
        }
    }

    player.velocity.x = clamp(player.velocity.x, -tuning.maxSpeed, tuning.maxSpeed);
    player.velocity.y = clamp(player.velocity.y, -tuning.maxSpeed, tuning.maxSpeed * 1.1);
    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y;

    if (player.isSwinging && player.tetherPoint) {
        const dx = player.position.x - player.tetherPoint.x;
        const dy = player.position.y - player.tetherPoint.y;
        const dist = Math.max(0.001, Math.sqrt(dx*dx + dy*dy));
        const nx = dx / dist;
        const ny = dy / dist;
        const radialVelocity = player.velocity.x * nx + player.velocity.y * ny;
        const stretch = Math.max(0, dist - player.ropeLength);
        if (stretch > 0) {
            const springForce = stretch * 0.028;
            const dampingForce = Math.max(0, radialVelocity) * 0.09;
            player.velocity.x -= nx * (springForce + dampingForce);
            player.velocity.y -= ny * (springForce + dampingForce);
        }
        if (dist >= player.ropeLength) {
            const ratio = player.ropeLength / dist;
            player.position.x = player.tetherPoint.x + dx * ratio;
            player.position.y = player.tetherPoint.y + dy * ratio;
            const tx = -ny;
            const ty = nx;
            const tangentialVelocity = player.velocity.x * tx + player.velocity.y * ty;
            const radialVelocity = player.velocity.x * nx + player.velocity.y * ny;
            const inwardCarry = radialVelocity < 0 ? radialVelocity * 0.42 : radialVelocity * 0.05;
            const momentumRetention = clamp(
                tuning.swingMomentumRetention + Math.abs(player.controlLean) * 0.0012 + (inputRef.current.keys.up ? 0.0006 : 0),
                0.996,
                1.0035,
            );
            player.velocity.x = tx * (tangentialVelocity * momentumRetention) + nx * inwardCarry;
            player.velocity.y = ty * (tangentialVelocity * momentumRetention) + ny * inwardCarry;
        }
    }

    let landedSurface: Entity | null = null;
    if (!player.isSwinging && player.platformDropTimer <= 0) {
        entities.current.forEach(entity => {
            if (!canLandOnSurface(player, previousPosition, entity)) return;
            if (!landedSurface || entity.position.y < landedSurface.position.y) {
                landedSurface = entity;
            }
        });
    }

    if (landedSurface) {
        const surfaceY = landedSurface.position.y + (landedSurface.type === 'lilypad' ? 3 : 0);
        player.position.y = surfaceY - player.height;
        player.velocity.y = Math.min(player.velocity.y, 0);
        player.grounded = true;
        player.coyoteTimer = COYOTE_TIME_SECONDS;
        player.fallTimer = 0;
    }

    if (player.position.y < CEILING_LIMIT) {
        player.position.y = CEILING_LIMIT;
        player.velocity.y *= -0.5;
    }

    const voidLimit = cameraOffset.current.y + CANVAS_HEIGHT + 260;
    if (player.position.y > voidLimit) {
        if (player.hasUsedNet || save.upgrades.safetyNet === 0) {
             player.fallTimer += dt;
             if (player.fallTimer > VOID_TIMER_MAX_SECONDS) takeDamage(999, "Fell into the Void");
        } else {
             player.velocity.y = -25;
             player.hasUsedNet = true;
             runDebriefRef.current.usedSafetyNet = true;
             spawnFloatingText(player.position.x, player.position.y, "SAFETY NET!", "#4CAF50", 30);
             if (!muted) SoundSynth.playJump();
        }
    } else if (player.fallTimer > 0) {
         player.fallTimer = 0;
    }

    const lookX = clamp(player.velocity.x * 0.18, -2.5, 2.5);
    const lookY = clamp(player.velocity.y * 0.12, -2.2, 2.2);
    player.eyeOffset.x += (lookX - player.eyeOffset.x) * 0.18;
    player.eyeOffset.y += (lookY - player.eyeOffset.y) * 0.18;

    player.trail.push({ x: player.position.x + 15, y: player.position.y + 15 });
    if (player.trail.length > 20) player.trail.shift();

    const targetCamX = player.position.x - CANVAS_WIDTH * 0.3;
    const targetCamY = Math.min(Math.max(player.position.y - CANVAS_HEIGHT * 0.48, -500), 820);
    const cameraLerp = 0.14 + Math.min(speed / 140, 0.06);
    cameraOffset.current.x += (targetCamX - cameraOffset.current.x) * cameraLerp;
    cameraOffset.current.y += (targetCamY - cameraOffset.current.y) * (cameraLerp * 0.92);

    const newDist = Math.floor(player.position.x / 20);
    if (newDist > distanceRef.current) {
        distanceRef.current = newDist;
        if (newDist % 50 === 0) {
            scoreRef.current += 10;
        }
    }

    const currentLevel = LEVELS[selectedLevelRef.current - 1];
    if (distanceRef.current >= currentLevel.targetDistance) {
        handleGameOver(true);
    }

    if (player.position.x > entities.current.length * 50 - 2000) {
         const lastEntity = entities.current[entities.current.length - 1];
         if (lastEntity && player.position.x > lastEntity.position.x - 1000) spawnLevelSegment(lastEntity.position.x + randomRange(300, 600));
    }

    const activeXStart = cameraOffset.current.x - 260;
    const activeXEnd = cameraOffset.current.x + CANVAS_WIDTH + 860;
    const activeYStart = cameraOffset.current.y - 320;
    const activeYEnd = cameraOffset.current.y + CANVAS_HEIGHT + 760;

    entities.current.forEach(entity => {
         const inActiveWindow = entity.position.x + entity.width > activeXStart && entity.position.x < activeXEnd && entity.position.y + entity.height > activeYStart && entity.position.y < activeYEnd;
         if (!inActiveWindow && entity.type !== 'portal') return;

         if (entity.collectTimer !== undefined && entity.collectTimer > 0) {
             entity.collectTimer = Math.max(0, entity.collectTimer - dt);
             if (entity.collectTimer === 0) entity.position.y = -9999;
             return;
         }
         if (entity.type === 'branch' && entity.isBroken && entity.breakVelocity) {
             entity.breakTimer = Math.max(0, (entity.breakTimer ?? 0) - dt);
             entity.position.x += entity.breakVelocity.x;
             entity.position.y += entity.breakVelocity.y;
             entity.breakVelocity.y = Math.min(8, entity.breakVelocity.y + dt * 24);
             entity.breakVelocity.x *= 0.99;
             entity.angle = (entity.angle ?? 0) + entity.breakVelocity.x * 0.015;
         }

         if ((entity.type === 'geyser' || entity.type === 'ash_gust') && entity.attackTimer !== undefined) {
             entity.attackTimer -= dt * 60;
             if (entity.attackTimer <= 0) {
                 const wasActive = entity.activated ?? false;
                 entity.activated = !wasActive;
                 entity.attackTimer = wasActive ? 86 + Math.random() * 24 : entity.type === 'geyser' ? 34 : 46;
             }
         }

         if (entity.type === 'coin' && save.upgrades.magnetism > 0) {
             const cx = entity.position.x + entity.width / 2;
             const cy = entity.position.y + entity.height / 2;
             const dx = player.position.x + player.width / 2 - cx;
             const dy = player.position.y + player.height / 2 - cy;
             const dist = Math.hypot(dx, dy);
             const magnetRadius = 90 + save.upgrades.magnetism * 55;
             if (dist > 0 && dist < magnetRadius) {
                 const pull = (1 - dist / magnetRadius) * (0.9 + save.upgrades.magnetism * 0.22);
                 entity.position.x += (dx / dist) * pull;
                 entity.position.y += (dy / dist) * pull;
             }
         }

         if (checkCollision(player, entity)) {
             if (entity.type === 'coin') {
                 entity.collectTimer = 0.22;
                 let amount = 1;
                 if (Math.random() < save.upgrades.luck * 0.1) {
                     amount = 2;
                     spawnFloatingText(entity.position.x, entity.position.y, "LUCKY!", "#FFD700", 20);
                 }
                 runTokensRef.current += amount;
                 scoreRef.current += amount * 15;
                 if (!muted) SoundSynth.playCoin();
                 spawnFloatingText(entity.position.x, entity.position.y - 6, amount > 1 ? `x${amount}` : '+1', '#fde68a', 18);
                 spawnParticles(entity.position.x, entity.position.y, entity.color, 22, 3.6, 'spark');
                 spawnParticles(entity.position.x, entity.position.y, '#ffffff', 12, 2.8, 'wind');
                 spawnParticles(entity.position.x, entity.position.y, '#fef3c7', 12, 3);
                 spawnParticles(entity.position.x, entity.position.y, '#fde68a', 6, 1.8, 'spark');
                 triggerSkillEvent(amount > 1 ? 'Lucky coin' : 'Coin line', 16 + amount * 4, amount > 1 ? 0.16 : 0.08, '#fde68a');
             } else if (entity.type === 'checkpoint') {
                 activateCheckpoint(entity);
                 triggerSkillEvent('Checkpoint', 42, 0.22, '#a7f3d0');
             } else if (entity.type === 'portal') {
                 triggerSkillEvent('Route clear', 96, 0.35, '#fef08a');
                 cashOutSkillChain('ROUTE');
                 handleGameOver(true);
             } else if (entity.type === 'flower') {
                 entity.position.y = -9999;
                 player.velocity.y = -10;
                 spawnParticles(entity.position.x, entity.position.y, entity.color, 5);
             } else if (entity.type === 'web' && !player.isFever) {
                 const webSlow = Math.max(0.72, 0.84 - save.upgrades.hazardResist * 0.02);
                 player.velocity.x *= webSlow;
                 player.velocity.y *= webSlow;
             } else if (entity.type === 'updraft') {
                 player.velocity.y -= 0.72;
                 player.velocity.x += Math.sin(player.position.y * 0.03) * 0.08;
             } else if (entity.type === 'waterfall') {
                 const waterfallPush = Math.max(0.18, 0.38 - save.upgrades.hazardResist * 0.03) * focusScale;
                 player.velocity.x += waterfallPush;
                 player.velocity.y += 0.15 * focusScale;
             } else if (entity.type === 'water_pocket') {
                 const waterDrag = Math.max(0.82, 0.92 - save.upgrades.hazardResist * 0.015);
                 player.velocity.x *= waterDrag;
                 player.velocity.y = player.velocity.y * waterDrag - 0.28;
             } else if (entity.type === 'geyser') {
                 if (!entity.activated) return;
                 player.velocity.y = Math.min(player.velocity.y, -13.5 + save.upgrades.hazardResist * 0.35);
                 player.velocity.x += 0.5 + save.upgrades.airControl * 0.08;
                 takeDamage(Math.max(1, 2 - Math.floor(save.upgrades.hazardResist / 3)), 'Lava geyser');
                 spawnParticles(entity.position.x + entity.width / 2, entity.position.y + 16, '#ffb74d', 10, 3, 'spark');
             } else if (entity.type === 'ash_gust') {
                 if (!entity.activated) return;
                 const gustPush = 0.95 + monsoonStrength * 0.8;
                 player.velocity.x += gustPush;
                 player.velocity.y -= 0.45;
                 if (!player.isSwinging) player.velocity.x *= 0.99;
             } else if (entity.type === 'lake') {
                 if (entity.biome === 'VOLCANO') {
                     const lavaKick = Math.max(9, 14 - save.upgrades.hazardResist);
                     player.velocity.y = -lavaKick;
                     takeDamage(Math.max(1, 2 - Math.floor(save.upgrades.hazardResist / 3)), 'Lava burn');
                 } else {
                     const lakeDrag = Math.max(0.84, 0.94 - save.upgrades.hazardResist * 0.015);
                     player.velocity.x *= lakeDrag;
                     player.velocity.y = player.velocity.y * lakeDrag - 0.18;
                 }
             } else if (entity.type === 'lilypad' && player.velocity.y >= 0) {
                 player.position.y = entity.position.y - player.height + 3;
                 player.velocity.y = Math.min(player.velocity.y, 0);
                 player.velocity.x += 0.15;
             }
         }

         if (entity.type === 'branch' && !entity.isBroken && entity.stability !== undefined && entity.stability < 50) {
             if (checkCollision({position: {x: player.position.x, y: player.position.y + 30}, width: 30, height: 1}, entity)) {
                 entity.stability -= Math.max(0.18, 1 - save.upgrades.branchMastery * 0.14 - (focusActive ? 0.2 : 0));
                 if (entity.stability <= 0) {
                     entity.isBroken = true;
                     entity.angle = (Math.random() - 0.5) * 0.5;
                     entity.breakVelocity = { x: (Math.random() - 0.5) * 2.8, y: 2.4 + Math.random() * 2.2 };
                     entity.breakTimer = 0.42;
                     entity.color = '#5D4037';
                     spawnParticles(entity.position.x + entity.width/2, entity.position.y, '#795548', 20, 4.8, 'wood');
                     spawnParticles(entity.position.x + entity.width/2, entity.position.y - 8, '#fef3c7', 14, 3.6, 'spark');
                     spawnParticles(entity.position.x + entity.width/2, entity.position.y - 12, '#ffffff', 12, 2.8, 'wind');
                     spawnFloatingText(entity.position.x + entity.width / 2, entity.position.y - 18, 'THREADS FAIL', '#fde68a', 16);
                     triggerSkillEvent('Snap save', 24, 0.12, '#fca5a5');
                     if (!muted) SoundSynth.playBranchBreak();
                 }
             }
         }
    });

    enemies.current.forEach(enemy => {
        const inActiveWindow = enemy.position.x + enemy.width > activeXStart && enemy.position.x < activeXEnd && enemy.position.y + enemy.height > activeYStart && enemy.position.y < activeYEnd;
        if (!inActiveWindow) return;

        if (enemy.attackTimer !== undefined && enemy.attackTimer > 0) {
            enemy.attackTimer = Math.max(0, enemy.attackTimer - dt * 60);
        }

        const warningActive = (enemy.attackTimer ?? 0) > 0;
        const warningScale =
            enemy.telegraph === 'cross' ? 0.18 :
            enemy.telegraph === 'dive' ? 0.1 :
            enemy.telegraph === 'gate' ? 0 :
            1;

        enemy.position.x += enemy.velocity.x * focusScale * (warningActive ? warningScale : 1);
        enemy.position.y += enemy.velocity.y * focusScale * (warningActive ? Math.max(0.2, warningScale) : 1);

        if (enemy.enemyType === 'spider' && enemy.anchorY) {
            if (enemy.position.y > enemy.anchorY + 100) enemy.velocity.y = -2;
            if (enemy.position.y < enemy.anchorY - 50) enemy.velocity.y = 2;
        } else if (enemy.enemyType === 'snake') {
            if (enemy.anchorX === undefined) enemy.anchorX = enemy.position.x;
            if (enemy.position.x > enemy.anchorX + 90) enemy.velocity.x = -Math.abs(enemy.velocity.x);
            if (enemy.position.x < enemy.anchorX - 90) enemy.velocity.x = Math.abs(enemy.velocity.x);
            enemy.position.y += Math.sin((enemy.position.x + enemy.id.length * 13) * 0.05) * 0.3;
        } else if (enemy.enemyType === 'crocodile') {
            if (enemy.anchorX === undefined) enemy.anchorX = enemy.position.x;
            if (enemy.position.x > enemy.anchorX + 120) enemy.velocity.x = -Math.abs(enemy.velocity.x);
            if (enemy.position.x < enemy.anchorX - 120) enemy.velocity.x = Math.abs(enemy.velocity.x);
            if (Math.abs((player.position.x + player.width / 2) - (enemy.position.x + enemy.width / 2)) < 90) enemy.velocity.x *= 1.02;
        } else if (enemy.enemyType === 'troll') {
            enemy.velocity.x = 0;
        }

        if (checkCollision(player, enemy) && enemy.health > 0) takeDamage(1, `Hit by ${enemy.enemyType}`);
    });

    entities.current = entities.current.filter(e => e.position.x > cameraOffset.current.x - 200 && e.position.y > -9000);
    enemies.current = enemies.current.filter(e => e.position.x > cameraOffset.current.x - 200);
    particles.current.forEach(p => {
        if (p.type === 'leaf') {
            p.velocity.x += Math.sin((p.position.y + p.life) * 0.02) * 0.03;
            p.velocity.y += 0.02;
        } else if (p.type === 'ash') {
            p.velocity.x += Math.sin((p.position.y + p.life) * 0.03) * 0.02;
        } else if (p.type === 'spore') {
            p.velocity.x += Math.sin((p.position.y + p.life) * 0.018) * 0.015;
            p.velocity.y += Math.cos((p.position.x + p.life) * 0.01) * 0.003;
        }
        p.position.x += p.velocity.x;
        p.position.y += p.velocity.y;
        p.life--;
    });
    particles.current = particles.current.filter(p => p.life > 0);
    if (particles.current.length > MAX_PARTICLES) {
        particles.current = particles.current.slice(particles.current.length - MAX_PARTICLES);
    }
    floatingTexts.current.forEach(t => { t.position.y += t.velocity.y; t.life--; });
    floatingTexts.current = floatingTexts.current.filter(t => t.life > 0);
    if (floatingTexts.current.length > MAX_FLOATING_TEXTS) {
        floatingTexts.current = floatingTexts.current.slice(floatingTexts.current.length - MAX_FLOATING_TEXTS);
    }
    if (checkpointBannerTimerRef.current > 0) {
        checkpointBannerTimerRef.current = Math.max(0, checkpointBannerTimerRef.current - dt);
        if (checkpointBannerTimerRef.current === 0) setCheckpointBanner(null);
    }

    hudSyncTimerRef.current += dt;
    if (hudSyncTimerRef.current >= HUD_SYNC_INTERVAL_SECONDS) {
        hudSyncTimerRef.current = 0;
        setDistance(distanceRef.current);
        setScore(scoreRef.current);
        setRunTokens(runTokensRef.current);
    }
  };

  const updatePhysics = (timestamp: number) => {
    const currentGameState = gameStateRef.current;
    const paused = isPausedRef.current;

    if (lastFrameTimeRef.current === null) lastFrameTimeRef.current = timestamp;
    const elapsedMs = Math.min(128, Math.max(0, timestamp - lastFrameTimeRef.current));
    lastFrameTimeRef.current = timestamp;
    atlasPerformanceRef.current.avgFrameMs = lerpNumber(atlasPerformanceRef.current.avgFrameMs, elapsedMs || FIXED_TIMESTEP_MS, 0.08);
    atlasPerformanceRef.current.quality = getAtlasQualityForFrameMs(atlasPerformanceRef.current.avgFrameMs);

    if (paused || currentGameState !== GameState.PLAYING) {
        fixedStepAccumulatorRef.current = 0;
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            draw(ctx);
        }
        requestRef.current = requestAnimationFrame(updatePhysics);
        return;
    }

    if (manualStepHoldUntilRef.current > performance.now()) {
        fixedStepAccumulatorRef.current = 0;
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            draw(ctx);
        }
        if (currentGameState === GameState.PLAYING) requestRef.current = requestAnimationFrame(updatePhysics);
        return;
    }

    fixedStepAccumulatorRef.current += elapsedMs;
    let steps = 0;
    while (fixedStepAccumulatorRef.current >= FIXED_TIMESTEP_MS && steps < MAX_CATCH_UP_STEPS) {
        stepPhysics(FIXED_TIMESTEP);
        fixedStepAccumulatorRef.current -= FIXED_TIMESTEP_MS;
        steps += 1;
    }

    if (steps === MAX_CATCH_UP_STEPS && fixedStepAccumulatorRef.current > FIXED_TIMESTEP_MS * MAX_CATCH_UP_STEPS) {
        fixedStepAccumulatorRef.current = FIXED_TIMESTEP_MS * MAX_CATCH_UP_STEPS;
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        draw(ctx);
    }

    if (currentGameState === GameState.PLAYING) requestRef.current = requestAnimationFrame(updatePhysics);
  };

  useEffect(() => {
    lastFrameTimeRef.current = null;
    fixedStepAccumulatorRef.current = 0;
    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, isPaused, currentBiome]);

  useEffect(() => {
      const handleVisibilityChange = () => {
          lastFrameTimeRef.current = null;
          fixedStepAccumulatorRef.current = 0;
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const getCanvasPointerPosition = (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return null;
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY,
      };
  };

  // --- INPUT HANDLING ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          const currentGameState = gameStateRef.current;
          const gameplayLive = currentGameState === GameState.PLAYING && !isPausedRef.current;
          if (launchIntroRef.current) {
              if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
                  e.preventDefault();
                  launchQueuedGame(launchIntroRef.current.levelId);
              }
              return;
          }
          if (currentGameState === GameState.MENU && !isUiControlTarget(e.target)) {
              if (e.code === 'ArrowLeft') {
                  e.preventDefault();
                  stepSelectedRoute(-1);
                  return;
              }
              if (e.code === 'ArrowRight') {
                  e.preventDefault();
                  stepSelectedRoute(1);
                  return;
              }
              if (e.code === 'Home') {
                  e.preventDefault();
                  handleSelectLevel(1, { focus: true });
                  return;
              }
              if (e.code === 'End') {
                  e.preventDefault();
                  handleSelectLevel(LEVELS.length, { focus: true });
                  return;
              }
          }
          if (e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.keys.right = true;
          if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.keys.left = true;
          if (e.code === 'KeyW' || e.code === 'ArrowUp') inputRef.current.keys.up = true;
          if (e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.keys.down = true;
          if (e.code === 'Escape') {
              e.preventDefault();
              if (currentGameState === GameState.SHOP) {
                  setGameState(GameState.MENU);
                  return;
              }
              if (currentGameState === GameState.PLAYING || isPausedRef.current) {
                  togglePause();
                  return;
              }
          }
          if (e.code === 'KeyF') {
              e.preventDefault();
              void toggleFullscreen();
          }
          if (e.code === 'KeyP') {
              e.preventDefault();
              togglePause();
          }
          if (e.code === 'KeyM') {
              e.preventDefault();
              toggleMute();
          }
          if (e.code === 'Enter' && currentGameState === GameState.MENU) {
              e.preventDefault();
              if (selectedLevelId !== null) queueGameLaunch(selectedLevelId);
          }
          if (e.code === 'KeyH' && currentGameState === GameState.PLAYING && tutorialRef.current.active) {
              e.preventDefault();
              setHideTutorialTips((prev) => !prev);
          }
          if (e.code === 'KeyQ' && gameplayLive && !e.repeat && saveDataRef.current.upgrades.feverDuration > 0) {
              e.preventDefault();
              if (focusTimerRef.current <= 0 && focusCooldownRef.current <= 0) {
                  focusTimerRef.current = 0.7 + saveDataRef.current.upgrades.feverDuration * 0.22;
                  focusCooldownRef.current = Math.max(2.8, 7 - saveDataRef.current.upgrades.feverDuration * 0.4);
                  setActiveAbility(AbilityType.SLOW_MO);
                  spawnFloatingText(monkey.current.position.x, monkey.current.position.y - 36, 'FOCUS', '#d4f7ff', 20);
              }
          }
          if (e.code === 'KeyE' && gameplayLive && !e.repeat) {
              e.preventDefault();
              inputRef.current.keyboardGrappleHeld = true;
              syncGrappleHoldState();
              if (!monkey.current.isSwinging) startSwing(findKeyboardSwingTarget());
              return;
          }
          if (e.code === 'Space' && gameplayLive && !e.repeat) {
              e.preventDefault();
              const player = monkey.current;
              if (player.isSwinging || player.jumpCharges <= 0 || player.freezeTime > 0) return;
              const jumpSlot = JUMP_MAX_CHARGES - player.jumpCharges;
              const jumpDecay = jumpSlot === 0 ? 1 : jumpSlot === 1 ? 0.92 : 0.84;
              const jumpPower =
                  JUMP_BASE_POWER +
                  saveDataRef.current.upgrades.launchBoost * JUMP_POWER_PER_LEVEL +
                  saveDataRef.current.upgrades.airControl * 0.15;
              player.jumpCharges = Math.max(0, player.jumpCharges - 1);
              player.velocity.y = Math.min(player.velocity.y, -jumpPower * jumpDecay);
              player.grounded = false;
              player.coyoteTimer = 0;
              runDebriefRef.current.jumpsUsed += 1;
              player.jumpRechargeTimer = player.jumpCharges === 0
                  ? Math.max(1.3, JUMP_RECHARGE_SECONDS - saveDataRef.current.upgrades.launchBoost * JUMP_COOLDOWN_REDUCTION_PER_LEVEL - saveDataRef.current.upgrades.airControl * 0.08)
                  : player.jumpRechargeTimer;
              spawnParticles(player.position.x, player.position.y + 30, '#FFF', 5 + jumpSlot, 2, 'wind');
              spawnParticles(player.position.x + 5, player.position.y + 18, '#fde68a', 4 + jumpSlot, 2, 'spark');
              if (!isMutedRef.current) SoundSynth.playJump();
              const tutorialState = tutorialRef.current;
              if (tutorialState.active && tutorialState.currentStep === 'JUMP') updateTutorial(1);
              if (tutorialState.active && tutorialState.currentStep === 'L2_BRANCH') updateTutorial(1);
          }
          if (e.code === 'KeyW' || e.code === 'ArrowUp') {
              const player = monkey.current;
              if (gameplayLive && player.isSwinging) {
                   player.ropeTargetLength = Math.max(0, player.ropeTargetLength - (0.9 + saveDataRef.current.upgrades.grip * 0.06));
                   player.velocity.y -= 0.15;
              }
          }
          if (e.code === 'KeyS' || e.code === 'ArrowDown') {
              const player = monkey.current;
              if (gameplayLive && player.isSwinging) {
                   player.ropeTargetLength = Math.min(player.ropeTargetLength + (1.02 + saveDataRef.current.upgrades.castRange * 0.06), player.ropeLength + 50);
                   player.velocity.y += 0.18;
              }
          }
      };
      const handleKeyUp = (e: KeyboardEvent) => {
          if (e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.keys.right = false;
          if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.keys.left = false;
          if (e.code === 'KeyW' || e.code === 'ArrowUp') inputRef.current.keys.up = false;
          if (e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.keys.down = false;
          if (e.code === 'KeyE') {
              inputRef.current.keyboardGrappleHeld = false;
              syncGrappleHoldState();
              if (gameStateRef.current === GameState.PLAYING && monkey.current.isSwinging && !inputRef.current.mouseGrappleHeld) releaseSwing();
          }
      };
  const handleMouseDown = (e: MouseEvent) => {
          const currentGameState = gameStateRef.current;
          if (isUiControlTarget(e.target)) return;
          if (currentGameState === GameState.MENU) {
              const pointer = getCanvasPointerPosition(e.clientX, e.clientY);
              if (!pointer) return;
              menuFocusTransitionRef.current = null;
              menuDragRef.current = {
                  active: true,
                  dragged: false,
                  startX: pointer.x,
                  startY: pointer.y,
                  lastX: pointer.x,
                  lastY: pointer.y,
                  pointerId: e.button,
              };
              menuPanVelocityRef.current = { x: 0, y: 0 };
              return;
          }
          if (currentGameState === GameState.LANDING || currentGameState === GameState.STORY_MAP) {
              const pointer = getCanvasPointerPosition(e.clientX, e.clientY);
              if (!pointer) return;
              menuFocusTransitionRef.current = null;
              menuDragRef.current = {
                  active: true,
                  dragged: false,
                  startX: pointer.x,
                  startY: pointer.y,
                  lastX: pointer.x,
                  lastY: pointer.y,
                  pointerId: e.button,
              };
              menuPanVelocityRef.current = { x: 0, y: 0 };
              return;
          }
          if (currentGameState !== GameState.PLAYING || isPausedRef.current) return;
          const pointer = getCanvasPointerPosition(e.clientX, e.clientY);
          if (!pointer) return;
          const mouseX = pointer.x + cameraOffset.current.x;
          const mouseY = pointer.y + cameraOffset.current.y;
          const target = findMouseSwingTarget(mouseX, mouseY);
          inputRef.current.isMouseDown = true;
          inputRef.current.mouseGrappleHeld = true;
          syncGrappleHoldState();
          if (monkey.current.isSwinging) {
              const retargeted = target ? retargetSwing(target) : false;
              if (!retargeted && !inputRef.current.keyboardGrappleHeld) releaseSwing();
              return;
          }
          startSwing(target);
      };
      const handleMouseUp = (e: MouseEvent) => {
          const currentGameState = gameStateRef.current;
          const dragState = menuDragRef.current;
          if (dragState.active && (currentGameState === GameState.MENU || currentGameState === GameState.LANDING || currentGameState === GameState.STORY_MAP)) {
              const pointer = getCanvasPointerPosition(e.clientX, e.clientY);
              if (!dragState.dragged && pointer && currentGameState === GameState.MENU) {
                  const mapPoint = screenPointToMenuMapWorld(pointer.x, pointer.y, menuMapCameraRef.current);
                  const level = getLevelAtMapPoint(mapPoint.x, mapPoint.y);
                  if (level) handleSelectLevel(level.id, { focus: true });
              }
              dragState.active = false;
              dragState.dragged = false;
              menuPanVelocityRef.current.x *= 0.7;
              menuPanVelocityRef.current.y *= 0.7;
              return;
          }
          if (!inputRef.current.isMouseDown) return;
          inputRef.current.isMouseDown = false;
          inputRef.current.mouseGrappleHeld = false;
          syncGrappleHoldState();
          if (gameStateRef.current === GameState.PLAYING && monkey.current.isSwinging && !inputRef.current.grappleHeld) releaseSwing();
      };
      const handleDoubleClick = (e: MouseEvent) => {
          if (isUiControlTarget(e.target)) return;
          const currentGameState = gameStateRef.current;
          if (launchIntroRef.current && currentGameState === GameState.MENU) return;
          if (currentGameState === GameState.MENU) {
              const pointer = getCanvasPointerPosition(e.clientX, e.clientY);
              if (!pointer) return;
              const mapPoint = screenPointToMenuMapWorld(pointer.x, pointer.y, menuMapCameraRef.current);
              const hoveredLevelId = getLevelAtMapPoint(mapPoint.x, mapPoint.y)?.id ?? hoveredLevelRef.current ?? selectedLevelRef.current;
              if (!hoveredLevelId) return;
              if (selectedLevelRef.current !== hoveredLevelId) handleSelectLevel(hoveredLevelId, { focus: true });
              if (hoveredLevelId <= Math.min(saveData.maxLevelReached, LEVELS.length)) {
                  queueGameLaunch(hoveredLevelId);
              }
              return;
          }
          if (currentGameState !== GameState.PLAYING || isPausedRef.current) return;
          if (extendSwingRope() && !isMutedRef.current) {
              SoundSynth.playTone(720, 'triangle', 0.09, 0.03);
          }
      };
      const handleWindowBlur = () => {
          menuDragRef.current.active = false;
          menuDragRef.current.dragged = false;
          inputRef.current.isMouseDown = false;
          inputRef.current.mouseGrappleHeld = false;
          inputRef.current.keyboardGrappleHeld = false;
          syncGrappleHoldState();
    inputRef.current.keys.left = false;
    inputRef.current.keys.right = false;
    inputRef.current.keys.up = false;
    inputRef.current.keys.down = false;
    inputRef.current.keyHold.left = 0;
    inputRef.current.keyHold.right = 0;
    inputRef.current.keyHold.up = 0;
    inputRef.current.keyHold.down = 0;
    menuPanVelocityRef.current = { x: 0, y: 0 };
    if (gameStateRef.current === GameState.PLAYING && monkey.current.isSwinging) releaseSwing();
  };
      const handleMouseMove = (e: MouseEvent) => {
          const currentGameState = gameStateRef.current;
          if (launchIntroRef.current && currentGameState === GameState.MENU) return;
          const pointer = getCanvasPointerPosition(e.clientX, e.clientY);
          if (pointer) {
              if (menuDragRef.current.active && (currentGameState === GameState.MENU || currentGameState === GameState.LANDING || currentGameState === GameState.STORY_MAP)) {
                  const drag = menuDragRef.current;
                  const dx = pointer.x - drag.lastX;
                  const dy = pointer.y - drag.lastY;
                  const dragDistance = Math.hypot(pointer.x - drag.startX, pointer.y - drag.startY);
                  if (!drag.dragged && dragDistance >= MENU_DRAG_THRESHOLD) drag.dragged = true;
                  if (drag.dragged) {
                      enableManualMenuCameraControl();
                      menuFocusTransitionRef.current = null;
                      const zoom = Math.max(menuMapCameraRef.current.zoom, 0.001);
                      const panX = -dx / zoom;
                      const panY = -dy / zoom;
                      menuPanOffsetRef.current = clampMenuPanOffset({
                          x: menuPanOffsetRef.current.x + panX,
                          y: menuPanOffsetRef.current.y + panY,
                      });
                      menuPanVelocityRef.current.x = lerpNumber(menuPanVelocityRef.current.x, panX, 0.6);
                      menuPanVelocityRef.current.y = lerpNumber(menuPanVelocityRef.current.y, panY, 0.6);
                  }
                  drag.lastX = pointer.x;
                  drag.lastY = pointer.y;
                  inputRef.current.mousePos = { x: pointer.x, y: pointer.y };
                  return;
              }
              if (
                currentGameState === GameState.LANDING ||
                currentGameState === GameState.STORY_MAP ||
                currentGameState === GameState.MENU
              ) {
                  const mapPoint = screenPointToMenuMapWorld(pointer.x, pointer.y, menuMapCameraRef.current);
                  const nextHoveredLevelId = getLevelAtMapPoint(mapPoint.x, mapPoint.y)?.id ?? null;
                  if (hoveredLevelRef.current !== nextHoveredLevelId) {
                      hoveredLevelRef.current = nextHoveredLevelId;
                      setHoveredLevelId(nextHoveredLevelId);
                  }
              }
              inputRef.current.mousePos = { x: pointer.x, y: pointer.y };
              if (currentGameState === GameState.PLAYING) {
                  smartTargetRef.current = findSmartTarget(pointer.x + cameraOffset.current.x, pointer.y + cameraOffset.current.y);
                  const player = monkey.current;
                  const screenX = player.position.x - cameraOffset.current.x;
                  const screenY = player.position.y - cameraOffset.current.y;
                  const dx = inputRef.current.mousePos.x - screenX;
                  const dy = inputRef.current.mousePos.y - screenY;
                  const angle = Math.atan2(dy, dx);
                  player.eyeOffset = { x: Math.cos(angle) * 2, y: Math.sin(angle) * 2 };
              }
          }
      };
      const handleWheel = (e: WheelEvent) => {
          const currentGameState = gameStateRef.current;
          if (!(currentGameState === GameState.MENU || currentGameState === GameState.LANDING || currentGameState === GameState.STORY_MAP)) return;
          if (launchIntroRef.current && currentGameState === GameState.MENU) return;
          if (isUiControlTarget(e.target)) return;
          const pointer = getCanvasPointerPosition(e.clientX, e.clientY);
          if (!pointer) return;
          const storyBeat = INTRO_STORY_SEQUENCE.beats[storyBeatIndexRef.current] ?? INTRO_STORY_SEQUENCE.beats[0];
          const baseTarget = getMenuCameraTargetFromState(
              currentGameState,
              null,
              storyBeat,
          );
          enableManualMenuCameraControl();
          menuFocusTransitionRef.current = null;
          const currentCamera = menuMapCameraRef.current;
          const worldPoint = screenPointToMenuMapWorld(pointer.x, pointer.y, currentCamera);
          const zoomDelta = clamp(-e.deltaY * 0.0007, -0.12, 0.12);
          const nextZoomOffset = clamp(menuCameraZoomOffsetRef.current + zoomDelta, -0.18, 0.16);
          const nextZoom = clamp(baseTarget.zoom + nextZoomOffset, MENU_CAMERA_MIN_ZOOM, MENU_CAMERA_MAX_ZOOM);
          const desiredX = worldPoint.x - (pointer.x - CANVAS_WIDTH / 2) / nextZoom;
          const desiredY = worldPoint.y - (pointer.y - CANVAS_HEIGHT / 2) / nextZoom;
          menuCameraZoomOffsetRef.current = nextZoomOffset;
          menuPanOffsetRef.current = clampMenuPanOffset({
              x: desiredX - baseTarget.x,
              y: desiredY - baseTarget.y,
          });
          menuPanVelocityRef.current = { x: 0, y: 0 };
          e.preventDefault();
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('dblclick', handleDoubleClick);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('blur', handleWindowBlur);
      
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
          window.removeEventListener('mousedown', handleMouseDown);
          window.removeEventListener('dblclick', handleDoubleClick);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('wheel', handleWheel);
          window.removeEventListener('blur', handleWindowBlur);
      }
  }, [enableManualMenuCameraControl, extendSwingRope, handleSelectLevel, launchQueuedGame, queueGameLaunch, saveData.maxLevelReached, selectedLevelId, stepSelectedRoute, toggleFullscreen, toggleMute, togglePause]);

  useEffect(() => {
      if (!import.meta.env.DEV) return;
      (window as any).advanceTime = (ms: number) => {
          const boundedMs = Math.max(0, Math.min(ms, 2000));
          const steps = Math.min(Math.ceil(boundedMs / FIXED_TIMESTEP_MS), MAX_CATCH_UP_STEPS * 12);
          if (gameStateRef.current === GameState.PLAYING && !isPausedRef.current) {
              manualStepHoldUntilRef.current = performance.now() + 48;
              lastFrameTimeRef.current = performance.now();
              fixedStepAccumulatorRef.current = 0;
              for (let i = 0; i < steps; i++) stepPhysics(FIXED_TIMESTEP);
              lastFrameTimeRef.current = performance.now();
          }
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
              ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
              draw(ctx);
          }
      };

      (window as any).render_game_to_text = () => {
          const player = monkey.current;
          const camera = cameraOffset.current;
          const liveStoryBeat = INTRO_STORY_SEQUENCE.beats[storyBeatIndexRef.current] ?? INTRO_STORY_SEQUENCE.beats[0];
          const livePreviewLevel = LEVELS[selectedLevelRef.current - 1] ?? LEVELS[0];
          const liveRouteBeat = getScriptedRouteBeat(livePreviewLevel, player.position.x);
          const visibleEntities = entities.current
              .filter(entity => isWorldRectVisible(entity.position.x, entity.position.y, entity.width, entity.height, camera, 120))
              .filter(entity => entity.type === 'coin' || entity.type === 'branch' || entity.type === 'vine' || entity.type === 'portal' || entity.type === 'checkpoint' || entity.type === 'geyser' || entity.type === 'ash_gust')
              .slice(0, 12)
              .map(entity => ({
                  id: entity.id,
                  type: entity.type,
                  x: Math.round(entity.position.x),
                  y: Math.round(entity.position.y),
                  w: Math.round(entity.width),
                  h: Math.round(entity.height),
                  activated: entity.activated ?? false,
                  telegraph: entity.telegraph ?? 'none',
              }));
          const visibleEnemies = enemies.current
              .filter(enemy => isWorldRectVisible(enemy.position.x, enemy.position.y, enemy.width, enemy.height, camera, 120))
              .slice(0, 8)
              .map(enemy => ({
                  id: enemy.id,
                  type: enemy.enemyType,
                  x: Math.round(enemy.position.x),
                  y: Math.round(enemy.position.y),
                  telegraph: enemy.telegraph ?? 'none',
                  attackTimer: Math.round(enemy.attackTimer ?? 0),
              }));

          return JSON.stringify({
              coordinateSystem: { origin: 'top-left world', x: 'right', y: 'down' },
              mode: gameStateRef.current,
              paused: isPausedRef.current,
              biome: currentBiomeRef.current,
              weather: weatherRef.current.type,
              debugFlags: debugFlagsRef.current,
              saveVersion: saveDataRef.current.version,
              activeRouteBeat: liveRouteBeat?.beat.label ?? null,
              storyBeat: liveStoryBeat.id,
              storyRegion: liveStoryBeat.regionId,
              selectedLevelId: selectedLevelRef.current,
              menuMapCamera: {
                  x: Number(menuMapCameraRef.current.x.toFixed(2)),
                  y: Number(menuMapCameraRef.current.y.toFixed(2)),
                  zoom: Number(menuMapCameraRef.current.zoom.toFixed(3)),
              },
              player: {
                  x: Math.round(player.position.x),
                  y: Math.round(player.position.y),
                  vx: Number(player.velocity.x.toFixed(2)),
                  vy: Number(player.velocity.y.toFixed(2)),
                  swinging: player.isSwinging,
                  ropeLength: Number(player.ropeLength.toFixed(2)),
                  ropeTargetLength: Number(player.ropeTargetLength.toFixed(2)),
                  ropeTimer: Number(player.ropeTimer.toFixed(2)),
                  releaseTetherTimer: Number(player.releaseTetherTimer.toFixed(2)),
                  jumpCharges: player.jumpCharges,
                  jumpRechargeTimer: Number(player.jumpRechargeTimer.toFixed(2)),
                  retargetGraceTimer: Number(player.retargetGraceTimer.toFixed(2)),
                  focusTimer: Number(focusTimerRef.current.toFixed(2)),
              },
              score: scoreRef.current,
              distance: distanceRef.current,
              tokens: runTokensRef.current,
              lives: playerLivesRef.current,
              checkpoint: checkpointRef.current,
              visibleEntities,
              visibleEnemies,
          });
      };

      (window as any).__debug_set_player_state = (patch: Partial<typeof monkey.current>) => {
          const player = monkey.current;
          if (patch.position) player.position = { ...player.position, ...patch.position };
          if (patch.velocity) player.velocity = { ...player.velocity, ...patch.velocity };
          Object.assign(player, {
              ...patch,
              position: player.position,
              velocity: player.velocity,
          });
      };

      (window as any).__debug_activate_checkpoint = (index?: number) => {
          const target = entities.current.find(entity => entity.type === 'checkpoint' && (index === undefined || entity.checkpointIndex === index));
          if (!target) return false;
          activateCheckpoint(target);
          return true;
      };

      (window as any).__debug_set_flags = (patch: Partial<DebugFlags>) => {
          debugFlagsRef.current = {
              ...debugFlagsRef.current,
              ...patch,
          };
          return debugFlagsRef.current;
      };

      return () => {
          delete (window as any).advanceTime;
          delete (window as any).render_game_to_text;
          delete (window as any).__debug_set_player_state;
          delete (window as any).__debug_activate_checkpoint;
          delete (window as any).__debug_set_flags;
      };
  }, [currentBiome, gameState, isPaused, playerLives]);

  const selectedLevel = selectedLevelId !== null ? LEVELS[selectedLevelId - 1] ?? null : null;
  const selectedLevelResult = selectedLevel ? saveData.levelResults[String(selectedLevel.id)] ?? createEmptyLevelResult() : null;
  const highestUnlockedLevel = Math.min(saveData.maxLevelReached, LEVELS.length);
  const incomingLandingChallenge = incomingRouteChallenge
    ? LEVELS.find((entry) => entry.id === incomingRouteChallenge.levelId) ?? null
    : null;
  const selectedLevelLocked = selectedLevel ? selectedLevel.id > highestUnlockedLevel : true;
  useEffect(() => {
      if (gameState === GameState.PLAYING) return;

      const selectedRoute = selectedLevel ?? LEVELS[Math.max(0, highestUnlockedLevel - 1)] ?? LEVELS[0];
      const hoveredRoute = hoveredLevelId !== null ? LEVELS.find((level) => level.id === hoveredLevelId) ?? null : null;
      const routesToWarm = new Map<number, LevelConfig>();

      const addWarmTargets = (level: LevelConfig | null) => {
          if (!level) return;
          const levelIndex = LEVELS.findIndex((entry) => entry.id === level.id);
          if (levelIndex < 0) return;
          [levelIndex - 1, levelIndex, levelIndex + 1].forEach((neighborIndex) => {
              const neighborLevel = LEVELS[neighborIndex];
              if (!neighborLevel) return;
              routesToWarm.set(neighborLevel.id, neighborLevel);
          });
      };

      addWarmTargets(selectedRoute);
      addWarmTargets(hoveredRoute);

      routesToWarm.forEach((level) => {
          const locked = level.id > highestUnlockedLevel;
          void prefetchRouteSelectSound(level, locked);
      });
  }, [gameState, highestUnlockedLevel, hoveredLevelId, selectedLevel?.id]);
  const campaignChallenge = buildCampaignChallenge(saveData, highestUnlockedLevel, communityBoardEntries);
  const featuredRouteCup = buildFeaturedRouteCup(saveData, highestUnlockedLevel, communityBoardEntries);
  const menuAchievements = resolveMenuAchievements(saveData, communityBoardEntries);
  const runConsistency = computeRunWinStreaks(saveData.runHistory);
  const leaderboardSharePackage = buildRunboardSharePackage();
  const hasNextUnlockedLevel = selectedLevelRef.current < highestUnlockedLevel;
  const bestScore = Math.max(saveData.highScore, score);
  const currentPlayer = monkey.current;
  const previewLevel = selectedLevel ?? LEVELS[selectedLevelRef.current - 1] ?? LEVELS[0];
  const activeRoutePressure = buildActiveRoutePressure(previewLevel, saveData.runHistory, communityBoardEntries, score);
  const activeFeaturedRoutePressure = buildActiveFeaturedCupPressure(previewLevel, featuredRouteCup, score);
  const activeRouteBeat = getScriptedRouteBeat(previewLevel, currentPlayer.position.x);
  const currentBuildSummary = getCurrentBuildSummary(saveData, selectedLevel);
  const atlasCompassAngleDeg = (() => {
      const focusLevelId = selectedLevel?.id ?? selectedLevelRef.current ?? 1;
      const focusIndex = Math.max(0, Math.min(LEVELS.length - 1, focusLevelId - 1));
      const previousPoint = getMapNodePosition(Math.max(0, focusIndex - 1));
      const nextPoint = getMapNodePosition(Math.min(LEVELS.length - 1, focusIndex + 1));
      const dx = nextPoint.x - previousPoint.x;
      const dy = nextPoint.y - previousPoint.y;
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return 0;
      return Math.atan2(dx, -dy) * (180 / Math.PI);
  })();
  const currentStoryBeat = INTRO_STORY_SEQUENCE.beats[storyBeatIndex] ?? INTRO_STORY_SEQUENCE.beats[0];
  const ropeBudget = ROPE_BREAK_TIME_SECONDS + saveData.upgrades.ropeLength * 0.5 + saveData.upgrades.grip * 0.35;
  const ropeStabilityRatio = clamp(ropeBudget > 0 ? currentPlayer.ropeTimer / ropeBudget : 0, 0, 1);
  const focusDurationBudget = saveData.upgrades.feverDuration > 0 ? 0.7 + saveData.upgrades.feverDuration * 0.22 : 0;
  const focusCooldownBudget = saveData.upgrades.feverDuration > 0 ? Math.max(2.8, 7 - saveData.upgrades.feverDuration * 0.4) : 0;
  const focusFillRatio =
      focusTimerRef.current > 0 && focusDurationBudget > 0
          ? clamp(focusTimerRef.current / focusDurationBudget, 0, 1)
          : focusCooldownBudget > 0
          ? clamp(1 - focusCooldownRef.current / focusCooldownBudget, 0, 1)
          : 0;
  const focusStatusLabel =
      saveData.upgrades.feverDuration <= 0
          ? 'LOCKED'
          : focusTimerRef.current > 0
          ? 'ACTIVE'
          : focusCooldownRef.current > 0
          ? `${focusCooldownRef.current.toFixed(1)}s`
          : 'READY';
  const paceSpeed = Math.hypot(currentPlayer.velocity.x, currentPlayer.velocity.y);
  const paceLabel = paceSpeed > 28 ? 'OVERDRIVE' : paceSpeed > 18 ? 'HOT' : paceSpeed > 9 ? 'CRUISE' : 'BUILDING';
  const paceToneClass = paceSpeed > 28 ? 'text-amber-200' : paceSpeed > 18 ? 'text-emerald-200' : 'text-slate-200';
  const isCompactHud = saveData.settings.hudDensity === 'compact';
  const isHudHidden = saveData.settings.hudDensity === 'hidden';
  const activeRoutePressureTone = getRoutePressureToneClass(activeRoutePressure?.tone ?? 'emerald');
  const featuredRoutePressureTone = getRoutePressureToneClass(activeFeaturedRoutePressure?.tone ?? 'emerald');
  const recommendationActionRate = recommendationSessionMetrics.offers > 0
    ? Math.round((recommendationSessionMetrics.purchases / recommendationSessionMetrics.offers) * 100)
    : 0;
  const isVictory = gameState === GameState.LEVEL_COMPLETE;
  const recommendationAverageOpenToBuySeconds = recommendationSessionMetrics.openToBuySamples > 0
    ? Math.round((recommendationSessionMetrics.openToBuyTotalMs / recommendationSessionMetrics.openToBuySamples) / 1000)
    : null;
  const recommendationAverageOpenDelaySeconds = recommendationSessionMetrics.openDelaySamples > 0
    ? Math.round((recommendationSessionMetrics.openDelayTotalMs / recommendationSessionMetrics.openDelaySamples) / 1000)
    : null;
  const recommendationAverageSkipDelaySeconds = recommendationSessionMetrics.skipDelaySamples > 0
    ? Math.round((recommendationSessionMetrics.skipDelayTotalMs / recommendationSessionMetrics.skipDelaySamples) / 1000)
    : null;
  const recommendationDiagnostics = {
    offers: recommendationSessionMetrics.offers,
    opens: recommendationSessionMetrics.opens,
    purchases: recommendationSessionMetrics.purchases,
    skips: recommendationSessionMetrics.skips,
    acceptanceRate: recommendationActionRate,
    avgOpenToBuySeconds: recommendationAverageOpenToBuySeconds,
    avgOpenDelaySeconds: recommendationAverageOpenDelaySeconds,
    avgSkipDelaySeconds: recommendationAverageSkipDelaySeconds,
  };
  const recommendationTrendCurrentSample = createRecommendationTrendSample(
      recommendationRunIdRef.current,
      recommendationSessionMetrics,
      isVictory ? 'win' : 'fail',
  );
  const recommendationHistoryForTrend = recommendationRunHistory.some(
      (entry) => entry.runId === recommendationTrendCurrentSample.runId,
  )
      ? recommendationRunHistory
      : [...recommendationRunHistory, recommendationTrendCurrentSample];
  const recommendationRollingSamples = recommendationHistoryForTrend.slice(
      -RECOMMENDATION_TREND_WINDOW_SIZE,
  );
  const recommendationPriorSamples = recommendationHistoryForTrend.length > RECOMMENDATION_TREND_WINDOW_SIZE
      ? recommendationHistoryForTrend.slice(
            -RECOMMENDATION_TREND_WINDOW_SIZE * 2,
            -RECOMMENDATION_TREND_WINDOW_SIZE,
        )
      : [];
  const recommendationCurrentSummary = summarizeRecommendationTrendSamples([recommendationTrendCurrentSample]);
  const recommendationRollingSummary = summarizeRecommendationTrendSamplesByOutcome(recommendationRollingSamples);
  const recommendationPriorSummary = recommendationPriorSamples.length > 0
      ? summarizeRecommendationTrendSamplesByOutcome(recommendationPriorSamples)
      : null;
  const recommendationTrend = {
    current: recommendationCurrentSummary,
    rolling: recommendationRollingSummary,
    prior: recommendationPriorSummary,
    rollingRuns: recommendationRollingSamples.length,
    priorRuns: recommendationPriorSamples.length,
    rollingWinRuns: recommendationRollingSummary.win.runSamples,
    rollingFailRuns: recommendationRollingSummary.fail.runSamples,
    priorWinRuns: recommendationPriorSummary?.win.runSamples ?? 0,
    priorFailRuns: recommendationPriorSummary?.fail.runSamples ?? 0,
  };

  if (!isSaveHydrated) {
      return (
          <div className="w-full h-screen bg-slate-950 text-white flex items-center justify-center">
              <div className="rounded-2xl border border-emerald-300/20 bg-slate-900/80 px-8 py-6 shadow-2xl">
                  <div className="text-xs uppercase tracking-[0.4em] text-emerald-200/70 mb-3">Syncing Save</div>
                  <div className="text-3xl font-black text-amber-200">Loading jungle state...</div>
              </div>
          </div>
      );
  }

  return (
    <div ref={gameShellRef} className="relative h-screen w-full overflow-hidden bg-slate-950 select-none">
      {saveRecoveryNotice && gameState !== GameState.PLAYING && (
        <div className="absolute left-1/2 top-4 z-[90] -translate-x-1/2 pointer-events-auto">
          <div className="flex items-center gap-3 rounded-full border border-amber-200/20 bg-slate-950/90 px-4 py-2 text-sm text-amber-50 shadow-2xl shadow-black/40">
            <span className="max-w-[48ch] truncate">{saveRecoveryNotice}</span>
            <button
              onClick={() => openSettings('Data')}
              className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-slate-950 transition-colors hover:bg-amber-300"
            >
              Open Data
            </button>
            <button
              onClick={() => setSaveRecoveryNotice(null)}
              className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-100 transition-colors hover:bg-slate-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {showSettings && (
          <Suspense fallback={<SurfaceLoader label="Loading settings" />}>
              <SettingsModal
                settings={saveData.settings}
                isMuted={isMuted}
                isFullscreen={isFullscreen}
                selectedMoodPreset={saveData.selectedMoodPreset}
                swingLabConfig={runtimeSettings}
                initialTab={settingsTab}
                saveRecoveryNotice={saveRecoveryNotice}
                onClose={() => setShowSettings(false)}
                onToggleMute={toggleMute}
                onToggleFullscreen={toggleFullscreen}
                onChange={updateSettings}
                onUnlockAllLevels={unlockAllLevels}
                onResetProgress={resetLocalProgress}
                onOpenStory={openStoryMap}
                onReturnToMenu={returnToMainMenu}
                onApplySwingLab={applySwingLabSettings}
                onExportSave={exportSaveBackup}
                onImportSave={importSaveBackup}
              />
          </Suspense>
      )}

      {gameState === GameState.LANDING && (
        <LandingScreen
          hasCompletedStoryIntro={saveData.hasCompletedStoryIntro}
          highestUnlockedLevel={highestUnlockedLevel}
          campaignChallenge={campaignChallenge}
          featuredRouteCup={featuredRouteCup}
          currentStreak={runConsistency.current}
          bestStreak={runConsistency.best}
          landingChallenge={
            incomingLandingChallenge
              ? {
                  levelId: incomingLandingChallenge.id,
                  levelName: incomingLandingChallenge.name,
                  challengerAlias: incomingRouteChallenge?.challengerAlias ?? 'Rival crew',
                  isUnlocked: incomingLandingChallenge.id <= highestUnlockedLevel,
                }
              : null
          }
          onAcceptChallenge={incomingRouteChallenge ? () => acceptSharedRouteChallenge(incomingRouteChallenge.levelId) : null}
          onPlay={handleLandingPlay}
          onOpenLeaderboard={openLeaderboardScreen}
          onOpenStory={openStoryMap}
        />
      )}

      {gameState === GameState.STORY_MAP && (
        <Suspense fallback={<SurfaceLoader label="Loading story map" />}>
          <StoryMapOverlay
            beat={currentStoryBeat}
            beatIndex={storyBeatIndex}
            beatCount={INTRO_STORY_SEQUENCE.beats.length}
            regionLabel={MAP_REGION_LOOKUP.get(currentStoryBeat.regionId)?.label ?? null}
            onNext={handleStoryNext}
            onPrevious={handleStoryPrevious}
            onSkip={handleStorySkip}
            onReturnToMenu={returnToMainMenu}
          />
        </Suspense>
      )}
      
      {/* GAME UI OVERLAY */}
      {gameState === GameState.PLAYING && (
          <div className="absolute inset-0 pointer-events-none p-4 text-white font-sans z-10">
              <div className="flex justify-between items-start">
                  {!isHudHidden && (
                  <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/55 backdrop-blur-md px-5 py-4 shadow-2xl shadow-black/30">
                      <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-200/70 mb-2">Run Telemetry</div>
                      <h1 className="text-4xl font-black drop-shadow-md text-amber-300 flex items-center gap-2">
                           <MapIcon size={32}/> {distance}m / {LEVELS[selectedLevelRef.current-1].targetDistance}m
                      </h1>
                      <div className="text-2xl mt-3 flex items-center gap-2 text-emerald-300">
                          <Coins size={24}/> {runTokens}
                      </div>
                      <div className="flex gap-1 mt-3">
                          {[...Array(MAX_LIVES)].map((_, i) => (
                              <Heart key={i} size={24} fill={i < playerLives ? "#F44336" : "none"} className={i < playerLives ? "text-red-500" : "text-gray-600"} />
                          ))}
                      </div>
                  </div>
                  )}
                  
                  <div className={`flex flex-col items-end gap-2 ${isHudHidden ? 'ml-auto' : ''}`}>
                       <div data-ui-control className="pointer-events-auto flex gap-2">
                           <button
                             onClick={togglePause}
                             className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-xs font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800/80"
                           >
                             {isPaused ? 'RESUME' : 'PAUSE'}
                           </button>
                           <button
                             onClick={returnToMainMenu}
                             className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-xs font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800/80"
                           >
                             MAIN MENU
                           </button>
                           <button
                             onClick={cycleHudDensity}
                             className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-xs font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800/80"
                           >
                             {saveData.settings.hudDensity === 'hidden' ? 'HUD OFF' : saveData.settings.hudDensity === 'compact' ? 'HUD MINI' : 'HUD FULL'}
                           </button>
                           <button
                             onClick={() => openSettings()}
                             className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-xs font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800/80"
                           >
                             SETTINGS
                           </button>
                           <button
                             onClick={toggleMute}
                             className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-xs font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800/80"
                           >
                             {isMuted ? 'UNMUTE' : 'MUTE'}
                           </button>
                           <button
                             onClick={() => void toggleFullscreen()}
                             className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-xs font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800/80"
                           >
                             {isFullscreen ? 'WINDOW' : 'FULL'}
                           </button>
                       </div>
                       {debugFlagsRef.current.showRouteBeatOverlay && activeRouteBeat && (
                       <div className="pointer-events-none min-w-[168px] rounded-2xl border border-fuchsia-200/20 bg-slate-950/60 px-3 py-3 text-right shadow-2xl shadow-black/20">
                           <div className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-100/60">Route Beat</div>
                           <div className="mt-1 text-lg font-black text-fuchsia-100">{activeRouteBeat.beat.label}</div>
                           <div className="text-xs uppercase tracking-[0.22em] text-fuchsia-200/70">{activeRouteBeat.beat.kind}</div>
                       </div>
                       )}
                       {!isHudHidden && (
                       <>
                       <div className="min-w-[168px] rounded-2xl border border-cyan-200/15 bg-slate-950/55 backdrop-blur-md p-3 text-right shadow-2xl shadow-black/20">
                           <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/60">Score</div>
                           <div className="text-3xl text-white font-bold">{score}</div>
                       </div>
                       <div className="min-w-[168px] rounded-2xl border border-sky-200/15 bg-slate-950/55 backdrop-blur-md p-3 text-right flex flex-col items-end shadow-2xl shadow-black/20">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-300"><Wind size={16}/> Weather</div>
                            <div className="font-bold text-sky-300 text-lg">{((currentBiome === 'JUNGLE' || currentBiome === 'SWAMP') && (weather.type === 'RAIN' || weather.type === 'WINDY')) ? 'MONSOON' : weather.type}</div>
                        </div>
                       <button
                         type="button"
                         onClick={() => setIsRunHudDetailsOpen((current) => !current)}
                         className="min-w-[168px] rounded-2xl border border-cyan-200/15 bg-slate-950/62 backdrop-blur-md p-3 text-right shadow-2xl shadow-black/20 transition-colors hover:bg-slate-900/70"
                       >
                           <div className="flex items-center justify-between gap-3">
                               <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">Route Briefing</div>
                               <div className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/75">
                                   {isRunHudDetailsOpen ? 'Hide' : 'Show'}
                               </div>
                           </div>
                           <div className="mt-1 text-base font-black text-white">
                               {activeFeaturedRoutePressure?.title ?? activeRoutePressure?.title ?? 'Keep the line clear'}
                           </div>
                           <div className="mt-1 text-[11px] leading-relaxed text-white/75">
                               {activeFeaturedRoutePressure?.detail ?? activeRoutePressure?.detail ?? 'Tap for the daily crew cup and opening benchmark.'}
                           </div>
                       </button>
                       {isRunHudDetailsOpen ? (
                           <div className="flex flex-col gap-2">
                               {activeFeaturedRoutePressure && (
                                   <div className={`min-w-[220px] rounded-2xl border ${featuredRoutePressureTone} bg-slate-950/62 backdrop-blur-md p-3 text-right shadow-2xl shadow-black/20`}>
                                       <div className="flex items-center justify-between gap-3">
                                           <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">Daily Crew Cup</div>
                                           <div className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/75">
                                               {previewLevel.name}
                                           </div>
                                       </div>
                                       <div className="mt-1 text-base font-black text-white">{activeFeaturedRoutePressure.title}</div>
                                       <div className="mt-1 text-[11px] leading-relaxed text-white/75">{activeFeaturedRoutePressure.detail}</div>
                                       <div className="mt-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-white/55">
                                           <span>{activeFeaturedRoutePressure.statusLabel}</span>
                                           <span>{activeFeaturedRoutePressure.countdownLabel}</span>
                                       </div>
                                       {activeFeaturedRoutePressure.targetScore ? (
                                           <>
                                               <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800/90">
                                                   <div
                                                       className={`h-full transition-all ${activeFeaturedRoutePressure.tone === 'rose'
                                                           ? 'bg-rose-400'
                                                           : activeFeaturedRoutePressure.tone === 'cyan'
                                                               ? 'bg-cyan-300'
                                                               : activeFeaturedRoutePressure.tone === 'amber'
                                                                   ? 'bg-amber-300'
                                                                   : 'bg-emerald-400'
                                                       }`}
                                                       style={{ width: `${activeFeaturedRoutePressure.progressPercent}%` }}
                                                   />
                                               </div>
                                               <div className="mt-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-white/55">
                                                   <span>{activeFeaturedRoutePressure.targetLabel}</span>
                                                   <span>
                                                       {activeFeaturedRoutePressure.gapScore !== null
                                                           ? activeFeaturedRoutePressure.gapScore >= 0
                                                               ? `+${activeFeaturedRoutePressure.gapScore}`
                                                               : `${activeFeaturedRoutePressure.gapScore}`
                                                           : '--'}
                                                   </span>
                                               </div>
                                           </>
                                       ) : null}
                                   </div>
                               )}
                               {activeRoutePressure && (
                                   <div className={`min-w-[220px] rounded-2xl border ${activeRoutePressureTone} bg-slate-950/62 backdrop-blur-md p-3 text-right shadow-2xl shadow-black/20`}>
                                       <div className="flex items-center justify-between gap-3">
                                           <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">{activeRoutePressure.label}</div>
                                           <div className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/75">
                                               {previewLevel.name}
                                           </div>
                                       </div>
                                       <div className="mt-1 text-base font-black text-white">{activeRoutePressure.title}</div>
                                       <div className="mt-1 text-[11px] leading-relaxed text-white/75">{activeRoutePressure.detail}</div>
                                       {activeRoutePressure.targetScore ? (
                                           <>
                                               <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800/90">
                                                   <div
                                                       className={`h-full transition-all ${
                                                           activeRoutePressure.tone === 'rose'
                                                               ? 'bg-rose-400'
                                                               : activeRoutePressure.tone === 'cyan'
                                                                   ? 'bg-cyan-300'
                                                                   : activeRoutePressure.tone === 'amber'
                                                                       ? 'bg-amber-300'
                                                                       : 'bg-emerald-400'
                                                       }`}
                                                       style={{ width: `${activeRoutePressure.progressPercent}%` }}
                                                   />
                                               </div>
                                               <div className="mt-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-white/55">
                                                   <span>Target {activeRoutePressure.targetScore}</span>
                                                   <span>
                                                       {activeRoutePressure.gapScore !== null
                                                           ? activeRoutePressure.gapScore >= 0
                                                               ? `+${activeRoutePressure.gapScore}`
                                                               : `${activeRoutePressure.gapScore}`
                                                           : '--'}
                                                   </span>
                                               </div>
                                           </>
                                       ) : null}
                                   </div>
                               )}
                           </div>
                       ) : null}
                       
                       {/* SKILL CHAIN */}
                       {skillChainUI.active && (
                           <div className="mt-4 rounded-2xl border border-yellow-300/15 bg-slate-950/60 backdrop-blur-md px-4 py-3 text-right animate-bounce-slow shadow-2xl shadow-black/20">
                               <div className="text-4xl font-black italic" style={{color: RANKS.find(r=>r.title === skillChainUI.rank)?.color}}>
                                   {skillChainUI.rank}
                               </div>
                               <div className="text-xl text-white">x{skillChainUI.multiplier.toFixed(1)} COMBO</div>
                               <div className="h-2 w-32 bg-gray-700 mt-1 rounded-full overflow-hidden">
                                   <div className="h-full bg-yellow-400 transition-all duration-75" style={{width: `${(skillChainUI.timer / CHAIN_TIMEOUT_FRAMES) * 100}%`}} />
                               </div>
                           </div>
                       )}
                       </>
                       )}
                  </div>
              </div>

              {/* TUTORIAL OVERLAY */}
              {!isHudHidden && tutorial.active && tutorial.showBox && !hideTutorialTips && (
                  <div className="absolute top-5 left-5 w-full max-w-sm pointer-events-auto" data-ui-control>
                      <div className="bg-slate-950/80 border border-amber-300/30 backdrop-blur-md p-4 rounded-2xl text-left shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
                          <div className="mb-2 flex items-start justify-between gap-3">
                              <div className="text-amber-300 font-bold flex items-center gap-2 text-sm tracking-[0.28em] uppercase">
                                  <Lightbulb size={24}/> Tutorial
                              </div>
                              <button
                                onClick={() => setHideTutorialTips(true)}
                                className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100 transition-colors hover:bg-slate-800"
                              >
                                Hide
                              </button>
                          </div>
                          <p className="text-lg text-white font-bold leading-relaxed">{tutorial.message}</p>
                          <div className="mt-3 text-xs text-gray-400">Follow the lane and keep the route moving. Press H to show tips again.</div>
                      </div>
                  </div>
              )}

              {!isHudHidden && !isCompactHud && (
              <div className="absolute bottom-4 left-4 pointer-events-none">
                  <div className="rounded-2xl border border-cyan-200/15 bg-slate-950/55 backdrop-blur-md px-4 py-3 shadow-2xl shadow-black/20">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/60">Swing Flow</div>
                      <div className="text-sm text-slate-100">Hold `E` or mouse to latch. Space jumps in 3 charges. `D` drives, `A` brakes, and double click reels rope out.</div>
                  </div>
              </div>
              )}
              {!isHudHidden && (
              <div className="absolute bottom-4 right-4 pointer-events-none">
                  <div className="min-w-[260px] rounded-2xl border border-emerald-200/15 bg-slate-950/55 backdrop-blur-md px-4 py-3 shadow-2xl shadow-black/20">
                      <div className="flex items-center justify-between gap-4">
                          <div>
                              <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-100/60">Vine Stability</div>
                              <div className="mt-1 text-sm font-bold text-white">{currentPlayer.isSwinging ? `${Math.max(0, currentPlayer.ropeTimer).toFixed(1)}s` : 'Ready to latch'}</div>
                          </div>
                          <div className={`text-xs font-bold tracking-[0.28em] ${ropeStabilityRatio < 0.2 ? 'text-rose-300' : ropeStabilityRatio < 0.45 ? 'text-amber-200' : 'text-emerald-200'}`}>
                              {currentPlayer.isSwinging ? (ropeStabilityRatio < 0.2 ? 'CRITICAL' : ropeStabilityRatio < 0.45 ? 'STRESSED' : 'STABLE') : 'IDLE'}
                          </div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800/90">
                          <div
                            className={`h-full transition-all ${ropeStabilityRatio < 0.2 ? 'bg-rose-400' : ropeStabilityRatio < 0.45 ? 'bg-amber-300' : 'bg-emerald-400'}`}
                            style={{ width: `${(currentPlayer.isSwinging ? ropeStabilityRatio : 1) * 100}%` }}
                          />
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-4">
                          <div>
                              <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/60">Focus</div>
                              <div className="mt-1 text-sm font-bold text-white">
                                  {saveData.upgrades.feverDuration > 0 ? `Press Q • ${focusStatusLabel}` : 'Unlock in shop'}
                              </div>
                          </div>
                          <div className={`text-xs font-bold tracking-[0.28em] ${focusTimerRef.current > 0 ? 'text-cyan-200' : focusCooldownRef.current > 0 ? 'text-slate-300' : 'text-emerald-200'}`}>
                              {focusStatusLabel}
                          </div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800/90">
                          <div
                            className={`h-full transition-all ${focusTimerRef.current > 0 ? 'bg-cyan-300' : saveData.upgrades.feverDuration > 0 ? 'bg-emerald-400' : 'bg-slate-700'}`}
                            style={{ width: `${Math.max(saveData.upgrades.feverDuration > 0 ? 8 : 0, focusFillRatio * 100)}%` }}
                          />
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                          <div>
                              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Pace</div>
                              <div className={`mt-1 font-bold ${paceToneClass}`}>{paceLabel}</div>
                          </div>
                          <div className="text-right">
                              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Speed</div>
                              <div className="mt-1 font-bold text-white">{paceSpeed.toFixed(1)}</div>
                          </div>
                      </div>
                  </div>
              </div>
              )}
              {checkpointBanner && (
                  <div className="absolute top-28 left-1/2 -translate-x-1/2 pointer-events-none">
                      <div className="rounded-full border border-yellow-200/30 bg-yellow-300/10 px-5 py-2 text-sm font-black uppercase tracking-[0.32em] text-yellow-100 shadow-2xl">
                          {checkpointBanner}
                      </div>
                  </div>
              )}
          </div>
      )}

      {gameState === GameState.PLAYING && isPaused && (
          <div data-ui-control className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/78 backdrop-blur-sm px-6">
              <div className="w-full max-w-2xl rounded-3xl border border-cyan-200/15 bg-slate-950/90 p-8 text-white shadow-2xl">
                  <div className="flex items-start justify-between gap-6">
                      <div>
                          <div className="text-[11px] uppercase tracking-[0.42em] text-cyan-100/60">Run Paused</div>
                          <h2 className="mt-3 text-5xl font-black text-amber-200">Catch Your Breath</h2>
                          <p className="mt-3 max-w-xl text-lg text-slate-300">Resume when you are ready. Fullscreen, mute, and the current swing rules are available here so the run is never guesswork.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                          <button
                            onClick={togglePause}
                            className="rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800"
                          >
                            RESUME
                          </button>
                          <button
                            onClick={returnToMainMenu}
                            className="rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800"
                          >
                            MAIN MENU
                          </button>
                      </div>
                  </div>
                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                      <button onClick={togglePause} className="rounded-2xl bg-emerald-500 px-5 py-4 text-left text-slate-950 transition-transform hover:-translate-y-0.5">
                          <div className="text-xs font-bold tracking-[0.28em]">RETURN</div>
                          <div className="mt-2 text-2xl font-black">Back To The Run</div>
                      </button>
                      <button onClick={() => openSettings()} className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-4 text-left transition-transform hover:-translate-y-0.5">
                          <div className="text-xs font-bold tracking-[0.28em] text-slate-400">SETTINGS</div>
                          <div className="mt-2 text-2xl font-black">Mix And HUD</div>
                      </button>
                      <button onClick={() => void toggleFullscreen()} className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-4 text-left transition-transform hover:-translate-y-0.5">
                          <div className="text-xs font-bold tracking-[0.28em] text-slate-400">DISPLAY</div>
                          <div className="mt-2 text-2xl font-black">{isFullscreen ? 'Windowed' : 'Fullscreen'}</div>
                      </button>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                          <div className="text-xs font-bold tracking-[0.28em] text-slate-400">Current Run</div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-200">
                              <div>Distance: <span className="font-bold text-amber-200">{distance}m</span></div>
                              <div>Score: <span className="font-bold text-cyan-200">{score}</span></div>
                              <div>Tokens: <span className="font-bold text-emerald-200">{runTokens}</span></div>
                              <div>Lives: <span className="font-bold text-rose-200">{playerLives}</span></div>
                          </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                          <div className="text-xs font-bold tracking-[0.28em] text-slate-400">Controls</div>
                          <div className="mt-3 space-y-2 text-sm text-slate-200">
                              <div>Hold `E` or mouse to latch.</div>
                              <div>Space jumps. Double click reels rope out.</div>
                              <div>`D` drives. `A` brakes. `W / S` shape rope while swinging.</div>
                              <div>`P` or `Esc` pauses. `F` toggles fullscreen.</div>
                          </div>
                      </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                      <button onClick={() => queueGameLaunch(selectedLevelRef.current)} className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-bold tracking-[0.24em] transition-colors hover:bg-slate-800">
                          RESTART LEVEL
                      </button>
                      <button onClick={returnToMainMenu} className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-bold tracking-[0.24em] transition-colors hover:bg-slate-800">
                          MAIN MENU
                      </button>
                      <button onClick={returnToMainMenu} className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-bold tracking-[0.24em] transition-colors hover:bg-slate-800">
                          RETURN TO CAMP
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MENU UI OVERLAY */}
      {gameState === GameState.MENU && (
        <>
          {!launchIntro ? (
            <>
              <ProgressSidebar
                levels={LEVELS}
                levelResults={saveData.levelResults}
                highestUnlockedLevel={highestUnlockedLevel}
                selectedLevelId={selectedLevelId ?? 1}
                runHistory={saveData.runHistory}
                communityRunHistory={communityBoardEntries}
                achievements={menuAchievements}
                currentStreak={runConsistency.current}
                bestStreak={runConsistency.best}
                campaignChallenge={campaignChallenge}
                featuredRouteCup={featuredRouteCup}
                onOpenLeaderboard={openLeaderboardScreen}
                onShareRunboard={shareRunboard}
                onOpenShop={() => openShopScreen()}
                onOpenStory={openStoryMap}
                onOpenSettings={() => openSettings()}
                onToggleMute={toggleMute}
                onToggleFullscreen={toggleFullscreen}
                onPreviousRoute={() => stepSelectedRoute(-1)}
                onNextRoute={() => stepSelectedRoute(1)}
                onCenterSelected={() => {
                  handleSelectLevel(selectedLevelId ?? Math.max(1, highestUnlockedLevel), { focus: true });
                }}
                onZoomIn={() => adjustMenuZoom(0.045)}
                onZoomOut={() => adjustMenuZoom(-0.045)}
                onResetView={resetMenuView}
                leaderboardRemoteSource={leaderboardRemoteSource}
                leaderboardRemoteSyncAt={leaderboardRemoteSyncAt}
                isCollapsed={isProgressSidebarCollapsed}
                onToggleCollapsed={() => setIsProgressSidebarCollapsed((current) => !current)}
                isMuted={isMuted}
                isFullscreen={isFullscreen}
                isAtlasFocusMode={isAtlasFocusMode}
                onRefreshCommunityBoard={() => {
                    void refreshCommunityBoardFromRemoteSource(true);
                }}
                onShareRouteChallenge={(levelId) => {
                  clearRecommendationTrace();
                  void shareRouteChallenge(levelId);
                }}
                onCopyRouteChallenge={copyRouteChallengeText}
                onSelectLevel={(levelId) => {
                  handleSelectLevel(levelId, { focus: true });
                  setSelectedLevelId(levelId);
                  selectedLevelRef.current = levelId;
                }}
              />
              <ProgressSidebar
                levels={LEVELS}
                levelResults={saveData.levelResults}
                highestUnlockedLevel={highestUnlockedLevel}
                selectedLevelId={selectedLevelId ?? 1}
                runHistory={saveData.runHistory}
                communityRunHistory={communityBoardEntries}
                achievements={menuAchievements}
                currentStreak={runConsistency.current}
                bestStreak={runConsistency.best}
                campaignChallenge={campaignChallenge}
                featuredRouteCup={featuredRouteCup}
                variant="drawer"
                isOpen={isProgressDrawerOpen}
                onClose={() => setIsProgressDrawerOpen(false)}
                onOpenLeaderboard={openLeaderboardScreen}
                onShareRunboard={shareRunboard}
                onOpenShop={() => openShopScreen()}
                onOpenStory={openStoryMap}
                onOpenSettings={() => openSettings()}
                onToggleMute={toggleMute}
                onToggleFullscreen={toggleFullscreen}
                onPreviousRoute={() => stepSelectedRoute(-1)}
                onNextRoute={() => stepSelectedRoute(1)}
                onCenterSelected={() => {
                  handleSelectLevel(selectedLevelId ?? Math.max(1, highestUnlockedLevel), { focus: true });
                }}
                onZoomIn={() => adjustMenuZoom(0.045)}
                onZoomOut={() => adjustMenuZoom(-0.045)}
                onResetView={resetMenuView}
                leaderboardRemoteSource={leaderboardRemoteSource}
                leaderboardRemoteSyncAt={leaderboardRemoteSyncAt}
                isMuted={isMuted}
                isFullscreen={isFullscreen}
                isAtlasFocusMode={isAtlasFocusMode}
                onRefreshCommunityBoard={() => {
                    void refreshCommunityBoardFromRemoteSource(true);
                }}
                onShareRouteChallenge={(levelId) => {
                  clearRecommendationTrace();
                  void shareRouteChallenge(levelId);
                }}
                onCopyRouteChallenge={copyRouteChallengeText}
                onSelectLevel={(levelId) => {
                  handleSelectLevel(levelId, { focus: true });
                  setSelectedLevelId(levelId);
                  selectedLevelRef.current = levelId;
                }}
              />
              <Suspense fallback={<SurfaceLoader label="Loading route map" />}>
                <MenuScreen
                  saveData={saveData}
                  selectedLevel={selectedLevel}
                  selectedLevelResult={selectedLevelResult}
                  selectedLevelLocked={selectedLevelLocked}
                  highestUnlockedLevel={highestUnlockedLevel}
                  challengeRouteId={incomingRouteChallenge?.levelId ?? null}
                  challengeAlias={incomingRouteChallenge?.challengerAlias ?? null}
                  communityRunHistory={communityBoardEntries}
                  hasCompletedStoryIntro={saveData.hasCompletedStoryIntro}
                  isMuted={isMuted}
                  isFullscreen={isFullscreen}
                  isAtlasFocusMode={isAtlasFocusMode}
                  currentBuild={currentBuildSummary}
                  weatherLabels={WEATHER_LABELS}
                  enemyLabels={ENEMY_LABELS}
                  onStartGame={() => {
                    if (selectedLevel) {
                      queueGameLaunch(selectedLevel.id);
                      if (incomingRouteChallenge?.levelId === selectedLevel.id) {
                          setIncomingRouteChallenge(null);
                      }
                    }
                  }}
                  featuredRouteCup={featuredRouteCup}
                  onOpenShop={() => openShopScreen()}
                  onOpenLeaderboard={openLeaderboardScreen}
                  onOpenStory={openStoryMap}
                  onOpenProgressDrawer={() => setIsProgressDrawerOpen(true)}
                  onOpenSettings={() => openSettings()}
                  campaignChallenge={campaignChallenge}
                  onToggleAtlasFocusMode={() => setIsAtlasFocusMode((current) => !current)}
                  onFocusChallengeLevel={(levelId) => {
                      handleSelectLevel(levelId, { focus: true });
                      setSelectedLevelId(levelId);
                      selectedLevelRef.current = levelId;
                  }}
                  onAcceptChallenge={incomingRouteChallenge ? acceptSharedRouteChallenge : undefined}
                  onFocusFeaturedRoute={(levelId) => {
                      handleSelectLevel(levelId, { focus: true });
                      setSelectedLevelId(levelId);
                      selectedLevelRef.current = levelId;
                  }}
                  onToggleMute={toggleMute}
                  onToggleFullscreen={toggleFullscreen}
                  onShareRunboard={shareRunboard}
                  onCenterSelected={() => {
                      handleSelectLevel(selectedLevelId ?? Math.max(1, highestUnlockedLevel), { focus: true });
                  }}
                  onPreviousRoute={() => stepSelectedRoute(-1)}
                  onNextRoute={() => stepSelectedRoute(1)}
                  onZoomIn={() => adjustMenuZoom(0.045)}
                  onZoomOut={() => adjustMenuZoom(-0.045)}
                  onResetView={resetMenuView}
                  onOpenBuildEntry={openShopForBuildEntry}
                  compassAngleDeg={atlasCompassAngleDeg}
                />
              </Suspense>
            </>
          ) : null}
          {launchIntro ? (
            <LaunchIntroOverlay
              intro={launchIntro}
              currentTimeMs={launchIntroClockMs}
              compassAngleDeg={atlasCompassAngleDeg}
              onSkip={() => launchQueuedGame(launchIntro.levelId)}
            />
          ) : null}
        </>
      )}

      {gameState === GameState.LEADERBOARD && (
        <Suspense fallback={<SurfaceLoader label="Loading leaderboard" />}>
            <LeaderboardScreen
            localRunHistory={saveData.runHistory}
            communityRunHistory={communityBoardEntries}
            maxLevelReached={saveData.maxLevelReached}
            defaultFocusedLevelId={selectedLevelRef.current}
            leaderboardRemoteSource={leaderboardRemoteSource}
            leaderboardRemoteSyncAt={leaderboardRemoteSyncAt}
            challengeRouteId={incomingRouteChallenge?.levelId}
            challengeAlias={incomingRouteChallenge?.challengerAlias}
            boardAlias={leaderboardAlias}
            shareCode={leaderboardSharePackage?.boardCode ?? ''}
            shareUrl={leaderboardSharePackage?.boardUrl ?? ''}
            shareEntryCount={leaderboardSharePackage?.topRuns.length ?? 0}
            onReturnToMenu={returnToMainMenu}
            onAliasChange={setLeaderboardAlias}
            onShareBoard={shareRunboard}
            onCopyBoardLink={copyRunboardShareUrl}
            onCopyBoardCode={copyRunboardShareCode}
            onCopyBoardCsv={copyRunboardCsv}
            onOpenStory={openStoryMap}
            onFocusRoute={(levelId) => {
              handleSelectLevel(levelId, { focus: true });
              setSelectedLevelId(levelId);
              selectedLevelRef.current = levelId;
              setGameState(GameState.MENU);
            }}
            onRefreshCommunityBoard={() => {
              void refreshCommunityBoardFromRemoteSource(true);
            }}
            onAcceptChallenge={incomingRouteChallenge ? acceptSharedRouteChallenge : undefined}
            onShareRouteChallenge={(levelId) => {
              clearRecommendationTrace();
              void shareRouteChallenge(levelId);
            }}
            onCopyRouteChallenge={copyRouteChallengeText}
            onImportBoardClipboard={importRunboardFromClipboard}
            onImportBoardText={importRunboardFromText}
            onClearCommunityBoard={clearCommunityRunboard}
          />
        </Suspense>
      )}

      {/* SHOP UI */}
      {gameState === GameState.SHOP && (
        <Suspense fallback={<SurfaceLoader label="Loading market" />}>
          <ShopScreen
            saveData={saveData}
            activeTab={activeTab}
            shopItems={SHOP_ITEMS}
            currentBuild={currentBuildSummary}
            purchaseReceipt={purchaseReceipt}
            onGrantTestWallet={grantTestWallet}
            onClose={() => {
              clearRecommendationTrace();
              setRecommendedShopItemId(null);
              setGameState(GameState.MENU);
            }}
            onReturnToMenu={() => {
              clearRecommendationTrace();
              setRecommendedShopItemId(null);
              returnToMainMenu();
            }}
            onChangeTab={setActiveTab}
            onBuyItem={handleBuyItem}
            onEquipRopeType={handleEquipRopeType}
            onEquipSkin={handleEquipSkin}
            initialSelectedItemId={recommendedShopItemId}
          />
        </Suspense>
      )}

      {/* GAME OVER / LEVEL COMPLETE MODAL */}
      {(gameState === GameState.GAME_OVER || gameState === GameState.LEVEL_COMPLETE) && (
        <Suspense fallback={<SurfaceLoader label="Loading results" />}>
          <EndRunModal
            gameState={gameState}
            score={score}
            distance={distance}
            runTokens={runTokens}
            bestScore={bestScore}
            selectedLevelId={selectedLevelRef.current}
            highestUnlockedLevel={highestUnlockedLevel}
            hasNextUnlockedLevel={hasNextUnlockedLevel}
            selectedLevel={previewLevel}
            saveData={saveData}
            communityRunHistory={communityBoardEntries}
            worldTimeMs={worldTimeRef.current * 1000}
            playerLives={playerLives}
            causeOfDeath={currentPlayer.causeOfDeath}
            runDebrief={runDebriefRef.current}
            computeLevelStars={computeLevelStars}
            recommendationDiagnostics={recommendationDiagnostics}
            onRecommendationPresented={(itemId, levelId, levelName) => {
              markRecommendationOffer(itemId, levelId, levelName);
            }}
            runCampaignOutcome={runCampaignChallengeResult}
            runFeaturedCupOutcome={runFeaturedRouteCupResult}
            onRetry={() => {
              clearRecommendationTrace();
              queueGameLaunch(selectedLevelRef.current);
            }}
            onNextLevel={() => {
              clearRecommendationTrace();
              queueGameLaunch(selectedLevelRef.current + 1);
            }}
            onOpenLeaderboard={() => {
              clearRecommendationTrace();
              openLeaderboardScreen();
            }}
            onShareRouteChallenge={() => {
              clearRecommendationTrace();
              void shareRouteChallenge(previewLevel.id);
            }}
            onOpenShopForUpgrade={(itemId) => openShopScreen(itemId)}
            onReturnToMenu={() => {
              clearRecommendationTrace();
              setRunAchievementUnlocks([]);
              setGameState(GameState.MENU);
              handleSelectLevel(selectedLevelRef.current, { focus: true });
            }}
            newAchievements={runAchievementUnlocks}
            recommendationTrend={recommendationTrend}
          />
        </Suspense>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className={`absolute inset-0 h-full w-full ${gameState === GameState.PLAYING ? 'cursor-crosshair' : 'cursor-grab'}`}
      />
    </div>
  );
}
