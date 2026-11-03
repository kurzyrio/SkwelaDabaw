/**
 * SkwelaDabaw — Davao City Weather & Commuter Advisory Service
 * 
 * Fetches centralized, cached Davao City weather data and evaluates
 * commuter-specific heat index and rain threshold alerts.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { scheduleWeatherNotification, WEATHER_HEAT_NOTIFICATION_ID, WEATHER_RAIN_NOTIFICATION_ID } from './notificationService';

export interface HeatStatus {
  level: 'normal' | 'caution' | 'warning' | 'danger';
  label: string;
  color: string;
  advisory: string;
}

export interface CurrentWeather {
  temp: number;
  heatIndex: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  condition: string;
  icon: string;
  isDay: number;
  heatStatus: HeatStatus;
}

export interface WeatherAdvisory {
  hasAlert: boolean;
  level: 'info' | 'caution' | 'warning' | 'danger';
  title: string;
  message: string;
  isRainImminent: boolean;
  isHeatWarning: boolean;
  todayHeatMax: number;
  maxUpcomingRainProb: number;
}

export interface HourlyForecastItem {
  time: string;
  hourDisplay: string;
  temp: number;
  heatIndex: number;
  rainProbability: number;
  precipitation: number;
  weatherCode: number;
  condition: string;
  icon: string;
}

export interface DailyForecastItem {
  date: string;
  dayName: string;
  shortDay: string;
  tempMax: number;
  tempMin: number;
  heatIndexMax: number;
  rainProbabilityMax: number;
  precipitationSum: number;
  uvIndexMax: number;
  weatherCode: number;
  condition: string;
  icon: string;
  heatStatus: HeatStatus;
}

export interface WeatherData {
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  current: CurrentWeather;
  advisory: WeatherAdvisory;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  updatedAt: string;
  cachedAt: string;
  expiresAt: string;
}

const WEATHER_CACHE_KEY = 'skweladabaw_weather_cache';
const WEATHER_CACHE_TIME_KEY = 'skweladabaw_weather_cache_time';
const WEATHER_HEAT_ALERT_SENT_KEY = 'skweladabaw_weather_heat_alert_sent';
const WEATHER_RAIN_ALERT_SENT_KEY = 'skweladabaw_weather_rain_alert_sent';
export const WEATHER_ALERTS_TOGGLE_KEY = 'skweladabaw_weather_alerts_enabled';

// Safe default fallback data
const DEFAULT_FALLBACK_WEATHER: WeatherData = {
  city: 'Davao City',
  coordinates: { latitude: 7.0731, longitude: 125.6128 },
  current: {
    temp: 30.5,
    heatIndex: 36.2,
    humidity: 72,
    precipitation: 0.0,
    windSpeed: 6.5,
    weatherCode: 2,
    condition: 'Partly Cloudy',
    icon: 'cloud-sun',
    isDay: 1,
    heatStatus: {
      level: 'caution',
      label: 'Caution',
      color: '#FFCC00',
      advisory: 'Warm temperatures typical of Davao. Drink plenty of water.'
    }
  },
  advisory: {
    hasAlert: false,
    level: 'caution',
    title: 'Davao Commuter Advisory',
    message: 'Stay hydrated during your campus commute.',
    isRainImminent: false,
    isHeatWarning: false,
    todayHeatMax: 37.0,
    maxUpcomingRainProb: 20
  },
  hourly: [],
  daily: [],
  updatedAt: new Date().toISOString(),
  cachedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 900000).toISOString()
};

/**
 * Fetch real-time Davao weather from the SkwelaDabaw server endpoint with local fallback
 */
export async function fetchDavaoWeather(forceRefresh = false): Promise<WeatherData> {
  const now = Date.now();
  const cachedTime = Number(localStorage.getItem(WEATHER_CACHE_TIME_KEY)) || 0;
  const cachedDataStr = localStorage.getItem(WEATHER_CACHE_KEY);

  // Return local storage cache if within 10 minutes and not forcing refresh
  if (!forceRefresh && cachedDataStr && now - cachedTime < 10 * 60 * 1000) {
    try {
      const parsed = JSON.parse(cachedDataStr);
      return parsed;
    } catch (_) {}
  }

  const endpoint = 'https://skweladabaw.kurzyrio.site/api/weather.php';

  try {
    let rawData: any = null;

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({
        url: `${endpoint}?_t=${now}`,
        headers: { 'Accept': 'application/json' },
        connectTimeout: 7000,
        readTimeout: 7000
      });

      if (response.status === 200 && response.data) {
        rawData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      }
    } else {
      const res = await fetch(`${endpoint}?_t=${now}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache'
      });
      if (res.ok) {
        rawData = await res.json();
      }
    }

    if (rawData && rawData.current) {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(rawData));
      localStorage.setItem(WEATHER_CACHE_TIME_KEY, String(now));
      
      // Evaluate notification thresholds asynchronously
      checkAndTriggerWeatherAdvisories(rawData).catch(console.warn);

      return rawData as WeatherData;
    }
  } catch (err) {
    console.warn('Weather fetch from primary server failed, checking cache:', err);
  }

  // Fall back to existing cached data if network failed
  if (cachedDataStr) {
    try {
      return JSON.parse(cachedDataStr);
    } catch (_) {}
  }

  return DEFAULT_FALLBACK_WEATHER;
}

/**
 * Evaluates weather conditions against official Davao LGU / DepEd thresholds
 * and schedules once-per-day notifications to prevent notification fatigue.
 */
export async function checkAndTriggerWeatherAdvisories(data: WeatherData): Promise<void> {
  // Check if student enabled weather alerts (default is true)
  const isEnabled = localStorage.getItem(WEATHER_ALERTS_TOGGLE_KEY) !== 'false';
  if (!isEnabled) return;

  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const currentHour = new Date().getHours();

  // 1. Extreme Heat Alert (Heat Index >= 40°C)
  // Evaluated around 9:30 AM to 1:00 PM before peak afternoon heat
  const peakHeat = data.advisory.todayHeatMax || data.current.heatIndex;
  const lastHeatAlertDate = localStorage.getItem(WEATHER_HEAT_ALERT_SENT_KEY);

  if (peakHeat >= 40.0 && lastHeatAlertDate !== todayStr && currentHour >= 9 && currentHour <= 15) {
    localStorage.setItem(WEATHER_HEAT_ALERT_SENT_KEY, todayStr);
    await scheduleWeatherNotification(
      WEATHER_HEAT_NOTIFICATION_ID,
      `☀️ Davao Heat Alert: ${peakHeat}°C Heat Index`,
      `Extreme heat forecast today in Davao. Stay hydrated, avoid long sun exposure, and monitor potential campus modular shift updates.`
    );
  }

  // 2. Commuter Rain Alert (Imminent afternoon rain or probability >= 65%)
  // Evaluated around 1:00 PM to 5:30 PM dismissal hours
  const lastRainAlertDate = localStorage.getItem(WEATHER_RAIN_ALERT_SENT_KEY);

  if (
    (data.advisory.isRainImminent || data.advisory.maxUpcomingRainProb >= 65) &&
    lastRainAlertDate !== todayStr &&
    currentHour >= 12 &&
    currentHour <= 18
  ) {
    localStorage.setItem(WEATHER_RAIN_ALERT_SENT_KEY, todayStr);
    await scheduleWeatherNotification(
      WEATHER_RAIN_NOTIFICATION_ID,
      '🌧️ Commute Rain Alert: Thunderstorms Expected',
      'Afternoon rain expected across Davao City. Pack an umbrella and expect jeepney congestion along Bajada & Roxas.'
    );
  }
}
