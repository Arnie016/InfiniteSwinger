import {
  MonkeyCosmeticState,
  RopeType,
  RopeVisualState,
  SaveData,
  UpgradeDisplayRule,
  Vector2,
} from '../types';

export const ROPE_TYPE_LABELS: Record<RopeType, string> = {
  vine: 'Classic Vine',
  braid: 'Braided Vine',
  chain: 'Iron Chain',
  silk: 'Silk Thread',
};

export const ROPE_TYPE_PROFILES: Record<
  RopeType,
  {
    label: string;
    description: string;
    ropeColor: string;
    stressColor: string;
    glowColor: string;
    thicknessScale: number;
    reachScale: number;
    pumpScale: number;
    brakeScale: number;
    sagScale: number;
    breakScale: number;
  }
> = {
  vine: {
    label: ROPE_TYPE_LABELS.vine,
    description: 'Balanced vine handling with the cleanest all-around read.',
    ropeColor: '#6ee7b7',
    stressColor: '#FF5252',
    glowColor: 'rgba(110, 231, 183, 0.34)',
    thicknessScale: 1,
    reachScale: 1,
    pumpScale: 1,
    brakeScale: 1,
    sagScale: 1,
    breakScale: 1,
  },
  braid: {
    label: ROPE_TYPE_LABELS.braid,
    description: 'A tighter braid with cleaner arcs and a little less sway.',
    ropeColor: '#7dd3fc',
    stressColor: '#fb7185',
    glowColor: 'rgba(125, 211, 252, 0.36)',
    thicknessScale: 1.06,
    reachScale: 1.03,
    pumpScale: 0.98,
    brakeScale: 1.03,
    sagScale: 0.94,
    breakScale: 1.04,
  },
  chain: {
    label: ROPE_TYPE_LABELS.chain,
    description: 'A heavy line with strong stability and a rigid feel.',
    ropeColor: '#cbd5e1',
    stressColor: '#f87171',
    glowColor: 'rgba(226, 232, 240, 0.28)',
    thicknessScale: 1.18,
    reachScale: 0.95,
    pumpScale: 0.9,
    brakeScale: 1.08,
    sagScale: 0.78,
    breakScale: 1.18,
  },
  silk: {
    label: ROPE_TYPE_LABELS.silk,
    description: 'A smooth tether with the widest recovery feel.',
    ropeColor: '#f9a8d4',
    stressColor: '#fde68a',
    glowColor: 'rgba(249, 168, 212, 0.35)',
    thicknessScale: 0.86,
    reachScale: 1.08,
    pumpScale: 1.04,
    brakeScale: 0.96,
    sagScale: 1.16,
    breakScale: 0.9,
  },
};

export const UPGRADE_DISPLAY_RULES: UpgradeDisplayRule[] = [
  { upgradeKey: 'ropeLength', minLevel: 1, token: 'rope-halo', description: 'Adds a wider vine loop around the torso.' },
  { upgradeKey: 'grip', minLevel: 1, token: 'gloves', description: 'Adds bright grip wraps to the monkey hands.' },
  { upgradeKey: 'hazardResist', minLevel: 1, token: 'hazard-wrap', description: 'Adds hazard-proof wraps and a blue shield arc.' },
  { upgradeKey: 'branchMastery', minLevel: 1, token: 'branch-charms', description: 'Adds leaf charms for branch reset readability.' },
  { upgradeKey: 'armor', minLevel: 1, token: 'helmet', description: 'Adds a visible coconut helmet.' },
  { upgradeKey: 'safetyNet', minLevel: 1, token: 'vine-net', description: 'Adds a visible vine recovery net.' },
];

const getSkinPalette = (save: SaveData) => {
  const baseFur = '#6d4b34';
  switch (save.equippedSkin) {
    case 'skin_cyber':
      return { furColor: '#00E5FF', bellyColor: '#a7f3ff', limbColor: '#074350', accentColor: '#67e8f9' };
    case 'skin_golden':
      return { furColor: '#FFD700', bellyColor: '#ffef9c', limbColor: '#6b4a00', accentColor: '#facc15' };
    case 'skin_winter':
      return { furColor: '#ECEFF1', bellyColor: '#cfd8dc', limbColor: '#546e7a', accentColor: '#dff6ff' };
    case 'skin_ninja':
      return { furColor: '#212121', bellyColor: '#6a5c4d', limbColor: '#161616', accentColor: '#ef4444' };
    default:
      return { furColor: baseFur, bellyColor: '#d7b08a', limbColor: '#3c2417', accentColor: '#fde68a' };
  }
};

