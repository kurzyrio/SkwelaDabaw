/**
 * SkwelaDabaw - Web Audio Sound Synthesizer for Philippine Eagle Mascot & Student Actions
 * 
 * 100% Zero external .mp3/.wav assets - fully synthesized in real-time via Web Audio API.
 * Handles browser autoplay policies, iOS/Android WebView audio context suspension, and silent fallback.
 */

export type EagleSoundType = 'chirp' | 'question' | 'success' | 'alert' | 'sleepy';

// Audio Context Singleton
let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!globalAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        globalAudioCtx = new AudioCtxClass();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {
        // Silently ignore if gesture is required
      });
    }
    return globalAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Checks if sound effects are enabled in user settings
 */
export function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('skweladabaw_sound_enabled') !== 'false';
}

/**
 * Updates the user's sound effect preference
 */
export function setAudioEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('skweladabaw_sound_enabled', enabled ? 'true' : 'false');
}

/**
 * Toggles sound effects on/off and returns the new state
 */
export function toggleAudio(): boolean {
  const next = !isAudioEnabled();
  setAudioEnabled(next);
  return next;
}

/**
 * Synthesizes and plays a designated sound effect for the Philippine Eagle companion
 */
export function playEagleSound(type: EagleSoundType): void {
  if (!isAudioEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    switch (type) {
      case 'chirp': {
        // High-pitch, cheerful two-stage bird chirp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1750, now);
        osc.frequency.exponentialRampToValueAtTime(2600, now + 0.06);
        osc.frequency.exponentialRampToValueAtTime(2100, now + 0.14);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }

      case 'question': {
        // Curious inquiring rising tone with subtle vibrato
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.22);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'success': {
        // 3-note celebration fanfare chime (C5 -> E5 -> G5)
        const notes = [
          { freq: 523.25, time: 0.00, dur: 0.12 }, // C5
          { freq: 659.25, time: 0.10, dur: 0.12 }, // E5
          { freq: 783.99, time: 0.20, dur: 0.35 }  // G5
        ];

        notes.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          gain.gain.setValueAtTime(0, now + time);
          gain.gain.linearRampToValueAtTime(0.25, now + time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + dur);
        });
        break;
      }

      case 'alert': {
        // Dual-pulse warning chime (880Hz -> 587Hz)
        const pulses = [
          { freq: 880.00, time: 0.00, dur: 0.10 }, // A5
          { freq: 587.33, time: 0.12, dur: 0.20 }  // D5
        ];

        pulses.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + time);

          // Soften sawtooth harshness with gentle gain
          gain.gain.setValueAtTime(0, now + time);
          gain.gain.linearRampToValueAtTime(0.12, now + time + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + dur);
        });
        break;
      }

      case 'sleepy': {
        // Soft, calming descending lullaby chime (440Hz -> 330Hz -> 220Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.60);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.65);
        break;
      }
    }
  } catch (err) {
    // Autoplay restrictions or background tab execution - silent catch
    console.debug('Web Audio playback skipped:', err);
  }
}

/**
 * ============================================================================
 * REACT NATIVE IMPLEMENTATION EQUIVALENTS (Reference for Mobile Porting)
 * ============================================================================
 * 
 * 1. Using `expo-av`:
 * ----------------------------------------------------------------------------
 * ```typescript
 * import { Audio } from 'expo-av';
 * 
 * const SOUND_MAP = {
 *   chirp: require('../assets/sounds/chirp.mp3'),
 *   question: require('../assets/sounds/question.mp3'),
 *   success: require('../assets/sounds/success.mp3'),
 *   alert: require('../assets/sounds/alert.mp3'),
 *   sleepy: require('../assets/sounds/sleepy.mp3'),
 * };
 * 
 * export async function playEagleSoundRN(type: keyof typeof SOUND_MAP) {
 *   try {
 *     const { sound } = await Audio.Sound.createAsync(
 *       SOUND_MAP[type],
 *       { shouldPlay: true, volume: 0.8 }
 *     );
 *     sound.setOnPlaybackStatusUpdate((status) => {
 *       if (status.isLoaded && status.didJustFinish) {
 *         sound.unloadAsync();
 *       }
 *     });
 *   } catch (e) {
 *     console.debug('Expo audio playback error:', e);
 *   }
 * }
 * ```
 * 
 * 2. Using `react-native-sound`:
 * ----------------------------------------------------------------------------
 * ```typescript
 * import Sound from 'react-native-sound';
 * Sound.setCategory('Ambient', true);
 * 
 * export function playEagleSoundRNSound(type: string) {
 *   const sound = new Sound(`${type}.mp3`, Sound.MAIN_BUNDLE, (error) => {
 *     if (!error) {
 *       sound.play(() => sound.release());
 *     }
 *   });
 * }
 * ```
 */
