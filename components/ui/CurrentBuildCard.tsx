import React from 'react';
import { Anchor, BadgeCheck, Feather, Leaf, Link2, Shield, Sparkles, Wind } from 'lucide-react';

import { CurrentBuildSummary } from '../../types';

const toneClasses: Record<string, string> = {
  emerald: 'border-emerald-200/15 bg-emerald-500/10 text-emerald-100',
  amber: 'border-amber-200/15 bg-amber-500/10 text-amber-100',
  cyan: 'border-cyan-200/15 bg-cyan-500/10 text-cyan-100',
  rose: 'border-rose-200/15 bg-rose-500/10 text-rose-100',
};

const sectionMeta = {
  rope: { label: 'Rope Control', compactLabel: 'Rope', icon: Wind, tone: 'text-cyan-200 border-cyan-200/20 bg-cyan-500/10' },
  movement: { label: 'Launch & Recovery', compactLabel: 'Launch', icon: Sparkles, tone: 'text-emerald-200 border-emerald-200/20 bg-emerald-500/10' },
  defense: { label: 'Survival & Utility', compactLabel: 'Survival', icon: Shield, tone: 'text-amber-200 border-amber-200/20 bg-amber-500/10' },
} as const;

const sectionLevelTone = {
  rope: 'bg-cyan-200',
  movement: 'bg-emerald-200',
  defense: 'bg-amber-200',
} as const;

const ropeTypeMeta = {
  vine: { icon: Leaf, tone: 'text-emerald-200 border-emerald-200/20 bg-emerald-500/10' },
  braid: { icon: Link2, tone: 'text-cyan-200 border-cyan-200/20 bg-cyan-500/10' },
  chain: { icon: Anchor, tone: 'text-amber-200 border-amber-200/20 bg-amber-500/10' },
  silk: { icon: Feather, tone: 'text-fuchsia-200 border-fuchsia-200/20 bg-fuchsia-500/10' },
} as const;

const renderLevelDots = (level: number, section: keyof typeof sectionLevelTone, maxLevel = 5) => (
  <div
    className="mt-2 flex items-center gap-1.5"
    aria-label={`Level ${level} of ${maxLevel}`}
    title={`Level ${level} of ${maxLevel}`}
  >
    {Array.from({ length: maxLevel }).map((_, index) => (
      <span
        key={`${section}-dot-${index}`}
        className={`h-2 w-2 rounded-full border border-white/10 ${
          index < level ? sectionLevelTone[section] : 'bg-white/8 opacity-35'
        }`}
      />
    ))}
  </div>
);

