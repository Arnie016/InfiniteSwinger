import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock, Flame, Flag, Lock, Map, RotateCcw, Share2, Star, Trophy, X, Copy, AlertTriangle } from 'lucide-react';

import { FeaturedRouteCup, LevelConfig, LevelResult, RunHistoryEntry } from '../../types';

type LeaderboardBoardEntry = RunHistoryEntry & {
  playerLabel: string;
  isLocal: boolean;
};

type SidebarAchievement = {
  id: string;
  title: string;
  detail: string;
  progress: string;
  unlocked: boolean;
};

type LevelMilestone = {
  id: string;
  levelId: number;
  levelName: string;
  status: 'cleared' | 'unlocked' | 'ready' | 'locked';
  chip: string;
  detail: string;
  tone: string;
};

type RouteControlEntry = {
  levelId: number;
  localBest: RunHistoryEntry | null;
  rivalBest: LeaderboardBoardEntry | null;
  status: 'solo' | 'first-mark' | 'trailing' | 'leading' | 'tied';
  gap: number | null;
  label: string;
  detail: string;
  tone: string;
};

type Props = {
  levels: LevelConfig[];
  levelResults: Record<string, LevelResult>;
  highestUnlockedLevel: number;
  selectedLevelId: number;
  runHistory: RunHistoryEntry[];
  communityRunHistory: LeaderboardBoardEntry[];
  achievements: SidebarAchievement[];
  currentStreak: number;
  bestStreak: number;
  campaignChallenge?: {
    levelId: number | null;
    title: string;
    description: string;
    note: string;
    tone: 'emerald' | 'amber' | 'cyan';
    progress: number;
    target: number;
  };
  featuredRouteCup?: FeaturedRouteCup | null;
  onSelectLevel: (levelId: number) => void;
  variant?: 'docked' | 'drawer';
  isOpen?: boolean;
  onClose?: () => void;
  onOpenLeaderboard: () => void;
  onShareRunboard: () => void;
  onRefreshCommunityBoard: () => void;
  leaderboardRemoteSource?: string;
  onShareRouteChallenge?: (levelId: number) => void;
  onCopyRouteChallenge?: (levelId: number) => void;
  leaderboardRemoteSyncAt?: number | null;
};

const isPinnedRemoteSource = (source?: string) =>
  typeof source === 'string' && source.trim().length > 0;

const REMOTE_SYNC_STALE_MS = 10 * 60 * 1000;
const REMOTE_SYNC_COOLDOWN_MS = 45 * 1000;

