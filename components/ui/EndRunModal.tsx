import React, { useEffect, useRef } from 'react';
import { ArrowRight, Flag, Globe2, Home, RotateCcw, ShoppingBag, Star, Trophy } from 'lucide-react';

import { GameState, LevelConfig, RunDebrief, RunHistoryEntry, SaveData } from '../../types';
import { formatDurationMs } from '../../engine/uiFormat';
import { SHOP_ITEMS } from '../../gameData';

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

type RecommendationTrendBuckets = {
  all: RecommendationTrendSummary;
  win: RecommendationTrendSummary;
  fail: RecommendationTrendSummary;
};

type CommunityRouteEntry = RunHistoryEntry & {
  playerLabel?: string;
};

type Props = {
  gameState: GameState.GAME_OVER | GameState.LEVEL_COMPLETE;
  score: number;
  distance: number;
  runTokens: number;
  bestScore: number;
  selectedLevelId: number;
  highestUnlockedLevel: number;
  hasNextUnlockedLevel: boolean;
  selectedLevel: LevelConfig;
  saveData: SaveData;
  communityRunHistory: CommunityRouteEntry[];
  worldTimeMs: number;
  playerLives: number;
  causeOfDeath?: string;
  runDebrief: RunDebrief;
  recommendationDiagnostics?: {
    offers: number;
    opens: number;
    purchases: number;
    skips: number;
    acceptanceRate: number;
    avgOpenToBuySeconds: number | null;
    avgOpenDelaySeconds: number | null;
    avgSkipDelaySeconds: number | null;
  };
  recommendationTrend?: {
    current: RecommendationTrendSummary;
    rolling: RecommendationTrendBuckets;
    prior: RecommendationTrendBuckets | null;
    rollingRuns: number;
    priorRuns: number;
    rollingWinRuns: number;
    rollingFailRuns: number;
    priorWinRuns: number;
    priorFailRuns: number;
  };
  computeLevelStars: (level: LevelConfig, timeMs: number, livesRemaining: number) => number;
  onRecommendationPresented?: (itemId: string, levelId: number, levelName: string) => void;
  onRetry: () => void;
  onNextLevel: () => void;
  onOpenLeaderboard: () => void;
  onShareRouteChallenge: () => void;
  onReturnToMenu: () => void;
  onOpenShopForUpgrade?: (itemId: string) => void;
  runCampaignOutcome?: {
    title: string;
    description: string;
    tone: 'emerald' | 'amber' | 'cyan' | 'rose';
  } | null;
  runFeaturedCupOutcome?: {
    title: string;
    description: string;
    tone: 'emerald' | 'amber' | 'cyan' | 'rose';
  } | null;
  newAchievements?: Array<{
    id: string;
    title: string;
    detail: string;
    progress: string;
  }>;
};

const getParTimeMs = (level: LevelConfig) => Math.max(50000, level.targetDistance * 95);

const getDebriefNotes = (
  isVictory: boolean,
  runDebrief: RunDebrief,
  distance: number,
  runTokens: number,
  causeOfDeath?: string,
) => {
  const notes: string[] = [];
  const tokensPer100m = distance > 0 ? Math.round((runTokens / Math.max(distance, 1)) * 100) : 0;

  if (runDebrief.maxComboScore >= 500) {
    notes.push(`${runDebrief.maxComboRank} combo banked at x${runDebrief.maxComboMultiplier.toFixed(1)}. That line is worth repeating.`);
  } else if (runDebrief.maxComboMultiplier >= 2.2) {
    notes.push(`Combo pacing is coming online. Peak multiplier hit x${runDebrief.maxComboMultiplier.toFixed(1)}.`);
  }

  if (runDebrief.redeploys > 0) {
    notes.push(`${runDebrief.redeploys} redeploy${runDebrief.redeploys === 1 ? '' : 's'} used. Safer exits after checkpoints will convert more clears.`);
  } else if (runDebrief.checkpointsSecured > 0) {
    notes.push(`Clean route through ${runDebrief.checkpointsSecured} checkpoint${runDebrief.checkpointsSecured === 1 ? '' : 's'} without a redeploy.`);
  }

  if (!isVictory && runDebrief.hazardHits >= 3) {
    notes.push(`Most of the run bled out to contact damage. Prioritize cleaner hazard reads over speed.`);
  } else if (isVictory && runDebrief.hazardHits === 0) {
    notes.push('No direct hazard hits taken. This was a controlled clear.');
  }

  if (runDebrief.usedSafetyNet) {
    notes.push('Safety Net fired. A little more vertical control would save that charge for later camps.');
  }

  if (tokensPer100m >= 12) {
    notes.push(`Reward routing paid off at ${tokensPer100m} tokens per 100m.`);
  } else if (distance >= 400 && tokensPer100m <= 5) {
    notes.push(`Token rate stayed low at ${tokensPer100m} per 100m. There is room to cut into more reward lanes.`);
  }

  if (!isVictory && causeOfDeath) {
    notes.push(`Final wipeout came from ${causeOfDeath.toLowerCase()}.`);
  }

  if (notes.length === 0) {
    notes.push(isVictory ? 'Route came home clean. Push for a faster clear or richer reward line next run.' : 'Route data captured. The next run should focus on a cleaner opening line.');
  }

  return notes.slice(0, 3);
};

