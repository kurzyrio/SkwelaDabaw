import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  CloudSun, 
  CloudRain, 
  CloudLightning,
  Sun,
  Droplets, 
  Wind, 
  Umbrella, 
  Thermometer, 
  AlertTriangle, 
  ShieldAlert, 
  Info,
  MapPin,
  CalendarDays,
  Clock
} from 'lucide-react';
import { 
  fetchDavaoWeather, 
  WeatherData, 
  HourlyForecastItem, 
  DailyForecastItem 
} from '../../services/weatherService';
import { playEagleSound } from '../../utils/audio';

interface WeatherPageProps {
  onBack?: () => void;
}

export const WeatherPage: React.FC<WeatherPageProps> = ({ onBack }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadWeather = async (force = false) => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await fetchDavaoWeather(force);
      setWeather(data);
    } catch (err) {
      console.warn('Error loading weather data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadWeather(false);
  }, []);

  const handleManualRefresh = () => {
    playEagleSound('chirp');
    loadWeather(true);
  };

  const current = weather?.current;
  const advisory = weather?.advisory;
  const hourly = weather?.hourly || [];
  const daily = weather?.daily || [];

  const getWeatherIcon = (iconKey?: string) => {
    switch (iconKey) {
      case 'cloud-lightning':
        return <CloudLightning className="w-8 h-8 text-[#FF9F0A]" />;
      case 'cloud-rain':
      case 'cloud-drizzle':
        return <CloudRain className="w-8 h-8 text-[#30B0C7]" />;
      case 'cloud':
      case 'cloud-fog':
      case 'cloud-sun':
      case 'cloud-moon':
        return <CloudSun className="w-8 h-8 text-[#FFD60A]" />;
      case 'sun':
      default:
        return <Sun className="w-8 h-8 text-[#FF9F0A]" />;
    }
  };

  const getHeatBadgeClasses = (level?: string) => {
    switch (level) {
      case 'danger':
        return 'bg-[#FF453A]/15 text-[#FF453A] border-[#FF453A]/30';
      case 'warning':
        return 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/30';
      case 'caution':
        return 'bg-[#FFD60A]/15 text-[#FFD60A] border-[#FFD60A]/30';
      default:
        return 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/30';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24 pt-1 animate-page-enter select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to timetable"
              className="p-2 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer pressable"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                Davao City Weather
              </h2>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium">
              Real-time heat index and campus commuter advisory
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isLoading || isRefreshing}
          aria-label="Refresh weather data"
          className="p-2 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer pressable"
          title="Refresh Davao Weather"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
        </button>
      </div>

      {/* Advisory Banner (if active) */}
      {advisory && (
        <div 
          className={`p-4 rounded-3xl border transition-all ${
            advisory.level === 'danger'
              ? 'bg-[#FF453A]/10 border-[#FF453A]/30 text-[var(--text-primary)]'
              : advisory.level === 'warning'
              ? 'bg-[#FF9F0A]/10 border-[#FF9F0A]/30 text-[var(--text-primary)]'
              : 'bg-sky-500/10 border-sky-500/30 text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {advisory.level === 'danger' || advisory.level === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-[#FF9F0A]" />
              ) : (
                <Info className="w-4 h-4 text-sky-400" />
              )}
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <h3 className="text-xs font-bold text-[var(--text-primary)]">
                {advisory.title}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {advisory.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Temperature & Heat Index Inset Card */}
      <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)]">
              Current Temperature
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-5xl font-black tracking-tight text-[var(--text-primary)]">
                {current ? `${Math.round(current.temp)}°` : '--°'}
              </span>
              <span className="text-sm font-bold text-[var(--text-secondary)]">
                {current?.condition || 'Loading...'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)]">
              Heat Index (Init sa Davao)
            </span>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${getHeatBadgeClasses(current?.heatStatus?.level)}`}>
                <Thermometer className="w-3.5 h-3.5" />
                <span>{current ? `${current.heatIndex}°C` : '--'} • {current?.heatStatus?.label || 'Calculating'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 4 Inset Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--card-border)]">
          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-0.5">
            <div className="text-[10px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
              <Droplets className="w-3 h-3 text-sky-400" />
              <span>Humidity</span>
            </div>
            <div className="text-sm font-extrabold text-[var(--text-primary)]">
              {current?.humidity ?? '--'}%
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-0.5">
            <div className="text-[10px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
              <Wind className="w-3 h-3 text-emerald-400" />
              <span>Wind Speed</span>
            </div>
            <div className="text-sm font-extrabold text-[var(--text-primary)]">
              {current?.windSpeed ?? '--'} km/h
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-0.5">
            <div className="text-[10px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
              <Umbrella className="w-3 h-3 text-indigo-400" />
              <span>Rain Chance</span>
            </div>
            <div className="text-sm font-extrabold text-[var(--text-primary)]">
              {hourly[0]?.rainProbability ?? (current?.precipitation ? '100%' : '0%')}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-0.5">
            <div className="text-[10px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-400" />
              <span>Today Max Heat</span>
            </div>
            <div className="text-sm font-extrabold text-[var(--text-primary)]">
              {advisory?.todayHeatMax ?? current?.heatIndex ?? '--'}°C
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Commute Forecast (Next 12 Hours) */}
      {hourly.length > 0 && (
        <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Hourly Commute Outlook</span>
            </h3>
            <span className="text-[10px] font-semibold text-[var(--text-secondary)]">Next 12 Hours</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
            {hourly.slice(0, 12).map((item, idx) => (
              <div 
                key={idx}
                className="flex flex-col items-center justify-between p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] min-w-[78px] shrink-0 text-center space-y-1.5"
              >
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                  {item.hourDisplay}
                </span>
                <span className="text-base font-black text-[var(--text-primary)]">
                  {Math.round(item.temp)}°
                </span>
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-sky-400">
                  <Umbrella className="w-2.5 h-2.5" />
                  <span>{item.rainProbability}%</span>
                </div>
                <span className="text-[9px] font-semibold text-[var(--text-secondary)]">
                  Heat {Math.round(item.heatIndex)}°
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Davao Forecast */}
      {daily.length > 0 && (
        <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-sky-400" />
              <span>7-Day Davao Forecast</span>
            </h3>
            <span className="text-[10px] font-semibold text-[var(--text-secondary)]">Weekly Overview</span>
          </div>

          <div className="space-y-1.5">
            {daily.map((day, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] gap-2 text-xs"
              >
                <div className="w-16">
                  <span className="font-bold text-[var(--text-primary)]">
                    {idx === 0 ? 'Today' : day.shortDay}
                  </span>
                </div>

                <div className="flex-1 truncate text-[11px] font-medium text-[var(--text-secondary)]">
                  {day.condition}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-bold text-sky-400 flex items-center gap-0.5">
                    <Droplets className="w-2.5 h-2.5" />
                    <span>{day.rainProbabilityMax}%</span>
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {Math.round(day.tempMax)}° / <span className="text-[var(--text-secondary)] font-normal">{Math.round(day.tempMin)}°</span>
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${getHeatBadgeClasses(day.heatStatus?.level)}`}>
                    Heat {Math.round(day.heatIndexMax)}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Davao LGU & DepEd Heat Index Class Suspension Policy Guide */}
      <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
        <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
          <span>Davao LGU &amp; DepEd Heat Index Guidelines</span>
        </h3>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          Official DepEd Order No. 037 and Davao CDRRMO guidelines for school and campus class modalities:
        </p>

        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border-l-4 border-l-[#30D158] border border-[var(--card-border)] space-y-0.5">
            <div className="font-bold text-[#30D158]">Below 33°C • Normal &amp; Comfortable</div>
            <div className="text-[10px] text-[var(--text-secondary)]">In-person classes and campus activities proceed normally.</div>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border-l-4 border-l-[#FFD60A] border border-[var(--card-border)] space-y-0.5">
            <div className="font-bold text-[#FFD60A]">33°C to 39°C • Caution</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Fatigue possible with prolonged outdoor exposure. Bring water and stay hydrated.</div>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border-l-4 border-l-[#FF9F0A] border border-[var(--card-border)] space-y-0.5">
            <div className="font-bold text-[#FF9F0A]">40°C to 44°C • Extreme Caution / Heat Warning</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Heat exhaustion likely. Schools and universities may transition to modular distance learning (asynchronous).</div>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border-l-4 border-l-[#FF453A] border border-[var(--card-border)] space-y-0.5">
            <div className="font-bold text-[#FF453A]">45°C and Above • Danger</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Heat stroke imminent with continued exposure. In-person classes automatically suspended.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
