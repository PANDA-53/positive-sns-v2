export const dynamic = 'force-dynamic';

import { createClient } from '../utils/supabase/server'
import { createPost, createReply, logout, acceptFriendRequest, deleteFriendship } from './actions'
import { Suspense } from 'react'
import { ReactionButtons } from '../components/reaction-buttons'
import { FriendButton } from '../components/friend-button'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Index(props: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient()
  // ユーザー取得エラーで画面が止まらないよう対策
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
      // 1. 投稿データを取得
      const { data: posts } = await supabase
        .from('posts')
        .select(`*, reactions (type, user_id)`)
        .order('created_at', { ascending: false })

      // 2. 友達関係の「生データ」を取得
      const { data: friendshipsRaw } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      // 3. 全ての関連プロフィールを取得
      const postUserIds = posts?.map(p => p.user_id) || [];
      const allFriendUserIds = friendshipsRaw?.map(f => f.user_id === user.id ? f.friend_id : f.user_id) || [];
      const allRelevantUserIds = Array.from(new Set([...postUserIds, ...allFriendUserIds]));
      
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allRelevantUserIds);

      // 4. 承認待ちリストの重複排除
      const myPendingRaw = friendshipsRaw?.filter(f => 
        String(f.friend_id) === String(user.id) && f.status === 'pending'
      ) || [];

      const pendingUserIds = new Set(myPendingRaw.map(f => f.user_id));
      pendingRequests = Array.from(pendingUserIds).map(id => ({
        user_id: id,
        sender_profile: allProfiles?.find(p => p.id === id)
      })).filter(req => req.sender_profile);

      // 5. 承認済み友達リスト
      const myAcceptedRaw = friendshipsRaw?.filter(f => f.status === 'accepted') || [];
      const uniqueFriendIds = new Set(
        myAcceptedRaw.map(f => (String(f.user_id) === String(user.id) ? f.friend_id : f.user_id))
      );

      acceptedFriends = Array.from(uniqueFriendIds).map(id => {
        return allProfiles?.find(p => id === p.id);
      }).filter(Boolean);

      // 6. 投稿データの整形
      if (posts) {
        const formattedPosts = posts.map(post => {
          const awesomeCount = post.reactions?.filter((r: any) => r.type === 'awesome').length || 0;
          const hugCount = post.reactions?.filter((r: any) => r.type === 'hug').length || 0;
          const myReaction = post.reactions?.find((r: any) => r.user_id === user.id)?.type || null;

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
      console.error("Data fetch error:", e);
    }
  }
  
  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-black pb-12 font-sans">
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 mb-6">
        <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
          <h1 className="text-lg font-bold italic">Timeline</h1>
          {user && (
            <div className="flex items-center gap-4 text-black">
              <a href="/profile" className="text-xs text-gray-500 font-bold">設定</a>
              <form action={logout}><button className="text-xs bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-full font-bold">ログアウト</button></form>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4">
        {user && (
          <div className="space-y-8">
            
            {/* 友達一覧 */}
            <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Friends</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {acceptedFriends.length > 0 ? (
                  acceptedFriends.map((friend: any) => (
                    <div key={friend.id} className="flex flex-col items-center gap-1 shrink-0 w-16">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                        <img src={friend.avatar_url || defaultAvatar} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 truncate w-full text-center">{friend.full_name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400 px-2 italic">まだ友達がいません</p>
                )}
              </div>
            </section>

            {/* 承認待ち申請 */}
            {pendingRequests.length > 0 && (
              <section className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 p-6 rounded-[2.5rem] shadow-lg">
                <div className="flex items-center gap-2 mb-5 px-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">
                    申請が届いています ({pendingRequests.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div key={req.user_id} className="flex items-center justify-between bg-white p-4 rounded-3xl border border-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 shadow-inner">
                          <img src={req.sender_profile?.avatar_url || defaultAvatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col text-sm">
                          <span className="font-bold text-gray-800">{req.sender_profile?.full_name}</span>
                          <span className="text-[10px] text-gray-400">友達になりたがっています</span>
                        </div>
                      </div>
                      <form action={async () => { 'use server'; await acceptFriendRequest(req.user_id); }}>
                        <button type="submit" className="text-xs bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold shadow-md">承認</button>
                      </form>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 投稿フォームとAI注意文 */}
            <section>
              {isToxic && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-5 rounded-[2rem] mb-4 text-sm font-bold text-center shadow-sm">
                  私はあなたの健康を守ります。
                  <br />
                  <span className="text-[10px] text-amber-600 opacity-70">その発言は誰かを不快にする恐れがあります。</span>
                </div>
              )}
              <form action={createPost} className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100">
                <textarea name="content" placeholder="最近あった、いいことは？" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-black border-none" rows={3} required />
                <button type="submit" className="mt-4 w-full bg-black text-white font-bold py-4 rounded-2xl shadow-lg">投稿をシェア</button>
              </form>
            </section>

            {/* タイムライン表示 */}
            <Suspense fallback={<div className="text-center py-10">読み込み中...</div>}>
              <div className="space-y-6">
                {mainPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-7">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                          <img src={post.authorProfile?.avatar_url || defaultAvatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col text-black">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{post.authorProfile?.full_name || '匿名'}</span>
                            <FriendButton targetUserId={post.user_id} initialStatus={post.friendStatus} />
                          </div>
                          <span className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-base text-gray-800 mb-4">{post.content}</p>

                    <ReactionButtons 
                      postId={post.id}
                      awesomeCount={post.awesomeCount}
                      hugCount={post.hugCount}
                      initialMyReaction={post.myReaction}
                    />

                    {/* 返信一覧 */}
                    {replies.some(r => r.parent_id === post.id) && (
                      <div className="ml-8 mt-6 space-y-4 border-l-2 border-gray-100 pl-6 mb-6">
                        {replies.filter(r => r.parent_id === post.id).map(reply => (
                          <div key={reply.id} className="bg-gray-50 p-3 rounded-2xl">
                            <span className="font-bold text-gray-600 block mb-1 text-xs">{reply.authorProfile?.full_name || '匿名'}</span>
                            <span className="text-gray-700">{reply.content}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 返信フォーム（ここにはisToxicの判定を置かない） */}
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
        )}
      </div>
    </main>
  )
}