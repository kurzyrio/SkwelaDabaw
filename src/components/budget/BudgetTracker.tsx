import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Bus, 
  Utensils, 
  Coffee, 
  FileText, 
  ShoppingBag,
  X
} from 'lucide-react';
import { db } from '../../db';
import { ExpenseItem } from '../../types';
import { PageIntroGuide } from '../common/PageIntroGuide';
import { queueCloudSync } from '../../services/cloudSyncService';

type AllowanceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom_days';

export const BudgetTracker: React.FC = () => {
  const [allowanceFrequency, setAllowanceFrequency] = useState<AllowanceFrequency>(() => {
    return (localStorage.getItem('skweladabaw_baon_frequency') as AllowanceFrequency) || 'daily';
  });
  const [totalAllowanceAmount, setTotalAllowanceAmount] = useState<number>(() => {
    const saved = localStorage.getItem('skweladabaw_baon_budget');
    return saved ? Number(saved) : 150;
  });
  const [allowanceInput, setAllowanceInput] = useState<string>(() => {
    const saved = localStorage.getItem('skweladabaw_baon_budget');
    return saved || '150';
  });
  const [activeDays, setActiveDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [category, setCategory] = useState<ExpenseItem['category']>('jeep');
  const [amount, setAmount] = useState<number>(21);
  const [amountInput, setAmountInput] = useState<string>('21');
  const [note, setNote] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) || [];

  const handleFrequencyChange = (nextFreq: AllowanceFrequency) => {
    if (nextFreq === allowanceFrequency) return;

    const currentDays = Math.max(1, activeDays.length);
    let currentDaily = totalAllowanceAmount;

    if (allowanceFrequency === 'weekly' || allowanceFrequency === 'custom_days') {
      currentDaily = totalAllowanceAmount / currentDays;
    } else if (allowanceFrequency === 'monthly') {
      currentDaily = totalAllowanceAmount / (currentDays * 4);
    }

    let newTotal = currentDaily;
    if (nextFreq === 'weekly' || nextFreq === 'custom_days') {
      newTotal = Math.round(currentDaily * currentDays);
    } else if (nextFreq === 'monthly') {
      newTotal = Math.round(currentDaily * (currentDays * 4));
    } else {
      newTotal = Math.round(currentDaily);
    }

    setAllowanceFrequency(nextFreq);
    setTotalAllowanceAmount(newTotal);
    setAllowanceInput(String(newTotal));
    localStorage.setItem('skweladabaw_baon_budget', String(newTotal));
    localStorage.setItem('skweladabaw_baon_frequency', nextFreq);
    queueCloudSync();
  };

  // Compute Daily Working Budget
  const computedDailyBudget = useMemo(() => {
    switch (allowanceFrequency) {
      case 'daily':
        return totalAllowanceAmount;
      case 'weekly': {
        const daysCount = Math.max(1, activeDays.length);
        return totalAllowanceAmount / daysCount;
      }
      case 'monthly': {
        const daysCount = Math.max(1, activeDays.length * 4);
        return totalAllowanceAmount / daysCount;
      }
      case 'custom_days': {
        const daysCount = Math.max(1, activeDays.length);
        return totalAllowanceAmount / daysCount;
      }
      default:
        return totalAllowanceAmount;
    }
  }, [allowanceFrequency, totalAllowanceAmount, activeDays]);

  // Filter today's expenses
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const totalSpentToday = todayExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const remainingBudget = computedDailyBudget - totalSpentToday;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(amountInput) || amount;
    if (!finalAmount || finalAmount <= 0) return;

    await db.expenses.add({
      date: todayStr,
      category,
      amount: finalAmount,
      note: note.trim() || getDefaultNote(category)
    });
    queueCloudSync();

    setNote('');
    setAmount(21);
    setAmountInput('21');
    setIsAdding(false);
  };

  const handleDeleteExpense = async (id?: number) => {
    if (!id) return;
    await db.expenses.delete(id);
    queueCloudSync();
  };

  const toggleDay = (day: string) => {
    setActiveDays((prev) =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter((d) => d !== day) : prev) : [...prev, day]
    );
  };

  const getDefaultNote = (cat: ExpenseItem['category']) => {
    switch (cat) {
      case 'jeep': return 'Jeepney fare';
      case 'food': return 'Student meal / lunch';
      case 'coffee': return 'Study coffee';
      case 'photocopy': return 'Photocopy / printing';
      case 'supplies': return 'School supplies';
      default: return 'Expense';
    }
  };

  const getCategoryIcon = (cat: ExpenseItem['category']) => {
    switch (cat) {
      case 'jeep': return <Bus className="w-4 h-4 text-white" />;
      case 'food': return <Utensils className="w-4 h-4 text-white" />;
      case 'coffee': return <Coffee className="w-4 h-4 text-white" />;
      case 'photocopy': return <FileText className="w-4 h-4 text-white" />;
      case 'supplies': return <ShoppingBag className="w-4 h-4 text-white" />;
      default: return <Wallet className="w-4 h-4 text-white" />;
    }
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6 animate-fade-in select-none">
      <PageIntroGuide
        pageKey="budget"
        icon={<Wallet className="w-6 h-6 text-white" />}
        title="Baon &amp; Commute Allowance Tracker"
        description="Monitor daily student allowance, jeep fares, meal expenses, and calculate daily savings."
        tips={[
          'Set your Baon frequency (Daily, Weekly, Monthly, or Active Class Days).',
          'Track daily spending to ensure you never run short for your jeep commute home.'
        ]}
      />

      {/* Top Grouped Card: Allowance & Frequency Manager */}
      <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)]">
                Baon Allowance
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                Working Daily: ₱{computedDailyBudget.toFixed(2)}
              </span>
            </div>

            <div className="pt-1">
              <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
                ₱{remainingBudget.toFixed(2)}
              </span>
              <span className="text-xs text-[var(--text-secondary)] ml-2">remaining today</span>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Spent Today: <strong className="text-[var(--text-primary)]">₱{totalSpentToday.toFixed(2)}</strong>
            </p>
          </div>

          {/* Frequency Segmented Control */}
          <div className="w-full sm:w-auto space-y-1">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
              Frequency
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[var(--nested-bg)] p-1 rounded-2xl border border-[var(--nested-border)]">
              {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => handleFrequencyChange(freq)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                    allowanceFrequency === freq
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Amount Input and Active Days Inset */}
        <div className="pt-3 border-t border-[var(--card-border)] grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              {allowanceFrequency.charAt(0).toUpperCase() + allowanceFrequency.slice(1)} Baon (₱):
            </label>
            <input
              type="number"
              min="0"
              max="999999"
              placeholder="150"
              value={allowanceInput}
              onChange={(e) => {
                const raw = e.target.value;
                setAllowanceInput(raw);
                if (raw.trim() !== '') {
                  const val = Number(raw);
                  if (!isNaN(val) && val >= 0) {
                    setTotalAllowanceAmount(val);
                    localStorage.setItem('skweladabaw_baon_budget', String(val));
                  }
                }
              }}
              onBlur={() => {
                if (allowanceInput.trim() === '' || Number(allowanceInput) <= 0) {
                  const fallback = allowanceFrequency === 'monthly' ? 3000 : (allowanceFrequency === 'weekly' ? 750 : 150);
                  setTotalAllowanceAmount(fallback);
                  setAllowanceInput(String(fallback));
                  localStorage.setItem('skweladabaw_baon_budget', String(fallback));
                } else {
                  setAllowanceInput(String(totalAllowanceAmount));
                }
                queueCloudSync();
              }}
              className="w-24 px-3 py-1.5 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-xs font-bold text-[var(--input-text)] text-center focus:outline-none focus:border-[var(--card-hover-border)]"
            />
          </div>

          {allowanceFrequency !== 'daily' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[var(--text-secondary)]">Class Days:</span>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    activeDays.includes(d)
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Today's Recorded Expenses
        </h4>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3.5 py-1.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center gap-1 pressable"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{isAdding ? 'Close' : 'Add Expense'}</span>
        </button>
      </div>

      {/* Add Expense Inset Form */}
      {isAdding && (
        <form onSubmit={handleAddExpense} className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3.5 animate-slide-up">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Category</label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'jeep', label: 'Jeep' },
                { id: 'food', label: 'Food' },
                { id: 'coffee', label: 'Coffee' },
                { id: 'photocopy', label: 'Print' },
                { id: 'supplies', label: 'Supplies' }
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id as any)}
                  className={`py-2 rounded-xl text-xs font-semibold text-center transition-all ${
                    category === c.id
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                      : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Amount (₱) *</label>
              <input
                type="number"
                required
                min="1"
                max="999999"
                placeholder="21"
                value={amountInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  setAmountInput(raw);
                  if (raw.trim() !== '') {
                    const num = Number(raw);
                    if (!isNaN(num) && num > 0) setAmount(Math.min(999999, num));
                  }
                }}
                onBlur={() => {
                  if (amountInput.trim() === '' || Number(amountInput) <= 0) {
                    setAmount(21);
                    setAmountInput('21');
                  } else {
                    setAmountInput(String(Math.min(999999, amount)));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-xs font-bold text-[var(--input-text)] focus:outline-none focus:border-[var(--card-hover-border)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Note / Description</label>
              <input
                type="text"
                maxLength={100}
                placeholder={getDefaultNote(category)}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 100))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-xs text-[var(--input-text)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--card-hover-border)]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
          >
            Save Expense
          </button>
        </form>
      )}

      {/* Expense List in Grouped Cards */}
      <div className="space-y-2">
        {todayExpenses.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center text-xs text-[var(--text-secondary)] space-y-1">
            <Wallet className="w-5 h-5 text-[var(--text-primary)] mx-auto mb-2" />
            <p className="font-semibold text-[var(--text-primary)]">No expenses logged today</p>
            <p>Tap "Add Expense" to track your fare or lunch.</p>
          </div>
        ) : (
          todayExpenses.map((exp) => (
            <div
              key={exp.id}
              className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-between gap-3 pressable"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] flex items-center justify-center shrink-0">
                  {getCategoryIcon(exp.category)}
                </div>
                <div>
                  <h5 className="font-bold text-xs text-[var(--text-primary)] capitalize">
                    {exp.note || exp.category}
                  </h5>
                  <p className="text-[10px] text-[var(--text-secondary)] capitalize">
                    {exp.category}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold font-mono text-sm text-[var(--text-primary)]">
                  -₱{Number(exp.amount).toFixed(2)}
                </span>
                <button
                  onClick={() => handleDeleteExpense(exp.id)}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[#FF453A] hover:bg-[var(--nested-bg)] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
