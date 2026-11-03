/**
 * SkwelaDabaw Community Service
 * 
 * Interacts with MySQL Community Posts API:
 * - Public reading of feed and comments for all users (guests and students).
 * - Authenticated actions (create post, like, comment, delete).
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { getFirebaseIdToken } from './cloudSyncService';
import { uploadChatMedia } from './chatService';

export interface CommunityComment {
  id: number;
  postId: number;
  userId: string;
  authorName: string;
  authorAvatar?: string | null;
  campusId?: string;
  content: string;
  createdAt: string;
  isVerified?: boolean;
  customTag?: string | null;
  customTagBg?: string | null;
  customTagColor?: string | null;
}

export interface CommunityPost {
  id: number;
  userId: string;
  authorName: string;
  authorAvatar?: string | null;
  authorTag?: string | null;
  campusId: string;
  category: 'discussion' | 'lost_found' | 'buy_sell' | 'events' | string;
  title?: string | null;
  content: string;
  imageUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  hasLiked: boolean;
  createdAt: string;
  isVerified?: boolean;
  customTag?: string | null;
  customTagBg?: string | null;
  customTagColor?: string | null;
}

const COMMUNITY_API_URL = 'https://skweladabaw.kurzyrio.site/api/community.php';

/**
 * Fetch visible community posts feed with optional category/campus filters
 */
export async function fetchCommunityPosts(params?: {
  category?: string;
  campusId?: string;
  search?: string;
  userId?: string;
}): Promise<CommunityPost[]> {
  const query = new URLSearchParams();
  if (params?.category && params.category !== 'all') query.set('category', params.category);
  if (params?.campusId && params.campusId !== 'all') query.set('campus_id', params.campusId);
  if (params?.search) query.set('search', params.search);
  if (params?.userId) query.set('uid', params.userId);
  query.set('t', Date.now().toString());

  const url = `${COMMUNITY_API_URL}?${query.toString()}`;

  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({
        url,
        headers: { 'Accept': 'application/json' },
        connectTimeout: 8000,
        readTimeout: 8000,
      });

      if (response.status === 200 && response.data) {
        const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (body?.success && Array.isArray(body.posts)) {
          return body.posts as CommunityPost[];
        }
      }
    } else {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const body = await res.json();
        if (body?.success && Array.isArray(body.posts)) {
          return body.posts as CommunityPost[];
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load community posts:', err);
  }

  return [];
}

/**
 * Create a new community post (Requires authenticated session)
 */
