import React, { useState, useEffect } from 'react';
import { getBayaniSpeech, BayaniMood } from '../../utils/bayaniDialogues';

export type EagleMood =
  | 'friendly'
  | 'questioning'
  | 'focused'
  | 'celebrating'
  | 'alert'
  | 'sleepy'
  | 'confident'
  | 'winking'
  | 'loading';

export interface EagleBuddyProps {
  /** Mascot mood expression */
  mood?: EagleMood;
  /** Custom speech bubble text (optional) */
  speech?: string;
  /** Title/badge in speech bubble */
  senderTitle?: string;
  /** Width of the component (e.g. 200, "100%", "240px") */
  width?: number | string;
  /** Height of the component (e.g. 240, "100%", "300px") */
  height?: number | string;
  /** Enable smooth breathing & micro-animations */
  isAnimated?: boolean;
  /** Is the mascot currently talking */
  isTalking?: boolean;
  /** Show animated loading ring indicator */
  isLoading?: boolean;
  /** Custom CSS class names */
  className?: string;
  /** Show speech bubble */
  showSpeech?: boolean;
  /** Callback when user clicks the eagle buddy */
  onClick?: () => void;
}

// Preset configurations for each mood adhering to EagleBuddy documentation
const MOOD_CONFIGS: Record<EagleMood, {
  eyeShape: string;
  eyebrowState: string;
  beakExpression: string;
  wingPose: string;
  crestStyle: string;
  accessory: string;
  floatingIndicator: string;
  defaultSpeech: string;
}> = {
  friendly: {
    eyeShape: 'friendly_big',
    eyebrowState: 'normal',
    beakExpression: 'gentle_smile',
    wingPose: 'friendly_wave',
    crestStyle: 'classic_spiky',
    accessory: 'none',
    floatingIndicator: 'none',
    defaultSpeech: "Kumusta! I'm your Philippine Eagle guide! How can I help today?",
  },
  questioning: {
    eyeShape: 'questioning_arch',
    eyebrowState: 'raised_question',
    beakExpression: 'questioning_quirk',
    wingPose: 'questioning_chin',
    crestStyle: 'curious_tilted',
    accessory: 'none',
    floatingIndicator: 'question_marks',
    defaultSpeech: "Hmm... Do you have a question or need tips on this step?",
  },
  focused: {
    eyeShape: 'focused_narrow',
    eyebrowState: 'focused_furrowed',
    beakExpression: 'holding_pencil',
    wingPose: 'holding_checklist',
    crestStyle: 'classic_spiky',
    accessory: 'none',
    floatingIndicator: 'clock_deadline',
    defaultSpeech: "Deep focus active. Let's finish our priority tasks!",
  },
  celebrating: {
    eyeShape: 'sparkle_stars',
    eyebrowState: 'happy_arched',
    beakExpression: 'holding_checkmark',
    wingPose: 'celebration_both',
    crestStyle: 'perked_excited',
    accessory: 'gold_medal',
    floatingIndicator: 'checkmark_success',
    defaultSpeech: "Mabuhay! Milestone completed! Fantastic job!",
  },
  alert: {
    eyeShape: 'alert_wide',
    eyebrowState: 'worried',
    beakExpression: 'surprised_open',
    wingPose: 'friendly_wave',
    crestStyle: 'perked_excited',
    accessory: 'none',
    floatingIndicator: 'exclamation_urgent',
    defaultSpeech: "Heads up! Urgent deadline approaching!",
  },
  sleepy: {
    eyeShape: 'sleepy_droop',
    eyebrowState: 'normal',
    beakExpression: 'holding_coffee',
    wingPose: 'folded_wings',
    crestStyle: 'drooped_relaxed',
    accessory: 'coffee_cup',
    floatingIndicator: 'zzz_sleeping',
    defaultSpeech: "Time for a quick break and coffee recharge!",
  },
  confident: {
    eyeShape: 'friendly_big',
    eyebrowState: 'happy_arched',
    beakExpression: 'gentle_smile',
    wingPose: 'thumbs_up',
    crestStyle: 'fluffy_crown',
    accessory: 'glasses_smart',
    floatingIndicator: 'stars_sparkles',
    defaultSpeech: "Everything is on track. You're doing incredible work!",
  },
  winking: {
    eyeShape: 'winking_right',
    eyebrowState: 'happy_arched',
    beakExpression: 'open_chirp',
    wingPose: 'thumbs_up',
    crestStyle: 'perked_excited',
    accessory: 'none',
    floatingIndicator: 'stars_sparkles',
    defaultSpeech: "Pro tip: Small consistent steps lead to big victories!",
  },
  loading: {
    eyeShape: 'friendly_big',
    eyebrowState: 'normal',
    beakExpression: 'gentle_smile',
    wingPose: 'friendly_wave',
    crestStyle: 'classic_spiky',
    accessory: 'none',
    floatingIndicator: 'loading',
    defaultSpeech: "Working on it... One moment please!",
  },
};

