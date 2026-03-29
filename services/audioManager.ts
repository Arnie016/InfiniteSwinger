import { Howl } from 'howler';

type MusicOptions = {
  rate?: number;
  startOffset?: number;
  signature?: string;
};

class GameAudioManager {
  private musicTrack: Howl | null = null;
  private musicUrl: string | null = null;
  private musicSignature: string | null = null;
  private muted = false;
  private clipCache = new Map<string, Howl>();
  private masterVolume = 1;
  private sfxVolume = 1;
  private musicMix = 1;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.musicTrack?.pause();
    }
  }

  setMasterVolume(volume: number) {
    this.masterVolume = volume;
    this.musicTrack?.volume(this.musicMix * this.masterVolume);
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = volume;
  }

  playMusic(url: string | null, volume: number, options: MusicOptions = {}) {
    if (!url) {
      this.musicTrack?.pause();
      return;
    }
    this.musicMix = volume;
    const musicRate = options.rate ?? 1;
    const startOffset = Math.max(0, options.startOffset ?? 0);
    const signature = options.signature ?? `${url}|${musicRate}|${startOffset}`;
    const needsNewTrack = !this.musicTrack || this.musicUrl !== url || this.musicSignature !== signature;

    if (needsNewTrack) {
      this.musicTrack?.stop();
      this.musicTrack?.unload();
      this.musicTrack = new Howl({
        src: [url],
        html5: true,
        loop: true,
        preload: true,
        volume: volume * this.masterVolume,
      });
      this.musicUrl = url;
      this.musicSignature = signature;
    } else {
      this.musicTrack.volume(volume * this.masterVolume);
    }

    if (!this.muted && !this.musicTrack.playing()) {
      if (startOffset > 0) {
        this.musicTrack.once('play', (id) => {
          this.musicTrack?.seek(startOffset, id);
        });
      }
      const soundId = this.musicTrack.play();
      this.musicTrack.rate(musicRate, soundId);
    }
  }

  pauseMusic() {
    this.musicTrack?.pause();
  }

  setMusicVolume(volume: number) {
    this.musicMix = volume;
    this.musicTrack?.volume(volume * this.masterVolume);
  }

  playClip(url: string | null, volume: number) {
    if (this.muted || !url) return;
    const finalVolume = volume * this.masterVolume * this.sfxVolume;

    let clip = this.clipCache.get(url);
    if (!clip) {
      clip = new Howl({
        src: [url],
        preload: true,
        volume: finalVolume,
        pool: 8,
      });
      this.clipCache.set(url, clip);
    }

    clip.volume(finalVolume);
    clip.play();
  }

  dispose() {
    this.musicTrack?.stop();
    this.musicTrack?.unload();
    this.musicTrack = null;
    this.musicUrl = null;
    this.musicSignature = null;

    for (const clip of this.clipCache.values()) {
      clip.stop();
      clip.unload();
    }
    this.clipCache.clear();
  }
}

export const audioManager = new GameAudioManager();
