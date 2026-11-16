/**
 * SkwelaDabaw — 100% MySQL Community Chat Service
 * 
 * Directly connected to MySQL backend on https://skweladabaw.kurzyrio.site/api/chat.php
 * Authenticated via Google Firebase Auth tokens.
 * Offline-first with local cache and background polling for real-time messages.
 */

import { getFirebaseIdToken } from './cloudSyncService';
import { ChatMessage, ChatChannel } from '../types';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { compressImageForChat } from '../utils/imageCompressor';

const CHAT_API_URL = 'https://skweladabaw.kurzyrio.site/api/chat.php';
const FEEDBACK_API_URL = 'https://skweladabaw.kurzyrio.site/api/feedback.php';
const DEFAULT_HTTP_TIMEOUT_MS = 8000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_HTTP_TIMEOUT_MS
): Promise<Response> {
  if (typeof AbortController === 'undefined') {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const INITIAL_CHANNEL_MESSAGES: Record<string, ChatMessage[]> = {};

/**
 * Fetch dynamic channels directly from MySQL chat_channels table
 */
export async function fetchChannelsFromMySQL(): Promise<ChatChannel[]> {
  try {
    const url = `${CHAT_API_URL}?action=channels&t=${Date.now()}`;
    let rawData: any = null;

    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({
        url,
        headers: { 'Accept': 'application/json' },
        connectTimeout: 6000,
        readTimeout: 6000
      });
      if (res.status === 200 && res.data) {
        rawData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      }
    } else {
      const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, 6000);
      if (res.ok) {
        rawData = await res.json();
      }
    }

    if (rawData && rawData.success && Array.isArray(rawData.channels) && rawData.channels.length > 0) {
      return rawData.channels;
    }
  } catch (err) {
    console.warn('MySQL channel fetch notice:', err);
  }
  return [];
}

const OFFLINE_QUEUE_KEY = 'skweladabaw_offline_chat_queue';

export const getOfflineQueue = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineQueue = (queue: ChatMessage[]): void => {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline chat queue:', err);
  }
};

const CHAT_CACHE_KEY_PREFIX = 'skweladabaw_chat_cache_';

export const getCachedChannelMessages = (channelId: string): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(`${CHAT_CACHE_KEY_PREFIX}${channelId}`);
    return raw ? JSON.parse(raw) : (INITIAL_CHANNEL_MESSAGES[channelId] || []);
  } catch {
    return INITIAL_CHANNEL_MESSAGES[channelId] || [];
  }
};

export const setCachedChannelMessages = (channelId: string, messages: ChatMessage[]): void => {
  try {
    localStorage.setItem(`${CHAT_CACHE_KEY_PREFIX}${channelId}`, JSON.stringify(messages.slice(-100)));
  } catch (err) {
    console.warn('Failed to cache channel messages:', err);
  }
};

/**
 * Fetch messages for a channel directly from MySQL
 */
