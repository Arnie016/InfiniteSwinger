import React from 'react';
import { ArrowLeft, CalendarClock, Clock, ClipboardPaste, Copy, Globe, Link2, Medal, Play, RotateCcw, Trash2, Trophy, UserRound } from 'lucide-react';
import { RunHistoryEntry } from '../../types';
import { formatDurationMs } from '../../engine/uiFormat';

type LeaderboardBoardEntry = RunHistoryEntry & {
  playerLabel: string;
  isLocal: boolean;
};

type Props = {
  localRunHistory: RunHistoryEntry[];
  communityRunHistory: LeaderboardBoardEntry[];
  maxLevelReached: number;
  defaultFocusedLevelId?: number;
  leaderboardRemoteSource?: string;
  leaderboardRemoteSyncAt?: number | null;
  boardAlias: string;
  shareCode: string;
  shareUrl: string;
  shareEntryCount: number;
  onReturnToMenu: () => void;
  onAliasChange: (alias: string) => void;
  onShareBoard: () => void;
  onCopyBoardLink: () => void;
  onCopyBoardCode: () => void;
  onCopyBoardCsv: () => void;
  onOpenStory: () => void;
  onFocusRoute: (levelId: number) => void;
  onRefreshCommunityBoard?: () => void;
  onShareRouteChallenge?: (levelId: number) => void;
  onCopyRouteChallenge?: (levelId: number) => void;
  challengeRouteId?: number;
  challengeAlias?: string;
  onAcceptChallenge?: (levelId: number) => void;
  onImportBoardClipboard: () => void | Promise<void>;
  onImportBoardText: (value: string) => void | Promise<void>;
  onClearCommunityBoard: () => void;
};

const rowScoreSort = (left: LeaderboardBoardEntry, right: LeaderboardBoardEntry) => {
  const scoreDiff = right.score - left.score;
  if (scoreDiff !== 0) return scoreDiff;
  const tokensDiff = right.tokens - left.tokens;
  if (tokensDiff !== 0) return tokensDiff;
  const livesDiff = right.livesLeft - left.livesLeft;
  if (livesDiff !== 0) return livesDiff;

  const leftTime = Date.parse(left.completedAt);
  const rightTime = Date.parse(right.completedAt);
  if (Number.isFinite(rightTime) && Number.isFinite(leftTime)) {
    return rightTime - leftTime;
  }

  return 0;
};

const formatBoardDate = (raw: string) => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(date);
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

const dedupe = (rows: LeaderboardBoardEntry[]) => {
  const buckets = new Map<string, LeaderboardBoardEntry>();

  rows.forEach((entry) => {
    const key = `${entry.playerLabel}|${entry.levelId}|${entry.score}|${entry.elapsedMs}|${entry.completedAt}`;
    buckets.set(key, entry);
  });

  return [...buckets.values()];
};

const dedupeAndSort = (rows: LeaderboardBoardEntry[]) => dedupe(rows).sort(rowScoreSort);

const pickBestRouteRuns = (rows: LeaderboardBoardEntry[]) => {
  const routeBestRows = new Map<number, LeaderboardBoardEntry>();

  rows.forEach((entry) => {
    const currentBest = routeBestRows.get(entry.levelId);
    if (!currentBest || rowScoreSort(entry, currentBest) < 0) {
      routeBestRows.set(entry.levelId, entry);
    }
  });

  return [...routeBestRows.values()].sort((left, right) => left.levelId - right.levelId);
};

const divisionLadder = [
  { id: 'rookie', title: 'Canopy Rookie', threshold: 0, accent: 'text-slate-100' },
  { id: 'scout', title: 'Branch Scout', threshold: 1800, accent: 'text-emerald-100' },
  { id: 'captain', title: 'Vine Captain', threshold: 4200, accent: 'text-cyan-100' },
  { id: 'legend', title: 'Sky Legend', threshold: 7600, accent: 'text-amber-100' },
] as const;

type RivalMission = {
  id: string;
  levelId: number;
  title: string;
  detail: string;
  tone: string;
};

type CrewStanding = {
  alias: string;
  seasonPoints: number;
  wins: number;
  totalRuns: number;
  contestedRoutes: number;
  leadRoutes: number;
  deficitRoutes: number;
  bestScore: number;
  freshestRunAt: string | null;
  scoreDeltaVsLocal: number;
};

const buildSeasonPoints = (rows: LeaderboardBoardEntry[]) =>
  pickBestRouteRuns(rows).reduce(
    (total, entry) => total + entry.score + entry.tokens * 4 + entry.livesLeft * 30 + (entry.isWin ? 180 : 0),
    0,
  );

const getDivisionStatus = (seasonPoints: number) => {
  const currentDivision =
    [...divisionLadder].reverse().find((division) => seasonPoints >= division.threshold) ?? divisionLadder[0];
  const nextDivision = divisionLadder.find((division) => division.threshold > currentDivision.threshold) ?? null;
  const progressToNext = nextDivision
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((seasonPoints - currentDivision.threshold) / Math.max(1, nextDivision.threshold - currentDivision.threshold)) * 100,
          ),
        ),
      )
    : 100;

  return {
    currentDivision,
    nextDivision,
    progressToNext,
  };
};

