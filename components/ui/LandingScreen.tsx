import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Lock,
  Play,
  Trophy,
  Shield,
  Sparkles,
} from 'lucide-react';

import { STORY_SCENE_PALETTE, getStoryCharacterProfile } from '../../content/storyCast';
import { INTRO_STORY_SEQUENCE } from '../../content/story';
import { LEVELS } from '../../gameData';
import { FeaturedRouteCup, StoryBeat, StoryCastId, StoryPanelScene } from '../../types';
import { StoryCastPortrait } from './StoryCastPortrait';

type LandingStoryPanel = StoryBeat & {
  scene: StoryPanelScene;
  kicker: string;
  caption: string;
  speaker: string;
  role: string;
  characterId: StoryCastId;
  supportCharacterId?: StoryCastId;
};

const LANDING_STORY_PANELS: LandingStoryPanel[] = INTRO_STORY_SEQUENCE.beats.map((beat, index) => {
  const visual = beat.visual ?? {
    scene: (index === 0 ? 'camp' : index === 1 ? 'basin' : 'magma') as StoryPanelScene,
    caption: beat.body,
    speaker: 'Camp Log',
  };
  const resolvedCharacter = getStoryCharacterProfile(visual.characterId ?? 'nara') ?? null;
  const resolvedSupport = getStoryCharacterProfile(visual.supportCharacterId ?? null);

  return {
    ...beat,
    scene: visual.scene,
    kicker: beat.kicker ?? `Issue 0${index}`,
    title: beat.title,
    caption: visual.caption ?? beat.body,
    speaker: visual.speaker,
    role: resolvedCharacter ? resolvedCharacter.role : 'Campaign narrator',
    characterId: (visual.characterId ?? 'nara') as StoryCastId,
    supportCharacterId: resolvedSupport ? visual.supportCharacterId : undefined,
  };
});

const getUnlockedStoryPanelCount = (highestLevel: number, hasCompletedStoryIntro: boolean) => {
  if (hasCompletedStoryIntro) {
    return LANDING_STORY_PANELS.length;
  }

  return (
    LANDING_STORY_PANELS.reduce((count, panel) => {
      if (typeof panel.focusLevelId === 'number' && highestLevel >= panel.focusLevelId) return count + 1;
      return count;
    }, 0) || 1
  );
};

