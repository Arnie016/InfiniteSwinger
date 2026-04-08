import React from 'react';
import { ArrowRight, BookOpen, Home, Minus, Plus, SkipForward } from 'lucide-react';

import { STORY_SCENE_PALETTE, getStoryCharacterProfile } from '../../content/storyCast';
import { StoryBeat } from '../../types';
import { StoryCastPortrait } from './StoryCastPortrait';

function StoryPanelArt({ beat }: { beat: StoryBeat }) {
  const visual = beat.visual ?? {
    scene: 'camp' as const,
    caption: beat.hint ?? beat.title,
    speaker: 'Camp Log',
    accentWord: 'Story',
  };
  const palette = STORY_SCENE_PALETTE[visual.scene];
  const speaker = getStoryCharacterProfile(visual.characterId);
  const support = getStoryCharacterProfile(visual.supportCharacterId);

  return (
    <div className="relative overflow-hidden rounded-[1.4rem] border border-white/15 bg-slate-950/70 p-3">
      <svg className="h-[320px] w-full rounded-[1.05rem]" viewBox="0 0 640 420" aria-hidden="true" role="presentation">
        <defs>
          <linearGradient id={`story-sky-${visual.scene}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.skyFrom} />
            <stop offset="100%" stopColor={palette.skyTo} />
          </linearGradient>
          <radialGradient id={`story-glow-${visual.scene}`} cx="50%" cy="28%" r="48%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity="0.95" />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="640" height="420" rx="28" fill={`url(#story-sky-${visual.scene})`} />
        <ellipse cx="330" cy="118" rx="170" ry="98" fill={`url(#story-glow-${visual.scene})`}>
          <animate attributeName="ry" values="92;108;92" dur="4.2s" repeatCount="indefinite" />
        </ellipse>

        <g opacity="0.28">
          <circle cx="96" cy="72" r="14" fill="#ffffff">
            <animate attributeName="cy" values="72;64;72" dur="5.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="550" cy="92" r="10" fill="#ffffff">
            <animate attributeName="cy" values="92;84;92" dur="4.7s" repeatCount="indefinite" />
          </circle>
          <circle cx="504" cy="142" r="6" fill={palette.glow}>
            <animate attributeName="cy" values="142;132;142" dur="3.8s" repeatCount="indefinite" />
          </circle>
        </g>

        <path d="M0 302C72 256 132 248 204 282C258 308 322 312 396 278C470 244 540 250 640 304V420H0Z" fill={palette.land} opacity="0.92" />
        <path d="M0 336C80 306 142 302 214 322C300 346 368 352 444 330C512 310 576 312 640 338V420H0Z" fill="#0f172a" opacity="0.82" />

        <g opacity="0.86">
          <path d="M124 126L132 328" stroke="#1f2937" strokeWidth="18" strokeLinecap="round" />
          <path d="M132 156C162 150 188 138 206 116" stroke="#27473a" strokeWidth="12" strokeLinecap="round" />
          <path d="M132 188C168 194 198 188 226 166" stroke="#27473a" strokeWidth="11" strokeLinecap="round" />
          <path d="M504 136L494 338" stroke="#1f2937" strokeWidth="20" strokeLinecap="round" />
          <path d="M494 172C458 166 424 154 392 126" stroke="#263646" strokeWidth="12" strokeLinecap="round" />
        </g>

        <path d="M164 118C228 128 284 176 320 228" fill="none" stroke={palette.accent} strokeWidth="5" strokeLinecap="round" strokeDasharray="9 10" opacity="0.94">
          <animate attributeName="stroke-dashoffset" values="0;-76" dur="3s" repeatCount="indefinite" />
        </path>

        <g transform="translate(0 0)">
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -12;0 0" dur="3.2s" repeatCount="indefinite" />
          <path d="M320 230C335 210 350 203 366 205C381 207 394 217 403 236C378 250 352 258 326 256C322 246 320 238 320 230Z" fill="#0b1020" />
          <circle cx="350" cy="191" r="22" fill="#0b1020" />
          <circle cx="359" cy="184" r="6" fill={palette.accent} opacity="0.9" />
          <path d="M340 214L332 258" stroke="#0b1020" strokeWidth="10" strokeLinecap="round" />
          <path d="M364 214L392 252" stroke="#0b1020" strokeWidth="10" strokeLinecap="round" />
          <path d="M326 232L286 246" stroke="#0b1020" strokeWidth="10" strokeLinecap="round" />
          <path d="M391 232L426 204" stroke="#0b1020" strokeWidth="10" strokeLinecap="round" />
          <path d="M426 204L456 166" stroke={palette.accent} strokeWidth="6" strokeLinecap="round" />
        </g>

        {visual.scene === 'basin' ? (
          <g opacity="0.94">
            <ellipse cx="164" cy="326" rx="94" ry="28" fill="#38bdf8" fillOpacity="0.28" />
            <ellipse cx="164" cy="326" rx="66" ry="16" fill="#7dd3fc" fillOpacity="0.2">
              <animate attributeName="rx" values="60;72;60" dur="4.2s" repeatCount="indefinite" />
            </ellipse>
          </g>
        ) : null}

        {visual.scene === 'cave' ? (
          <g opacity="0.92">
            <path d="M468 86L510 154L430 154Z" fill="#fbbf24" fillOpacity="0.24" />
            <path d="M118 132L154 198L86 198Z" fill="#fbbf24" fillOpacity="0.18" />
          </g>
        ) : null}

        {visual.scene === 'magma' ? (
          <g opacity="0.94">
            <path d="M78 364C112 332 136 320 168 320C148 350 144 372 150 392H88C82 382 78 374 78 364Z" fill="#fb923c" fillOpacity="0.44">
              <animate attributeName="d" dur="3.4s" repeatCount="indefinite" values="M78 364C112 332 136 320 168 320C148 350 144 372 150 392H88C82 382 78 374 78 364Z;M78 368C112 324 138 314 170 316C146 348 144 376 154 392H88C82 384 78 376 78 368Z;M78 364C112 332 136 320 168 320C148 350 144 372 150 392H88C82 382 78 374 78 364Z" />
            </path>
            <path d="M520 352C548 326 576 320 606 326C592 348 590 372 596 392H534C524 380 518 368 520 352Z" fill="#f97316" fillOpacity="0.36" />
          </g>
        ) : null}
      </svg>

      <div className="pointer-events-none absolute inset-x-5 top-5 flex items-start justify-between gap-3">
        <div className={`rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] ${palette.chip}`}>
          {visual.accentWord ?? 'Story'}
        </div>
        <div className="flex items-start gap-2">
          <div className="rounded-full border border-white/15 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
            {visual.speaker}
          </div>
          {speaker ? <StoryCastPortrait characterId={speaker.id} scene={visual.scene} size={64} priority="primary" /> : null}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 max-w-[78%] rounded-[1.2rem] border border-white/15 bg-slate-950/82 px-4 py-3 shadow-2xl shadow-black/40">
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Panel Caption</div>
        <div className="mt-1 text-sm font-semibold leading-relaxed text-white">{visual.caption}</div>
      </div>

      {(speaker || support) ? (
        <div className="pointer-events-none absolute bottom-4 right-4 flex items-end -space-x-3">
          {support ? <StoryCastPortrait characterId={support.id} scene={visual.scene} size={56} priority="support" className="mb-5" /> : null}
          {speaker ? <StoryCastPortrait characterId={speaker.id} scene={visual.scene} size={72} priority="primary" /> : null}
        </div>
      ) : null}
    </div>
  );
}

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
  const isLastBeat = beatIndex >= beatCount - 1;
  const parsedLines = beat.body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const panelAccent = isLastBeat
    ? 'from-emerald-200/25 via-cyan-200/10 to-sky-200/18'
    : 'from-fuchsia-200/20 via-emerald-200/12 to-cyan-200/18';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center px-6 font-ui">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,18,0.08),rgba(5,10,18,0.34))]" />

      <div className="pointer-events-auto relative w-full max-w-5xl overflow-hidden rounded-[1.6rem] border border-white/20 bg-slate-950/88 text-white">
        <div className="absolute inset-x-0 top-0 h-full border border-white/25/10 pointer-events-none">
          <svg className="h-full w-full" viewBox="0 0 1200 520" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="comic-frame" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(125,211,252,0.22)" />
                <stop offset="48%" stopColor="rgba(45,212,191,0.12)" />
                <stop offset="100%" stopColor="rgba(196,181,253,0.18)" />
              </linearGradient>
            </defs>
            <path d="M8 12H1192V508H8Z" fill="none" stroke="url(#comic-frame)" strokeWidth="4" />
            <path d="M20 22H1180V498H20Z" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
            <path d="M420 24H490V498" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="2" />
            <path d="M760 24H830V498" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="2" />
            <circle cx="260" cy="86" r="12" fill="rgba(56,189,248,0.26)" />
            <circle cx="970" cy="86" r="10" fill="rgba(168,85,247,0.22)" />
            <path d="M540 24L540 498" fill="none" stroke="rgba(251,191,36,0.15)" strokeWidth="1" strokeDasharray="10 10" />
          </svg>
        </div>

        <div className="relative overflow-hidden p-6 md:p-7">
          <div className="pointer-events-none absolute -left-2 top-5 rounded-full border border-emerald-200/25 bg-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.36em] text-emerald-100">
            {regionLabel ?? 'Unknown Camp'}
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-200">
              <span className="atlas-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5">
                <BookOpen size={14} />
                Story Map
              </span>
              <span className="atlas-chip rounded-full px-3 py-1.5">
                Beat {beatIndex + 1}/{beatCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/20 bg-cyan-500/12 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
                <Minus size={12} />
                {`FRAME ${String(beatIndex + 1).padStart(2, '0')}`}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
              <span className="inline-flex items-center gap-1">
                <Plus size={12} />
                Comic Motion
              </span>
            </div>
          </div>

          <div className={`rounded-[1.2rem] border border-white/15 bg-gradient-to-r ${panelAccent} px-5 py-4`}>
            <div className="text-xs font-black uppercase tracking-[0.34em] text-cyan-100/90">{beat.kicker ?? beat.title}</div>
            <h2 className="atlas-title mt-1 text-4xl text-white">{beat.title}</h2>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr),minmax(280px,0.85fr)]">
            <StoryPanelArt beat={beat} />
            <div className="atlas-surface-soft rounded-[1.2rem] border border-white/12 px-5 py-4">
              <div className="atlas-map-label text-[10px] text-slate-400">Narrative panel</div>
              <div className="relative mt-2 rounded-2xl border border-white/12 bg-slate-950/55 p-4">
                <span className="pointer-events-none absolute -left-3 top-5 h-5 w-5 rotate-45 rounded-sm border border-white/20 bg-slate-950/65" />
                <div className="space-y-2 text-[1.06rem] leading-relaxed text-slate-200">
                  {parsedLines.length > 0 ? parsedLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>) : <p>{beat.body}</p>}
                </div>
                {beat.hint ? <div className="mt-3 text-sm font-medium text-cyan-100">{beat.hint}</div> : null}
              </div>

              {beat.visual?.characterId ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Crew voices</div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <StoryCastPortrait characterId={beat.visual.characterId} scene={beat.visual.scene} size={64} showLabel />
                    {beat.visual.supportCharacterId ? (
                      <StoryCastPortrait characterId={beat.visual.supportCharacterId} scene={beat.visual.scene} size={56} showLabel className="opacity-90" />
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="atlas-map-label mt-4 text-[10px] text-slate-400">Beat map</div>
              <div className="mt-2 grid gap-2 text-xs uppercase tracking-[0.22em] text-white/80">
                <div className="rounded-xl border border-emerald-200/20 bg-emerald-500/10 px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    Current camp focus
                  </span>
                  <div className="mt-1 font-black text-lg text-white">{beat.id}</div>
                </div>
                <div className="rounded-xl border border-cyan-200/20 bg-cyan-500/10 px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-cyan-200">
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                    Atlas lane
                  </span>
                  <div className="mt-1 font-black text-lg text-white">{beat.regionId}</div>
                </div>
                <div className="rounded-xl border border-fuchsia-200/20 bg-fuchsia-500/10 px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-fuchsia-200">
                    <span className="h-2 w-2 rounded-full bg-fuchsia-300" />
                    Progress
                  </span>
                  <div className="mt-1 font-black text-base text-white">{Math.round(((beatIndex + 1) / beatCount) * 100)}%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2.5">
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
                {isLastBeat ? 'Open Map' : 'Next panel'}
                <ArrowRight size={16} />
              </span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
            <span className="atlas-chip rounded-full px-2 py-1">Frame {beatIndex + 1}</span>
            <div className="inline-flex items-center gap-1.5">
              {Array.from({ length: beatCount }).map((_, index) => (
                <span
                  key={`${beat.id}-${index}`}
                  className={`h-1.5 rounded-full ${index <= beatIndex ? 'w-8 bg-emerald-300' : 'w-3 bg-white/30'}`}
                />
              ))}
            </div>
            <span className="atlas-chip rounded-full px-2 py-1">Next: {isLastBeat ? 'Atlas' : `beat ${beatIndex + 2}`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
