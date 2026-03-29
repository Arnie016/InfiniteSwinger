import localforage from 'localforage';

import { LevelResult, PlayerMoodPreset, SaveBackupV1, SaveData, SwingLabConfig } from '../types';
import { SAVE_DATA_VERSION } from '../engine/config';
import { withDerivedProgression } from '../engine/playerProfile';
import { sanitizeSwingLabConfig } from '../engine/swingLab';

const SAVE_KEY = 'polyjungle_save_v4';
const LEGACY_SAVE_KEY = 'polyjungle_save_v2';

const saveStore = localforage.createInstance({
  name: 'polyjungle-swing',
  storeName: 'save_data',
  description: 'Persistent save data for Infinite Swinger',
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const getString = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.length > 0 ? value : fallback;
const getBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

const getRecord = (value: unknown) => (isObject(value) ? value : {});

const getLegacyIntroFlag = () => {
  if (typeof window === 'undefined') return false;

  try {
    const raw = window.localStorage.getItem('polyjungle_ui_preferences_v1');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.hasSeenIntro === true;
  } catch {
    return false;
  }
};

export const clearPersistedSaveData = async (): Promise<void> => {
  await saveStore.removeItem(SAVE_KEY);

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LEGACY_SAVE_KEY);
  }
};

const normalizeMoodPreset = (value: unknown, fallback: PlayerMoodPreset): PlayerMoodPreset => {
  switch (value) {
    case 'Relaxed':
    case 'Balanced':
    case 'Aggressive':
    case 'Precision':
    case 'Custom':
      return value;
    default:
      return fallback;
  }
};

const normalizeRopeType = (value: unknown, fallback: SaveData['equippedRopeType']): SaveData['equippedRopeType'] => {
  switch (value) {
    case 'vine':
    case 'braid':
    case 'chain':
    case 'silk':
      return value;
    default:
      return fallback;
  }
};

const normalizeSwingLabConfig = (
  raw: unknown,
  fallback: SwingLabConfig | null,
): SwingLabConfig | null => {
  if (!isObject(raw)) return fallback;

  const base = fallback ?? {
    gravity: 0.76,
    airResistance: 0.9968,
    swingAirResistance: 0.9984,
    swingMomentumRetention: 0.9986,
    groundFriction: 0.88,
    maxSpeed: 46,
    ropeReelSpring: 0.12,
    ropeReelDamping: 0.86,
    ropeReelMaxSpeed: 6.2,
    musicVolume: 0.14,
  };

  return sanitizeSwingLabConfig({
    gravity: getNumber(raw.gravity, base.gravity),
    airResistance: getNumber(raw.airResistance, base.airResistance),
    swingAirResistance: getNumber(raw.swingAirResistance, base.swingAirResistance),
    swingMomentumRetention: getNumber(raw.swingMomentumRetention, base.swingMomentumRetention),
    groundFriction: getNumber(raw.groundFriction, base.groundFriction),
    maxSpeed: getNumber(raw.maxSpeed, base.maxSpeed),
    ropeReelSpring: getNumber(raw.ropeReelSpring, base.ropeReelSpring),
    ropeReelDamping: getNumber(raw.ropeReelDamping, base.ropeReelDamping),
    ropeReelMaxSpeed: getNumber(raw.ropeReelMaxSpeed, base.ropeReelMaxSpeed),
    musicVolume: getNumber(raw.musicVolume, base.musicVolume),
  });
};

const normalizeLevelResult = (raw: unknown): LevelResult | null => {
  if (!isObject(raw)) return null;

  return {
    bestScore: getNumber(raw.bestScore, 0),
    bestTimeMs: typeof raw.bestTimeMs === 'number' && Number.isFinite(raw.bestTimeMs) ? raw.bestTimeMs : null,
    firstClearedAt: typeof raw.firstClearedAt === 'string' ? raw.firstClearedAt : null,
    stars: Math.max(0, getNumber(raw.stars, 0)),
    clears: Math.max(0, getNumber(raw.clears, 0)),
  };
};

