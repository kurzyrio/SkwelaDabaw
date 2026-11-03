import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  WifiOff, 
  Wifi, 
  MessageSquare, 
  Hash, 
  Flag,
  ExternalLink,
  X,
  CheckCircle2,
  School,
  Bus,
  GraduationCap,
  Leaf,
  Compass,
  ShieldCheck,
  Stethoscope,
  Coffee,
  Search,
  Info,
  ShieldAlert,
  Users,
  Paperclip,
  ArrowLeft,
  ChevronDown,
  Loader2,
  AlertCircle,
  Menu,
  MapPin
} from 'lucide-react';
import { NavigationTab } from '../layout/Navbar';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { ChatMessage, ChatChannel } from '../../types';
import { StudentAuthSession, signInWithGoogle } from '../../services/authService';
import { 
  subscribeToChannel, 
  sendChannelMessage, 
  flushOfflineQueue, 
  submitChatReport, 
  fetchChannelsFromMySQL,
  INITIAL_CHANNEL_MESSAGES,
  uploadChatMedia
} from '../../services/chatService';
import { fetchLiveUserProfile, UserAccountRecord } from '../../services/userService';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { UserProfileModal } from '../common/UserProfileModal';
import { CachedAvatar } from '../common/CachedAvatar';
import { ChatAttachmentDrawer } from './ChatAttachmentDrawer';
import { ChatChannelsDrawer, formatChannelDisplayName } from './ChatChannelsDrawer';
import { compressImageForChat } from '../../utils/imageCompressor';
import { getFirebaseIdToken } from '../../services/cloudSyncService';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { ChatRouteCard, RouteCardPayload } from './cards/ChatRouteCard';
import { ChatAlertCard } from './cards/ChatAlertCard';
import { ChatSpotCard } from './cards/ChatSpotCard';
import { ChatImageViewerModal } from './ChatImageViewerModal';
import { ChatRoutePickerModal } from './ChatRoutePickerModal';
import { ChatAlertPickerModal } from './ChatAlertPickerModal';
import { ChatSpotPickerModal } from './ChatSpotPickerModal';
import { StudySpot } from '../../types';
import { 
  filterProfanity,
  containsProfanity,
  extractUrls, 
  MAX_MESSAGE_LENGTH, 
  SLOW_MODE_SECONDS 
} from '../../services/securityService';
import { getCachedAppConfig, subscribeToRemoteAppConfig } from '../../services/appConfigService';

export const DEFAULT_CHANNELS: ChatChannel[] = [
  {
    id: 'general-dabaw',
    name: 'general-dabaw',
    description: 'General student lounge for all Davao City colleges & universities',
    icon: 'message',
    category: 'city'
  },
  {
    id: 'commute-traffic',
    name: 'commute-traffic-alerts',
    description: 'Live jeep availability, flood updates, Matina/Bajada rush hour reports',
    icon: 'bus',
    category: 'utility',
    badge: 'LIVE'
  },
  {
    id: 'campus-life',
    name: 'campus-life',
    description: 'Study tips, exam schedules, campus events & student discussions',
    icon: 'graduation',
    category: 'campus'
  },
  {
    id: 'study-spots',
    name: 'study-spots',
    description: 'Best spots for thesis writing, wifi hubs, and 24/7 cafes in Davao',
    icon: 'coffee',
    category: 'spots'
  }
];

export const getChannelVectorIcon = (iconKey: string): React.FC<{ className?: string }> => {
  switch (iconKey) {
    case 'bus': return Bus;
    case 'graduation': return GraduationCap;
    case 'leaf': return Leaf;
    case 'compass': return Compass;
    case 'shield': return ShieldCheck;
    case 'stethoscope': return Stethoscope;
    case 'coffee': return Coffee;
    case 'search': return Search;
    case 'message':
    default: return MessageSquare;
  }
};

interface SchoolBadgeStyle {
  label: string;
  className: string;
}

const getSchoolBadgeStyle = (schoolName: string): SchoolBadgeStyle => {
  const lower = schoolName.toLowerCase();
  
  if (lower.includes('addu') || lower.includes('ateneo')) {
    return {
      label: 'AdDU',
      className: 'bg-[#002B49] text-[#71C5E8] border-[#003B64]'
    };
  }
  if (lower.includes('usep')) {
    return {
      label: 'USEP',
      className: 'bg-[#1C3B24] text-[#78E08F] border-[#2E5939]'
    };
  }
  if (lower.includes('um') || lower.includes('mindanao')) {
    return {
      label: 'UM',
      className: 'bg-[#4A151B] text-[#FF7675] border-[#6D212A]'
    };
  }
  if (lower.includes('sjpcd') || lower.includes('john paul')) {
    return {
      label: 'SJPCD',
      className: 'bg-[#3D2C00] text-[#F9CA24] border-[#5E4400]'
    };
  }
  if (lower.includes('uic')) {
    return {
      label: 'UIC',
      className: 'bg-[#3B122D] text-[#FDA7DF] border-[#5E1E49]'
    };
  }
  if (lower.includes('spc') || lower.includes('san pedro')) {
    return {
      label: 'SPC',
      className: 'bg-[#382600] text-[#F6E58D] border-[#593E00]'
    };
  }
  if (lower.includes('hcdc') || lower.includes('cross')) {
    return {
      label: 'HCDC',
      className: 'bg-[#002447] text-[#74B9FF] border-[#003B75]'
    };
  }
  if (lower.includes('mapua') || lower.includes('mcm')) {
    return {
      label: 'MMCM',
      className: 'bg-[#471B00] text-[#E17055] border-[#6E2B00]'
    };
  }

  return {
    label: schoolName ? schoolName.substring(0, 8) : 'Davao',
    className: 'bg-[#282828] text-white border-[#38383A]'
  };
};

function formatMessageDateSeparator(millis?: number): string {
  if (!millis) return 'Today';
  const msgDate = new Date(millis);
  const today = new Date();
  
  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(msgDate, today)) {
    return 'Today';
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(msgDate, yesterday)) {
    return 'Yesterday';
  }

  const isCurrentYear = msgDate.getFullYear() === today.getFullYear();
  return msgDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: isCurrentYear ? undefined : 'numeric'
  });
}