const BASE_COLORS = {
  crestTips: '#5C381E',
  crestBase: '#EBD9B7',
  headCream: '#FAFAF0',
  faceMask: '#2C3238',
  beakBase: '#3D4650',
  beakTip: '#222830',
  eyeIris: '#0284C7',
  eyePupil: '#16191D',
  neckRuff: '#EBD9B7',
  chestBelly: '#FAF3E5',
  wingBrown: '#5A361C',
  wingSecondary: '#744827',
  wingShadow: '#3C2310',
  talonYellow: '#FFB800',
  tailFeathers: '#3C2310',
};

/**
 * Self-contained procedural vector SVG mascot component representing the Philippine Eagle (Haribon).
 * Built exactly per EAGLE_BUDDY_DOCUMENTATION specifications.
 */
export const EagleBuddy: React.FC<EagleBuddyProps> = ({
  mood = 'friendly',
  speech,
  senderTitle = 'Bayani',
  width = 280,
  height = 330,
  isAnimated = true,
  isTalking,
  isLoading = false,
  className = '',
  showSpeech = true,
  onClick,
}) => {
  const [internalTime, setInternalTime] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);

  const moodConfig = MOOD_CONFIGS[mood] || MOOD_CONFIGS.friendly;
  const currentSpeech = speech !== undefined ? speech : getBayaniSpeech(mood as BayaniMood);
  const isCurrentlyTalking = isTalking !== undefined ? isTalking : Boolean(showSpeech && currentSpeech);

  // Gentle procedural breathing animation loop
  useEffect(() => {
    if (!isAnimated) return;
    let animId: number;
    let start = performance.now();

    const update = (time: number) => {
      setInternalTime((time - start) / 1000);
      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isAnimated]);

  // Natural blinking
  useEffect(() => {
    if (!isAnimated) return;
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [isAnimated]);

  const t = internalTime;
  const bodyY = isAnimated
    ? mood === 'celebrating'
      ? -Math.abs(Math.sin(t * 6)) * 10
      : Math.sin(t * 2.5) * 2.5
    : 0;

  const headRotate = isAnimated && mood === 'questioning' 
    ? 6 + Math.sin(t * 3) * 3 
    : isCurrentlyTalking && isAnimated 
    ? Math.sin(t * 4) * 2 
    : 0;

  const beakFlap = (isCurrentlyTalking && isAnimated) ? Math.max(0, Math.sin(t * 12) * 6) : 0;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
      style={{ width, height }}
    >
      <svg
        viewBox="0 0 520 620"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="eb_crestGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={BASE_COLORS.crestTips} />
            <stop offset="45%" stopColor={BASE_COLORS.crestTips} />
            <stop offset="85%" stopColor={BASE_COLORS.crestBase} />
            <stop offset="100%" stopColor={BASE_COLORS.crestBase} />
          </linearGradient>

          <linearGradient id="eb_beakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={BASE_COLORS.beakBase} />
            <stop offset="100%" stopColor={BASE_COLORS.beakTip} />
          </linearGradient>

          <linearGradient id="eb_wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={BASE_COLORS.wingBrown} />
            <stop offset="60%" stopColor={BASE_COLORS.wingSecondary} />
            <stop offset="100%" stopColor={BASE_COLORS.wingShadow} />
          </linearGradient>
        </defs>

        {/* Ground Shadow */}
        <ellipse cx="265" cy="565" rx="140" ry="16" fill="#000000" opacity="0.12" />

        {/* Animated Body Container */}
        <g transform={`translate(0, ${bodyY})`}>
          {/* Tail Feathers */}
          <path
            d="M310 460 C360 480 415 515 425 545 C410 548 395 550 380 542 C415 555 425 570 395 565 C380 562 360 550 340 520 C320 500 310 475 310 460 Z"
            fill={BASE_COLORS.tailFeathers}
            stroke="#111"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* Talons & Legs */}
          <g>
            <path d="M190 420 C185 450 180 470 185 490 C195 495 210 495 220 485 C225 465 225 440 220 420 Z" fill={BASE_COLORS.chestBelly} stroke="#111" strokeWidth="4" />
            <path d="M198 480 L195 525 L210 525 L212 480 Z" fill={BASE_COLORS.talonYellow} stroke="#111" strokeWidth="3.5" />
            <path d="M185 520 C175 525 165 535 162 546 C170 548 180 542 188 535 Z" fill={BASE_COLORS.talonYellow} stroke="#111" strokeWidth="3.5" />
            <path d="M195 522 C195 535 190 550 190 558 C198 560 206 550 206 535 Z" fill={BASE_COLORS.talonYellow} stroke="#111" strokeWidth="3.5" />
            <path d="M208 522 C215 532 222 544 226 554 C232 550 230 540 220 530 Z" fill={BASE_COLORS.talonYellow} stroke="#111" strokeWidth="3.5" />

            <path d="M270 425 C265 455 260 475 268 495 C280 500 295 495 305 480 C305 455 300 435 295 425 Z" fill={BASE_COLORS.chestBelly} stroke="#111" strokeWidth="4" />
            <path d="M278 485 L275 528 L290 528 L292 485 Z" fill={BASE_COLORS.talonYellow} stroke="#111" strokeWidth="3.5" />
            <path d="M265 525 C255 532 246 542 244 552 C252 554 260 548 268 538 Z" fill={BASE_COLORS.talonYellow} stroke="#111" strokeWidth="3.5" />
            <path d="M276 525 C276 538 273 552 273 560 C282 562 289 552 289 536 Z" fill={BASE_COLORS.talonYellow} stroke="#111" strokeWidth="3.5" />
            <path d="M288 525 C298 534 308 546 312 556 C318 550 315 540 302 530 Z" fill={BASE_COLORS.talonYellow} stroke="#111" strokeWidth="3.5" />
          </g>

          {/* Left Wing */}
          <path
            d="M165 280 C135 320 120 390 135 480 C145 490 165 485 180 470 C165 430 160 380 175 320 Z"
            fill={BASE_COLORS.wingShadow}
            stroke="#111"
            strokeWidth="4"
          />

          {/* Main Chest / Belly */}
          <path
            d="M175 250 C155 320 145 400 170 465 C185 500 235 515 275 510 C315 505 350 470 360 415 C370 340 340 260 310 240 Z"
            fill={BASE_COLORS.chestBelly}
            stroke="#111"
            strokeWidth="4.5"
          />

          {/* Neck Feather Ruff */}
          <path
            d="M175 230 C160 260 165 295 185 315 C190 300 200 320 215 325 C220 310 230 330 245 330 C260 330 270 310 280 325 C295 315 305 300 315 310 C330 290 340 260 335 230 Z"
            fill={BASE_COLORS.neckRuff}
            stroke="#111"
            strokeWidth="4"
          />

          {/* Right Wing */}
          {moodConfig.wingPose === 'friendly_wave' ? (
            <path
              d="M300 280 C340 250 410 200 440 140 C450 155 440 185 430 205 C450 190 455 220 440 240 C455 235 450 265 430 280 C390 330 340 370 300 350 Z"
              fill="url(#eb_wingGrad)"
              stroke="#111"
              strokeWidth="4.5"
            />
          ) : moodConfig.wingPose === 'questioning_chin' ? (
            <path
              d="M300 300 C340 300 370 260 360 210 C350 180 320 170 295 190 C285 200 280 215 290 225 C305 235 320 225 325 210 C330 235 320 275 285 305 Z"
              fill="url(#eb_wingGrad)"
              stroke="#111"
              strokeWidth="4.5"
            />
          ) : moodConfig.wingPose === 'celebration_both' ? (
            <path
              d="M300 280 C350 230 410 160 440 110 C445 125 435 160 420 180 C440 165 450 200 435 225 C450 220 445 250 420 270 C380 320 330 360 295 340 Z"
              fill="url(#eb_wingGrad)"
              stroke="#111"
              strokeWidth="4.5"
            />
          ) : moodConfig.wingPose === 'thumbs_up' ? (
            <path
              d="M295 300 C340 310 395 285 415 250 C420 230 405 215 390 225 C380 232 375 245 375 260 C350 275 320 285 285 295 Z"
              fill="url(#eb_wingGrad)"
              stroke="#111"
              strokeWidth="4"
            />
          ) : (
            <path
              d="M295 240 C340 260 410 320 420 430 C425 480 395 550 365 570 C345 580 330 570 320 545 C320 490 300 410 290 330 Z"
              fill="url(#eb_wingGrad)"
              stroke="#111"
              strokeWidth="4.5"
            />
          )}

          {/* Head & Crest Group */}
          <g transform={`rotate(${headRotate} 265 170)`}>
            {/* Crest Plumage Mane */}
            <path
              d="M 180 180 C 150 160 130 135 125 105 C 145 110 160 125 170 140 C 150 110 140 80 142 55 C 160 68 175 90 185 110 C 170 75 168 40 178 20 C 192 38 202 65 208 90 C 200 55 205 20 220 5 C 232 25 238 55 240 80 C 240 40 252 8 268 0 C 278 20 282 50 282 78 C 290 38 310 12 328 10 C 330 35 328 65 320 90 C 338 55 362 35 380 40 C 375 68 365 95 350 118 C 375 95 400 85 415 100 C 400 125 385 145 365 160 C 390 150 415 155 422 175 C 405 195 385 205 360 210 C 370 230 365 255 345 270 C 330 260 320 240 315 220 C 295 240 265 245 240 240 C 210 245 185 235 175 210 Z"
              fill="url(#eb_crestGrad)"
              stroke="#111"
              strokeWidth="4.5"
            />

            {/* Head Contour */}
            <path
              d="M190 160 C185 115 220 85 270 85 C320 85 345 115 345 165 C345 210 325 240 270 240 C215 240 190 210 190 160 Z"
              fill={BASE_COLORS.headCream}
              stroke="#111"
              strokeWidth="4.5"
            />

            {/* Dark Raptor Facial Mask */}
            <path
              d="M210 145 C205 125 225 115 255 115 C285 115 315 120 330 140 C345 160 340 190 320 200 C295 210 265 210 240 205 C215 200 205 175 210 145 Z"
              fill={BASE_COLORS.faceMask}
              stroke="#111"
              strokeWidth="4"
            />

            {/* Eye */}
            <ellipse cx="295" cy="155" rx="20" ry="22" fill="#FFFFFF" stroke="#111" strokeWidth="3.5" />
            {isBlinking ? (
              <path d="M275 155 Q295 165 315 155" stroke="#111" strokeWidth="4" strokeLinecap="round" />
            ) : moodConfig.eyeShape === 'sparkle_stars' ? (
              <g>
                <circle cx="295" cy="155" r="16" fill="#FBBF24" />
                <path d="M295 142l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#FEF08A" stroke="#78350F" strokeWidth="1" />
              </g>
            ) : (
              <g>
                <circle cx="295" cy="155" r="16" fill={BASE_COLORS.eyeIris} />
                <circle cx="295" cy="155" r="13" fill={BASE_COLORS.eyePupil} />
                <circle cx="290" cy="148" r="5.5" fill="#FFFFFF" />
                <circle cx="302" cy="162" r="2.8" fill="#FFFFFF" />
              </g>
            )}

            {/* Eyebrow */}
            {moodConfig.eyebrowState === 'raised_question' ? (
              <path d="M275 135 C285 118 312 118 322 130" fill="none" stroke="#111" strokeWidth="5" strokeLinecap="round" />
            ) : (
              <path d="M276 135 C288 130 305 130 316 135" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" />
            )}

            {/* Hooked Raptor Beak with Procedural Talk Flap */}
            <g transform={`translate(0, ${beakFlap})`}>
              <path
                d="M320 145 C350 150 385 165 390 195 C392 215 375 235 350 240 C340 235 330 220 330 205 C330 195 325 185 315 180 Z"
                fill="url(#eb_beakGrad)"
                stroke="#111"
                strokeWidth="4.5"
              />
              <ellipse cx="338" cy="165" rx="3.5" ry="2" fill="#111" />
              <path d="M330 195 C345 202 365 202 375 195" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round" />
            </g>

            {/* Accessories */}
            {moodConfig.accessory === 'gold_medal' && (
              <g transform="translate(240, 240)">
                <path d="M10 0 L-10 40 L-2 40 L16 0 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
                <path d="M22 0 L42 40 L34 40 L16 0 Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
                <circle cx="16" cy="46" r="16" fill="#FBBF24" stroke="#B45309" strokeWidth="2.5" />
                <text x="16" y="52" fontSize="16" fontWeight="900" textAnchor="middle" fill="#78350F">★</text>
              </g>
            )}
            {moodConfig.accessory === 'coffee_cup' && (
              <g transform="translate(345, 195)">
                <rect x="0" y="0" width="28" height="34" rx="4" fill="#F8FAFC" stroke="#334155" strokeWidth="2.5" />
                <rect x="0" y="8" width="28" height="14" fill="#92400E" opacity="0.9" />
                <path d="M28 6 C36 6 36 22 28 22" fill="none" stroke="#334155" strokeWidth="2.5" />
              </g>
            )}
            {moodConfig.accessory === 'glasses_smart' && (
              <g transform="translate(255, 140)">
                <rect x="0" y="0" width="38" height="26" rx="8" fill="none" stroke="#1E293B" strokeWidth="3.5" />
                <rect x="44" y="0" width="38" height="26" rx="8" fill="none" stroke="#1E293B" strokeWidth="3.5" />
                <line x1="38" y1="12" x2="44" y2="12" stroke="#1E293B" strokeWidth="3.5" />
              </g>
            )}
          </g>
        </g>

        {/* Standalone SVG Fallback Indicators */}
        {(isLoading || moodConfig.floatingIndicator === 'loading') && (
          <g transform={`translate(0, ${Math.sin(t * 3) * 3})`}>
            <circle cx="390" cy="95" r="26" fill="#0F172A" stroke="#38BDF8" strokeWidth="3" opacity="0.95" />
            <circle
              cx="390"
              cy="95"
              r="15"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="4"
              strokeDasharray="24 35"
              transform={`rotate(${(t * 220) % 360} 390 95)`}
              strokeLinecap="round"
            />
          </g>
        )}
        {moodConfig.floatingIndicator === 'checkmark_success' && (
          <g transform={`translate(0, ${Math.sin(t * 4) * 3})`}>
            <circle cx="390" cy="95" r="26" fill="#10B981" stroke="#065F46" strokeWidth="3.5" />
            <path d="M377 95 L386 104 L404 86" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
        {moodConfig.floatingIndicator === 'question_marks' && (
          <g transform={`translate(0, ${Math.sin(t * 3) * 4})`}>
            <circle cx="395" cy="95" r="24" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="3" />
            <text x="385" y="105" fontSize="26" fontWeight="900" fill="#D97706">?</text>
            <text x="403" y="90" fontSize="18" fontWeight="900" fill="#B45309">?</text>
          </g>
        )}
        {moodConfig.floatingIndicator === 'clock_deadline' && (
          <g transform={`translate(0, ${Math.sin(t * 3) * 3})`}>
            <circle cx="390" cy="95" r="24" fill="#F8FAFC" stroke="#334155" strokeWidth="3" />
            <circle cx="390" cy="95" r="2.5" fill="#0F172A" />
            <path d="M390 95 L390 82 M390 95 L399 95" stroke="#E11D48" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
        {moodConfig.floatingIndicator === 'exclamation_urgent' && (
          <g transform={`translate(0, ${Math.sin(t * 6) * 4})`}>
            <polygon points="373,115 392,70 411,115" fill="#EF4444" stroke="#991B1B" strokeWidth="3" />
            <text x="388" y="108" fontSize="24" fontWeight="900" fill="#FFFFFF">!</text>
          </g>
        )}
        {moodConfig.floatingIndicator === 'zzz_sleeping' && (
          <g transform={`translate(${Math.sin(t * 2) * 3}, 0)`}>
            <text x="375" y="115" fontSize="24" fontWeight="900" fill="#3B82F6" opacity="0.85">z</text>
            <text x="395" y="90" fontSize="30" fontWeight="900" fill="#2563EB" opacity="0.95">Z</text>
            <text x="420" y="60" fontSize="38" fontWeight="900" fill="#1D4ED8">Z</text>
          </g>
        )}
        {moodConfig.floatingIndicator === 'stars_sparkles' && (
          <g transform={`translate(0, ${Math.sin(t * 3) * 3})`}>
            <path d="M390 80 L393 90 L403 93 L393 96 L390 106 L387 96 L377 93 L387 90 Z" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
            <path d="M420 100 L422 106 L428 108 L422 110 L420 116 L418 110 L412 108 L418 106 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
          </g>
        )}
      </svg>

      {/* Animated Orbital Loading Ring & Ambient Aura */}
      {(isLoading || moodConfig.floatingIndicator === 'loading') && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[88%] h-[88%] rounded-full border border-sky-400/30 border-t-sky-400 border-r-transparent animate-spin" style={{ animationDuration: '1.4s' }} />
          <div className="absolute w-[94%] h-[94%] rounded-full bg-sky-400/5 animate-pulse" />
        </div>
      )}

      {/* Compact Floating Reaction Badges (Positioned cleanly at top-right corner, away from face) */}
      {(isLoading || moodConfig.floatingIndicator === 'loading') && (
        <div
          className="absolute top-0 -right-1 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-slate-900/90 border border-sky-400 shadow-sm backdrop-blur-md"
          title="Loading..."
        >
          <div className="w-3.5 h-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        </div>
      )}

      {moodConfig.floatingIndicator === 'checkmark_success' && (
        <div
          className="absolute top-0 -right-1 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 border border-emerald-200 text-white shadow-sm backdrop-blur-md animate-bounce"
          title="Success!"
        >
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {moodConfig.floatingIndicator === 'question_marks' && (
        <div
          className="absolute top-0 -right-1 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 border border-amber-200 text-amber-950 font-black text-xs shadow-sm animate-bounce"
          title="Question"
        >
          ?
        </div>
      )}

      {moodConfig.floatingIndicator === 'clock_deadline' && (
        <div
          className="absolute top-0 -right-1 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-rose-500 border border-rose-200 text-white shadow-sm"
          title="Deadline Focus"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      )}

      {moodConfig.floatingIndicator === 'exclamation_urgent' && (
        <div
          className="absolute top-0 -right-1 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-red-600 border border-red-200 text-white font-black text-xs shadow-sm animate-pulse"
          title="Urgent Alert"
        >
          !
        </div>
      )}

      {moodConfig.floatingIndicator === 'zzz_sleeping' && (
        <div
          className="absolute -top-1 -right-1 z-30 flex items-center gap-0.5 text-blue-400 font-black"
          title="Resting"
        >
          <span className="text-[10px] animate-bounce" style={{ animationDelay: '0ms' }}>z</span>
          <span className="text-xs animate-bounce" style={{ animationDelay: '150ms' }}>Z</span>
          <span className="text-sm animate-bounce" style={{ animationDelay: '300ms' }}>Z</span>
        </div>
      )}

      {moodConfig.floatingIndicator === 'stars_sparkles' && (
        <div
          className="absolute top-0 -right-1 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/90 border border-yellow-100 text-amber-950 text-xs shadow-sm animate-pulse"
          title="Sparkle"
        >
          ✨
        </div>
      )}

      {/* Glass Speech Bubble Overlay - positioned centered above mascot with pointer tail */}
      {Boolean(showSpeech && currentSpeech) && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-max max-w-[85vw] sm:max-w-[260px] p-2.5 px-3 bg-white/95 dark:bg-[#0D1220]/95 backdrop-blur-xl rounded-2xl shadow-xl border border-black/[0.08] dark:border-white/[0.12] text-xs text-slate-900 dark:text-slate-100 pointer-events-none z-20 animate-fade-in"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {senderTitle}
          </div>
          <p className="m-0 leading-tight font-semibold text-[11px]">{currentSpeech}</p>
          {/* Subtle speech tail pointing down toward Bayani */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white/95 dark:bg-[#0D1220]/95 border-r border-b border-black/[0.08] dark:border-white/[0.12] rotate-45" />
        </div>
      )}
    </div>
  );
};

export default EagleBuddy;
