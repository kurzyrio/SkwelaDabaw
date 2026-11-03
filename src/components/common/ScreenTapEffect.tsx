import React, { useEffect, useState, useCallback, useRef } from 'react';
import { isAudioEnabled } from '../../utils/audio';

export type TapEffectStyle =
  | 'feathers'
  | 'stars_sparks'
  | 'cyber_rings'
  | 'hearts_affinity'
  | 'comic_burst'
  | 'bubble_pop'
  | 'firework_confetti'
  | 'sparkles'
  | 'none';

export type TapSoundType = 'pop' | 'chirp' | 'sparkle' | 'laser' | 'heart' | 'bubble' | 'none' | 'auto';

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  scale: number;
  color: string;
  secondaryColor?: string;
  shape: string;
  opacity: number;
  size: number;
  createdAt: number;
  lifeTime: number;
}

const CONFETTI_COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FBBF24', '#06B6D4'];

let audioCtx: AudioContext | null = null;

export function playTapSound(soundType: string, style: TapEffectStyle = 'feathers') {
  if (typeof window === 'undefined') return;
  // Strict global audio mute check
  if (!isAudioEnabled()) return;
  
  let resolvedSound = soundType;
  if (soundType === 'auto') {
    switch (style) {
      case 'feathers': resolvedSound = 'chirp'; break;
      case 'stars_sparks': resolvedSound = 'sparkle'; break;
      case 'cyber_rings': resolvedSound = 'laser'; break;
      case 'hearts_affinity': resolvedSound = 'heart'; break;
      case 'bubble_pop': resolvedSound = 'bubble'; break;
      case 'comic_burst': resolvedSound = 'pop'; break;
      case 'firework_confetti': resolvedSound = 'sparkle'; break;
      default: resolvedSound = 'pop'; break;
    }
  }

  if (resolvedSound === 'none') return;

  try {
    if (!audioCtx) {
      const AudioClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioClass) audioCtx = new AudioClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!audioCtx) return;

    const ctx = audioCtx;
    const now = ctx.currentTime;

    if (resolvedSound === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.05);
    } else if (resolvedSound === 'chirp') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.16);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.16);
    } else if (resolvedSound === 'sparkle') {
      [587.33, 880, 1174.66].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.035);
        gain.gain.setValueAtTime(0.1, now + i * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.035 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.035);
        osc.stop(now + i * 0.035 + 0.12);
      });
    } else if (resolvedSound === 'laser') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.12);
    } else if (resolvedSound === 'heart') {
      [440, 554.37, 659.25].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.04);
        gain.gain.setValueAtTime(0.12, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.18);
      });
    } else if (resolvedSound === 'bubble') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.08);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.08);
    }
  } catch {
    // Graceful fallback
  }
}

export function getSavedTapEffectStyle(): TapEffectStyle {
  if (typeof window === 'undefined') return 'feathers';
  return (localStorage.getItem('skweladabaw_tap_fx_style') as TapEffectStyle) || 'feathers';
}

export function getSavedTapSound(): TapSoundType {
  if (typeof window === 'undefined') return 'auto';
  return (localStorage.getItem('skweladabaw_tap_fx_sound') as TapSoundType) || 'auto';
}

export function getSavedTapSpeed(): 'gentle' | 'normal' | 'snappy' {
  if (typeof window === 'undefined') return 'snappy';
  return (localStorage.getItem('skweladabaw_tap_fx_speed') as 'gentle' | 'normal' | 'snappy') || 'snappy';
}

export function isTapEffectEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem('skweladabaw_tap_fx_enabled');
  return val === null ? true : val === 'true';
}

export function notifyTapSettingsChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('skweladabaw-tap-fx-change'));
}

