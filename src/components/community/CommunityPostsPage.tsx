import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Search, 
  Plus, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreVertical, 
  Trash2, 
  Flag, 
  X, 
  Send, 
  Image as ImageIcon, 
  Pin, 
  Building2, 
  Check, 
  Clock,
  MessageSquarePlus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  CommunityPost, 
  CommunityComment, 
  fetchCommunityPosts, 
  createCommunityPost, 
  toggleLikePost, 
  fetchPostComments, 
  addPostComment, 
  deleteCommunityPost, 
  reportCommunityPost 
} from '../../services/communityService';
import { StudentAuthSession } from '../../services/authService';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { PageIntroGuide } from '../common/PageIntroGuide';
import { shareContent } from '../../services/shareService';
import { CommunityLoginPromptModal } from './CommunityLoginPromptModal';
import { CommunityReportModal } from './CommunityReportModal';
import { CachedAvatar } from '../common/CachedAvatar';
import { CustomSelect, CustomSelectOption } from '../common/CustomSelect';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

interface CommunityPostsPageProps {
  userSession?: StudentAuthSession;
  onOpenAuth?: () => void;
}

export const CommunityPostsPage: React.FC<CommunityPostsPageProps> = ({
  userSession,
  onOpenAuth
}) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginActionName, setLoginActionName] = useState('post or interact');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Lightbox
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Report Modal state
  const [reportingPost, setReportingPost] = useState<CommunityPost | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Comments drawer state
  const [activeCommentsPost, setActiveCommentsPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Composer form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('academic');
  const [newCampusId, setNewCampusId] = useState(userSession?.campusId || 'all');
  const [newImageData, setNewImageData] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Delete Confirmation Modal state
  const [postToDelete, setPostToDelete] = useState<CommunityPost | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState<boolean>(false);

  // Hardware Back Button Interception (Guaranteed declared after all state initializations)
  useBackHandler(Boolean(postToDelete), () => setPostToDelete(null), BackPriority.MODAL, 'community_delete_modal');
  useBackHandler(Boolean(viewingImage), () => setViewingImage(null), BackPriority.MODAL, 'community_lightbox');
  useBackHandler(Boolean(reportingPost), () => setReportingPost(null), BackPriority.MODAL, 'community_report');
  useBackHandler(isComposerOpen, () => setIsComposerOpen(false), BackPriority.MODAL, 'community_composer');
  useBackHandler(Boolean(activeCommentsPost), () => setActiveCommentsPost(null), BackPriority.MODAL, 'community_comments');
  useBackHandler(isLoginModalOpen, () => setIsLoginModalOpen(false), BackPriority.MODAL, 'community_login');

  // Prevent background scroll when image lightbox is open
  useEffect(() => {
    if (viewingImage) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [viewingImage]);

  const CATEGORY_OPTIONS: CustomSelectOption[] = [
    { value: 'academic', label: 'Academic & Q&A' },
    { value: 'campus_life', label: 'Campus Life & Events' },
    { value: 'lost_found', label: 'Lost & Found' },
    { value: 'reviewer_swap', label: 'Reviewers & Swaps' },
    { value: 'general', label: 'General Discussion' }
  ];

  const CAMPUS_OPTIONS: CustomSelectOption[] = [
    { value: 'all', label: 'All Davao Campuses' },
    ...DAVAO_CAMPUSES.map((c) => ({ value: c.id, label: c.shortName || c.name }))
  ];

  const userCampus = DAVAO_CAMPUSES.find((c) => c.id === userSession?.campusId);
  const isLoggedIn = Boolean(userSession?.isLoggedIn && userSession?.uid);

  // ─── Guest Guard Helper ───────────────────────────────────────────────────────
  const requireAuth = (actionName: string, callback: () => void) => {
    if (!isLoggedIn) {
      setLoginActionName(actionName);
      setIsLoginModalOpen(true);
      return;
    }
    callback();
  };

  // ─── Fetch Feed ─────────────────────────────────────────────────────────────
  const loadPosts = async () => {
    setLoading(true);
    const data = await fetchCommunityPosts({
      category: selectedCategory,
      campusId: selectedCategory === 'my_campus' ? userSession?.campusId : undefined,
      search: searchQuery.trim() || undefined,
      userId: userSession?.uid
    });
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, userSession?.uid]);

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      loadPosts();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ─── Likes Handler ──────────────────────────────────────────────────────────
  const handleToggleLike = async (postId: number) => {
    requireAuth('upvote posts', async () => {
      // Optimistic UI update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const willLike = !p.hasLiked;
            return {
              ...p,
              hasLiked: willLike,
              likesCount: willLike ? p.likesCount + 1 : Math.max(p.likesCount - 1, 0)
            };
          }
          return p;
        })
      );

      const res = await toggleLikePost(postId, userSession?.uid);
      if (res.requiresAuth) {
        setIsLoginModalOpen(true);
        loadPosts();
      } else if (!res.success) {
        loadPosts(); // Revert on failure
      }
    });
  };

  // ─── Comments Drawer Handlers ────────────────────────────────────────────────
  const handleOpenComments = async (post: CommunityPost) => {
    setActiveCommentsPost(post);
    setLoadingComments(true);
    const list = await fetchPostComments(post.id);
    setComments(list);
    setLoadingComments(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentsPost || !commentInput.trim()) return;

    requireAuth('leave a comment', async () => {
      setSubmittingComment(true);
      const res = await addPostComment(activeCommentsPost.id, commentInput.trim(), userSession?.uid);
      setSubmittingComment(false);

      if (res.requiresAuth) {
        setIsLoginModalOpen(true);
        return;
      }

      if (res.success && res.comment) {
        setComments((prev) => [...prev, res.comment!]);
        setCommentInput('');
        // Increment count in feed
        setPosts((prev) =>
          prev.map((p) => (p.id === activeCommentsPost.id ? { ...p, commentsCount: p.commentsCount + 1 } : p))
        );
      } else if (res.error) {
        showToast(res.error || 'Failed to submit comment');
      }
    });
  };

  // ─── Image Compression for Composer ──────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Photo exceeds 10MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rawBase64 = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1000;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          setNewImageData(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          setNewImageData(rawBase64);
        }
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  // ─── Post Submission ────────────────────────────────────────────────────────
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    requireAuth('create a post', async () => {
      setIsPublishing(true);
      setComposerError(null);

      const res = await createCommunityPost({
        title: newTitle.trim() || undefined,
        content: newContent.trim(),
        category: newCategory,
        campusId: newCampusId,
        imageData: newImageData || null,
        userId: userSession?.uid,
        authorName: userSession?.name,
        authorAvatar: userSession?.avatar
      });

      setIsPublishing(false);

      if (res.requiresAuth) {
        setIsLoginModalOpen(true);
        return;
      }

      if (res.success && res.post) {
        setPosts((prev) => [res.post!, ...prev]);
        setIsComposerOpen(false);
        setNewTitle('');
        setNewContent('');
        setNewImageData(null);
      } else {
        setComposerError(res.error || 'Failed to publish post. Please try again.');
      }
    });
  };

  // ─── Delete Post (Custom Themed In-App Confirmation Modal) ────────────────
  const handleDeletePost = (post: CommunityPost) => {
    setPostToDelete(post);
  };

  const handleConfirmDeletePost = async () => {
    if (!postToDelete) return;
    setIsDeletingPost(true);
    try {
      const res = await deleteCommunityPost(postToDelete.id, userSession?.uid);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
        if (activeCommentsPost?.id === postToDelete.id) {
          setActiveCommentsPost(null);
        }
        setPostToDelete(null);
        showToast('Discussion post deleted');
      } else {
        showToast(res.error || 'Failed to delete post');
      }
    } catch {
      showToast('Network error while deleting post');
    } finally {
      setIsDeletingPost(false);
    }
  };

  // ─── Report Post ────────────────────────────────────────────────────────────
  const handleOpenReport = (post: CommunityPost) => {
    setReportingPost(post);
  };

  const handleConfirmReport = async (reason: string) => {
    if (!reportingPost) return;
    setIsSubmittingReport(true);
    try {
      const res = await reportCommunityPost(reportingPost.id, reason, userSession?.uid);
      if (res.success) {
        setReportingPost(null);
        showToast('Report submitted for moderation. Thank you!');
      } else {
        showToast(res.error || 'Failed to submit report. Please try again.');
      }
    } catch {
      showToast('Network error submitting report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // ─── Share Post ─────────────────────────────────────────────────────────────
  const handleShare = async (post: CommunityPost) => {
    const shareText = `[Davao Student Community]\n${post.title ? post.title + '\n' : ''}${post.content}\n\nShared via SkwelaDabaw App`;
    const res = await shareContent(post.title || 'Community Post', shareText);
    if (res.action === 'copied') {
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6 animate-fade-in select-none">
      <PageIntroGuide
        pageKey="community"
        icon={<Users className="w-6 h-6 text-white" />}
        title="Davao Student Community"
        description="Campus Q&amp;A, study advice, lost &amp; found notices, and student org announcements across all Davao colleges."
        tips={[
          'Explore questions from classmates or filter by your campus.',
          'Sign in with Google to create posts, upvote, and reply.'
        ]}
      />

      {/* Top Composer Trigger Box */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3 shadow-xs">
        <div className="flex items-center gap-3">
          <CachedAvatar
            src={userSession?.avatar}
            name={userSession?.name}
            username={userSession?.username}
            shape="rounded"
            size="md"
            className="w-10 h-10 border border-[var(--nested-border)]"
          />

          <button
            onClick={() => requireAuth('create a post', () => setIsComposerOpen(true))}
            className="flex-1 text-left px-4 py-2.5 rounded-full bg-[var(--nested-bg)] hover:bg-[var(--nested-border)] text-xs text-[var(--text-secondary)] border border-[var(--nested-border)] transition-colors cursor-pointer"
          >
            {isLoggedIn 
              ? `What's happening on campus, ${userSession?.name?.split(' ')[0] || 'Student'}?`
              : 'Have a campus question or tip? Tap to post...'}
          </button>

          <button
            onClick={() => requireAuth('create a post', () => setIsComposerOpen(true))}
            className="px-4 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs pressable cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Discussion</span>
          </button>
        </div>
      </div>

      {/* Search & Category Pills */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search discussions (e.g. 'AdDU printing', 'lost ID', 'calculus reviewer')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--card-hover-border)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Discussions' },
            { id: 'my_campus', label: userCampus ? userCampus.shortName : 'My Campus' },
            { id: 'academic', label: 'Academic & Q&A' },
            { id: 'campus_life', label: 'Campus Life' },
            { id: 'lost_found', label: 'Lost & Found' },
            { id: 'reviewer_swap', label: 'Reviewers & Swaps' },
            { id: 'general', label: 'General' },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 pressable ${
                  isSelected
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-bold shadow-xs'
                    : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-secondary)]">
            Loading community feed...
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-1">
            <Users className="w-6 h-6 text-[var(--text-primary)] mx-auto mb-1 opacity-50" />
            <h4 className="font-bold text-sm text-[var(--text-primary)]">No discussions yet</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Be the first to start a conversation or ask a campus question!
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const isOwnPost = Boolean(userSession?.uid && post.userId === userSession.uid);
            const isAdmin = userSession?.role === 'admin';
            const campusObj = DAVAO_CAMPUSES.find((c) => c.id === post.campusId);

            return (
              <div
                key={post.id}
                className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] space-y-3 transition-all"
              >
                {/* Author Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CachedAvatar
                      src={post.authorAvatar}
                      name={post.authorName}
                      shape="rounded"
                      size="sm"
                      className="w-9 h-9 border border-[var(--nested-border)]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-[var(--text-primary)]">
                          {post.authorName}
                        </span>
                        {post.isVerified && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                            Verified
                          </span>
                        )}
                        {post.authorTag && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)]">
                            {post.authorTag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] pt-0.5">
                        <span>{campusObj ? campusObj.shortName : (post.campusId === 'all' ? 'Davao Citywide' : post.campusId)}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  {post.isPinned && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                      <Pin className="w-2.5 h-2.5" />
                      <span>Pinned</span>
                    </span>
                  )}
                </div>

                {/* Post Body */}
                <div className="space-y-1">
                  {post.title && (
                    <h4 className="font-bold text-sm text-[var(--text-primary)] leading-snug">
                      {post.title}
                    </h4>
                  )}
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>

                {/* Attached Image */}
                {post.imageUrl && (
                  <div
                    onClick={() => setViewingImage(post.imageUrl || null)}
                    className="rounded-2xl overflow-hidden max-h-72 bg-black/5 dark:bg-white/5 border border-[var(--nested-border)] flex items-center justify-center cursor-pointer pressable"
                  >
                    <img src={post.imageUrl} alt="Attached poster" className="w-full h-auto max-h-72 object-cover rounded-2xl" loading="lazy" />
                  </div>
                )}

                {/* Footer Controls */}
                <div className="pt-2 border-t border-[var(--card-border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border transition-colors cursor-pointer ${
                        post.hasLiked 
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold' 
                          : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--nested-border)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${post.hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{post.likesCount}</span>
                    </button>

                    <button
                      onClick={() => handleOpenComments(post)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.commentsCount}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleShare(post)}
                      className="p-1.5 rounded-lg bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      title="Share"
                    >
                      {copiedId === post.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>

                    {isOwnPost || isAdmin ? (
                      <button
                        onClick={() => handleDeletePost(post)}
                        className="p-1.5 rounded-lg bg-[var(--nested-bg)] border border-[var(--nested-border)] text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => requireAuth('report posts', () => handleOpenReport(post))}
                        className="p-1.5 rounded-lg bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-red-400 transition-colors cursor-pointer"
                        title="Report Violation"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Comments Drawer */}
      {activeCommentsPost && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sheet-backdrop-enter">
          <div className="w-full max-w-lg max-h-[85vh] bg-[var(--modal-bg)] border-t border-[var(--card-border)] rounded-t-3xl p-5 sheet-enter-spring flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-2.5">
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Comments &amp; Discussion</h4>
                <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-xs">{activeCommentsPost.title || activeCommentsPost.content}</p>
              </div>
              <button onClick={() => setActiveCommentsPost(null)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[150px] max-h-[50vh]">
              {loadingComments ? (
                <div className="text-center py-8 text-xs text-[var(--text-secondary)]">Loading replies...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-secondary)]">No comments yet. Start the conversation!</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[var(--text-primary)]">{c.authorName}</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input or Guest Banner */}
            {isLoggedIn ? (
              <form onSubmit={handleAddComment} className="pt-2 border-t border-[var(--card-border)] flex items-center gap-2">
                <input
                  type="text"
                  required
                  maxLength={300}
                  placeholder="Write a helpful reply..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value.slice(0, 300))}
                  className="flex-1 px-3.5 py-2 text-xs rounded-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentInput.trim()}
                  className="px-4 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs disabled:opacity-50 pressable flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="pt-2 border-t border-[var(--card-border)] flex items-center justify-between p-2.5 rounded-2xl bg-[var(--nested-bg)]">
                <span className="text-xs text-[var(--text-secondary)]">Sign in to join this discussion</span>
                <button
                  type="button"
                  onClick={() => requireAuth('comment', () => {})}
                  className="px-3.5 py-1.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-xs"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button for New Discussion (Mounted directly to body to prevent scroll displacement) */}
      {typeof document !== 'undefined' && createPortal(
        <button
          type="button"
          onClick={() => requireAuth('create a post', () => setIsComposerOpen(true))}
          className="fixed bottom-[calc(max(env(safe-area-inset-bottom),1rem)+4.5rem)] right-4 md:bottom-10 md:right-8 z-40 px-4 py-2.5 rounded-full bg-[var(--brand-primary)] text-[var(--brand-contrast)] font-bold text-xs shadow-xl shadow-black/25 flex items-center gap-2 pressable hover:opacity-95 active:scale-95 transition-all cursor-pointer border border-white/20 select-none"
          aria-label="Start new discussion"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="tracking-wide">Discussion</span>
        </button>,
        document.body
      )}

      {/* Post Composer Modal mounted directly to document.body to ensure perfect center viewport positioning */}
      {isComposerOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--card-bg)] w-full max-w-lg rounded-3xl border border-[var(--card-border)] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-up">
            {/* Pinned Sticky Header */}
            <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-4 shrink-0 bg-[var(--card-bg)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/30 flex items-center justify-center text-[var(--brand-primary)]">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Create Community Discussion
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsComposerOpen(false)} 
                className="p-1.5 rounded-full hover:bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="community_post_form" onSubmit={handleSubmitPost} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 touch-scroll">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Discussion Title (Optional)</label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Lost Blue AquaFlask at AdDU Jacinto Gate"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value.slice(0, 120))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-[var(--input-text)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Category</label>
                  <CustomSelect
                    options={CATEGORY_OPTIONS}
                    value={newCategory}
                    onChange={(val) => setNewCategory(val)}
                    triggerClassName="w-full text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Campus Target</label>
                  <CustomSelect
                    options={CAMPUS_OPTIONS}
                    value={newCampusId}
                    onChange={(val) => setNewCampusId(val)}
                    triggerClassName="w-full text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Message Details *</label>
                  <span className={`text-[10px] font-mono ${newContent.length >= 900 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                    {newContent.length}/1000
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={1000}
                  placeholder="Share details, questions, or helpful context for classmates..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value.slice(0, 1000))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-[var(--input-text)] resize-none focus:outline-none"
                />
              </div>

              {/* Photo Attachment */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                    <span>Attach Photo (Optional)</span>
                  </label>
                  {newImageData && (
                    <button type="button" onClick={() => setNewImageData(null)} className="text-[11px] text-red-500 font-semibold hover:underline cursor-pointer">
                      Remove
                    </button>
                  )}
                </div>

                {newImageData ? (
                  <div className="relative rounded-xl overflow-hidden max-h-44 border border-[var(--nested-border)] bg-black/10 flex items-center justify-center">
                    <img src={newImageData} alt="Preview" className="w-full h-auto max-h-44 object-contain" />
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[var(--nested-border)] rounded-xl cursor-pointer hover:border-[var(--card-hover-border)] transition-colors">
                    <span className="text-[11px] font-medium text-[var(--text-secondary)]">Tap to select photo from gallery</span>
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>
                )}
              </div>

              {composerError && (
                <p className="text-xs text-red-500 font-medium">{composerError}</p>
              )}
            </form>

            {/* Pinned Sticky Footer */}
            <div className="flex gap-2.5 px-5 py-3.5 border-t border-[var(--card-border)] bg-[var(--card-bg)] shrink-0">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="flex-1 py-2.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="community_post_form"
                disabled={isPublishing || !newContent.trim()}
                className="flex-1 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable disabled:opacity-50 transition-all cursor-pointer"
              >
                {isPublishing ? (newImageData ? 'Uploading photo...' : 'Publishing...') : 'Publish Discussion'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Guest Login Required Modal */}
      <CommunityLoginPromptModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        actionName={loginActionName}
        onSignIn={() => {
          setIsLoginModalOpen(false);
          if (onOpenAuth) onOpenAuth();
        }}
      />

      {/* Custom Theme-Aware Community Report Modal */}
      <CommunityReportModal
        isOpen={Boolean(reportingPost)}
        post={reportingPost}
        onClose={() => setReportingPost(null)}
        onSubmit={handleConfirmReport}
        isSubmitting={isSubmittingReport}
      />

      {/* Custom Themed In-App Delete Confirmation Modal */}
      {postToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => !isDeletingPost && setPostToDelete(null)}
        >
          <div 
            className="w-full max-w-sm rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] p-5 sm:p-6 shadow-2xl flex flex-col gap-4 sheet-enter-spring"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                  Delete Discussion Post
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)]/60 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p className="font-medium text-[var(--text-primary)] line-clamp-2 mb-1">
                "{postToDelete.title || postToDelete.content.slice(0, 80)}"
              </p>
              <p className="text-[11px]">
                Are you sure you want to permanently delete this discussion from the campus feed?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] text-[var(--text-primary)] font-semibold text-xs border border-[var(--card-border)] transition-colors pressable cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={handleConfirmDeletePost}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-md transition-all pressable cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeletingPost ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingPost ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lightbox for viewing photos (Mounted directly to body with scroll & touch locks) */}
      {viewingImage && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none touch-none overscroll-contain"
          onClick={() => setViewingImage(null)}
          onTouchMove={(e) => e.preventDefault()}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              aria-label="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={viewingImage}
              alt="Community poster"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>,
        document.body
      )}

      {/* In-App Toast Banner */}
      {toastMessage && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[130] px-4 py-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-2xl text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 animate-fade-in select-none pointer-events-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>,
        document.body
      )}
    </div>
  );
};
