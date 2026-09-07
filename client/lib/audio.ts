import { Howl } from 'howler';
import { API } from './api';

/**
 * Singleton audio player for song clips.
 * Clips are short WAVs served from the backend /media path.
 */
class AudioPlayer {
  private howl: Howl | null = null;

  // Gentle fade-in on (re)play so clips don't start at full volume abruptly.
  private static readonly FADE_FROM = 0.1;
  private static readonly FADE_MS = 400;

  private load(audioPath: string, onEnd?: () => void) {
    this.stop();
    const url = audioPath.startsWith('http') ? audioPath : `${API}/${audioPath}`;
    this.howl = new Howl({
      src: [url],
      html5: true,
      onloaderror: () => {
        // fallback to non-html5 decoding
        this.howl = new Howl({ src: [url], onloaderror: onEnd });
      },
      onend: onEnd,
      onload: onEnd,
    });
  }

  /** Play a clip; resolves once it has started. onEnd fires when the clip ends or loads. */
  play(audioPath: string, onEnd?: () => void) {
    this.load(audioPath, onEnd);
    this.howl?.play();
    this.fadeIn();
  }

  replay() {
    this.howl?.stop();
    this.howl?.play();
    this.fadeIn();
  }

  /** Fade from a low volume up to full volume over FADE_MS. */
  private fadeIn() {
    const h = this.howl;
    if (!h) return;
    h.volume(AudioPlayer.FADE_FROM);
    h.fade(AudioPlayer.FADE_FROM, 1, AudioPlayer.FADE_MS);
  }

  stop() {
    this.howl?.stop();
    this.howl = null;
  }
}

export const audio = new AudioPlayer();