export const normalizeSaveData = (raw: unknown, fallback: SaveData): SaveData => {
  if (!isObject(raw)) return fallback;

  const upgrades = isObject(raw.upgrades) ? raw.upgrades : {};
  const settings = isObject(raw.settings) ? raw.settings : {};
  const levelResultsRaw = getRecord(raw.levelResults);
  const skins =
    Array.isArray(raw.skins) && raw.skins.every((skin): skin is string => typeof skin === 'string')
      ? raw.skins
      : fallback.skins;
  const levelResults = Object.entries(levelResultsRaw).reduce<Record<string, LevelResult>>((acc, [key, value]) => {
    const normalized = normalizeLevelResult(value);
    if (normalized) acc[key] = normalized;
    return acc;
  }, {});

  const normalized: SaveData = {
    version: Math.max(1, getNumber(raw.version, SAVE_DATA_VERSION)),
    totalTokens: getNumber(raw.totalTokens, fallback.totalTokens),
    highScore: getNumber(raw.highScore, fallback.highScore),
    maxLevelReached: Math.max(1, getNumber(raw.maxLevelReached, fallback.maxLevelReached)),
    skins,
    equippedSkin: getString(raw.equippedSkin, fallback.equippedSkin),
    ropeTypes:
      Array.isArray(raw.ropeTypes) && raw.ropeTypes.every((entry): entry is SaveData['equippedRopeType'] => entry === 'vine' || entry === 'braid' || entry === 'chain' || entry === 'silk')
        ? raw.ropeTypes
        : fallback.ropeTypes,
    equippedRopeType: normalizeRopeType(raw.equippedRopeType, fallback.equippedRopeType),
    hasCompletedStoryIntro: getBoolean(raw.hasCompletedStoryIntro, fallback.hasCompletedStoryIntro || getLegacyIntroFlag()),
    selectedMoodPreset: normalizeMoodPreset(raw.selectedMoodPreset, fallback.selectedMoodPreset),
    customSwingLabConfig: normalizeSwingLabConfig(raw.customSwingLabConfig, fallback.customSwingLabConfig),
    achievements:
      Array.isArray(raw.achievements) && raw.achievements.every((entry): entry is string => typeof entry === 'string')
        ? raw.achievements
        : fallback.achievements,
    lastSelectedLevelId: Math.max(1, getNumber(raw.lastSelectedLevelId, fallback.lastSelectedLevelId)),
    settings: {
      masterVolume: Math.max(0, Math.min(1, getNumber(settings.masterVolume, fallback.settings.masterVolume))),
      musicVolume: Math.max(0, Math.min(1, getNumber(settings.musicVolume, fallback.settings.musicVolume))),
      sfxVolume: Math.max(0, Math.min(1, getNumber(settings.sfxVolume, fallback.settings.sfxVolume))),
      hudDensity:
        settings.hudDensity === 'compact'
          ? 'compact'
          : settings.hudDensity === 'hidden'
          ? 'hidden'
          : fallback.settings.hudDensity,
      motionIntensity: settings.motionIntensity === 'reduced' ? 'reduced' : fallback.settings.motionIntensity,
      mapClarity: Math.max(0.35, Math.min(1, getNumber(settings.mapClarity, fallback.settings.mapClarity))),
      visualDensity:
        settings.visualDensity === 'lush'
          ? 'lush'
          : settings.visualDensity === 'clean'
          ? 'clean'
          : fallback.settings.visualDensity,
      mapCameraStyle:
        settings.mapCameraStyle === 'steady'
          ? 'steady'
          : settings.mapCameraStyle === 'dynamic'
          ? 'dynamic'
          : fallback.settings.mapCameraStyle,
      mapFxIntensity:
        settings.mapFxIntensity === 'low'
          ? 'low'
          : settings.mapFxIntensity === 'medium'
          ? 'medium'
          : fallback.settings.mapFxIntensity,
      depthFocus:
        settings.depthFocus === 'off'
          ? 'off'
          : settings.depthFocus === 'subtle'
          ? 'subtle'
          : fallback.settings.depthFocus,
      gameplayCameraShake:
        settings.gameplayCameraShake === 'off'
          ? 'off'
          : settings.gameplayCameraShake === 'reduced'
          ? 'reduced'
          : fallback.settings.gameplayCameraShake,
      menuParallax: settings.menuParallax === 'off' ? 'off' : settings.menuParallax === 'on' ? 'on' : fallback.settings.menuParallax,
    },
    levelResults,
    upgrades: {
      ropeLength: getNumber(upgrades.ropeLength, fallback.upgrades.ropeLength),
      swingForce: getNumber(upgrades.swingForce, fallback.upgrades.swingForce),
      armor: getNumber(upgrades.armor, fallback.upgrades.armor),
      magnetism: getNumber(upgrades.magnetism, fallback.upgrades.magnetism),
      feverDuration: getNumber(upgrades.feverDuration, fallback.upgrades.feverDuration),
      luck: getNumber(upgrades.luck, fallback.upgrades.luck),
      launchBoost: getNumber(upgrades.launchBoost, fallback.upgrades.launchBoost),
      airControl: getNumber(upgrades.airControl, fallback.upgrades.airControl),
      safetyNet: getNumber(upgrades.safetyNet, fallback.upgrades.safetyNet),
      grip: getNumber(upgrades.grip, fallback.upgrades.grip),
      castRange: getNumber(upgrades.castRange, fallback.upgrades.castRange),
      branchMastery: getNumber(upgrades.branchMastery, fallback.upgrades.branchMastery),
      hazardResist: getNumber(upgrades.hazardResist, fallback.upgrades.hazardResist),
    },
  };

  if (
    normalized.maxLevelReached === 10 &&
    normalized.totalTokens === 0 &&
    normalized.highScore === 0
  ) {
    normalized.maxLevelReached = 1;
  }

  normalized.version = SAVE_DATA_VERSION;

  return withDerivedProgression(normalized);
};