function LandingStoryDeck({
  hasCompletedStoryIntro,
  highestUnlockedLevel,
}: {
  hasCompletedStoryIntro: boolean;
  highestUnlockedLevel: number;
}) {
  const availablePanels = useMemo(() => {
    const count = getUnlockedStoryPanelCount(highestUnlockedLevel, hasCompletedStoryIntro);
    return LANDING_STORY_PANELS.slice(0, count);
  }, [highestUnlockedLevel, hasCompletedStoryIntro]);
  const isCinematicProgress = !hasCompletedStoryIntro;
  const [panelIndex, setPanelIndex] = useState(availablePanels.length > 0 ? availablePanels.length - 1 : 0);

  useEffect(() => {
    setPanelIndex((current) => Math.min(current, Math.max(0, availablePanels.length - 1)));
  }, [availablePanels.length]);

  useEffect(() => {
    if (!isCinematicProgress || availablePanels.length < 2) return;

    const timer = window.setInterval(() => {
      setPanelIndex((current) => (current + 1) % availablePanels.length);
    }, 6800);
    return () => clearInterval(timer);
  }, [isCinematicProgress, availablePanels.length]);

  const activePanel = availablePanels[panelIndex] ?? availablePanels[0] ?? null;

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/28 shadow-[0_28px_60px_rgba(0,0,0,0.22)] backdrop-blur-sm">
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${panelIndex * 100}%)` }}>
          {availablePanels.map((panel) => (
            <div className="w-full shrink-0" key={panel.id}>
              <LandingComicPanel panel={panel} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase text-emerald-200/75">Campaign comic</div>
          <div className="mt-1 truncate text-sm font-semibold text-white">
            {activePanel ? `${activePanel.kicker} • ${activePanel.title}` : 'Campaign comic'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPanelIndex((current) => (current - 1 + availablePanels.length) % availablePanels.length)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.08] text-white transition-colors hover:bg-white/[0.16]"
            aria-label="Previous story issue"
          >
            <ArrowLeft size={15} />
          </button>
          <button
            onClick={() => setPanelIndex((current) => (current + 1) % availablePanels.length)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.08] text-white transition-colors hover:bg-white/[0.16]"
            aria-label="Next story issue"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {availablePanels.map((panel, index) => (
            <button
              key={panel.id}
              onClick={() => setPanelIndex(index)}
              className={`inline-flex h-2 rounded-full transition-all ${index === panelIndex ? 'w-8 bg-emerald-300' : 'w-2 bg-white/30'}`}
              aria-label={`Select issue ${panel.kicker}`}
            />
          ))}
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase text-white/70">
          {isCinematicProgress ? `${panelIndex + 1}/${availablePanels.length}` : 'Finale unlocked'}
        </span>
      </div>
    </div>
  );
}

function LandingComicPanel({ panel }: { panel: LandingStoryPanel }) {
  const palette = STORY_SCENE_PALETTE[panel.scene];
  const speaker = getStoryCharacterProfile(panel.characterId);
  const support = getStoryCharacterProfile(panel.supportCharacterId);

  return (
    <div className="relative overflow-hidden bg-slate-950/40">
      <svg className="aspect-[16/10] h-auto w-full" viewBox="0 0 340 220" aria-hidden="true" role="presentation">
        <defs>
          <linearGradient id={`${panel.id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.skyFrom} />
            <stop offset="100%" stopColor={palette.skyTo} />
          </linearGradient>
          <radialGradient id={`${panel.id}-glow`} cx="54%" cy="28%" r="52%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity="0.92" />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="340" height="220" rx="22" fill={`url(#${panel.id}-sky)`} />
        <ellipse cx="194" cy="56" rx="94" ry="54" fill={`url(#${panel.id}-glow)`}>
          <animate attributeName="ry" values="52;60;52" dur="4.4s" repeatCount="indefinite" />
        </ellipse>

        <path
          d="M0 150C42 136 74 132 110 140C140 146 168 156 196 154C234 152 266 136 340 154V220H0Z"
          fill={palette.ridge}
          opacity="0.95"
        />
        <path
          d="M0 176C44 168 84 164 126 172C170 180 210 188 252 178C284 170 312 170 340 180V220H0Z"
          fill="#0b1220"
          opacity="0.88"
        />

        <g opacity="0.88">
          <path d="M66 66L72 176" stroke="#162233" strokeWidth="10" strokeLinecap="round" />
          <path d="M72 88C90 82 108 72 124 56" stroke="#27473a" strokeWidth="7" strokeLinecap="round" />
          <path d="M272 76L266 178" stroke="#162233" strokeWidth="11" strokeLinecap="round" />
          <path d="M266 102C242 98 216 88 192 68" stroke="#263646" strokeWidth="7" strokeLinecap="round" />
        </g>

        <path d="M108 72C144 88 174 116 198 148" fill="none" stroke={palette.accent} strokeWidth="4" strokeLinecap="round" strokeDasharray="7 9">
          <animate attributeName="stroke-dashoffset" values="0;-48" dur="2.8s" repeatCount="indefinite" />
        </path>

        <g transform="translate(0 0)">
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="3.2s" repeatCount="indefinite" />
          <path d="M196 148C206 132 216 126 228 128C240 130 250 138 258 152C240 162 220 168 202 166C198 158 196 152 196 148Z" fill="#0b1020" />
          <circle cx="221" cy="118" r="14" fill="#0b1020" />
          <circle cx="228" cy="113" r="3.5" fill={palette.accent} />
          <path d="M210 132L204 166" stroke="#0b1020" strokeWidth="7" strokeLinecap="round" />
          <path d="M232 132L252 162" stroke="#0b1020" strokeWidth="7" strokeLinecap="round" />
          <path d="M200 148L170 156" stroke="#0b1020" strokeWidth="7" strokeLinecap="round" />
          <path d="M252 146L274 126" stroke="#0b1020" strokeWidth="7" strokeLinecap="round" />
          <path d="M274 126L294 98" stroke={palette.accent} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      </svg>

      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
        <div className="rounded-md border border-white/15 bg-slate-950/78 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/85">
          {panel.kicker}
        </div>
        <div className="rounded-md border border-white/15 bg-slate-950/78 px-2.5 py-1 text-[9px] font-semibold uppercase text-white/80">
          {panel.speaker}
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 flex items-start -space-x-3">
        <StoryCastPortrait characterId={panel.characterId} scene={panel.scene} size={56} priority="primary" />
        {support ? <StoryCastPortrait characterId={support.id} scene={panel.scene} size={56} priority="support" className="mt-6" /> : null}
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-lg border border-white/12 bg-slate-950/80 px-3 py-3 shadow-[0_16px_32px_rgba(0,0,0,0.26)]">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-black uppercase text-white/45">Comic panel</div>
          <div className="text-[10px] font-semibold uppercase text-white/55">{panel.role}</div>
        </div>
        <div className="mt-1 text-sm font-semibold text-white">{panel.title}</div>
        <div className="mt-1 text-[12px] leading-relaxed text-slate-300">{panel.caption}</div>
        {speaker ? <div className="mt-2 text-[10px] uppercase text-cyan-100/80">{speaker.signatureMove}</div> : null}
      </div>
    </div>
  );
}

