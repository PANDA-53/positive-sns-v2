export const dynamic = 'force-dynamic';

import { createClient } from '../utils/supabase/server'
import { createPost, createReply, logout, acceptFriendRequest } from './actions'
import { Suspense } from 'react'
import { ReactionButtons } from '../components/reaction-buttons'
import { FriendButton } from '../components/friend-button'
import PostForm from '../components/post-form'
import Link from 'next/link'
import PullToRefresh from '../components/pull-to-refresh' // インポート追加

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Index(props: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  const user = userData?.user

  const searchParams = await props.searchParams;
  const isToxic = searchParams.error === 'toxic-content';

  let mainPosts: any[] = []
  let replies: any[] = []
  let pendingRequests: any[] = [] 
  let acceptedFriends: any[] = [] 
  
  if (user) {
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select(`*, reactions (type, user_id)`)
        .order('created_at', { ascending: false })

      const { data: friendshipsRaw } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const postUserIds = posts?.map(p => p.user_id) || [];
      const allFriendUserIds = friendshipsRaw?.map(f => f.user_id === user.id ? f.friend_id : f.user_id) || [];
      const allRelevantUserIds = Array.from(new Set([...postUserIds, ...allFriendUserIds]));
      
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allRelevantUserIds);

      const myPendingRaw = friendshipsRaw?.filter(f => 
        String(f.friend_id) === String(user.id) && f.status === 'pending'
      ) || [];

      const pendingUserIds = new Set(myPendingRaw.map(f => f.user_id));
      pendingRequests = Array.from(pendingUserIds).map(id => ({
        user_id: id,
        sender_profile: allProfiles?.find(p => p.id === id)
      })).filter(req => req.sender_profile);

      const myAcceptedRaw = friendshipsRaw?.filter(f => f.status === 'accepted') || [];
      const uniqueFriendIds = new Set(
        myAcceptedRaw.map(f => (String(f.user_id) === String(user.id) ? f.friend_id : f.user_id))
      );
      acceptedFriends = Array.from(uniqueFriendIds).map(id => allProfiles?.find(p => id === p.id)).filter(Boolean);

      if (posts) {
        const formattedPosts = posts.map(post => {
          const reactions = post.reactions || [];
          const awesomeCount = reactions.filter((r: any) => r.type === 'awesome').length;
          const hugCount = reactions.filter((r: any) => r.type === 'hug').length;
          const myReaction = reactions.find((r: any) => r.user_id === user.id)?.type || null;

          let friendStatus: 'none' | 'pending' | 'accepted' | 'me' = 'none';
          if (post.user_id === user.id) {
            friendStatus = 'me';
          } else {
            const relation = friendshipsRaw?.find(f => 
              (String(f.user_id) === String(user.id) && String(f.friend_id) === String(post.user_id)) || 
              (String(f.user_id) === String(post.user_id) && String(f.friend_id) === String(user.id))
            );
            if (relation) friendStatus = relation.status as any;
          }
          const authorProfile = allProfiles?.find(p => p.id === post.user_id);
          return { ...post, authorProfile, awesomeCount, hugCount, myReaction, friendStatus };
        });
        mainPosts = formattedPosts.filter(p => !p.parent_id);
        replies = formattedPosts.filter(p => p.parent_id);
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"

  return (
    <PullToRefresh>
      <main className="min-h-screen bg-[#F2F2F2] text-black pb-12 font-sans overflow-x-hidden">
        {/* ナビゲーション：ログイン・未ログイン共通 */}
        <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 mb-6">
          <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
            <h1 className="text-lg font-bold italic">Timeline</h1>
            <div className="flex items-center gap-4 text-black">
              {user ? (
                <>
                  <Link href="/profile" className="text-xs text-gray-500 font-bold">設定</Link>
                  <form action={logout}>
                    <button className="text-xs bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-full font-bold">ログアウト</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="text-xs bg-black text-white px-5 py-2 rounded-full font-bold shadow-sm">ログイン</Link>
              )}
            </div>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4">
          {user ? (
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

              {/* 承認待ち申請 */}
              {pendingRequests.length > 0 && (
                <section className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 p-6 rounded-[2.5rem] shadow-lg">
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 px-2">申請が届いています</h3>
                  <div className="space-y-3">
                    {pendingRequests.map((req) => (
                      <div key={req.user_id} className="flex items-center justify-between bg-white p-4 rounded-3xl border border-white shadow-sm">
                        <Link href={`/users/${req.user_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          <img src={req.sender_profile?.avatar_url || defaultAvatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                          <span className="font-bold text-sm text-gray-800">{req.sender_profile?.full_name}</span>
                        </Link>
                        <form action={acceptFriendRequest}>
                          <input type="hidden" name="requesterId" value={req.user_id} />
                          <button type="submit" className="text-xs bg-blue-600 text-white px-5 py-2 rounded-full font-bold shadow-md">承認</button>
                        </form>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 投稿フォームエリア */}
              <section>
                {isToxic && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 p-5 rounded-[2.5rem] mb-4 text-sm font-bold text-center shadow-sm animate-pulse">
                    その発言は相手と貴方を本当に笑顔にしますか？
                    <br />
                    <span className="text-[10px] text-amber-600 opacity-70">傷つける発言を検知しました。</span>
                  </div>
                )}
                <PostForm />
              </section>

              {/* タイムライン */}
              <Suspense fallback={<div className="text-center py-10">読み込み中...</div>}>
                <div className="space-y-6">
                  {mainPosts.map((post) => (
                    <div key={post.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-7">
                      <div className="flex items-center justify-between mb-4">
                        <Link href={`/users/${post.user_id}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                          <img src={post.authorProfile?.avatar_url || defaultAvatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                          <div className="flex flex-col text-black">
                            <span className="text-sm font-bold">{post.authorProfile?.full_name || '匿名'}</span>
                            <span className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleDateString()}</span>
                          </div>
                        </Link>
                        <FriendButton targetUserId={post.user_id} initialStatus={post.friendStatus} />
                      </div>
                      
                      <p className="text-base text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

                      {post.image_url && (
                        <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                          <img src={post.image_url} alt="" className="w-full h-auto object-cover max-h-[400px]" />
                        </div>
                      )}

                      <ReactionButtons postId={post.id} awesomeCount={post.awesomeCount} hugCount={post.hugCount} initialMyReaction={post.myReaction} />

                      {/* 返信一覧 */}
                      {replies.some(r => r.parent_id === post.id) && (
                        <div className="ml-8 mt-6 space-y-4 border-l-2 border-gray-100 pl-6 mb-6">
                          {replies.filter(r => r.parent_id === post.id).map(reply => (
                            <div key={reply.id} className="bg-gray-50 p-3 rounded-2xl">
                              <Link href={`/users/${reply.user_id}`} className="font-bold text-gray-600 block mb-1 text-xs hover:underline">
                                {reply.authorProfile?.full_name || '匿名'}
                              </Link>
                              <span className="text-gray-700">{reply.content}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <form action={createReply} className="flex items-center gap-2 mt-4 bg-gray-50 p-2 rounded-full border border-gray-100">
                        <input type="hidden" name="parentId" value={post.id} />
                        <input name="content" placeholder="返信する..." className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-black" required />
                        <button type="submit" className="bg-gray-800 text-white w-8 h-8 rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925L10.79 10l-7.097 1.836-1.414 4.925a.75.75 0 00.826.95 44.82 44.82 0 0014.174-7.443.75.75 0 000-1.216 44.82 44.82 0 00-14.174-7.443z" /></svg>
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </Suspense>
            </div>
          ) : (
            /* 未ログイン時：Timelineの位置に合わせたカード表示 */
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-[2.5rem] shadow-xl border border-gray-100">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">ここは貴方の健康を守ります。</h2>
              <p className="text-gray-500 mb-8 text-sm">利用するにはログインが必要です</p>
              <Link href="/login" className="bg-black text-white px-10 py-4 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                ログイン画面へ
              </Link>
            </div>
          )}
        </div>
      </main>
    </PullToRefresh>
  )
}