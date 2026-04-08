import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Flame,
  Lock,
  MousePointerClick,
  Play,
  Shield,
  Sparkles,
  Waves,
  Wind,
} from 'lucide-react';

import { STORY_CAST_ORDER, STORY_SCENE_PALETTE, getStoryCharacterProfile } from '../../content/storyCast';
import { INTRO_STORY_SEQUENCE } from '../../content/story';
import { LEVELS } from '../../gameData';
import { StoryBeat, StoryCastId, StoryPanelScene } from '../../types';
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

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[1.4rem]">
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${panelIndex * 100}%)` }}>
          {availablePanels.map((panel) => (
            <div className="w-full shrink-0" key={panel.id}>
              <LandingComicPanel panel={panel} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPanelIndex((current) => (current - 1 + availablePanels.length) % availablePanels.length)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/12 bg-white/[0.08] text-white transition-colors hover:bg-white/[0.16]"
            aria-label="Previous story issue"
          >
            <ArrowLeft size={15} />
          </button>
          <button
            onClick={() => setPanelIndex((current) => (current + 1) % availablePanels.length)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/12 bg-white/[0.08] text-white transition-colors hover:bg-white/[0.16]"
            aria-label="Next story issue"
          >
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {availablePanels.map((panel, index) => (
            <button
              key={panel.id}
              onClick={() => setPanelIndex(index)}
              className={`inline-flex h-2 rounded-full transition-all ${index === panelIndex ? 'w-6 bg-emerald-300' : 'w-2 bg-white/40'}`}
              aria-label={`Select issue ${panel.kicker}`}
            />
          ))}
        </div>
        <span className="atlas-chip rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
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
    <div className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-950/70 p-2 shadow-2xl shadow-black/30">
      <svg className="h-48 w-full rounded-[1.05rem]" viewBox="0 0 340 220" aria-hidden="true" role="presentation">
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
        <div className="rounded-full border border-white/15 bg-slate-950/75 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.26em] text-white/85">
          {panel.kicker}
        </div>
        <div className="rounded-full border border-white/15 bg-slate-950/75 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/80">
          {panel.speaker}
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 flex items-start -space-x-3">
        <StoryCastPortrait characterId={panel.characterId} scene={panel.scene} size={56} priority="primary" />
        {support ? <StoryCastPortrait characterId={support.id} scene={panel.scene} size={56} priority="support" className="mt-6" /> : null}
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-[1.1rem] border border-white/12 bg-slate-950/82 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">Comic Panel</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{panel.role}</div>
        </div>
        <div className="mt-1 text-sm font-semibold text-white">{panel.title}</div>
        <div className="mt-1 text-[12px] leading-relaxed text-slate-300">{panel.caption}</div>
        {speaker ? <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">{speaker.signatureMove}</div> : null}
      </div>
    </div>
  );
}

export function LandingScreen({
  hasCompletedStoryIntro,
  highestUnlockedLevel,
  onPlay,
  onOpenStory,
  landingChallenge,
  onAcceptChallenge,
}: {
  hasCompletedStoryIntro: boolean;
  highestUnlockedLevel: number;
  onPlay: () => void;
  onOpenStory: () => void;
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
  const finalLevelName = LEVELS[LEVELS.length - 1]?.name ?? 'Magma Core';

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden px-5 py-5 font-ui">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(140,245,200,0.18),transparent_24%),radial-gradient(circle_at_80%_14%,rgba(251,146,60,0.16),transparent_22%),radial-gradient(circle_at_72%_72%,rgba(125,211,252,0.14),transparent_22%),linear-gradient(180deg,rgba(2,6,23,0.16),rgba(2,6,23,0.88))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] opacity-40" />

      <div className="pointer-events-auto relative w-full max-w-6xl atlas-surface-strong atlas-elevated px-5 py-5 text-white md:px-6 md:py-6">
        <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-emerald-200/80">
              <span className="atlas-map-label">Campaign Comic</span>
              <span className="atlas-chip rounded-full px-3 py-1 text-[10px] tracking-[0.24em] text-slate-300">
                Drag the atlas to scout ahead
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.88fr,1.12fr]">
              <div className="max-w-xl">
                <div className="rounded-[1.5rem] border border-emerald-200/15 bg-emerald-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.34em] text-emerald-100">
                  Issue Zero • Rope Before Fire
                </div>
                <h1 className="atlas-title mt-4 text-5xl leading-[0.9] text-white sm:text-6xl">
                  Infinite
                  <br />
                  Swinger
                </h1>
                <p className="atlas-panel-copy mt-4 max-w-lg text-lg leading-relaxed text-slate-200">
                  A crew-on-the-run jungle comic where each route is a playable panel. Build momentum, choose safer or greedier lines,
                  and carry the run all the way into the magma frontier.
                </p>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Progress</div>
                    <div className="mt-1 text-2xl font-black text-white">L{highestUnlockedLevel}</div>
                    <div className="mt-1 text-xs text-slate-300">Current atlas reach</div>
                  </div>
                  <div className="rounded-2xl border border-cyan-200/15 bg-cyan-500/10 px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/70">Loop</div>
                    <div className="mt-1 text-sm font-black text-white">Route. Upgrade. Rival.</div>
                    <div className="mt-1 text-xs text-cyan-50/75">Every clear feeds the next push</div>
                  </div>
                  <div className="rounded-2xl border border-orange-200/15 bg-orange-500/10 px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-100/70">Finale</div>
                    <div className="mt-1 text-sm font-black text-white">{finalLevelName}</div>
                    <div className="mt-1 text-xs text-orange-50/75">The atlas endgame route</div>
                  </div>
                </div>

                {landingChallenge ? (
                  <div className="mt-5 rounded-2xl border border-cyan-200/20 bg-cyan-500/10 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-100/85">
                      Incoming Route Challenge
                    </div>
                    <div className="mt-2 text-lg font-black text-white">
                      {landingChallenge.challengerAlias} calls out L{landingChallenge.levelId}: {landingChallenge.levelName}
                    </div>
                    <div className="mt-2 text-sm text-cyan-50/85">{challengeUnlockCopy}</div>
                    <button
                      onClick={landingChallenge.isUnlocked ? onAcceptChallenge || (() => undefined) : undefined}
                      disabled={!landingChallenge.isUnlocked || !onAcceptChallenge}
                      className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-colors ${
                        landingChallenge.isUnlocked && onAcceptChallenge
                          ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                          : 'cursor-not-allowed border border-white/20 bg-white/10 text-white/45'
                      }`}
                    >
                      {landingChallenge.isUnlocked ? <ArrowRight size={18} /> : <Lock size={18} />}
                      {landingChallenge.isUnlocked ? 'Accept Challenge' : 'Challenge Locked'}
                    </button>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={onPlay}
                    className="rounded-2xl bg-emerald-400 px-6 py-3.5 text-base font-bold text-slate-950 shadow-xl shadow-emerald-950/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-300"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Play size={20} />
                      {hasCompletedStoryIntro ? 'Play Atlas' : 'Start Comic Tour'}
                      <ArrowRight size={18} />
                    </span>
                  </button>
                  <button
                    onClick={onOpenStory}
                    className="atlas-surface rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800"
                  >
                    <span className="inline-flex items-center gap-2">
                      <BookOpen size={18} />
                      Open Story Map
                    </span>
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <span className="atlas-chip rounded-full px-3.5 py-1.5 text-sm font-semibold text-slate-100">
                    {hasCompletedStoryIntro ? 'Tour cleared' : 'First launch opens the guided tour'}
                  </span>
                  <span className="atlas-chip rounded-full border-cyan-200/15 bg-cyan-500/10 px-3.5 py-1.5 text-sm font-semibold text-cyan-100">
                    Double click a route node to launch fast
                  </span>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Crew On The Line</div>
                      <div className="mt-1 text-sm font-semibold text-white">The intro now tracks a named rope crew across the atlas.</div>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/70">Cast-driven panels</div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {STORY_CAST_ORDER.slice(0, 4).map((characterId) => {
                      const profile = getStoryCharacterProfile(characterId);
                      if (!profile) return null;

                      return (
                        <div key={profile.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                          <StoryCastPortrait characterId={profile.id} scene={profile.homeScene} size={64} showLabel />
                          <div className="mt-3 text-[11px] leading-relaxed text-slate-300">{profile.shortBio}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <LandingStoryDeck hasCompletedStoryIntro={hasCompletedStoryIntro} highestUnlockedLevel={highestUnlockedLevel} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="atlas-surface rounded-[1.5rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="atlas-map-label text-[11px] text-slate-400">How The Run Feels</div>
                <Sparkles size={16} className="text-cyan-300" />
              </div>
              <div className="mt-4 grid gap-2.5 text-sm text-slate-100">
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3">
                  <MousePointerClick size={18} className="text-cyan-300" />
                  Hold `E` or mouse to latch and keep your line alive.
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3">
                  <Wind size={18} className="text-emerald-300" />
                  `D` drives forward, `A` brakes and resets a bad angle.
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3">
                  <Waves size={18} className="text-amber-300" />
                  `Space` jumps, `W` and `S` tune rope length mid-air.
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              <div className="atlas-surface rounded-[1.5rem] p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
                  <Shield size={14} />
                  Early Goal
                </div>
                <div className="mt-3 text-sm leading-relaxed text-slate-200">
                  Clear the first tour beats, unlock the full atlas, and start banking clean route clears for upgrades and leaderboard pushes.
                </div>
              </div>

              <div className="atlas-surface rounded-[1.5rem] p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
                  <BookOpen size={14} />
                  Story Shape
                </div>
                <div className="mt-3 text-sm leading-relaxed text-slate-200">
                  Each region is framed like a comic beat now, so the campaign feels like a chase across the map instead of a plain level list.
                </div>
              </div>

              <div className="atlas-surface rounded-[1.5rem] p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200/80">
                  <Flame size={14} />
                  Late Threat
                </div>
                <div className="mt-3 text-sm leading-relaxed text-slate-200">
                  Rival boards, harder branches, and the magma routes turn the late game into a consistency check instead of a single lucky run.
                </div>
              </div>
            </div>

            <div className="atlas-surface rounded-[1.5rem] p-4">
              <div className="atlas-map-label text-[11px] text-slate-400">First Launch</div>
              <div className="mt-3 text-sm leading-relaxed text-slate-200">
                {hasCompletedStoryIntro
                  ? 'Play drops you straight into the atlas. Reopen the Story Map any time to revisit the comic tour.'
                  : 'Start Comic Tour to sweep through the guided intro beats, then the atlas opens for free route selection and progression.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