export async function fetchMessagesFromMySQL(
  channelId: string,
  currentUserIdOrName?: string
): Promise<ChatMessage[]> {
  try {
    const url = `${CHAT_API_URL}?channel=${encodeURIComponent(channelId)}&limit=80&t=${Date.now()}`;
    let rawData: any = null;

    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({
        url,
        headers: { 'Accept': 'application/json' },
        connectTimeout: 6000,
        readTimeout: 6000
      });
      if (res.status === 200 && res.data) {
        rawData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      }
    } else {
      const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, 6000);
      if (res.ok) {
        rawData = await res.json();
      }
    }

    if (rawData && rawData.success && Array.isArray(rawData.messages)) {
      const formatted: ChatMessage[] = rawData.messages.map((m: any) => ({
        id: String(m.id),
        channelId: m.channelId || channelId,
        senderUid: m.senderUid || '',
        senderUsername: m.senderUsername || '',
        senderName: m.senderName || 'Student',
        senderSchool: m.senderSchool || 'Davao Student',
        senderRole: m.senderRole || 'student',
        senderAvatar: m.senderAvatar || '🎓',
        content: m.content || '',
        timestamp: m.timestamp || '',
        createdMillis: Number(m.createdMillis) || (m.createdAt ? new Date(m.createdAt).getTime() : Date.now()),
        isOwn: Boolean(currentUserIdOrName && m.senderUid && m.senderUid === currentUserIdOrName),
        isVerified: Boolean(m.isVerified),
        presetTag: m.presetTag || '',
        customTag: m.customTag || '',
        customTagBg: m.customTagBg || '#f59e0b',
        customTagColor: m.customTagColor || '#000000',
        messageType: m.messageType || m.message_type || 'text',
        mediaUrl: m.mediaUrl || m.media_url || undefined,
        payloadJson: m.payloadJson || m.payload_json || undefined,
        replyToId: m.replyToId || m.reply_to_id || undefined
      })).sort((a: ChatMessage, b: ChatMessage) => (a.createdMillis || 0) - (b.createdMillis || 0));

      setCachedChannelMessages(channelId, formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('MySQL chat fetch notice:', err);
  }

  return getCachedChannelMessages(channelId);
}

/**
 * Subscribe to live channel messages directly from MySQL with periodic sync
 */
export const subscribeToChannel = (
  channelId: string, 
  onMessages: (messages: ChatMessage[]) => void,
  currentUserIdOrName?: string
) => {
  let isCancelled = false;
  let isPolling = false;

  // 1. Deliver cached messages immediately (0ms)
  const cached = getCachedChannelMessages(channelId);
  if (cached.length > 0) {
    onMessages(cached);
  }

  // 2. Fetch fresh messages from MySQL with visibility & in-flight mutex
  const poll = async () => {
    if (isCancelled || isPolling) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    isPolling = true;
    try {
      const fresh = await fetchMessagesFromMySQL(channelId, currentUserIdOrName);
      if (!isCancelled && fresh) {
        // Merge any pending offline queue messages for this channel so they don't vanish
        const pendingQueue = getOfflineQueue().filter(q => q.channelId === channelId);
        const combined = [...fresh];
        for (const q of pendingQueue) {
          if (!combined.some(m => m.id === q.id)) {
            combined.push(q);
          }
        }
        combined.sort((a, b) => (a.createdMillis || 0) - (b.createdMillis || 0));
        onMessages(combined);
      }
    } finally {
      isPolling = false;
    }
  };

  poll();

  // 3. Keep real-time sync active every 3 seconds while visible
  const timerId = setInterval(poll, 3000);
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      poll();
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibility);
  }

  return () => {
    isCancelled = true;
    clearInterval(timerId);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibility);
    }
  };
};

/**
 * Internal server POST helper that throws on error instead of silently re-queuing.
 */
async function postMessageToServer(
  message: Omit<ChatMessage, 'id'>,
  tempId: string,
  senderUid?: string
): Promise<ChatMessage> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Device is offline');
  }

  const token = await getFirebaseIdToken();
  const chatPayload = {
    channelId: message.channelId,
    senderUid: senderUid || message.senderUid || '',
    content: message.content,
    senderUsername: message.senderUsername || '',
    senderName: message.senderName || 'Student',
    senderSchool: message.senderSchool || 'Davao Student',
    senderAvatar: message.senderAvatar || '🎓',
    messageType: message.messageType || 'text',
    mediaUrl: message.mediaUrl || null,
    payloadJson: message.payloadJson || null,
    replyToId: message.replyToId || null
  };

  const postUrl = token
    ? `${CHAT_API_URL}?token=${encodeURIComponent(token)}`
    : CHAT_API_URL;

  let responseData: any = null;

  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.post({
      url: postUrl,
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      data: chatPayload,
      connectTimeout: 8000,
      readTimeout: 8000
    });
    if (res.status === 200 || res.status === 201) {
      responseData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    }
  } else {
    const res = await fetchWithTimeout(postUrl, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chatPayload)
    }, 8000);
    if (res.ok) {
      responseData = await res.json();
    }
  }

  const isSuccess = responseData && (responseData.success === true || responseData.messageId);
  if (!isSuccess) {
    throw new Error(responseData?.error || 'Server rejected message insertion');
  }

  const assignedId = String(responseData.messageId || tempId);
  const finalMsg: ChatMessage = {
    ...message,
    id: assignedId,
    isOfflineQueued: false
  };

  // Update local cache cleanly, replacing any tempId placeholder
  const currentCached = getCachedChannelMessages(message.channelId);
  const updated = [...currentCached.filter(m => m.id !== tempId && m.id !== assignedId), finalMsg];
  setCachedChannelMessages(message.channelId, updated);

  return finalMsg;
}

