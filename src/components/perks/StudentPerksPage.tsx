import React, { useState } from 'react';
import { 
  Tag, 
  ShieldCheck, 
  Bus, 
  Printer, 
  Laptop, 
  PhoneCall, 
  Check, 
  Search, 
  DollarSign, 
  UtensilsCrossed, 
  MapPin, 
  Percent, 
  FileCheck 
} from 'lucide-react';
import { PageIntroGuide } from '../common/PageIntroGuide';

interface PerkItem {
  id: string;
  title: string;
  category: 'printing' | 'food' | 'tech' | 'transit';
  locationOrBrand: string;
  discountSummary: string;
  requirements: string;
  verified: boolean;
  description: string;
}

const DAVAO_PERKS: PerkItem[] = [
  {
    id: '1',
    title: '20% Student Fare on All Davao Jeepneys & Buses',
    category: 'transit',
    locationOrBrand: 'All Davao PUJs, Modern Jeeps & Mindanao Star/Bachelor Buses',
    discountSummary: '20% off regular fare (e.g. ₱15.00 regular ➔ ₱12.00 student)',
    requirements: 'Valid Student ID / School Registration Card (RA 11314)',
    verified: true,
    description: 'Mandated by Republic Act 11314 (Student Fare Discount Act). Valid all year round, including weekends, sem breaks, summer, and legal holidays.'
  },
  {
    id: '2',
    title: 'San Pedro & Bolton Printing & Binding Belt',
    category: 'printing',
    locationOrBrand: 'San Pedro St. & Bolton St. (Near UIC / City Hall / UM Bolton)',
    discountSummary: '₱1.00 – ₱2.00 per page B&W thesis printing + discounted ring binding',
    requirements: 'Student ID / Bulk printing',
    verified: true,
    description: 'The go-to printing hub for Davao college students. Fast turnaround for thesis hardbound, blueprints, and handouts.'
  },
  {
    id: '3',
    title: 'Jacinto & Roxas Student Meals & Carinderia Belts',
    category: 'food',
    locationOrBrand: 'Jacinto St. & Roxas Night Market (Near AdDU / DDC)',
    discountSummary: '₱50 – ₱75 Complete Student Meal with Rice & Soup',
    requirements: 'Walk-in',
    verified: true,
    description: 'Affordable home-cooked Davao meals (Balbacua, Humba, Pastil, Tuna Panga) within 3 minutes walk of downtown campuses.'
  },
  {
    id: '4',
    title: 'Spotify Premium Student Discount',
    category: 'tech',
    locationOrBrand: 'Spotify Philippines Online',
    discountSummary: '50% off (₱85/mo instead of ₱169/mo)',
    requirements: 'SheerID university verification / School enrollment COR',
    verified: true,
    description: 'Includes full offline music downloads, ad-free listening, and multi-device support.'
  },
  {
    id: '5',
    title: 'GitHub Student Developer Pack',
    category: 'tech',
    locationOrBrand: 'GitHub Education',
    discountSummary: 'Free GitHub Copilot, Canva Pro, domains & $100 DigitalOcean credits',
    requirements: 'School .edu email or enrollment COR upload',
    verified: true,
    description: 'Over $200,000 worth of free developer tools, cloud credits, and IDE subscriptions for IT and Engineering students.'
  },
  {
    id: '6',
    title: 'Apple Education Student Pricing',
    category: 'tech',
    locationOrBrand: 'Apple Store PH & Authorized Resellers (Power Mac Abreeza/SM)',
    discountSummary: 'Up to ₱12,000 off MacBooks & iPads + discounted Apple Pencil',
    requirements: 'Valid Student ID / School Assessment Card',
    verified: true,
    description: 'Official student discounts on Mac and iPad models with education verification at Davao Apple resellers.'
  }
];

