import React, { useState } from 'react';
import { 
  Calculator, 
  HelpCircle, 
  ShieldCheck, 
  Coins, 
  ArrowRight, 
  Info, 
  CheckCircle2, 
  CreditCard,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { calculateStudentFare } from '../../utils/davaoTransitRouter';

export interface JeepFareCalculatorPageProps {
  onBack?: () => void;
}

export const JeepFareCalculatorPage: React.FC<JeepFareCalculatorPageProps> = ({ onBack }) => {
  const [distanceKm, setDistanceKm] = useState<number>(5);

  const distanceMeters = distanceKm * 1000;
  const studentEstimate = calculateStudentFare(distanceMeters);

  // Regular fare formula: ₱15.00 base for first 4 km, +₱2.00/km thereafter
  const regularFare = distanceKm <= 4 
    ? 15.00 
    : 15.00 + Math.ceil(distanceKm - 4) * 2.00;

  // Senior / PWD formula: ₱12.00 base for first 4 km, +₱1.60/km thereafter
  const seniorFare = distanceKm <= 4 
    ? 12.00 
    : 12.00 + Math.ceil(distanceKm - 4) * 1.60;

  const savings = Math.max(0, regularFare - studentEstimate.studentFare);

  // Common Davao student routes
  const POPULAR_FARES = [
    { from: 'Matina Crossing', to: 'Roxas / Post Office', km: 3.8, fare: 11.00 },
    { from: 'Toril Gaisano', to: 'AdDU Jacinto', km: 14.2, fare: 21.00 },
    { from: 'Mintal Junction', to: 'USEP Obrero', km: 12.8, fare: 20.00 },
    { from: 'Buhangin Milan', to: 'UIC Bonifacio', km: 6.2, fare: 13.00 },
    { from: 'Calinan Market', to: 'Bankerohan Market', km: 28.5, fare: 36.00 },
    { from: 'Panacan Crossing', to: 'UM Matina', km: 15.6, fare: 23.00 },
    { from: 'Sasa Wharf Km 10', to: 'San Pedro / City Hall', km: 10.5, fare: 18.00 },
    { from: 'Agdao Market', to: 'Ateneo Matina Campus', km: 5.4, fare: 12.00 },
    { from: 'Ulas Junction', to: 'Gaisano Mall Bajada', km: 8.3, fare: 15.00 }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 space-y-5 pb-24 select-none">
      {/* Title Banner */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-500" />
            <span>Official LTFRB 2026 Student Fare Calculator</span>
          </h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Compute accurate student jeepney fares in Davao City based on official LTFRB distance matrices and Republic Act 11314.
        </p>
      </div>

      {/* Interactive Fare Calculator Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md space-y-4">
        {/* Distance Slider Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
            <span>Distance Travelled:</span>
            <span className="text-base text-[var(--accent-color)] font-mono font-black">{distanceKm.toFixed(1)} km</span>
          </div>

          <input
            type="range"
            min="1"
            max="40"
            step="0.5"
            value={distanceKm}
            onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-[var(--nested-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
          />

          <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
            <span>1 km</span>
            <span>10 km</span>
            <span>20 km</span>
            <span>30 km</span>
            <span>40 km</span>
          </div>
        </div>

        {/* Fare Comparison Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {/* Student (Primary) */}
          <div className="p-3 rounded-2xl bg-[var(--card-bg)] border-2 border-[var(--accent-color)] text-center space-y-0.5 shadow-xs">
            <span className="block text-[10px] font-black uppercase text-[var(--accent-color)] tracking-wider">
              Student / Youth
            </span>
            <span className="text-2xl font-black text-[var(--accent-color)] font-mono">
              ₱{studentEstimate.studentFare.toFixed(2)}
            </span>
            <span className="block text-[10px] font-bold text-[var(--accent-color)]">
              20% Discount
            </span>
          </div>

          {/* Regular */}
          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-center space-y-0.5">
            <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
              Regular
            </span>
            <span className="text-xl font-bold text-[var(--text-primary)] font-mono">
              ₱{regularFare.toFixed(2)}
            </span>
            <span className="block text-[10px] font-medium text-[var(--text-muted)]">
              Standard Rate
            </span>
          </div>

          {/* Senior / PWD */}
          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-center space-y-0.5">
            <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
              Senior / PWD
            </span>
            <span className="text-xl font-bold text-[var(--text-primary)] font-mono">
              ₱{seniorFare.toFixed(2)}
            </span>
            <span className="block text-[10px] font-medium text-[var(--text-muted)]">
              20% Mandate
            </span>
          </div>
        </div>

        {/* Calculation Details Banner */}
        <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
            <span>Rate Formula Breakdown:</span>
            <span className="font-mono text-emerald-500 font-bold">{studentEstimate.breakdown}</span>
          </div>
          {savings > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-color)]">
              <Coins className="w-3.5 h-3.5 shrink-0" />
              <span>You save ₱{savings.toFixed(2)} with your student discount on this trip!</span>
            </div>
          )}
        </div>
      </div>

      {/* Popular Davao Student Commute Matrix Table */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-[var(--accent-color)]" />
            <span>Popular Davao Student Commute Matrix</span>
          </h3>
          <span className="text-[10px] text-[var(--text-muted)] font-medium">LTFRB 2026 Rate</span>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-[var(--text-muted)] text-[10.5px] uppercase font-bold tracking-wider">
                <th className="py-2 pr-3">Origin Hub</th>
                <th className="py-2 px-3">Campus / Destination</th>
                <th className="py-2 px-3 text-right">Distance</th>
                <th className="py-2 pl-3 text-right">Student Fare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]/50">
              {POPULAR_FARES.map((f, i) => (
                <tr key={i} className="hover:bg-[var(--nested-bg)]/40 transition-colors">
                  <td className="py-2.5 pr-3 font-semibold text-[var(--text-primary)]">{f.from}</td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">{f.to}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[var(--text-muted)]">{f.km} km</td>
                  <td className="py-2.5 pl-3 text-right font-mono font-black text-[var(--accent-color)]">
                    ₱{f.fare.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Republic Act 11314 Student Rights Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>Republic Act 11314 • Student Fare Discount Act</span>
        </h3>

        <div className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-[var(--text-primary)]">365 Days a Year:</strong> Students are entitled to a 20% fare discount on all public transport vehicles (jeepneys, buses, modern PUVs) every single day, including weekends, semestral breaks, and holidays.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-[var(--text-primary)]">Valid Identification:</strong> Carry your valid School ID or current Certificate of Registration (COR) to claim your discount smoothly without dispute.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-[var(--text-primary)]">Post-Graduate Exception:</strong> The discount applies to elementary, junior/senior high, and undergraduate college students. Post-graduate programs (Medicine, Law, Masters, PhD) are exempt.
            </p>
          </div>
        </div>
      </div>

      {/* Commuter Bisaya Phrases & Etiquette */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>Dabawenyo Commuter Phrases (Bisaya &amp; English)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
            <span className="font-bold text-[var(--text-primary)]">"Palihug ko'g bayad, estudyante isa."</span>
            <p className="text-[11px] text-[var(--text-muted)]">Please pass my fare, 1 student.</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
            <span className="font-bold text-[var(--text-primary)]">"Lugar lang sa kanto, 'Nong."</span>
            <p className="text-[11px] text-[var(--text-muted)]">Drop me off at the street corner, sir.</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
            <span className="font-bold text-[var(--text-primary)]">"Pila plete gikan [Origin] hangtod [Dest]?"</span>
            <p className="text-[11px] text-[var(--text-muted)]">How much is the fare from [Origin] to [Dest]?</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
            <span className="font-bold text-[var(--text-primary)]">"Mobiyahe ba mo paingon Roxas?"</span>
            <p className="text-[11px] text-[var(--text-muted)]">Are you heading towards Roxas?</p>
          </div>
        </div>
      </div>
    </div>
  );
};