function getMessageDayKey(millis?: number): string {
  if (!millis) return 'today';
  const d = new Date(millis);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

interface StudentCommunityChatProps {
  userSession?: StudentAuthSession;
  onTypingChange?: (isTyping: boolean) => void;
  onBack?: () => void;
  onNavigateTab?: (tab: NavigationTab) => void;
}

export const StudentCommunityChat: React.FC<StudentCommunityChatProps> = ({ 
  userSession, 
  onTypingChange,
  onBack,
  onNavigateTab
}) => {
  const [channels, setChannels] = useState<ChatChannel[]>(() => {
    try {
      const cached = localStorage.getItem('skweladabaw_chat_channels');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CHANNELS;
  });

  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    try {
      return localStorage.getItem('skweladabaw_active_channel') || 'general-dabaw';
    } catch {
      return 'general-dabaw';
    }
  });

  const handleSelectChannel = (id: string) => {
    setActiveChannelId(id);
    try {
      localStorage.setItem('skweladabaw_active_channel', id);
    } catch {}
  };

  useEffect(() => {
    fetchChannelsFromMySQL().then((remote) => {
      if (remote && remote.length > 0) {
        setChannels(remote);
        try {
          localStorage.setItem('skweladabaw_chat_channels', JSON.stringify(remote));
        } catch {}
      }
    });
  }, []);

  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_CHANNEL_MESSAGES);
  const [slowModeCountdown, setSlowModeCountdown] = useState<number>(0);
  const [liveProfile, setLiveProfile] = useState<UserAccountRecord | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Moderation state
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [banRemainingMsg, setBanRemainingMsg] = useState<string>('');
  const [isChatEnabled, setIsChatEnabled] = useState<boolean>(() => getCachedAppConfig().features.campusChat !== false);
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState<string>('spam');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);

  // Channel Drawer State
  const [isChannelsDrawerOpen, setIsChannelsDrawerOpen] = useState<boolean>(false);

  // Attachment & Rich Media State
  const [isAttachmentDrawerOpen, setIsAttachmentDrawerOpen] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isRoutePickerOpen, setIsRoutePickerOpen] = useState<boolean>(false);
  const [isAlertPickerOpen, setIsAlertPickerOpen] = useState<boolean>(false);
  const [isSpotPickerOpen, setIsSpotPickerOpen] = useState<boolean>(false);

  // Staged Attachment (Telegram / Discord Style staging before sending)
  const [stagedAttachment, setStagedAttachment] = useState<
    | { type: 'photo'; source: File | Blob | string; previewUrl: string }
    | { type: 'route'; data: RouteCardPayload }
    | { type: 'alert'; data: { category: string; location: string; description: string; icon: string } }
    | { type: 'spot'; data: StudySpot }
    | null
  >(null);

  // In-chat Media Uploading Indicator State
  const [uploadingMedia, setUploadingMedia] = useState<{
    id: string;
    previewUrl: string;
    status: 'optimizing' | 'uploading' | 'error';
    errorMessage?: string;
    rawSource?: File | Blob | string;
    captionText?: string;
    progress?: number;
  } | null>(null);

  // Link safety warning modal state
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null);

  // User profile inspection modal state
  const [inspectingProfile, setInspectingProfile] = useState<{
    uid?: string;
    username?: string;
    fallbackData?: {
      name?: string;
      username?: string;
      school?: string;
      avatar?: string;
      role?: 'student' | 'teacher' | 'admin';
      isVerified?: boolean;
      presetTag?: string;
      customTag?: string;
      customTagBg?: string;
      customTagColor?: string;
    };
  } | null>(null);

  // Refs
  const localSentIdsRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasModalOpen = isAttachmentDrawerOpen || isRoutePickerOpen || isAlertPickerOpen || isSpotPickerOpen || isChannelsDrawerOpen;
    onTypingChange?.(isTyping || hasModalOpen);
  }, [isTyping, isAttachmentDrawerOpen, isRoutePickerOpen, isAlertPickerOpen, isSpotPickerOpen, isChannelsDrawerOpen, onTypingChange]);

  useEffect(() => {
    return () => {
      onTypingChange?.(false);
    };
  }, [onTypingChange]);

  useEffect(() => {
    const unsubscribe = subscribeToRemoteAppConfig((cfg) => {
      setIsChatEnabled(cfg?.features?.campusChat !== false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenProfile = (msg: ChatMessage) => {
    setInspectingProfile({
      uid: msg.senderUid,
      username: msg.senderUsername,
      fallbackData: {
        name: msg.senderName,
        username: msg.senderUsername,
        school: msg.senderSchool,
        avatar: msg.senderAvatar,
        role: msg.senderRole,
        isVerified: msg.isVerified,
        presetTag: msg.presetTag,
        customTag: msg.customTag,
        customTagBg: msg.customTagBg,
        customTagColor: msg.customTagColor
      }
    });
  };

  const handleOpenProfileByUsername = (targetUsername: string) => {
    setInspectingProfile({
      username: targetUsername,
      fallbackData: {
        username: targetUsername,
        name: targetUsername
      }
    });
  };

  const isOnline = useOnlineStatus();

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0] || DEFAULT_CHANNELS[0];
  const channelMessages = messages[activeChannelId] || [];

  useEffect(() => {
    if (userSession?.uid) {
      fetchLiveUserProfile(userSession.uid).then((prof) => {
        if (prof) {
          setLiveProfile(prof);
          if (prof.chatBannedUntil) {
            const expTime = new Date(prof.chatBannedUntil).getTime();
            if (expTime > Date.now()) {
              setIsBanned(true);
              const diffHours = Math.ceil((expTime - Date.now()) / (1000 * 3600));
              setBanRemainingMsg(diffHours > 24 ? `${Math.ceil(diffHours / 24)} days` : `${diffHours} hours`);
            } else {
              setIsBanned(false);
            }
          }
        }
      });
    }
  }, [userSession?.uid]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [channelMessages, activeChannelId]);

  useEffect(() => {
    if (slowModeCountdown > 0) {
      const timer = setTimeout(() => {
        setSlowModeCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [slowModeCountdown]);

  useEffect(() => {
    const unsubscribe = subscribeToChannel(activeChannelId, (incomingMessages) => {
      if (incomingMessages) {
        setMessages((prev) => {
          const current = prev[activeChannelId] || [];
          // Preserve recent optimistic messages so they don't abruptly disappear
          const recentOptimistic = current.filter(m => 
            m.isOfflineQueued || 
            (m.createdMillis && Date.now() - m.createdMillis < 15000 && !incomingMessages.some(inc => inc.id === m.id))
          );
          const merged = [...incomingMessages];
          for (const opt of recentOptimistic) {
            if (!merged.some(m => m.id === opt.id)) {
              merged.push(opt);
            }
          }
          merged.sort((a, b) => (a.createdMillis || 0) - (b.createdMillis || 0));

          return {
            ...prev,
            [activeChannelId]: merged
          };
        });
      }
    }, userSession?.uid);

    return () => {
      unsubscribe();
    };
  }, [activeChannelId, userSession?.uid]);

  useEffect(() => {
    if (isOnline) {
      flushOfflineQueue((sentMsg) => {
        setMessages((prev) => ({
          ...prev,
          [sentMsg.channelId]: (prev[sentMsg.channelId] || []).map((m) =>
            m.id === sentMsg.id ? { ...m, isOfflineQueued: false } : m
          )
        }));
      });
    }
  }, [isOnline]);

  const getSenderSchool = (): string => {
    const campusObj = DAVAO_CAMPUSES.find((c) => c.id === userSession?.campusId);
    return campusObj ? campusObj.shortName : (userSession?.campusId || 'Davao Student');
  };

  const getFormattedTime = (): string => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleStagePhoto = (source: File | Blob | string) => {
    let preview = '';
    if (typeof source === 'string') {
      preview = source;
    } else {
      try {
        preview = URL.createObjectURL(source);
      } catch {
        preview = '';
      }
    }
    setStagedAttachment({
      type: 'photo',
      source,
      previewUrl: preview
    });
    setIsAttachmentDrawerOpen(false);
  };

  const handleStageRoute = (routeData: RouteCardPayload) => {
    setStagedAttachment({
      type: 'route',
      data: routeData
    });
    setIsRoutePickerOpen(false);
  };

  const handleStageAlert = (alertData: {
    category: string;
    location: string;
    description: string;
    icon: string;
  }) => {
    setStagedAttachment({
      type: 'alert',
      data: alertData
    });
    setIsAlertPickerOpen(false);
  };

  const handleStageSpot = (spot: StudySpot) => {
    setStagedAttachment({
      type: 'spot',
      data: spot
    });
    setIsSpotPickerOpen(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !stagedAttachment) || slowModeCountdown > 0 || isBanned) return;

    if (inputText.trim()) {
      const profanityResult = containsProfanity(inputText);
      if (profanityResult.blocked) {
        setModerationWarning('Your message contains blocked words and cannot be sent. Please keep discussions respectful.');
        return;
      }
    }

    setModerationWarning(null);

    const rawCaption = inputText.trim();
    const { cleanText } = rawCaption ? filterProfanity(rawCaption.substring(0, MAX_MESSAGE_LENGTH)) : { cleanText: '' };
    const currentAttachment = stagedAttachment;

    // Reset input state immediately for snappy Telegram/Discord style responsiveness
    setInputText('');
    setStagedAttachment(null);
    setSlowModeCountdown(SLOW_MODE_SECONDS);

    // Staged Photo Upload & Dispatch
    if (currentAttachment && currentAttachment.type === 'photo') {
      await executeUploadPhoto(currentAttachment.source, cleanText);
      return;
    }

    // Staged Route Card Dispatch
    if (currentAttachment && currentAttachment.type === 'route') {
      await handleShareRoute(currentAttachment.data, cleanText);
      return;
    }

    // Staged Commute Alert Dispatch
    if (currentAttachment && currentAttachment.type === 'alert') {
      await handleSendAlert(currentAttachment.data, cleanText);
      return;
    }

    // Staged Study Spot Dispatch
    if (currentAttachment && currentAttachment.type === 'spot') {
      await handleSendSpot(currentAttachment.data, cleanText);
      return;
    }

    // Standard Text Message Dispatch
    const schoolTag = getSenderSchool();
    const isTeacher = userSession?.role === 'teacher';
    const rawMessage = {
      senderName: userSession?.isLoggedIn 
        ? userSession.name 
        : (isTeacher ? 'Prof. Davao Faculty' : 'You Davao Student'),
      senderUsername: liveProfile?.username || userSession?.username || '',
      senderSchool: schoolTag,
      senderRole: userSession?.role || 'student',
      senderAvatar: userSession?.avatar || '',
      channelId: activeChannelId,
      content: cleanText,
      timestamp: getFormattedTime(),
      isOwn: true,
      isVerified: Boolean(liveProfile?.isVerified),
      presetTag: liveProfile?.presetTag || '',
      customTag: liveProfile?.customTag || '',
      customTagBg: liveProfile?.customTagBg || '#f59e0b',
      customTagColor: liveProfile?.customTagColor || '#000000',
      createdMillis: Date.now()
    };

    const sentMsg = await sendChannelMessage(rawMessage, isOnline, userSession?.uid);
    if (sentMsg.id) {
      localSentIdsRef.current.add(sentMsg.id);
    }

    setMessages((prev) => {
      const currentList = prev[activeChannelId] || [];
      if (currentList.some(m => m.id === sentMsg.id)) return prev;
      return {
        ...prev,
        [activeChannelId]: [...currentList, sentMsg]
      };
    });

    setTimeout(scrollToBottom, 150);
  };

  const executeUploadPhoto = async (source: File | Blob | string, captionText?: string) => {
    let preview = '';
    if (typeof source === 'string') {
      preview = source;
    } else {
      try {
        preview = URL.createObjectURL(source);
      } catch {
        preview = '';
      }
    }

    setUploadingMedia({
      id: 'upload-' + Date.now(),
      previewUrl: preview,
      status: 'optimizing',
      rawSource: source,
      captionText,
      progress: 0
    });
    setTimeout(scrollToBottom, 60);

    try {
      setUploadingMedia((prev) => prev ? { ...prev, status: 'uploading' } : null);

      const result = await uploadChatMedia(source, (prog) => {
        setUploadingMedia((prev) => prev ? { ...prev, progress: prog.percentage } : null);
      });

      if (result.success && result.url) {
        setUploadingMedia(null);
        await handleImageUploaded(result.url, captionText);
      } else {
        setUploadingMedia((prev) => prev ? {
          ...prev,
          status: 'error',
          errorMessage: result.error || 'Upload failed. Tap to retry.',
          captionText
        } : null);
      }
    } catch (err: any) {
      console.warn('Image upload processing failed:', err);
      setUploadingMedia((prev) => prev ? {
        ...prev,
        status: 'error',
        errorMessage: err?.message || 'Failed to process image. Tap to retry.',
        captionText
      } : null);
    }
  };

  const handleImageUploaded = async (mediaUrl: string, captionText?: string) => {
    if (!userSession?.isLoggedIn) return;

    try {
      const isGif = mediaUrl.toLowerCase().endsWith('.gif') || mediaUrl.toLowerCase().includes('.gif');
      const content = captionText && captionText.trim().length > 0
        ? captionText.trim()
        : (isGif ? 'Shared a GIF' : 'Shared a photo');

      const rawMessage: Omit<ChatMessage, 'id'> = {
        channelId: activeChannelId,
        senderUid: userSession?.uid || '',
        senderUsername: liveProfile?.username || userSession?.username || '',
        senderName: liveProfile?.displayName || userSession?.name || 'Student',
        senderSchool: getSenderSchool(),
        senderRole: (liveProfile?.role || userSession?.role as any) || 'student',
        senderAvatar: liveProfile?.avatar || userSession?.avatar || '',
        content,
        timestamp: getFormattedTime(),
        isOwn: true,
        isVerified: Boolean(liveProfile?.isVerified),
        presetTag: liveProfile?.presetTag || '',
        customTag: liveProfile?.customTag || '',
        customTagBg: liveProfile?.customTagBg || '#f59e0b',
        customTagColor: liveProfile?.customTagColor || '#000000',
        createdMillis: Date.now(),
        messageType: isGif ? 'gif' : 'image',
        mediaUrl: mediaUrl
      };

      const sentMsg = await sendChannelMessage(rawMessage, isOnline, userSession?.uid);
      if (sentMsg.id) {
        localSentIdsRef.current.add(sentMsg.id);
      }

      setMessages((prev) => {
        const currentList = prev[activeChannelId] || [];
        if (currentList.some(m => m.id === sentMsg.id)) return prev;
        return {
          ...prev,
          [activeChannelId]: [...currentList, sentMsg]
        };
      });
      setTimeout(scrollToBottom, 150);
    } catch (err) {
      console.warn('Failed to send image message:', err);
    }
  };

  const handleShareRoute = async (routeData: RouteCardPayload, caption?: string) => {
    if (!userSession?.isLoggedIn) return;

    try {
      const content = caption && caption.trim().length > 0 
        ? caption.trim() 
        : `Shared transit route: ${routeData.routeName}`;

      const rawMessage: Omit<ChatMessage, 'id'> = {
        channelId: activeChannelId,
        senderUid: userSession?.uid || '',
        senderUsername: liveProfile?.username || userSession?.username || '',
        senderName: liveProfile?.displayName || userSession?.name || 'Student',
        senderSchool: getSenderSchool(),
        senderRole: (liveProfile?.role || userSession?.role as any) || 'student',
        senderAvatar: liveProfile?.avatar || userSession?.avatar || '',
        content,
        timestamp: getFormattedTime(),
        isOwn: true,
        isVerified: Boolean(liveProfile?.isVerified),
        presetTag: liveProfile?.presetTag || '',
        customTag: liveProfile?.customTag || '',
        customTagBg: liveProfile?.customTagBg || '#f59e0b',
        customTagColor: liveProfile?.customTagColor || '#000000',
        createdMillis: Date.now(),
        messageType: 'route',
        payloadJson: JSON.stringify(routeData)
      };

      const sentMsg = await sendChannelMessage(rawMessage, isOnline, userSession?.uid);
      if (sentMsg.id) {
        localSentIdsRef.current.add(sentMsg.id);
      }

      setMessages((prev) => {
        const currentList = prev[activeChannelId] || [];
        if (currentList.some(m => m.id === sentMsg.id)) return prev;
        return {
          ...prev,
          [activeChannelId]: [...currentList, sentMsg]
        };
      });
      setTimeout(scrollToBottom, 150);
    } catch (err) {
      console.warn('Failed to share route:', err);
    }
  };

  const handleSendAlert = async (alertData: {
    category: string;
    location: string;
    description: string;
    icon: string;
  }, caption?: string) => {
    if (!userSession?.isLoggedIn) return;

    try {
      const content = caption && caption.trim().length > 0
        ? caption.trim()
        : `${alertData.icon} [COMMUTE ALERT: ${alertData.category.toUpperCase()}] ${alertData.location} • ${alertData.description}`;

      const rawMessage: Omit<ChatMessage, 'id'> = {
        channelId: activeChannelId,
        senderUid: userSession?.uid || '',
        senderUsername: liveProfile?.username || userSession?.username || '',
        senderName: liveProfile?.displayName || userSession?.name || 'Student',
        senderSchool: getSenderSchool(),
        senderRole: (liveProfile?.role || userSession?.role as any) || 'student',
        senderAvatar: liveProfile?.avatar || userSession?.avatar || '',
        content,
        timestamp: getFormattedTime(),
        isOwn: true,
        isVerified: Boolean(liveProfile?.isVerified),
        presetTag: liveProfile?.presetTag || '',
        customTag: liveProfile?.customTag || '',
        customTagBg: '#ef4444',
        customTagColor: '#ffffff',
        createdMillis: Date.now(),
        messageType: 'traffic_alert',
        payloadJson: JSON.stringify(alertData)
      };

      const sentMsg = await sendChannelMessage(rawMessage, isOnline, userSession?.uid);
      if (sentMsg.id) {
        localSentIdsRef.current.add(sentMsg.id);
      }

      setMessages((prev) => {
        const currentList = prev[activeChannelId] || [];
        if (currentList.some(m => m.id === sentMsg.id)) return prev;
        return {
          ...prev,
          [activeChannelId]: [...currentList, sentMsg]
        };
      });
      setTimeout(scrollToBottom, 150);
    } catch (err) {
      console.warn('Failed to send alert:', err);
    }
  };

  const handleSendSpot = async (spot: StudySpot, caption?: string) => {
    if (!userSession?.isLoggedIn) return;

    try {
      const content = caption && caption.trim().length > 0
        ? caption.trim()
        : `Recommended study spot: ${spot.name} (${spot.area})`;

      const rawMessage: Omit<ChatMessage, 'id'> = {
        channelId: activeChannelId,
        senderUid: userSession?.uid || '',
        senderUsername: liveProfile?.username || userSession?.username || '',
        senderName: liveProfile?.displayName || userSession?.name || 'Student',
        senderSchool: getSenderSchool(),
        senderRole: (liveProfile?.role || userSession?.role as any) || 'student',
        senderAvatar: liveProfile?.avatar || userSession?.avatar || '',
        content,
        timestamp: getFormattedTime(),
        isOwn: true,
        isVerified: Boolean(liveProfile?.isVerified),
        presetTag: liveProfile?.presetTag || '',
        customTag: liveProfile?.customTag || '',
        customTagBg: '#10b981',
        customTagColor: '#ffffff',
        createdMillis: Date.now(),
        messageType: 'study_spot',
        payloadJson: JSON.stringify(spot)
      };

      const sentMsg = await sendChannelMessage(rawMessage, isOnline, userSession?.uid);
      if (sentMsg.id) {
        localSentIdsRef.current.add(sentMsg.id);
      }

      setMessages((prev) => {
        const currentList = prev[activeChannelId] || [];
        if (currentList.some(m => m.id === sentMsg.id)) return prev;
        return {
          ...prev,
          [activeChannelId]: [...currentList, sentMsg]
        };
      });
      setTimeout(scrollToBottom, 150);
    } catch (err) {
      console.warn('Failed to send spot:', err);
    }
  };

  const handleViewRouteOnMap = (routeData: RouteCardPayload) => {
    try {
      localStorage.setItem('skweladabaw_shared_route_to_view', JSON.stringify(routeData));
      if (onNavigateTab) {
        onNavigateTab('jeep');
      }
      window.dispatchEvent(new CustomEvent('skweladabaw_select_jeep_route', { detail: routeData }));
    } catch (_) {}
  };

  const handleViewSpot = (spot: StudySpot) => {
    try {
      localStorage.setItem('skweladabaw_selected_study_spot', JSON.stringify(spot));
      if (onNavigateTab) {
        onNavigateTab('spots');
      }
      window.dispatchEvent(new CustomEvent('skweladabaw_select_study_spot', { detail: spot }));
    } catch (_) {}
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMessage) return;

    setIsSubmittingReport(true);
    await submitChatReport({
      reportedUser: reportingMessage.senderUsername || reportingMessage.senderName,
      reporter: userSession?.username || userSession?.name || 'Anonymous',
      reporterUid: userSession?.uid,
      reason: reportReason,
      details: reportDetails || reportingMessage.content,
      channelId: activeChannelId
    });

    setIsSubmittingReport(false);
    setReportSuccess(true);
    setTimeout(() => {
      setReportingMessage(null);
      setReportSuccess(false);
      setReportDetails('');
    }, 1500);
  };

  const shouldRenderMessageText = (msg: ChatMessage): boolean => {
    if (!msg.content || !msg.content.trim()) return false;
    const c = msg.content.trim();
    if (msg.messageType === 'image' && (c === 'Shared a photo' || !c)) return false;
    if (msg.messageType === 'gif' && (c === 'Shared a GIF' || c === 'Shared a photo' || !c)) return false;
    if (msg.messageType === 'route' && msg.payloadJson && (c.startsWith('Shared transit route') || c.startsWith('Shared route'))) return false;
    if (msg.messageType === 'traffic_alert' && (c.includes('[COMMUTE ALERT:') || !c)) return false;
    if (msg.messageType === 'study_spot' && msg.payloadJson && c.startsWith('Recommended study spot')) return false;
    return true;
  };

  const renderMessageContent = (content?: string) => {
    if (!content) return null;
    // Regex splits URLs or @username mentions
    const parts = content.split(/(https?:\/\/[^\s]+|@[a-zA-Z0-9_]{3,20})/g);
    return parts.map((part, i) => {
      if (/^https?:\/\//i.test(part)) {
        return (
          <button
            key={i}
            onClick={() => setPendingExternalUrl(part)}
            className="inline-flex items-center gap-0.5 text-white underline font-semibold break-all cursor-pointer"
          >
            <span>{part}</span>
            <ExternalLink className="w-3 h-3 inline ml-0.5" />
          </button>
        );
      }
      if (/^@[a-zA-Z0-9_]{3,20}$/.test(part)) {
        const usernameWithoutAt = part.slice(1);
        return (
          <button
            key={i}
            type="button"
            onClick={() => handleOpenProfileByUsername(usernameWithoutAt)}
            className="inline-block font-bold text-[#A855F7] hover:underline cursor-pointer transition-opacity active:opacity-75"
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-0 bg-[var(--canvas-bg)] overflow-hidden relative select-none animate-fade-in">
      {/* Integrated Chat Header with Channel Switcher Button */}
      <div className="px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 border-b border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to previous page"
              className="w-8 h-8 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center shrink-0 pressable cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Interactive Channel Drawer Trigger (Replaces # with clean title + chevron) */}
          <button
            type="button"
            onClick={() => setIsChannelsDrawerOpen(true)}
            className="flex items-center gap-2.5 min-w-0 p-1.5 -ml-1 rounded-2xl hover:bg-[var(--nested-bg)] transition-colors text-left pressable cursor-pointer group flex-1 max-w-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {React.createElement(getChannelVectorIcon(activeChannel.icon), { className: 'w-4 h-4 text-violet-500' })}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-[var(--text-primary)] text-xs sm:text-sm truncate">
                  {formatChannelDisplayName(activeChannel.name)}
                </h2>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-transform group-hover:translate-y-0.5 shrink-0" />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] truncate">
                {activeChannel.description || 'Tap to switch lounge'}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsChannelsDrawerOpen(true)}
            className="w-8 h-8 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center pressable"
            title="Open Lounges Drawer"
            aria-label="Open Lounges Drawer"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-[var(--nested-bg)] hover:border-[var(--card-hover-border)] border border-[var(--nested-border)] text-[var(--text-secondary)] transition-colors pressable"
            title="Safe Spaces Act and Community Rules"
            aria-label="Community Guidelines and Safety Rules"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#30D158]" />
            <span className="hidden sm:inline">Rules</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area with Daily Date Separators */}
      <div 
        className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3 bg-[var(--canvas-bg)]"
        role="log"
        aria-live="polite"
        aria-label={`Messages in ${formatChannelDisplayName(activeChannel.name)}`}
        onTouchStart={() => {
          if (isTyping) {
            (document.activeElement as HTMLElement)?.blur();
            setIsTyping(false);
          }
        }}
      >
        {channelMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center p-6 text-[var(--text-secondary)] select-none">
            <div className="w-14 h-14 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] flex items-center justify-center mb-3 text-violet-500 shadow-xs">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">
              Welcome to {formatChannelDisplayName(activeChannel.name)}
            </h3>
            <p className="text-xs max-w-xs text-[var(--text-secondary)] leading-relaxed">
              {activeChannel.description || 'No messages yet. Say hello to Davao students!'}
            </p>
          </div>
        ) : (
          channelMessages.map((msg, index) => {
            // Strict POV ownership calculation
            const isOwn = Boolean(
              (userSession?.uid && msg.senderUid && msg.senderUid === userSession.uid) ||
              (msg.id && localSentIdsRef.current.has(msg.id))
            );

            const badge = getSchoolBadgeStyle(msg.senderSchool || '');

            // Messenger/Instagram-Style Daily Date Separator
            const currentDayKey = getMessageDayKey(msg.createdMillis);
            const prevMsg = index > 0 ? channelMessages[index - 1] : null;
            const prevDayKey = prevMsg ? getMessageDayKey(prevMsg.createdMillis) : null;
            const showDateDivider = index === 0 || currentDayKey !== prevDayKey;
            const dateLabel = formatMessageDateSeparator(msg.createdMillis);
            const isEmbed = 
              (msg.messageType === 'route' && Boolean(msg.payloadJson)) ||
              (msg.messageType === 'traffic_alert' && (Boolean(msg.payloadJson) || msg.content.includes('[COMMUTE ALERT:'))) ||
              (msg.messageType === 'study_spot' && Boolean(msg.payloadJson)) ||
              ((msg.messageType === 'image' || msg.messageType === 'gif') && Boolean(msg.mediaUrl));
            const maxWClass = isEmbed ? 'w-full max-w-[96%] sm:max-w-[420px]' : 'max-w-[85%] sm:max-w-[75%]';

            return (
              <React.Fragment key={msg.id || index}>
                {/* Centered Daily Date Pill */}
                {showDateDivider && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3.5 py-1 rounded-full text-[10px] font-bold bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] shadow-xs select-none">
                      {dateLabel}
                  </span>
                </div>
              )}

              {/* Message Item */}
              <div
                className={`group flex gap-2.5 ${maxWClass} min-w-0 ${isOwn ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar with click to inspect profile */}
                <button
                  type="button"
                  onClick={() => handleOpenProfile(msg)}
                  aria-label={`View ${msg.senderName} profile`}
                  className="w-8 h-8 rounded-full border border-[var(--nested-border)] flex items-center justify-center shrink-0 overflow-hidden cursor-pointer transition-transform active:scale-95 hover:ring-2 hover:ring-[#8B5CF6]/50"
                >
                  <CachedAvatar
                    src={msg.senderAvatar}
                    name={msg.senderName}
                    username={msg.senderUsername}
                    size="sm"
                  />
                </button>

                {/* Message Body Container */}
                <div className="space-y-1 flex-1 min-w-0 max-w-full">
                  <div className={`flex items-center gap-1.5 flex-wrap ${isOwn ? 'justify-end' : ''}`}>
                    <button
                      type="button"
                      onClick={() => handleOpenProfile(msg)}
                      className="font-bold text-xs text-[var(--text-primary)] hover:text-[#8B5CF6] transition-colors cursor-pointer text-left pressable truncate max-w-[120px] sm:max-w-none"
                    >
                      {msg.senderName}
                    </button>
                    {msg.senderUsername && (
                      <span className="text-[10px] text-[#8B5CF6]/80 font-medium">
                        @{msg.senderUsername}
                      </span>
                    )}

                    {msg.isVerified && (
                      <span title="Verified Dabawenyo Student" className="inline-flex">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#30D158] fill-[#30D158]/20 shrink-0" />
                      </span>
                    )}

                    {/* Role Badge (Admin / Faculty / Moderator) */}
                    {msg.senderRole && msg.senderRole !== 'student' && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                        msg.senderRole === 'admin' 
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/25'
                          : msg.senderRole === 'teacher'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                      }`}>
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>{msg.senderRole === 'teacher' ? 'Faculty' : msg.senderRole}</span>
                      </span>
                    )}

                    {/* School Tag Badge */}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${badge.className}`}>
                      <School className="w-2.5 h-2.5 opacity-80" />
                      <span>{badge.label}</span>
                    </span>

                    {/* Preset Academic / College Tag */}
                    {msg.presetTag && msg.presetTag !== badge.label && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {msg.presetTag}
                      </span>
                    )}

                    {/* Custom User Tag Badge */}
                    {msg.customTag && (
                      <span 
                        className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide border shadow-2xs"
                        style={{
                          backgroundColor: msg.customTagBg || 'rgba(139, 92, 246, 0.15)',
                          color: msg.customTagColor || 'var(--text-primary)',
                          borderColor: msg.customTagBg ? `${msg.customTagBg}40` : 'var(--card-border)'
                        }}
                      >
                        {msg.customTag}
                      </span>
                    )}

                    <span className="text-[10px] text-[var(--text-secondary)] ml-0.5">{msg.timestamp}</span>

                    {!isOwn && (
                      <button
                        onClick={() => setReportingMessage(msg)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-tertiary)] hover:text-[#FF453A] transition-opacity"
                        title="Report message"
                        aria-label="Report message"
                      >
                        <Flag className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Message Content: Clean standalone embeds WITHOUT white outer card */}
                  {(() => {
                    const hasCustomText = shouldRenderMessageText(msg);
                    const isEmbed = 
                      (msg.messageType === 'route' && Boolean(msg.payloadJson)) ||
                      (msg.messageType === 'traffic_alert' && (Boolean(msg.payloadJson) || msg.content.includes('[COMMUTE ALERT:'))) ||
                      (msg.messageType === 'study_spot' && Boolean(msg.payloadJson)) ||
                      ((msg.messageType === 'image' || msg.messageType === 'gif') && Boolean(msg.mediaUrl));
                    const isEmbedOnly = isEmbed && !hasCustomText;

                    if (isEmbedOnly) {
                      return (
                        <div className={`w-full min-w-0 max-w-full flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          {(msg.messageType === 'image' || msg.messageType === 'gif') && msg.mediaUrl && (
                            <div 
                              className={`rounded-2xl overflow-hidden cursor-pointer shadow-xs border border-[var(--card-border)]/50 w-fit max-w-full ${isOwn ? 'ml-auto' : ''}`} 
                              onClick={() => setSelectedImageUrl(msg.mediaUrl || null)}
                            >
                              <img 
                                src={msg.mediaUrl} 
                                alt="Shared media" 
                                className="max-h-72 w-auto max-w-full block rounded-2xl object-cover hover:opacity-95 transition-opacity" 
                                loading="lazy"
                              />
                            </div>
                          )}

                          {msg.messageType === 'route' && msg.payloadJson && (
                            <ChatRouteCard payload={msg.payloadJson} onViewRoute={handleViewRouteOnMap} />
                          )}

                          {msg.messageType === 'traffic_alert' && msg.payloadJson && (
                            <ChatAlertCard payload={msg.payloadJson} />
                          )}

                          {(msg.messageType === 'traffic_alert' || msg.content.includes('[COMMUTE ALERT:')) && !msg.payloadJson && (
                            <ChatAlertCard 
                              payload={{
                                category: 'Commute Alert',
                                location: 'Davao Commute',
                                description: msg.content.replace(/^.*?\[COMMUTE ALERT:.*?\]\s*/i, '') || msg.content
                              }} 
                            />
                          )}

                          {msg.messageType === 'study_spot' && msg.payloadJson && (
                            <ChatSpotCard payload={msg.payloadJson} onViewSpot={handleViewSpot} />
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className={`space-y-1.5 w-full min-w-0 max-w-full flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        {hasCustomText && (
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed max-w-full ${
                              isOwn
                                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-medium rounded-tr-xs shadow-xs'
                                : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-tl-xs shadow-xs'
                            }`}
                          >
                            {renderMessageContent(msg.content)}
                          </div>
                        )}

                        {(msg.messageType === 'image' || msg.messageType === 'gif') && msg.mediaUrl && (
                          <div 
                            className={`rounded-2xl overflow-hidden cursor-pointer shadow-xs border border-[var(--card-border)]/50 w-fit max-w-full ${isOwn ? 'ml-auto' : ''}`} 
                            onClick={() => setSelectedImageUrl(msg.mediaUrl || null)}
                          >
                            <img 
                              src={msg.mediaUrl} 
                              alt="Shared media" 
                              className="max-h-72 w-auto max-w-full block rounded-2xl object-cover hover:opacity-95 transition-opacity" 
                              loading="lazy"
                            />
                          </div>
                        )}

                        {msg.messageType === 'route' && msg.payloadJson && (
                          <ChatRouteCard payload={msg.payloadJson} onViewRoute={handleViewRouteOnMap} />
                        )}

                        {msg.messageType === 'traffic_alert' && msg.payloadJson && (
                          <ChatAlertCard payload={msg.payloadJson} />
                        )}

                        {msg.messageType === 'study_spot' && msg.payloadJson && (
                          <ChatSpotCard payload={msg.payloadJson} onViewSpot={handleViewSpot} />
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </React.Fragment>
          );
        }))}

        {/* OPTIMISTIC PHOTO UPLOAD BUBBLE WITH PROMINENT INDICATOR */}
        {uploadingMedia && (
          <div className="group flex gap-2.5 max-w-[92%] sm:max-w-[380px] min-w-0 ml-auto flex-row-reverse animate-fade-in">
            <div className="w-8 h-8 rounded-full border border-[var(--nested-border)] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              <CachedAvatar
                src={userSession?.avatar}
                name={userSession?.name}
                username={userSession?.username}
                size="sm"
              />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0 max-w-full">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-bold text-xs text-[var(--text-primary)]">
                  {userSession?.name || 'You'}
                </span>
                <span className="text-[10px] text-violet-500 font-semibold flex items-center gap-1 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  {uploadingMedia.status === 'optimizing' ? 'Compressing...' : (uploadingMedia.status === 'uploading' ? 'Sending photo...' : 'Failed')}
                </span>
              </div>

              {uploadingMedia.captionText && (
                <div className="p-3 rounded-2xl text-xs leading-relaxed bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-medium rounded-tr-xs shadow-xs ml-auto">
                  {uploadingMedia.captionText}
                </div>
              )}

              <div className="relative rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--nested-bg)] shadow-md max-w-sm ml-auto">
                {uploadingMedia.previewUrl ? (
                  <img
                    src={uploadingMedia.previewUrl}
                    alt="Uploading preview"
                    className="max-h-64 w-full object-cover filter blur-[1px] brightness-75 transition-all"
                  />
                ) : (
                  <div className="h-44 w-full bg-[var(--nested-bg)] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2.5 p-4 text-center">
                  {uploadingMedia.status === 'error' ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-white">
                        {uploadingMedia.errorMessage || 'Failed to upload'}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => uploadingMedia.rawSource && executeUploadPhoto(uploadingMedia.rawSource, uploadingMedia.captionText)}
                          className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all pressable cursor-pointer"
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadingMedia(null)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all pressable cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-black/60 border border-white/20 flex items-center justify-center shadow-lg backdrop-blur-md">
                        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white tracking-wide block">
                          {uploadingMedia.status === 'optimizing' 
                            ? 'Compressing Photo...' 
                            : (uploadingMedia.progress && uploadingMedia.progress > 0 
                                ? `Uploading Photo (${uploadingMedia.progress}%)...` 
                                : `Sending to ${formatChannelDisplayName(activeChannel.name)}...`)}
                        </span>
                        <span className="text-[10px] text-zinc-300 block">
                          {uploadingMedia.status === 'optimizing' 
                            ? 'Optimizing resolution for fast delivery' 
                            : 'Uploading secure encrypted chunks'}
                        </span>
                      </div>
                      <div className="w-36 h-1.5 rounded-full bg-white/20 overflow-hidden mt-1">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(uploadingMedia.progress || 10, 10)}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      {!userSession?.isLoggedIn ? (
        <div 
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
          className="p-3.5 border-t border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shrink-0"
        >
          <div>
            <h5 className="font-bold text-xs text-[var(--text-primary)]">
              Student Verification Required to Chat
            </h5>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Guests can read messages. Log in with Google to post.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signInWithGoogle(userSession?.campusId || 'addu-jacinto');
              window.location.reload();
            }}
            className="px-4 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold shrink-0 pressable shadow-sm"
          >
            Sign In with Google
          </button>
        </div>
      ) : !isChatEnabled ? (
        <div 
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
          className="p-3.5 border-t border-[var(--card-border)] bg-[var(--card-bg)] text-xs text-[#FF9F0A] flex items-center gap-2 shrink-0"
        >
          <Info className="w-4 h-4 shrink-0 text-[#FF9F0A]" />
          <span>Student Community Chat is currently paused for maintenance by administrator.</span>
        </div>
      ) : isBanned ? (
        <div 
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
          className="p-3.5 border-t border-[var(--card-border)] bg-[var(--card-bg)] text-xs text-[#FF453A] shrink-0"
        >
          Chat permissions suspended for {banRemainingMsg}. Reason: {liveProfile?.chatBanReason || 'Guidelines Violation'}.
        </div>
      ) : (
        <form 
          onSubmit={handleSendMessage} 
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
          }}
          className="p-3 border-t border-[var(--card-border)] bg-[var(--header-bg)]/95 backdrop-blur-xl space-y-2 shrink-0"
        >
          {moderationWarning && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FF453A]/15 border border-[#FF453A]/30 text-[#FF453A] text-xs font-semibold animate-slide-up">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{moderationWarning}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setModerationWarning(null)} 
                className="p-1 hover:opacity-75 pressable"
                aria-label="Dismiss warning"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STAGED ATTACHMENT PREVIEW (Telegram / Discord Style) */}
          {stagedAttachment && (
            <div className="flex items-center gap-2 px-1 pt-1 animate-slide-up">
              {stagedAttachment.type === 'photo' && (
                <div className="relative inline-block group">
                  <img
                    src={stagedAttachment.previewUrl}
                    alt="Attached preview"
                    className="h-16 w-16 object-cover rounded-2xl border border-[var(--card-border)] shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setStagedAttachment(null)}
                    aria-label="Remove attached photo"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors shadow-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {stagedAttachment.type === 'route' && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-xs text-[var(--text-primary)] shadow-xs max-w-full">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                    <Bus className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate flex-1 min-w-0">
                    <span className="font-bold">{stagedAttachment.data.routeName}</span>
                    {stagedAttachment.data.estimatedFare && (
                      <span className="text-[10px] text-[var(--text-secondary)] ml-1.5">{stagedAttachment.data.estimatedFare}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStagedAttachment(null)}
                    aria-label="Remove attached route"
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--card-bg)] transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {stagedAttachment.type === 'alert' && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#FF453A]/10 border border-[#FF453A]/25 text-xs text-[var(--text-primary)] shadow-xs max-w-full">
                  <span className="text-sm shrink-0">{stagedAttachment.data.icon || '⚠️'}</span>
                  <div className="truncate flex-1 min-w-0">
                    <span className="font-bold text-[#FF453A] mr-1">{stagedAttachment.data.category.toUpperCase()}</span>
                    <span className="text-[var(--text-secondary)]">• {stagedAttachment.data.location}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStagedAttachment(null)}
                    aria-label="Remove attached alert"
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--card-bg)] transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {stagedAttachment.type === 'spot' && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-[var(--text-primary)] shadow-xs max-w-full">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate flex-1 min-w-0">
                    <span className="font-bold">{stagedAttachment.data.name}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] ml-1.5">• {stagedAttachment.data.area}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStagedAttachment(null)}
                    aria-label="Remove attached study spot"
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--card-bg)] transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAttachmentDrawerOpen(true)}
              aria-label="Attach photo or transit card"
              className="p-2.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shrink-0 pressable"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              maxLength={MAX_MESSAGE_LENGTH}
              aria-label={`Send message to ${formatChannelDisplayName(activeChannel.name)}`}
              placeholder={
                slowModeCountdown > 0
                  ? `Slow mode: wait ${slowModeCountdown}s...`
                  : stagedAttachment
                  ? 'Add a caption or comment (optional)...'
                  : `Message ${formatChannelDisplayName(activeChannel.name)}...`
              }
              value={inputText}
              onFocus={() => {
                setIsTyping(true);
                setTimeout(scrollToBottom, 150);
              }}
              onBlur={() => {
                setIsTyping(false);
              }}
              onChange={(e) => {
                setInputText(e.target.value);
                if (moderationWarning) setModerationWarning(null);
              }}
              className="flex-1 px-4 py-2.5 text-xs rounded-2xl bg-[var(--input-bg)] border border-[var(--nested-border)] focus:border-[var(--card-hover-border)] text-[var(--input-text)] placeholder-[var(--text-tertiary)] focus:outline-hidden"
            />

            <button
              type="submit"
              aria-label="Send message"
              disabled={slowModeCountdown > 0 || (!inputText.trim() && !stagedAttachment)}
              className={`p-2.5 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-sm transition-all shrink-0 pressable ${
                slowModeCountdown > 0 || (!inputText.trim() && !stagedAttachment) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {slowModeCountdown > 0 ? (
                <span className="text-xs font-bold px-1">{slowModeCountdown}s</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      )}

      {/* RULES & SAFETY MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm sheet-backdrop-enter">
          <div className="bg-[var(--modal-bg)] w-full max-w-md rounded-3xl border border-[var(--card-border)] p-5 space-y-4 shadow-2xl sheet-enter-spring">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#30D158]" />
                <span>Student Lounge Rules &amp; Safety</span>
              </div>
              <button 
                onClick={() => setShowRulesModal(false)} 
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                aria-label="Close rules modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[var(--text-secondary)] leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)]">
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#FF9F0A]" />
                  <span>Republic Act No. 11313 Safe Spaces Act</span>
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Online gender-based sexual harassment, misogynistic/homophobic slurs, stalking, and non-consensual sharing of private information are strictly prohibited by law.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)]">
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#0A84FF]" />
                  <span>Davao City Anti-Discrimination Ordinance</span>
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  City Ordinance No. 0417-12 mandates equal respect across all campuses regardless of sex, gender identity, sexual orientation, race, religion, or social status.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)]">
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-[#FF453A]" />
                  <span>Academic Honesty &amp; Moderation</span>
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Sharing leaked examination questionnaires, answer keys, commercial spam, or malicious links will lead to immediate lockout and review by campus moderators.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--card-border)] flex justify-end">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs pressable"
              >
                Understood &amp; Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MESSAGE MODAL */}
      {reportingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm sheet-backdrop-enter">
          <div className="bg-[var(--modal-bg)] w-full max-w-sm rounded-3xl border border-[var(--card-border)] p-5 space-y-4 shadow-2xl sheet-enter-spring">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-2">
              <div className="flex items-center gap-2 text-[#FF453A] font-bold text-xs">
                <Flag className="w-4 h-4" />
                <span>Report Student Message</span>
              </div>
              <button onClick={() => setReportingMessage(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-xs text-[var(--text-secondary)] italic line-clamp-2">
              "{reportingMessage.content}"
            </div>

            {reportSuccess ? (
              <div className="p-3 rounded-2xl bg-[var(--nested-bg)] text-[var(--text-primary)] text-xs font-bold text-center">
                Report submitted. Thank you!
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Reason:</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: 'spam', label: 'Spam or Advertisement' },
                      { id: 'harassment', label: 'Harassment or Toxic Language' },
                      { id: 'misinformation', label: 'False Information' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setReportReason(r.id)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                          reportReason === r.id
                            ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--btn-primary-bg)] font-bold'
                            : 'bg-[var(--nested-bg)] border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--card-border)]">
                  <button
                    type="button"
                    onClick={() => setReportingMessage(null)}
                    className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-4 py-1.5 text-xs font-bold bg-[#FF453A] text-white rounded-full pressable"
                  >
                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* USER PROFILE INSPECTION MODAL */}
      <UserProfileModal
        isOpen={Boolean(inspectingProfile)}
        onClose={() => setInspectingProfile(null)}
        uid={inspectingProfile?.uid}
        username={inspectingProfile?.username}
        fallbackData={inspectingProfile?.fallbackData}
        onMentionUser={(targetUsername) => {
          setInputText((prev) => (prev ? `${prev.trim()} @${targetUsername} ` : `@${targetUsername} `));
        }}
      />

      {/* CHAT ATTACHMENT DRAWER */}
      <ChatAttachmentDrawer
        isOpen={isAttachmentDrawerOpen}
        onClose={() => setIsAttachmentDrawerOpen(false)}
        onImageUploaded={handleImageUploaded}
        onPhotoSelected={handleStagePhoto}
        senderUid={userSession?.uid}
        onOpenRoutePicker={() => {
          setIsAttachmentDrawerOpen(false);
          setIsRoutePickerOpen(true);
        }}
        onOpenAlertPicker={() => {
          setIsAttachmentDrawerOpen(false);
          setIsAlertPickerOpen(true);
        }}
        onOpenSpotPicker={() => {
          setIsAttachmentDrawerOpen(false);
          setIsSpotPickerOpen(true);
        }}
      />

      {/* ROUTE PICKER MODAL */}
      <ChatRoutePickerModal
        isOpen={isRoutePickerOpen}
        onClose={() => setIsRoutePickerOpen(false)}
        onSelectRoute={handleStageRoute}
      />

      {/* COMMUTE ALERT PICKER MODAL */}
      <ChatAlertPickerModal
        isOpen={isAlertPickerOpen}
        onClose={() => setIsAlertPickerOpen(false)}
        onSendAlert={handleStageAlert}
      />

      {/* STUDY SPOT PICKER MODAL */}
      <ChatSpotPickerModal
        isOpen={isSpotPickerOpen}
        onClose={() => setIsSpotPickerOpen(false)}
        onSelectSpot={handleStageSpot}
      />

      {/* FULLSCREEN IMAGE LIGHTBOX VIEWER */}
      <ChatImageViewerModal
        isOpen={Boolean(selectedImageUrl)}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />

      {/* CHANNELS & LOUNGES DRAWER */}
      <ChatChannelsDrawer
        isOpen={isChannelsDrawerOpen}
        onClose={() => setIsChannelsDrawerOpen(false)}
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel}
        onOpenRules={() => setShowRulesModal(true)}
      />
    </div>
  );
};

