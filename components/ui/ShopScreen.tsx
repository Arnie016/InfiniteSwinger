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
  onGrantTestWallet?: () => void;
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
      case 'skin_winter':
        return {
          accent: 'cyan',
          iconWrap: 'border-cyan-200/30 bg-cyan-400/15 text-cyan-100',
          glow: 'from-cyan-200/50 via-slate-100/20 to-sky-300/30',
          badge: 'border-cyan-200/20 bg-cyan-500/12 text-cyan-100',
        };
      case 'skin_ember':
        return {
          accent: 'amber',
          iconWrap: 'border-amber-200/30 bg-amber-400/15 text-amber-100',
          glow: 'from-orange-200/50 via-amber-200/20 to-rose-300/30',
          badge: 'border-amber-200/20 bg-amber-500/12 text-amber-100',
        };
      case 'skin_orchid':
        return {
          accent: 'rose',
          iconWrap: 'border-fuchsia-200/30 bg-fuchsia-400/15 text-fuchsia-100',
          glow: 'from-fuchsia-200/55 via-rose-200/22 to-cyan-200/24',
          badge: 'border-fuchsia-200/20 bg-fuchsia-500/12 text-fuchsia-100',
        };
      case 'skin_moss':
        return {
          accent: 'emerald',
          iconWrap: 'border-emerald-200/30 bg-emerald-400/15 text-emerald-100',
          glow: 'from-emerald-200/50 via-lime-200/20 to-cyan-200/20',
          badge: 'border-emerald-200/20 bg-emerald-500/12 text-emerald-100',
        };
      case 'skin_cyber':
        return {
          accent: 'cyan',
          iconWrap: 'border-cyan-200/30 bg-cyan-400/15 text-cyan-100',
          glow: 'from-cyan-200/60 via-sky-200/20 to-indigo-300/24',
          badge: 'border-cyan-200/20 bg-cyan-500/12 text-cyan-100',
        };
      case 'skin_golden':
        return {
          accent: 'amber',
          iconWrap: 'border-amber-200/30 bg-amber-400/15 text-amber-100',
          glow: 'from-amber-200/60 via-yellow-200/20 to-orange-300/24',
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
      case 'reed':
        return {
          accent: 'cyan',
          iconWrap: 'border-teal-200/30 bg-teal-400/15 text-teal-100',
          glow: 'from-teal-200/55 via-cyan-200/20 to-emerald-200/20',
          badge: 'border-teal-200/20 bg-teal-500/12 text-teal-100',
        };
      case 'ember':
        return {
          accent: 'amber',
          iconWrap: 'border-orange-200/30 bg-orange-400/15 text-orange-100',
          glow: 'from-orange-200/55 via-amber-200/18 to-rose-300/22',
          badge: 'border-orange-200/20 bg-orange-500/12 text-orange-100',
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

function PreviewPosterFrame({
  item,
  theme,
  statusLabel,
  footerLabel,
  footerTone = 'border-white/10 bg-slate-950/80 text-slate-100',
  children,
}: {
  item: ShopItem;
  theme: ReturnType<typeof getShopTheme>;
  statusLabel: string;
  footerLabel: string;
  footerTone?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-48 overflow-hidden rounded-[1.7rem] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_32%),linear-gradient(180deg,rgba(7,12,20,0.98),rgba(8,22,24,0.9))]">
      <div className="atlas-preview-poster-pan absolute inset-0">
        <div className={`absolute inset-x-6 top-4 h-24 rounded-full bg-gradient-to-r ${theme.glow} opacity-40 blur-3xl`} />
        <div className="absolute inset-x-10 bottom-4 h-20 rounded-full bg-white/6 blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.12)_48%,rgba(2,6,23,0.45))]" />
        {children}
      </div>
      <ShopGlyph item={item} theme={theme} className="absolute left-4 top-4 h-12 w-12" size={24} />
      <div className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-[11px] font-semibold ${theme.badge}`}>
        {statusLabel}
      </div>
      <div className={`absolute bottom-4 left-4 rounded-full border px-3 py-1 text-xs font-semibold ${footerTone}`}>
        {footerLabel}
      </div>
    </div>
  );
}

function PreviewFigure({
  headTone,
  bodyTone,
  maskTone,
  accentTone,
  scarfTone,
  className = '',
}: {
  headTone: string;
  bodyTone: string;
  maskTone: string;
  accentTone: string;
  scarfTone: string;
  className?: string;
}) {
  return (
    <div className={`atlas-preview-float absolute bottom-5 left-1/2 h-28 w-24 -translate-x-1/2 ${className}`}>
      <div className={`absolute bottom-0 left-1/2 h-16 w-20 -translate-x-1/2 rounded-[40%_40%_24%_24%/46%_46%_18%_18%] ${bodyTone} shadow-[0_18px_32px_rgba(0,0,0,0.35)]`} />
      <div className={`absolute bottom-[3.05rem] left-[calc(50%-18px)] h-10 w-6 rotate-[16deg] rounded-full ${scarfTone} opacity-90`} />
      <div className={`absolute bottom-[3.65rem] left-[calc(50%+10px)] h-12 w-8 -rotate-[22deg] rounded-full blur-[1px] ${accentTone} opacity-75`} />
      <div className={`absolute bottom-[3.45rem] left-1/2 h-[4.3rem] w-[4.3rem] -translate-x-1/2 rounded-full border-4 border-white/90 ${headTone} shadow-lg shadow-black/35`} />
      <div className={`absolute bottom-[5.15rem] left-1/2 h-6 w-10 -translate-x-1/2 rounded-[0.9rem] ${maskTone}`} />
      <div className="absolute bottom-[5.9rem] left-[calc(50%-10px)] h-1.5 w-1.5 rounded-full bg-white" />
      <div className="absolute bottom-[5.9rem] left-[calc(50%+4px)] h-1.5 w-1.5 rounded-full bg-white" />
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
  const statusLabel =
    item.type === 'UPGRADE'
      ? currentLevel > 0
        ? `L${currentLevel}`
        : 'Preview'
      : isEquipped
        ? 'Equipped'
        : isOwned
          ? 'Owned'
          : 'Preview';
  const portraitTone =
    theme.accent === 'amber'
      ? {
          headTone: 'bg-amber-50',
          bodyTone: 'bg-[linear-gradient(180deg,rgba(180,83,9,0.92),rgba(69,26,3,0.95))]',
          maskTone: 'bg-slate-900/88',
          accentTone: 'bg-orange-300/65',
          scarfTone: 'bg-amber-200/80',
        }
      : theme.accent === 'rose'
        ? {
            headTone: 'bg-fuchsia-50',
            bodyTone: 'bg-[linear-gradient(180deg,rgba(126,34,206,0.9),rgba(49,12,68,0.94))]',
            maskTone: 'bg-slate-950/88',
            accentTone: 'bg-fuchsia-300/65',
            scarfTone: 'bg-rose-200/80',
          }
        : theme.accent === 'cyan'
          ? {
              headTone: 'bg-cyan-50',
              bodyTone: 'bg-[linear-gradient(180deg,rgba(8,145,178,0.9),rgba(8,47,73,0.94))]',
              maskTone: 'bg-slate-950/88',
              accentTone: 'bg-cyan-300/65',
              scarfTone: 'bg-sky-200/80',
            }
          : {
              headTone: 'bg-emerald-50',
              bodyTone: 'bg-[linear-gradient(180deg,rgba(6,95,70,0.92),rgba(6,46,33,0.95))]',
              maskTone: 'bg-slate-950/88',
              accentTone: 'bg-emerald-300/65',
              scarfTone: 'bg-lime-200/78',
            };

  if (item.type === 'SKIN') {
    return (
      <PreviewPosterFrame
        item={item}
        theme={theme}
        statusLabel={statusLabel}
        footerLabel={isEquipped ? 'Live skin' : isOwned ? 'Owned skin' : 'Preview skin'}
      >
        <div className="absolute inset-x-12 top-7 h-28 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <div className="absolute left-1/2 top-7 h-28 w-28 -translate-x-1/2 rounded-full border border-white/10 bg-white/5" />
        <div className="absolute left-1/2 top-10 h-20 w-20 -translate-x-1/2 rounded-full border border-white/12 bg-white/5" />
        <div className="absolute left-[18%] top-[30%] h-24 w-10 -rotate-[16deg] rounded-full bg-white/6 blur-xl" />
        <div className="absolute right-[16%] top-[34%] h-24 w-12 rotate-[18deg] rounded-full bg-white/6 blur-xl" />
        <PreviewFigure
          headTone={portraitTone.headTone}
          bodyTone={portraitTone.bodyTone}
          maskTone={portraitTone.maskTone}
          accentTone={portraitTone.accentTone}
          scarfTone={portraitTone.scarfTone}
          className="bottom-4"
        />
      </PreviewPosterFrame>
    );
  }

  if (item.type === 'ROPE') {
    const ropeTone =
      item.ropeType === 'chain'
        ? 'from-amber-200/60 via-orange-200/25 to-red-300/20'
        : item.ropeType === 'silk'
        ? 'from-fuchsia-200/55 via-cyan-200/25 to-white/10'
        : item.ropeType === 'reed'
        ? 'from-teal-200/60 via-cyan-200/22 to-emerald-200/16'
        : item.ropeType === 'ember'
        ? 'from-orange-200/65 via-amber-200/24 to-rose-300/18'
        : item.ropeType === 'braid'
        ? 'from-cyan-200/55 via-sky-200/25 to-emerald-200/12'
        : 'from-emerald-200/50 via-lime-200/20 to-cyan-200/15';
    const ropeLabel =
      item.ropeType === 'chain'
        ? 'Heavy line'
        : item.ropeType === 'silk'
        ? 'Smooth line'
        : item.ropeType === 'reed'
        ? 'Buoyant line'
        : item.ropeType === 'ember'
        ? 'Hot line'
        : item.ropeType === 'braid'
        ? 'Tight line'
        : 'Balanced line';
    const ropeClass =
      item.ropeType === 'chain'
        ? 'atlas-preview-rope-chain'
        : item.ropeType === 'silk'
        ? 'atlas-preview-rope-silk'
        : item.ropeType === 'reed'
        ? 'atlas-preview-rope-reed'
        : item.ropeType === 'ember'
        ? 'atlas-preview-rope-ember'
        : item.ropeType === 'braid'
        ? 'atlas-preview-rope-braid'
        : 'atlas-preview-rope-vine';
    const ropeStroke =
      item.ropeType === 'chain'
        ? '#f5d08a'
        : item.ropeType === 'silk'
          ? '#f5d0fe'
          : item.ropeType === 'reed'
            ? '#7dd3c7'
            : item.ropeType === 'ember'
              ? '#fdba74'
              : item.ropeType === 'braid'
                ? '#7dd3fc'
                : '#86efac';

    return (
      <PreviewPosterFrame
        item={item}
        theme={theme}
        statusLabel={statusLabel}
        footerLabel={ropeLabel}
        footerTone="border-cyan-200/15 bg-slate-950/75 text-slate-100"
      >
        <svg viewBox="0 0 320 192" className="absolute inset-0 h-full w-full">
          <path d="M0 148C52 128 102 122 156 134C214 147 252 149 320 120V192H0Z" fill="rgba(15,23,42,0.88)" />
          <path d="M0 166C62 144 118 150 176 170C232 190 274 184 320 166V192H0Z" fill="rgba(30,41,59,0.92)" />
          <path d="M56 42C98 40 134 58 178 90C194 101 206 112 218 126" stroke={ropeStroke} strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>
        <div className="absolute left-[56px] top-[38px] h-3.5 w-3.5 rounded-full bg-white/80 shadow-[0_0_14px_rgba(255,255,255,0.35)]" />
        <div className={`atlas-preview-rope absolute left-[143px] top-[58px] h-24 w-16 -translate-x-1/2 ${ropeClass}`}>
          <div className={`atlas-preview-rope-core bg-gradient-to-b ${ropeTone}`} />
        </div>
        <div className="atlas-preview-swing-mid absolute left-[68%] top-[58%] h-20 w-20 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute bottom-0 left-1/2 h-10 w-12 -translate-x-1/2 rounded-[45%_45%_28%_28%] bg-slate-950 shadow-[0_14px_24px_rgba(0,0,0,0.35)]" />
          <div className="absolute bottom-7 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border-[3px] border-white/90 bg-slate-700" />
          <div className="absolute bottom-[2.5rem] left-[calc(50%-8px)] h-1.5 w-1.5 rounded-full bg-white" />
          <div className="absolute bottom-[2.5rem] left-[calc(50%+2px)] h-1.5 w-1.5 rounded-full bg-white" />
          <div className="absolute bottom-5 left-[calc(50%+12px)] h-10 w-5 -rotate-[28deg] rounded-full bg-white/10" />
        </div>
        {item.ropeType === 'chain' ? (
          <div className="absolute left-[143px] top-[60px] h-[5.5rem] w-16 -translate-x-1/2">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={`chain-link-${index}`}
                className="absolute left-1/2 h-4 w-3 -translate-x-1/2 rounded-full border border-amber-100/70 bg-transparent"
                style={{ top: `${index * 14}px` }}
              />
            ))}
          </div>
        ) : null}
        {item.ropeType === 'braid' ? (
          <>
            <div className="absolute left-[138px] top-[62px] h-20 w-1 rounded-full bg-cyan-100/70" />
            <div className="absolute left-[146px] top-[66px] h-20 w-1 rounded-full bg-emerald-100/55" />
          </>
        ) : null}
        {item.ropeType === 'silk' ? <div className="atlas-preview-glint absolute left-[70%] top-[46%] h-10 w-20 -translate-x-1/2 rounded-full bg-white/22 blur-md" /> : null}
        {item.ropeType === 'reed' ? <div className="atlas-preview-glint absolute left-[70%] top-[48%] h-10 w-20 -translate-x-1/2 rounded-full bg-teal-200/22 blur-md" /> : null}
        {item.ropeType === 'ember' ? <div className="atlas-preview-glint absolute left-[70%] top-[48%] h-10 w-20 -translate-x-1/2 rounded-full bg-orange-200/24 blur-md" /> : null}
      </PreviewPosterFrame>
    );
  }

  if (item.upgradeKey === 'ropeLength' || item.upgradeKey === 'castRange') {
    return (
      <PreviewPosterFrame
        item={item}
        theme={theme}
        statusLabel={statusLabel}
        footerLabel="Wider catch window"
        footerTone="border-cyan-200/15 bg-cyan-500/10 text-cyan-100"
      >
        <svg viewBox="0 0 320 192" className="absolute inset-0 h-full w-full">
          <path d="M0 152C60 134 120 128 170 140C226 154 260 148 320 124V192H0Z" fill="rgba(15,23,42,0.88)" />
          <path d="M54 40C98 42 154 64 226 74" stroke="#7dd3fc" strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>
        <div className="absolute left-[54px] top-[38px] h-3.5 w-3.5 rounded-full bg-cyan-100 shadow-[0_0_14px_rgba(125,211,252,0.45)]" />
        <div className="atlas-preview-beacon absolute right-[54px] top-[58px] h-12 w-12 rounded-full border border-cyan-100/40 bg-cyan-200/10" />
        <div className="absolute right-[67px] top-[71px] h-6 w-6 rounded-full border border-cyan-50/55 bg-cyan-100/20" />
        <div className="absolute right-[73px] top-[77px] h-3 w-3 rounded-full bg-cyan-100 shadow-[0_0_16px_rgba(165,243,252,0.45)]" />
        <div className="absolute left-[55%] top-[44%] h-16 w-16 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute bottom-0 left-1/2 h-8 w-10 -translate-x-1/2 rounded-[45%_45%_28%_28%] bg-slate-950" />
          <div className="absolute bottom-6 left-1/2 h-7 w-7 -translate-x-1/2 rounded-full border-[3px] border-white/90 bg-slate-700" />
        </div>
      </PreviewPosterFrame>
    );
  }

  if (item.upgradeKey === 'swingForce' || item.upgradeKey === 'airControl' || item.upgradeKey === 'launchBoost') {
    return (
      <PreviewPosterFrame
        item={item}
        theme={theme}
        statusLabel={statusLabel}
        footerLabel="More speed through the arc"
        footerTone="border-emerald-200/15 bg-emerald-500/10 text-emerald-100"
      >
        <div className="absolute left-1/2 top-[44%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/12" />
        <div className="absolute left-1/2 top-[44%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/25 border-dashed" />
        <div className="absolute left-[30%] top-[38%] h-px w-16 rotate-[14deg] bg-emerald-100/45" />
        <div className="absolute left-[36%] top-[48%] h-px w-14 rotate-[22deg] bg-emerald-100/32" />
        <div className="absolute right-[30%] top-[34%] h-px w-12 -rotate-[20deg] bg-cyan-100/30" />
        <PreviewFigure
          headTone="bg-emerald-50"
          bodyTone="bg-[linear-gradient(180deg,rgba(5,150,105,0.9),rgba(6,78,59,0.94))]"
          maskTone="bg-slate-950/88"
          accentTone="bg-cyan-300/55"
          scarfTone="bg-emerald-200/75"
          className="bottom-4"
        />
      </PreviewPosterFrame>
    );
  }

  if (item.upgradeKey === 'armor' || item.upgradeKey === 'hazardResist' || item.upgradeKey === 'safetyNet') {
    return (
      <PreviewPosterFrame
        item={item}
        theme={theme}
        statusLabel={statusLabel}
        footerLabel="Safer hits and recoveries"
        footerTone="border-amber-200/15 bg-amber-500/10 text-amber-100"
      >
        <div className="absolute bottom-6 left-[22%] h-10 w-10 rounded-[35%_65%_62%_38%] bg-rose-400/16" />
        <div className="absolute bottom-8 left-[13%] h-5 w-5 rotate-[18deg] rounded-[45%_55%_55%_45%] bg-orange-300/18" />
        <div className="absolute bottom-7 right-[18%] h-11 w-11 rounded-[58%_42%_40%_60%] bg-rose-400/14" />
        <div className="absolute bottom-9 right-[10%] h-6 w-6 rotate-[20deg] rounded-[52%_48%_58%_42%] bg-orange-300/16" />
        <div className="atlas-preview-shield absolute bottom-6 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full border-[3px] border-amber-200/42 bg-amber-200/6 shadow-[0_0_28px_rgba(251,191,36,0.15)]" />
        <PreviewFigure
          headTone="bg-amber-50"
          bodyTone="bg-[linear-gradient(180deg,rgba(180,83,9,0.9),rgba(92,39,8,0.94))]"
          maskTone="bg-slate-950/88"
          accentTone="bg-amber-300/55"
          scarfTone="bg-yellow-200/75"
          className="bottom-4"
        />
      </PreviewPosterFrame>
    );
  }

  return (
    <PreviewPosterFrame
      item={item}
      theme={theme}
      statusLabel={statusLabel}
      footerLabel={currentLevel > 0 ? `Level ${currentLevel}` : 'Preview'}
    >
      <PreviewFigure
        headTone={portraitTone.headTone}
        bodyTone={portraitTone.bodyTone}
        maskTone={portraitTone.maskTone}
        accentTone={portraitTone.accentTone}
        scarfTone={portraitTone.scarfTone}
        className="bottom-4"
      />
    </PreviewPosterFrame>
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
  onGrantTestWallet,
  initialSelectedItemId,
}: Props) {
  const isDev = import.meta.env.DEV;
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
  const tabMeta: Record<
    Props['activeTab'],
    {
      label: string;
      detail: string;
      icon: typeof Zap;
      tone: string;
      idleTone: string;
      count: number;
    }
  > = {
    UPGRADES: {
      label: 'Upgrades',
      detail: 'Rope control, launch power, and survival tuning.',
      icon: Zap,
      tone: 'border-emerald-300/35 bg-emerald-500/14 text-emerald-100 shadow-lg shadow-emerald-950/20',
      idleTone: 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-emerald-200/20 hover:bg-emerald-500/8',
      count: shopItems.filter((item) => item.type === 'UPGRADE').length,
    },
    ROPES: {
      label: 'Rope Types',
      detail: 'Swap the feel of the line itself for different routes.',
      icon: Feather,
      tone: 'border-cyan-300/35 bg-cyan-500/14 text-cyan-100 shadow-lg shadow-cyan-950/20',
      idleTone: 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-cyan-200/20 hover:bg-cyan-500/8',
      count: shopItems.filter((item) => item.type === 'ROPE').length,
    },
    SKINS: {
      label: 'Skins',
      detail: 'Comic-book silhouettes, camp swagger, and route identity.',
      icon: Shirt,
      tone: 'border-amber-300/35 bg-amber-500/14 text-amber-100 shadow-lg shadow-amber-950/20',
      idleTone: 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-amber-200/20 hover:bg-amber-500/8',
      count: shopItems.filter((item) => item.type === 'SKIN').length,
    },
  };

  return (
      <div data-ui-control className="absolute inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(73,124,76,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(170,120,54,0.16),transparent_30%),rgba(2,8,10,0.94)] p-3 font-ui sm:p-4">
      <div className="relative mx-auto flex h-[calc(100svh-1.5rem)] w-full max-w-[1600px] flex-col gap-4 overflow-hidden rounded-[2rem] atlas-surface-strong text-white xl:flex-row">
        <div className="min-w-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-5">
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

            <div className="flex flex-wrap items-center gap-3">
              <div className={`atlas-chip rounded-full px-4 py-2 transition-all ${purchaseReceipt ? 'border-amber-200/20 bg-amber-500/10 text-amber-100 shadow-lg shadow-amber-950/20' : 'text-white'}`}>
                <span className="inline-flex items-center gap-2 text-lg font-bold">
                  <Coins className="text-amber-300" size={18} />
                  {saveData.totalTokens}
                </span>
              </div>
              {isDev && onGrantTestWallet ? (
                <button
                  type="button"
                  onClick={onGrantTestWallet}
                  className="rounded-full border border-emerald-200/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-100 transition-colors hover:bg-emerald-500/18"
                >
                  Test Wallet 5000
                </button>
              ) : null}
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

          <div className="border-b border-white/10 px-4 py-4">
            <div className="grid gap-3 md:grid-cols-3">
              {(['UPGRADES', 'ROPES', 'SKINS'] as const).map((tabKey) => {
                const meta = tabMeta[tabKey];
                const Icon = meta.icon;
                const isActive = activeTab === tabKey;

                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => onChangeTab(tabKey)}
                    className={`rounded-[1.4rem] border px-4 py-4 text-left transition-all ${isActive ? meta.tone : meta.idleTone}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05]">
                        <Icon size={20} />
                      </span>
                      <span className="rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/72">
                        {meta.count}
                      </span>
                    </div>
                    <div className="mt-3 text-lg font-black text-white">{meta.label}</div>
                    <div className="mt-1 text-sm leading-relaxed text-slate-300">{meta.detail}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-5">
              {availableGroups.length > 1 ? (
                <div className="flex flex-wrap gap-2.5">
                  {availableGroups.map((group) => (
                    <button
                      key={group}
                      onClick={() => setSelectedGroup(group)}
                    className={`rounded-full px-4 py-2.5 text-sm font-bold uppercase tracking-[0.18em] transition-colors ${
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

                <div className="atlas-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pr-2">
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
                        className={`relative w-[272px] snap-start shrink-0 rounded-[1.65rem] border p-4 text-left transition-all ${
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

        <div className="atlas-scroll min-h-0 max-h-[42svh] w-full shrink-0 overflow-y-auto border-t border-white/8 bg-[linear-gradient(180deg,rgba(7,14,15,0.94),rgba(12,29,21,0.9))] p-4 xl:max-h-none xl:w-[400px] xl:border-l xl:border-t-0">
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