const getRunFocus = ({
  isVictory,
  starCount,
  selectedLevel,
  worldTimeMs,
  playerLives,
  runDebrief,
  previousBestTimeMs,
  previousBestScore,
  score,
  causeOfDeath,
}: {
  isVictory: boolean;
  starCount: number;
  selectedLevel: LevelConfig;
  worldTimeMs: number;
  playerLives: number;
  runDebrief: RunDebrief;
  previousBestTimeMs: number | null;
  previousBestScore: number;
  score: number;
  causeOfDeath?: string;
}) => {
  const currentTimeMs = Math.round(worldTimeMs);
  const parTimeMs = getParTimeMs(selectedLevel);
  const missedParByMs = Math.max(0, currentTimeMs - parTimeMs);
  const timeAheadMs = Math.max(0, parTimeMs - currentTimeMs);
  const routePbImproved =
    isVictory &&
    (previousBestTimeMs === null || currentTimeMs < previousBestTimeMs);
  const routeScoreImproved = score > previousBestScore;

  if (isVictory && starCount === 3) {
    return {
      badge: routePbImproved ? 'Peak Run' : 'Clean Clear',
      body: routePbImproved
        ? `Three stars with a new route record. You cleared par by ${formatDurationMs(timeAheadMs)}.`
        : 'Full stars secured. The next gains are score farming and faster route tempo.',
      title: routeScoreImproved ? 'Route PB and score both moved' : 'This route is fully cleared',
      tone: 'emerald' as const,
    };
  }

  if (isVictory && routePbImproved) {
    return {
      badge: 'Route PB',
      body:
        starCount < 3 && playerLives < 2
          ? 'New route time secured. Preserving one more life is the cleanest path to the missing star.'
          : `New route time secured. Another ${formatDurationMs(missedParByMs)} faster hits the par star.`,
      title: 'The line is working now',
      tone: 'emerald' as const,
    };
  }

  if (isVictory && starCount < 3 && missedParByMs > 0) {
    return {
      badge: 'Time Star',
      body: `You finished ${formatDurationMs(missedParByMs)} off par. Trim a small recovery loop and the next clear should upgrade the route rating.`,
      title: 'Speed is the next unlock',
      tone: 'amber' as const,
    };
  }

  if (isVictory && playerLives < 2) {
    return {
      badge: 'Survival Star',
      body: runDebrief.hazardHits > 0
        ? `You had the pace. Avoid ${Math.max(1, runDebrief.hazardHits)} hazard hit${runDebrief.hazardHits === 1 ? '' : 's'} and this becomes a three-star clear.`
        : 'The route is already fast enough. One cleaner recovery keeps the missing life for the final star.',
      title: 'Preserve more life on the same line',
      tone: 'amber' as const,
    };
  }

  if (!isVictory && runDebrief.redeploys > 0) {
    return {
      badge: 'Checkpoint',
      body: 'You reached a checkpoint, but the exits after redeploy are still unstable. Slow the first swing after reset and rebuild pace there.',
      title: 'The route is partly solved',
      tone: 'amber' as const,
    };
  }

  if (!isVictory && runDebrief.hazardHits >= 3) {
    return {
      badge: 'Hazards',
      body: 'The run is losing too much life to contact damage. Play wider around threat packs before trying to force speed.',
      title: 'Read the hazard lanes earlier',
      tone: 'rose' as const,
    };
  }

  return {
    badge: 'Retry Read',
    body: causeOfDeath
      ? `The wipe came from ${causeOfDeath.toLowerCase()}. Build the next run around a cleaner first miss instead of a riskier opening.`
      : 'The route data is good enough to retry immediately. Focus on a cleaner opener and one fewer bailout.',
    title: 'The next run should be calmer early',
    tone: 'rose' as const,
  };
};

const getUpgradeLevel = (saveData: SaveData, upgradeKey?: keyof SaveData['upgrades']) =>
  upgradeKey ? saveData.upgrades[upgradeKey] ?? 0 : 0;

const formatSignedDelta = (value: number, suffix = '') => {
  if (value === 0) return `Even${suffix}`;
  return `${value > 0 ? '+' : '-'}${Math.abs(value)}${suffix}`;
};

const getDeltaToneClass = (value: number, positiveIsGood = true) => {
  if (value === 0) return 'text-cyan-200';
  const isGood = positiveIsGood ? value > 0 : value < 0;
  return isGood ? 'text-emerald-200' : 'text-rose-200';
};

