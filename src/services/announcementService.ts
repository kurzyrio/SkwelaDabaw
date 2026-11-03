/**
 * SkwelaDabaw Announcement Service
 * 
 * Fetches on-launch popup announcements and emergency bulletins from MySQL API.
 * Handles 24-hour snooze persistence and direct Base64 image payload handling.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { DavaoAnnouncement } from '../data/davaoAnnouncements';
import { getFirebaseIdToken } from './cloudSyncService';

export interface PopupAnnouncement {
  id: number;
  title: string;
  content: string;
  imageData?: string | null;
  actionText?: string | null;
  actionUrl?: string | null;
  category?: 'general' | 'relief' | 'suspension' | 'urgent' | 'event' | string;
  priority?: 'normal' | 'high' | 'urgent' | string;
  authorName?: string;
  createdAt?: string;
  expiresAt?: string | null;
}

const ANNOUNCEMENT_ENDPOINTS = [
  'https://skweladabaw.kurzyrio.site/api/announcements.php?type=popup',
  'https://skweladabaw.kurzyrio.site/api/proxy.php?action=announcements&type=popup'
];

/**
 * Fetch the latest active on-launch popup announcement
 */
export async function fetchActivePopupAnnouncement(): Promise<PopupAnnouncement | null> {
  const cacheBuster = `&t=${Date.now()}`;

  for (const endpoint of ANNOUNCEMENT_ENDPOINTS) {
    const url = `${endpoint}${cacheBuster}`;

    try {
      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.get({
          url,
          headers: {
            'Accept': 'application/json'
          },
          connectTimeout: 8000,
          readTimeout: 8000
        });

        if (response.status === 200 && response.data) {
          const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
          if (body && body.success && body.hasPopup && body.popup) {
            return body.popup as PopupAnnouncement;
          }
          return null;
        }
      } else {
        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-store'
        });

        if (response.ok) {
          const body = await response.json();
          if (body && body.success && body.hasPopup && body.popup) {
            return body.popup as PopupAnnouncement;
          }
          return null;
        }
      }
    } catch (err) {
      console.warn('Popup announcement check error:', err);
    }
  }

  return null;
}

/**
 * Check if the announcement was snoozed or dismissed today (within 24 hours)
 */
export function isAnnouncementSnoozed(id: number): boolean {
  try {
    const snoozedUntilStr = localStorage.getItem(`skwela_popup_snoozed_${id}`);
    if (!snoozedUntilStr) return false;
    const snoozedUntil = parseInt(snoozedUntilStr, 10);
    return Date.now() < snoozedUntil;
  } catch {
    return false;
  }
}

/**
 * Snooze an announcement for a designated period (default: 24 hours)
 */
export function snoozeAnnouncement(id: number, hours: number = 24): void {
  try {
    const until = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem(`skwela_popup_snoozed_${id}`, until.toString());
  } catch {
    // ignore
  }
}

/**
 * Mark announcement dismissed for current session/day
 */
export function dismissAnnouncement(id: number): void {
  // Dismiss for 12 hours by default on simple close
  snoozeAnnouncement(id, 12);
}

/**
 * Fetch all active campus bulletin announcements from MySQL
 */
