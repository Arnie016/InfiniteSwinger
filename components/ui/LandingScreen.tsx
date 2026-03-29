import React from 'react';
import { ArrowRight, BookOpen, MousePointerClick, Play, Waves, Wind } from 'lucide-react';

export function LandingScreen({
  hasCompletedStoryIntro,
  highestUnlockedLevel,
  onPlay,
  onOpenStory,
}: {
  hasCompletedStoryIntro: boolean;
  highestUnlockedLevel: number;
  onPlay: () => void;
  onOpenStory: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center px-5 font-ui">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.14),transparent_28%),radial-gradient(circle_at_78%_24%,rgba(34,211,238,0.14),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.82))]" />

      <div className="pointer-events-auto relative w-full max-w-4xl atlas-surface-strong atlas-elevated px-6 py-6 text-white">
        <div className="grid gap-5 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-emerald-200/80">
              <span className="atlas-map-label">Campaign</span>
              <span className="atlas-chip rounded-full px-3 py-1 text-[10px] tracking-[0.24em] text-slate-300">
                Drag the map to explore
              </span>
            </div>
            <h1 className="atlas-title mt-4 text-5xl leading-[0.92] text-white sm:text-6xl">Infinite Swinger</h1>
            <p className="atlas-panel-copy mt-3 max-w-lg text-lg text-slate-200">Swing across the atlas. Pick a route. Go.</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={onPlay}
                className="rounded-2xl bg-emerald-400 px-6 py-3.5 text-base font-bold text-slate-950 shadow-xl shadow-emerald-950/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                <span className="inline-flex items-center gap-2">
                  <Play size={20} />
                  {hasCompletedStoryIntro ? 'Play' : 'Start Run'}
                  <ArrowRight size={18} />
                </span>
              </button>
              <button
                onClick={onOpenStory}
                className="atlas-surface rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800"
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen size={18} />
                  Route Story
                </span>
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <span className="atlas-chip rounded-full px-3.5 py-1.5 text-sm font-semibold text-slate-100">
                Unlocked up to Level {highestUnlockedLevel}
              </span>
              <span className="atlas-chip rounded-full border-cyan-200/15 bg-cyan-500/10 px-3.5 py-1.5 text-sm font-semibold text-cyan-100">
                Double click to reel out
              </span>
            </div>
          </div>

          <div className="grid gap-4 self-end">
            <div className="atlas-surface rounded-[1.5rem] p-4">
              <div className="atlas-map-label text-[11px] text-slate-400">Controls</div>
              <div className="mt-4 grid gap-2.5 text-sm text-slate-100">
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3">
                  <MousePointerClick size={18} className="text-cyan-300" />
                  Hold E or mouse to latch.
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3">
                  <Wind size={18} className="text-emerald-300" />
                  D drives. A brakes.
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3">
                  <Waves size={18} className="text-amber-300" />
                  Space jumps. W and S shape rope.
                </div>
              </div>
            </div>

            <div className="atlas-surface rounded-[1.5rem] p-4">
              <div className="atlas-map-label text-[11px] text-slate-400">First Launch</div>
              <div className="atlas-panel-copy mt-3 text-sm text-slate-200">First run opens the tour. After that, Play drops you straight into the atlas.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