/**
 * Send a message directly to MySQL chat API
 */
export const sendChannelMessage = async (
  message: Omit<ChatMessage, 'id'>, 
  isOnline: boolean,
  senderUid?: string
): Promise<ChatMessage> => {
  const currentMillis = Date.now();
  const tempId = `msg-${currentMillis}-${Math.random().toString(36).substring(2, 7)}`;
  const newMsg: ChatMessage = {
    ...message,
    id: tempId,
    isOfflineQueued: !isOnline
  };

  // If offline, store in offline queue
  if (!isOnline) {
    const queue = getOfflineQueue();
    queue.push(newMsg);
    saveOfflineQueue(queue);
    return newMsg;
  }

  try {
    return await postMessageToServer(message, tempId, senderUid);
  } catch (err) {
    console.warn('MySQL chat send error, queued locally:', err);
    const queuedMsg: ChatMessage = { ...newMsg, isOfflineQueued: true };
    const queue = getOfflineQueue();
    if (!queue.some((q) => q.id === tempId)) {
      queue.push(queuedMsg);
      saveOfflineQueue(queue);
    }
    return queuedMsg;
  }
};

/**
 * Submit an incident or chat report directly to MySQL feedback API
 */
export const submitChatReport = async (report: {
  reportedUser: string;
  reporter: string;
  reporterUid?: string;
  reason: string;
  details: string;
  channelId?: string;
}): Promise<boolean> => {
  try {
    const payload = {
      userId: report.reporterUid || '',
      name: report.reporter || 'Student Reporter',
      category: 'Chat Moderation Report',
      rating: 1,
      subject: `Report on ${report.reportedUser}: ${report.reason}`,
      message: `Channel: #${report.channelId || 'general'}\nReported User: ${report.reportedUser}\nReason: ${report.reason}\nDetails: ${report.details}`
    };

    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.post({
        url: FEEDBACK_API_URL,
        headers: { 'Content-Type': 'application/json' },
        data: payload
      });
      return res.status === 200;
    } else {
      const res = await fetchWithTimeout(FEEDBACK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 8000);
      return res.ok;
    }
  } catch (err) {
    console.warn('Failed to submit chat report to MySQL:', err);
    return false;
  }
};

/**
 * Submit student feedback or feature request directly to MySQL feedback API
 */
export const submitStudentFeedback = async (feedback: {
  name: string;
  email?: string;
  category: string;
  rating: number;
  subject: string;
  message: string;
}): Promise<boolean> => {
  try {
    const payload = {
      name: feedback.name,
      email: feedback.email || '',
      category: feedback.category,
      rating: feedback.rating,
      subject: feedback.subject,
      message: feedback.message
    };

    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.post({
        url: FEEDBACK_API_URL,
        headers: { 'Content-Type': 'application/json' },
        data: payload
      });
      return res.status === 200;
    } else {
      const res = await fetchWithTimeout(FEEDBACK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 8000);
      return res.ok;
    }
  } catch (err) {
    console.warn('Failed to submit feedback to MySQL:', err);
    return false;
  }
};

