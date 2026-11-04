import React, { useState } from 'react';
import { 
  User, 
  School, 
  Bus, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  ShieldCheck, 
  Award, 
  GraduationCap, 
  MapPin, 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { StudentAuthSession, signInWithGoogle, setOnboardingCompleted } from '../../services/authService';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onFinish: (session: StudentAuthSession) => void;
}

const COMMUTE_HUBS = [
  'Matina Crossing',
  'Roxas Night Market',
  'Bajada / JP Laurel',
  'Toril Poblacion',
  'Mintal / Tugbok',
  'Buhangin / Airport',
  'Agdao / Chinatown',
  'Sasa / Panacan'
];

const YEAR_LEVELS = [
  { id: '1st', label: '1st Year (Freshman)' },
  { id: '2nd', label: '2nd Year (Sophomore)' },
  { id: '3rd', label: '3rd Year (Junior)' },
  { id: '4th', label: '4th Year (Senior)' },
  { id: 'grad', label: 'Post-Grad / Med / Law' }
];

const FACULTY_RANKS = [
  { id: 'lecturer', label: 'Instructor / Lecturer' },
  { id: 'asst_prof', label: 'Assistant Professor' },
  { id: 'assoc_prof', label: 'Associate Professor' },
  { id: 'full_prof', label: 'Professor / Chair' },
  { id: 'dean', label: 'Dean / Academic Head' }
];

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  isOpen,
  onFinish
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student');
  const [selectedCampus, setSelectedCampus] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('skweladabaw_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.campusId) return parsed.campusId;
      }
    } catch (_) {}
    return '';
  });
  const [selectedYear, setSelectedYear] = useState<string>('1st');
  const [selectedFacultyRank, setSelectedFacultyRank] = useState<string>('asst_prof');
  const [selectedHub, setSelectedHub] = useState<string>('Matina Crossing');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [locationRequested, setLocationRequested] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalSteps = 4;
  const progressPercent = (currentStep / totalSteps) * 100;

  const goToNext = () => {
    setSlideDirection('right');
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const goToPrev = () => {
    setSlideDirection('left');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const fireCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // safe fallback
    }
  };

  const requestOptionalLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationRequested(true),
        () => setLocationRequested(true)
      );
    } else {
      setLocationRequested(true);
    }
  };

  const handleCompleteAsGuest = () => {
    fireCelebration();
    setOnboardingCompleted(true);
    const guestSession: StudentAuthSession = {
      isLoggedIn: false,
      name: selectedRole === 'teacher' ? 'Faculty Member' : 'Student',
      email: '',
      avatar: '',
      campusId: selectedCampus,
      course: selectedRole === 'teacher' ? 'Teacher / Professor' : 'Enrolled Student',
      yearLevel: selectedRole === 'teacher' ? selectedFacultyRank : selectedYear,
      role: selectedRole
    };
    onFinish(guestSession);
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const session = await signInWithGoogle(selectedCampus);
      if (session) {
        const updatedSession: StudentAuthSession = {
          ...session,
          role: selectedRole,
          course: selectedRole === 'teacher' ? 'Teacher / Professor' : 'Enrolled Student',
          yearLevel: selectedRole === 'teacher' ? selectedFacultyRank : selectedYear
        };
        fireCelebration();
        setOnboardingCompleted(true);
        onFinish(updatedSession);
      }
    } catch (err) {
      console.error('Google Sign in error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm sheet-backdrop-enter select-none">
      <div className="bg-[var(--card-bg)] w-full max-w-lg rounded-3xl border border-[var(--card-border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sheet-enter-spring">
        {/* Top Progress Bar & Navigation */}
        <div className="px-5 pt-4 pb-3 border-b border-[var(--card-border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            {currentStep > 1 && (
              <button
                onClick={goToPrev}
                className="p-1.5 rounded-xl border border-[var(--nested-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:opacity-80 pressable cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            
            <div className="flex-1 h-2 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] overflow-hidden">
              <div 
                className="h-full bg-[var(--btn-primary-bg)] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleCompleteAsGuest}
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 cursor-pointer"
          >
            Skip
          </button>
        </div>

        {/* Modal Body with Animated Smooth Slide */}
        <div 
          key={currentStep} 
          className={`p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 ${slideDirection === 'right' ? 'animate-step-next' : 'animate-step-prev'}`}
        >
          {/* STEP 1: ROLE */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-left">
                <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <School className="w-4 h-4 text-[var(--text-primary)]" />
                  <span>Welcome to SkwelaDabaw</span>
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug mt-0.5">
                  Select your role in the Davao academic community:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setSelectedRole('student')}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all pressable ${
                    selectedRole === 'student'
                      ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      : 'border-[var(--nested-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--card-hover-border)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <GraduationCap className="w-5 h-5" />
                    {selectedRole === 'student' && <Check className="w-4 h-4 text-[var(--btn-primary-text)]" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Student</h4>
                    <p className={`text-[11px] mt-1 leading-snug ${selectedRole === 'student' ? 'text-[var(--btn-primary-text)]/80' : 'text-[var(--text-secondary)]'}`}>
                      Timetable, GPA calculator, student fare discounts, baon budget, and study spots.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedRole('teacher')}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all pressable ${
                    selectedRole === 'teacher'
                      ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      : 'border-[var(--nested-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--card-hover-border)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <School className="w-5 h-5" />
                    {selectedRole === 'teacher' && <Check className="w-4 h-4 text-[var(--btn-primary-text)]" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Teacher / Faculty</h4>
                    <p className={`text-[11px] mt-1 leading-snug ${selectedRole === 'teacher' ? 'text-[var(--btn-primary-text)]/80' : 'text-[var(--text-secondary)]'}`}>
                      Teaching timetable, transit guide, announcements, and faculty channels.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CAMPUS */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] flex items-center justify-center gap-1.5">
                  <School className="w-4 h-4" />
                  <span>Choose Your Davao Campus</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Customizes your default jeep routes and campus chat lounge.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {DAVAO_CAMPUSES.map((c) => {
                  const isSelected = selectedCampus === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCampus(c.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all pressable ${
                        isSelected 
                          ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold' 
                          : 'border-[var(--nested-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--card-hover-border)]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs truncate">
                          {c.shortName}
                        </h5>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-[var(--btn-primary-text)]/75' : 'text-[var(--text-secondary)]'}`}>
                          {c.name}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[var(--btn-primary-text)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: LEVEL & HUB */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                  {selectedRole === 'teacher' ? 'Faculty Profile' : 'Student Profile'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Select your year level and everyday commute hub.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                  <span>{selectedRole === 'teacher' ? 'Academic Rank:' : 'Year Level:'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(selectedRole === 'teacher' ? FACULTY_RANKS : YEAR_LEVELS).map((item) => {
                    const isSelected = selectedRole === 'teacher' 
                      ? selectedFacultyRank === item.id 
                      : selectedYear === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (selectedRole === 'teacher') setSelectedFacultyRank(item.id);
                          else setSelectedYear(item.id);
                        }}
                        className={`p-2 rounded-xl border text-xs font-semibold truncate transition-all pressable ${
                          isSelected
                            ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                            : 'border-[var(--nested-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--card-hover-border)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                  <Bus className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                  <span>Main Davao Transit Hub:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMUTE_HUBS.map((hub) => {
                    const isSelected = selectedHub === hub;
                    return (
                      <button
                        key={hub}
                        onClick={() => setSelectedHub(hub)}
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all pressable ${
                          isSelected
                            ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                            : 'border-[var(--nested-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--card-hover-border)]'
                        }`}
                      >
                        {hub}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: AUTH & FINISH */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in text-center">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] flex items-center justify-center">
                {selectedRole === 'teacher' ? <GraduationCap className="w-7 h-7" /> : <School className="w-7 h-7" />}
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base sm:text-lg text-[var(--text-primary)]">
                  You're all set!
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                  Connect your account for cloud sync or jump straight in as a guest.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-left space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--text-primary)]" />
                  <span className="font-semibold text-xs text-[var(--text-primary)]">
                    Location Access (Optional)
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                  Used for 911 emergency beacon coordinates and route proximity.
                </p>
                <button
                  type="button"
                  onClick={requestOptionalLocation}
                  className="w-full py-2 px-3 rounded-xl border border-[var(--nested-border)] bg-[var(--card-bg)] text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 pressable"
                >
                  {locationRequested ? '✓ Location Checked' : 'Check Location Permission'}
                </button>
              </div>

              <div className="space-y-2 max-w-sm mx-auto pt-1">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                  className="w-full py-3 px-4 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm flex items-center justify-center gap-2 pressable"
                >
                  <span>{isAuthenticating ? 'Signing in...' : 'Sign in with Google'}</span>
                </button>

                <button
                  onClick={handleCompleteAsGuest}
                  className="w-full py-2.5 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-1.5 pressable"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Continue as Guest (Offline)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep < 4 && (
          <div className="p-4 border-t border-[var(--card-border)] flex justify-end">
            <button
              onClick={goToNext}
              className="px-6 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm flex items-center gap-1.5 pressable cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
