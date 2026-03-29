import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Download,
  LockOpen,
  Monitor,
  Upload,
  RotateCcw,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

import { GameSettings, PlayerMoodPreset, SettingsTab, SwingLabConfig } from '../types';
import {
  assessSwingLabConfig,
  BALANCED_SWING_LAB_CONFIG,
  SWING_LAB_PRESETS,
  SWING_LAB_RANGES,
} from '../engine/swingLab';

const volumeLabel = (value: number) => `${Math.round(value * 100)}%`;
const mapLabel = (value: number) => `${Math.round(value * 100)}%`;
const mapCameraStyles = ['steady', 'cinematic', 'dynamic'] as const;
const mapFxIntensities = ['low', 'medium', 'high'] as const;
const depthFocusOptions = ['off', 'subtle', 'strong'] as const;
const cameraShakeOptions = ['off', 'reduced', 'full'] as const;
const menuParallaxOptions = ['off', 'on'] as const;
const visualDensityLabels = {
  lush: 'AMPLIFIED',
  balanced: 'BALANCED',
  clean: 'LEAN',
} as const;

const tabs: SettingsTab[] = ['General', 'Audio', 'Display', 'Swing Lab', 'Data'];
const settingsGridClass = 'animate-in fade-in grid min-h-[560px] auto-rows-fr gap-4 xl:grid-cols-2';
const settingsCardClass = 'atlas-surface-soft rounded-2xl p-5';

