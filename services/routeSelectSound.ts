import { audioManager } from './audioManager';
import type { BiomeType, LevelConfig } from '../types';

type RouteSelectionSoundOptions = {
  locked?: boolean;
  muted?: boolean;
  volume?: number;
};

type RouteSoundProfile = {
  open: string;
  locked: string;
  baseFrequency: number;
};

const ROUTE_SOUND_PROFILES: Record<BiomeType, RouteSoundProfile> = {
  JUNGLE: {
    open: 'soft leafy chime, felt rope snap, cushioned canopy click',
    locked: 'muted vine tap, soft leaf rustle, padded click',
    baseFrequency: 560,
  },
  AUTUMN: {
    open: 'warm leaf rustle, brushed copper chime, soft map tap',
    locked: 'papery thunk, subdued leaf rustle, damped click',
    baseFrequency: 430,
  },
  WINTER: {
    open: 'frosted tick, breathy shimmer, softened route tap',
    locked: 'frosted thunk, muted sparkle, cautious tap',
    baseFrequency: 620,
  },
  SWAMP: {
    open: 'wet reed pluck, small ripple, damp bamboo tap',
    locked: 'muddy thunk, shallow ripple, restrained reed tap',
    baseFrequency: 300,
  },
  VOLCANO: {
    open: 'ember crackle, molten click, low rising whoosh',
    locked: 'smoldering thunk, low crackle, guarded hiss',
    baseFrequency: 760,
  },
  CAVE: {
    open: 'hollow stone ping, short echo, cushioned click',
    locked: 'dull cavern thud, low echo, sealed tap',
    baseFrequency: 240,
  },
};

const SOUND_URL_CACHE = new Map<string, string>();
const SOUND_REQUEST_CACHE = new Map<string, Promise<string | null>>();
let fallbackContext: AudioContext | null = null;

const delay = (ms: number) =>
  new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), ms);
  });

const getCacheKey = (level: LevelConfig, locked: boolean) => `${level.id}:${locked ? 'locked' : 'open'}`;

const buildRouteSelectionPrompt = (level: LevelConfig, locked: boolean) => {
  const profile = ROUTE_SOUND_PROFILES[level.biome];
  const descriptor = locked ? profile.locked : profile.open;
  const energy = locked ? 'short blocked-route' : 'short map select';
  return `A ${energy} sound for L${level.id} ${level.name}. ${descriptor}. Warm, soft-edged, tactile, game-like, under one second, no piercing highs, and comfortable for repeated UI use.`;
};

const requestRouteSelectionSound = async (level: LevelConfig, locked: boolean) => {
  const response = await fetch('/api/route-sound', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: buildRouteSelectionPrompt(level, locked),
      durationSeconds: locked ? 0.68 : 0.78,
      promptInfluence: locked ? 0.26 : 0.34,
      modelId: 'eleven_text_to_sound_v2',
      outputFormat: 'mp3_22050_32',
    }),
  });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('audio')) {
    return null;
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

const getFallbackAudioContext = () => {
  if (fallbackContext) return fallbackContext;
  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  fallbackContext = new AudioContextClass();
  return fallbackContext;
};

const playFallbackRouteSelectSound = (level: LevelConfig, locked: boolean, volume: number) => {
  const ctx = getFallbackAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const profile = ROUTE_SOUND_PROFILES[level.biome];
  const baseFrequency = profile.baseFrequency + level.difficulty * 14;
  const accentFrequency = locked ? baseFrequency * 0.82 : baseFrequency * 1.12;
  const shimmerFrequency = locked ? baseFrequency * 0.94 : baseFrequency * 1.34;
  const now = ctx.currentTime;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(locked ? 1180 : 1820, now);
  lowpass.Q.value = 0.4;
  lowpass.connect(ctx.destination);

  const makeTone = (frequency: number, type: OscillatorType, offset: number, duration: number, toneVolume: number) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, toneVolume), now + offset + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
    oscillator.connect(gain);
    gain.connect(lowpass);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + duration + 0.02);
  };

  makeTone(baseFrequency, 'triangle', 0, 0.075, volume * 0.64);
  makeTone(accentFrequency, 'sine', 0.022, 0.092, volume * 0.46);
  makeTone(shimmerFrequency, 'triangle', 0.052, 0.068, volume * 0.24);
};

export const prefetchRouteSelectSound = async (level: LevelConfig, locked: boolean) => {
  if (typeof window === 'undefined') return null;

  const key = getCacheKey(level, locked);
  const cachedUrl = SOUND_URL_CACHE.get(key);
  if (cachedUrl) return cachedUrl;

  const cachedRequest = SOUND_REQUEST_CACHE.get(key);
  if (cachedRequest) {
    return cachedRequest;
  }

  const nextRequest = requestRouteSelectionSound(level, locked)
    .then((url) => {
      if (url) SOUND_URL_CACHE.set(key, url);
      return url;
    })
    .catch(() => null);

  SOUND_REQUEST_CACHE.set(key, nextRequest);
  return nextRequest;
};

export const playRouteSelectSound = async (
  level: LevelConfig,
  options: RouteSelectionSoundOptions = {},
) => {
  if (typeof window === 'undefined' || options.muted) return false;

  const locked = options.locked ?? false;
  const volume = options.volume ?? (locked ? 0.09 : 0.13);
  const key = getCacheKey(level, locked);
  const cachedUrl = SOUND_URL_CACHE.get(key);

  if (cachedUrl) {
    audioManager.playClip(cachedUrl, volume);
    return true;
  }

  const generation = prefetchRouteSelectSound(level, locked);
  const resolvedUrl = await Promise.race([generation, delay(300)]);

  if (typeof resolvedUrl === 'string' && resolvedUrl.length > 0) {
    audioManager.playClip(resolvedUrl, volume);
    return true;
  }

  playFallbackRouteSelectSound(level, locked, volume);
  return false;
};