export function CurrentBuildCard({
  summary,
  className = '',
  compact = false,
}: {
  summary: CurrentBuildSummary;
  className?: string;
  compact?: boolean;
}) {
  const visibleMilestones = compact
    ? summary.milestones.filter((milestone) => milestone.unlocked).slice(0, 4)
    : summary.milestones;
  const visibleSynergies = compact ? summary.synergies.slice(0, 2) : summary.synergies;
  const visibleRouteFit = compact ? summary.routeFitTags.slice(0, 2) : summary.routeFitTags;
  const RopeIcon = ropeTypeMeta[summary.ropeType.id].icon;
  const ropeTone = ropeTypeMeta[summary.ropeType.id].tone;
  const compactSections = (['rope', 'movement', 'defense'] as const).map((sectionKey) => {
    const entries = summary[sectionKey];
    return {
      key: sectionKey,
      meta: sectionMeta[sectionKey],
      primary: entries[0] ?? null,
      extraCount: Math.max(0, entries.length - 1),
    };
  });

  if (compact) {
    return (
      <div className={`atlas-surface rounded-[1.55rem] p-3 ${className}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="atlas-map-label text-[10px] text-emerald-100/55">Current Loadout</div>
            <div className="atlas-title mt-1 truncate text-xl text-white">{summary.equippedSkin}</div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/8 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${ropeTone}`}>
                <RopeIcon size={10} />
              </span>
              <span className="text-emerald-200">Rope</span>
              {summary.ropeType.label}
            </div>
            <div className="mt-2 text-[10px] leading-relaxed text-slate-400">{summary.ropeType.description}</div>
          </div>
          <div className="atlas-chip shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
            Live
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {compactSections.map(({ key, meta, primary, extraCount }) => {
            const Icon = meta.icon;
            return (
              <div key={key} className="atlas-surface-soft rounded-2xl p-2.5">
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-slate-400">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${meta.tone}`}>
                    <Icon size={11} />
                  </span>
                      <span className="truncate">{meta.compactLabel}</span>
                </div>
                {primary ? (
                  <div className="mt-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-white">{primary.label}</div>
                            {renderLevelDots(primary.level, key)}
                          </div>
                          {extraCount > 0 ? <div className="atlas-chip rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-300">+{extraCount}</div> : null}
                        </div>
                      </div>
                ) : (
                  <div className="mt-2 text-[10px] text-slate-500">No upgrades yet</div>
                )}
              </div>
          );
        })}
        </div>

        <div className="mt-3">
          <div className="atlas-map-label text-[10px] text-slate-400">Route Fit</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleRouteFit.length > 0 ? (
              visibleRouteFit.map((tag) => (
                <span
                  key={tag}
                  className="atlas-chip rounded-full border-emerald-200/15 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-100"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="atlas-chip rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Balanced fit
              </span>
            )}
          </div>
        </div>

        {visibleSynergies.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleSynergies.map((synergy) => (
              <span key={synergy} className="atlas-chip rounded-full border-cyan-200/15 bg-cyan-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-100">
                {synergy}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`atlas-surface rounded-[1.75rem] p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="atlas-map-label text-[10px] text-emerald-100/55">Current Loadout</div>
          <div className="atlas-title mt-2 text-2xl text-white">{summary.equippedSkin}</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/8 bg-slate-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
            <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${ropeTone}`}>
              <RopeIcon size={10} />
            </span>
            <span className="text-emerald-200">Rope</span>
            {summary.ropeType.label}
          </div>
          <div className="mt-2 text-xs leading-relaxed text-slate-400">{summary.ropeType.description}</div>
        </div>
        <div className="atlas-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
          Live
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {(['rope', 'movement', 'defense'] as const).map((sectionKey) => {
          const section = summary[sectionKey];
          const meta = sectionMeta[sectionKey];
          const Icon = meta.icon;
          return (
            <div key={sectionKey} className="atlas-surface-soft rounded-2xl p-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-slate-400">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${meta.tone}`}>
                  <Icon size={13} />
                </span>
                {meta.label}
              </div>
                <div className="mt-3 space-y-2">
                {section.map((entry) => (
                  <div key={entry.key} className="flex items-start justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                    <div>
                      <div className="text-sm font-bold text-white">{entry.label}</div>
                      <div className="text-xs text-slate-400">{entry.description}</div>
                      {renderLevelDots(entry.level, sectionKey)}
                    </div>
                    <div className="rounded-full border border-white/10 bg-slate-900 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                      {entry.level}/5
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="atlas-map-label flex items-center gap-2 text-[10px] text-slate-400">
          <BadgeCheck size={14} />
          {compact ? 'Milestones' : 'Camp Milestones'}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleMilestones.map((milestone) => (
            <span
              key={milestone.id}
              className={`atlas-chip rounded-full border ${compact ? 'px-2 py-1 text-[10px] tracking-[0.18em]' : 'px-3 py-1 text-[11px] tracking-[0.24em]'} font-bold uppercase ${
                milestone.unlocked
                  ? toneClasses[milestone.tone]
                  : 'border-white/8 bg-slate-950/80 text-slate-500'
              }`}
              title={milestone.description}
            >
              {milestone.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="atlas-surface-soft rounded-2xl p-3">
          <div className="atlas-map-label text-[10px] text-slate-400">Why It Works</div>
          <div className="mt-3 space-y-2">
            {visibleSynergies.length > 0 ? (
              visibleSynergies.map((synergy) => (
                <div key={synergy} className="rounded-xl border border-cyan-200/10 bg-cyan-500/5 px-3 py-2 text-xs leading-relaxed text-cyan-50">
                  {synergy}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
                Build synergies appear here once the kit starts combining cleanly.
              </div>
            )}
          </div>
        </div>

        <div className="atlas-surface-soft rounded-2xl p-3">
          <div className="atlas-map-label text-[10px] text-slate-400">Best Routes</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleRouteFit.length > 0 ? (
              visibleRouteFit.map((tag) => (
                <span
                  key={tag}
                  className="atlas-chip rounded-full border-emerald-200/15 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-100"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="atlas-chip rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Balanced build
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
