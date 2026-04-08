import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Coins,
  Feather,
  Lock,
  ReceiptText,
  Shirt,
  ShoppingBag,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

import { CurrentBuildSummary, PurchaseReceipt, SaveData, ShopItem } from '../../types';
import { CurrentBuildCard } from './CurrentBuildCard';

type Props = {
  saveData: SaveData;
  activeTab: 'UPGRADES' | 'ROPES' | 'SKINS';
  shopItems: ShopItem[];
  currentBuild: CurrentBuildSummary;
  purchaseReceipt: PurchaseReceipt | null;
  onClose: () => void;
  onReturnToMenu?: () => void;
  onChangeTab: (tab: 'UPGRADES' | 'ROPES' | 'SKINS') => void;
  onBuyItem: (item: ShopItem) => void;
  onEquipSkin: (skinId: string) => void;
  onEquipRopeType: (ropeType: string) => void;
  initialSelectedItemId?: string | null;
};

const accentClasses: Record<PurchaseReceipt['accent'], string> = {
  emerald: 'border-emerald-200/20 bg-emerald-500/10 text-emerald-100',
  amber: 'border-amber-200/20 bg-amber-500/10 text-amber-100',
  cyan: 'border-cyan-200/20 bg-cyan-500/10 text-cyan-100',
};

const ropeGroupOrder = ['Rope Types'] as const;
const upgradeGroupOrder = ['Rope Control', 'Launch & Recovery', 'Survival & Utility'] as const;
const skinGroupOrder = ['Cosmetics'] as const;

function getShopTheme(item: ShopItem) {
  if (item.type === 'SKIN') {
    switch (item.id) {
      case 'yeti':
        return {
          accent: 'cyan',
          iconWrap: 'border-cyan-200/30 bg-cyan-400/15 text-cyan-100',
          glow: 'from-cyan-200/50 via-slate-100/20 to-sky-300/30',
          badge: 'border-cyan-200/20 bg-cyan-500/12 text-cyan-100',
        };
      case 'volcanic':
        return {
          accent: 'amber',
          iconWrap: 'border-amber-200/30 bg-amber-400/15 text-amber-100',
          glow: 'from-orange-200/50 via-amber-200/20 to-rose-300/30',
          badge: 'border-amber-200/20 bg-amber-500/12 text-amber-100',
        };
      default:
        return {
          accent: 'emerald',
          iconWrap: 'border-emerald-200/30 bg-emerald-400/15 text-emerald-100',
          glow: 'from-emerald-200/50 via-lime-200/20 to-cyan-200/30',
          badge: 'border-emerald-200/20 bg-emerald-500/12 text-emerald-100',
        };
    }
  }

  if (item.type === 'ROPE') {
    switch (item.ropeType) {
      case 'braid':
        return {
          accent: 'cyan',
          iconWrap: 'border-cyan-200/30 bg-cyan-400/15 text-cyan-100',
          glow: 'from-cyan-200/60 via-slate-100/20 to-sky-300/25',
          badge: 'border-cyan-200/20 bg-cyan-500/12 text-cyan-100',
        };
      case 'chain':
        return {
          accent: 'amber',
          iconWrap: 'border-amber-200/30 bg-amber-400/15 text-amber-100',
          glow: 'from-slate-200/45 via-amber-200/18 to-orange-300/25',
          badge: 'border-amber-200/20 bg-amber-500/12 text-amber-100',
        };
      case 'silk':
        return {
          accent: 'emerald',
          iconWrap: 'border-fuchsia-200/30 bg-fuchsia-400/15 text-fuchsia-100',
          glow: 'from-fuchsia-200/50 via-pink-200/20 to-cyan-200/25',
          badge: 'border-fuchsia-200/20 bg-fuchsia-500/12 text-fuchsia-100',
        };
      default:
        return {
          accent: 'emerald',
          iconWrap: 'border-emerald-200/30 bg-emerald-400/15 text-emerald-100',
          glow: 'from-emerald-200/50 via-lime-200/20 to-cyan-200/30',
          badge: 'border-emerald-200/20 bg-emerald-500/12 text-emerald-100',
        };
    }
  }

  switch (item.upgradeKey) {
    case 'ropeLength':
    case 'castRange':
      return {
        accent: 'cyan',
        iconWrap: 'border-cyan-200/30 bg-cyan-400/15 text-cyan-100',
        glow: 'from-cyan-200/50 via-sky-200/20 to-indigo-300/25',
        badge: 'border-cyan-200/20 bg-cyan-500/12 text-cyan-100',
      };
    case 'swingForce':
    case 'airControl':
    case 'launchBoost':
      return {
        accent: 'emerald',
        iconWrap: 'border-emerald-200/30 bg-emerald-400/15 text-emerald-100',
        glow: 'from-emerald-200/50 via-lime-200/20 to-cyan-200/25',
        badge: 'border-emerald-200/20 bg-emerald-500/12 text-emerald-100',
      };
    case 'armor':
    case 'hazardResist':
    case 'safetyNet':
      return {
        accent: 'amber',
        iconWrap: 'border-amber-200/30 bg-amber-400/15 text-amber-100',
        glow: 'from-amber-200/50 via-orange-200/20 to-rose-300/25',
        badge: 'border-amber-200/20 bg-amber-500/12 text-amber-100',
      };
    default:
      return {
        accent: 'rose',
        iconWrap: 'border-rose-200/30 bg-rose-400/15 text-rose-100',
        glow: 'from-rose-200/50 via-pink-200/20 to-fuchsia-300/25',
        badge: 'border-rose-200/20 bg-rose-500/12 text-rose-100',
      };
  }
}

