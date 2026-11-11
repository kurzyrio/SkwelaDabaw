import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MessageSquarePlus, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  Bus, 
  Calendar, 
  Coffee, 
  Zap,
  CheckCircle2,
  ClipboardList,
  Bug,
  HelpCircle,
  ThumbsUp,
  MapPin,
  MessageSquare
} from 'lucide-react';
import { getSavedSession, StudentAuthSession } from '../../services/authService';
import { db as dexieDb } from '../../db';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { SelectWithOther } from '../common/SelectWithOther';
import confetti from 'canvas-confetti';
import { playEagleSound } from '../../utils/audio';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { useProcessingOverlay } from '../../contexts/ProcessingOverlayContext';

const FEEDBACK_API_URL = 'https://skweladabaw.kurzyrio.site/api/feedback.php';

async function postFeedbackApi(data: any): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.post({
        url: FEEDBACK_API_URL,
        headers: { 'Content-Type': 'application/json' },
        data,
        connectTimeout: 8000,
        readTimeout: 8000
      });
      return res.status >= 200 && res.status < 300;
    } catch (e) {
      console.warn('Native feedback POST note:', e);
      return false;
    }
  } else {
    try {
      const res = await fetch(FEEDBACK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (e) {
      console.warn('Web feedback POST note:', e);
      return false;
    }
  }
}

interface StudentFeedbackPageProps {
  onBack: () => void;
  onOpenSettings?: () => void;
}

export const StudentFeedbackPage: React.FC<StudentFeedbackPageProps> = ({ 
  onBack 
}) => {
  const { withProcessing } = useProcessingOverlay();
  const session: StudentAuthSession = getSavedSession();

  // Mode: 'picker' | 'survey' | 'feedback'
  const [viewMode, setViewMode] = useState<'picker' | 'survey' | 'feedback'>('picker');

  // Survey State
  const [surveyStep, setSurveyStep] = useState<number>(1);
  const totalSurveySteps = 4;
  const [surveyCommuteMode, setSurveyCommuteMode] = useState<string>('PUJ Jeepney');
  const [surveyTopFeature, setSurveyTopFeature] = useState<string>('Smart Timetable');
  const [surveyOfflineUsage, setSurveyOfflineUsage] = useState<string>('Daily');
  const [surveyRating, setSurveyRating] = useState<number>(5);
  const [surveyComments, setSurveyComments] = useState<string>('');

  // Feedback State
  const [feedbackCategory, setFeedbackCategory] = useState<string>('bug');
  const [feedbackCampus, setFeedbackCampus] = useState<string>(session?.campusId || '');
  const [feedbackDetails, setFeedbackDetails] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedType, setSubmittedType] = useState<'survey' | 'feedback'>('feedback');

  const RATING_LABELS = ['Needs Work', 'Fair', 'Good', 'Very Good', 'Exceptional'];

  const COMMUTE_OPTIONS = [
    { id: 'puj', label: 'PUJ Jeepney', desc: 'Traditional & modern jeepneys' },
    { id: 'bus', label: 'DC Bus Interim', desc: 'Davao City bus lines' },
    { id: 'trike', label: 'Tricycle / Bao-bao', desc: 'Subdivision & campus access' },
    { id: 'habal', label: 'Motorcycle / Habal-habal', desc: 'Fast point-to-point transit' },
    { id: 'walk', label: 'Walking Commuter', desc: 'Campus dorm or nearby residence' }
  ];

  const FEATURE_OPTIONS = [
    { id: 'timetable', label: 'Smart Timetable', desc: 'Class alarms & lecture countdown' },
    { id: 'transit', label: 'Davao PUJ & Bus Map', desc: 'Routes, fares & live navigation' },
    { id: 'baon', label: 'Baon Budget Tracker', desc: 'Daily allowance & student expenses' },
    { id: 'chat', label: 'Student Lounge Chat', desc: 'Campus community & announcements' },
    { id: 'safety', label: 'Central 911 Shield', desc: '1-tap emergency hotline call' }
  ];

  const OFFLINE_OPTIONS = [
    { id: 'daily', label: 'Daily Offline', desc: 'I use it without wifi or mobile data every day' },
    { id: 'occasional', label: 'Often Offline', desc: 'Whenever data is slow or exhausted' },
    { id: 'rare', label: 'Mostly Online', desc: 'Usually on campus WiFi or data promo' }
  ];

  const FEEDBACK_CATEGORIES = [
    { id: 'bug', label: 'Bug Report', icon: Bug, desc: 'App crash, UI glitch, or broken button' },
    { id: 'route', label: 'Missing / Wrong Jeep Route', icon: Bus, desc: 'Fare discrepancy or route waypoint error' },
    { id: 'feature', label: 'Feature Suggestion', icon: MessageSquarePlus, desc: 'Idea for a new student tool or workflow' },
    { id: 'campus', label: 'Campus Facility Info', icon: Coffee, desc: 'Study spots, library hours, cafe sockets' },
    { id: 'other', label: 'General Comment', icon: HelpCircle, desc: 'General thoughts or questions' }
  ];

  const handleSubmitSurvey = async () => {
    setIsSubmitting(true);
    setSubmittedType('survey');

    const summary = `[SURVEY] Commute: ${surveyCommuteMode} | Top Feature: ${surveyTopFeature} | Offline: ${surveyOfflineUsage} | Rating: ${surveyRating}/5. Notes: ${surveyComments}`.trim();

    try {
      await withProcessing({
        message: 'Submitting Survey • Please wait',
        submessage: 'Sending your feedback to SkwelaDabaw'
      }, async () => {
        try {
          await dexieDb.feedback.add({
            name: session?.name || 'Dabawenyo Student',
            email: session?.email || undefined,
            campus: session?.campusId || '',
            category: 'Student Survey',
            rating: surveyRating,
            subject: `Campus Survey Response`,
            message: summary,
            status: 'New',
            createdAt: new Date().toISOString()
          });
        } catch (_) {}

        await postFeedbackApi({
          name: session?.name || 'Dabawenyo Student',
          email: session?.email || '',
          campus: session?.campusId || '',
          category: 'Student Survey',
          rating: surveyRating,
          subject: 'Campus Survey Response',
          message: summary
        });
      });

      setIsSubmitted(true);
      playEagleSound('success');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      console.warn('Survey submission note:', err);
      // Still show submitted if local Dexie succeeded or offline
      setIsSubmitted(true);
      playEagleSound('success');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackDetails.trim()) return;

    setIsSubmitting(true);
    setSubmittedType('feedback');

    const catObj = FEEDBACK_CATEGORIES.find(c => c.id === feedbackCategory);
    const categoryTitle = catObj ? catObj.label : 'General Feedback';

    try {
      await withProcessing({
        message: 'Submitting Feedback • Please wait',
        submessage: 'Delivering details directly to developers'
      }, async () => {
        try {
          await dexieDb.feedback.add({
            name: session?.name || 'Dabawenyo Student',
            email: session?.email || undefined,
            campus: feedbackCampus,
            category: categoryTitle,
            rating: 5,
            subject: `Feedback: ${categoryTitle}`,
            message: feedbackDetails.trim(),
            status: 'New',
            createdAt: new Date().toISOString()
          });
        } catch (_) {}

        await postFeedbackApi({
          name: session?.name || 'Dabawenyo Student',
          email: session?.email || '',
          campus: feedbackCampus,
          category: categoryTitle,
          rating: 5,
          subject: `Feedback: ${categoryTitle}`,
          message: feedbackDetails.trim()
        });
      });

      setIsSubmitted(true);
      playEagleSound('success');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      console.warn('Feedback submission note:', err);
      setIsSubmitted(true);
      playEagleSound('success');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SUBMISSION SCREEN
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] pb-24 p-4 sm:p-6 space-y-6 max-w-xl mx-auto select-none animate-fade-in">
        <div className="p-8 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center space-y-5 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--card-border)] font-semibold text-xs">
              {submittedType === 'survey' ? 'Survey Recorded' : 'Feedback Submitted'}
            </span>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Daghang Salamat, {session?.name || 'Student'}!
            </h2>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              {submittedType === 'survey'
                ? 'Your survey responses help shape upcoming transit and academic updates.'
                : 'Your report has been saved locally and sent to the developer team.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onBack}
              className="w-full py-3 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
            >
              Return to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. TOP LEVEL SELECTION SCREEN (Survey vs Feedback)
  if (viewMode === 'picker') {
    return (
      <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] pb-24 p-4 sm:p-6 space-y-5 max-w-xl mx-auto select-none animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-bg)] pressable"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Feedback &amp; Survey</h2>
            <p className="text-xs text-[var(--text-secondary)]">Choose how you would like to contribute</p>
          </div>
        </div>

        {/* 2 Big Choice Cards */}
        <div className="space-y-3 pt-2">
          {/* Choice 1: Survey */}
          <button
            type="button"
            onClick={() => setViewMode('survey')}
            className="w-full p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-sky-500/50 text-left space-y-3 transition-all shadow-sm pressable group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center">
                <ClipboardList className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-500 uppercase tracking-wider">
                Quick Questions
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-sky-500 transition-colors">
                Student Survey
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">
                Answer brief questions about your daily commute, favorite features, and offline campus habits.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-500 pt-1">
              <span>Start Survey</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          {/* Choice 2: Feedback & Bug Report */}
          <button
            type="button"
            onClick={() => setViewMode('feedback')}
            className="w-full p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-violet-500/50 text-left space-y-3 transition-all shadow-sm pressable group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center">
                <MessageSquarePlus className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-500 uppercase tracking-wider">
                Bug / Idea
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-violet-500 transition-colors">
                Direct Feedback &amp; Bug Report
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">
                Report a bug, suggest an unlisted jeep route, or send general recommendations directly to the developer.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-500 pt-1">
              <span>Write Feedback</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // 2. SURVEY MODE
  if (viewMode === 'survey') {
    return (
      <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] pb-24 p-4 sm:p-6 space-y-5 max-w-xl mx-auto select-none animate-fade-in">
        {/* Header & Mode Switcher */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setViewMode('picker')}
            className="p-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-bg)] pressable"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
              <span>Question {surveyStep} of {totalSurveySteps}</span>
              <span>{Math.round((surveyStep / totalSurveySteps) * 100)}%</span>
            </div>
            <div className="w-full bg-[var(--nested-bg)] h-2 rounded-full overflow-hidden border border-[var(--card-border)]">
              <div 
                className="bg-sky-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(surveyStep / totalSurveySteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Survey Question Card */}
        <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-5 shadow-xl">
          {/* STEP 1: COMMUTE MODE */}
          {surveyStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">Commute Profile</span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  How do you usually commute to campus?
                </h3>
              </div>
              <div className="space-y-2">
                {COMMUTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSurveyCommuteMode(opt.label)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all pressable ${
                      surveyCommuteMode === opt.label
                        ? 'border-sky-500 bg-sky-500/10 shadow-xs'
                        : 'border-[var(--card-border)] bg-[var(--nested-bg)]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">{opt.label}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{opt.desc}</div>
                    </div>
                    {surveyCommuteMode === opt.label && <Check className="w-4 h-4 text-sky-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: TOP HELPFUL FEATURE */}
          {surveyStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">App Utility</span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Which feature do you use the most?
                </h3>
              </div>
              <div className="space-y-2">
                {FEATURE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSurveyTopFeature(opt.label)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all pressable ${
                      surveyTopFeature === opt.label
                        ? 'border-sky-500 bg-sky-500/10 shadow-xs'
                        : 'border-[var(--card-border)] bg-[var(--nested-bg)]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">{opt.label}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{opt.desc}</div>
                    </div>
                    {surveyTopFeature === opt.label && <Check className="w-4 h-4 text-sky-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: OFFLINE HABITS */}
          {surveyStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">Offline Reliability</span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  How often do you use SkwelaDabaw offline?
                </h3>
              </div>
              <div className="space-y-2">
                {OFFLINE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSurveyOfflineUsage(opt.label)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all pressable ${
                      surveyOfflineUsage === opt.label
                        ? 'border-sky-500 bg-sky-500/10 shadow-xs'
                        : 'border-[var(--card-border)] bg-[var(--nested-bg)]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">{opt.label}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{opt.desc}</div>
                    </div>
                    {surveyOfflineUsage === opt.label && <Check className="w-4 h-4 text-sky-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: RATING & OPTIONAL THOUGHTS */}
          {surveyStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">Satisfaction Score</span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Overall Experience Rating
                </h3>
                <div className="inline-flex px-3 py-1 rounded-full bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--text-primary)] mt-1">
                  {RATING_LABELS[surveyRating - 1]}
                </div>
              </div>

              {/* Numbered Pill Rating (No star icons) */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setSurveyRating(score)}
                    className={`w-11 h-11 rounded-2xl font-bold text-sm transition-all pressable ${
                      surveyRating === score
                        ? 'bg-sky-500 text-white shadow-md scale-105'
                        : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Additional thoughts or requests (Optional)
                  </label>
                  <span className={`text-[10px] font-mono ${surveyComments.length >= 450 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                    {surveyComments.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={surveyComments}
                  onChange={(e) => setSurveyComments(e.target.value.slice(0, 500))}
                  placeholder="Tell us what feature you'd like to see next..."
                  className="w-full p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] resize-none focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--card-border)]">
            {surveyStep > 1 ? (
              <button
                type="button"
                onClick={() => setSurveyStep(prev => prev - 1)}
                className="px-4 py-2 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs flex items-center gap-1 pressable"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={() => {
                if (surveyStep < totalSurveySteps) {
                  setSurveyStep(prev => prev + 1);
                } else {
                  handleSubmitSurvey();
                }
              }}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 pressable disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : surveyStep === totalSurveySteps ? (
                <>
                  <span>Submit Survey</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. FEEDBACK & BUG REPORT MODE
  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] pb-24 p-4 sm:p-6 space-y-5 max-w-xl mx-auto select-none animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setViewMode('picker')}
          className="p-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-bg)] pressable"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Direct Feedback &amp; Bug Report</h2>
          <p className="text-xs text-[var(--text-secondary)]">Send issues or ideas to the developers</p>
        </div>
      </div>

      {/* Feedback Form Card */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmitFeedback(); }} className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 shadow-xl">
        {/* Category Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Feedback Type *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FEEDBACK_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = feedbackCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFeedbackCategory(cat.id)}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all pressable ${
                    isSelected
                      ? 'border-violet-500 bg-violet-500/10 shadow-xs'
                      : 'border-[var(--card-border)] bg-[var(--nested-bg)] hover:border-[var(--text-secondary)]'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-violet-500' : 'text-[var(--text-secondary)]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[var(--text-primary)] truncate">{cat.label}</div>
                    <div className="text-[10px] text-[var(--text-secondary)] line-clamp-1">{cat.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Campus Selection */}
        <div className="space-y-1">
          <SelectWithOther
            label="Campus / School (Optional)"
            options={DAVAO_CAMPUSES.map((c) => ({
              value: c.id,
              label: `${c.name} • ${c.shortName}`
            }))}
            value={feedbackCampus}
            onChange={(val) => setFeedbackCampus(val)}
            otherPlaceholder="Enter unlisted Davao school or campus"
            otherOptionLabel="Other University or College"
            selectClassName="bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-primary)]"
          />
        </div>

        {/* Details Textarea */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Description / Bug Details *
            </label>
            <span className={`text-[10px] font-mono ${feedbackDetails.length >= 900 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
              {feedbackDetails.length}/1000
            </span>
          </div>
          <textarea
            rows={5}
            required
            maxLength={1000}
            value={feedbackDetails}
            onChange={(e) => setFeedbackDetails(e.target.value.slice(0, 1000))}
            placeholder="Describe the bug, missing jeepney route, or feature request in detail..."
            className="w-full p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] resize-none focus:outline-hidden"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !feedbackDetails.trim()}
            className="w-full py-3 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm flex items-center justify-center gap-2 pressable disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Submitting...</span>
            ) : (
              <>
                <span>Submit Feedback</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
