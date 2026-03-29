import {
  AssetManifest,
  BiomeSceneProfileRegistry,
  BiomeType,
  ThemeProfile,
} from '../types';

export const THEME_PROFILES: Record<BiomeType, ThemeProfile> = {
  JUNGLE: {
    biome: 'JUNGLE',
    skyColors: ['#0F2027', '#203A43'],
    treeColor: '#2E7D32',
    groundColor: '#1B5E20',
    particle: 'none',
    hazeColor: 'rgba(102, 255, 207, 0.10)',
    accentColor: '#7fffd4',
    anchorColor: '#8fe7c9',
    backgroundDensity: 1.1,
    assetSetId: 'jungle-core',
  },
  AUTUMN: {
    biome: 'AUTUMN',
    skyColors: ['#FF7043', '#FFCCBC'],
    treeColor: '#D84315',
    groundColor: '#FFAB91',
    particle: 'leaf',
    hazeColor: 'rgba(255, 191, 128, 0.12)',
    accentColor: '#ffb36b',
    anchorColor: '#ffd0a2',
    backgroundDensity: 0.95,
    assetSetId: 'autumn-core',
  },
  WINTER: {
    biome: 'WINTER',
    skyColors: ['#B3E5FC', '#E1F5FE'],
    treeColor: '#81D4FA',
    groundColor: '#E1F5FE',
    particle: 'snow',
    hazeColor: 'rgba(224, 242, 254, 0.14)',
    accentColor: '#d9f6ff',
    anchorColor: '#f4fcff',
    backgroundDensity: 0.9,
    assetSetId: 'winter-core',
  },
  SWAMP: {
    biome: 'SWAMP',
    skyColors: ['#263238', '#37474F'],
    treeColor: '#33691E',
    groundColor: '#1B5E20',
    particle: 'rain',
    hazeColor: 'rgba(143, 211, 188, 0.12)',
    accentColor: '#8ae6cf',
    anchorColor: '#b5f7e0',
    backgroundDensity: 1.05,
    assetSetId: 'swamp-core',
  },
  VOLCANO: {
    biome: 'VOLCANO',
    skyColors: ['#3E0000', '#B71C1C'],
    treeColor: '#3E2723',
    groundColor: '#BF360C',
    particle: 'ash',
    hazeColor: 'rgba(255, 132, 74, 0.16)',
    accentColor: '#ff9b66',
    anchorColor: '#ffd2a3',
    backgroundDensity: 1.15,
    assetSetId: 'volcano-core',
  },
  CAVE: {
    biome: 'CAVE',
    skyColors: ['#1a1a1d', '#2d2d30'],
    treeColor: '#546E7A',
    groundColor: '#37474F',
    particle: 'none',
    hazeColor: 'rgba(168, 184, 196, 0.10)',
    accentColor: '#d6dfeb',
    anchorColor: '#d9f6ff',
    backgroundDensity: 1,
    assetSetId: 'cave-core',
  },
};

export const BIOMES = Object.fromEntries(
  Object.entries(THEME_PROFILES).map(([biome, theme]) => [
    biome,
    {
      skyColors: theme.skyColors,
      treeColor: theme.treeColor,
      groundColor: theme.groundColor,
      particle: theme.particle,
    },
  ]),
) as Record<
  BiomeType,
  { skyColors: [string, string]; treeColor: string; groundColor: string; particle: string }
>;

export const BIOME_SCENE_PROFILES: BiomeSceneProfileRegistry = {
  JUNGLE: {
    biome: 'JUNGLE',
    themeId: 'jungle-core',
    hazeStrength: 0.3,
    propDensity: 1.15,
    fallbackProps: ['fronds', 'glow_motes', 'canopy_bands'],
    premiumProps: ['painted-canopy-card', 'vine-flowers'],
  },
  AUTUMN: {
    biome: 'AUTUMN',
    themeId: 'autumn-core',
    hazeStrength: 0.22,
    propDensity: 0.9,
    fallbackProps: ['leaf-bands', 'warm-haze'],
    premiumProps: ['painted-grove-card'],
  },
  WINTER: {
    biome: 'WINTER',
    themeId: 'winter-core',
    hazeStrength: 0.28,
    propDensity: 0.8,
    fallbackProps: ['snow-bands', 'ice-flares'],
    premiumProps: ['painted-ice-card'],
  },
  SWAMP: {
    biome: 'SWAMP',
    themeId: 'swamp-core',
    hazeStrength: 0.36,
    propDensity: 1.05,
    fallbackProps: ['mist-bands', 'spores', 'wet-reeds'],
    premiumProps: ['painted-swamp-card', 'lilypad-pack'],
  },
  VOLCANO: {
    biome: 'VOLCANO',
    themeId: 'volcano-core',
    hazeStrength: 0.44,
    propDensity: 1.12,
    fallbackProps: ['ash-bands', 'lava-glow', 'cliff-cutouts'],
    premiumProps: ['painted-volcano-card', 'core-ornaments'],
  },
  CAVE: {
    biome: 'CAVE',
    themeId: 'cave-core',
    hazeStrength: 0.3,
    propDensity: 1,
    fallbackProps: ['torch-glows', 'wet-rock-bands', 'stalactites'],
    premiumProps: ['painted-cave-card', 'ore-lights'],
  },
};

export const GAME_ASSET_MANIFEST: AssetManifest = {
  version: 1,
  sets: {
    'monkey-core': {
      id: 'monkey-core',
      label: 'Monkey core',
      variants: {
        sprite: [
          { id: 'monkey-sprite-bundled', kind: 'image', src: '/monkey-sprite-sheet.png', label: 'Bundled monkey sprite', fallbackMode: 'procedural' },
          { id: 'monkey-procedural', kind: 'procedural', label: 'Procedural monkey fallback', fallbackMode: 'procedural' },
        ],
      },
    },
    'jungle-core': {
      id: 'jungle-core',
      label: 'Jungle scene',
      variants: {
        backdrop: [{ id: 'jungle-procedural', kind: 'procedural', label: 'Procedural canopy scene', fallbackMode: 'procedural' }],
      },
    },
    'swamp-core': {
      id: 'swamp-core',
      label: 'Swamp scene',
      variants: {
        backdrop: [{ id: 'swamp-procedural', kind: 'procedural', label: 'Procedural swamp scene', fallbackMode: 'procedural' }],
      },
    },
    'cave-core': {
      id: 'cave-core',
      label: 'Cave scene',
      variants: {
        backdrop: [{ id: 'cave-procedural', kind: 'procedural', label: 'Procedural cave scene', fallbackMode: 'procedural' }],
      },
    },
    'volcano-core': {
      id: 'volcano-core',
      label: 'Volcano scene',
      variants: {
        backdrop: [{ id: 'volcano-procedural', kind: 'procedural', label: 'Procedural volcano scene', fallbackMode: 'procedural' }],
      },
    },
    'market-ui': {
      id: 'market-ui',
      label: 'Monkey Market ornaments',
      variants: {
        emblem: [{ id: 'market-procedural', kind: 'procedural', label: 'Procedural bazaar emblem', fallbackMode: 'procedural' }],
      },
    },
    'checkpoint-core': {
      id: 'checkpoint-core',
      label: 'Checkpoint markers',
      variants: {
        marker: [{ id: 'checkpoint-procedural', kind: 'procedural', label: 'Procedural checkpoint marker', fallbackMode: 'procedural' }],
      },
    },
  },
};
