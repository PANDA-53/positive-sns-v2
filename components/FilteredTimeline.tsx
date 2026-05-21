'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ReactionButtons } from './reaction-buttons'
import { ReplyActionButtons } from './reply-action-buttons' 
import { toast } from 'sonner'
import { deletePost, reportPost, reportReply, fetchMorePosts } from '@/app/actions'
import { useRouter } from 'next/navigation'
import ReplyForm from './ReplyForm'
import { BottomNav } from './bottom-nav' 
import { Globe, Lock, MessageCircle, Trash2, AlertTriangle, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"
const GOLD_COLOR = "#B8860B"; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface FilteredTimelineProps {
  mainPosts: any[];
  replies: any[];
  user: any;
  profile?: any; 
  friendIds: string[];
  onSuccess?: (...args: any[]) => void; 
  viewModeProp?: 'all' | 'friends'; 
}

export default function FilteredTimeline({ 
  mainPosts = [], 
  replies = [], 
  user, 
  profile, 
  friendIds = [], 
  onSuccess, 
  viewModeProp = 'all'
}: FilteredTimelineProps) {
  const [timelinePosts, setTimelinePosts] = useState<any[]>(Array.isArray(mainPosts) ? mainPosts : []);
  const [timelineReplies, setTimelineReplies] = useState<any[]>(Array.isArray(replies) ? replies : []);
  const [isJustPosted, setIsJustPosted] = useState(false);
  
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const [reportedPostIds, setReportedPostIds] = useState<Record<number, boolean>>({});
  const [activeMedia, setActiveMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
  
  const [activeReplyTargets, setActiveReplyTargets] = useState<Record<number, { id: number; name: string } | null>>({});

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // 親からのデータを同期
  useEffect(() => {
    // 💡 投稿直後（0秒反映中）なら、親からの古いデータによる上書きを無視する！
    if (isJustPosted) {
      setIsJustPosted(false); // 次回のためにフラグを戻しておく
      return;
    }

    const safePosts = Array.isArray(mainPosts) ? mainPosts : [];
    setTimelinePosts([...safePosts]); 
    setHasMore(safePosts.length >= 20);
  }, [mainPosts]);

  useEffect(() => {
    setTimelineReplies(Array.isArray(replies) ? replies : []);
  }, [replies]);

  // リアルタイム監視（削除検知など）
  useEffect(() => {
    const channel = supabase
      .channel('timeline-realtime-changes')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'posts', 
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setTimelinePosts((current) => current.filter((p) => p && p.id !== payload.old.id));
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // 無限スクロールの監視（依存配列を件数に指定してクラッシュ防止）
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [timelinePosts.length, hasMore, isLoadingMore]);

  // 💡 常に最新の profile と user をロックせずに追従させるための Ref を用意
  const latestProfileRef = useRef(profile);
  const latestUserRef = useRef(user);

  // レンダーのたびに、Ref の中身を最新状態に更新しておく
  latestProfileRef.current = profile;
  latestUserRef.current = user;

  // 💡 0秒反映用のイベント監視 useEffect
  useEffect(() => {
    const handleGlobalPost = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newPostData = customEvent.detail;

      if (newPostData) {
        // 親からの古いデータ上書きを防ぐフラグ展開
        setIsJustPosted(true);

        const currentProfile = latestProfileRef.current;
        const currentUser = latestUserRef.current;

        setTimelinePosts((current) => {
          // 💡 画面上の既存の投稿から、自分の過去の正しいプロフィールを検索して奪い取る（最強の安全策）
          const myExistingPost = current.find(p => p && p.user_id === currentUser?.id && p.authorProfile?.full_name);
          const backupProfile = myExistingPost?.authorProfile;

          const finalName = 
            backupProfile?.full_name ||
            currentProfile?.full_name || 
            currentUser?.user_metadata?.full_name || 
            currentUser?.email?.split('@')[0] || 
            "マイユーザー";

          const finalAvatar = 
            backupProfile?.avatar_url ||
            currentProfile?.avatar_url || 
            currentUser?.user_metadata?.avatar_url || 
            defaultAvatar;

          const authorProfile = {
            full_name: finalName,
            avatar_url: finalAvatar,
            total_awesome: backupProfile?.total_awesome || currentProfile?.total_awesome || 0,
            total_hug: backupProfile?.total_hug || currentProfile?.total_hug || 0
          };

          const completeNewPost = {
            ...newPostData,
            user_id: currentUser?.id,
            authorProfile,
            awesomeCount: 0,
            hugCount: 0,
            myReaction: null
          };

          return [completeNewPost, ...current];
        });
      }
    };

    window.addEventListener("global-post-success", handleGlobalPost);
    
    return () => {
      window.removeEventListener("global-post-success", handleGlobalPost);
    };
  }, []); // 依存配列が空でも、内部でRefを経由しているため常に最新のユーザー情報が引っ張れます

  const loadNextPosts = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const currentOffset = timelinePosts.length;
      const nextPosts = await fetchMorePosts(currentOffset, 20);

      if (!nextPosts || nextPosts.length === 0) {
        setHasMore(false);
      } else {
        setTimelinePosts((current) => {
          const currentIds = new Set(current.filter(Boolean).map((p) => p.id));
          const filteredNext = nextPosts.filter((p: any) => p && !currentIds.has(p.id));
          
          if (filteredNext.length === 0) {
            setHasMore(false);
            return current;
          }
          
          return [...current, ...filteredNext];
        });
      }
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const safeFriendIds = Array.isArray(friendIds) ? friendIds : [];
  const visiblePosts = timelinePosts.filter((post: any) => {
    if (!post || !post.id) return false;
    const hasPermission = 
      post.privacy_level === 'public' || 
      post.user_id === user?.id || 
      (post.privacy_level === 'friends' && safeFriendIds.includes(post.user_id));
    
    if (!hasPermission) return false;
    if (viewModeProp === 'friends') {
      return safeFriendIds.includes(post.user_id) || post.user_id === user?.id;
    }
    return true;
  });

  const handleDelete = async (postId: number) => {
    if (!window.confirm('この投稿を削除してもよろしいですか？')) return;
    const formData = new FormData();
    formData.append('postId', postId.toString());
    try {
      await deletePost(formData);
      toast.success('削除しました');
      setTimelineReplies((current) => current.filter((r) => r && r.id !== postId));
      setTimelinePosts((current) => current.filter((p) => p && p.id !== postId));
      router.refresh();
    } catch (error) {
      toast.error('削除に失敗しました');
    }
  };

  const handleReportPost = async (postId: number) => {
    if (!window.confirm('この投稿に悪意を感じますか？\n不適切な表現がある場合、確認の上対処いたします。')) return;
    setReportedPostIds(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await reportPost(postId);
      if (res && res.success) {
        toast.success('通報を受け付けました。ご協力ありがとうございます。');
      } else {
        setReportedPostIds(prev => ({ ...prev, [postId]: false }));
        toast.error('処理に失敗しました');
      }
    } catch (error) {
      setReportedPostIds(prev => ({ ...prev, [postId]: false }));
      toast.error('エラーが発生しました');
    }
  };

  const handleReportReply = async (replyId: number) => {
    if (!window.confirm('このコメントに悪意を感じますか？\n不適切な表現がある場合、確認の上対処いたします。')) return;
    setReportedPostIds(prev => ({ ...prev, [replyId]: true }));
    try {
      const res = await reportReply(replyId);
      if (res && res.success) {
        toast.success('コメントの通報を受け付けました。');
      } else {
        setReportedPostIds(prev => ({ ...prev, [replyId]: false }));
        toast.error('処理に失敗しました');
      }
    } catch (error) {
      setReportedPostIds(prev => ({ ...prev, [replyId]: false }));
      toast.error('エラーが発生しました');
    }
  };

  const handleReplySuccess = (
    postId: number, 
    targetReply: { id: number; name: string } | null,
    submittedContent: string,
    mediaUrl: string | null,
    isVideo: boolean
  ) => {
    const confirmedReply = {
      id: Date.now(), 
      parent_id: postId,
      user_id: user?.id,
      content: submittedContent,
      video_url: isVideo ? mediaUrl : null,
      image_url: !isVideo ? mediaUrl : null,
      created_at: new Date().toISOString(),
      replyToUser: targetReply ? targetReply.name : null,
      authorProfile: {
        full_name: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "あなた",
        avatar_url: profile?.avatar_url || user?.user_metadata?.avatar_url || defaultAvatar,
        total_awesome: profile?.total_awesome || 0,
        total_hug: profile?.total_hug || 0
      }
    };

    setTimelineReplies((current) => [...current, confirmedReply]);
    setActiveReplyTargets(prev => ({ ...prev, [postId]: null }));
    router.refresh();
  };

  // 💡 修正後：BottomNavの期待する型に完全一致させ、型エラーの赤波線を消滅させる
  const handlePostFormSuccess = (newPostData?: {
    id: number;
    content: string;
    image_url: string | null;
    video_url: string | null;
    privacy_level: "public" | "friends";
    created_at: string;
  }) => {
    // タイムラインへの追加は上記の useEffect（グローバルイベント）側が
    // 逆引きロジックを伴って完璧に行うため、ここでは二重追加を避けるためにコールバックの伝播のみを行います。
    if (onSuccess && newPostData) {
      onSuccess(newPostData);
    }
  };

  return (
    <div className="space-y-4 pb-24" id="tutorial-step-welcome">
      {visiblePosts.length === 0 ? (
        <div className="text-center py-20 text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD_COLOR }}>
          No posts to show
        </div>
      ) : (
        <>
          {visiblePosts.map((post: any) => {
            const isCommentOpen = activeCommentId === post.id;
            const postReplies = (timelineReplies || []).filter((r: any) => r && r.parent_id === post.id);
            const isPostReported = !!reportedPostIds[post.id];

            const postProfile = post.authorProfile || {};
            const totalAwesome = postProfile.total_awesome ?? postProfile.totalAwesomeCount ?? postProfile.totalAwesome ?? 0;
            const totalHug = postProfile.total_hug ?? postProfile.totalHugCount ?? postProfile.totalHug ?? 0;
            const fullName = postProfile.full_name || "ゲストユーザー";
            const avatarUrl = postProfile.avatar_url || defaultAvatar;

            const calculatedLevel = Math.min(999, Math.max(1, Math.floor(Math.sqrt(totalAwesome)) + 1));

            return (
              <div key={`timeline-item-${post.id}`} className="bg-white dark:bg-zinc-900 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-zinc-800 p-5 relative transition-colors duration-200">
                {/* ヘッダーエリア */}
                <div className="flex items-center justify-between mb-3">
                  <Link href={`/users/${post.user_id}`} className="flex items-center gap-3">
                    <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover border border-gray-50 dark:border-zinc-800" alt="" />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-gray-800 dark:text-zinc-100 flex items-center flex-wrap gap-x-1.5 gap-y-1 transition-colors duration-200">
                        {fullName}
                        <span className="text-[9px] font-black tracking-tighter text-amber-600 bg-amber-50/70 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-100/70 dark:border-amber-900/60 shadow-[0_1px_1px_rgba(0,0,0,0.01)] ml-0.5">
                          Lv.{calculatedLevel}
                        </span>
                        <span className="text-[9px] font-bold text-rose-500 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100/60 dark:border-rose-900/40 px-1.5 py-0.5 rounded-full shadow-[0_1px_1px_rgba(244,63,94,0.01)]">
                          {totalHug} <span className="text-[8px] font-medium text-rose-400/80">hugged</span>
                        </span>
                      </span>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold transition-colors duration-200">
                          {post.created_at ? new Date(post.created_at).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}
                        </span>
                        <span className="opacity-80 transition-colors duration-200" style={{ color: GOLD_COLOR }}>
                          {post.privacy_level === 'friends' ? <Lock size={13} strokeWidth={2.5} /> : <Globe size={13} strokeWidth={2.5} />}
                        </span>
                      </div>
                    </div>
                  </Link>
                  
                  {post.user_id === user?.id ? (
                    <button onClick={() => handleDelete(post.id)} className="p-2 text-gray-300 dark:text-zinc-600 hover:text-rose-400 dark:hover:text-rose-400 transition-colors duration-200">
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleReportPost(post.id)} 
                      disabled={isPostReported}
                      className={`flex items-center gap-1 p-2 text-[10px] font-bold transition-all active:scale-95 duration-200 ${isPostReported ? 'text-zinc-700 cursor-not-allowed' : 'text-gray-300 dark:text-zinc-600 hover:text-rose-400 dark:hover:text-rose-400'}`}
                    >
                      <AlertTriangle size={14} strokeWidth={2.5} />
                      <span>{isPostReported ? '報告済み' : ''}</span>
                    </button>
                  )}
                </div>

                {/* 投稿本文 */}
                <p className="text-[15px] text-zinc-900 dark:text-zinc-100 mb-0 whitespace-pre-wrap leading-snug px-1 transition-colors duration-200">
                  {post.content}
                </p>

                {/* メディア表示 */}
                {post.video_url ? (
                  <div 
                    onClick={() => setActiveMedia({ type: 'video', url: post.video_url })}
                    className="mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm bg-black cursor-pointer relative group transition-colors duration-200"
                  >
                    <video src={post.video_url} muted loop autoPlay playsInline className="w-full h-auto block pointer-events-none" />
                  </div>
                ) : post.image_url && (
                  <div 
                    onClick={() => setActiveMedia({ type: 'image', url: post.image_url })}
                    className="mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm bg-gray-50 dark:bg-zinc-900/50 cursor-pointer relative group transition-colors duration-200"
                  >
                    <img src={post.image_url} alt="" className="w-full h-auto block" loading="lazy" />
                  </div>
                )}

                {/* アクションエリア */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 dark:border-zinc-800/80 transition-colors duration-200">
                  <div className="flex items-center">
                    <ReactionButtons 
                      postId={post.id} 
                      awesomeCount={post.awesomeCount} 
                      hugCount={post.hugCount} 
                      initialMyReaction={post.myReaction} 
                      isOwnPost={post.user_id === user?.id} 
                    />
                  </div>
                  
                  <button 
                    onClick={() => setActiveCommentId(isCommentOpen ? null : post.id)} 
                    className="flex items-center gap-2 text-gray-400 dark:text-zinc-600 hover:text-amber-600 dark:hover:text-amber-500 transition-colors duration-200"
                    style={isCommentOpen ? { color: GOLD_COLOR } : {}}
                  >
                    <MessageCircle size={18} strokeWidth={2} fill={isCommentOpen ? GOLD_COLOR : "none"} />
                    <span className="text-xs font-bold leading-none">{postReplies.length}</span>
                  </button>
                </div>

                {/* リプライエリア */}
                {isCommentOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800/80 animate-in fade-in slide-in-from-top-2 transition-colors duration-200">
                    <div className="space-y-3 mb-6">
                      {postReplies.map((reply: any) => {
                        if (!reply) return null;
                        
                        const rProfile = reply.authorProfile || {};
                        const replyAwesome = rProfile.total_awesome ?? rProfile.totalAwesomeCount ?? rProfile.totalAwesome ?? 0;
                        const replyHug = rProfile.total_hug ?? rProfile.totalHugCount ?? rProfile.totalHug ?? 0;
                        const rFullName = rProfile.full_name || "ゲストユーザー";
                        const rAvatarUrl = rProfile.avatar_url || defaultAvatar;

                        const replyCalculatedLevel = Math.min(999, Math.max(1, Math.floor(Math.sqrt(replyAwesome)) + 1));
                        const isReplyReported = !!reportedPostIds[reply.id];

                        return (
                          <div key={`reply-${reply.id}`} className="flex gap-3 pl-2">
                            <img src={rAvatarUrl} className="w-8 h-8 rounded-full object-cover border border-gray-50 dark:border-zinc-800 transition-colors duration-200" alt="" />
                            <div className="flex-1 bg-gray-50/80 dark:bg-zinc-900/60 p-3 rounded-2xl relative text-zinc-900 dark:text-zinc-100 transition-colors duration-200 border border-transparent dark:border-zinc-800/40">
                              
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold flex items-center flex-wrap gap-x-1.5 gap-y-0.5" style={{ color: GOLD_COLOR }}>
                                  <span className="text-zinc-900 dark:text-zinc-100">{rFullName}</span>
                                  
                                  {reply.replyToUser && (
                                    <span className="text-[10px] text-zinc-400 font-medium ml-1 flex items-center gap-0.5">
                                      ▶︎ <span className="text-amber-600/90 dark:text-amber-500 font-bold">@{reply.replyToUser}</span>
                                    </span>
                                  )}

                                  <span className="text-[8px] font-black tracking-tighter text-amber-600 bg-amber-50/90 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-100/70 dark:border-amber-900/60">
                                    Lv.{replyCalculatedLevel}
                                  </span>
                                  <span className="text-[8px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 px-1.5 py-0.2 rounded-full">
                                    {replyHug} <span className="text-[7px] font-medium text-rose-400/80">hugged</span>
                                  </span>
                                </span>

                                {reply.user_id === user?.id ? (
                                  <button onClick={() => handleDelete(reply.id)} className="text-gray-300 dark:text-zinc-600 hover:text-rose-400 p-1 transition-colors">
                                    <Trash2 size={13} strokeWidth={2.5} />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handleReportReply(reply.id)} 
                                    disabled={isReplyReported}
                                    className={`text-gray-300 dark:text-zinc-600 hover:text-rose-400 p-1 transition-colors ${isReplyReported ? 'text-zinc-500 cursor-not-allowed' : ''}`}
                                  >
                                    <AlertTriangle size={13} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>

                              <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{reply.content}</p>

                              {reply.video_url ? (
                                <div 
                                  onClick={() => setActiveMedia({ type: 'video', url: reply.video_url })}
                                  className="mt-2 rounded-lg overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm bg-black cursor-pointer max-w-xs"
                                >
                                  <video src={reply.video_url} muted loop autoPlay playsInline className="w-full h-auto block pointer-events-none" />
                                </div>
                              ) : reply.image_url && (
                                <div 
                                  onClick={() => setActiveMedia({ type: 'image', url: reply.image_url })}
                                  className="mt-2 rounded-lg overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm bg-gray-50 dark:bg-zinc-900/50 cursor-pointer max-w-xs"
                                >
                                  <img src={reply.image_url} alt="" className="w-full h-auto block" loading="lazy" />
                                </div>
                              )}

                              <div className="mt-2 pt-1 border-t border-gray-100 dark:border-zinc-800/40 flex items-center justify-between">
                                <ReplyActionButtons 
                                  replyId={reply.id}
                                  awesomeCount={reply.awesomeCount || 0}
                                  hugCount={reply.hugCount || 0} 
                                  initialMyReaction={reply.myReaction} 
                                  isMyComment={reply.user_id === user?.id}
                                />

                                <button
                                  onClick={() => setActiveReplyTargets(prev => ({
                                    ...prev,
                                    [post.id]: { id: reply.id, name: rFullName }
                                  }))}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all duration-200"
                                >
                                  返信する
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <ReplyForm 
                      parentId={post.id} 
                      replyTarget={activeReplyTargets[post.id] || null}
                      onCancelReply={() => setActiveReplyTargets(prev => ({ ...prev, [post.id]: null }))}
                      onSuccess={(content, mediaUrl, isVideo) => 
                        handleReplySuccess(post.id, activeReplyTargets[post.id] || null, content, mediaUrl, isVideo)
                      } 
                    />
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && (
            <div ref={loaderRef} className="flex justify-center py-6">
              {isLoadingMore ? (
                <div className="w-6 h-6 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-600 uppercase">
                  Loading More Posts...
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* ボトムナビ */}
      {user?.id && (
        <BottomNav 
          currentUserId={user.id} 
          onPostSuccess={handlePostFormSuccess} 
        />
      )}

      {/* フルスクリーンポップアップ */}
      {activeMedia && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setActiveMedia(null)}
        >
          <button 
            onClick={() => setActiveMedia(null)}
            className="absolute top-4 right-4 z-50 p-2.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
          <div className="w-full max-w-4xl max-h-[85vh] px-4 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {activeMedia.type === 'video' ? (
              <video src={activeMedia.url} controls autoPlay playsInline className="w-full h-auto max-h-[85vh] rounded-2xl shadow-2xl object-contain bg-black" />
            ) : (
              <img src={activeMedia.url} alt="" className="w-full h-auto max-h-[85vh] rounded-2xl shadow-2xl object-contain bg-black" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}