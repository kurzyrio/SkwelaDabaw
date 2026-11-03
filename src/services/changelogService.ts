/**
 * Live Changelog Service
 * Synchronizes release notes from web server and local baseline data.
 */

import { CHANGELOG_DATA, ChangelogRelease } from '../data/changelogData';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const CACHE_KEY = 'skweladabaw_live_changelogs';
const CHANGELOG_URL = 'https://skweladabaw.kurzyrio.site/assets/changelog.json';

/**
 * Fetch cached changelog or fall back to default data
 */
export const getCachedChangelogs = (): ChangelogRelease[] => {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached changelog:', e);
  }
  return CHANGELOG_DATA;
};

/**
 * Fetch latest changelogs from web server
 */
export const fetchWebChangelogs = async (): Promise<ChangelogRelease[]> => {
  try {
    let rawText = '';
    if (Capacitor.isNativePlatform()) {
      const resp = await CapacitorHttp.get({
        url: `${CHANGELOG_URL}?t=${Date.now()}`,
        connectTimeout: 5000,
        readTimeout: 5000
      });
      if (resp.status >= 200 && resp.status < 300 && resp.data) {
        rawText = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
      }
    } else {
      const resp = await fetch(`${CHANGELOG_URL}?t=${Date.now()}`);
      if (resp.ok) {
        rawText = await resp.text();
      }
    }

    if (rawText) {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Web changelog fetch note:', err);
  }

  return getCachedChangelogs();
};

/**
 * Subscribe to live changelog updates
 */
export const subscribeLiveChangelogs = (
  onUpdate: (releases: ChangelogRelease[]) => void
): (() => void) => {
  // Deliver cached/local immediately
  onUpdate(getCachedChangelogs());

  // Fetch from web
  fetchWebChangelogs().then((releases) => {
    onUpdate(releases);
  }).catch(() => {});

  return () => {};
};
