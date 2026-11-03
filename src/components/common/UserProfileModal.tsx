import React, { useState, useEffect } from 'react';
import { 
  X, 
  School, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  Copy, 
  Check, 
  AtSign, 
  MessageSquare,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { getPublicUserProfile, UserAccountRecord } from '../../services/userService';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { CachedAvatar } from './CachedAvatar';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  onMentionUser?: (username: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  uid,
  username,
  fallbackData,
  onMentionUser
}) => {
  const [profile, setProfile] = useState<UserAccountRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setProfile(null);
      setCopied(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getPublicUserProfile({ uid, username })
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Profile fetch error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, uid, username]);

  if (!isOpen) return null;

  // Resolve fields with prioritized fallbacks for older accounts
  const displayName = profile?.displayName || fallbackData?.name || 'Davao Student';
  const displayUsername = profile?.username || fallbackData?.username || '';
  const avatar = profile?.avatar || fallbackData?.avatar || '';
  const isVerified = Boolean(profile?.isVerified ?? fallbackData?.isVerified);
  const role = profile?.role || fallbackData?.role || 'student';

  // Campus resolution
  const matchedCampus = DAVAO_CAMPUSES.find((c) => c.id === profile?.campusId);
  const campusName = matchedCampus?.name || fallbackData?.school || profile?.campusId || 'Davao Campus';

  const course = profile?.course || '';
  const yearLevel = profile?.yearLevel || '';

  // Tags
  const presetTag = profile?.presetTag || fallbackData?.presetTag;
  const customTag = profile?.customTag || fallbackData?.customTag;
  const customTagBg = profile?.customTagBg || fallbackData?.customTagBg || '#8B5CF6';
  const customTagColor = profile?.customTagColor || fallbackData?.customTagColor || '#ffffff';

  // Format joined date
  const joinedDate = profile?.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const handleCopyUsername = () => {
    const textToCopy = displayUsername ? `@${displayUsername}` : displayName;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMention = () => {
    if (onMentionUser && displayUsername) {
      onMentionUser(displayUsername);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm sheet-backdrop-enter">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] overflow-hidden shadow-2xl sheet-enter-spring animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Student Profile"
      >
        {/* Cover Header Banner */}
        <div className="h-24 bg-gradient-to-tr from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] relative flex items-start justify-end p-3">
          <button
            onClick={onClose}
            aria-label="Close profile modal"
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors pressable cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Content Body */}
        <div className="px-5 pb-5 -mt-12 space-y-4">
          {/* Avatar and Badges Row */}
          <div className="flex items-end justify-between">
            <div className="relative">
              <CachedAvatar
                src={avatar}
                name={displayName}
                username={displayUsername}
                shape="rounded"
                size="xl"
                className="w-20 h-20 border-4 border-[var(--modal-bg)] shadow-md"
              />
              {isVerified && (
                <div 
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#30D158] text-white flex items-center justify-center shadow-xs border-2 border-[var(--modal-bg)]"
                  title="Verified Davao Student"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)]">
                {role === 'teacher' ? 'Faculty' : 'Student'}
              </span>

              {presetTag && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6]">
                  {presetTag}
                </span>
              )}

              {customTag && (
                <span 
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs"
                  style={{ backgroundColor: customTagBg, color: customTagColor }}
                >
                  {customTag}
                </span>
              )}
            </div>
          </div>

          {/* User Name & Handle */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                {displayName}
              </h3>
              {isVerified && (
                <ShieldCheck className="w-4 h-4 text-[#30D158] shrink-0" />
              )}
            </div>
            {displayUsername && (
              <p className="text-xs text-[#8B5CF6] font-semibold flex items-center gap-0.5">
                <span>@{displayUsername}</span>
              </p>
            )}
          </div>

          {/* Details Inset Card */}
          <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-2.5 text-xs">
            {/* Campus */}
            <div className="flex items-start gap-2.5">
              <School className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Campus
                </span>
                <span className="font-semibold text-[var(--text-primary)] leading-tight block">
                  {campusName}
                </span>
              </div>
            </div>

            {/* Program / Course */}
            {(course || yearLevel) && (
              <div className="flex items-start gap-2.5 pt-2 border-t border-[var(--card-border)]">
                <GraduationCap className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                    Academic Program
                  </span>
                  <span className="font-semibold text-[var(--text-primary)] leading-tight block">
                    {[course, yearLevel].filter(Boolean).join(' • ')}
                  </span>
                </div>
              </div>
            )}

            {/* Gender Identity */}
            {profile?.gender && profile.gender !== 'Prefer not to say' && (
              <div className="flex items-start gap-2.5 pt-2 border-t border-[var(--card-border)]">
                <UserCheck className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                    Gender Identity
                  </span>
                  <span className="font-semibold text-[var(--text-primary)] leading-tight block">
                    {profile.gender}
                  </span>
                </div>
              </div>
            )}

            {/* Member Since */}
            {joinedDate && (
              <div className="flex items-start gap-2.5 pt-2 border-t border-[var(--card-border)]">
                <Calendar className="w-4 h-4 text-[var(--text-secondary)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                    Member Since
                  </span>
                  <span className="font-semibold text-[var(--text-primary)] leading-tight block">
                    {joinedDate}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCopyUsername}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors pressable cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#30D158]" />
                  <span className="text-[#30D158]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span>Copy Username</span>
                </>
              )}
            </button>

            {onMentionUser && displayUsername && (
              <button
                onClick={handleMention}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-sm pressable cursor-pointer"
              >
                <AtSign className="w-3.5 h-3.5" />
                <span>Mention</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
