import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Award, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Check, 
  BookOpen
} from 'lucide-react';
import { db } from '../../db';
import { ClassSchedule } from '../../types';
import confetti from 'canvas-confetti';
import { PageIntroGuide } from '../common/PageIntroGuide';
import { CustomSelect } from '../common/CustomSelect';

type GradingScaleType = 'qpi-4.0' | '1.0-5.0' | 'percentage';

interface CourseGradeRow {
  id: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  gradeValue: string;
}

const ADDU_QPI_OPTIONS = [
  { label: 'A • 4.00 — Excellent', value: '4.00', weight: 4.0 },
  { label: 'B+ • 3.50 — Very Good', value: '3.50', weight: 3.5 },
  { label: 'B • 3.00 — Good', value: '3.00', weight: 3.0 },
  { label: 'C+ • 2.50 — Above Average', value: '2.50', weight: 2.5 },
  { label: 'C • 2.00 — Average / Passing', value: '2.00', weight: 2.0 },
  { label: 'D • 1.00 — Conditional', value: '1.00', weight: 1.0 },
  { label: 'F • 0.00 — Failed', value: '0.00', weight: 0.0 }
];

const STANDARD_NUMERICAL_OPTIONS = [
  { label: '1.00 • 99-100% — Excellent', value: '1.00', weight: 1.00 },
  { label: '1.25 • 96-98% — Superior', value: '1.25', weight: 1.25 },
  { label: '1.50 • 93-95% — Very Good', value: '1.50', weight: 1.50 },
  { label: '1.75 • 90-92% — Good', value: '1.75', weight: 1.75 },
  { label: '2.00 • 87-89% — Satisfactory', value: '2.00', weight: 2.00 },
  { label: '2.25 • 84-86% — Fair', value: '2.25', weight: 2.25 },
  { label: '2.50 • 81-83% — Average', value: '2.50', weight: 2.50 },
  { label: '2.75 • 78-80% — Below Average', value: '2.75', weight: 2.75 },
  { label: '3.00 • 75-77% — Passing', value: '3.00', weight: 3.00 },
  { label: '5.00 • Under 75% — Failed', value: '5.00', weight: 5.00 }
];

