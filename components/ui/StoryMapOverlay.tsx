import React from 'react';
import { ArrowRight, BookOpen, Home, SkipForward } from 'lucide-react';

import { StoryBeat } from '../../types';

export function StoryMapOverlay({
  beat,
  beatIndex,
  beatCount,
  regionLabel,
  onNext,
  onSkip,
  onReturnToMenu,
}: {
  beat: StoryBeat;
  beatIndex: number;
  beatCount: number;
  regionLabel?: string | null;
  onNext: () => void;
  onSkip: () => void;
  onReturnToMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center px-6 font-ui">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,18,0.08),rgba(5,10,18,0.34))]" />

      <div className="pointer-events-auto relative w-full max-w-2xl atlas-surface-strong px-6 py-5 text-white">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
          <span className="atlas-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5">
            <BookOpen size={14} />
            Story Map
          </span>
          <span className="atlas-chip rounded-full px-3 py-1.5">
            Beat {beatIndex + 1}/{beatCount}
          </span>
          {regionLabel ? (
            <span className="atlas-chip rounded-full border-amber-200/15 bg-amber-500/10 px-3 py-1.5 text-amber-100">
              {regionLabel}
            </span>
          ) : null}
        </div>

        <h2 className="atlas-title mt-4 text-4xl text-white">{beat.title}</h2>
        <p className="atlas-panel-copy mt-3 max-w-2xl text-lg text-slate-200">{beat.body}</p>
        {beat.hint ? <div className="mt-3 text-sm font-medium text-cyan-100">{beat.hint}</div> : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onSkip}
              className="atlas-surface rounded-2xl px-5 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800"
            >
              <span className="inline-flex items-center gap-2">
                Skip
                <SkipForward size={16} />
              </span>
            </button>
            <button
              onClick={onReturnToMenu}
              className="atlas-surface rounded-2xl px-5 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800"
            >
              <span className="inline-flex items-center gap-2">
                <Home size={16} />
                Main Menu
              </span>
            </button>
          </div>

          <button
            onClick={onNext}
            className="rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-emerald-300"
          >
            <span className="inline-flex items-center gap-2">
              {beatIndex === beatCount - 1 ? 'Open Map' : 'Next'}
              <ArrowRight size={16} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