export async function fetchAllAnnouncements(campusId?: string): Promise<DavaoAnnouncement[]> {
  const url = `https://skweladabaw.kurzyrio.site/api/announcements.php?campus_id=${encodeURIComponent(campusId || 'all')}&limit=50&t=${Date.now()}`;

  try {
    let rows: any[] = [];
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({
        url,
        headers: { 'Accept': 'application/json' },
        connectTimeout: 8000,
        readTimeout: 8000
      });
      if (response.status === 200 && response.data) {
        const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (body && body.success && Array.isArray(body.announcements)) {
          rows = body.announcements;
        }
      }
    } else {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        const body = await response.json();
        if (body && body.success && Array.isArray(body.announcements)) {
          rows = body.announcements;
        }
      }
    }

    if (rows.length > 0) {
      return rows.map((r): DavaoAnnouncement => {
        let urgency: 'high' | 'normal' | 'info' = 'normal';
        if (r.priority === 'emergency' || r.priority === 'urgent') urgency = 'high';
        else if (r.category === 'scholarship') urgency = 'info';

        return {
          id: `cloud-${r.id}`,
          title: r.title,
          category: r.category || 'campus',
          source: r.authorName || 'SkwelaDabaw Admin',
          sourceAvatar: '📢',
          targetCampus: r.campusId || 'all',
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
          urgency,
          summary: r.content,
          fullContent: r.content,
          tags: [r.category || 'Official', r.campusId && r.campusId !== 'all' ? r.campusId : 'Davao'],
          imageData: r.imageData || undefined,
          isPopup: Boolean(r.isPopup),
          externalLink: r.actionUrl || undefined,
          isPinned: Boolean(r.isPopup || r.priority === 'emergency')
        };
      });
    }
  } catch (err) {
    console.warn('Failed to fetch announcements from cloud:', err);
  }

  return [];
}

/**
 * Upload announcement poster image in resilient chunks to bypass server buffer limits
 */
export async function uploadAnnouncementPoster(
  rawBase64: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  let b64 = rawBase64;
  if (b64.includes('base64,')) {
    b64 = b64.split('base64,')[1];
  }
  b64 = b64.replace(/\s/g, '');

  const CHUNK_SIZE = 9500;
  const totalChunks = Math.ceil(b64.length / CHUNK_SIZE);
  const uploadId = 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const apiUrl = 'https://skweladabaw.kurzyrio.site/api/upload_announcement_media.php';
  const token = await getFirebaseIdToken();

  let finalUrl = '';

  for (let i = 0; i < totalChunks; i++) {
    const chunk = b64.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const payload = {
      uploadId,
      chunkIndex: i,
      totalChunks,
      chunk,
      token: token || undefined,
      user_email: 'support@kurzyrio.site',
    };

    let resData: any = null;

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: apiUrl,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        data: payload,
        connectTimeout: 10000,
        readTimeout: 10000,
      });
      resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });
      resData = await response.json();
    }

    if (!resData || !resData.success) {
      throw new Error(resData?.error || 'Failed to upload announcement poster chunk.');
    }

    if (resData.url) {
      finalUrl = resData.url;
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  if (!finalUrl) {
    throw new Error('Upload completed but server returned no URL');
  }

  return finalUrl;
}

/**
 * Publish a new campus announcement to MySQL
 */
export async function publishAnnouncement(data: {
  title: string;
  content: string;
  category: string;
  priority?: string;
  imageData?: string | null;
  isPopup?: boolean;
  campusId?: string;
  authorName?: string;
  actionText?: string;
  actionUrl?: string;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  // If imageData is a base64 string, upload it in chunks to avoid server 16KB FastCGI buffer limit
  if (data.imageData && typeof data.imageData === 'string' && data.imageData.startsWith('data:image/')) {
    try {
      const publicUrl = await uploadAnnouncementPoster(data.imageData);
      data.imageData = publicUrl;
    } catch (err: any) {
      console.warn('Chunked poster upload fallback:', err);
    }
  }

  const url = 'https://skweladabaw.kurzyrio.site/api/announcements.php';
  const token = await getFirebaseIdToken();

  const payload = {
    ...data,
    token: token || undefined,
    idToken: token || undefined,
  };

  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        data: payload,
        connectTimeout: 15000,
        readTimeout: 15000
      });

      const resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      if (response.status === 200 && resData && resData.success) {
        return { success: true, id: resData.id };
      }
      return { success: false, error: resData?.error || `Server HTTP ${response.status}` };
    } else {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (response.ok && resData && resData.success) {
        return { success: true, id: resData.id };
      }
      return { success: false, error: resData?.error || `Server HTTP ${response.status}` };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}