export function LandingScreen({
  hasCompletedStoryIntro,
  highestUnlockedLevel,
  campaignChallenge,
  featuredRouteCup,
  currentStreak = 0,
  bestStreak = 0,
  onPlay,
  onOpenStory,
  onOpenLeaderboard,
  landingChallenge,
  onAcceptChallenge,
}: {
  hasCompletedStoryIntro: boolean;
  highestUnlockedLevel: number;
  campaignChallenge:
    | {
        levelId: number | null;
        title: string;
        description: string;
        note: string;
        tone: 'emerald' | 'amber' | 'cyan';
        progress: number;
        target: number;
      }
    | null;
  featuredRouteCup: FeaturedRouteCup | null;
  currentStreak?: number;
  bestStreak?: number;
  onPlay: () => void;
  onOpenStory: () => void;
  onOpenLeaderboard: () => void;
  landingChallenge: {
    levelId: number;
    levelName: string;
    challengerAlias: string;
    isUnlocked: boolean;
  } | null;
  onAcceptChallenge: (() => void) | null;
}) {
  const challengeUnlockCopy = landingChallenge && landingChallenge.isUnlocked
    ? 'Ready now'
    : 'Unlock by clearing your current atlas progression.';
  const campaignProgress = campaignChallenge
    ? Math.max(0, Math.min(100, Math.round((campaignChallenge.progress / Math.max(1, campaignChallenge.target)) * 100)))
    : 0;
  const campaignTone =
    campaignChallenge?.tone === 'amber'
      ? 'bg-amber-300'
      : campaignChallenge?.tone === 'cyan'
        ? 'bg-cyan-300'
        : 'bg-emerald-300';
  const frontierRouteIndex = Math.max(0, Math.min(highestUnlockedLevel - 1, LEVELS.length - 1));
  const frontierRoute = LEVELS[frontierRouteIndex] ?? null;
  const nextRoute = LEVELS[frontierRouteIndex + 1] ?? null;
  const frontierProgressPercent = Math.max(
    0,
    Math.min(100, Math.round((Math.min(highestUnlockedLevel, LEVELS.length) / Math.max(1, LEVELS.length)) * 100)),
  );
  const finalLevelName = LEVELS[LEVELS.length - 1]?.name ?? 'Magma Core';
  const starterLabel = hasCompletedStoryIntro ? 'Campaign live' : 'Issue zero';
  const primaryActionLabel = hasCompletedStoryIntro ? 'Play Atlas' : 'Start Comic Tour';
  const frontierSummary = frontierRoute ? `Frontier route ${frontierRoute.name}` : 'Atlas start';
  const strapline = hasCompletedStoryIntro
    ? nextRoute
      ? `Next push: ${nextRoute.name}.`
      : `${finalLevelName} is the last route standing.`
    : 'One guided run opens the whole atlas.';

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-slate-950 font-ui">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_74%_28%,rgba(125,211,252,0.22),transparent_24%),radial-gradient(circle_at_16%_18%,rgba(132,255,207,0.16),transparent_26%),linear-gradient(115deg,rgba(2,6,23,0.96)_0%,rgba(6,18,29,0.88)_46%,rgba(2,6,23,0.98)_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(0,0,0,0.62),transparent)]" />

      <div className="pointer-events-auto relative mx-auto flex min-h-full w-full max-w-[1500px] flex-col px-5 py-5 text-white sm:px-8 sm:py-7">
        <div className="grid min-h-[calc(100svh-3.5rem)] flex-1 items-center gap-8 xl:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)]">
          <section className="relative z-10 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/85">
              <span className="rounded-full border border-emerald-200/25 bg-emerald-400/12 px-3 py-1.5">{starterLabel}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/62">
                {hasCompletedStoryIntro ? 'Atlas ready' : 'Guided route tour'}
              </span>
            </div>

            <h1 className="atlas-title mt-6 max-w-4xl text-6xl leading-[0.82] text-white drop-shadow-[0_14px_44px_rgba(0,0,0,0.5)] sm:text-7xl xl:text-[7.6rem]">
              Infinite
              <br />
              Swinger
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-200 sm:text-2xl">
              A playable jungle comic about greedy lines, safer swings, and the crew pushing one route deeper before the dust arrives.
            </p>

            <div className="mt-7 max-w-2xl rounded-[1.35rem] border border-white/10 bg-black/22 p-4 shadow-[0_28px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">Now showing</div>
              <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
                <div className="atlas-title text-2xl text-amber-100">L{highestUnlockedLevel}</div>
                <div className="text-lg font-black text-white">{frontierSummary}</div>
              </div>
              <div className="mt-2 text-sm leading-relaxed text-slate-300">{strapline}</div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300 transition-all"
                  style={{ width: `${frontierProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={onPlay}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-6 py-3.5 text-base font-black text-slate-950 shadow-xl shadow-emerald-950/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-200"
              >
                <Play size={20} />
                {primaryActionLabel}
                <ArrowRight size={18} />
              </button>
              <button
                onClick={onOpenStory}
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-5 py-3.5 text-sm font-bold text-slate-100 transition-colors hover:bg-white/[0.11]"
              >
                <BookOpen size={18} />
                Story Map
              </button>
              <button
                onClick={onOpenLeaderboard}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/15 bg-cyan-500/10 px-5 py-3.5 text-sm font-bold text-cyan-100 transition-colors hover:bg-cyan-500/18"
              >
                <Trophy size={18} />
                Board
              </button>
            </div>

            {landingChallenge ? (
              <div className="mt-5 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-[1.15rem] border border-cyan-200/18 bg-cyan-500/10 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/80">Incoming challenge</div>
                  <div className="mt-1 truncate text-sm font-black text-white">
                    {landingChallenge.challengerAlias} calls L{landingChallenge.levelId}: {landingChallenge.levelName}
                  </div>
                  <div className="text-xs text-cyan-50/72">{challengeUnlockCopy}</div>
                </div>
                <button
                  onClick={landingChallenge.isUnlocked ? onAcceptChallenge || (() => undefined) : undefined}
                  disabled={!landingChallenge.isUnlocked || !onAcceptChallenge}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-black uppercase tracking-[0.16em] transition-colors ${
                    landingChallenge.isUnlocked && onAcceptChallenge
                      ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                      : 'cursor-not-allowed border border-white/20 bg-white/10 text-white/45'
                  }`}
                >
                  {landingChallenge.isUnlocked ? <ArrowRight size={15} /> : <Lock size={15} />}
                  {landingChallenge.isUnlocked ? 'Accept' : 'Locked'}
                </button>
              </div>
            ) : null}
          </section>

          <section className="relative min-w-0 xl:pl-2">
            <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_18%,rgba(253,230,138,0.16),transparent_28%),radial-gradient(circle_at_74%_64%,rgba(125,211,252,0.14),transparent_34%)] blur-sm" />
            <div className="relative">
              <LandingStoryDeck hasCompletedStoryIntro={hasCompletedStoryIntro} highestUnlockedLevel={highestUnlockedLevel} />
            </div>
          </section>

          <div className="grid gap-3 self-end xl:col-span-2 md:grid-cols-3">
            <div className="rounded-[1.1rem] border border-white/10 bg-black/24 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/80">
                <Shield size={14} />
                Streak
              </div>
              <div className="mt-2 text-2xl font-black text-white">{currentStreak}</div>
              <div className="text-xs text-slate-300">Best {bestStreak}. Keep the branch clean.</div>
            </div>

            <div className="rounded-[1.1rem] border border-white/10 bg-black/24 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Campaign quest</div>
                {campaignChallenge && campaignChallenge.levelId !== null ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase text-white/70">
                    L{campaignChallenge?.levelId}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 truncate text-base font-black text-white">{campaignChallenge?.title ?? 'Clear your first route'}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950/50">
                <div className={`h-full rounded-full transition-all ${campaignTone}`} style={{ width: `${campaignProgress}%` }} />
              </div>
              <div className="mt-1 text-xs text-slate-300">{campaignChallenge?.note ?? 'Start at route 1'}</div>
            </div>

            <div className="rounded-[1.1rem] border border-white/10 bg-black/24 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/80">
                <Sparkles size={14} />
                {featuredRouteCup ? 'Daily cup' : 'Final route'}
              </div>
              <div className="mt-2 truncate text-base font-black text-white">{featuredRouteCup?.title ?? finalLevelName}</div>
              <div className="mt-1 text-xs text-slate-300">
                {featuredRouteCup ? `${featuredRouteCup.statusLabel} · ${featuredRouteCup.countdownLabel}` : 'The atlas endgame branch.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