let isFlushingOfflineQueue = false;
let pendingFlushCallback: ((sentItem: ChatMessage, tempId?: string) => void) | undefined;
let hasPendingReflush = false;

/**
 * Flush offline queued messages directly to MySQL with an in-flight mutex.
 * Removes each message individually by tempId ONLY after confirmed server receipt.
 */
export const flushOfflineQueue = async (
  onItemSent?: (sentItem: ChatMessage, originalTempId?: string) => void
): Promise<void> => {
  if (isFlushingOfflineQueue) {
    hasPendingReflush = true;
    if (onItemSent) pendingFlushCallback = onItemSent;
    return;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  const snapshot = getOfflineQueue();
  if (snapshot.length === 0) return;

  isFlushingOfflineQueue = true;
  pendingFlushCallback = onItemSent;

  try {
    for (const item of snapshot) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        break;
      }
      try {
        const sent = await postMessageToServer(item, item.id, item.senderUid);
        // Remove ONLY this confirmed item from the live queue so newly queued items are preserved
        const liveQueue = getOfflineQueue();
        saveOfflineQueue(liveQueue.filter((q) => q.id !== item.id));
        if (onItemSent) onItemSent(sent, item.id);
      } catch (err) {
        console.warn('Offline chat item flush failed, keeping in queue:', item.id, err);
      }
    }
  } finally {
    isFlushingOfflineQueue = false;
    if (hasPendingReflush && (typeof navigator === 'undefined' || navigator.onLine)) {
      hasPendingReflush = false;
      const cb = pendingFlushCallback;
      pendingFlushCallback = undefined;
      flushOfflineQueue(cb).catch(() => {});
    }
  }
};

export interface UploadMediaProgress {
  uploadedChunks: number;
  totalChunks: number;
  percentage: number;
}

/**
 * Resilient Chunked Chat Media Uploader
 * Slices compressed image into ~9.5KB base64 payloads to bypass Nginx 16KB disk buffering,
 * Android bridge IPC limitations, and server tmp directory permission barriers.
 */
export async function uploadChatMedia(
  source: File | Blob | string,
  onProgress?: (progress: UploadMediaProgress) => void
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const compressed = await compressImageForChat(source, 1280, 0.75);
    const token = await getFirebaseIdToken();

    let rawB64 = compressed.dataUrl;
    if (rawB64.includes('base64,')) {
      rawB64 = rawB64.split('base64,')[1];
    }
    rawB64 = rawB64.replace(/\s/g, '');

    const CHUNK_SIZE = 9500;
    const totalChunks = Math.ceil(rawB64.length / CHUNK_SIZE);
    const uploadId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const apiUrl = 'https://skweladabaw.kurzyrio.site/api/upload_chat_media.php';

    for (let i = 0; i < totalChunks; i++) {
      const chunk = rawB64.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const payload = {
        uploadId,
        chunkIndex: i,
        totalChunks,
        chunk,
        token: token || undefined
      };

      let responseData: any = null;

      if (Capacitor.isNativePlatform()) {
        const res = await CapacitorHttp.post({
          url: apiUrl,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          data: payload,
          connectTimeout: 10000,
          readTimeout: 10000
        });
        responseData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      } else {
        const res = await fetchWithTimeout(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        }, 10000);
        responseData = await res.json();
      }

      if (!responseData || !responseData.success) {
        return {
          success: false,
          error: responseData?.error || 'Failed to upload photo.'
        };
      }

      if (onProgress) {
        onProgress({
          uploadedChunks: i + 1,
          totalChunks,
          percentage: Math.round(((i + 1) / totalChunks) * 100)
        });
      }

      if (responseData.isDone && responseData.url) {
        return {
          success: true,
          url: responseData.url
        };
      }
    }

    return { success: false, error: 'Upload incomplete: No media URL received.' };
  } catch (err: any) {
    console.warn('uploadChatMedia error:', err);
    return { success: false, error: err?.message || 'Failed to process and upload image.' };
  }
}

