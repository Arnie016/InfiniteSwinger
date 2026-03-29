import {
  BuildMilestone,
  CurrentBuildEntry,
  CurrentBuildSummary,
  LevelConfig,
  RopeType,
  SaveData,
} from '../types';
import { ROPE_TYPE_LABELS } from './cosmetics';

const SKIN_LABELS: Record<string, string> = {
  default: 'Trail Scout',
  skin_cyber: 'Cyber Kong',
  skin_winter: 'Yeti',
  skin_ninja: 'Ninja',
  skin_golden: 'Golden God',
};

const ROPE_TYPE_DETAILS: Record<RopeType, { label: string; description: string }> = {
  vine: { label: ROPE_TYPE_LABELS.vine, description: 'Balanced sag, grip, and recovery.' },
  braid: { label: ROPE_TYPE_LABELS.braid, description: 'Cleaner arcs and tighter control.' },
  chain: { label: ROPE_TYPE_LABELS.chain, description: 'Heavier line with stronger stability.' },
  silk: { label: ROPE_TYPE_LABELS.silk, description: 'Long reach with a smooth recovery feel.' },
};

const UPGRADE_META: Record<
  keyof SaveData['upgrades'],
  { label: string; description: string; group: 'rope' | 'movement' | 'defense' }
> = {
  ropeLength: { label: 'Rope Length', description: 'Longer vines and wider catch arcs.', group: 'rope' },
  swingForce: { label: 'Swing Force', description: 'More pump and launch power on release.', group: 'movement' },
  armor: { label: 'Armor', description: 'Extra hit protection per run.', group: 'defense' },
  magnetism: { label: 'Magnetism', description: 'Coins bend toward the run line.', group: 'movement' },
  feverDuration: { label: 'Focus', description: 'Longer recovery windows and focus uptime.', group: 'movement' },
  luck: { label: 'Luck', description: 'Higher token spikes and lucky pickups.', group: 'defense' },
  launchBoost: { label: 'Launch Boost', description: 'Stronger exit speed after release.', group: 'movement' },
  airControl: { label: 'Air Control', description: 'Cleaner recovery between swings.', group: 'movement' },
  safetyNet: { label: 'Safety Net', description: 'One emergency rescue from the void.', group: 'defense' },
  grip: { label: 'Grip', description: 'Ropes hold longer under pressure.', group: 'rope' },
  castRange: { label: 'Cast Range', description: 'Wider anchor reach and easier retargets.', group: 'rope' },
  branchMastery: { label: 'Branch Mastery', description: 'Safer resets when touching branches.', group: 'rope' },
  hazardResist: { label: 'Hazard Resist', description: 'Reduced lava, water, and hazard punishment.', group: 'defense' },
};

const milestoneDefinitions: Omit<BuildMilestone, 'unlocked'>[] = [
  { id: 'first-clear', label: 'First Clear', description: 'Finish any route once.', tone: 'emerald' },
  { id: 'route-runner', label: 'Route Runner', description: 'Finish three routes total.', tone: 'cyan' },
  { id: 'camp-smith', label: 'Camp Smith', description: 'Invest eight upgrade levels into the build.', tone: 'amber' },
  { id: 'rope-adept', label: 'Rope Adept', description: 'Develop the rope kit into a real traversal tool.', tone: 'emerald' },
  { id: 'hazard-ward', label: 'Hazard Ward', description: 'Build enough defense to shrug off bad lanes.', tone: 'rose' },
  { id: 'star-collector', label: 'Star Collector', description: 'Earn six route stars across the map.', tone: 'amber' },
  { id: 'sky-legend', label: 'Sky Legend', description: 'Push the score high enough to look serious.', tone: 'cyan' },
];

const toBuildEntry = (
  key: keyof SaveData['upgrades'],
  level: number,
): CurrentBuildEntry => ({
  key,
  label: UPGRADE_META[key].label,
  level,
  description: UPGRADE_META[key].description,
});

export const getSkinDisplayName = (skinId: string) => SKIN_LABELS[skinId] ?? skinId.replace(/^skin_/, '').replace(/_/g, ' ');

export const deriveAchievementIds = (save: SaveData): string[] => {
  const totalClears = Object.values(save.levelResults).reduce((sum, result) => sum + result.clears, 0);
  const totalStars = Object.values(save.levelResults).reduce((sum, result) => sum + result.stars, 0);
  const totalUpgradeLevels = Object.values(save.upgrades).reduce((sum, level) => sum + level, 0);
  const achievements = new Set<string>(save.achievements);

  if (totalClears >= 1) achievements.add('first-clear');
  if (totalClears >= 3) achievements.add('route-runner');
  if (totalUpgradeLevels >= 8) achievements.add('camp-smith');
  if (save.upgrades.ropeLength >= 3 || save.upgrades.grip >= 2 || save.upgrades.castRange >= 2) achievements.add('rope-adept');
  if (save.upgrades.hazardResist >= 2 || save.upgrades.armor >= 1 || save.upgrades.safetyNet >= 1) achievements.add('hazard-ward');
  if (totalStars >= 6) achievements.add('star-collector');
  if (save.highScore >= 1000) achievements.add('sky-legend');

  return [...achievements];
};

export const withDerivedProgression = (save: SaveData): SaveData => ({
  ...save,
  achievements: deriveAchievementIds(save),
});

export const getBuildMilestones = (save: SaveData): BuildMilestone[] => {
  const achievements = new Set(deriveAchievementIds(save));
  return milestoneDefinitions.map((milestone) => ({
    ...milestone,
    unlocked: achievements.has(milestone.id),
  }));
};