const getRecommendedUpgrade = ({
  saveData,
  selectedLevel,
  runDebrief,
  runTokens,
  isVictory,
  starCount,
  worldTimeMs,
}: {
  saveData: SaveData;
  selectedLevel: LevelConfig;
  runDebrief: RunDebrief;
  runTokens: number;
  isVictory: boolean;
  starCount: number;
  worldTimeMs: number;
}) => {
  const parTimeMs = getParTimeMs(selectedLevel);
  const missedParByMs = Math.max(0, Math.round(worldTimeMs) - parTimeMs);
  const candidates = SHOP_ITEMS.filter((item) => item.type === 'UPGRADE' && item.upgradeKey);

  const ranked = candidates
    .map((item) => {
      const currentLevel = getUpgradeLevel(saveData, item.upgradeKey);
      if (item.maxLevel && currentLevel >= item.maxLevel) return null;

      const missingParents = (item.parents ?? []).filter((parentId) => {
        const parent = SHOP_ITEMS.find((candidate) => candidate.id === parentId);
        return !parent?.upgradeKey || getUpgradeLevel(saveData, parent.upgradeKey) < 1;
      });

      let score = 0;
      const reasons: string[] = [];

      if (item.upgradeKey === 'hazardResist') {
        if (selectedLevel.biome === 'SWAMP' || selectedLevel.biome === 'VOLCANO') {
          score += 3.5;
          reasons.push('this biome punishes missed hazard reads');
        }
        if (runDebrief.hazardHits >= 2) {
          score += 4 + runDebrief.hazardHits * 0.7;
          reasons.push('this run lost too much health to hazard contact');
        }
      }

      if (item.upgradeKey === 'armor') {
        if (selectedLevel.difficulty >= 5) {
          score += 2.5;
          reasons.push('the route is dense enough to punish single mistakes');
        }
        if (!isVictory && runDebrief.hazardHits >= 3) {
          score += 3;
          reasons.push('one extra hit buffer would extend failed attempts');
        }
      }

      if (item.upgradeKey === 'castRange') {
        if (runDebrief.redeploys > 0 || runDebrief.checkpointsSecured > 0) {
          score += 3.5 + runDebrief.redeploys * 1.2;
          reasons.push('checkpoint exits and late catches still need more reach');
        }
        if (selectedLevel.biome === 'JUNGLE' || selectedLevel.biome === 'SWAMP') {
          score += 1.5;
        }
      }

      if (item.upgradeKey === 'grip') {
        if (runDebrief.redeploys > 0) {
          score += 2.8 + runDebrief.redeploys;
          reasons.push('holding swings longer would stabilize redeploy recoveries');
        }
        if (selectedLevel.biome === 'CAVE') {
          score += 2;
          reasons.push('cave lanes reward a steadier hold');
        }
      }

      if (item.upgradeKey === 'branchMastery') {
        if (runDebrief.checkpointsSecured > 0 && !isVictory) {
          score += 2.8;
          reasons.push('you are reaching checkpoint rhythm but losing branch resets');
        }
      }

      if (item.upgradeKey === 'airControl') {
        if (selectedLevel.allowedWeather.includes('WINDY') || selectedLevel.allowedWeather.includes('FOG')) {
          score += 3.2;
          reasons.push('weather on this route rewards mid-air correction');
        }
        if (runDebrief.usedSafetyNet) {
          score += 1.8;
          reasons.push('a little more air control could preserve the safety net');
        }
      }

      if (item.upgradeKey === 'swingForce') {
        if (selectedLevel.actTemplates.includes('speed')) {
          score += 2.8;
          reasons.push('speed beats want stronger entry momentum');
        }
        if (isVictory && starCount < 3 && missedParByMs > 0) {
          score += 1.6;
          reasons.push('more drive would help trim the missing par time');
        }
      }

      if (item.upgradeKey === 'launchBoost') {
        if (selectedLevel.actTemplates.includes('speed') || selectedLevel.actTemplates.includes('finale')) {
          score += 3.4;
          reasons.push('the route asks for cleaner release speed');
        }
        if (isVictory && starCount < 3 && missedParByMs > 0) {
          score += 2.2;
          reasons.push('release speed is the cleanest path to the next star');
        }
      }

      if (item.upgradeKey === 'magnetism') {
        if (selectedLevel.actTemplates.includes('reward')) {
          score += 3;
          reasons.push('the route has reward lanes worth converting');
        }
        if (runTokens <= Math.max(6, Math.round(selectedLevel.targetDistance / 120))) {
          score += 1.8;
          reasons.push('token payout stayed lower than the route should allow');
        }
      }

      if (item.upgradeKey === 'luck') {
        if (selectedLevel.actTemplates.includes('reward') && getUpgradeLevel(saveData, 'magnetism') > 0) {
          score += 1.8;
          reasons.push('the token route is ready for stronger spikes');
        }
      }

      if (item.upgradeKey === 'safetyNet') {
        if (!isVictory && selectedLevel.difficulty >= 6) {
          score += 1.6;
          reasons.push('late-route failures would benefit from a rescue buffer');
        }
      }

      if (item.upgradeKey === 'ropeLength') {
        if (currentLevel === 0) {
          score += 1.2;
          reasons.push('a base rope upgrade still improves overall consistency');
        }
      }

      if (item.upgradeKey === 'feverDuration') {
        if (!isVictory && selectedLevel.actTemplates.includes('hazard')) {
          score += 1.6;
          reasons.push('focus time helps read denser threat packs');
        }
      }

      if (score <= 0) return null;

      return {
        item,
        currentLevel,
        missingParents,
        reason: reasons[0] ?? item.description,
        score: score - currentLevel * 0.35 - item.cost / 240,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => b.score - a.score || a.item.cost - b.item.cost);

  if (ranked.length === 0) return null;

  const topPick = ranked[0];
  const isAffordable = saveData.totalTokens >= topPick.item.cost;
  const parentNames = topPick.missingParents
    .map((parentId) => SHOP_ITEMS.find((candidate) => candidate.id === parentId)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    ...topPick,
    isAffordable,
    tokensShort: Math.max(0, topPick.item.cost - saveData.totalTokens),
    parentNames,
  };
};

const sortBoardRows = (left: RunHistoryEntry, right: RunHistoryEntry) => {
  const scoreDiff = right.score - left.score;
  if (scoreDiff !== 0) return scoreDiff;
  const tokenDiff = right.tokens - left.tokens;
  if (tokenDiff !== 0) return tokenDiff;
  const lifeDiff = right.livesLeft - left.livesLeft;
  if (lifeDiff !== 0) return lifeDiff;

  const rightTime = Date.parse(right.completedAt);
  const leftTime = Date.parse(left.completedAt);
  if (Number.isFinite(rightTime) && Number.isFinite(leftTime)) {
    return rightTime - leftTime;
  }

  return 0;
};

const getRunEntryKey = (entry: RunHistoryEntry) =>
  `${entry.levelId}|${entry.score}|${entry.elapsedMs}|${entry.tokens}|${entry.livesLeft}|${entry.completedAt}`;

const buildMergedRouteRuns = (savedRuns: RunHistoryEntry[], currentRun: RunHistoryEntry, levelId: number) => {
  const routeRuns = savedRuns
    .filter((entry) => entry.levelId === levelId)
    .sort(sortBoardRows);
  const currentRunKey = getRunEntryKey(currentRun);
  const currentRunIndex = routeRuns.findIndex((entry) => getRunEntryKey(entry) === currentRunKey);
  const priorRouteRuns =
    currentRunIndex >= 0
      ? routeRuns.filter((_, index) => index !== currentRunIndex)
      : routeRuns;
  const mergedRouteRuns = [...priorRouteRuns, currentRun]
    .reduce<Map<string, RunHistoryEntry>>((bucket, entry) => {
      bucket.set(getRunEntryKey(entry), entry);
      return bucket;
    }, new Map())
    .values();

  return {
    priorRouteRuns: [...priorRouteRuns].sort(sortBoardRows),
    mergedRouteRuns: [...mergedRouteRuns].sort(sortBoardRows),
  };
};

const formatPlacement = (rank: number | null) => (rank ? `#${rank}` : '--');

const describeRouteMomentum = ({
  currentScore,
  priorLocalBest,
  rivalBest,
}: {
  currentScore: number;
  priorLocalBest: RunHistoryEntry | null;
  rivalBest: CommunityRouteEntry | null;
}) => {
  if (!rivalBest) {
    if (!priorLocalBest) {
      return {
        title: 'First route benchmark posted',
        detail: 'You now own the first tracked score for this route. Share the board to turn it into a live rivalry.',
        tone: 'emerald' as const,
      };
    }

    if (currentScore > priorLocalBest.score) {
      return {
        title: 'Local route benchmark improved',
        detail: `You pushed your route best up by ${currentScore - priorLocalBest.score} points. Import a rival board to turn that pace into a contested lane.`,
        tone: 'emerald' as const,
      };
    }

    return {
      title: 'Local benchmark held',
      detail: 'This run reinforces your own route history. A cleaner clear is still needed to raise the local marker.',
      tone: 'cyan' as const,
    };
  }

  const previousGap = rivalBest.score - (priorLocalBest?.score ?? 0);
  const currentGap = rivalBest.score - currentScore;

  if (!priorLocalBest) {
    if (currentGap < 0) {
      return {
        title: 'Route lead stolen immediately',
        detail: `Your first tracked score beats ${rivalBest.playerLabel ?? 'the rival'} by ${Math.abs(currentGap)} points.`,
        tone: 'emerald' as const,
      };
    }

    if (currentGap === 0) {
      return {
        title: 'Route benchmark matched',
        detail: `You landed exactly on ${rivalBest.playerLabel ?? 'the rival'}'s route score. One cleaner line takes the lead.`,
        tone: 'amber' as const,
      };
    }

    return {
      title: 'Rival board opened',
      detail: `You posted the first local answer and now trail by ${currentGap} points. This route is live.`,
      tone: 'amber' as const,
    };
  }

  if (currentGap < 0 && previousGap >= 0) {
    return {
      title: 'Route lead stolen',
      detail: `This run flipped the lane and now puts you ${Math.abs(currentGap)} points ahead of ${rivalBest.playerLabel ?? 'the rival'}.`,
      tone: 'emerald' as const,
    };
  }

  if (currentGap === 0 && previousGap !== 0) {
    return {
      title: 'Route is tied now',
      detail: `You erased the full gap and matched ${rivalBest.playerLabel ?? 'the rival'} exactly. The next clear decides the lane.`,
      tone: 'amber' as const,
    };
  }

  if (currentGap > 0 && currentGap < previousGap) {
    return {
      title: 'Gap closed',
      detail: `You shaved ${previousGap - currentGap} points off the deficit. ${currentGap} still separates the route lead.`,
      tone: 'amber' as const,
    };
  }

  if (currentGap < 0 && previousGap < 0 && Math.abs(currentGap) > Math.abs(previousGap)) {
    return {
      title: 'Lead extended',
      detail: `You widened the route lead by ${Math.abs(currentGap) - Math.abs(previousGap)} points and kept control of the lane.`,
      tone: 'emerald' as const,
    };
  }

  if (currentGap > previousGap) {
    return {
      title: 'Ground lost on this lane',
      detail: `The rival benchmark is now ${currentGap} points ahead. A steadier run is needed to stop the slide.`,
      tone: 'rose' as const,
    };
  }

  return {
    title: currentGap < 0 ? 'Route lead defended' : 'Rival gap unchanged',
    detail:
      currentGap < 0
        ? `You remain ${Math.abs(currentGap)} points ahead of ${rivalBest.playerLabel ?? 'the rival'} on this route.`
        : `The deficit holds at ${currentGap} points. The next upgrade should target this lane directly.`,
    tone: currentGap < 0 ? 'emerald' as const : 'cyan' as const,
  };
};

export function EndRunModal({
  gameState,
  score,
  distance,
  runTokens,
  bestScore,
  selectedLevelId,
  highestUnlockedLevel,
  hasNextUnlockedLevel,
  selectedLevel,
  saveData,
  communityRunHistory,
  worldTimeMs,
  playerLives,
  causeOfDeath,
  runDebrief,
  recommendationDiagnostics,
  recommendationTrend,
  onRecommendationPresented,
  runCampaignOutcome,
  runFeaturedCupOutcome,
  computeLevelStars,
  onRetry,
  onNextLevel,
  onOpenLeaderboard,
  onShareRouteChallenge,
  onReturnToMenu,
  onOpenShopForUpgrade,
  newAchievements = [],
}: Props) {
  const isVictory = gameState === GameState.LEVEL_COMPLETE;
  const starCount = isVictory ? computeLevelStars(selectedLevel, Math.round(worldTimeMs), playerLives) : 0;
  const tokensPer100m = distance > 0 ? Math.round((runTokens / Math.max(distance, 1)) * 100) : 0;
  const debriefNotes = getDebriefNotes(isVictory, runDebrief, distance, runTokens, causeOfDeath);
  const previousLevelResult = saveData.levelResults[String(selectedLevelId)];
  const previousBestTimeMs = previousLevelResult?.bestTimeMs ?? null;
  const previousBestScore = previousLevelResult?.bestScore ?? 0;
  const routeBestScore = Math.max(previousBestScore, score);
  const routePbImproved = isVictory && (previousBestTimeMs === null || Math.round(worldTimeMs) < previousBestTimeMs);
  const routeScoreImproved = score > previousBestScore;
  const currentRunEntry: RunHistoryEntry = {
    score,
    levelId: selectedLevelId,
    levelName: selectedLevel.name,
    isWin: isVictory,
    elapsedMs: Math.round(worldTimeMs),
    tokens: runTokens,
    livesLeft: playerLives,
    completedAt: new Date().toISOString(),
  };
  const { priorRouteRuns, mergedRouteRuns: localRouteRuns } = buildMergedRouteRuns(
    saveData.runHistory,
    currentRunEntry,
    selectedLevelId,
  );
  const communityRouteRuns = [...communityRunHistory]
    .filter((entry) => entry.levelId === selectedLevelId)
    .sort(sortBoardRows);
  const localPlacementIndex = localRouteRuns.findIndex(
    (entry) =>
      entry.score === currentRunEntry.score &&
      entry.elapsedMs === currentRunEntry.elapsedMs &&
      entry.tokens === currentRunEntry.tokens &&
      entry.livesLeft === currentRunEntry.livesLeft,
  );
  const localPlacement = localPlacementIndex >= 0 ? localPlacementIndex + 1 : null;
  const rivalBest = communityRouteRuns[0] ?? null;
  const rivalGap = rivalBest ? rivalBest.score - score : null;
  const rivalTimeDeltaMs = rivalBest ? Math.round(worldTimeMs) - rivalBest.elapsedMs : null;
  const rivalTokenDelta = rivalBest ? runTokens - rivalBest.tokens : null;
  const rivalLifeDelta = rivalBest ? playerLives - rivalBest.livesLeft : null;
  const priorLocalBest = priorRouteRuns[0] ?? null;
  const routeMomentum = describeRouteMomentum({
    currentScore: score,
    priorLocalBest,
    rivalBest,
  });
  const parTimeMs = getParTimeMs(selectedLevel);
  const runFocus = getRunFocus({
    causeOfDeath,
    isVictory,
    playerLives,
    previousBestScore,
    previousBestTimeMs,
    runDebrief,
    score,
    selectedLevel,
    starCount,
    worldTimeMs,
  });
  const recommendedUpgrade = getRecommendedUpgrade({
    isVictory,
    runDebrief,
    runTokens,
    saveData,
    selectedLevel,
    starCount,
    worldTimeMs,
  });
  const reportedRecommendationItemId = useRef<string | null>(null);
  useEffect(() => {
    if (!onRecommendationPresented) return;
    if (!recommendedUpgrade) {
      reportedRecommendationItemId.current = null;
      return;
    }
    if (reportedRecommendationItemId.current === recommendedUpgrade.item.id) return;
    reportedRecommendationItemId.current = recommendedUpgrade.item.id;
    onRecommendationPresented(recommendedUpgrade.item.id, selectedLevel.id, selectedLevel.name);
  }, [onRecommendationPresented, recommendedUpgrade, selectedLevel.id, selectedLevel.name]);
  const RecommendedIcon = recommendedUpgrade?.item.icon;
  const handleOpenShopForUpgrade = () => {
    if (!recommendedUpgrade || !onOpenShopForUpgrade) return;
    onOpenShopForUpgrade(recommendedUpgrade.item.id);
  };
  const getTrendDeltaText = (current: number | null, prior: number | null) => {
    if (current === null || prior === null) return 'Track more runs to compare';
    const delta = current - prior;
    if (delta > 0) return `+${delta}% better vs prior window`;
    if (delta < 0) return `${delta}% below prior window`;
    return 'Flat vs prior window';
  };
  const formatTrendSummaryRuns = (label: string, summary: RecommendationTrendSummary | null) =>
    `${label}${summary ? ` (${summary.runSamples})` : ' (0)'}`;
  const campaignOutcomeTone = runCampaignOutcome
    ? runCampaignOutcome.tone === 'emerald'
      ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100'
      : runCampaignOutcome.tone === 'amber'
      ? 'border-amber-200/20 bg-amber-500/10 text-amber-100'
      : runCampaignOutcome.tone === 'cyan'
      ? 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100'
      : 'border-rose-200/20 bg-rose-500/10 text-rose-100'
    : '';
  const featuredCupOutcomeTone = runFeaturedCupOutcome
    ? runFeaturedCupOutcome.tone === 'emerald'
      ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100'
      : runFeaturedCupOutcome.tone === 'amber'
      ? 'border-amber-200/20 bg-amber-500/10 text-amber-100'
      : runFeaturedCupOutcome.tone === 'cyan'
      ? 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100'
      : 'border-rose-200/20 bg-rose-500/10 text-rose-100'
    : '';

  return (
    <div data-ui-control className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/82 px-4 py-4 backdrop-blur-sm sm:items-center">
      <div className={`atlas-surface-strong relative my-auto flex h-[calc(100svh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] p-5 text-white md:p-7 ${isVictory ? 'shadow-2xl shadow-emerald-950/40' : 'shadow-2xl shadow-black/40'}`}>
        <div
          className={`absolute inset-x-0 top-0 h-36 ${
            isVictory
              ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(74,222,128,0.28),transparent_54%),linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]'
              : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent)]'
          }`}
        />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className={`atlas-map-label text-xs ${isVictory ? 'text-emerald-200/70' : 'text-rose-200/70'}`}>
                {isVictory ? 'Route Secured' : 'Route Failed'}
              </div>
              <h2 className={`atlas-title mt-2 text-4xl md:text-5xl ${isVictory ? 'text-emerald-200' : 'text-rose-200'}`}>
                {isVictory ? 'LEVEL COMPLETE' : 'WIPEOUT'}
              </h2>
              <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] ${isVictory ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100' : 'border-rose-200/20 bg-rose-500/10 text-rose-100'}`}>
                {isVictory ? `${starCount} star finish` : 'Try again'}
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Camp</div>
              <div className="mt-1 text-lg font-black text-white">{selectedLevel.name}</div>
            </div>
          </div>

          {isVictory ? (
            <div className="mt-5 rounded-[1.3rem] border border-emerald-200/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Expedition reward secured. Route {selectedLevelId} is open and the next camp can be targeted from the atlas.
            </div>
          ) : null}

          <div className="mt-4 text-base text-slate-300 md:text-lg">
            {selectedLevel.description}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="atlas-surface-soft rounded-2xl p-4">
                <div className="atlas-map-label text-xs text-slate-400">Score</div>
                <div className="mt-2 text-3xl font-black text-amber-200">{score}</div>
              </div>
              <div className="atlas-surface-soft rounded-2xl p-4">
                <div className="atlas-map-label text-xs text-slate-400">Distance</div>
                <div className="mt-2 text-3xl font-black text-sky-200">{distance}m</div>
              </div>
              <div className="atlas-surface-soft rounded-2xl p-4">
                <div className="atlas-map-label text-xs text-slate-400">Banked</div>
                <div className="mt-2 text-3xl font-black text-emerald-300">{runTokens}</div>
              </div>
              <div className="atlas-surface-soft rounded-2xl p-4">
                <div className="atlas-map-label text-xs text-slate-400">Route Record</div>
                <div className="mt-2 text-3xl font-black text-white">{routeBestScore}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {routeScoreImproved ? `+${score - previousBestScore} this run` : `Global best ${bestScore}`}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr),280px]">
              <div className="atlas-surface-soft rounded-2xl p-4">
                <div className="atlas-map-label text-xs text-slate-400">Route Rating</div>
                <div className="mt-3 flex items-center gap-2 text-amber-200">
                {[0, 1, 2].map((index) => (
                  <Star key={index} size={32} fill={index < starCount ? 'currentColor' : 'none'} />
                ))}
              </div>
              <div className="mt-3 text-sm text-slate-300">
                Best route time:{' '}
                <span className="font-bold text-cyan-200">
                  {formatDurationMs(previousBestTimeMs ?? (isVictory ? Math.round(worldTimeMs) : null))}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Par time:{' '}
                <span className="font-bold text-emerald-200">{formatDurationMs(parTimeMs)}</span>
                {isVictory ? (
                  <span className="ml-2 text-xs text-slate-400">
                    {Math.round(worldTimeMs) <= parTimeMs
                      ? `${formatDurationMs(parTimeMs - Math.round(worldTimeMs))} ahead`
                      : `${formatDurationMs(Math.round(worldTimeMs) - parTimeMs)} behind`}
                  </span>
                ) : null}
              </div>
              {isVictory && selectedLevelId < highestUnlockedLevel && (
                <div className="mt-3 text-sm text-emerald-200">
                  Next route unlocked: Level {selectedLevelId + 1}.
                </div>
              )}
              {routePbImproved && (
                <div className="mt-3 text-sm text-emerald-200">
                  New route best set on this clear.
                </div>
              )}
              {runCampaignOutcome ? (
                <div className={`mt-3 rounded-2xl border ${campaignOutcomeTone} px-3 py-3`}>
                  <div className="text-[9px] uppercase tracking-[0.22em]">Campaign Quest</div>
                  <div className="mt-2 text-sm font-black">{runCampaignOutcome.title}</div>
                  <div className="mt-1 text-sm leading-relaxed opacity-90">{runCampaignOutcome.description}</div>
                </div>
              ) : null}
              {runFeaturedCupOutcome ? (
                <div className={`mt-3 rounded-2xl border ${featuredCupOutcomeTone} px-3 py-3`}>
                  <div className="text-[9px] uppercase tracking-[0.22em]">Daily Route Cup</div>
                  <div className="mt-2 text-sm font-black">{runFeaturedCupOutcome.title}</div>
                  <div className="mt-1 text-sm leading-relaxed opacity-90">{runFeaturedCupOutcome.description}</div>
                </div>
              ) : null}
              {newAchievements.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-amber-200/20 bg-amber-500/10 px-3 py-3 text-amber-100">
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]">
                    <Trophy size={12} />
                    Achievement Unlock{newAchievements.length === 1 ? '' : 's'}
                  </div>
                  <div className="mt-3 space-y-2">
                    {newAchievements.map((achievement) => (
                      <div key={achievement.id} className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                        <div className="text-sm font-black text-white">{achievement.title}</div>
                        <div className="mt-1 text-xs leading-relaxed text-slate-200">{achievement.detail}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-amber-100/80">{achievement.progress}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {!isVictory && causeOfDeath && (
                <div className="mt-3 text-sm text-rose-100">
                  Cause of wipeout: {causeOfDeath}
                </div>
              )}
            </div>

            <div className="atlas-surface-soft rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="atlas-map-label text-xs text-slate-400">Next Move</div>
                  <div className="mt-2 text-lg font-black text-white">{runFocus.title}</div>
                </div>
                <div
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${
                    runFocus.tone === 'emerald'
                      ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100'
                      : runFocus.tone === 'amber'
                      ? 'border-amber-200/20 bg-amber-500/10 text-amber-100'
                      : 'border-rose-200/20 bg-rose-500/10 text-rose-100'
                  }`}
                >
                  {runFocus.badge}
                </div>
              </div>
              <div className="mt-3 text-sm leading-relaxed text-slate-200">
                {runFocus.body}
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-200/12 bg-slate-950/45 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="atlas-map-label text-[10px] text-slate-500">Competitive Readout</div>
                    <div
                      className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
                        routeMomentum.tone === 'emerald'
                          ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100'
                          : routeMomentum.tone === 'amber'
                          ? 'border-amber-200/20 bg-amber-500/10 text-amber-100'
                          : routeMomentum.tone === 'rose'
                          ? 'border-rose-200/20 bg-rose-500/10 text-rose-100'
                          : 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100'
                      }`}
                    >
                      {routeMomentum.title}
                    </div>
                    <div className="mt-1 text-sm font-black text-white">
                      {rivalBest
                        ? rivalGap === null
                          ? 'Imported rival available for this route.'
                          : rivalGap > 0
                          ? `${rivalGap} points behind ${rivalBest.playerLabel || 'the imported rival'} on this route.`
                          : rivalGap < 0
                          ? `${Math.abs(rivalGap)} points ahead of ${rivalBest.playerLabel || 'the imported rival'} on this route.`
                          : `Tied with ${rivalBest.playerLabel || 'the imported rival'} on this route.`
                        : localPlacement
                        ? `Local route placement ${localPlacement}/${localRouteRuns.length}.`
                        : 'Finish another run or import a board to establish a route benchmark.'}
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-slate-300">{routeMomentum.detail}</div>
                  </div>
                  <button
                    onClick={onOpenLeaderboard}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-500/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100 transition-transform hover:-translate-y-0.5"
                  >
                    <Trophy size={13} />
                    Board
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-2.5">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Local Rank</div>
                    <div className="mt-1 text-xl font-black text-emerald-200">{formatPlacement(localPlacement)}</div>
                    <div className="text-[10px] text-slate-400">{localRouteRuns.length} tracked route runs</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-2.5">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Top Rival</div>
                    <div className="mt-1 text-xl font-black text-cyan-200">{rivalBest ? rivalBest.score : '--'}</div>
                    <div className="text-[10px] text-slate-400">{rivalBest ? rivalBest.playerLabel || 'Imported board' : 'Import a board'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-2.5">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Rival Gap</div>
                    <div className={`mt-1 text-xl font-black ${rivalGap === null ? 'text-slate-200' : rivalGap > 0 ? 'text-amber-200' : rivalGap < 0 ? 'text-emerald-200' : 'text-cyan-200'}`}>
                      {rivalGap === null ? '--' : rivalGap === 0 ? 'Tied' : `${rivalGap > 0 ? '-' : '+'}${Math.abs(rivalGap)}`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {rivalGap === null ? 'No imported rival yet' : 'vs best imported route score'}
                    </div>
                  </div>
                </div>
                {rivalBest ? (
                  <>
                    <div className="mt-2 grid gap-2 sm:grid-cols-4">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-2.5">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Score split</div>
                        <div className={`mt-1 text-xl font-black ${getDeltaToneClass(-(rivalGap ?? 0))}`}>
                          {formatSignedDelta(-(rivalGap ?? 0))}
                        </div>
                        <div className="text-[10px] text-slate-400">Against imported route score</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-2.5">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Pace split</div>
                        <div className={`mt-1 text-xl font-black ${getDeltaToneClass(rivalTimeDeltaMs ?? 0, false)}`}>
                          {rivalTimeDeltaMs === null ? '--' : formatSignedDelta(Math.round((rivalTimeDeltaMs ?? 0) / 1000), 's')}
                        </div>
                        <div className="text-[10px] text-slate-400">Negative is faster than rival</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-2.5">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Token split</div>
                        <div className={`mt-1 text-xl font-black ${getDeltaToneClass(rivalTokenDelta ?? 0)}`}>
                          {rivalTokenDelta === null ? '--' : formatSignedDelta(rivalTokenDelta, ' tk')}
                        </div>
                        <div className="text-[10px] text-slate-400">Reward lane edge versus rival</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-2.5">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Life split</div>
                        <div className={`mt-1 text-xl font-black ${getDeltaToneClass(rivalLifeDelta ?? 0)}`}>
                          {rivalLifeDelta === null ? '--' : formatSignedDelta(rivalLifeDelta, 'L')}
                        </div>
                        <div className="text-[10px] text-slate-400">Positive means cleaner survival</div>
                      </div>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/65">
                      <Globe2 size={12} />
                      Rival pace {formatDurationMs(rivalBest.elapsedMs)} • {rivalBest.tokens} tk • {rivalBest.livesLeft}L
                    </div>
                  </>
                ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr),320px]">
              <div className="atlas-surface-soft rounded-2xl p-4">
                <div className="atlas-map-label text-xs text-slate-400">Run Debrief</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Peak Speed</div>
                    <div className="mt-2 text-2xl font-black text-cyan-200">{runDebrief.peakSpeed.toFixed(1)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Combo Peak</div>
                    <div className="mt-2 text-2xl font-black text-amber-200">x{runDebrief.maxComboMultiplier.toFixed(1)}</div>
                    <div className="text-xs text-slate-400">{runDebrief.maxComboRank}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Redeploys</div>
                    <div className="mt-2 text-2xl font-black text-emerald-200">{runDebrief.redeploys}</div>
                    <div className="text-xs text-slate-400">{runDebrief.checkpointsSecured} checkpoints secured</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Token Pace</div>
                    <div className="mt-2 text-2xl font-black text-fuchsia-200">{tokensPer100m}</div>
                    <div className="text-xs text-slate-400">per 100m</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Hazard Hits</div>
                    <div className="mt-2 text-2xl font-black text-rose-200">{runDebrief.hazardHits}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Jumps Used</div>
                    <div className="mt-2 text-2xl font-black text-violet-200">{runDebrief.jumpsUsed}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Safety Net</div>
                    <div className={`mt-2 text-2xl font-black ${runDebrief.usedSafetyNet ? 'text-lime-200' : 'text-slate-200'}`}>
                      {runDebrief.usedSafetyNet ? 'Spent' : 'Held'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="atlas-surface-soft rounded-2xl p-4">
                  <div className="atlas-map-label text-xs text-slate-400">Coach Notes</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    {debriefNotes.map((note) => (
                      <div key={note} className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                        {note}
                      </div>
                    ))}
                  </div>
                </div>

                {recommendedUpgrade ? (
                  <div className="atlas-surface-soft rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="atlas-map-label text-xs text-slate-400">Camp Upgrade</div>
                        <div className="mt-2 text-lg font-black text-white">{recommendedUpgrade.item.name}</div>
                      </div>
                      <div
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${
                          recommendedUpgrade.missingParents.length > 0
                            ? 'border-rose-200/20 bg-rose-500/10 text-rose-100'
                            : recommendedUpgrade.isAffordable
                            ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100'
                            : 'border-amber-200/20 bg-amber-500/10 text-amber-100'
                        }`}
                      >
                        {recommendedUpgrade.missingParents.length > 0
                          ? 'Locked'
                          : recommendedUpgrade.isAffordable
                          ? 'Buy Now'
                          : `Save ${recommendedUpgrade.tokensShort}`}
                      </div>
                    </div>

                    <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                      {RecommendedIcon ? (
                        <div className="rounded-2xl border border-cyan-200/15 bg-cyan-500/10 p-2 text-cyan-100">
                          <RecommendedIcon size={18} />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm leading-relaxed text-slate-200">
                          {recommendedUpgrade.reason.charAt(0).toUpperCase() + recommendedUpgrade.reason.slice(1)}.
                        </div>
                        <div className="mt-2 text-xs leading-relaxed text-slate-400">
                          {recommendedUpgrade.item.synergyText ?? recommendedUpgrade.item.description}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2.5">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Cost</div>
                        <div className="mt-1 text-base font-black text-amber-200">{recommendedUpgrade.item.cost}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2.5">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Owned</div>
                        <div className="mt-1 text-base font-black text-cyan-200">Lv {recommendedUpgrade.currentLevel}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2.5">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Wallet</div>
                        <div className="mt-1 text-base font-black text-emerald-200">{saveData.totalTokens}</div>
                      </div>
                    </div>

                    {recommendedUpgrade.parentNames.length > 0 ? (
                      <div className="mt-3 rounded-2xl border border-rose-200/12 bg-rose-500/8 px-3 py-2.5 text-sm text-rose-100">
                        Unlock path first: {recommendedUpgrade.parentNames.join(' + ')}.
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2.5 text-sm text-slate-300">
                        {recommendedUpgrade.isAffordable
                          ? 'This is the cleanest immediate buy from the run you just had.'
                          : `One more run at this payout pace can close the remaining ${recommendedUpgrade.tokensShort} tokens.`}
                      </div>
                    )}

                    {onOpenShopForUpgrade ? (
                      <button
                        onClick={handleOpenShopForUpgrade}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-emerald-500/15 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5"
                      >
                        <ShoppingBag size={16} />
                        Open in Market
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {recommendationDiagnostics && recommendationDiagnostics.offers > 0 ? (
                  <div className="atlas-surface-soft rounded-2xl p-4">
                    <div className="atlas-map-label text-xs text-slate-400">Run Coach Signal</div>
                    <div className="mt-2 text-lg font-black text-white">Recommendation conversion</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Open Rate</div>
                        <div className="mt-1 text-base font-black text-emerald-200">
                          {recommendationDiagnostics.offers === 0
                            ? '0%'
                            : `${Math.round((recommendationDiagnostics.opens / recommendationDiagnostics.offers) * 100)}%`}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Buy Rate</div>
                        <div className="mt-1 text-base font-black text-amber-200">
                          {recommendationDiagnostics.acceptanceRate}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2.5 text-xs text-slate-300">
                      {recommendationDiagnostics.avgOpenDelaySeconds === null
                        ? 'Open latency is tracked from recommendation to first market view.'
                        : `Avg open latency: ${recommendationDiagnostics.avgOpenDelaySeconds}s`}
                    </div>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2.5 text-xs text-slate-300">
                      {recommendationDiagnostics.avgOpenToBuySeconds === null
                        ? 'Open-to-buy latency tracks purchases from market open.'
                        : `Avg open-to-buy time: ${recommendationDiagnostics.avgOpenToBuySeconds}s`}
                    </div>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2.5 text-xs text-slate-300">
                      {recommendationDiagnostics.avgSkipDelaySeconds === null
                        ? 'Skip latency tracks time from recommendation to close/action skip.'
                        : `Avg skip latency: ${recommendationDiagnostics.avgSkipDelaySeconds}s`}
                    </div>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2.5 text-xs text-slate-300">
                      {`Recent skip pool: ${recommendationDiagnostics.skips} / ${recommendationDiagnostics.offers} recommendations`}
                    </div>
                    {recommendationTrend ? (
                      <div className="mt-4 space-y-2">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                          7-Run Rolling Trend
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2 text-center">
                          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                            Overall and outcome-split sample sizes
                          </div>
                          <div className="mt-1 grid grid-cols-2 gap-2 text-center">
                            <div>
                              <div className="text-xs uppercase tracking-[0.14em] text-amber-200/80">
                                {formatTrendSummaryRuns('Overall', recommendationTrend.rolling.all)}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-amber-200/90">Open</div>
                              <div className="text-sm font-black text-amber-100">
                                {recommendationTrend.rolling.all.openRatePercent === null
                                  ? '—'
                                  : `${recommendationTrend.rolling.all.openRatePercent}%`}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.14em] text-emerald-200/90">
                                {formatTrendSummaryRuns('Buy', recommendationTrend.rolling.all)}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-emerald-200/90">Buy</div>
                              <div className="text-sm font-black text-emerald-100">
                                {recommendationTrend.rolling.all.buyRatePercent === null
                                  ? '—'
                                  : `${recommendationTrend.rolling.all.buyRatePercent}%`}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2 text-center">
                            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                              {formatTrendSummaryRuns('Wins', recommendationTrend.rolling.win)}
                            </div>
                            <div className="mt-1 text-xs text-emerald-200">Open {recommendationTrend.rolling.win.openRatePercent ?? '—'}%</div>
                            <div className="text-xs text-emerald-200">Buy {recommendationTrend.rolling.win.buyRatePercent ?? '—'}%</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2 text-center">
                            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                              {formatTrendSummaryRuns('Fails', recommendationTrend.rolling.fail)}
                            </div>
                            <div className="mt-1 text-xs text-amber-200">Open {recommendationTrend.rolling.fail.openRatePercent ?? '—'}%</div>
                            <div className="text-xs text-amber-200">Buy {recommendationTrend.rolling.fail.buyRatePercent ?? '—'}%</div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-xs text-slate-300">
                          <div>
                            {`Current run: open ${recommendationTrend.current.openRatePercent ?? 0}% | buy ${recommendationTrend.current.buyRatePercent ?? 0}%`}
                          </div>
                          <div>
                            {recommendationTrend.priorRuns > 0
                              ? `Open trend: ${getTrendDeltaText(
                                  recommendationTrend.rolling.all.openRatePercent,
                                  recommendationTrend.prior?.all.openRatePercent ?? null,
                                )}`
                              : 'Need two full windows for open-rate trend'}
                          </div>
                          <div>
                            {recommendationTrend.priorRuns > 0
                              ? `Buy trend: ${getTrendDeltaText(
                                  recommendationTrend.rolling.all.buyRatePercent,
                                  recommendationTrend.prior?.all.buyRatePercent ?? null,
                                )}`
                              : 'Need two full windows for buy-rate trend'}
                          </div>
                          {recommendationTrend.priorWinRuns > 0 ? (
                            <div>
                              {`Wins trend: ${getTrendDeltaText(
                                recommendationTrend.rolling.win.openRatePercent,
                                recommendationTrend.prior?.win.openRatePercent ?? null,
                              )}`}
                            </div>
                          ) : null}
                          {recommendationTrend.priorFailRuns > 0 ? (
                            <div>
                              {`Fails trend: ${getTrendDeltaText(
                                recommendationTrend.rolling.fail.buyRatePercent,
                                recommendationTrend.prior?.fail.buyRatePercent ?? null,
                              )}`}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className={`mt-5 grid gap-3 ${isVictory && hasNextUnlockedLevel ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4'}`}>
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-500/12 py-4 text-lg font-black text-white transition-all hover:-translate-y-0.5"
            >
              <RotateCcw size={18} />
              TRY AGAIN
            </button>
            {isVictory && hasNextUnlockedLevel && (
              <button
                onClick={onNextLevel}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200/20 bg-amber-400 py-4 text-lg font-black text-slate-950 transition-all hover:-translate-y-0.5"
              >
                <ArrowRight size={18} />
                NEXT LEVEL
              </button>
            )}
            <button
              onClick={onOpenLeaderboard}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-500/12 py-4 text-lg font-black text-white transition-all hover:-translate-y-0.5"
            >
              <Trophy size={18} />
              LEADERBOARD
            </button>
            <button
              onClick={onShareRouteChallenge}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-200/20 bg-fuchsia-500/12 py-4 text-lg font-black text-white transition-all hover:-translate-y-0.5"
            >
              <Flag size={18} />
              CHALLENGE ROUTE
            </button>
            <button
              onClick={onReturnToMenu}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/82 py-4 text-lg font-bold text-white transition-all hover:-translate-y-0.5"
            >
              <Home size={18} />
              MAIN MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
