import React, { useState, useEffect, useMemo } from 'react';
import { 
  PhoneCall, 
  ShieldAlert, 
  Hospital, 
  Copy, 
  Check, 
  Search, 
  Navigation, 
  MapPin, 
  Timer, 
  Building2, 
  HeartPulse,
  Compass,
  Layers,
  ExternalLink
} from 'lucide-react';
import { EMERGENCY_CONTACTS } from '../../data/emergencyHotlines';
import { 
  DAVAO_POLICE_LOCATIONS, 
  DAVAO_HOSPITAL_LOCATIONS 
} from '../../data/davaoEmergencyLocations';
import { EmergencyLocation, DavaoSector } from '../../types';
import { haversineDistance } from '../../utils/davaoTransitRouter';
import { PageIntroGuide } from '../common/PageIntroGuide';

type DirectoryTabMode = 'police' | 'hospital' | 'hotlines';
type SectorFilter = 'all' | DavaoSector;

export const EmergencyDirectory: React.FC = () => {
  const [activeTabMode, setActiveTabMode] = useState<DirectoryTabMode>('police');
  const [activeSector, setActiveSector] = useState<SectorFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Distress Beacon & Geolocation state
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState<boolean>(false);
  const [distressCopied, setDistressCopied] = useState<boolean>(false);

  // Safe Walk Timer state
  const [walkTimerSeconds, setWalkTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && walkTimerSeconds > 0) {
      interval = setInterval(() => {
        setWalkTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (walkTimerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      alert('Safe Walk Timer finished! Check in with your guardian or friends to let them know you arrived safely.');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, walkTimerSeconds]);

  const handleFetchDistressLocation = () => {
    setGeoLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setGeoCoords(coords);
          setGeoLoading(false);
        },
        (error) => {
          console.warn('Geolocation fallback:', error);
          setGeoCoords({ lat: 7.0707, lng: 125.6087 });
          setGeoLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGeoCoords({ lat: 7.0707, lng: 125.6087 });
      setGeoLoading(false);
    }
  };

  const copyDistressMessage = () => {
    const lat = geoCoords ? geoCoords.lat.toFixed(5) : '7.0707';
    const lng = geoCoords ? geoCoords.lng.toFixed(5) : '125.6087';
    const text = `[SKWELADABAW EMERGENCY DISTRESS ALERT]\nI am currently commuting in Davao City and need assistance.\nLocation: https://maps.google.com/?q=${lat},${lng}\nTime: ${new Date().toLocaleTimeString()}\nPlease call Davao Central 911 if I am unreachable!`;
    navigator.clipboard.writeText(text);
    setDistressCopied(true);
    setTimeout(() => setDistressCopied(false), 2500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startWalkTimer = (minutes: number) => {
    setWalkTimerSeconds(minutes * 60);
    setIsTimerRunning(true);
  };

  // Helper to compute distance in km
  const getDistanceKm = (targetLat: number, targetLng: number): number | null => {
    if (!geoCoords) return null;
    const meters = haversineDistance(geoCoords.lat, geoCoords.lng, targetLat, targetLng);
    return Math.round((meters / 1000) * 10) / 10;
  };

  // Filtered & Distance-Sorted Police Facilities
  const filteredPolice = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = DAVAO_POLICE_LOCATIONS.filter((loc) => {
      if (activeSector !== 'all' && loc.sector !== activeSector) return false;
      if (!q) return true;
      return (
        loc.name.toLowerCase().includes(q) ||
        (loc.stationCode && loc.stationCode.toLowerCase().includes(q)) ||
        loc.address.toLowerCase().includes(q) ||
        loc.area.toLowerCase().includes(q) ||
        loc.nearestLandmark.toLowerCase().includes(q) ||
        loc.servicesOrCoverage.toLowerCase().includes(q)
      );
    });

    if (geoCoords) {
      list = [...list].sort((a, b) => {
        const distA = haversineDistance(geoCoords.lat, geoCoords.lng, a.lat, a.lng);
        const distB = haversineDistance(geoCoords.lat, geoCoords.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    return list;
  }, [searchQuery, activeSector, geoCoords]);

  // Filtered & Distance-Sorted Hospital Facilities
  const filteredHospitals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = DAVAO_HOSPITAL_LOCATIONS.filter((loc) => {
      if (activeSector !== 'all' && loc.sector !== activeSector) return false;
      if (!q) return true;
      return (
        loc.name.toLowerCase().includes(q) ||
        (loc.stationCode && loc.stationCode.toLowerCase().includes(q)) ||
        loc.address.toLowerCase().includes(q) ||
        loc.area.toLowerCase().includes(q) ||
        loc.nearestLandmark.toLowerCase().includes(q) ||
        loc.servicesOrCoverage.toLowerCase().includes(q) ||
        loc.typeLabel.toLowerCase().includes(q)
      );
    });

    if (geoCoords) {
      list = [...list].sort((a, b) => {
        const distA = haversineDistance(geoCoords.lat, geoCoords.lng, a.lat, a.lng);
        const distB = haversineDistance(geoCoords.lat, geoCoords.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    return list;
  }, [searchQuery, activeSector, geoCoords]);

  // Filtered Hotlines
  const filteredHotlines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return EMERGENCY_CONTACTS;
    return EMERGENCY_CONTACTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.agency.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4 pb-20 md:pb-8 animate-fade-in select-none">
      <PageIntroGuide
        pageKey="emergency"
        icon={<ShieldAlert className="w-6 h-6 text-[#FF453A]" />}
        title="Davao City Emergency &amp; Medical Directory"
        description="Comprehensive city-wide directory of all 34 DCPO police stations and 36 public/private hospitals with GPS proximity routing."
        tips={[
          'Tap "Get Location" to sort stations and hospitals by nearest distance to you.',
          'Tap "Navigate" for instant turn-by-turn Google Maps routing.'
        ]}
      />

      {/* 1-TAP NIGHT COMMUTE DISTRESS BEACON CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--nested-bg)] text-[#FF453A] border border-[var(--nested-border)]">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Night Commute Distress Beacon</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Student Emergency Shield
            </h2>
            <p className="text-xs text-[var(--text-secondary)] max-w-lg">
              Commuting late or in distress? Fetch your live GPS coordinates, copy distress SMS, or dial Central 911 directly.
            </p>
          </div>

          <a
            href="tel:911"
            className="px-5 py-3 rounded-full text-xs font-bold bg-[#FF453A] text-white flex items-center justify-center gap-2 shrink-0 pressable shadow-sm"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call 911 Direct</span>
          </a>
        </div>

        {/* GPS Location & Distress Action Grid */}
        <div className="pt-3 border-t border-[var(--card-border)] grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* GPS Coordinates Fetcher */}
          <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                <span>Live GPS Proximity</span>
              </span>
              <button
                type="button"
                onClick={handleFetchDistressLocation}
                disabled={geoLoading}
                className="px-3 py-1 rounded-full bg-[var(--card-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] text-[11px] font-semibold hover:opacity-90 pressable"
              >
                {geoLoading ? 'Acquiring...' : geoCoords ? 'Refresh GPS' : 'Get Location'}
              </button>
            </div>

            {geoCoords ? (
              <div className="space-y-2">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>GPS Active: {geoCoords.lat.toFixed(4)}, {geoCoords.lng.toFixed(4)} (Davao City)</span>
                </div>
                <button
                  type="button"
                  onClick={copyDistressMessage}
                  className="w-full py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-xs pressable flex items-center justify-center gap-1.5"
                >
                  {distressCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{distressCopied ? 'Distress Message Copied!' : 'Copy Distress SMS Text'}</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">
                Tap "Get Location" to calculate nearest police stations &amp; hospitals to your exact spot.
              </p>
            )}
          </div>

          {/* Safe Walk Timer */}
          <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                <span>Safe Walk Check-in Timer</span>
              </span>
              {isTimerRunning && (
                <span className="text-xs font-bold font-mono text-[#FF9F0A]">
                  {Math.floor(walkTimerSeconds / 60)}:{(walkTimerSeconds % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Set a safety countdown for your walk from campus to terminal:
            </p>

            <div className="flex items-center gap-2">
              {[10, 20, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => startWalkTimer(mins)}
                  className="flex-1 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] text-xs font-semibold hover:opacity-90 pressable"
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TOP VIEW MODE SWITCHER (Police, Hospitals, Hotlines) */}
      <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)]">
        <button
          type="button"
          onClick={() => setActiveTabMode('police')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 pressable ${
            activeTabMode === 'police'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Police Stations</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">33</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode('hospital')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 pressable ${
            activeTabMode === 'hospital'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Hospital className="w-3.5 h-3.5" />
          <span>Hospitals &amp; ER</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">36</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode('hotlines')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 pressable ${
            activeTabMode === 'hotlines'
              ? 'bg-[var(--text-primary)] text-[var(--card-bg)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Hotlines</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">911</span>
        </button>
      </div>

      {/* SEARCH BAR & SECTOR FILTER */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTabMode === 'police'
                ? "Search police stations (e.g. 'PS2', 'Talomo', 'San Pedro', 'Toril')..."
                : activeTabMode === 'hospital'
                ? "Search hospitals (e.g. 'SPMC', 'Davao Doctors', 'San Pedro', 'Calinan')..."
                : "Search emergency hotlines (e.g. '911', 'Red Cross', 'CDRRMO')..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--card-hover-border)]"
          />
        </div>

        {/* Sector Filter Chips for Police & Hospitals */}
        {activeTabMode !== 'hotlines' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All Sectors' },
              { id: 'Poblacion / Downtown', label: 'Downtown / Poblacion' },
              { id: 'South Davao (Talomo / Toril)', label: 'South (Talomo / Toril)' },
              { id: 'North Davao (Buhangin / Bunawan)', label: 'North (Buhangin / Bunawan)' },
              { id: 'West Davao (Tugbok / Calinan / Marilog)', label: 'West (Mintal / Calinan / Marilog)' }
            ].map((sector) => (
              <button
                key={sector.id}
                type="button"
                onClick={() => setActiveSector(sector.id as SectorFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 pressable ${
                  activeSector === sector.id
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-bold shadow-xs'
                    : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)] hover:text-[var(--text-primary)]'
                }`}
              >
                {sector.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── SECTION 1: POLICE STATIONS DIRECTORY ─────────────────────────── */}
      {activeTabMode === 'police' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
            <span className="font-semibold">
              Showing {filteredPolice.length} Police Stations &amp; Security Outposts
            </span>
            {geoCoords && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Compass className="w-3 h-3" />
                <span>Sorted by Nearest Distance</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPolice.map((loc, idx) => {
              const dist = getDistanceKm(loc.lat, loc.lng);
              const isNearest = idx === 0 && Boolean(geoCoords);

              return (
                <div
                  key={loc.id}
                  className={`p-4 rounded-2xl bg-[var(--card-bg)] border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                    isNearest 
                      ? 'border-blue-500/60 ring-1 ring-blue-500/30' 
                      : 'border-[var(--card-border)] hover:border-[var(--card-hover-border)]'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-[10px]">
                          {loc.stationCode || 'DCPO'}
                        </span>
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                          {loc.area}
                        </span>
                      </div>

                      {dist !== null && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isNearest 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)]'
                        }`}>
                          <Navigation className="w-2.5 h-2.5" />
                          <span>{dist} km {isNearest ? '• Nearest' : 'away'}</span>
                        </span>
                      )}
                    </div>

                    {/* Facility Title */}
                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)] leading-snug">
                        {loc.name}
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1 pt-0.5">
                        <MapPin className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                        <span>{loc.address}</span>
                      </p>
                    </div>

                    {/* Coverage & Services */}
                    <div className="p-2 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      <span className="font-semibold text-[var(--text-primary)]">Jurisdiction: </span>
                      <span>{loc.servicesOrCoverage}</span>
                    </div>

                    {/* Primary Contact Numbers */}
                    <div className="text-xs font-mono text-[var(--text-primary)] font-semibold flex items-center gap-2 pt-0.5">
                      <span>{loc.phonePrimary}</span>
                      {loc.mobile && (
                        <>
                          <span className="text-[var(--text-secondary)]">•</span>
                          <span className="text-[var(--text-secondary)]">{loc.mobile}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[var(--card-border)] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(loc.address, loc.id)}
                      className="py-1.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 pressable"
                    >
                      {copiedId === loc.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === loc.id ? 'Copied' : 'Address'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] hover:border-blue-500 text-xs font-bold flex items-center gap-1.5 pressable transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5 text-blue-500" />
                        <span>Navigate</span>
                      </a>

                      <a
                        href={`tel:${loc.phonePrimary}`}
                        className="py-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 pressable"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SECTION 2: HOSPITALS & MEDICAL CENTERS DIRECTORY ─────────────── */}
      {activeTabMode === 'hospital' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
            <span className="font-semibold">
              Showing {filteredHospitals.length} DOH-Licensed Hospitals &amp; Medical Centers
            </span>
            {geoCoords && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Compass className="w-3 h-3" />
                <span>Sorted by Nearest Distance</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredHospitals.map((loc, idx) => {
              const dist = getDistanceKm(loc.lat, loc.lng);
              const isNearest = idx === 0 && Boolean(geoCoords);

              return (
                <div
                  key={loc.id}
                  className={`p-4 rounded-2xl bg-[var(--card-bg)] border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                    isNearest 
                      ? 'border-rose-500/60 ring-1 ring-rose-500/30' 
                      : 'border-[var(--card-border)] hover:border-[var(--card-hover-border)]'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                          loc.isApex
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                          {loc.stationCode || 'Hospital'}
                        </span>
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                          {loc.area}
                        </span>
                      </div>

                      {dist !== null && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isNearest 
                            ? 'bg-rose-600 text-white' 
                            : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)]'
                        }`}>
                          <Navigation className="w-2.5 h-2.5" />
                          <span>{dist} km {isNearest ? '• Nearest ER' : 'away'}</span>
                        </span>
                      )}
                    </div>

                    {/* Hospital Name & Classification */}
                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)] leading-snug">
                        {loc.name}
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1 pt-0.5">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                        <span>{loc.address}</span>
                      </p>
                    </div>

                    {/* Services & Classification Badge */}
                    <div className="p-2 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] space-y-1 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                        {loc.typeLabel}
                      </div>
                      <p>{loc.servicesOrCoverage}</p>
                    </div>

                    {/* Contact Numbers */}
                    <div className="text-xs font-mono text-[var(--text-primary)] font-semibold flex items-center gap-2 pt-0.5">
                      <span>{loc.phonePrimary}</span>
                      {loc.phoneAlt && (
                        <>
                          <span className="text-[var(--text-secondary)]">•</span>
                          <span className="text-[var(--text-secondary)]">{loc.phoneAlt}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[var(--card-border)] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(loc.address, loc.id)}
                      className="py-1.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 pressable"
                    >
                      {copiedId === loc.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === loc.id ? 'Copied' : 'Address'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] hover:border-rose-500 text-xs font-bold flex items-center gap-1.5 pressable transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5 text-rose-500" />
                        <span>Navigate</span>
                      </a>

                      <a
                        href={`tel:${loc.phonePrimary}`}
                        className="py-1.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 pressable"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Call ER</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SECTION 3: EMERGENCY HOTLINES ─────────────────────────────────── */}
      {activeTabMode === 'hotlines' && (
        <div className="space-y-2.5">
          <div className="text-xs text-[var(--text-secondary)] px-1 font-semibold">
            Showing {filteredHotlines.length} Direct Emergency Hotlines &amp; Utilities
          </div>

          {filteredHotlines.map((contact) => (
            <div
              key={contact.id}
              className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] transition-all flex items-start justify-between gap-3 pressable shadow-xs"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)]">
                    {contact.agency}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {contact.name}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                  {contact.description}
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] pt-0.5">
                  <span>{contact.phoneNumber}</span>
                  {contact.altPhone && (
                    <>
                      <span>•</span>
                      <span>{contact.altPhone}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(contact.phoneNumber, contact.id)}
                  className="p-2 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Copy Number"
                >
                  {copiedId === contact.id ? <Check className="w-4 h-4 text-[#30D158]" /> : <Copy className="w-4 h-4" />}
                </button>

                <a
                  href={`tel:${contact.phoneNumber}`}
                  className="px-3.5 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-xs flex items-center gap-1.5 pressable"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
