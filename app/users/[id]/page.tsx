import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { ReactionButtons } from '@/components/reaction-buttons';
import Link from 'next/link';

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. ログインユーザー情報の取得
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isMe = currentUser?.id === id;

  // 2. ターゲットユーザープロフィールの取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) notFound();

  // 3. そのユーザーの過去の投稿一覧を取得（画像URLも取得対象）
  const { data: userPosts } = await supabase
    .from('posts')
    .select(`*, reactions (type, user_id)`)
    .eq('user_id', id)
    .is('parent_id', null)
    .order('created_at', { ascending: false });

  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp";

  return (
    <main className="min-h-screen bg-[#F2F2F2] pb-12 font-sans text-black overflow-x-hidden">
      {/* 戻るボタン付きヘッダー */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 mb-6">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm font-bold text-black-500 hover:text-black transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2.5} 
              stroke="currentColor" 
              className="w-4 h-4 flex-shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span>To POSITIVES</span>
          </Link>
        </div>
      </nav>

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

          {/* 自分のページの場合のみ編集ボタンを表示 */}
          {isMe && (
            <div className="flex justify-center mt-2">
              <Link 
                href="/profile" 
                className="flex items-center justify-center gap-2 bg-gray-50 text-gray-600 hover:bg-gray-100 px-6 py-2.5 rounded-full text-xs font-bold border border-gray-200 transition-all active:scale-95"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth={2} 
                  stroke="currentColor" 
                  className="w-3.5 h-3.5 flex-shrink-0"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <span>プロフィールを編集</span>
              </Link>
            </div>
          )}
        </section>

        {/* 投稿履歴の見出し */}
        <div className="px-4 mb-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">User Posts</h2>
        </div>

        <div className="space-y-6">
          {userPosts && userPosts.length > 0 ? (
            userPosts.map((post) => {
              const reactions = post.reactions || [];
              const awesomeCount = reactions.filter((r: any) => r.type === 'awesome').length;
              const hugCount = reactions.filter((r: any) => r.type === 'hug').length;
              const myReaction = currentUser ? reactions.find((r: any) => r.user_id === currentUser.id)?.type : null;

              return (
                <div key={post.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-7 transition-all hover:border-gray-200">
                  <div className="mb-4">
                    <span className="text-[10px] font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded-md">
                      {new Date(post.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>

                  {/* 投稿内容（テキスト） */}
                  <p className="text-base text-gray-800 mb-6 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* 投稿画像（ここを追加しました！） */}
                  {post.image_url && (
                    <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                      <img 
                        src={post.image_url} 
                        alt="User post image" 
                        className="w-full h-auto object-cover max-h-[500px]" 
                      />
                    </div>
                  )}
                  
                  {/* リアクションボタン */}
                  <ReactionButtons 
                    postId={post.id} 
                    awesomeCount={awesomeCount}
                    hugCount={hugCount}
                    initialMyReaction={myReaction} 
                  />
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 bg-white/50 rounded-[2rem] border border-dashed border-gray-300">
              <p className="text-sm text-gray-400 italic">まだ投稿がありません</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}