export function SettingsModal({
  settings,
  isMuted,
  isFullscreen,
  selectedMoodPreset,
  swingLabConfig,
  initialTab = 'General',
  saveRecoveryNotice,
  onClose,
  onToggleMute,
  onToggleFullscreen,
  onChange,
  onUnlockAllLevels,
  onResetProgress,
  onOpenStory,
  onReturnToMenu,
  onApplySwingLab,
  onExportSave,
  onImportSave,
}: {
  settings: GameSettings;
  isMuted: boolean;
  isFullscreen: boolean;
  selectedMoodPreset: PlayerMoodPreset;
  swingLabConfig: SwingLabConfig;
  initialTab?: SettingsTab;
  saveRecoveryNotice: string | null;
  onClose: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void | Promise<void>;
  onChange: (patch: Partial<GameSettings>) => void;
  onUnlockAllLevels: () => void;
  onResetProgress: () => void;
  onOpenStory: () => void;
  onReturnToMenu?: () => void;
  onApplySwingLab: (preset: PlayerMoodPreset, config: SwingLabConfig) => void;
  onExportSave: () => void;
  onImportSave: (file: File) => void | Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('General');
  const [draftPreset, setDraftPreset] = useState<PlayerMoodPreset>(selectedMoodPreset);
  const [draftSwingLab, setDraftSwingLab] = useState<SwingLabConfig>(swingLabConfig);
  const [showUnsafeConfirm, setShowUnsafeConfirm] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftPreset(selectedMoodPreset);
    setDraftSwingLab(swingLabConfig);
    setShowUnsafeConfirm(false);
  }, [selectedMoodPreset, swingLabConfig]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const safety = useMemo(() => assessSwingLabConfig(draftSwingLab), [draftSwingLab]);

  const applySwingLab = () => {
    if (safety.state === 'Unstable' && !showUnsafeConfirm) {
      setShowUnsafeConfirm(true);
      return;
    }
    onApplySwingLab(draftPreset, draftSwingLab);
    setShowUnsafeConfirm(false);
  };

  const setPreset = (preset: Exclude<PlayerMoodPreset, 'Custom'>) => {
    setDraftPreset(preset);
    setDraftSwingLab(SWING_LAB_PRESETS[preset]);
    setShowUnsafeConfirm(false);
  };

  const updateDraftSwingLab = (key: keyof SwingLabConfig, value: number) => {
    setDraftPreset('Custom');
    setDraftSwingLab((prev) => ({ ...prev, [key]: value }));
    setShowUnsafeConfirm(false);
  };

  const safetyTone =
    safety.state === 'Safe'
      ? 'border-emerald-200/15 bg-emerald-500/10 text-emerald-100'
      : safety.state === 'Caution'
      ? 'border-amber-200/15 bg-amber-500/10 text-amber-100'
      : 'border-rose-200/15 bg-rose-500/10 text-rose-100';

  return (
    <div data-ui-control className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-950/82 px-3 font-ui backdrop-blur-[10px] sm:px-4">
      <div className="atlas-surface-strong flex h-[min(90vh,860px)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] p-4 text-white sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="atlas-map-label text-[11px] text-emerald-200/70">Settings</div>
            <h2 className="atlas-title mt-2 text-3xl text-white">Tune The Run</h2>
            <p className="atlas-panel-copy mt-2 max-w-2xl text-sm text-slate-300">
              Keep the controls, then tune sound, visuals, and Swing Lab in one place.
            </p>
          </div>
          <button
            onClick={onClose}
            className="atlas-surface rounded-xl p-3 text-slate-200 transition-colors hover:bg-slate-800"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mt-5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[208px,minmax(0,1fr)]">
          <div className="atlas-surface h-full rounded-[1.7rem] p-3">
            <div className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-[0.22em] transition-colors ${
                    activeTab === tab
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-950/70 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="atlas-surface flex h-full min-h-0 flex-col rounded-[1.8rem] p-4 sm:p-5">
            <div className="h-full min-h-0 overflow-y-auto pr-1">
            {activeTab === 'General' && (
              <div className={settingsGridClass}>
                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-slate-400">HUD Size</div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {(['full', 'compact', 'hidden'] as const).map((density) => (
                      <button
                        key={density}
                        onClick={() => onChange({ hudDensity: density })}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                          settings.hudDensity === density
                            ? 'bg-emerald-400 text-slate-950'
                            : 'border border-white/10 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {visualDensityLabels[density]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-slate-400">Reduce Motion</div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {(['full', 'reduced'] as const).map((motion) => (
                      <button
                        key={motion}
                        onClick={() => onChange({ motionIntensity: motion })}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                          settings.motionIntensity === motion
                            ? 'bg-cyan-300 text-slate-950'
                            : 'border border-white/10 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {motion.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`${settingsCardClass} xl:col-span-2`}>
                  <div className="atlas-map-label text-[11px] text-slate-400">Controls</div>
                  <div className="atlas-panel-copy mt-4 grid gap-2 text-sm text-slate-200">
                    <div>Hold `E` or mouse to latch.</div>
                    <div>Space jumps. Double click reels rope out.</div>
                    <div>`D` drives. `A` brakes and opens the arc.</div>
                    <div>`W / S` shape rope while swinging. `Q` triggers Focus if unlocked.</div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={onOpenStory}
                      className="atlas-surface rounded-xl px-4 py-3 text-sm font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800"
                    >
                      <span className="inline-flex items-center gap-2">
                        <BookOpen size={16} />
                        REPLAY STORY
                      </span>
                    </button>
                    <button
                      onClick={onClose}
                      className="atlas-surface rounded-xl px-4 py-3 text-sm font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800"
                    >
                      CLOSE SETTINGS
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Audio' && (
              <div className={settingsGridClass}>
                <div className={`${settingsCardClass} xl:col-span-2`}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    <Volume2 size={16} />
                    Audio
                  </div>
                  <div className="mt-5 grid gap-4">
                    {[
                      ['masterVolume', 'Master', settings.masterVolume, 'accent-emerald-400'],
                      ['musicVolume', 'Music', settings.musicVolume, 'accent-cyan-400'],
                      ['sfxVolume', 'SFX', settings.sfxVolume, 'accent-amber-400'],
                    ].map(([key, label, value, accent]) => (
                      <label key={String(key)} className="block">
                        <div className="mb-2 flex items-center justify-between text-sm text-slate-200">
                          <span>{label}</span>
                          <span>{volumeLabel(value as number)}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={value as number}
                          onChange={(event) => onChange({ [key]: Number(event.target.value) } as Partial<GameSettings>)}
                          className={`w-full ${accent}`}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={onToggleMute}
                      className="atlas-surface rounded-xl px-4 py-3 text-sm font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800"
                    >
                      {isMuted ? 'UNMUTE' : 'MUTE'}
                    </button>
                    <div className="atlas-surface-soft rounded-xl px-4 py-3 text-sm text-slate-300">
                      Voiceover and level-by-level music can drop in later.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Display' && (
              <div className={settingsGridClass}>
                <div className={settingsCardClass}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    <Monitor size={16} />
                    Screen
                  </div>
                  <div className="mt-5">
                    <button
                      onClick={() => void onToggleFullscreen()}
                      className="atlas-surface w-full rounded-xl px-4 py-3 text-sm font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800"
                    >
                      {isFullscreen ? 'WINDOWED' : 'FULLSCREEN'}
                    </button>
                  </div>
                  <div className="atlas-surface-soft mt-4 rounded-xl px-4 py-3 text-sm text-slate-300">
                    Reduced motion automatically softens the strongest story pans, focus pulls, and shake.
                  </div>
                </div>

                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-slate-400">Map Contrast</div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-200">
                          <span>Route lines</span>
                      <span>{mapLabel(settings.mapClarity)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.35"
                      max="1"
                      step="0.05"
                      value={settings.mapClarity}
                      onChange={(event) => onChange({ mapClarity: Number(event.target.value) })}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>

                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-slate-400">Map Motion</div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {mapCameraStyles.map((style) => (
                      <button
                        key={style}
                        onClick={() => onChange({ mapCameraStyle: style })}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                          settings.mapCameraStyle === style
                            ? 'bg-cyan-300 text-slate-950'
                            : 'border border-white/10 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {style.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-slate-400">Map FX</div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {mapFxIntensities.map((intensity) => (
                      <button
                        key={intensity}
                        onClick={() => onChange({ mapFxIntensity: intensity })}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                          settings.mapFxIntensity === intensity
                            ? 'bg-amber-300 text-slate-950'
                            : 'border border-white/10 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {intensity.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="atlas-surface-soft rounded-2xl p-4">
                  <div className="atlas-map-label text-[11px] text-slate-400">Depth Focus</div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {depthFocusOptions.map((focus) => (
                      <button
                        key={focus}
                        onClick={() => onChange({ depthFocus: focus })}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                          settings.depthFocus === focus
                            ? 'bg-emerald-400 text-slate-950'
                            : 'border border-white/10 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {focus.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-slate-400">Camera Shake</div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {cameraShakeOptions.map((shake) => (
                      <button
                        key={shake}
                        onClick={() => onChange({ gameplayCameraShake: shake })}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                          settings.gameplayCameraShake === shake
                            ? 'bg-rose-300 text-slate-950'
                            : 'border border-white/10 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {shake.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-slate-400">Menu Parallax</div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {menuParallaxOptions.map((parallax) => (
                      <button
                        key={parallax}
                        onClick={() => onChange({ menuParallax: parallax })}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                          settings.menuParallax === parallax
                            ? 'bg-fuchsia-300 text-slate-950'
                            : 'border border-white/10 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {parallax.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`${settingsCardClass} xl:col-span-2`}>
                  <div className="atlas-map-label text-[11px] text-slate-400">Scene Density</div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {(['lush', 'balanced', 'clean'] as const).map((density) => (
                      <button
                        key={density}
                        onClick={() => onChange({ visualDensity: density })}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                          settings.visualDensity === density
                            ? 'bg-amber-300 text-slate-950'
                            : 'border border-white/10 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {density.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Swing Lab' && (
              <div className="animate-in fade-in grid min-h-[560px] auto-rows-fr gap-4">
                <div className={settingsCardClass}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    <SlidersHorizontal size={16} />
                    Swing Presets
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {(Object.keys(SWING_LAB_PRESETS) as (keyof typeof SWING_LAB_PRESETS)[]).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setPreset(preset)}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                          draftPreset === preset
                            ? 'bg-emerald-400 text-slate-950'
                            : 'border border-white/10 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-slate-300">
                    `Balanced` matches your approved feel. Manual slider changes switch this to `Custom`.
                  </div>
                </div>

                <div className={`atlas-surface rounded-2xl p-5 ${safetyTone}`}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
                    <AlertTriangle size={16} />
                    Safety Assessment
                  </div>
                  <div className="mt-3 text-2xl font-black">{safety.state}</div>
                  <div className="mt-2 text-sm">{safety.summary}</div>
                  {safety.reasons.length > 0 ? (
                    <div className="mt-3 space-y-2 text-sm">
                      {safety.reasons.map((reason) => (
                        <div key={reason}>{reason}</div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {(Object.keys(SWING_LAB_RANGES) as (keyof SwingLabConfig)[]).map((key) => {
                    const range = SWING_LAB_RANGES[key];
                    return (
                        <label key={key} className={settingsCardClass}>
                        <div className="mb-2 flex items-center justify-between text-sm text-slate-200">
                          <span>{range.label}</span>
                          <span>{draftSwingLab[key].toFixed(key === 'maxSpeed' ? 0 : 3)}</span>
                        </div>
                        <input
                          type="range"
                          min={range.min}
                          max={range.max}
                          step={range.step}
                          value={draftSwingLab[key]}
                          onChange={(event) => updateDraftSwingLab(key, Number(event.target.value))}
                          className="w-full accent-emerald-400"
                        />
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={applySwingLab}
                    className={`rounded-xl px-5 py-3 text-sm font-black tracking-[0.24em] transition-colors ${
                      safety.state === 'Unstable'
                        ? 'bg-rose-500 text-white hover:bg-rose-400'
                        : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                    }`}
                  >
                    {showUnsafeConfirm && safety.state === 'Unstable' ? 'CONFIRM UNSTABLE SETUP' : 'APPLY SWING LAB'}
                  </button>
                  <button
                    onClick={() => {
                      setDraftPreset('Balanced');
                      setDraftSwingLab(BALANCED_SWING_LAB_CONFIG);
                      setShowUnsafeConfirm(false);
                    }}
                      className="atlas-surface rounded-xl px-5 py-3 text-sm font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800"
                    >
                    RESET TO BALANCED
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Data' && (
              <div className={settingsGridClass}>
                {saveRecoveryNotice && (
                  <div className="atlas-surface-soft rounded-2xl px-5 py-4 text-sm text-amber-50 xl:col-span-2">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-200" />
                      <div className="min-w-0">
                        <div className="font-bold uppercase tracking-[0.18em] text-amber-100">Save Recovery</div>
                        <div className="mt-1 text-amber-50/90">{saveRecoveryNotice}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-emerald-100/65">Save Backup</div>
                  <div className="mt-3 text-base text-slate-200">
                    Export your progress as a local backup file. You can restore it later on the same device or another browser.
                  </div>
                  <button
                    onClick={onExportSave}
                    className="atlas-surface mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black tracking-[0.18em] text-emerald-100 transition-colors hover:bg-emerald-500/20"
                  >
                    <Download size={16} />
                    EXPORT SAVE
                  </button>
                </div>

                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-cyan-100/65">Restore Backup</div>
                  <div className="mt-3 text-base text-slate-200">
                    Import a save backup if you clear storage or move to a new browser.
                  </div>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      void onImportSave(file);
                    }}
                  />
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="atlas-surface mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black tracking-[0.18em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                  >
                    <Upload size={16} />
                    IMPORT SAVE
                  </button>
                </div>

                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-emerald-100/65">Testing</div>
                  <div className="mt-3 text-base text-slate-200">
                    Unlock every route for testing without changing the guest-first product shape.
                  </div>
                  <button
                    onClick={onUnlockAllLevels}
                    className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm font-black tracking-[0.18em] text-emerald-100 transition-colors hover:bg-emerald-500/20"
                  >
                    <LockOpen size={16} />
                    UNLOCK ALL
                  </button>
                </div>
                <div className={settingsCardClass}>
                  <div className="atlas-map-label text-[11px] text-rose-200/70">Reset Save</div>
                  <div className="mt-3 text-base text-slate-200">
                    Wipes route progress, tokens, upgrades, achievements, and shop ownership. Presentation settings stay intact.
                  </div>
                  <button
                    onClick={onResetProgress}
                    className="mt-4 flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-500 px-4 py-3 text-sm font-black tracking-[0.18em] text-white transition-colors hover:bg-rose-400"
                  >
                    <RotateCcw size={16} />
                    RESET SAVE
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        <div className="atlas-surface mt-6 flex items-center justify-between rounded-2xl px-5 py-4 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            {isMuted ? <VolumeX size={18} className="text-rose-300" /> : <Volume2 size={18} className="text-emerald-300" />}
            {isMuted ? 'Muted now. Mix sliders stay saved for when audio comes back.' : 'Settings save instantly on this device.'}
          </div>
          <div className="flex items-center gap-3">
            {onReturnToMenu ? (
              <button
                onClick={onReturnToMenu}
                className="atlas-surface rounded-xl px-4 py-2 text-xs font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800"
              >
                MAIN MENU
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="atlas-surface rounded-xl px-4 py-2 text-xs font-bold tracking-[0.24em] text-slate-100 transition-colors hover:bg-slate-800"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
