import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  PhoneCall, 
  CheckCircle2, 
  MapPin, 
  Eye, 
  Moon, 
  Shield, 
  AlertOctagon,
  ArrowLeft
} from 'lucide-react';

export interface JeepSafetyHazardPageProps {
  onBack?: () => void;
}

export const JeepSafetyHazardPage: React.FC<JeepSafetyHazardPageProps> = ({ onBack }) => {
  const HAZARD_ZONES = [
    {
      name: 'Buhangin Flyover',
      corridor: 'Buhangin Road & Diversion Junction',
      risk: 'High vehicle speed, narrow elevated road shoulders, zero pedestrian pathways.',
      rule: 'Boarding or alighting on the flyover ramp is strictly prohibited by CTTMO.'
    },
    {
      name: 'Agdao Flyover',
      corridor: 'Leon Garcia & R. Castillo St.',
      risk: 'Blind vehicle incline, heavy commercial container truck traffic from Sasa port.',
      rule: 'Passengers must board only at designated ground level bays near Agdao market.'
    },
    {
      name: 'Ma-a / C.P. Garcia Flyover',
      corridor: 'Carlos P. Garcia Highway & Ma-a Junction',
      risk: 'Fast-moving highway bypass traffic, absence of physical barrier on bridge apron.',
      rule: 'Wait at designated loading shed before the flyover approach.'
    },
    {
      name: 'Bankerohan Bridge (Generoso I & II)',
      corridor: 'Quirino Ave & Davao River Crossing',
      risk: 'Severe traffic bottleneck, narrow pedestrian walkways, river embankment drop-off.',
      rule: 'Board strictly after clearing bridge approaches at Bankerohan market entrance.'
    },
    {
      name: 'Bolton Bridge',
      corridor: 'Bolton Extension & Ecoland Bypass',
      risk: 'Heavy container trucks heading towards DCOTT and Quimpo Boulevard.',
      rule: 'Never flag down jeeps midway across the bridge structure.'
    },
    {
      name: 'Bunawan Bridge & Highway',
      corridor: 'Davao-Agusan National Highway',
      risk: 'Provincial high-speed buses and heavy transport trailers.',
      rule: 'Use designated barangay waiting sheds along the highway.'
    }
  ];

  const EMERGENCY_HOTLINES = [
    { name: 'Davao City Central 911', number: '911', desc: 'Police, Fire, Medical & Rescue (Toll-Free)' },
    { name: 'CTTMO Traffic Hotline', number: '(082) 298-3602', desc: 'Traffic Assistance & Commuter Inquiries' },
    { name: 'Davao City Police Office (DCPO)', number: '(082) 224-1313', desc: 'Law Enforcement & Campus Security' },
    { name: 'Davao City Hall Public Assistance', number: '(082) 241-1000', desc: 'Public Service & City Helpline' }
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
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <span>Davao Commuter Safety &amp; Flyover Hazards</span>
          </h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Safety advisory on 103 unsafe bridge and flyover segments in Davao City, safe boarding rules, and emergency hotlines.
        </p>
      </div>

      {/* Critical Safety Advisory Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 shadow-md space-y-3">
        <div className="flex items-center gap-2 text-rose-500">
          <AlertOctagon className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-black uppercase tracking-wide">
            Zero Alighting on Flyovers &amp; Bridges Directive
          </h3>
        </div>
        <p className="text-xs text-[var(--text-primary)] leading-relaxed">
          The Davao City Transport and Traffic Management Office (CTTMO) strictly penalizes loading, unloading, or disembarking on any elevated flyover or river bridge. Drivers flagging or stopping on flyovers face immediate citation tickets, and commuters risk severe highway collision hazards.
        </p>
      </div>

      {/* Key Hazard Zones List */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Major Flyover &amp; Bridge Hazard Zones</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HAZARD_ZONES.map((zone, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">{zone.name}</span>
                <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  Hazard
                </span>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">{zone.corridor}</p>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{zone.risk}</p>
              <div className="pt-1 border-t border-[var(--card-border)]/60 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
                Rule: {zone.rule}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Night Commute Safety Checklist */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <Moon className="w-4 h-4 text-indigo-400" />
          <span>Night Commute Safety Checklist for College Students</span>
        </h3>

        <div className="space-y-2 text-xs text-[var(--text-secondary)]">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-[var(--text-primary)]">Pre-Count Your Fare:</strong> Keep exact student coins (₱11 or ₱12) in your pocket before boarding. Never pull out high-denomination banknotes or open your wallet inside a moving jeep.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-[var(--text-primary)]">Sit Near the Front:</strong> At night, sit close to the driver or alongside other students and women. Avoid sitting right at the end entrance ledge where snatchers can grab valuables.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-[var(--text-primary)]">Be Mindful Near Windows:</strong> Never hold your phone or study tablet openly against the open jeep window, especially at slow traffic spots (Roxas, Bankerohan, Agdao).
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-[var(--text-primary)]">Share Transit Location:</strong> Use SkwelaDabaw's "Share Route Steps" button to send your route plan and estimated arrival time to a parent, roommate, or classmate.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Hotlines Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <PhoneCall className="w-4 h-4 text-emerald-500" />
          <span>Davao City Emergency Hotlines (24/7)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {EMERGENCY_HOTLINES.map((hotline, i) => (
            <div key={i} className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{hotline.name}</p>
                <p className="text-[10.5px] text-[var(--text-muted)] truncate">{hotline.desc}</p>
              </div>
              <a
                href={`tel:${hotline.number.replace(/[^\d]/g, '')}`}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-500 hover:text-white font-mono font-bold text-xs transition-all shrink-0 pressable"
              >
                {hotline.number}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