const filterEntries = (keys: (keyof SaveData['upgrades'])[], save: SaveData) => {
  const purchased = keys
    .map((key) => toBuildEntry(key, save.upgrades[key]))
    .filter((entry) => entry.level > 0);

  if (purchased.length > 0) return purchased.slice(0, 4);
  return [toBuildEntry(keys[0], save.upgrades[keys[0]])];
};

const deriveSynergies = (save: SaveData) => {
  const notes: string[] = [];
  if (save.upgrades.castRange >= 1 && save.upgrades.grip >= 1) {
    notes.push('Long Cast + Grip = safer retarget windows.');
  }
  if (save.upgrades.hazardResist >= 1 && save.upgrades.armor >= 1) {
    notes.push('Hazard Resist + Armor = stronger cave and lava survival.');
  }
  if (save.upgrades.magnetism >= 1 && save.upgrades.luck >= 1) {
    notes.push('Coin Magnet + Luck = reward routes pay out harder.');
  }
  if (save.upgrades.swingForce >= 1 && save.upgrades.launchBoost >= 1) {
    notes.push('Gorilla Strength + Springy Tendons = cleaner speed launches.');
  }
  if (save.upgrades.airControl >= 1 && save.upgrades.feverDuration >= 1) {
    notes.push('Air Control + Focus = calmer recoveries in dense traffic.');
  }
  if (save.upgrades.branchMastery >= 1 && save.upgrades.safetyNet >= 1) {
    notes.push('Branch Mastery + Vine Net = forgiving checkpoint saves.');
  }
  return notes.slice(0, 4);
};

const deriveGeneralRouteFitTags = (save: SaveData) => {
  const tags: string[] = [];
  if (save.upgrades.castRange >= 1 || save.upgrades.ropeLength >= 2) tags.push('Recovery catches improved');
  if (save.upgrades.swingForce >= 1 || save.upgrades.launchBoost >= 1) tags.push('Speed routes primed');
  if (save.upgrades.magnetism >= 1 || save.upgrades.luck >= 1) tags.push('Reward routes primed');
  if (save.upgrades.hazardResist >= 1 || save.upgrades.armor >= 1) tags.push('Hazard lanes stabilized');
  if (save.upgrades.branchMastery >= 1) tags.push('Branch resets safer');
  return tags.slice(0, 4);
};

const deriveRouteFitTags = (save: SaveData, selectedLevel?: LevelConfig | null) => {
  if (!selectedLevel) return deriveGeneralRouteFitTags(save);

  const tags: string[] = [];
  switch (selectedLevel.biome) {
    case 'JUNGLE':
      if (save.upgrades.ropeLength >= 1 || save.upgrades.castRange >= 1) tags.push('Open canopy catches improved');
      if (save.upgrades.swingForce >= 1) tags.push('Starter speed lines feel cleaner');
      if (save.upgrades.magnetism >= 1 || save.upgrades.luck >= 1) tags.push('Reward branches will pay off');
      break;
    case 'SWAMP':
      if (save.upgrades.hazardResist >= 1) tags.push('Water drag is less punishing');
      if (save.upgrades.castRange >= 1 || save.upgrades.airControl >= 1) tags.push('Late recoveries are safer');
      if (save.upgrades.magnetism >= 1) tags.push('Wide coin lanes are easier to harvest');
      break;
    case 'CAVE':
      if (save.upgrades.grip >= 1 || save.upgrades.branchMastery >= 1) tags.push('Forked cave lanes are easier to hold');
      if (save.upgrades.armor >= 1 || save.upgrades.hazardResist >= 1) tags.push('Troll Valley mistakes are less costly');
      if (save.upgrades.safetyNet >= 1) tags.push('Long cave drops have a rescue buffer');
      break;
    case 'VOLCANO':
      if (save.upgrades.hazardResist >= 1) tags.push('Lava and ash punishment is softened');
      if (save.upgrades.launchBoost >= 1 || save.upgrades.swingForce >= 1) tags.push('Finale pushes have real exit speed');
      if (save.upgrades.airControl >= 1 || save.upgrades.feverDuration >= 1) tags.push('Ash gust recoveries are cleaner');
      break;
    default:
      break;
  }

  if (selectedLevel.difficulty >= 6 && save.upgrades.armor === 0 && save.upgrades.hazardResist === 0) {
    tags.push('Route is tough without more survival gear');
  }

  return (tags.length > 0 ? tags : deriveGeneralRouteFitTags(save)).slice(0, 4);
};

export const getCurrentBuildSummary = (save: SaveData, selectedLevel?: LevelConfig | null): CurrentBuildSummary => ({
  equippedSkin: getSkinDisplayName(save.equippedSkin),
  ropeType: { id: save.equippedRopeType, ...(ROPE_TYPE_DETAILS[save.equippedRopeType] ?? ROPE_TYPE_DETAILS.vine) },
  rope: filterEntries(['ropeLength', 'castRange', 'grip', 'branchMastery'], save),
  movement: filterEntries(['swingForce', 'airControl', 'launchBoost', 'feverDuration', 'magnetism'], save),
  defense: filterEntries(['armor', 'hazardResist', 'safetyNet', 'luck'], save),
  milestones: getBuildMilestones(save),
  synergies: deriveSynergies(save),
  routeFitTags: deriveRouteFitTags(save, selectedLevel),
});
