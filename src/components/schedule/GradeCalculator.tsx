import React, { useState } from 'react';
import { 
  Calculator, 
  Award, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Check, 
  BookOpen,
  X
} from 'lucide-react';
import { db } from '../../db';
import { GradeItem } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { queueCloudSync } from '../../services/cloudSyncService';

export const GradeCalculator: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [units, setUnits] = useState(3);
  const [prelim, setPrelim] = useState(85);
  const [midterm, setMidterm] = useState(85);
  const [prefinal, setPrefinal] = useState(85);
  const [finals, setFinals] = useState(85);
  const [gradingScale, setGradingScale] = useState<'1.0-5.0' | 'qpi-4.0' | 'percentage'>('1.0-5.0');

  const grades = useLiveQuery(() => db.grades.toArray(), []) || [];

  // Transmutation table formula
  const calculateTransmuted = (rawAvg: number, scale: string) => {
    if (scale === 'percentage') {
      return `${rawAvg.toFixed(1)}%`;
    }
    if (scale === 'qpi-4.0') {
      if (rawAvg >= 92) return '4.00';
      if (rawAvg >= 88) return '3.50';
      if (rawAvg >= 84) return '3.00';
      if (rawAvg >= 80) return '2.50';
      if (rawAvg >= 75) return '2.00';
      if (rawAvg >= 70) return '1.00';
      return '0.00';
    }
    // 1.00 - 5.00 default Philippine collegiate scale
    if (rawAvg >= 97) return '1.00';
    if (rawAvg >= 94) return '1.25';
    if (rawAvg >= 91) return '1.50';
    if (rawAvg >= 88) return '1.75';
    if (rawAvg >= 85) return '2.00';
    if (rawAvg >= 82) return '2.25';
    if (rawAvg >= 79) return '2.50';
    if (rawAvg >= 76) return '2.75';
    if (rawAvg >= 75) return '3.00';
    return '5.00';
  };

  const handleAddSubjectGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectCode.trim()) return;

    const rawAvg = (Number(prelim) + Number(midterm) + Number(prefinal) + Number(finals)) / 4;
    const transmuted = calculateTransmuted(rawAvg, gradingScale);

    await db.grades.add({
      subjectCode: subjectCode.trim(),
      subjectName: subjectName.trim() || subjectCode.trim(),
      units: Number(units) || 3,
      prelim: Number(prelim),
      midterm: Number(midterm),
      prefinal: Number(prefinal),
      finals: Number(finals),
      rawAverage: Number(rawAvg.toFixed(2)),
      transmutedGrade: transmuted,
      gradingScale
    });
    queueCloudSync();

    if (rawAvg >= 90) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });
    }

    setSubjectCode('');
    setSubjectName('');
    setIsAdding(false);
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    await db.grades.delete(id);
    queueCloudSync();
  };

  // Compute overall weighted GWA / Average
  let totalUnits = 0;
  let weightedPointsSum = 0;

  grades.forEach((g) => {
    totalUnits += g.units;
    const avg = g.rawAverage || 0;
    weightedPointsSum += avg * g.units;
  });

  const overallAverage = totalUnits > 0 ? weightedPointsSum / totalUnits : 0;
  const overallTransmuted = calculateTransmuted(overallAverage, gradingScale);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top iOS Inset Card with GWA summary */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--card-border)]">
                General Weighted Average • GWA
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {totalUnits} Units
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Standing: <span className="text-[var(--text-primary)]">{overallTransmuted}</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
              <Award className="w-3.5 h-3.5 text-[var(--text-primary)]" />
              <span>Weighted Raw Average: <strong className="text-[var(--text-primary)]">{overallAverage.toFixed(2)}%</strong></span>
              {overallAverage >= 90 && <span className="text-[#30D158] font-bold ml-1">★ Honor Standing</span>}
            </p>
          </div>

          {/* Scale Selector */}
          <div className="w-full sm:w-auto space-y-1">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
              Grading Scale
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[var(--nested-bg)] p-1 rounded-2xl border border-[var(--card-border)]">
              {[
                { id: '1.0-5.0', label: '1.00–5.00' },
                { id: 'qpi-4.0', label: '4.00 QPI' },
                { id: 'percentage', label: 'Percentage' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setGradingScale(s.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    gradingScale === s.id
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Enrolled Subjects &amp; Grades
        </h4>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3.5 py-1.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center gap-1 pressable"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{isAdding ? 'Close' : 'Add Subject'}</span>
        </button>
      </div>

      {/* Add Grade Form (iOS Inset Card) */}
      {isAdding && (
        <form onSubmit={handleAddSubjectGrade} className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Course Code</label>
              <input
                type="text"
                required
                placeholder="e.g. CS 101"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] font-bold uppercase"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Course Name</label>
              <input
                type="text"
                placeholder="e.g. Intro to Computing"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Units</label>
              <input
                type="number"
                min="1"
                max="10"
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Prelim %</label>
              <input
                type="number"
                min="50"
                max="100"
                value={prelim}
                onChange={(e) => setPrelim(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-center font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Midterm %</label>
              <input
                type="number"
                min="50"
                max="100"
                value={midterm}
                onChange={(e) => setMidterm(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-center font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Semi-Finals %</label>
              <input
                type="number"
                min="50"
                max="100"
                value={prefinal}
                onChange={(e) => setPrefinal(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-center font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Finals %</label>
              <input
                type="number"
                min="50"
                max="100"
                value={finals}
                onChange={(e) => setFinals(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-center font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
          >
            Calculate &amp; Save Subject Grade
          </button>
        </form>
      )}

      {/* Subjects Grade Inset List */}
      <div className="space-y-2">
        {grades.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center text-xs text-[var(--text-secondary)]">
            No subjects logged yet. Add your enrolled subjects to calculate your semester GWA.
          </div>
        ) : (
          grades.map((item) => {
            const transmuted = calculateTransmuted(item.rawAverage || 0, gradingScale);
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-between gap-3 pressable"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[var(--text-primary)] uppercase">
                      {item.subjectCode}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      • {item.units} Units
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    {item.subjectName}
                  </p>
                  <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-2 pt-0.5 font-mono">
                    <span>P: {item.prelim}%</span>
                    <span>M: {item.midterm}%</span>
                    <span>SF: {item.prefinal}%</span>
                    <span>F: {item.finals}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-bold text-[var(--text-primary)] block">
                      {transmuted}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {item.rawAverage?.toFixed(1)}%
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[#FF453A] hover:bg-[var(--nested-bg)] transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