function ShopGlyph({
  item,
  theme,
  className = '',
  size = 24,
}: {
  item: ShopItem;
  theme: ReturnType<typeof getShopTheme>;
  className?: string;
  size?: number;
}) {
  const Icon = item.icon;
  return (
    <div className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl border ${theme.iconWrap} ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.glow} opacity-35 blur-sm`} />
      <div className="absolute inset-0 rounded-2xl bg-white/5" />
      <Icon size={size} strokeWidth={1.9} />
    </div>
  );
}

function ShopVisualPreview({
  item,
  currentLevel,
  isOwned,
  isEquipped,
  theme,
}: {
  item: ShopItem;
  currentLevel: number;
  isOwned: boolean;
  isEquipped: boolean;
  theme: ReturnType<typeof getShopTheme>;
}) {
  const commonMonkey = (
    <div className="atlas-preview-float absolute bottom-8 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-white bg-slate-700 shadow-lg shadow-black/40">
      <div className="absolute left-1/2 top-2 h-5 w-8 -translate-x-1/2 rounded-md bg-amber-200" />
      <div className="absolute left-5 top-4 h-1.5 w-1.5 rounded-full bg-slate-900" />
      <div className="absolute right-5 top-4 h-1.5 w-1.5 rounded-full bg-slate-900" />
    </div>
  );

  if (item.type === 'SKIN') {
    return (
      <div className="relative h-44 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,25,0.95),rgba(10,20,20,0.88))]">
        <div className={`absolute inset-x-6 top-4 h-24 rounded-full bg-gradient-to-r ${theme.glow} opacity-35 blur-2xl`} />
        <div className="absolute inset-x-8 bottom-5 h-16 rounded-full bg-white/5 blur-xl" />
        <div className={`absolute bottom-8 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full border-4 border-white ${isEquipped ? 'bg-amber-100' : 'bg-slate-200'} shadow-lg shadow-black/40`} />
        <div className="absolute bottom-[6.3rem] left-1/2 h-6 w-10 -translate-x-1/2 rounded-md bg-slate-900/85" />
        <div className="absolute bottom-[6.95rem] left-[calc(50%-10px)] h-1.5 w-1.5 rounded-full bg-white" />
        <div className="absolute bottom-[6.95rem] left-[calc(50%+4px)] h-1.5 w-1.5 rounded-full bg-white" />
        <ShopGlyph item={item} theme={theme} className="absolute left-4 top-4 h-12 w-12" size={24} />
        <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1 text-xs font-semibold text-slate-100">
          {isEquipped ? 'Equipped now' : isOwned ? 'Owned skin' : 'Preview'}
        </div>
      </div>
    );
  }

  if (item.type === 'ROPE') {
    const ropeTone =
      item.ropeType === 'chain'
        ? 'from-amber-200/60 via-orange-200/25 to-red-300/20'
        : item.ropeType === 'silk'
        ? 'from-fuchsia-200/55 via-cyan-200/25 to-white/10'
        : item.ropeType === 'braid'
        ? 'from-cyan-200/55 via-sky-200/25 to-emerald-200/12'
        : 'from-emerald-200/50 via-lime-200/20 to-cyan-200/15';
    const ropeLabel =
      item.ropeType === 'chain'
        ? 'Heavy line'
        : item.ropeType === 'silk'
        ? 'Smooth line'
        : item.ropeType === 'braid'
        ? 'Tight line'
        : 'Balanced line';
    const ropeClass =
      item.ropeType === 'chain'
        ? 'atlas-preview-rope-chain'
        : item.ropeType === 'silk'
        ? 'atlas-preview-rope-silk'
        : item.ropeType === 'braid'
        ? 'atlas-preview-rope-braid'
        : 'atlas-preview-rope-vine';
    return (
      <div className="relative h-44 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,25,0.95),rgba(10,20,20,0.88))]">
        <div className={`absolute inset-x-6 top-4 h-24 rounded-full bg-gradient-to-r ${ropeTone} opacity-45 blur-2xl`} />
        <div className="absolute inset-x-10 bottom-8 h-14 rounded-full bg-white/5 blur-xl" />
        <ShopGlyph item={item} theme={theme} className="absolute left-4 top-4 h-12 w-12" size={24} />
        <div className="absolute left-1/2 top-9 h-2 w-28 -translate-x-1/2 rounded-full bg-white/35 blur-[1px]" />
        <div className="atlas-preview-float absolute left-1/2 top-8 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-white bg-slate-700 shadow-lg shadow-black/40" />
        <div className={`atlas-preview-rope absolute left-1/2 top-[3.6rem] h-24 w-10 -translate-x-1/2 ${ropeClass}`}>
          <div className={`atlas-preview-rope-core bg-gradient-to-b ${ropeTone}`} />
        </div>
        {item.ropeType === 'chain' ? (
          <div className="absolute left-1/2 top-[4rem] h-24 w-10 -translate-x-1/2">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={`chain-link-${index}`}
                className="absolute left-1/2 h-4 w-3 -translate-x-1/2 rounded-full border border-amber-100/70 bg-transparent"
                style={{ top: `${index * 15}px` }}
              />
            ))}
          </div>
        ) : null}
        {item.ropeType === 'braid' ? (
          <>
            <div className="absolute left-[calc(50%-5px)] top-[3.9rem] h-20 w-1 rounded-full bg-cyan-100/65" />
            <div className="absolute left-[calc(50%+3px)] top-[4.1rem] h-20 w-1 rounded-full bg-emerald-100/50" />
          </>
        ) : null}
        {item.ropeType === 'silk' ? <div className="atlas-preview-glint absolute left-1/2 top-[4.8rem] h-10 w-14 -translate-x-1/2 rounded-full bg-white/25 blur-md" /> : null}
        <div className="absolute bottom-6 left-4 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1 text-xs font-semibold text-slate-100">
          {ropeLabel}
        </div>
      </div>
    );
  }

  if (item.upgradeKey === 'ropeLength' || item.upgradeKey === 'castRange') {
    return (
      <div className="relative h-44 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,25,0.95),rgba(10,20,20,0.88))]">
        <ShopGlyph item={item} theme={theme} className="absolute left-4 top-4 h-12 w-12" size={24} />
        <div className="absolute left-1/2 top-4 h-5 w-5 -translate-x-1/2 rounded-full bg-cyan-200 shadow-lg shadow-cyan-500/30" />
        <div
          className="absolute left-1/2 top-8 w-1 -translate-x-1/2 rounded-full bg-cyan-100 transition-all duration-500"
          style={{ height: `${72 + currentLevel * 12}px` }}
        />
        {commonMonkey}
        <div className="absolute bottom-4 left-4 rounded-full border border-cyan-200/15 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
          Wider catch window
        </div>
      </div>
    );
  }

  if (item.upgradeKey === 'swingForce' || item.upgradeKey === 'airControl' || item.upgradeKey === 'launchBoost') {
    return (
      <div className="relative h-44 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,25,0.95),rgba(10,20,20,0.88))]">
        <ShopGlyph item={item} theme={theme} className="absolute left-4 top-4 h-12 w-12" size={24} />
        <div className="absolute left-1/2 top-5 h-4 w-4 -translate-x-1/2 rounded-full bg-emerald-200 shadow-lg shadow-emerald-500/40" />
        <div className="absolute left-1/2 top-6 h-24 w-24 -translate-x-1/2 rounded-full border border-emerald-200/20 border-dashed" />
        <div className="absolute bottom-10 left-1/2 h-14 w-14 -translate-x-1/2 rounded-full border-4 border-white bg-slate-700 animate-bounce-slow shadow-lg shadow-black/40" />
        <div className="absolute bottom-4 left-4 rounded-full border border-emerald-200/15 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
          More speed through the arc
        </div>
      </div>
    );
  }

  if (item.upgradeKey === 'armor' || item.upgradeKey === 'hazardResist' || item.upgradeKey === 'safetyNet') {
    return (
      <div className="relative h-44 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,25,0.95),rgba(10,20,20,0.88))]">
        <ShopGlyph item={item} theme={theme} className="absolute left-4 top-4 h-12 w-12" size={24} />
        <div className="absolute bottom-8 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full border-4 border-amber-200/50 bg-amber-300/10 shadow-lg shadow-amber-500/25 animate-pulse" />
        {commonMonkey}
        <div className="absolute bottom-4 left-4 rounded-full border border-amber-200/15 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100">
          Safer hits and recoveries
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-44 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,25,0.95),rgba(10,20,20,0.88))]">
      <div className={`absolute inset-x-6 top-4 h-24 rounded-full bg-gradient-to-r ${theme.glow} opacity-30 blur-2xl`} />
      <ShopGlyph item={item} theme={theme} className="absolute left-4 top-4 h-12 w-12" size={24} />
      {commonMonkey}
      <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1 text-xs font-semibold text-slate-100">
        {currentLevel > 0 ? `Level ${currentLevel}` : 'Preview'}
      </div>
    </div>
  );
}

export function ShopScreen({
  saveData,
  activeTab,
  shopItems,
  currentBuild,
  purchaseReceipt,
  onClose,
  onReturnToMenu,
  onChangeTab,
  onBuyItem,
  onEquipSkin,
  onEquipRopeType,
  initialSelectedItemId,
}: Props) {
  const filteredItems = useMemo(
    () =>
      shopItems.filter((item) =>
        activeTab === 'UPGRADES'
          ? item.type === 'UPGRADE'
          : activeTab === 'ROPES'
          ? item.type === 'ROPE'
          : item.type === 'SKIN',
      ),
    [activeTab, shopItems],
  );
  const orderedGroups = activeTab === 'UPGRADES' ? upgradeGroupOrder : activeTab === 'ROPES' ? ropeGroupOrder : skinGroupOrder;
  const groupedItems = orderedGroups
    .map((group) => ({
      group,
      items: filteredItems.filter((item) => item.presentationGroup === group),
    }))
    .filter((section) => section.items.length > 0);
  const availableGroups = groupedItems.map((section) => section.group);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(filteredItems[0]?.id ?? null);
  const [selectedGroup, setSelectedGroup] = useState<string>(availableGroups[0] ?? '');
  const [showRecommendationPulse, setShowRecommendationPulse] = useState(false);

  useEffect(() => {
    setSelectedItemId((current) => {
      if (current && filteredItems.some((item) => item.id === current)) return current;
      return filteredItems[0]?.id ?? null;
    });
  }, [filteredItems]);

  useEffect(() => {
    if (!initialSelectedItemId) return;
    const target = filteredItems.find((item) => item.id === initialSelectedItemId);
    if (!target) return;
    setShowRecommendationPulse(true);
    setSelectedItemId(target.id);
    const targetGroup = target.presentationGroup;
    if (targetGroup && availableGroups.includes(targetGroup)) {
      setSelectedGroup(targetGroup);
    }
  }, [availableGroups, filteredItems, initialSelectedItemId]);

  useEffect(() => {
    if (!showRecommendationPulse) return;
    const timeout = window.setTimeout(() => setShowRecommendationPulse(false), 4200);
    return () => window.clearTimeout(timeout);
  }, [showRecommendationPulse]);

  const stopRecommendationPulse = () => {
    if (showRecommendationPulse) setShowRecommendationPulse(false);
  };

  useEffect(() => {
    setSelectedGroup((current) => (availableGroups.includes(current) ? current : availableGroups[0] ?? ''));
  }, [availableGroups]);

  const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null;
  const featuredSection = groupedItems.find((section) => section.group === selectedGroup) ?? groupedItems[0] ?? null;
  const browseItems = featuredSection?.items ?? filteredItems;

  const getItemState = (item: ShopItem) => {
    const isUpgrade = item.type === 'UPGRADE';
    const currentLevel = isUpgrade
      ? saveData.upgrades[item.upgradeKey!] || 0
      : item.type === 'ROPE'
      ? saveData.ropeTypes.includes(item.ropeType!) ? 1 : 0
      : saveData.skins.includes(item.id)
      ? 1
      : 0;
    const isOwned = !isUpgrade && currentLevel === 1;
    const isMaxed = isUpgrade ? currentLevel >= item.maxLevel! : isOwned;
    const isEquipped =
      item.type === 'ROPE'
        ? saveData.equippedRopeType === item.ropeType
        : !isUpgrade && saveData.equippedSkin === item.id;
    const canAfford = saveData.totalTokens >= item.cost;
    const missingParents = (item.parents ?? []).filter((parentId) => {
      const parent = shopItems.find((candidate) => candidate.id === parentId);
      return !parent || saveData.upgrades[parent.upgradeKey!] < 1;
    });
    const isLocked = missingParents.length > 0;
    const lockedReason = isLocked
      ? `Needs ${missingParents
          .map((parentId) => shopItems.find((candidate) => candidate.id === parentId)?.name ?? parentId)
          .join(' + ')} first.`
      : null;

    return {
      isUpgrade,
      currentLevel,
      isOwned,
      isMaxed,
      isEquipped,
      canAfford,
      isLocked,
      lockedReason,
    };
  };

  const selectedState = selectedItem ? getItemState(selectedItem) : null;
  const selectedTheme = selectedItem ? getShopTheme(selectedItem) : null;

  return (
    <div data-ui-control className="absolute inset-0 z-50 bg-[radial-gradient(circle_at_top_left,rgba(73,124,76,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(170,120,54,0.16),transparent_30%),rgba(2,8,10,0.94)] p-4 font-ui">
      <div className="relative flex h-full max-h-[92vh] w-full gap-4 overflow-hidden rounded-[2rem] atlas-surface-strong text-white">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="atlas-surface-soft rounded-2xl p-3 text-emerald-200">
                <ShoppingBag size={28} />
              </div>
              <div>
                <div className="atlas-map-label text-xs text-emerald-200/70">Canopy Bazaar</div>
                <h2 className="atlas-title mt-1 text-4xl text-white">Monkey Market</h2>
                <div className="atlas-panel-copy mt-1 text-sm text-slate-300">Pick one card. The preview updates instantly.</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`atlas-chip rounded-full px-4 py-2 transition-all ${purchaseReceipt ? 'border-amber-200/20 bg-amber-500/10 text-amber-100 shadow-lg shadow-amber-950/20' : 'text-white'}`}>
                <span className="inline-flex items-center gap-2 text-lg font-bold">
                  <Coins className="text-amber-300" size={18} />
                  {saveData.totalTokens}
                </span>
              </div>
              {onReturnToMenu ? (
                <button
                  onClick={onReturnToMenu}
                  className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800"
                >
                  Main Menu
                </button>
              ) : null}
              <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                <X size={28} />
              </button>
            </div>
          </div>

          <div className="border-b border-white/10 px-4 pt-4">
            <div className="flex gap-3">
              <button
                onClick={() => onChangeTab('UPGRADES')}
                className={`inline-flex items-center gap-2 rounded-t-2xl px-5 py-3 text-base font-bold transition-colors ${
                  activeTab === 'UPGRADES'
                    ? 'atlas-surface text-emerald-200'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap size={18} />
                Upgrades
              </button>
              <button
                onClick={() => onChangeTab('ROPES')}
                className={`inline-flex items-center gap-2 rounded-t-2xl px-5 py-3 text-base font-bold transition-colors ${
                  activeTab === 'ROPES'
                    ? 'atlas-surface text-cyan-200'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Feather size={18} />
                Rope Types
              </button>
              <button
                onClick={() => onChangeTab('SKINS')}
                className={`inline-flex items-center gap-2 rounded-t-2xl px-5 py-3 text-base font-bold transition-colors ${
                  activeTab === 'SKINS'
                    ? 'atlas-surface text-amber-200'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shirt size={18} />
                Skins
              </button>
            </div>
          </div>

          <div className="h-[calc(100%-118px)] overflow-y-auto px-5 py-5">
            <div className="space-y-5">
              {availableGroups.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {availableGroups.map((group) => (
                    <button
                      key={group}
                      onClick={() => setSelectedGroup(group)}
                    className={`rounded-full px-3.5 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
                      selectedGroup === group
                          ? 'bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-950/25'
                          : 'atlas-chip text-slate-300 hover:border-emerald-200/20 hover:bg-emerald-500/10 hover:text-white'
                    }`}
                  >
                    {group}
                  </button>
                  ))}
                </div>
              ) : null}

              <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="atlas-map-label text-xs text-slate-400">Featured Lane</div>
                          <div className="atlas-title mt-1 text-2xl text-white">{featuredSection?.group ?? 'Browse'}</div>
                          <div className="atlas-panel-copy mt-1 text-sm text-emerald-100/75">Pick one featured card, then buy or equip from the right.</div>
                      </div>
                  <div className="atlas-chip rounded-full px-3 py-1 text-xs font-semibold text-slate-300">
                    {browseItems.length} item{browseItems.length === 1 ? '' : 's'}
                  </div>
                </div>

                <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
                  {browseItems.map((item) => {
                    const state = getItemState(item);
                    const theme = getShopTheme(item);
                    const isSelected = selectedItem?.id === item.id;
                    const isRecommended = item.id === initialSelectedItemId && isSelected && showRecommendationPulse;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          stopRecommendationPulse();
                          setSelectedItemId(item.id);
                        }}
                        onMouseEnter={() => {
                          stopRecommendationPulse();
                          setSelectedItemId(item.id);
                        }}
                        className={`relative w-[248px] snap-start shrink-0 rounded-[1.65rem] border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-emerald-300/45 bg-emerald-500/14 shadow-lg shadow-emerald-950/25'
                            : 'border-white/8 bg-slate-900/72 hover:border-emerald-200/18 hover:bg-slate-900/88'
                        } ${
                          isRecommended
                            ? 'animate-pulse ring-2 ring-emerald-200/80 shadow-emerald-200/60 shadow-lg'
                            : ''
                        }`}
                      >
                        {isRecommended ? (
                          <>
                            <span className="pointer-events-none absolute inset-0 rounded-[1.65rem] bg-emerald-200/10 blur-xl" />
                            <span className="pointer-events-none absolute -inset-2 rounded-[2rem] border border-emerald-200/25 animate-ping opacity-75" />
                            <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-emerald-200/45 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                              <Sparkles size={12} />
                              Recommended
                            </span>
                          </>
                        ) : null}
                        <div className="flex items-start justify-between gap-3">
                          <ShopGlyph item={item} theme={theme} className="h-12 w-12" size={24} />
                          <div className={`atlas-chip rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>
                            {state.isUpgrade
                              ? `L${state.currentLevel}${item.maxLevel ? ` / ${item.maxLevel}` : ''}`
                              : state.isEquipped
                              ? 'Equipped'
                              : state.isOwned
                              ? 'Owned'
                              : 'Shop'}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="atlas-title text-[1.1rem] leading-[1.02] text-white">{item.name}</div>
                          <span className="atlas-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                            {item.presentationGroup ?? 'Item'}
                          </span>
                        </div>
                        <div className="atlas-panel-copy mt-2 min-h-[3.1rem] text-[0.94rem] leading-6 text-slate-300">
                          {item.description}
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex flex-wrap gap-1.5">
                            {(item.routeHelpTags ?? []).slice(0, 2).map((tag) => (
                              <span
                                key={`${item.id}-${tag}`}
                                className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-slate-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span className={`atlas-chip rounded-full px-3 py-1 text-sm font-semibold ${state.isLocked ? 'border border-rose-200/15 bg-rose-500/10 text-rose-100' : 'text-slate-100'}`}>
                            {state.isUpgrade
                              ? state.isMaxed
                                ? 'Maxed'
                                : `${item.cost}`
                              : item.type === 'ROPE'
                              ? state.isEquipped
                                ? 'On'
                                : state.isOwned
                                ? 'Equip'
                                : `${item.cost}`
                              : state.isOwned
                              ? state.isEquipped
                                ? 'On'
                                : 'Equip'
                              : `${item.cost}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="w-[360px] shrink-0 border-l border-white/8 bg-[linear-gradient(180deg,rgba(7,14,15,0.94),rgba(12,29,21,0.9))] p-4">
          {selectedItem && selectedState ? (
            <div className="flex h-full flex-col gap-4">
              <div className="atlas-surface rounded-[1.7rem] p-4">
                <div className="atlas-map-label flex items-center gap-2 text-xs text-slate-400">
                  <ReceiptText size={14} />
                  {selectedItem?.type === 'ROPE' ? 'Featured Rope' : 'Featured'}
                </div>
                <div className="mt-4">
                  <ShopVisualPreview
                    item={selectedItem}
                    currentLevel={selectedState.currentLevel}
                    isOwned={selectedState.isOwned}
                    isEquipped={selectedState.isEquipped}
                    theme={selectedTheme ?? getShopTheme(selectedItem)}
                  />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="atlas-title text-2xl text-white">{selectedItem.name}</div>
                    <div className="atlas-panel-copy mt-1 text-sm text-slate-300">{selectedItem.description}</div>
                  </div>
                  <div className={`atlas-chip rounded-full px-3 py-1 text-xs font-semibold ${selectedTheme?.badge ?? 'text-slate-300'}`}>
                    {selectedState.isUpgrade
                      ? `L${selectedState.currentLevel}${selectedItem.maxLevel ? ` / ${selectedItem.maxLevel}` : ''}`
                      : selectedState.isEquipped
                      ? 'Equipped'
                      : selectedState.isOwned
                      ? 'Owned'
                      : 'Available'}
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  {selectedState.isLocked ? (
                    <div className="atlas-surface-soft rounded-2xl px-4 py-3 text-rose-100">
                      <div className="inline-flex items-center gap-2 font-semibold">
                        <Lock size={14} />
                        Locked
                      </div>
                      <div className="mt-2 text-slate-200">{selectedState.lockedReason}</div>
                    </div>
                  ) : null}

                  {selectedItem.type === 'ROPE' ? (
                    <div className="atlas-surface-soft rounded-2xl px-4 py-3 text-slate-200">
                      <div>
                        Current rope: <span className="font-bold text-white">{selectedState.isOwned ? 'Owned' : 'Locked'}</span>
                      </div>
                      <div className="mt-1">
                        Equipped now: <span className="font-bold text-cyan-200">{selectedState.isEquipped ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  ) : selectedState.isUpgrade ? (
                    <div className="atlas-surface-soft rounded-2xl px-4 py-3 text-slate-200">
                      <div>Current level: <span className="font-bold text-white">{selectedState.currentLevel}</span></div>
                      <div className="mt-1">
                        After purchase:{' '}
                        <span className="font-bold text-emerald-200">
                          {Math.min(selectedState.currentLevel + 1, selectedItem.maxLevel ?? selectedState.currentLevel + 1)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="atlas-surface-soft rounded-2xl px-4 py-3 text-slate-200">
                      {selectedState.isEquipped
                        ? 'This skin is live right now.'
                        : selectedState.isOwned
                        ? 'Owned once. Equip it anytime.'
                        : 'Buy once, keep forever.'}
                    </div>
                  )}

                  {selectedItem.visualEffectText ? (
                    <div className="atlas-surface-soft rounded-2xl px-4 py-3 text-slate-200">
                      <div className="atlas-map-label text-xs text-slate-400">Visible effect</div>
                      <div className="mt-2">{selectedItem.visualEffectText}</div>
                    </div>
                  ) : null}

                  {selectedItem.synergyText ? (
                    <div className="atlas-surface-soft rounded-2xl px-4 py-3 text-cyan-50">
                      <div className="atlas-map-label text-xs text-cyan-200/65">Works well with</div>
                      <div className="mt-2">{selectedItem.synergyText}</div>
                    </div>
                  ) : null}

                  {(selectedItem.routeHelpTags ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.routeHelpTags?.map((tag) => (
                        <span
                          key={tag}
                          className="atlas-chip rounded-full border-emerald-200/15 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  {selectedItem.type === 'ROPE' ? (
                    selectedState.isOwned ? (
                      <button
                        onClick={() => onEquipRopeType(selectedItem.ropeType ?? 'vine')}
                        disabled={selectedState.isEquipped}
                        className={`w-full rounded-2xl py-3.5 text-base font-bold transition-all ${
                          selectedState.isEquipped
                            ? 'cursor-default border border-cyan-300/30 bg-cyan-500/10 text-cyan-200'
                            : 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/25 hover:bg-cyan-300'
                        }`}
                      >
                        {selectedState.isEquipped ? 'Equipped rope' : 'Equip rope'}
                      </button>
                    ) : (
                      <button
                        onClick={() => onBuyItem(selectedItem)}
                        disabled={!selectedState.canAfford}
                        className={`w-full rounded-2xl py-3.5 text-base font-bold transition-all ${
                          selectedState.canAfford
                            ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/25 hover:bg-cyan-300'
                            : 'cursor-not-allowed border border-white/8 bg-slate-900 text-slate-500'
                        }`}
                      >
                        Buy rope for {selectedItem.cost}
                      </button>
                    )
                  ) : selectedState.isUpgrade ? (
                    <button
                      onClick={() => onBuyItem(selectedItem)}
                      disabled={selectedState.isMaxed || !selectedState.canAfford || selectedState.isLocked}
                      className={`w-full rounded-2xl py-3.5 text-base font-bold transition-all ${
                        selectedState.isMaxed
                          ? 'cursor-default border border-emerald-300/20 bg-emerald-600/15 text-emerald-300'
                          : selectedState.canAfford && !selectedState.isLocked
                          ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/25 hover:bg-emerald-300'
                          : 'cursor-not-allowed border border-white/8 bg-slate-900 text-slate-500'
                      }`}
                    >
                      {selectedState.isMaxed ? 'Maxed out' : `Buy for ${selectedItem.cost}`}
                    </button>
                  ) : selectedState.isOwned ? (
                    <button
                      onClick={() => onEquipSkin(selectedItem.id)}
                      disabled={selectedState.isEquipped}
                      className={`w-full rounded-2xl py-3.5 text-base font-bold transition-all ${
                        selectedState.isEquipped
                          ? 'cursor-default border border-amber-300/30 bg-amber-500/10 text-amber-200'
                          : 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/25 hover:bg-emerald-300'
                      }`}
                    >
                      {selectedState.isEquipped ? 'Equipped' : 'Equip skin'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onBuyItem(selectedItem)}
                      disabled={!selectedState.canAfford}
                      className={`w-full rounded-2xl py-3.5 text-base font-bold transition-all ${
                        selectedState.canAfford
                          ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/25 hover:bg-emerald-300'
                          : 'cursor-not-allowed border border-white/8 bg-slate-900 text-slate-500'
                      }`}
                    >
                      Buy skin for {selectedItem.cost}
                    </button>
                  )}
                </div>
              </div>

              {purchaseReceipt ? (
              <div className={`atlas-surface rounded-[1.5rem] p-4 ${accentClasses[purchaseReceipt.accent]}`}>
                  <div className="atlas-map-label text-xs">Latest receipt</div>
                  <div className="mt-2 text-lg font-black">{purchaseReceipt.itemName}</div>
                  <div className="mt-1 text-sm">{purchaseReceipt.changeApplied}</div>
              </div>
              ) : null}

              <CurrentBuildCard summary={currentBuild} compact />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
