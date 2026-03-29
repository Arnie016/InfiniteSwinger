import {
  AssetManifest,
  AssetVariant,
  AudioCue,
  AudioPlaylistProfile,
  BiomeType,
} from '../types';
import { GAME_ASSET_MANIFEST } from '../content';

export const AUDIO_CUES: Record<string, AudioCue> = {
  branch_break: {
    id: 'branch_break',
    category: 'sfx',
    fallbackMode: 'silent',
    variants: [
      { id: 'branch-break-local', kind: 'audio', src: '/audio/branch-break.mp3', label: 'Bundled branch break', fallbackMode: 'silent' },
    ],
  },
  leaves: {
    id: 'leaves',
    category: 'sfx',
    fallbackMode: 'silent',
    variants: [
      { id: 'leaves-local', kind: 'audio', src: '/audio/leaves-rustle.mp3', label: 'Bundled leaves rustle', fallbackMode: 'silent' },
    ],
  },
  grapple: {
    id: 'grapple',
    category: 'sfx',
    fallbackMode: 'silent',
    variants: [
      { id: 'grapple-local', kind: 'audio', src: '/audio/grapple-whip.mp3', label: 'Bundled grapple whip', fallbackMode: 'silent' },
    ],
  },
  jungle_groove: {
    id: 'jungle_groove',
    category: 'music',
    fallbackMode: 'silent',
    variants: [
      { id: 'jungle-groove-local', kind: 'audio', src: '/audio/jungle-jump-jam.mp3', label: 'Bundled jungle groove', fallbackMode: 'silent' },
    ],
  },
  swamp_groove: {
    id: 'swamp_groove',
    category: 'music',
    fallbackMode: 'silent',
    variants: [
      { id: 'swamp-groove-local', kind: 'audio', src: '/audio/swamp-dub-groove.mp3', label: 'Bundled swamp groove', fallbackMode: 'silent' },
    ],
  },
  volcano_groove: {
    id: 'volcano_groove',
    category: 'music',
    fallbackMode: 'silent',
    variants: [
      { id: 'volcano-groove-local', kind: 'audio', src: '/audio/volcano-breaker-groove.mp3', label: 'Bundled volcano groove', fallbackMode: 'silent' },
    ],
  },
};

export const AUDIO_PLAYLISTS: Record<BiomeType, AudioPlaylistProfile> = {
  JUNGLE: { biome: 'JUNGLE', cues: ['jungle_groove'], rateRange: [0.96, 1.03], startOffsets: [0, 4.5, 9] },
  AUTUMN: { biome: 'AUTUMN', cues: ['jungle_groove'], rateRange: [0.97, 1.02], startOffsets: [0, 6] },
  WINTER: { biome: 'WINTER', cues: ['jungle_groove'], rateRange: [0.94, 0.99], startOffsets: [0, 8] },
  SWAMP: { biome: 'SWAMP', cues: ['swamp_groove'], rateRange: [0.94, 1.01], startOffsets: [0, 7, 14] },
  VOLCANO: { biome: 'VOLCANO', cues: ['volcano_groove'], rateRange: [0.98, 1.06], startOffsets: [0, 5, 10] },
  CAVE: { biome: 'CAVE', cues: ['swamp_groove'], rateRange: [0.92, 0.98], startOffsets: [0, 8, 12] },
};

export const resolvePreferredVariant = (
  variants: AssetVariant[] | undefined,
  preferredKind?: AssetVariant['kind'],
): AssetVariant | null => {
  if (!variants || variants.length === 0) return null;
  if (preferredKind) {
    const exact = variants.find((variant) => variant.kind === preferredKind && variant.src);
    if (exact) return exact;
  }
  return variants.find((variant) => Boolean(variant.src)) ?? variants[0];
};

export const resolveAssetSetVariant = (
  manifest: AssetManifest,
  setId: string,
  slot: string,
  preferredKind?: AssetVariant['kind'],
): AssetVariant | null => {
  const set = manifest.sets[setId];
  if (!set) return null;
  return resolvePreferredVariant(set.variants[slot], preferredKind);
};

export const getBundledMonkeySprite = () =>
  resolveAssetSetVariant(GAME_ASSET_MANIFEST, 'monkey-core', 'sprite', 'image')?.src ?? null;

export const resolveAudioCueUrl = (cueId: keyof typeof AUDIO_CUES | string) =>
  resolvePreferredVariant(AUDIO_CUES[cueId]?.variants, 'audio')?.src ?? null;

export const pickMusicProfileForBiome = (biome: BiomeType, sessionSeed: number) => {
  const playlist = AUDIO_PLAYLISTS[biome];
  const cueId = playlist.cues[Math.abs(sessionSeed) % playlist.cues.length];
  const url = resolveAudioCueUrl(cueId);
  const offset = playlist.startOffsets[Math.abs(sessionSeed + 1) % playlist.startOffsets.length] ?? 0;
  const [minRate, maxRate] = playlist.rateRange;
  const normalized = ((sessionSeed % 97) + 97) % 97 / 96;
  const rate = Number((minRate + (maxRate - minRate) * normalized).toFixed(3));
  return {
    url,
    rate,
    startOffset: offset,
    signature: `${biome}|${cueId}|${rate}|${offset}|${sessionSeed}`,
  };
};
