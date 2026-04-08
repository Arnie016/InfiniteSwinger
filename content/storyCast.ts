import { StoryCastId, StoryPanelScene } from '../types';

export type StoryCharacterProfile = {
  id: StoryCastId;
  name: string;
  callSign: string;
  role: string;
  shortBio: string;
  signatureMove: string;
  homeScene: StoryPanelScene;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
  };
};

export const STORY_SCENE_PALETTE: Record<
  StoryPanelScene,
  {
    skyFrom: string;
    skyTo: string;
    glow: string;
    ridge: string;
    land: string;
    accent: string;
    chip: string;
  }
> = {
  camp: {
    skyFrom: '#103f30',
    skyTo: '#08131d',
    glow: '#8cf5c8',
    ridge: '#173f2f',
    land: '#173f2f',
    accent: '#8cf5c8',
    chip: 'text-emerald-100',
  },
  floodline: {
    skyFrom: '#134958',
    skyTo: '#0a1f29',
    glow: '#7dd3fc',
    ridge: '#19435a',
    land: '#19435a',
    accent: '#7dd3fc',
    chip: 'text-sky-100',
  },
  basin: {
    skyFrom: '#12384c',
    skyTo: '#101c2f',
    glow: '#c4b5fd',
    ridge: '#17324a',
    land: '#17324a',
    accent: '#c4b5fd',
    chip: 'text-violet-100',
  },
  cave: {
    skyFrom: '#362113',
    skyTo: '#110e14',
    glow: '#fbbf24',
    ridge: '#2c1b13',
    land: '#2c1b13',
    accent: '#fbbf24',
    chip: 'text-amber-100',
  },
  magma: {
    skyFrom: '#4a1a18',
    skyTo: '#150d14',
    glow: '#fb923c',
    ridge: '#4b2319',
    land: '#4b2319',
    accent: '#fb923c',
    chip: 'text-orange-100',
  },
};

export const STORY_CAST_ORDER: StoryCastId[] = ['nara', 'ivo', 'pell', 'suri', 'lyra', 'kellan', 'chorus'];

export const STORY_CAST: Record<StoryCastId, StoryCharacterProfile> = {
  nara: {
    id: 'nara',
    name: 'Scout Nara',
    callSign: 'First line',
    role: 'Forward scout',
    shortBio: 'Reads branch stress early and always spots the clean escape before the ash front closes.',
    signatureMove: 'Fast first mark on a fresh route.',
    homeScene: 'camp',
    palette: {
      primary: '#8cf5c8',
      secondary: '#16392e',
      accent: '#dcfce7',
      glow: 'rgba(140,245,200,0.32)',
    },
  },
  ivo: {
    id: 'ivo',
    name: 'Rope Chief Ivo',
    callSign: 'Arc keeper',
    role: 'Swing coach',
    shortBio: 'Turns panic into rhythm and drills the crew until every release feels intentional.',
    signatureMove: 'Clean recovery chains through bad weather.',
    homeScene: 'floodline',
    palette: {
      primary: '#7dd3fc',
      secondary: '#12384d',
      accent: '#e0f2fe',
      glow: 'rgba(125,211,252,0.28)',
    },
  },
  pell: {
    id: 'pell',
    name: 'Quartermaster Pell',
    callSign: 'Greed meter',
    role: 'Upgrade broker',
    shortBio: 'Counts tokens, sells risk, and knows exactly when a greedy branch pays for the next biome.',
    signatureMove: 'Reward-route planning and loadout pivots.',
    homeScene: 'basin',
    palette: {
      primary: '#c4b5fd',
      secondary: '#2a2148',
      accent: '#f5f3ff',
      glow: 'rgba(196,181,253,0.28)',
    },
  },
  suri: {
    id: 'suri',
    name: 'Trail Warden Suri',
    callSign: 'Trap reader',
    role: 'Hazard pathfinder',
    shortBio: 'Calls fake-safe lanes early and teaches the crew where loud branches hide the real punishment.',
    signatureMove: 'Late-route hazard reads without dropping pace.',
    homeScene: 'cave',
    palette: {
      primary: '#fbbf24',
      secondary: '#3a2410',
      accent: '#fef3c7',
      glow: 'rgba(251,191,36,0.28)',
    },
  },
  chorus: {
    id: 'chorus',
    name: 'Camp Chorus',
    callSign: 'Final push',
    role: 'Crew rally',
    shortBio: 'When the mountain wakes up, the whole camp becomes one voice and turns the run into a charge.',
    signatureMove: 'Frontier morale and finale pressure.',
    homeScene: 'magma',
    palette: {
      primary: '#fb923c',
      secondary: '#471d16',
      accent: '#ffedd5',
      glow: 'rgba(251,146,60,0.3)',
    },
  },
  lyra: {
    id: 'lyra',
    name: 'Skywarden Lyra',
    callSign: 'Wind seam',
    role: 'Crown pathguide',
    shortBio: 'Reads pressure shifts above the core and teaches when to cut a line before the gust line folds.',
    signatureMove: 'Micro-adjusting arc into narrow wind windows.',
    homeScene: 'magma',
    palette: {
      primary: '#a78bfa',
      secondary: '#29163f',
      accent: '#ddd6fe',
      glow: 'rgba(167,139,250,0.3)',
    },
  },
  kellan: {
    id: 'kellan',
    name: 'Aster Kellan',
    callSign: 'Aerial cartographer',
    role: 'Wind atlas keeper',
    shortBio: 'Studies pressure seams and charts the final arc for crews that think level checks can replace line discipline.',
    signatureMove: 'Turn weather maps into clean release windows.',
    homeScene: 'magma',
    palette: {
      primary: '#67e8f9',
      secondary: '#11313b',
      accent: '#e0f7ff',
      glow: 'rgba(103, 232, 249, 0.3)',
    },
  },
};

export const getStoryCharacterProfile = (id?: StoryCastId | null) => (id ? STORY_CAST[id] ?? null : null);