export const ScreenTapEffect: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [effectStyle, setEffectStyle] = useState<TapEffectStyle>(getSavedTapEffectStyle);
  const [soundChoice, setSoundChoice] = useState<TapSoundType>(getSavedTapSound);
  const [speed, setSpeed] = useState<'gentle' | 'normal' | 'snappy'>(getSavedTapSpeed);
  const [isEnabled, setIsEnabled] = useState<boolean>(isTapEffectEnabled);

  const activeSettingsRef = useRef({ effectStyle, soundChoice, speed, isEnabled });
  useEffect(() => {
    activeSettingsRef.current = { effectStyle, soundChoice, speed, isEnabled };
  }, [effectStyle, soundChoice, speed, isEnabled]);

  // Sync settings whenever modified in SettingsPage
  useEffect(() => {
    const handleSync = () => {
      setEffectStyle(getSavedTapEffectStyle());
      setSoundChoice(getSavedTapSound());
      setSpeed(getSavedTapSpeed());
      setIsEnabled(isTapEffectEnabled());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('skweladabaw-tap-fx-change', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('skweladabaw-tap-fx-change', handleSync);
    };
  }, []);

  const spawnParticles = useCallback((clientX: number, clientY: number) => {
    const { effectStyle: currentStyle, soundChoice: currentSound, speed: currentSpeed, isEnabled: active } = activeSettingsRef.current;
    if (!active || currentStyle === 'none') return;

    const now = performance.now();
    const speedMultiplier = currentSpeed === 'snappy' ? 1.25 : currentSpeed === 'gentle' ? 0.75 : 1.0;
    
    // Refined compact particle count (6 to 8) and compact burst radius (38px)
    const count = currentStyle === 'sparkles' ? 6 : 8;
    const radius = 38;
    const newItems: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const velocity = ((radius * (0.5 + Math.random() * 0.5)) / 14) * speedMultiplier;

      let shape = 'feather';
      let color = '#5A361C';
      let secondaryColor = '#F6ECD5';
      let size = 6.5 + Math.random() * 2.5; // Small, refined particle size (5px - 9px)
      const lifeTime = (380 + Math.random() * 180) / speedMultiplier;

      switch (currentStyle) {
        case 'feathers':
          shape = i % 3 === 0 ? 'down_tuft' : i % 3 === 1 ? 'feather' : 'sparkle_dot';
          color = i % 2 === 0 ? '#5A361C' : '#674121';
          secondaryColor = '#F6ECD5';
          if (shape === 'sparkle_dot') {
            color = '#F59E0B';
            size = 3.5 + Math.random() * 1.5;
          }
          break;
        case 'stars_sparks':
          shape = i % 2 === 0 ? 'star' : 'spark_line';
          color = ['#F59E0B', '#FBBF24', '#FEF08A', '#FFFFFF'][i % 4];
          size = 5.5 + Math.random() * 2.5;
          break;
        case 'cyber_rings':
          shape = i % 3 === 0 ? 'cyber_shard' : i % 3 === 1 ? 'ring' : 'spark_line';
          color = ['#06B6D4', '#22D3EE', '#EC4899', '#A855F7', '#10B981'][i % 5];
          size = 5 + Math.random() * 3;
          break;
        case 'hearts_affinity':
          shape = i % 3 === 0 ? 'spark_line' : 'heart';
          color = ['#F43F5E', '#FB7185', '#FDA4AF', '#E11D48', '#FFEDD5'][i % 5];
          size = 5.5 + Math.random() * 2.5;
          break;
        case 'comic_burst':
          shape = i % 3 === 0 ? 'comic_spark' : 'comic_dot';
          color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
          size = 4.5 + Math.random() * 2.5;
          break;
        case 'bubble_pop':
          shape = i % 4 === 0 ? 'droplet' : 'bubble';
          color = ['#38BDF8', '#67E8F9', '#BAE6FD', '#E0F2FE'][i % 4];
          size = 5.5 + Math.random() * 3;
          break;
        case 'firework_confetti':
          shape = i % 2 === 0 ? 'confetti' : 'confetti_strip';
          color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
          size = 4 + Math.random() * 2.5;
          break;
        case 'sparkles':
        default:
          shape = 'star';
          color = ['#F59E0B', '#FBBF24', '#38BDF8', '#EC4899'][i % 4];
          size = 4.5 + Math.random() * 2.5;
          break;
      }

      newItems.push({
        id: `${now}-${i}-${Math.random()}`,
        x: clientX,
        y: clientY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 14,
        scale: 1,
        color,
        secondaryColor,
        shape,
        opacity: 1,
        size,
        createdAt: now,
        lifeTime,
      });
    }

    setParticles((prev) => [...prev.slice(-35), ...newItems]);
    playTapSound(currentSound, currentStyle);
  }, []);

  // Global Pointer Down & Touch Listener with Capture Phase & Deduplication
  useEffect(() => {
    let lastTapTimestamp = 0;

    const triggerTap = (clientX: number, clientY: number, target: EventTarget | null) => {
      const now = performance.now();
      if (now - lastTapTimestamp < 50) return; // Deduplicate pointerdown + touchstart double-firing
      lastTapTimestamp = now;

      const el = target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        return;
      }
      spawnParticles(clientX, clientY);
    };

    const handlePointer = (e: PointerEvent) => {
      triggerTap(e.clientX, e.clientY, e.target);
    };

    const handleTouch = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        triggerTap(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }
    };

    window.addEventListener('pointerdown', handlePointer, { capture: true, passive: true });
    window.addEventListener('touchstart', handleTouch, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointer, { capture: true });
      window.removeEventListener('touchstart', handleTouch, { capture: true });
    };
  }, [spawnParticles]);

  // Zero-Gravity Radial Deceleration Loop
  useEffect(() => {
    let frame: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const friction = speed === 'snappy' ? 0.88 : speed === 'gentle' ? 0.93 : 0.90;

      setParticles((prev) => {
        if (prev.length === 0) return prev;
        return prev
          .map((p) => {
            const age = Math.max(0, now - p.createdAt);
            const prog = p.lifeTime > 0 ? Math.min(1, Math.max(0, age / p.lifeTime)) : 1;
            if (prog >= 1) return null;

            const rawOpacity = 1 - Math.pow(prog, 1.4);
            const opacity = Number.isFinite(rawOpacity) ? Math.max(0, Math.min(1, rawOpacity)) : 0;
            const scaleProg = prog < 0.1 ? Math.max(0.1, prog / 0.1) : 1;
            const rawScale = (1 - prog * 0.4) * scaleProg;
            const scale = Number.isFinite(rawScale) ? Math.max(0.1, rawScale) : 1;

            return {
              ...p,
              x: Number.isFinite(p.x + p.vx * dt * 60) ? p.x + p.vx * dt * 60 : p.x,
              y: Number.isFinite(p.y + p.vy * dt * 60) ? p.y + p.vy * dt * 60 : p.y,
              vx: p.vx * friction,
              vy: p.vy * friction,
              rot: p.rot + p.vRot * dt * 60,
              opacity,
              scale,
            };
          })
          .filter(Boolean) as Particle[];
      });

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [speed]);

  if (!isEnabled || effectStyle === 'none' || particles.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden select-none">
      <svg className="w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id="screenFxFeatherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#674121" />
            <stop offset="60%" stopColor="#5A361C" />
            <stop offset="100%" stopColor="#F6ECD5" />
          </linearGradient>
        </defs>
        {particles.map((p) => {
          const s = p.size || 6;
          const currentOpacity = Number.isFinite(p.opacity) ? Math.max(0, Math.min(1, p.opacity)) : 0;
          const currentScale = Number.isFinite(p.scale) ? Math.max(0.1, p.scale) : 1;
          const currentX = Number.isFinite(p.x) ? p.x : 0;
          const currentY = Number.isFinite(p.y) ? p.y : 0;
          const currentRot = Number.isFinite(p.rot) ? p.rot : 0;

          return (
            <g
              key={p.id}
              transform={`translate(${currentX}, ${currentY}) rotate(${currentRot}) scale(${currentScale})`}
              opacity={currentOpacity}
            >
              {/* EAGLE FEATHER */}
              {p.shape === 'feather' && (
                <g>
                  <path
                    d={`M 0 ${-s * 1.2} C ${s * 0.55} ${-s * 0.6} ${s * 0.45} ${s * 0.6} 0 ${s * 1.1} C ${-s * 0.45} ${s * 0.6} ${-s * 0.55} ${-s * 0.6} 0 ${-s * 1.2} Z`}
                    fill="url(#screenFxFeatherGrad)"
                    stroke="#1E1915"
                    strokeWidth="0.8"
                  />
                  <line x1="0" y1={-s * 1.2} x2="0" y2={s * 1.2} stroke="#FAF8F5" strokeWidth="0.8" strokeLinecap="round" />
                </g>
              )}

              {/* DOWN TUFT */}
              {p.shape === 'down_tuft' && (
                <path
                  d={`M 0 0 C ${s * 0.6} ${-s * 0.4} ${s * 0.8} ${s * 0.5} 0 ${s * 0.8} C ${-s * 0.8} ${s * 0.5} ${-s * 0.6} ${-s * 0.4} 0 0 Z`}
                  fill={p.secondaryColor || '#FAF8F5'}
                  stroke={p.color}
                  strokeWidth="0.8"
                  opacity="0.9"
                />
              )}

              {/* 4-POINT STAR */}
              {p.shape === 'star' && (
                <path
                  d={`M 0 ${-s} Q ${s * 0.2} ${-s * 0.2} ${s} 0 Q ${s * 0.2} ${s * 0.2} 0 ${s} Q ${-s * 0.2} ${s * 0.2} ${-s} 0 Q ${-s * 0.2} ${-s * 0.2} 0 ${-s} Z`}
                  fill={p.color}
                  stroke="#FFFFFF"
                  strokeWidth="0.6"
                />
              )}

              {/* HEART */}
              {p.shape === 'heart' && (
                <path
                  d={`M 0 ${s * 0.4} C ${-s * 0.8} ${-s * 0.4} ${-s * 0.8} ${-s * 0.9} 0 ${-s * 0.3} C ${s * 0.8} ${-s * 0.9} ${s * 0.8} ${-s * 0.4} 0 ${s * 0.4} Z`}
                  fill={p.color}
                  stroke="#FFFFFF"
                  strokeWidth="0.8"
                />
              )}

              {/* CYBER SHARD & RING */}
              {p.shape === 'cyber_shard' && (
                <polygon points={`0,${-s} ${s * 0.7},${s * 0.3} 0,${s * 0.8} ${-s * 0.7},${s * 0.3}`} fill={p.color} stroke="#FFFFFF" strokeWidth="0.8" />
              )}
              {p.shape === 'ring' && (
                <circle cx="0" cy="0" r={s * 0.7} fill="none" stroke={p.color} strokeWidth="1.8" strokeDasharray="3 1.5" />
              )}

              {/* BUBBLE & DROPLET */}
              {p.shape === 'bubble' && (
                <g>
                  <circle cx="0" cy="0" r={s * 0.7} fill={p.color} opacity="0.65" stroke="#FFFFFF" strokeWidth="0.8" />
                  <circle cx={-s * 0.22} cy={-s * 0.22} r={s * 0.18} fill="#FFFFFF" opacity="0.85" />
                </g>
              )}
              {p.shape === 'droplet' && (
                <path
                  d={`M 0 ${-s * 0.8} C ${s * 0.5} ${-s * 0.1} ${s * 0.5} ${s * 0.6} 0 ${s * 0.6} C ${-s * 0.5} ${s * 0.6} ${-s * 0.5} ${-s * 0.1} 0 ${-s * 0.8} Z`}
                  fill={p.color}
                  stroke="#FFFFFF"
                  strokeWidth="0.6"
                />
              )}

              {/* CONFETTI */}
              {p.shape === 'confetti' && (
                <rect x={-s * 0.5} y={-s * 0.3} width={s} height={s * 0.6} rx="1" fill={p.color} stroke="#111" strokeWidth="0.5" />
              )}
              {p.shape === 'confetti_strip' && (
                <path d={`M ${-s * 0.6} ${-s * 0.4} Q 0 ${s * 0.5} ${s * 0.6} ${-s * 0.4}`} fill="none" stroke={p.color} strokeWidth="2" strokeLinecap="round" />
              )}

              {/* SPARKLE DOTS & LINES */}
              {(p.shape === 'sparkle_dot' || p.shape === 'comic_dot') && (
                <circle cx="0" cy="0" r={s * 0.45} fill={p.color} stroke="#FFFFFF" strokeWidth="0.6" />
              )}
              {(p.shape === 'spark_line' || p.shape === 'comic_spark') && (
                <line x1="0" y1={-s * 0.7} x2="0" y2={s * 0.7} stroke={p.color} strokeWidth="1.5" strokeLinecap="round" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
