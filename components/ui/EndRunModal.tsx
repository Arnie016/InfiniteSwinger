import React from 'react';
import { ArrowRight, Home, RotateCcw, Star } from 'lucide-react';

import { GameState, LevelConfig, SaveData } from '../../types';
import { formatDurationMs } from '../../engine/uiFormat';

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
  worldTimeMs: number;
  playerLives: number;
  causeOfDeath?: string;
  computeLevelStars: (level: LevelConfig, timeMs: number, livesRemaining: number) => number;
  onRetry: () => void;
  onNextLevel: () => void;
  onReturnToMenu: () => void;
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
  worldTimeMs,
  playerLives,
  causeOfDeath,
  computeLevelStars,
  onRetry,
  onNextLevel,
  onReturnToMenu,
}: Props) {
  const isVictory = gameState === GameState.LEVEL_COMPLETE;
  const starCount = isVictory ? computeLevelStars(selectedLevel, Math.round(worldTimeMs), playerLives) : 0;

  return (
    <div data-ui-control className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/82 px-4 backdrop-blur-sm">
      <div className={`atlas-surface-strong relative w-full max-w-4xl overflow-hidden rounded-[2rem] p-6 text-white md:p-8 ${isVictory ? 'shadow-2xl shadow-emerald-950/40' : 'shadow-2xl shadow-black/40'}`}>
        <div
          className={`absolute inset-x-0 top-0 h-36 ${
            isVictory
              ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(74,222,128,0.28),transparent_54%),linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]'
              : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent)]'
          }`}
        />
        <div className="relative">
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

          <div className="mt-6 grid gap-4 md:grid-cols-4">
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
              <div className="atlas-map-label text-xs text-slate-400">Best Score</div>
              <div className="mt-2 text-3xl font-black text-white">{bestScore}</div>
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
                  {formatDurationMs(saveData.levelResults[String(selectedLevelId)]?.bestTimeMs ?? (isVictory ? Math.round(worldTimeMs) : null))}
                </span>
              </div>
              {isVictory && selectedLevelId < highestUnlockedLevel && (
                <div className="mt-3 text-sm text-emerald-200">
                  Next route unlocked: Level {selectedLevelId + 1}.
                </div>
              )}
              {!isVictory && causeOfDeath && (
                <div className="mt-3 text-sm text-rose-100">
                  Cause of wipeout: {causeOfDeath}
                </div>
              )}
            </div>

            <div className="atlas-surface-soft rounded-2xl p-4">
              <div className="atlas-map-label text-xs text-slate-400">Next Move</div>
              <div className="mt-3 text-sm text-slate-200">
                {isVictory
                  ? 'Take the next route, or return to camp and tune the build.'
                  : 'Retry with a cleaner line or back out to adjust the loadout.'}
              </div>
            </div>
          </div>

          <div className={`mt-6 grid gap-3 ${isVictory && hasNextUnlockedLevel ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
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