export async function createCommunityPost(data: {
  title?: string;
  content: string;
  category: string;
  campusId?: string;
  imageData?: string | null;
  userId?: string;
  authorName?: string;
  authorAvatar?: string | null;
}): Promise<{ success: boolean; post?: CommunityPost; error?: string; requiresAuth?: boolean }> {
  let finalImageUrl: string | null = null;

  // 1. If photo attached as base64, upload via resilient chunked pipeline first
  if (data.imageData && typeof data.imageData === 'string') {
    if (data.imageData.startsWith('data:image/')) {
      const uploadRes = await uploadChatMedia(data.imageData);
      if (!uploadRes.success || !uploadRes.url) {
        return {
          success: false,
          error: uploadRes.error || 'Failed to upload photo attachment. Please check your connection and try again.'
        };
      }
      finalImageUrl = uploadRes.url;
    } else if (data.imageData.startsWith('http://') || data.imageData.startsWith('https://')) {
      finalImageUrl = data.imageData;
    }
  }

  const token = await getFirebaseIdToken();
  const payload = {
    action: 'create',
    title: data.title,
    content: data.content,
    category: data.category,
    campusId: data.campusId,
    campus_id: data.campusId,
    userId: data.userId,
    user_id: data.userId,
    authorName: data.authorName,
    author_name: data.authorName,
    authorAvatar: data.authorAvatar,
    author_avatar: data.authorAvatar,
    imageUrl: finalImageUrl,
    image_url: finalImageUrl,
    token: token || undefined,
  };

  try {
    let resData: any = null;
    let status = 200;

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: COMMUNITY_API_URL,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        data: payload,
        connectTimeout: 12000,
        readTimeout: 12000,
      });
      status = response.status;
      resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      const res = await fetch(COMMUNITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      status = res.status;
      resData = await res.json();
    }

    if (status === 401 || resData?.requiresAuth) {
      return { success: false, requiresAuth: true, error: resData?.error || 'Sign-in required' };
    }

    if (resData?.success && resData?.post) {
      return { success: true, post: resData.post };
    }

    return { success: false, error: resData?.error || `HTTP ${status}` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Toggle like / upvote on a post (Requires authenticated session)
 */
export async function toggleLikePost(postId: number, userId?: string): Promise<{
  success: boolean;
  liked?: boolean;
  likesCount?: number;
  requiresAuth?: boolean;
  error?: string;
}> {
  const token = await getFirebaseIdToken();
  const payload = {
    action: 'like',
    post_id: postId,
    user_id: userId,
    token: token || undefined,
  };

  try {
    let resData: any = null;
    let status = 200;

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: COMMUNITY_API_URL,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        data: payload,
        connectTimeout: 8000,
        readTimeout: 8000,
      });
      status = response.status;
      resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      const res = await fetch(COMMUNITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      status = res.status;
      resData = await res.json();
    }

    if (status === 401 || resData?.requiresAuth) {
      return { success: false, requiresAuth: true };
    }

    if (resData?.success) {
      return { success: true, liked: resData.liked, likesCount: resData.likesCount };
    }

    return { success: false, error: resData?.error };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Fetch comments for a specific post
 */
export async function fetchPostComments(postId: number): Promise<CommunityComment[]> {
  const url = `${COMMUNITY_API_URL}?action=comments&post_id=${postId}&t=${Date.now()}`;

  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({
        url,
        headers: { 'Accept': 'application/json' },
        connectTimeout: 8000,
        readTimeout: 8000,
      });
      if (response.status === 200 && response.data) {
        const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (body?.success && Array.isArray(body.comments)) {
          return body.comments as CommunityComment[];
        }
      }
    } else {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const body = await res.json();
        if (body?.success && Array.isArray(body.comments)) {
          return body.comments as CommunityComment[];
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load post comments:', err);
  }

  return [];
}

/**
 * Add a comment to a post (Requires authenticated session)
 */
export async function addPostComment(
  postId: number,
  content: string,
  userId?: string
): Promise<{ success: boolean; comment?: CommunityComment; requiresAuth?: boolean; error?: string }> {
  const token = await getFirebaseIdToken();
  const payload = {
    action: 'comment',
    post_id: postId,
    content,
    user_id: userId,
    token: token || undefined,
  };

  try {
    let resData: any = null;
    let status = 200;

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: COMMUNITY_API_URL,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        data: payload,
        connectTimeout: 10000,
        readTimeout: 10000,
      });
      status = response.status;
      resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      const res = await fetch(COMMUNITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      status = res.status;
      resData = await res.json();
    }

    if (status === 401 || resData?.requiresAuth) {
      return { success: false, requiresAuth: true };
    }

    if (resData?.success && resData?.comment) {
      return { success: true, comment: resData.comment };
    }

    return { success: false, error: resData?.error || `HTTP ${status}` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Delete a post (Only author or admin)
 */
export async function deleteCommunityPost(
  postId: number,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getFirebaseIdToken();
  const payload = {
    action: 'delete',
    post_id: postId,
    user_id: userId,
    token: token || undefined,
  };

  try {
    let resData: any = null;
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: COMMUNITY_API_URL,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        data: payload,
      });
      resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      const res = await fetch(COMMUNITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      resData = await res.json();
    }

    return { success: Boolean(resData?.success), error: resData?.error };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Report an inappropriate community post
 */
export async function reportCommunityPost(
  postId: number,
  reason: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getFirebaseIdToken();
  const payload = {
    action: 'report',
    post_id: postId,
    reason,
    user_id: userId,
    token: token || undefined,
  };

  try {
    let resData: any = null;
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: COMMUNITY_API_URL,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        data: payload,
      });
      resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      const res = await fetch(COMMUNITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      resData = await res.json();
    }

    return { success: Boolean(resData?.success), error: resData?.error };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
