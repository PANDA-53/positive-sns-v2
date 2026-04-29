export const dynamic = 'force-dynamic';

import { createClient } from '../utils/supabase/server'
import { logout, acceptFriendRequest, deletePost } from './actions'
import { Suspense } from 'react'
import { ReactionButtons } from '../components/reaction-buttons'
import { FriendButton } from '../components/friend-button'
import PostForm from '../components/post-form'
import ReplyForm from '../components/ReplyForm'
import Link from 'next/link'
import PullToRefresh from '../components/pull-to-refresh'

const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"

// --- 手順B: データ取得を別コンポーネントに分離 ---
async function PostListContent({ user }: { user: any }) {
  const supabase = await createClient()
  
  // 1. 全てのデータを並列で取得して高速化
  const [postsRes, friendshipsRes] = await Promise.all([
    supabase.from('posts').select(`*, reactions (type, user_id)`).order('created_at', { ascending: false }),
    supabase.from('friendships').select('*').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
  ]);

  const posts = postsRes.data || [];
  const friendshipsRaw = friendshipsRes.data || [];

  const postUserIds = posts.map(p => p.user_id);
  const allFriendUserIds = friendshipsRaw.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
  const allRelevantUserIds = Array.from(new Set([...postUserIds, ...allFriendUserIds, user.id]));

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', allRelevantUserIds);

  const myAcceptedRaw = friendshipsRaw.filter(f => f.status === 'accepted');
  const uniqueFriendIds = new Set(myAcceptedRaw.map(f => (String(f.user_id) === String(user.id) ? f.friend_id : f.user_id)));
  const acceptedFriends = Array.from(uniqueFriendIds).map(id => allProfiles?.find(p => id === p.id)).filter(Boolean);

  const formattedPosts = posts.map(post => {
    const reactions = post.reactions || [];
    const authorProfile = allProfiles?.find(p => p.id === post.user_id);
    const relation = friendshipsRaw.find(f => 
      (String(f.user_id) === String(user.id) && String(f.friend_id) === String(post.user_id)) || 
      (String(f.user_id) === String(post.user_id) && String(f.friend_id) === String(user.id))
    );
    
    return {
      ...post,
      authorProfile,
      awesomeCount: reactions.filter((r: any) => r.type === 'awesome').length,
      hugCount: reactions.filter((r: any) => r.type === 'hug').length,
      myReaction: reactions.find((r: any) => r.user_id === user.id)?.type || null,
      friendStatus: post.user_id === user.id ? 'me' : (relation?.status || 'none')
    };
  });

  const mainPosts = formattedPosts.filter(p => !p.parent_id);
  const replies = formattedPosts.filter(p => p.parent_id);

  return (
    <div className="space-y-8">
      {/* 友達一覧 */}
      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Friends</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {acceptedFriends.length > 0 ? (
            acceptedFriends.map((friend: any) => (
              <Link key={friend.id} href={`/users/${friend.id}`} className="flex flex-col items-center gap-1 shrink-0 w-16 hover:opacity-80 transition-opacity">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                  <img src={friend.avatar_url || defaultAvatar} className="w-full h-full object-cover" alt="" />
                </div>
                <span className="text-[10px] font-bold text-gray-600 truncate w-full text-center">{friend.full_name}</span>
              </Link>
            ))
          ) : (
            <p className="text-[10px] text-gray-400 px-2 italic">まだ友達がいません</p>
          )}
        </div>
      </section>

      {/* 投稿フォーム（ここは即座に出したいのでPostListContent内に含めるか検討が必要ですが、一旦ここに配置） */}
      <section><PostForm /></section>

      {/* 投稿リスト表示 */}
      <div className="space-y-6 pb-20">
        {mainPosts.map((post) => (
          <div key={post.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-7">
            {/* 投稿の中身（ヘッダー、本文、画像、リアクション、返信...元のコードと同じ） */}
            <div className="flex items-center justify-between mb-4">
              <Link href={`/users/${post.user_id}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                <img src={post.authorProfile?.avatar_url || defaultAvatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                <div className="flex flex-col text-black">
                  <span className="text-sm font-bold">{post.authorProfile?.full_name || '匿名'}</span>
                  <span className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                {post.user_id === user.id ? (
                  <form action={deletePost}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" className="text-gray-300 hover:text-red-500 transition-colors p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                  </form>
                ) : (
                  <FriendButton targetUserId={post.user_id} initialStatus={post.friendStatus} />
                )}
              </div>
            </div>
            <p className="text-base text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>
            {post.image_url && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                <img src={post.image_url} alt="" className="w-full h-auto object-cover max-h-[450px]" />
              </div>
            )}
            <ReactionButtons postId={post.id} awesomeCount={post.awesomeCount} hugCount={post.hugCount} initialMyReaction={post.myReaction} />
            {replies.some(r => r.parent_id === post.id) && (
              <div className="ml-8 mt-6 space-y-4 border-l-2 border-gray-100 pl-6 mb-6">
                {replies.filter(r => r.parent_id === post.id).map(reply => (
                  <div key={reply.id} className="bg-gray-50 p-3 rounded-2xl">
                    <Link href={`/users/${reply.user_id}`} className="font-bold text-gray-600 block mb-1 text-xs hover:underline">{reply.authorProfile?.full_name || '匿名'}</Link>
                    <span className="text-gray-700 text-sm">{reply.content}</span>
                  </div>
                ))}
              </div>
            )}
            <ReplyForm parentId={post.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- メインの Index コンポーネント ---
export default async function Index() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  const user = userData?.user

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-black pb-12 font-sans">
      <nav className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
          <h1 className="text-lg font-bold tracking-tight text-green-700">POSITIVES</h1>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/profile" className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors">
                <span className="text-xs font-bold text-gray-700">プロフィール</span>
              </Link>
            ) : (
              <Link href="/login" className="text-xs bg-black text-white px-5 py-2 rounded-full font-bold">ログイン</Link>
            )}
          </div>
        </div>
      </nav>

      <PullToRefresh>
        <div className="max-w-2xl mx-auto px-4 pt-6">
          {user ? (
            <Suspense fallback={
              /* ここに image_c30c5d.png で作ったスケルトンを入れると完璧です */
              <div className="animate-pulse space-y-4 w-full max-w-md mx-auto mt-10">
                <div className="h-48 bg-gray-200 rounded-[2.5rem]"></div>
                <div className="h-12 bg-gray-200 rounded-2xl w-3/4"></div>
              </div>
            }>
              <PostListContent user={user} />
            </Suspense>
          ) : (
            /* 未ログイン表示（略） */
            <div className="text-center py-20">ログインしてください</div>
          )}
        </div>
      </PullToRefresh>
    </main>
  );
}