export const GpaCalculatorPage: React.FC = () => {
  const [gradingScale, setGradingScale] = useState<GradingScaleType>('1.0-5.0');
  const [courses, setCourses] = useState<CourseGradeRow[]>([]);

  // Simulator State
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [prelimGrade, setPrelimGrade] = useState<number>(88);
  const [midtermGrade, setMidtermGrade] = useState<number>(85);
  const [desiredFinalGrade, setDesiredFinalGrade] = useState<number>(90);
  const [prelimWeight, setPrelimWeight] = useState<number>(30);
  const [midtermWeight, setMidtermWeight] = useState<number>(30);
  const [finalsWeight, setFinalsWeight] = useState<number>(40);

  // Initialize courses from saved grades if empty
  useEffect(() => {
    let isMounted = true;
    db.grades.toArray().then((savedGrades) => {
      if (!isMounted || !savedGrades || savedGrades.length === 0) return;
      setCourses((prev) => {
        if (prev.length > 0) return prev;
        return savedGrades.map((g, idx) => ({
          id: String(g.id || Date.now() + idx),
          subjectCode: g.subjectCode,
          subjectName: g.subjectName,
          units: g.units || 3,
          gradeValue: g.transmutedGrade ? String(g.transmutedGrade) : (gradingScale === 'qpi-4.0' ? '3.50' : '1.50')
        }));
      });
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [gradingScale]);

  // Sync with user's Dexie class schedules
  const handleImportFromTimetable = async () => {
    try {
      const schedules = await db.schedules.toArray();
      if (!schedules || schedules.length === 0) {
        alert('No classes found in your timetable yet. Add subjects in the Classes tab first!');
        return;
      }

      const uniqueSubjects = new Map<string, ClassSchedule>();
      schedules.forEach(s => {
        if (!uniqueSubjects.has(s.subjectCode)) {
          uniqueSubjects.set(s.subjectCode, s);
        }
      });

      const defaultGrade = gradingScale === 'qpi-4.0' ? '3.50' : '1.50';
      const newRows: CourseGradeRow[] = Array.from(uniqueSubjects.values()).map((s, idx) => ({
        id: String(Date.now() + idx),
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        units: s.units || 3,
        gradeValue: defaultGrade
      }));

      setCourses(newRows);
      confetti({ particleCount: 40, spread: 60 });
    } catch (err) {
      console.error('Failed to import schedules:', err);
    }
  };

  const handleAddCourse = () => {
    const defaultGrade = gradingScale === 'qpi-4.0' ? '3.50' : '1.50';
    setCourses(prev => [
      ...prev,
      {
        id: String(Date.now()),
        subjectCode: `SUBJ ${prev.length + 1}`,
        subjectName: 'Elective Course',
        units: 3,
        gradeValue: defaultGrade
      }
    ]);
  };

  const handleRemoveCourse = (id: string) => {
    if (courses.length <= 1) return;
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateCourse = (id: string, field: keyof CourseGradeRow, val: any) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  // Calculate Weighted GPA / QPI
  const totalUnits = courses.reduce((sum, c) => sum + (Number(c.units) || 0), 0);
  
  let computedGpa = 0;
  if (totalUnits > 0) {
    const weightedSum = courses.reduce((sum, c) => {
      const units = Number(c.units) || 0;
      const grade = parseFloat(c.gradeValue) || 0;
      return sum + (grade * units);
    }, 0);
    computedGpa = weightedSum / totalUnits;
  }

  // Determine Honors / Standing
  let honorsBadge = 'Good Standing';

  if (gradingScale === 'qpi-4.0') {
    if (computedGpa >= 3.85) {
      honorsBadge = 'Summa Cum Laude Track';
    } else if (computedGpa >= 3.70) {
      honorsBadge = 'Magna Cum Laude Track';
    } else if (computedGpa >= 3.50) {
      honorsBadge = 'Cum Laude Track';
    } else if (computedGpa >= 3.30) {
      honorsBadge = "Dean's List (Honorable Mention)";
    }
  } else if (gradingScale === '1.0-5.0') {
    if (computedGpa <= 1.20 && computedGpa >= 1.0) {
      honorsBadge = 'Summa Cum Laude Track';
    } else if (computedGpa <= 1.45) {
      honorsBadge = 'Magna Cum Laude Track';
    } else if (computedGpa <= 1.75) {
      honorsBadge = 'Cum Laude Track';
    } else if (computedGpa <= 2.00) {
      honorsBadge = "President's / Dean's Honor Roll";
    }
  }

  // Final Grade Needed Calculation
  const currentWeighted = (prelimGrade * (prelimWeight / 100)) + (midtermGrade * (midtermWeight / 100));
  const neededOnFinals = finalsWeight > 0 ? (desiredFinalGrade - currentWeighted) / (finalsWeight / 100) : 0;

  return (
    <div className="space-y-4 pb-20 animate-fade-in select-none">
      <PageIntroGuide
        pageKey="gpa"
        icon={<Calculator className="w-6 h-6 text-white" />}
        title="GPA &amp; QPI Grade Calculator"
        description="Compute your semester General Weighted Average or Ateneo QPI standing with Latin honors estimates."
        tips={[
          'Sync your enrolled subjects directly from your Class Schedule.',
          'Use the Final Grade Simulator to calculate exam scores needed to pass or achieve honors.'
        ]}
      />

      {/* Primary Inset Summary Card */}
      <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)]">
                {gradingScale === 'qpi-4.0' ? 'Ateneo QPI (4.0 Scale)' : 'Standard Numerical (1.00–5.00)'}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {totalUnits} Units Enrolled
              </span>
            </div>

            <div className="pt-1">
              <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
                {computedGpa.toFixed(2)}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
              <Award className="w-3.5 h-3.5 text-[var(--text-primary)]" />
              <span>Standing: <strong className="text-[var(--text-primary)]">{honorsBadge}</strong></span>
            </p>
          </div>

          {/* Scale Selector */}
          <div className="w-full sm:w-auto space-y-1">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
              Grading Scale
            </span>
            <div className="grid grid-cols-2 gap-1 bg-[var(--nested-bg)] p-1 rounded-2xl border border-[var(--nested-border)]">
              <button
                type="button"
                onClick={() => setGradingScale('1.0-5.0')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  gradingScale === '1.0-5.0' ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                1.00–5.00
              </button>
              <button
                type="button"
                onClick={() => setGradingScale('qpi-4.0')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  gradingScale === 'qpi-4.0' ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                4.00 QPI
              </button>
            </div>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--card-border)] flex-wrap">
          <button
            type="button"
            onClick={handleImportFromTimetable}
            className="px-3.5 py-1.5 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 pressable"
          >
            <RefreshCw className="w-3 h-3 text-[var(--text-secondary)]" />
            <span>Sync From Timetable</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSimulator(!showSimulator)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all pressable ${
              showSimulator ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs' : 'bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] hover:opacity-90'
            }`}
          >
            <Calculator className="w-3 h-3" />
            <span>{showSimulator ? 'Hide Simulator' : 'Final Grade Simulator'}</span>
          </button>
        </div>
      </div>

      {/* FINAL GRADE SIMULATOR INSET CARD */}
      {showSimulator && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 animate-slide-up">
          <div className="border-b border-[var(--card-border)] pb-3">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[var(--text-primary)]" />
              <span>Final Exam Target Score Simulator</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Compute exact score needed on your final exam to reach your target final grade.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Prelim Grade (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={prelimGrade}
                onChange={(e) => setPrelimGrade(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-xs font-bold text-[var(--input-text)] text-center focus:outline-none focus:border-[var(--card-hover-border)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Midterm Grade (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={midtermGrade}
                onChange={(e) => setMidtermGrade(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-xs font-bold text-[var(--input-text)] text-center focus:outline-none focus:border-[var(--card-hover-border)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Target Final Grade (%)</label>
              <input
                type="number"
                min="75"
                max="100"
                value={desiredFinalGrade}
                onChange={(e) => setDesiredFinalGrade(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-xs font-bold text-[var(--input-text)] text-center focus:outline-none focus:border-[var(--card-hover-border)]"
              />
            </div>
          </div>

          {/* Result Inset Card */}
          <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-center space-y-1">
            <span className="text-xs text-[var(--text-secondary)]">
              Required Finals Exam Score:
            </span>
            <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
              {neededOnFinals > 100 ? (
                <span className="text-[#FF453A]">{neededOnFinals.toFixed(1)}% (Mathematically impossible without extra credit)</span>
              ) : neededOnFinals <= 0 ? (
                <span className="text-[#30D158]">0% (You have already locked in your passing grade!)</span>
              ) : (
                <span>{neededOnFinals.toFixed(1)}%</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COURSE GRADE INSET TABLE */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--text-primary)]" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Enrolled Course Roster
            </h3>
          </div>

          <button
            type="button"
            onClick={handleAddCourse}
            className="px-3.5 py-1.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm flex items-center gap-1 pressable"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {courses.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-[var(--text-secondary)] opacity-40" />
              <div className="text-xs font-bold text-[var(--text-primary)]">No subjects added yet</div>
              <p className="text-[11px] text-[var(--text-secondary)] max-w-xs mx-auto">
                Add your enrolled subjects manually or tap "Sync From Timetable" above to import your course roster.
              </p>
            </div>
          ) : (
            courses.map((course, idx) => (
            <div
              key={course.id}
              className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 w-full">
                <input
                  type="text"
                  maxLength={20}
                  value={course.subjectCode}
                  onChange={(e) => handleUpdateCourse(course.id, 'subjectCode', e.target.value.slice(0, 20))}
                  placeholder="Code (e.g. CS 101)"
                  className="px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-xs font-bold text-[var(--input-text)] uppercase focus:outline-none focus:border-[var(--card-hover-border)]"
                />

                <input
                  type="text"
                  maxLength={80}
                  value={course.subjectName}
                  onChange={(e) => handleUpdateCourse(course.id, 'subjectName', e.target.value.slice(0, 80))}
                  placeholder="Course Title"
                  className="px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-xs font-medium text-[var(--input-text)] focus:outline-none focus:border-[var(--card-hover-border)]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--text-secondary)] font-semibold">Units:</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={course.units}
                    onChange={(e) => handleUpdateCourse(course.id, 'units', Number(e.target.value))}
                    className="w-14 px-2 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-xs font-bold text-[var(--input-text)] text-center focus:outline-none focus:border-[var(--card-hover-border)]"
                  />
                </div>

                <div className="flex items-center gap-1 flex-1 sm:flex-initial">
                  <CustomSelect
                    value={course.gradeValue}
                    onChange={(val) => handleUpdateCourse(course.id, 'gradeValue', val)}
                    options={gradingScale === 'qpi-4.0' ? ADDU_QPI_OPTIONS : STANDARD_NUMERICAL_OPTIONS}
                    triggerClassName="w-full sm:w-44 px-2.5 py-2 rounded-xl bg-[var(--nested-bg)] border-[var(--card-border)] text-xs font-bold text-[var(--text-primary)]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCourse(course.id)}
                  className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[#FF453A] hover:bg-[var(--card-bg)] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
};