export const getMonkeyCosmeticState = (save: SaveData): MonkeyCosmeticState => {
  const palette = getSkinPalette(save);
  return {
    skinId: save.equippedSkin,
    furColor: palette.furColor,
    bellyColor: palette.bellyColor,
    limbColor: palette.limbColor,
    accentColor: palette.accentColor,
    wrapColor: save.upgrades.hazardResist > 0 ? '#38bdf8' : '#f59e0b',
    charmColor: save.upgrades.branchMastery > 0 ? '#86efac' : '#fde047',
    showHelmet: save.upgrades.armor > 0,
    showHarness: save.upgrades.ropeLength > 0 || save.upgrades.castRange > 0,
    showNet: save.upgrades.safetyNet > 0,
    showBranchCharms: save.upgrades.branchMastery > 0,
    showHazardWrap: save.upgrades.hazardResist > 0,
    showFocusHalo: save.upgrades.feverDuration > 0,
  };
};

export const getRopeTypeProfile = (ropeType: RopeType) => ROPE_TYPE_PROFILES[ropeType] ?? ROPE_TYPE_PROFILES.vine;

export const getRopeVisualState = (
  save: SaveData,
  ropeTimer: number,
  isSwinging: boolean,
): RopeVisualState => {
  const ropeType = getRopeTypeProfile(save.equippedRopeType);
  const critical = isSwinging && ropeTimer < 1.2 && save.upgrades.ropeLength < 5;
  return {
    color: ropeType.ropeColor,
    thickness: (4 + Math.min(2, save.upgrades.grip * 0.25)) * ropeType.thicknessScale,
    stressColor: critical ? ropeType.stressColor : '#FF5252',
    glowColor: save.upgrades.castRange > 0 ? ropeType.glowColor : 'rgba(255,255,255,0.12)',
    wrapSegments: Math.max(0, save.upgrades.grip + save.upgrades.hazardResist),
  };
};

export const drawMonkeyUpgradeGear = (
  ctx: CanvasRenderingContext2D,
  player: { position: Vector2 },
  save: SaveData,
) => {
  const upgrades = save.upgrades;
  const cosmetics = getMonkeyCosmeticState(save);

  if (cosmetics.showNet) {
    ctx.fillStyle = 'rgba(163, 230, 53, 0.22)';
    ctx.fillRect(-18, 2, 36, 18);
    ctx.strokeStyle = '#84cc16';
    ctx.lineWidth = 1.5;
    for (let x = -18; x <= 18; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 2);
      ctx.lineTo(x, 20);
      ctx.stroke();
    }
  }
  if (cosmetics.showHarness) {
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 8, 12 + upgrades.ropeLength * 0.9, Math.PI * 0.15, Math.PI * 1.1);
    ctx.stroke();
  }
  if (upgrades.swingForce > 0) {
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(-19, -5, 6, 14);
    ctx.fillRect(13, -5, 6, 14);
  }
  if (upgrades.grip > 0) {
    ctx.fillStyle = cosmetics.wrapColor;
    ctx.fillRect(-22, -18, 7, 6);
    ctx.fillRect(15, -18, 7, 6);
  }
  if (upgrades.castRange > 0) {
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -4, 22 + upgrades.castRange * 0.8, 0.5, 2.5);
    ctx.stroke();
  }
  if (upgrades.airControl > 0) {
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.lineTo(30, 2);
    ctx.lineTo(18, 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-28, 4);
    ctx.lineTo(-16, 10);
    ctx.closePath();
    ctx.fill();
  }
  if (cosmetics.showHazardWrap) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-2, -2, 19, Math.PI * 0.95, Math.PI * 1.85);
    ctx.stroke();
  }
  if (cosmetics.showBranchCharms) {
    ctx.fillStyle = cosmetics.charmColor;
    ctx.beginPath();
    ctx.moveTo(-9, -32);
    ctx.lineTo(-2, -24);
    ctx.lineTo(-14, -22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, -32);
    ctx.lineTo(2, -24);
    ctx.lineTo(14, -22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(134, 239, 172, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -18);
    ctx.lineTo(-13, -27);
    ctx.moveTo(7, -18);
    ctx.lineTo(13, -27);
    ctx.stroke();
  }
  if (cosmetics.showHelmet) {
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, -17, 13, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (upgrades.magnetism > 0) {
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 17, 7, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 17, 13, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
  if (upgrades.luck > 0) {
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(-13, 18, 3, 0, Math.PI * 2);
    ctx.arc(-8, 12, 3, 0, Math.PI * 2);
    ctx.arc(-3, 18, 3, 0, Math.PI * 2);
    ctx.arc(-8, 23, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-8, 17, 11, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  if (cosmetics.showFocusHalo) {
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -18, 18 + upgrades.feverDuration * 0.4, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  if (upgrades.launchBoost > 0) {
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(-4, 26, 8, 8);
    ctx.fillStyle = 'rgba(251, 146, 60, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-8, 34);
    ctx.lineTo(-3, 44);
    ctx.lineTo(0, 36);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 34);
    ctx.lineTo(3, 44);
    ctx.lineTo(0, 36);
    ctx.closePath();
    ctx.fill();
  }
};