const formatCountdownSeconds = (remainingMs: number) => {
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  if (remainingSeconds >= 3600) {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  if (remainingSeconds >= 60) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${remainingSeconds}s`;
};

const compareRunHistoryByRecency = (left: RunHistoryEntry, right: RunHistoryEntry) => {
  const leftTime = Date.parse(left.completedAt);
  const rightTime = Date.parse(right.completedAt);
  const leftIsFinite = Number.isFinite(leftTime);
  const rightIsFinite = Number.isFinite(rightTime);

  if (leftIsFinite && rightIsFinite && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  if (rightIsFinite !== leftIsFinite) return rightIsFinite ? 1 : -1;
  return 0;
};

const buildCampaignMilestones = (
  levels: LevelConfig[],
  levelResults: Record<string, LevelResult>,
  runHistory: RunHistoryEntry[],
  highestUnlockedLevel: number,
): LevelMilestone[] => {
  const latestRunByLevel = new Map<number, RunHistoryEntry>();

  [...runHistory]
    .sort(compareRunHistoryByRecency)
    .forEach((entry) => {
      if (!latestRunByLevel.has(entry.levelId)) {
        latestRunByLevel.set(entry.levelId, entry);
      }
    });

  const currentGateClearCount = levelResults[String(highestUnlockedLevel)]?.clears ?? 0;

  return levels.map((level) => {
    const result = levelResults[String(level.id)] ?? null;
    const clears = result?.clears ?? 0;
    const bestScore = result?.bestScore ?? 0;
    const latestRun = latestRunByLevel.get(level.id);
    const latestRunLabel = latestRun
      ? `${latestRun.isWin ? 'Win' : 'Fail'} ${latestRun.score} pts`
      : 'No attempts yet';

    if (level.id <= highestUnlockedLevel) {
      if (clears > 0) {
        return {
          id: `milestone-cleared-${level.id}`,
          levelId: level.id,
          levelName: level.name,
          status: 'cleared',
          chip: level.id === highestUnlockedLevel ? 'Active' : 'Cleared',
          detail: `Cleared ${clears} time${clears === 1 ? '' : 's'} • best ${bestScore} pts • ${latestRunLabel}`,
          tone: 'border-emerald-200/25 bg-emerald-500/12 text-emerald-100',
        };
      }

      return {
        id: `milestone-open-${level.id}`,
        levelId: level.id,
        levelName: level.name,
        status: 'unlocked',
        chip: 'Unlocked',
        detail: `${level.id === highestUnlockedLevel ? 'Current gate route' : 'Open for first clear'} • ${latestRunLabel}`,
        tone: 'border-cyan-200/20 bg-cyan-500/8 text-cyan-100',
      };
    }

    if (level.id === highestUnlockedLevel + 1 && currentGateClearCount > 0) {
      return {
        id: `milestone-ready-${level.id}`,
        levelId: level.id,
        levelName: level.name,
        status: 'ready',
        chip: 'Ready',
        detail: 'Prerequisite is met. Route should unlock after the next map refresh.',
        tone: 'border-amber-200/20 bg-amber-500/12 text-amber-100',
      };
    }

    return {
      id: `milestone-locked-${level.id}`,
      levelId: level.id,
      levelName: level.name,
      status: 'locked',
      chip: 'Locked',
      detail: `Need L${level.id - 1} cleared before this route opens.`,
      tone: 'border-white/12 bg-white/[0.03] text-white/55',
    };
  });
};

const formatRunsText = (entries: RunHistoryEntry[]) => {
  const totalRuns = entries.length;
  const bestScore = entries.reduce((max, entry) => Math.max(max, entry.score), 0);
  const winRate = totalRuns > 0 ? Math.round((entries.filter((entry) => entry.isWin).length / totalRuns) * 100) : 0;

  return `${totalRuns} run${totalRuns === 1 ? '' : 's'} • ${winRate}% wins • best ${bestScore}`;
};

const formatSyncAge = (rawSyncAt?: number | null) => {
  if (!rawSyncAt || rawSyncAt <= 0 || !Number.isFinite(rawSyncAt)) return 'never';
  const deltaMs = Math.max(0, Date.now() - rawSyncAt);
  const deltaMins = Math.floor(deltaMs / 60000);
  const deltaHours = Math.floor(deltaMs / (60000 * 60));
  const deltaDays = Math.floor(deltaMs / (60000 * 60 * 24));

  if (deltaMins < 1) return 'just now';
  if (deltaHours < 1) return `${deltaMins}m ago`;
  if (deltaDays < 1) return `${deltaHours}h ago`;
  return `${deltaDays}d ago`;
};

const starRow = (count: number) => {
  const filled = Math.max(0, Math.min(3, count));
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: 3 }).map((_, index) => (
        <Star
          key={index}
          size={11}
          className={index < filled ? 'text-amber-300' : 'text-white/24'}
          fill={index < filled ? 'currentColor' : 'none'}
          strokeWidth={2.3}
        />
      ))}
    </span>
  );
};

const rowScoreSort = (left: LeaderboardBoardEntry, right: LeaderboardBoardEntry) => {
  const scoreDiff = right.score - left.score;
  if (scoreDiff !== 0) return scoreDiff;
  const tokensDiff = right.tokens - left.tokens;
  if (tokensDiff !== 0) return tokensDiff;
  const livesDiff = right.livesLeft - left.livesLeft;
  if (livesDiff !== 0) return livesDiff;
  return Date.parse(right.completedAt) - Date.parse(left.completedAt);
};

const buildRouteRivalHighlights = (
  levels: LevelConfig[],
  localRows: RunHistoryEntry[],
  communityRows: LeaderboardBoardEntry[],
) => {
  const sortedLocalRows = [...localRows].sort((left, right) =>
    rowScoreSort(
      { ...left, playerLabel: 'You', isLocal: true },
      { ...right, playerLabel: 'You', isLocal: true },
    ),
  );
  const sortedCommunityRows = [...communityRows].sort(rowScoreSort);

  const highlights = levels.reduce<
    Array<{
      id: string;
      levelId: number;
      title: string;
      detail: string;
      tag: string;
      tone: string;
    }>
  >((cards, level) => {
    const localBest = sortedLocalRows.find((entry) => entry.levelId === level.id) ?? null;
    const rivalBest = sortedCommunityRows.find((entry) => entry.levelId === level.id) ?? null;

    if (!rivalBest) {
      return cards;
    }

    if (!localBest) {
      cards.push({
        id: `post-${level.id}`,
        levelId: level.id,
        title: `Open L${level.id} rivalry`,
        detail: `${rivalBest.playerLabel} posted ${rivalBest.score} on ${level.name}. Land your first benchmark.`,
        tag: 'First mark',
        tone: 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100',
      });
      return cards;
    }

    const gap = rivalBest.score - localBest.score;
    if (gap > 0) {
      cards.push({
        id: `chase-${level.id}`,
        levelId: level.id,
        title: `Chase ${gap} pts on L${level.id}`,
        detail: `${rivalBest.playerLabel} owns ${level.name}. This route is the fastest way to regain ground.`,
        tag: 'Chasing',
        tone: 'border-rose-200/20 bg-rose-500/10 text-rose-100',
      });
      return cards;
    }

    if (gap >= -180) {
      cards.push({
        id: `defend-${level.id}`,
        levelId: level.id,
        title: `Defend L${level.id}`,
        detail: `You only lead ${level.name} by ${Math.abs(gap)} pts. A cleaner clear keeps the lane yours.`,
        tag: gap === 0 ? 'Tied' : 'Ahead',
        tone: gap === 0 ? 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100' : 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100',
      });
    }

    return cards;
  }, []);

  return highlights.slice(0, 3);
};

const buildRouteControlEntries = (
  levels: LevelConfig[],
  localRows: RunHistoryEntry[],
  communityRows: LeaderboardBoardEntry[],
) =>
  levels.reduce<RouteControlEntry[]>((entries, level) => {
    const localBest = localRows
      .filter((entry) => entry.levelId === level.id)
      .sort((left, right) => rowScoreSort(
        { ...left, playerLabel: 'You', isLocal: true },
        { ...right, playerLabel: 'You', isLocal: true },
      ))[0] ?? null;
    const rivalBest = communityRows
      .filter((entry) => entry.levelId === level.id)
      .sort(rowScoreSort)[0] ?? null;

    if (!localBest && !rivalBest) {
      entries.push({
        levelId: level.id,
        localBest: null,
        rivalBest: null,
        status: 'solo',
        gap: null,
        label: 'Solo',
        detail: 'No imported rival on this route yet.',
        tone: 'border-white/10 bg-white/[0.03] text-white/55',
      });
      return entries;
    }

    if (!localBest && rivalBest) {
      entries.push({
        levelId: level.id,
        localBest: null,
        rivalBest,
        status: 'first-mark',
        gap: null,
        label: 'Scout',
        detail: `${rivalBest.playerLabel} posted ${rivalBest.score} pts first.`,
        tone: 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100',
      });
      return entries;
    }

    if (localBest && !rivalBest) {
      entries.push({
        levelId: level.id,
        localBest,
        rivalBest: null,
        status: 'solo',
        gap: null,
        label: 'Lead',
        detail: `Your best is ${localBest.score} pts.`,
        tone: 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100',
      });
      return entries;
    }

    const gap = (rivalBest?.score ?? 0) - (localBest?.score ?? 0);

    if (gap > 0) {
      entries.push({
        levelId: level.id,
        localBest,
        rivalBest,
        status: 'trailing',
        gap,
        label: `-${gap}`,
        detail: `${rivalBest?.playerLabel} leads by ${gap} pts.`,
        tone: 'border-rose-200/20 bg-rose-500/10 text-rose-100',
      });
      return entries;
    }

    if (gap < 0) {
      entries.push({
        levelId: level.id,
        localBest,
        rivalBest,
        status: 'leading',
        gap,
        label: `+${Math.abs(gap)}`,
        detail: `You lead ${rivalBest?.playerLabel} by ${Math.abs(gap)} pts.`,
        tone: 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100',
      });
      return entries;
    }

    entries.push({
      levelId: level.id,
      localBest,
      rivalBest,
      status: 'tied',
      gap: 0,
      label: 'Tie',
      detail: `${rivalBest?.playerLabel} matched your score exactly.`,
      tone: 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100',
    });
    return entries;
  }, []);

export function ProgressSidebar({
  levels,
  levelResults,
  highestUnlockedLevel,
  selectedLevelId,
  runHistory,
  communityRunHistory,
  achievements,
  currentStreak,
  bestStreak,
  campaignChallenge,
  featuredRouteCup,
  onSelectLevel,
  variant = 'docked',
  isOpen = false,
  onClose,
  onOpenLeaderboard,
  onShareRunboard,
  onRefreshCommunityBoard,
  leaderboardRemoteSource,
  leaderboardRemoteSyncAt,
  onShareRouteChallenge,
  onCopyRouteChallenge,
}: Props) {
  const unlockedRuns = levels.filter((level) => level.id <= highestUnlockedLevel);
  const rivalHighlights = buildRouteRivalHighlights(levels, runHistory, communityRunHistory);
  const routeControlEntries = buildRouteControlEntries(levels, runHistory, communityRunHistory);
  const campaignMilestones = buildCampaignMilestones(levels, levelResults, runHistory, highestUnlockedLevel);
  const contestedRouteCount = routeControlEntries.filter((entry) => entry.localBest && entry.rivalBest).length;
  const routeLeadCount = routeControlEntries.filter((entry) => entry.status === 'leading').length;
  const routeTrailCount = routeControlEntries.filter((entry) => entry.status === 'trailing').length;
  const isSourcePinned = isPinnedRemoteSource(leaderboardRemoteSource);
  const rivalRoutesLabel =
    isSourcePinned
      ? `Live • ${formatSyncAge(leaderboardRemoteSyncAt)}`
      : communityRunHistory.length > 0
      ? `${communityRunHistory.length} imported`
      : 'offline';
  const hasRemoteSyncTimestamp = Number.isFinite(leaderboardRemoteSyncAt || 0) && (leaderboardRemoteSyncAt || 0) > 0;
  const [syncNowMs, setSyncNowMs] = React.useState(() => Date.now());
  const syncAgeMs = hasRemoteSyncTimestamp ? Math.max(0, syncNowMs - (leaderboardRemoteSyncAt || 0)) : null;
  const sourceSyncCooldownMs =
    isSourcePinned && syncAgeMs !== null ? Math.max(0, REMOTE_SYNC_COOLDOWN_MS - syncAgeMs) : 0;
  const canRefreshCommunityBoard = isPinnedRemoteSource(leaderboardRemoteSource) && sourceSyncCooldownMs <= 0;
  const isRemoteSyncStale = isSourcePinned && syncAgeMs !== null && syncAgeMs > REMOTE_SYNC_STALE_MS;
  const syncSourceButtonLabel = isPinnedRemoteSource(leaderboardRemoteSource)
    ? isRemoteSyncStale
      ? `Stale • ${formatSyncAge(leaderboardRemoteSyncAt)}`
      : `Live • ${formatSyncAge(leaderboardRemoteSyncAt)}`
    : 'Set source';

  React.useEffect(() => {
    if (!isSourcePinned || !leaderboardRemoteSyncAt) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setSyncNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isSourcePinned, leaderboardRemoteSyncAt]);
  const totalLevels = levels.length;
  const currentGateLevel = levelResults[String(highestUnlockedLevel)] ?? null;
  const canOpenImmediateGate = (currentGateLevel?.clears ?? 0) > 0;
  const branchExpansionHint = canOpenImmediateGate
    ? 'Next route is unlocked once you clear your current camp with a stable run.'
    : 'Finish the current camp to open the next branch of the atlas.';
  const campaignProgress = campaignChallenge
    ? Math.max(0, Math.min(100, Math.round((campaignChallenge.progress / Math.max(1, campaignChallenge.target)) * 100)))
    : 0;
  const campaignTone =
    campaignChallenge?.tone === 'amber'
      ? 'border-amber-200/20 bg-amber-500/10 text-amber-100'
      : campaignChallenge?.tone === 'cyan'
        ? 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100'
        : 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100';
  const featuredCupTone =
    featuredRouteCup?.tone === 'rose'
      ? 'border-rose-200/20 bg-rose-500/10 text-rose-100'
      : featuredRouteCup?.tone === 'amber'
        ? 'border-amber-200/20 bg-amber-500/10 text-amber-100'
        : featuredRouteCup?.tone === 'emerald'
          ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100'
          : 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100';
  const featuredCupProgressFill =
    featuredRouteCup?.tone === 'rose'
      ? 'bg-rose-200'
      : featuredRouteCup?.tone === 'amber'
        ? 'bg-amber-200'
        : featuredRouteCup?.tone === 'emerald'
          ? 'bg-emerald-200'
          : 'bg-cyan-200';
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const containerClassName =
    variant === 'drawer'
      ? `pointer-events-auto absolute inset-0 z-30 xl:hidden ${isOpen ? '' : 'hidden'}`
      : 'pointer-events-none absolute inset-y-0 left-3 z-20 hidden w-[298px] flex-col py-3 xl:flex';
  const shellClassName =
    variant === 'drawer'
      ? 'relative flex h-full min-h-0 w-[min(88vw,320px)] flex-col overflow-hidden rounded-r-[1.75rem] border-r border-white/10 bg-slate-950/94 p-3 text-white shadow-[24px_0_80px_rgba(2,6,23,0.7)] backdrop-blur-2xl atlas-surface atlas-elevated'
      : 'pointer-events-auto flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/86 p-3 text-white backdrop-blur-xl atlas-surface atlas-elevated';
  const selectedRoute = levels.find((level) => level.id === selectedLevelId) ?? null;
  const isSelectedRouteUnlocked = selectedRoute ? selectedRoute.id <= highestUnlockedLevel : false;
  const scrollToSidebarSection = (section: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const target = container.querySelector<HTMLElement>(`[data-sidebar-section="${section}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={containerClassName}>
      {variant === 'drawer' ? (
        <button
          type="button"
          aria-label="Close campaign drawer"
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/72"
        />
      ) : null}

      <div className={shellClassName}>
        {variant === 'drawer' ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="atlas-map-label text-[9px] uppercase tracking-[0.22em] text-white/55">Campaign drawer</div>
              <div className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-emerald-100">Atlas Sidebar</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition-colors hover:bg-white/[0.08]"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        <div
          ref={scrollContainerRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pr-1"
        >
          <div data-sidebar-section="overview" className="scroll-mt-4">
            <div className="rounded-2xl border border-emerald-200/20 bg-emerald-500/8 p-2.5">
              <div className="atlas-map-label text-[9px] uppercase tracking-[0.22em] text-white/55">Infinite Swinger</div>
              <div className="atlas-map-label text-[10px] uppercase tracking-[0.2em] text-emerald-100">Campaign Atlas</div>
              <div className="mt-2 font-black text-base uppercase tracking-[0.16em] text-emerald-100">Progress & Achievements</div>
              <div className="mt-1 text-[11px] text-slate-300">{formatRunsText(runHistory)}</div>
            </div>

            <div className="sticky top-0 z-10 mt-3 rounded-2xl border border-white/10 bg-slate-950/88 p-2.5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.22em] text-white/45">
                <span>Atlas shortcuts</span>
                <span>{contestedRouteCount} contested</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollToSidebarSection('overview')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/[0.08]"
                >
                  <BookOpen size={11} />
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSidebarSection('routes')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-200/20 bg-cyan-500/12 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/18"
                >
                  <Map size={11} />
                  Routes
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSidebarSection('rivals')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-fuchsia-200/20 bg-fuchsia-500/12 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-100 transition-colors hover:bg-fuchsia-500/18"
                >
                  <Trophy size={11} />
                  Rivals
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSidebarSection('achievements')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200/20 bg-amber-500/12 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100 transition-colors hover:bg-amber-500/18"
                >
                  <Star size={11} />
                  Awards
                </button>
              </div>
            </div>

            {campaignChallenge ? (
              <div className={`mt-3 rounded-2xl border ${campaignTone} p-2.5 text-[11px]`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="atlas-map-label text-[9px] text-white/80">Campaign Quest</div>
                  <span className="atlas-chip rounded-full px-2 py-1 text-[10px] text-slate-100">{campaignProgress}%</span>
                </div>
                <div className="mt-1 text-sm font-bold text-white">{campaignChallenge.title}</div>
                <div className="mt-1 text-white/80">{campaignChallenge.description}</div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                  <div className="h-1.5 rounded-full bg-white/75 transition-all duration-500" style={{ width: `${campaignProgress}%` }} />
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/55">{campaignChallenge.note}</div>
              </div>
            ) : null}

            {featuredRouteCup ? (
              <button
                type="button"
                onClick={() => {
                  onSelectLevel(featuredRouteCup.levelId);
                  if (variant === 'drawer') {
                    onClose?.();
                  }
                }}
                className={`mt-3 w-full rounded-2xl border p-2.5 text-left text-[11px] transition-colors hover:bg-white/[0.08] ${featuredCupTone}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="atlas-map-label text-[9px] text-white/80">Daily Crew Cup</div>
                  <span className="atlas-chip rounded-full px-2 py-1 text-[9px] text-slate-100">
                    {featuredRouteCup.countdownLabel}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-white">{featuredRouteCup.title}</div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/80">
                    {featuredRouteCup.statusLabel}
                  </span>
                </div>
                <div className="mt-1 text-white/80">{featuredRouteCup.detail}</div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${featuredCupProgressFill}`}
                    style={{ width: `${featuredRouteCup.progressPercent}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/55">{featuredRouteCup.targetLabel}</div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="rounded-xl border border-white/10 bg-slate-950/55 px-2.5 py-2">
                    <div className="text-white/45">Your best</div>
                    <div className="mt-1 text-sm font-black text-white">
                      {featuredRouteCup.localBest ? `${featuredRouteCup.localBest.score} pts` : '--'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/55 px-2.5 py-2">
                    <div className="truncate text-white/45">{featuredRouteCup.rivalBest?.playerLabel ?? 'Rival'}</div>
                    <div className="mt-1 text-sm font-black text-white">
                      {featuredRouteCup.rivalBest ? `${featuredRouteCup.rivalBest.score} pts` : '--'}
                    </div>
                  </div>
                </div>
              </button>
            ) : null}
          </div>

        <div data-sidebar-section="routes" className="mt-3 scroll-mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          <div className="rounded-2xl border border-fuchsia-200/25 bg-white/[0.03] p-2 text-[11px] text-slate-200">
            <div className="mb-1.5 flex items-center justify-between text-fuchsia-100">
              <span className="inline-flex items-center gap-1.5">
                <Flame size={12} />
                Branch Consistency
              </span>
              <span className="atlas-chip rounded-full px-2 py-1 text-[10px] text-slate-100">
                {currentStreak} live
              </span>
            </div>
            <div className="text-white text-sm font-bold">Current streak {currentStreak} • Best {bestStreak}</div>
            <div className="mt-1 text-[10px] text-slate-300">Build a 5-clears sequence to stabilize unlock flow and campaign pace.</div>
          </div>

          <div className="mt-3 rounded-2xl border border-sky-200/20 bg-sky-500/8 p-2">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-sky-100/90">
              <span className="inline-flex items-center gap-1.5">
                <Map size={12} />
                Atlas Expansion
              </span>
              <span className="atlas-chip rounded-full px-2 py-1 text-[10px] text-slate-200">
                {highestUnlockedLevel}/{totalLevels}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-[10px] text-slate-200">
              <div className="font-semibold text-white">Map depth</div>
              <div className="mt-1 text-slate-300">{branchExpansionHint}</div>
            </div>
            <div className="mt-2 space-y-1.5">
              {campaignMilestones.map((milestone) => {
                const isImmediateNext = milestone.levelId === highestUnlockedLevel + 1;
                const isCurrentGate = milestone.levelId === highestUnlockedLevel;
                return (
                  <div key={milestone.id} className={`rounded-xl border px-2.5 py-2 ${milestone.tone}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5">
                        {isImmediateNext || isCurrentGate ? <AlertTriangle size={12} /> : <Map size={12} />}
                        <span className="text-sm font-bold text-white">L{milestone.levelId} • {milestone.levelName}</span>
                      </div>
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-white/85">
                        {milestone.chip}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-200">{milestone.detail}</p>
                    {isImmediateNext && !canOpenImmediateGate ? (
                      <div className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-amber-200/85">Gate blocked by current route</div>
                    ) : null}
                    {isCurrentGate && !canOpenImmediateGate ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLevel(highestUnlockedLevel);
                          if (variant === 'drawer') {
                            onClose?.();
                          }
                        }}
                        className="mt-1.5 inline-flex rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/15"
                      >
                        Focus current lane
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {!canOpenImmediateGate && campaignMilestones.length > highestUnlockedLevel ? (
              <button
                type="button"
                onClick={() => {
                  onSelectLevel(highestUnlockedLevel);
                  if (variant === 'drawer') {
                    onClose?.();
                  }
                }}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/[0.08]"
              >
                Focus on L{highestUnlockedLevel} to unlock the next branch
              </button>
            ) : null}
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-cyan-200/90">
              <span className="inline-flex items-center gap-1.5">
                <Map size={12} />
                Route List
              </span>
              <span className="atlas-chip rounded-full px-2 py-1 text-[10px] text-slate-200">{unlockedRuns.length}/{levels.length}</span>
            </div>
            <div className="mb-2 grid grid-cols-3 gap-1.5 text-[10px] uppercase tracking-[0.14em]">
              <div className="rounded-xl border border-cyan-200/15 bg-cyan-500/8 px-2 py-1.5 text-cyan-100">
                <div className="text-white/55">Contested</div>
                <div className="mt-1 text-sm font-black text-white">{contestedRouteCount}</div>
              </div>
              <div className="rounded-xl border border-emerald-200/15 bg-emerald-500/8 px-2 py-1.5 text-emerald-100">
                <div className="text-white/55">Leading</div>
                <div className="mt-1 text-sm font-black text-white">{routeLeadCount}</div>
              </div>
              <div className="rounded-xl border border-rose-200/15 bg-rose-500/8 px-2 py-1.5 text-rose-100">
                <div className="text-white/55">Chasing</div>
                <div className="mt-1 text-sm font-black text-white">{routeTrailCount}</div>
              </div>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1 text-[11px]">
              {levels.map((level) => {
                const isSelected = level.id === selectedLevelId;
                const isUnlocked = level.id <= highestUnlockedLevel;
                const result = levelResults[String(level.id)] ?? null;
                const clears = result?.clears ?? 0;
                const stars = result?.stars ?? 0;
                const isCleared = clears > 0;
                const routeControl = routeControlEntries.find((entry) => entry.levelId === level.id) ?? null;

                return (
                  <button
                    key={level.id}
                    onClick={() => {
                      if (!isUnlocked) return;
                      onSelectLevel(level.id);
                      if (variant === 'drawer') {
                        onClose?.();
                      }
                    }}
                    disabled={!isUnlocked}
                    className={`w-full rounded-xl border px-2.5 py-2 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-300/40 bg-emerald-500/18'
                        : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/35 hover:bg-white/[0.06]'
                    } ${!isUnlocked ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5">
                        {isUnlocked ? <Flag size={11} /> : <Lock size={11} />}
                        <span className="font-semibold text-white">Lv {level.id}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-white/75">
                        <span>{isCleared ? <CheckCircle2 size={12} /> : null}</span>
                        <span className="text-[10px]">{clears}×</span>
                      </div>
                    </div>
                    <div className="mt-1 truncate text-white/85">{level.name}</div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-white/55">
                      <span>{isUnlocked ? `${level.difficulty} • ${level.biome}` : 'Locked by progress'}</span>
                      {isUnlocked ? starRow(stars) : null}
                    </div>
                    {isUnlocked && routeControl ? (
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${routeControl.tone}`}>
                          {routeControl.label}
                        </span>
                        <span className="min-w-0 truncate text-right text-[9px] uppercase tracking-[0.12em] text-white/45">
                          {routeControl.detail}
                        </span>
                      </div>
                    ) : null}
                    {isUnlocked && (onShareRouteChallenge || onCopyRouteChallenge) ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {onShareRouteChallenge ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onShareRouteChallenge(level.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-cyan-200/25 bg-cyan-500/12 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition-colors hover:bg-cyan-500/18"
                          >
                            <Share2 size={11} />
                            Challenge
                          </button>
                        ) : null}
                        {onCopyRouteChallenge ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onCopyRouteChallenge(level.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200/25 bg-fuchsia-500/12 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-fuchsia-100 transition-colors hover:bg-fuchsia-500/18"
                          >
                            <Copy size={11} />
                            Copy
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {!isUnlocked ? <p className="mt-1 text-[10px] text-amber-200/80">Locked</p> : null}
                  </button>
                );
              })}
            </div>
            {isSelectedRouteUnlocked && (onShareRouteChallenge || onCopyRouteChallenge) ? (
              <div className={`mt-2 grid gap-1.5 ${onShareRouteChallenge && onCopyRouteChallenge ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {onShareRouteChallenge ? (
                  <button
                    type="button"
                    onClick={() => {
                      onShareRouteChallenge(selectedRoute?.id ?? selectedLevelId);
                    }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-cyan-200/25 bg-cyan-500/12 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/18"
                  >
                    <Share2 size={12} />
                    Challenge selected route
                  </button>
                ) : null}
                {onCopyRouteChallenge ? (
                  <button
                    type="button"
                    onClick={() => {
                      onCopyRouteChallenge(selectedRoute?.id ?? selectedLevelId);
                    }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-fuchsia-200/25 bg-fuchsia-500/12 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-100 transition-colors hover:bg-fuchsia-500/18"
                  >
                    <Copy size={12} />
                    Copy selected route
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div data-sidebar-section="rivals" className="mt-3 scroll-mt-4 rounded-2xl border border-cyan-200/18 bg-cyan-500/[0.05] p-2">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-cyan-100/90">
          <span className="inline-flex items-center gap-1.5">
              <Trophy size={12} />
              Rival Routes
            </span>
            <span className="atlas-chip rounded-full px-2 py-1 text-[10px] text-slate-200">
              {rivalRoutesLabel}
            </span>
          </div>
          {isSourcePinned ? (
            <button
              type="button"
              onClick={() => {
                const sourceUrl = leaderboardRemoteSource?.trim();
                if (!sourceUrl) return;
                window.open(sourceUrl, '_blank', 'noopener,noreferrer');
              }}
              className="mb-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-sky-200/30 bg-sky-500/12 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-100 transition-colors hover:bg-sky-500/18"
            >
              <Clock size={11} />
              {syncSourceButtonLabel}
            </button>
          ) : null}
          {isRemoteSyncStale ? (
            <div className="mb-2 rounded-xl border border-amber-200/25 bg-amber-500/10 px-3 py-2 text-[10px] leading-relaxed text-amber-100">
              Rival board sync is stale. Some challenge rankings may be behind.
            </div>
          ) : null}

          {rivalHighlights.length > 0 ? (
            <div className="space-y-1.5">
              {rivalHighlights.map((highlight) => (
                <button
                  key={highlight.id}
                  type="button"
                  onClick={() => {
                    onSelectLevel(highlight.levelId);
                    if (variant === 'drawer') {
                      onClose?.();
                    }
                  }}
                  className={`w-full rounded-xl border px-2.5 py-2 text-left transition-all hover:border-white/30 hover:bg-white/[0.08] ${highlight.tone}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">{highlight.title}</span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/80">
                      {highlight.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/80">{highlight.detail}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[11px] leading-relaxed text-slate-300">
              Import a rival runboard to turn the atlas into a head-to-head ladder. Shared boards merge locally, so the campaign drawer can keep surfacing the best routes to attack next.
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onShareRunboard}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/[0.08]"
            >
              <Share2 size={12} />
              Share
            </button>
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/[0.08]"
            >
              <Trophy size={12} />
              Boards
            </button>
            <button
              type="button"
              onClick={onRefreshCommunityBoard}
              disabled={!isPinnedRemoteSource(leaderboardRemoteSource) || !canRefreshCommunityBoard}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45 hover:bg-white/[0.08]"
            >
              <RotateCcw size={12} />
              {isPinnedRemoteSource(leaderboardRemoteSource)
                ? canRefreshCommunityBoard
                  ? 'Sync board'
                  : `Sync in ${formatCountdownSeconds(sourceSyncCooldownMs)}`
                : 'Set source'}
            </button>
          </div>
          {!isPinnedRemoteSource(leaderboardRemoteSource) ? (
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/55">
              Paste a public Google Sheet or CSV once to enable one-tap rivalry sync.
            </p>
          ) : null}
        </div>

        <div data-sidebar-section="achievements" className="mt-3 scroll-mt-4 rounded-2xl border border-amber-200/25 bg-white/[0.03] p-2">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-amber-200/90">
            <span className="inline-flex items-center gap-1.5">
              <Trophy size={12} />
              Achievements
            </span>
            <span className="atlas-chip rounded-full px-2 py-1 text-[10px] text-slate-200">
              {achievements.filter((entry) => entry.unlocked).length}/{achievements.length}
            </span>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-[11px]">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-xl border px-2.5 py-2 ${
                  achievement.unlocked
                    ? 'border-emerald-300/30 bg-emerald-500/12 text-emerald-100'
                    : 'border-white/10 bg-white/5 text-white/55'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{achievement.title}</span>
                  {achievement.unlocked ? <CheckCircle2 size={12} /> : <ArrowRight size={11} />}
                </div>
                <p className="mt-1 text-[10px] text-slate-200/80">{achievement.detail}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/45">{achievement.progress}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