export const StudentPerksPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'transit' | 'printing' | 'food' | 'tech'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [regularFareInput, setRegularFareInput] = useState<number>(15.00);
  const studentDiscountedFare = Math.max(10.50, Math.round((regularFareInput * 0.80) * 4) / 4);

  const filteredPerks = DAVAO_PERKS.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.locationOrBrand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4 pb-20 animate-fade-in select-none">
      <PageIntroGuide
        pageKey="perks"
        icon={<Tag className="w-6 h-6 text-white" />}
        title="Student Perks &amp; 20% Fare Rights"
        description="Verified student discounts, thesis printing hubs, and RA 11314 fare discount rights."
        tips={[
          'All students are legally entitled to 20% off public land transit every day of the year.',
          'Report discount refusal to LTFRB Region XI.'
        ]}
      />

      {/* Top Grouped Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] flex items-center justify-center font-bold">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
              Davao Student Perks &amp; Rights
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Verified campus discounts, printing hubs, and 20% transit rights.
            </p>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search printing, meals, tech perks, discounts..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-[var(--input-text)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--card-hover-border)]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Perks', icon: Tag },
              { id: 'transit', label: '20% Transit', icon: Bus },
              { id: 'printing', label: 'Printing', icon: Printer },
              { id: 'food', label: 'Meals', icon: UtensilsCrossed },
              { id: 'tech', label: 'Tech', icon: Laptop },
            ].map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 pressable border ${
                    isSelected
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-bold shadow-xs'
                      : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RA 11314 LEGAL FARE DISCOUNT CARD */}
      <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-md bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)] text-[10px] font-bold uppercase">
              Republic Act 11314
            </span>
            <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">
              Know Your 20% Student Fare Rights in Davao
            </h3>
          </div>
          <ShieldCheck className="w-7 h-7 shrink-0 text-[var(--text-primary)]" />
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          By Philippine law (RA 11314), all Filipino students are entitled to a <strong>20% discount on all public land transit</strong> (Jeepneys, Modern PUVs, and Buses) <strong>every day of the year</strong> — including weekends, sem breaks, and holidays.
        </p>

        {/* Quick Fare Calculator */}
        <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[var(--text-primary)]" />
              <span>20% Student Fare Calculator</span>
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">LTFRB Davao Matrix</span>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[var(--text-secondary)]">Regular Fare (₱)</label>
              <input
                type="number"
                step="0.5"
                value={regularFareInput}
                onChange={(e) => setRegularFareInput(Number(e.target.value))}
                className="w-full p-2 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-[var(--input-text)] font-mono font-bold text-base focus:outline-none focus:border-[var(--card-hover-border)]"
              />
            </div>

            <div className="space-y-1 text-right">
              <label className="text-[10px] font-semibold text-[var(--text-secondary)]">Student Fare (20% Off)</label>
              <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
                ₱{studentDiscountedFare.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Hotline for Refused Discount */}
        <div className="pt-2 border-t border-[var(--card-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-[var(--text-secondary)]">
            Refused student discount or overcharged?
          </span>
          <a
            href="tel:0822973374"
            className="px-4 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center gap-1.5 shadow-sm pressable"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call LTFRB Davao: (082) 297-3374</span>
          </a>
        </div>
      </div>

      {/* PERKS LISTING */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredPerks.map((perk) => (
          <div
            key={perk.id}
            className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] space-y-3 transition-colors pressable"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded-md bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)] text-[10px] font-bold uppercase">
                  {perk.category}
                </span>
                <h4 className="font-bold text-sm text-[var(--text-primary)] leading-snug">
                  {perk.title}
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] text-[10px] font-bold flex items-center gap-1">
                <Check className="w-3 h-3 text-[#30D158]" />
                <span>Verified</span>
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {perk.description}
            </p>

            <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[var(--text-primary)] font-medium">
                <span className="flex items-center gap-1 text-[var(--text-secondary)]"><MapPin className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> Hub / Store:</span>
                <span className="text-[var(--text-primary)] text-right truncate max-w-[200px]">{perk.locationOrBrand}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-primary)] font-bold">
                <span className="flex items-center gap-1 text-[var(--text-secondary)]"><Percent className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Perk:</span>
                <span className="text-right truncate max-w-[200px]">{perk.discountSummary}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)] text-[11px]">
                <span className="flex items-center gap-1"><FileCheck className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> Req:</span>
                <span className="text-right truncate max-w-[200px]">{perk.requirements}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
