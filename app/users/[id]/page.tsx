import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { ReactionButtons } from '@/components/reaction-buttons';
import Link from 'next/link';
import { Suspense } from 'react';

const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp";

// --- 手順B: データ取得専用のコンポーネント ---
async function UserContent({ id, currentUserId }: { id: string, currentUserId: string | undefined }) {
  const supabase = await createClient();

  // プロフィールと投稿を並列で取得して高速化
  const [profileRes, postsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('posts').select(`*, reactions (type, user_id)`).eq('user_id', id).is('parent_id', null).order('created_at', { ascending: false })
  ]);

  const profile = profileRes.data;
  const userPosts = postsRes.data;

  if (!profile) notFound();

  const isMe = currentUserId === id;

  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* プロフィールカード */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 mb-8 text-center relative overflow-hidden">
        <div className="relative inline-block mb-4">
          <img 
            src={profile.avatar_url || defaultAvatar} 
            className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 shadow-sm"
            alt={profile.full_name}
          />
        </div>
        <h1 className="text-2xl font-bold mb-2">{profile.full_name}</h1>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto whitespace-pre-wrap leading-relaxed">
          {profile.bio || "自己紹介はまだありません。"}
        </p>

        {isMe && (
          <div className="flex justify-center mt-2">
            <Link href="/profile" className="flex items-center justify-center gap-2 bg-gray-50 text-gray-600 hover:bg-gray-100 px-6 py-2.5 rounded-full text-xs font-bold border border-gray-200 transition-all active:scale-95">
              <span>プロフィールを編集</span>
            </Link>
          </div>
        )}
      </section>

      {/* 投稿履歴 */}
      <div className="px-4 mb-4">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">User Posts</h2>
      </div>

      <div className="space-y-6">
        {userPosts && userPosts.length > 0 ? (
          userPosts.map((post) => {
            const reactions = post.reactions || [];
            return (
              <div key={post.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-7">
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded-md">
                    {new Date(post.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <p className="text-base text-gray-800 mb-6 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                {post.image_url && (
                  <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                    <img src={post.image_url} alt="" className="w-full h-auto object-cover max-h-[500px]" />
                  </div>
                )}
                <ReactionButtons 
                  postId={post.id} 
                  awesomeCount={reactions.filter((r: any) => r.type === 'awesome').length}
                  hugCount={reactions.filter((r: any) => r.type === 'hug').length}
                  initialMyReaction={currentUserId ? reactions.find((r: any) => r.user_id === currentUserId)?.type : null} 
                />
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-white/50 rounded-[2rem] border border-dashed border-gray-300 text-gray-400">
            投稿はまだありません
          </div>
        )}
      </div>
    </div>
  );
}

// --- メインページ（ヘッダーとSuspense担当） ---
export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[#F2F2F2] pb-12 font-sans text-black">
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 mb-6">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-black-500 hover:text-black">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            <span>To POSITIVES</span>
          </Link>
        </div>
      </nav>

      {/* ここでも Suspense を使います。
        app/users/[id]/loading.tsx を作成済みであれば、遷移した瞬間にそちらが表示されます。
      */}
      <Suspense fallback={
        <div className="max-w-2xl mx-auto px-4 animate-pulse">
          <div className="bg-white rounded-[2.5rem] h-64 mb-8"></div>
          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] h-40"></div>
            <div className="bg-white rounded-[2rem] h-40"></div>
          </div>
        </div>
      }>
        <UserContent id={id} currentUserId={currentUser?.id} />
      </Suspense>
    </main>
  );
}