export const createSaveBackup = (saveData: SaveData): SaveBackupV1 => ({
  version: SAVE_DATA_VERSION,
  exportedAt: new Date().toISOString(),
  saveData,
});

export const parseSaveBackup = (raw: string, fallback: SaveData): SaveData => {
  const parsed = JSON.parse(raw) as unknown;
  if (!isObject(parsed)) return fallback;
  const candidate = isObject(parsed.saveData) ? parsed.saveData : parsed;
  return normalizeSaveData(candidate, fallback);
};

export const loadSaveData = async (
  fallback: SaveData,
): Promise<{ saveData: SaveData; recoveryNotice: string | null }> => {
  try {
    const stored = await saveStore.getItem<unknown>(SAVE_KEY);
    if (stored) {
      return {
        saveData: normalizeSaveData(stored, fallback),
        recoveryNotice: null,
      };
    }
  } catch (error) {
    console.warn('Failed to read IndexedDB save data', error);
    await clearPersistedSaveData();
    return {
      saveData: fallback,
      recoveryNotice: 'Save data was corrupted and was reset. You can export or import a backup in Settings > Data.',
    };
  }

  if (typeof window === 'undefined') {
    return {
      saveData: fallback,
      recoveryNotice: null,
    };
  }

  const legacyRaw = window.localStorage.getItem(LEGACY_SAVE_KEY);
  if (!legacyRaw) {
    return {
      saveData: fallback,
      recoveryNotice: null,
    };
  }

  try {
    const migrated = normalizeSaveData(JSON.parse(legacyRaw), fallback);
    await saveStore.setItem(SAVE_KEY, migrated);
    return {
      saveData: migrated,
      recoveryNotice: null,
    };
  } catch (error) {
    console.warn('Failed to migrate legacy localStorage save', error);
    await clearPersistedSaveData();
    return {
      saveData: fallback,
      recoveryNotice: 'Save data was corrupted and was reset. You can export or import a backup in Settings > Data.',
    };
  }
};

export const persistSaveData = async (saveData: SaveData): Promise<void> => {
  await saveStore.setItem(SAVE_KEY, saveData);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LEGACY_SAVE_KEY, JSON.stringify(saveData));
  }
};