const formatRelativeBoardDate = (raw: string) => {
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return 'No timestamp';

  const deltaMs = Date.now() - timestamp;
  const deltaHours = Math.round(deltaMs / (1000 * 60 * 60));
  if (deltaHours <= 1) return 'within the hour';
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.round(deltaHours / 24);
  if (deltaDays < 7) return `${deltaDays}d ago`;
  return formatBoardDate(raw);
};

const buildRivalMissions = (
  routeOptions: Array<{ levelId: number; levelName: string }>,
  localRows: LeaderboardBoardEntry[],
  communityRows: LeaderboardBoardEntry[],
) => {
  const missions: RivalMission[] = [];

  routeOptions.forEach((route) => {
    const localBest = localRows.find((entry) => entry.levelId === route.levelId) ?? null;
    const communityBest = communityRows.find((entry) => entry.levelId === route.levelId) ?? null;

    if (!communityBest) return;

    if (!localBest) {
      missions.push({
        id: `post-${route.levelId}`,
        levelId: route.levelId,
        title: `Post a marker on L${route.levelId}`,
        detail: `${communityBest.playerLabel} owns ${route.levelName}. Land your first scored benchmark to open the rivalry.`,
        tone: 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100',
      });
      return;
    }

    const gap = communityBest.score - localBest.score;
    if (gap > 0) {
      missions.push({
        id: `chase-${route.levelId}`,
        levelId: route.levelId,
        title: `Close ${gap} pts on L${route.levelId}`,
        detail: `${communityBest.playerLabel} leads ${route.levelName}. This is the cleanest route to steal back momentum.`,
        tone: 'border-rose-200/20 bg-rose-500/10 text-rose-100',
      });
      return;
    }

    if (gap < 0 && Math.abs(gap) <= 160) {
      missions.push({
        id: `defend-${route.levelId}`,
        levelId: route.levelId,
        title: `Defend L${route.levelId}`,
        detail: `You lead ${route.levelName} by ${Math.abs(gap)} pts. Tighten the line before the rival board catches up.`,
        tone: 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100',
      });
    }
  });

  return missions.slice(0, 3);
};

const buildCrewStandings = (localRows: LeaderboardBoardEntry[], communityRows: LeaderboardBoardEntry[]) => {
  const localSeasonRows = pickBestRouteRuns(localRows);
  const localSeasonPoints = buildSeasonPoints(localSeasonRows);
  const grouped = communityRows.reduce<Map<string, LeaderboardBoardEntry[]>>((bucket, entry) => {
    const alias = entry.playerLabel || 'Runner';
    const previous = bucket.get(alias) ?? [];
    previous.push(entry);
    bucket.set(alias, previous);
    return bucket;
  }, new Map());

  return [...grouped.entries()]
    .map(([alias, rows]): CrewStanding => {
      const seasonRows = pickBestRouteRuns(rows);
      const seasonPoints = buildSeasonPoints(seasonRows);
      const wins = rows.filter((entry) => entry.isWin).length;
      const bestScore = rows.reduce((best, entry) => Math.max(best, entry.score), 0);
      const freshestRunAt =
        rows.reduce<number | null>((latest, entry) => {
          const timestamp = Date.parse(entry.completedAt);
          if (!Number.isFinite(timestamp)) return latest;
          return latest === null ? timestamp : Math.max(latest, timestamp);
        }, null) ?? null;

      const routeComparison = seasonRows.reduce(
        (summary, levelId) => {
          const localBest = localSeasonRows.find((entry) => entry.levelId === levelId.levelId) ?? null;
          const crewBest = seasonRows.find((entry) => entry.levelId === levelId.levelId) ?? null;
          if (!localBest || !crewBest) return summary;

          summary.contestedRoutes += 1;
          if (crewBest.score > localBest.score) {
            summary.deficitRoutes += 1;
          } else if (crewBest.score < localBest.score) {
            summary.leadRoutes += 1;
          }

          return summary;
        },
        {
          contestedRoutes: 0,
          leadRoutes: 0,
          deficitRoutes: 0,
        },
      );

      return {
        alias,
        seasonPoints,
        wins,
        totalRuns: rows.length,
        contestedRoutes: routeComparison.contestedRoutes,
        leadRoutes: routeComparison.leadRoutes,
        deficitRoutes: routeComparison.deficitRoutes,
        bestScore,
        freshestRunAt: freshestRunAt ? new Date(freshestRunAt).toISOString() : null,
        scoreDeltaVsLocal: localSeasonPoints - seasonPoints,
      };
    })
    .sort((left, right) => {
      const deltaDiff = left.scoreDeltaVsLocal - right.scoreDeltaVsLocal;
      if (deltaDiff !== 0) return deltaDiff;
      const pointsDiff = right.seasonPoints - left.seasonPoints;
      if (pointsDiff !== 0) return pointsDiff;
      return right.bestScore - left.bestScore;
    });
};

