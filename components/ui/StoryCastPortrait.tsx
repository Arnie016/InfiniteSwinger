import React from 'react';

import { STORY_CAST, STORY_SCENE_PALETTE, getStoryCharacterProfile } from '../../content/storyCast';
import { StoryCastId, StoryPanelScene } from '../../types';

type Props = {
  characterId?: StoryCastId | null;
  scene: StoryPanelScene;
  size?: number;
  priority?: 'primary' | 'support';
  showLabel?: boolean;
  className?: string;
};

const sizeClasses = {
  56: 'h-14 w-14',
  64: 'h-16 w-16',
  72: 'h-[4.5rem] w-[4.5rem]',
  88: 'h-[5.5rem] w-[5.5rem]',
} as const;

export function StoryCastPortrait({
  characterId,
  scene,
  size = 64,
  priority = 'primary',
  showLabel = false,
  className = '',
}: Props) {
  const gradientIdSeed = React.useId().replace(/:/g, '');
  const profile = getStoryCharacterProfile(characterId);
  if (!profile) return null;

  const scenePalette = STORY_SCENE_PALETTE[scene];
  const tone = priority === 'primary' ? 'border-white/20 bg-slate-950/78' : 'border-white/10 bg-slate-950/68';
  const sizeClass = sizeClasses[size as keyof typeof sizeClasses] ?? 'h-16 w-16';
  const gradientId = `story-cast-${profile.id}-${gradientIdSeed}`;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[1.3rem] border ${tone} ${sizeClass} shadow-2xl shadow-black/35`}
        style={{
          backgroundImage: `radial-gradient(circle at 32% 28%, ${profile.palette.glow}, transparent 55%), linear-gradient(180deg, ${scenePalette.skyFrom}, ${scenePalette.skyTo})`,
        }}
      >
        <svg className="h-full w-full" viewBox="0 0 96 96" aria-hidden="true" role="presentation">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={profile.palette.primary} />
              <stop offset="100%" stopColor={profile.palette.secondary} />
            </linearGradient>
          </defs>
          <circle cx="48" cy="48" r="46" fill={`url(#${gradientId})`} opacity="0.92" />
          <ellipse cx="46" cy="82" rx="30" ry="19" fill="#09111f" opacity="0.88" />
          <path d="M28 78C33 58 41 48 52 48C63 48 72 58 77 78H28Z" fill={profile.palette.secondary} />
          <path d="M36 44C36 29 45 18 58 18C70 18 78 28 78 43C78 54 71 62 58 62C45 62 36 54 36 44Z" fill="#0b1020" />
          <path d="M41 48C43 35 50 28 58 28C66 28 72 35 73 47C72 55 66 61 58 61C50 61 44 56 41 48Z" fill={profile.palette.accent} />
          <path d="M35 39C40 22 50 14 61 14C74 14 82 23 82 37C77 30 71 27 64 27C56 27 49 30 42 37C39 39 37 40 35 39Z" fill="#0b1020" />
          <circle cx="54" cy="46" r="2.8" fill="#0b1020" />
          <circle cx="67" cy="46" r="2.8" fill="#0b1020" />
          <path d="M57 54C60 56 63 56 66 54" fill="none" stroke="#0b1020" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M25 67C31 61 38 58 45 58" fill="none" stroke={profile.palette.primary} strokeWidth="4" strokeLinecap="round" />
          <path d="M74 63C81 54 87 48 92 45" fill="none" stroke={scenePalette.accent} strokeWidth="4" strokeLinecap="round" />
          <circle cx="88" cy="42" r="5" fill={scenePalette.accent} opacity="0.95" />
        </svg>
        <div className="absolute inset-x-2 bottom-1 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-center text-[8px] font-black uppercase tracking-[0.24em] text-white/80">
          {profile.callSign}
        </div>
      </div>

      {showLabel ? (
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">{profile.role}</div>
          <div className="truncate text-sm font-semibold text-white">{profile.name}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-slate-300">{profile.signatureMove}</div>
        </div>
      ) : null}
    </div>
  );
}

export const STORY_CAST_LIBRARY = STORY_CAST;