function LeaderboardRow({ index, entry }: { index: number; entry: LeaderboardBoardEntry }) {
  const labelTone = entry.isLocal
    ? 'border-emerald-200/20 bg-emerald-500/12 text-emerald-100'
    : 'border-cyan-200/20 bg-cyan-500/12 text-cyan-100';
  const sourceLabel = entry.isLocal ? 'You' : 'Community';

  return (
    <div className={`rounded-xl border ${labelTone} px-2.5 py-2`}>
      <div className="flex items-center justify-between gap-2 text-[11px] text-white/95">
        <div className="font-semibold">#{index + 1} {entry.levelName}</div>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]">
          {entry.isWin ? 'WIN' : 'TRY'}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-white/70">
        {entry.score} pts • {entry.tokens} tk • {entry.livesLeft}L • {formatDurationMs(entry.elapsedMs)}
      </div>
      <div className="mt-1 flex items-center justify-between text-[9px] text-white/55">
        <span className="inline-flex items-center gap-1.5">
          <UserRound size={10} />
          {entry.playerLabel || sourceLabel}
        </span>
        <span>{formatBoardDate(entry.completedAt)}</span>
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/45">{sourceLabel}</div>
    </div>
  );
}

export function LeaderboardScreen({
  localRunHistory,
  communityRunHistory,
  maxLevelReached,
  defaultFocusedLevelId = 0,
  leaderboardRemoteSource,
  leaderboardRemoteSyncAt,
  boardAlias,
  shareCode,
  shareUrl,
  shareEntryCount,
  challengeRouteId,
  challengeAlias,
  onReturnToMenu,
  onAliasChange,
  onShareBoard,
  onCopyBoardLink,
  onCopyBoardCode,
  onCopyBoardCsv,
  onOpenStory,
  onFocusRoute,
  onRefreshCommunityBoard,
  onShareRouteChallenge,
  onCopyRouteChallenge,
  onAcceptChallenge,
  onImportBoardClipboard,
  onImportBoardText,
  onClearCommunityBoard,
}: Props) {
  const [importText, setImportText] = React.useState('');
  const [syncNowMs, setSyncNowMs] = React.useState(() => Date.now());
  const localRows = dedupeAndSort(
    localRunHistory.map((entry) => ({
      ...entry,
      playerLabel: 'You',
      isLocal: true,
    })),
  );
  const communityRows = dedupeAndSort(
    communityRunHistory.map((entry) => ({
      ...entry,
      playerLabel: entry.playerLabel || 'Runner',
      isLocal: false,
    })),
  );
  const localSeasonRows = pickBestRouteRuns(localRows);
  const communitySeasonRows = pickBestRouteRuns(communityRows);
  const hasPinnedRemoteSource = Boolean(leaderboardRemoteSource?.trim());
  const hasRemoteSyncTimestamp = Number.isFinite(leaderboardRemoteSyncAt || 0) && (leaderboardRemoteSyncAt || 0) > 0;
  const syncAgeMs = hasRemoteSyncTimestamp ? Math.max(0, syncNowMs - (leaderboardRemoteSyncAt || 0)) : null;
  const sourceSyncCooldownMs = hasPinnedRemoteSource && syncAgeMs !== null ? Math.max(0, 45_000 - syncAgeMs) : 0;
  const canRefreshCommunityBoard = Boolean(onRefreshCommunityBoard) && hasPinnedRemoteSource && sourceSyncCooldownMs <= 0;
  const sourceKindLabel = leaderboardRemoteSource?.includes('docs.google.com') ? 'Google Sheets' : 'CSV / TSV source';
  const syncSourceButtonLabel = hasPinnedRemoteSource
    ? syncAgeMs !== null && syncAgeMs > 10 * 60 * 1000
      ? `Stale • ${formatSyncAge(leaderboardRemoteSyncAt)}`
      : `Live • ${formatSyncAge(leaderboardRemoteSyncAt)}`
    : 'Set source';

  const routeOptions = dedupe([...localRows, ...communityRows])
    .map((entry) => ({ levelId: entry.levelId, levelName: entry.levelName }))
    .sort((left, right) => left.levelId - right.levelId)
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.levelId === entry.levelId) === index);
  const [focusedLevelId, setFocusedLevelId] = React.useState<number>(defaultFocusedLevelId);

  React.useEffect(() => {
    const nextFocusedLevel =
      defaultFocusedLevelId > 0 && routeOptions.some((option) => option.levelId === defaultFocusedLevelId)
        ? defaultFocusedLevelId
        : 0;
    setFocusedLevelId(nextFocusedLevel);
  }, [defaultFocusedLevelId, routeOptions]);

  React.useEffect(() => {
    if (!hasPinnedRemoteSource || !hasRemoteSyncTimestamp) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setSyncNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [hasPinnedRemoteSource, hasRemoteSyncTimestamp]);

  const filterRows = (rows: LeaderboardBoardEntry[]) =>
    focusedLevelId === 0 ? rows : rows.filter((entry) => entry.levelId === focusedLevelId);

  const filteredLocalRows = filterRows(localRows);
  const filteredCommunityRows = filterRows(communityRows);
  const globalRows = dedupe([...filteredLocalRows, ...filteredCommunityRows]).sort(rowScoreSort).slice(0, 36);
  const focusedLocalBest = filteredLocalRows[0] ?? null;
  const focusedCommunityBest = filteredCommunityRows[0] ?? null;
  const focusedRoute = routeOptions.find((option) => option.levelId === focusedLevelId) ?? null;
  const focusedGap =
    focusedLocalBest && focusedCommunityBest ? focusedCommunityBest.score - focusedLocalBest.score : null;
  const hasSharePayload = shareCode.length > 0 && shareUrl.length > 0;
  const communityCount = communityRows.length;
  const sharedRouteComparisons = routeOptions
    .map((route) => {
      const localBest = localRows.find((entry) => entry.levelId === route.levelId) ?? null;
      const communityBest = communityRows.find((entry) => entry.levelId === route.levelId) ?? null;
      if (!localBest || !communityBest) return null;

      return {
        levelId: route.levelId,
        levelName: route.levelName,
        localBest,
        communityBest,
        gap: communityBest.score - localBest.score,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const rivalrySummary = sharedRouteComparisons.reduce(
    (summary, comparison) => {
      if (comparison.gap > 0) {
        summary.trailCount += 1;
        if (!summary.closestDeficit || comparison.gap < summary.closestDeficit.gap) {
          summary.closestDeficit = comparison;
        }
      } else if (comparison.gap < 0) {
        summary.leadCount += 1;
        if (!summary.closestLead || Math.abs(comparison.gap) < Math.abs(summary.closestLead.gap)) {
          summary.closestLead = comparison;
        }
      } else {
        summary.tieCount += 1;
      }

      return summary;
    },
    {
      leadCount: 0,
      trailCount: 0,
      tieCount: 0,
      closestLead: null as (typeof sharedRouteComparisons)[number] | null,
      closestDeficit: null as (typeof sharedRouteComparisons)[number] | null,
    },
  );
  const selectedChallengeAlias = challengeAlias?.trim() || '';
  const challengeRoute = challengeRouteId ? routeOptions.find((route) => route.levelId === challengeRouteId) ?? null : null;
  const challengeRouteLabel = challengeRouteId ? (challengeRoute ? `L${challengeRoute.levelId} ${challengeRoute.levelName}` : `L${challengeRouteId}`) : '';
  const hasChallengeContext = Boolean(selectedChallengeAlias && challengeRouteId);
  const rivalryHeadline =
    sharedRouteComparisons.length === 0
      ? 'Import a rival board that overlaps your cleared routes to unlock direct route-by-route comparisons.'
      : rivalrySummary.trailCount > rivalrySummary.leadCount
        ? `Rivals lead on ${rivalrySummary.trailCount} shared route${rivalrySummary.trailCount === 1 ? '' : 's'}.`
        : rivalrySummary.leadCount > rivalrySummary.trailCount
          ? `You lead on ${rivalrySummary.leadCount} shared route${rivalrySummary.leadCount === 1 ? '' : 's'}.`
          : `The rivalry is even across ${sharedRouteComparisons.length} shared route${sharedRouteComparisons.length === 1 ? '' : 's'}.`;
  const rivalryDetail = rivalrySummary.closestDeficit
    ? `Closest swing target: L${rivalrySummary.closestDeficit.levelId} ${rivalrySummary.closestDeficit.levelName} by ${rivalrySummary.closestDeficit.gap} pts.`
    : rivalrySummary.closestLead
      ? `Smallest cushion: L${rivalrySummary.closestLead.levelId} ${rivalrySummary.closestLead.levelName} by ${Math.abs(rivalrySummary.closestLead.gap)} pts.`
      : 'No score gap yet. Land the first overlapping route to establish a benchmark.';
  const uniqueRivals = new Set(communityRows.map((entry) => entry.playerLabel)).size;
  const localSeasonPoints = buildSeasonPoints(localSeasonRows);
  const communitySeasonPoints = buildSeasonPoints(communitySeasonRows);
  const divisionStatus = getDivisionStatus(localSeasonPoints);
  const seasonDelta = localSeasonPoints - communitySeasonPoints;
  const freshestLocalRun = localRows[0] ?? null;
  const freshestCommunityRun = communityRows[0] ?? null;
  const rivalryMissions = buildRivalMissions(routeOptions, localRows, communityRows);
  const crewStandings = buildCrewStandings(localRows, communityRows);
  const contestedRouteCount = sharedRouteComparisons.length;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 bg-slate-950/84 p-3 text-white font-ui">
      <div className="mx-auto h-full w-full max-w-6xl">
        <div className="pointer-events-auto flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-cyan-300/25 bg-slate-950/90 p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={onReturnToMenu}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <div>
                <div className="atlas-map-label text-[10px] text-cyan-200/80">Infinite Swinger</div>
                <div className="text-lg font-black text-amber-200">Competitive Leaderboard</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={onOpenStory}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-500/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100"
              >
                <Medal size={13} />
                Story
              </button>
              <button
                onClick={onShareBoard}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-500/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100"
              >
                <Link2 size={13} />
                Native share
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2.5 py-1">
                <Trophy size={13} />
                Atlas Frontier L{maxLevelReached}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2.5 py-1">
                <CalendarClock size={13} />
                Local {localRows.length} + Community {communityRows.length}
              </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2.5 py-1">
              <Globe size={13} />
              Competitive compare mode
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2.5 py-1">
              <Clock size={13} />
              {hasPinnedRemoteSource ? syncSourceButtonLabel : 'No live source'}
            </span>
            {hasChallengeContext ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-200/25 bg-rose-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-rose-100">
                <Trophy size={12} />
                Challenge {challengeRouteLabel || `L${challengeRouteId}`}
              </span>
              ) : null}
            </div>
              <div className="mt-2 text-[10px] text-slate-400">
                Exporting a board creates an import link with your strongest benchmark per route, so every crew compares on the same ladder.
              </div>
            </div>

          {hasChallengeContext ? (
            <div className="mt-3 rounded-2xl border border-rose-200/15 bg-rose-500/[0.10] p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-rose-200/80">Incoming Route Challenge</div>
              <div className="mt-1 text-base font-black text-white">
                {selectedChallengeAlias} is challenging you on {challengeRouteLabel}
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-rose-100/80">
                Accept and jump in with a focused compare lane to prove the lane now.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (!challengeRouteId) return;
                    onFocusRoute(challengeRouteId);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200/25 bg-rose-500/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100"
                >
                  <Trophy size={12} />
                  Track challenge route
                </button>
                {challengeRouteId && onAcceptChallenge ? (
                  <button
                    onClick={() => onAcceptChallenge(challengeRouteId)}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-500/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100"
                  >
                    <Play size={12} />
                    Accept and run
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pr-1">
          <div className="mt-3 grid gap-2 xl:grid-cols-[minmax(0,1.08fr),minmax(0,0.92fr)]">
            <div className="rounded-2xl border border-cyan-200/15 bg-slate-900/75 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">Club Board</div>
                  <div className="mt-1 text-base font-black text-white">Share your top {shareEntryCount || 0} route runs</div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70">
                  <Globe size={12} />
                  {hasSharePayload ? 'Ready to send' : 'No share data yet'}
                </span>
              </div>

              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Team alias
              </label>
              <input
                value={boardAlias}
                onChange={(event) => onAliasChange(event.target.value)}
                maxLength={24}
                placeholder="Swinger"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-cyan-300/40"
              />

              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Share link
              </label>
              <div className="mt-1 flex gap-2">
                <textarea
                  value={shareUrl}
                  readOnly
                  rows={2}
                  className="min-h-[3.5rem] flex-1 resize-none rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-[11px] text-white/75 outline-none"
                />
                <button
                  onClick={onCopyBoardLink}
                  disabled={!hasSharePayload}
                  className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-xl border border-cyan-200/25 bg-cyan-500/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Copy size={13} />
                  Copy link
                </button>
              </div>

              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Raw board code
              </label>
              <div className="mt-1 flex gap-2">
                <textarea
                  value={shareCode}
                  readOnly
                  rows={3}
                  className="min-h-[4.5rem] flex-1 resize-none rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-[11px] text-white/75 outline-none"
                />
                <button
                  onClick={onCopyBoardCode}
                  disabled={!hasSharePayload}
                  className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-xl border border-fuchsia-200/25 bg-fuchsia-500/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Copy size={13} />
                  Copy code
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/15 bg-emerald-500/8 px-3 py-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Google Sheets Bridge</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-emerald-50/75">
                    Copy the board as CSV, paste it into Google Sheets, then import either pasted rows or the sheet's public link.
                  </div>
                </div>
                <button
                  onClick={onCopyBoardCsv}
                  disabled={!hasSharePayload}
                  className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-xl border border-emerald-200/25 bg-emerald-500/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Copy size={13} />
                  Copy CSV
                </button>
              </div>

              <div
                className={`mt-3 rounded-xl border p-3 ${
                  hasPinnedRemoteSource
                    ? 'border-sky-200/20 bg-sky-500/10 text-sky-100'
                    : 'border-white/10 bg-white/[0.04] text-white/75'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      Live rivalry feed
                    </div>
                    <div className="mt-1 text-sm font-bold text-white">
                      {hasPinnedRemoteSource ? `Pinned ${sourceKindLabel}` : 'Pin a public sheet to keep the board live'}
                    </div>
                    <div className="mt-1 text-[11px] leading-relaxed text-white/70">
                      {hasPinnedRemoteSource
                        ? 'Fresh rows from the saved source keep merging into the compare board until you replace the link.'
                        : 'Import a public Google Sheet or CSV once to lock the source and turn the leaderboard into a live rivalry feed.'}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/55 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70">
                    <Clock size={12} />
                    {hasPinnedRemoteSource ? syncSourceButtonLabel : 'No source'}
                  </span>
                </div>

                {hasPinnedRemoteSource ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const sourceUrl = leaderboardRemoteSource?.trim();
                        if (!sourceUrl) return;
                        window.open(sourceUrl, '_blank', 'noopener,noreferrer');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/12"
                    >
                      <Link2 size={12} />
                      Open source
                    </button>
                    <button
                      onClick={() => {
                        onRefreshCommunityBoard?.();
                      }}
                      disabled={!canRefreshCommunityBoard}
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-200/25 bg-sky-500/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100 transition-colors disabled:cursor-not-allowed disabled:opacity-45 hover:bg-sky-500/18"
                    >
                      <RotateCcw size={12} />
                      {sourceSyncCooldownMs > 0 ? `Sync in ${Math.ceil(sourceSyncCooldownMs / 1000)}s` : 'Sync now'}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-fuchsia-200/15 bg-slate-900/75 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200/80">Import Rival Board</div>
                  <div className="mt-1 text-base font-black text-white">Merge another crew into your compare view</div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70">
                  <ClipboardPaste size={12} />
                  {communityCount} imported runs
                </span>
              </div>

              <div className="mt-2 text-[10px] leading-relaxed text-white/58">
                Accepts share links, raw board codes, public Google Sheets links, or CSV/TSV rows pasted straight from Sheets.
              </div>

              <textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                rows={6}
                placeholder="Paste a share URL, raw board code, public Google Sheet, or Google Sheets CSV/TSV here."
                className="mt-3 min-h-[8.5rem] w-full resize-none rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-[11px] text-white outline-none transition-colors focus:border-fuchsia-300/40"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    void onImportBoardText(importText);
                    setImportText('');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-200/25 bg-fuchsia-500/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fuchsia-100"
                >
                  <ClipboardPaste size={13} />
                  Import board
                </button>
                <button
                  onClick={() => {
                    void onImportBoardClipboard();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/25 bg-cyan-500/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100"
                >
                  <ClipboardPaste size={13} />
                  Paste clipboard
                </button>
                <button
                  onClick={onClearCommunityBoard}
                  disabled={communityCount === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  Clear imports
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-cyan-200/15 bg-cyan-500/[0.05] p-3">
            <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(0,1.1fr),repeat(3,minmax(0,0.63fr))]">
              <div className="rounded-2xl border border-fuchsia-200/15 bg-fuchsia-500/[0.08] p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-100/80">Head to Head</div>
                <div className="mt-1 text-base font-black text-white">{rivalryHeadline}</div>
                <div className="mt-1 text-[11px] leading-relaxed text-white/68">{rivalryDetail}</div>
              </div>
              <div className="rounded-2xl border border-emerald-200/15 bg-emerald-500/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80">Routes Won</div>
                <div className="mt-1 text-2xl font-black text-white">{rivalrySummary.leadCount}</div>
                <div className="mt-1 text-[10px] text-white/60">Shared routes where your best score is higher.</div>
              </div>
              <div className="rounded-2xl border border-rose-200/15 bg-rose-500/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-rose-100/80">Routes Chasing</div>
                <div className="mt-1 text-2xl font-black text-white">{rivalrySummary.trailCount}</div>
                <div className="mt-1 text-[10px] text-white/60">Shared routes where the imported board still leads.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/70">Dead Heat</div>
                <div className="mt-1 text-2xl font-black text-white">{rivalrySummary.tieCount}</div>
                <div className="mt-1 text-[10px] text-white/60">Routes tied exactly between both boards.</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFocusedLevelId(0)}
                className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                  focusedLevelId === 0
                    ? 'border-emerald-200/25 bg-emerald-500/12 text-emerald-100'
                    : 'border-white/10 bg-white/5 text-white/65 hover:bg-white/10'
                }`}
              >
                All routes
              </button>
              {routeOptions.map((route) => (
                <button
                  key={route.levelId}
                  onClick={() => setFocusedLevelId(route.levelId)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    focusedLevelId === route.levelId
                      ? 'border-cyan-200/25 bg-cyan-500/12 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-white/65 hover:bg-white/10'
                  }`}
                >
                  L{route.levelId} {route.levelName}
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1.05fr),minmax(0,0.95fr)]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-3">
                <div className="atlas-map-label text-[10px] text-cyan-200/80">
                  {focusedRoute ? `Route focus • L${focusedRoute.levelId}` : 'Route focus'}
                </div>
                <div className="mt-1 text-lg font-black text-white">
                  {focusedRoute ? focusedRoute.levelName : 'All imported and local routes'}
                </div>
                <div className="mt-2 text-[11px] leading-relaxed text-slate-300">
                  {focusedGap === null
                    ? focusedCommunityBest
                      ? 'A rival benchmark exists here, but you do not have a matching local run yet.'
                      : 'Filter to a route to compare your line against imported rivals. All routes view stays useful for raw top-score bragging.'
                    : focusedGap > 0
                      ? `You are behind the imported rival by ${focusedGap} points on this route.`
                      : focusedGap < 0
                        ? `You lead the imported rival by ${Math.abs(focusedGap)} points on this route.`
                        : 'You and the imported rival are tied on this route.'}
                </div>
                {focusedRoute ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => onFocusRoute(focusedRoute.levelId)}
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-500/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100"
                    >
                      <Trophy size={12} />
                      Track this route
                    </button>
                    {onShareRouteChallenge ? (
                      <button
                        onClick={() => onShareRouteChallenge(focusedRoute.levelId)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-500/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100"
                      >
                        <Link2 size={12} />
                        Share challenge
                      </button>
                    ) : null}
                    {onCopyRouteChallenge ? (
                      <button
                        onClick={() => onCopyRouteChallenge(focusedRoute.levelId)}
                        className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200/25 bg-fuchsia-500/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100"
                      >
                        <Copy size={12} />
                        Copy challenge
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200/15 bg-emerald-500/10 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80">Your best</div>
                  <div className="mt-1 text-base font-black text-white">{focusedLocalBest ? `${focusedLocalBest.score} pts` : '--'}</div>
                  <div className="mt-1 text-[10px] text-white/65">
                    {focusedLocalBest ? `${focusedLocalBest.tokens} tk • ${focusedLocalBest.livesLeft}L • ${formatDurationMs(focusedLocalBest.elapsedMs)}` : 'No local benchmark yet'}
                  </div>
                </div>
                <div className="rounded-2xl border border-cyan-200/15 bg-cyan-500/10 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/80">Top rival</div>
                  <div className="mt-1 text-base font-black text-white">
                    {focusedCommunityBest ? `${focusedCommunityBest.score} pts` : '--'}
                  </div>
                  <div className="mt-1 text-[10px] text-white/65">
                    {focusedCommunityBest
                      ? `${focusedCommunityBest.playerLabel} • ${focusedCommunityBest.tokens} tk • ${focusedCommunityBest.livesLeft}L`
                      : 'No imported rival yet'}
                  </div>
                </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 xl:grid-cols-[minmax(0,1.05fr),minmax(0,0.95fr)]">
              <div className="rounded-2xl border border-amber-200/15 bg-amber-500/[0.06] p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-100/80">Season Status</div>
                    <div className={`mt-1 text-xl font-black ${divisionStatus.currentDivision.accent}`}>
                      {divisionStatus.currentDivision.title}
                    </div>
                    <div className="mt-1 text-[11px] leading-relaxed text-white/68">
                      {divisionStatus.nextDivision
                        ? `${divisionStatus.nextDivision.threshold - localSeasonPoints} season points to ${divisionStatus.nextDivision.title}.`
                        : 'Top division reached. Keep widening the route lead to stay untouchable.'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-right">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Season points</div>
                    <div className="mt-1 text-2xl font-black text-white">{localSeasonPoints}</div>
                    <div className="mt-1 text-[10px] text-white/55">Best route benchmark only</div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/75">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300 transition-all"
                    style={{ width: `${divisionStatus.progressToNext}%` }}
                  />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Season swing</div>
                    <div className={`mt-1 text-lg font-black ${seasonDelta >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>
                      {seasonDelta >= 0 ? '+' : ''}
                      {seasonDelta}
                    </div>
                    <div className="mt-1 text-[10px] text-white/60">Versus imported board points.</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Contested routes</div>
                    <div className="mt-1 text-lg font-black text-white">{contestedRouteCount}</div>
                    <div className="mt-1 text-[10px] text-white/60">Routes with both local and rival benchmarks.</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Rival crews</div>
                    <div className="mt-1 text-lg font-black text-white">{uniqueRivals}</div>
                    <div className="mt-1 text-[10px] text-white/60">Unique imported aliases in the board.</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">Next Rival Missions</div>
                    <div className="mt-1 text-base font-black text-white">Immediate competitive targets</div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70">
                    <Medal size={12} />
                    {rivalryMissions.length > 0 ? `${rivalryMissions.length} live` : 'Waiting'}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {rivalryMissions.length > 0 ? (
                    rivalryMissions.map((mission) => (
                      <div key={mission.id} className={`rounded-2xl border p-3 ${mission.tone}`}>
                        <div className="text-sm font-black">{mission.title}</div>
                        <div className="mt-1 text-[11px] leading-relaxed text-white/75">{mission.detail}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => onFocusRoute(mission.levelId)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85"
                          >
                            <Trophy size={12} />
                            Jump to route
                          </button>
                          {onShareRouteChallenge ? (
                            <button
                              onClick={() => onShareRouteChallenge(mission.levelId)}
                              className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-500/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100"
                            >
                              <Link2 size={12} />
                              Share mission
                            </button>
                          ) : null}
                          {onCopyRouteChallenge ? (
                            <button
                              onClick={() => onCopyRouteChallenge(mission.levelId)}
                              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200/25 bg-fuchsia-500/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fuchsia-100"
                            >
                              <Copy size={12} />
                              Copy mission
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-[11px] leading-relaxed text-white/65">
                      Import a rival board with overlapping routes to generate chase and defense missions automatically.
                    </div>
                  )}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Latest local push</div>
                    <div className="mt-1 text-sm font-black text-white">
                      {freshestLocalRun ? `${freshestLocalRun.levelName} • ${freshestLocalRun.score} pts` : 'No local run yet'}
                    </div>
                    <div className="mt-1 text-[10px] text-white/60">
                      {freshestLocalRun ? formatRelativeBoardDate(freshestLocalRun.completedAt) : 'Play a route to seed your board.'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Latest rival push</div>
                    <div className="mt-1 text-sm font-black text-white">
                      {freshestCommunityRun
                        ? `${freshestCommunityRun.playerLabel} • ${freshestCommunityRun.levelName}`
                        : 'No imported rival yet'}
                    </div>
                    <div className="mt-1 text-[10px] text-white/60">
                      {freshestCommunityRun
                        ? `${freshestCommunityRun.score} pts • ${formatRelativeBoardDate(freshestCommunityRun.completedAt)}`
                        : 'Paste a board link or raw code to start the rivalry.'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">Crew Standings</div>
                      <div className="mt-1 text-base font-black text-white">Imported crews ranked against your season</div>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70">
                      <Globe size={12} />
                      {crewStandings.length} crews
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {crewStandings.length > 0 ? (
                      crewStandings.map((crew, index) => {
                        const deltaTone =
                          crew.scoreDeltaVsLocal >= 0
                            ? 'border-emerald-200/15 bg-emerald-500/10 text-emerald-100'
                            : 'border-rose-200/15 bg-rose-500/10 text-rose-100';

                        return (
                          <div key={crew.alias} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Crew #{index + 1}</div>
                                <div className="mt-1 text-sm font-black text-white">{crew.alias}</div>
                              </div>
                              <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${deltaTone}`}>
                                {crew.scoreDeltaVsLocal >= 0 ? `You lead by ${crew.scoreDeltaVsLocal}` : `${crew.alias} leads by ${Math.abs(crew.scoreDeltaVsLocal)}`}
                              </div>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-4">
                              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                                <div className="text-[9px] uppercase tracking-[0.16em] text-white/45">Season points</div>
                                <div className="mt-1 text-sm font-black text-white">{crew.seasonPoints}</div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                                <div className="text-[9px] uppercase tracking-[0.16em] text-white/45">Runs / wins</div>
                                <div className="mt-1 text-sm font-black text-white">{crew.totalRuns} / {crew.wins}</div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                                <div className="text-[9px] uppercase tracking-[0.16em] text-white/45">Contested routes</div>
                                <div className="mt-1 text-sm font-black text-white">{crew.contestedRoutes}</div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                                <div className="text-[9px] uppercase tracking-[0.16em] text-white/45">Best score</div>
                                <div className="mt-1 text-sm font-black text-white">{crew.bestScore}</div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/65">
                              <span className="rounded-full border border-emerald-200/15 bg-emerald-500/10 px-2.5 py-1 text-emerald-100">
                                You lead {crew.leadRoutes}
                              </span>
                              <span className="rounded-full border border-rose-200/15 bg-rose-500/10 px-2.5 py-1 text-rose-100">
                                They lead {crew.deficitRoutes}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1">
                                Last push {crew.freshestRunAt ? formatRelativeBoardDate(crew.freshestRunAt) : 'unknown'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-[11px] leading-relaxed text-white/65">
                        Import at least one rival board to rank crews, compare season pressure, and see which alias is pushing your routes hardest.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200/20 bg-slate-900/75 p-2">
              <div className="mb-1 text-xs uppercase tracking-[0.22em] text-emerald-200">Local Runs</div>
              <div className="space-y-1.5">
                {filteredLocalRows.slice(0, 10).map((entry, index) => (
                  <React.Fragment key={`local-${entry.completedAt}-${index}`}>
                    <LeaderboardRow index={index} entry={entry} />
                  </React.Fragment>
                ))}
                {filteredLocalRows.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/8 px-2 py-2 text-[11px] text-white/60">
                    {focusedRoute ? 'Finish this route to populate your local benchmark.' : 'Finish a route to populate local runs.'}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-200/20 bg-slate-900/75 p-2">
              <div className="mb-1 text-xs uppercase tracking-[0.22em] text-cyan-200">Community Import</div>
              <div className="space-y-1.5">
                {filteredCommunityRows.slice(0, 10).map((entry, index) => (
                  <React.Fragment
                    key={`community-${entry.playerLabel}-${entry.completedAt}-${index}`}
                  >
                    <LeaderboardRow index={index} entry={entry} />
                  </React.Fragment>
                ))}
                {filteredCommunityRows.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/8 px-2 py-2 text-[11px] text-white/60">
                    {focusedRoute ? 'No imported rival on this route yet.' : 'No imported board yet. Use Share and send a team link.'}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/20 bg-slate-900/75 p-2">
              <div className="mb-1 text-xs uppercase tracking-[0.22em] text-amber-200">Global Compare</div>
              <div className="space-y-1.5">
                {globalRows.length > 0 ? (
                  globalRows.map((entry, index) => (
                    <React.Fragment
                      key={`combined-${entry.playerLabel}-${entry.completedAt}-${index}`}
                    >
                      <LeaderboardRow index={index} entry={entry} />
                    </React.Fragment>
                  ))
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/8 px-2 py-2 text-[11px] text-white/60">
                    No runs to compare yet.
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
