import { createClient } from '../utils/supabase/server'
import { createPost, createReply, logout } from './actions'
import { Suspense } from 'react'

export default async function Index() {
  const supabase = await createClient()
  
  // ユーザー情報を取得
  const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  const user = userData?.user

  // 1. 投稿データとプロフィール名を結合して取得
  let mainPosts: any[] = []
  let replies: any[] = []
  
  if (user) {
    const { data: posts } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (posts) {
      mainPosts = posts.filter(p => !p.parent_id)
      replies = posts.filter(p => p.parent_id)
    }
  }
  
  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-black pb-12 font-sans">
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 mb-6">
        <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
          <h1 className="text-lg md:text-xl font-bold text-black tracking-tight italic">Timeline.</h1>
          {user ? (
            <div className="flex items-center gap-4">
              {/* プロフィール編集ページなどへの導線を将来的に作るならここ */}
              <form action={logout}>
                <button className="text-[10px] md:text-xs bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-full font-bold hover:bg-gray-50 transition-colors">ログアウト</button>
              </form>
            </div>
          ) : (
            <a href="/login" className="text-[10px] md:text-xs bg-black text-white px-5 py-2 rounded-full font-bold shadow-sm hover:bg-gray-800 transition-all">ログイン</a>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4">
        {!user ? (
          /* 未ログイン時 */
          <div className="flex flex-col items-center justify-center pt-20 text-center space-y-8 animate-in fade-in duration-700">
            <div className="space-y-4">
              <h2 className="text-4xl font-black tracking-tighter text-black">Share your positive moments.</h2>
              <p className="text-gray-500 text-sm md:text-base max-w-sm mx-auto">
                日常の小さな幸せをシェアしましょう。<br />
                タイムラインを見るにはログインが必要です。
              </p>
            </div>
            <a 
              href="/login" 
              className="bg-black text-white px-10 py-4 rounded-2xl font-bold shadow-2xl shadow-gray-400 hover:bg-gray-800 transition-all active:scale-95"
            >
              はじめる
            </a>
          </div>
        ) : (
          /* ログイン時 */
          <div className="space-y-8">
            <section className="animate-in fade-in slide-in-from-top-4 duration-500">
              <form action={createPost} className="bg-white p-4 md:p-6 rounded-[2rem] shadow-xl shadow-gray-200 border border-gray-100">
                <textarea 
                  name="content" 
                  placeholder="最近あった、いいことは？" 
                  className="w-full p-4 bg-gray-50 rounded-2xl text-base md:text-lg text-black resize-none outline-none border-none focus:ring-2 focus:ring-gray-200 transition-all" 
                  rows={3} 
                  required 
                />
                <button type="submit" className="mt-4 w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-gray-300 transition-all active:scale-[0.98]">
                  投稿をシェア
                </button>
              </form>
            </section>

            <Suspense fallback={<div className="text-center py-10 text-gray-400">読み込み中...</div>}>
              <div className="space-y-6">
                {mainPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5 md:p-7">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                        <img src={defaultAvatar} className="w-full h-full object-cover" alt="avatar" />
                      </div>
                      <div className="flex flex-col">
                        {/* ここでプロフィールの名前を優先表示 */}
                        <span className="text-sm md:text-base font-bold text-gray-900 leading-none">
                          {post.profiles?.full_name || post.user_name || '匿名'}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-1">{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <p className="text-base md:text-lg text-gray-800 leading-relaxed font-medium mb-6 px-1">
                      {post.content}
                    </p>

                    {/* 返信一覧 */}
                    {replies.some(r => r.parent_id === post.id) && (
                      <div className="ml-4 md:ml-8 space-y-4 border-l-2 border-gray-100 pl-4 md:pl-6 mb-6">
                        {replies.filter(r => r.parent_id === post.id).map(reply => (
                          <div key={reply.id} className="text-sm md:text-base bg-gray-50 p-3 rounded-2xl">
                            <span className="font-bold text-gray-600 block mb-1 text-xs">
                              {reply.profiles?.full_name || reply.user_name || '匿名'}
                            </span>
                            <span className="text-gray-700">{reply.content}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 返信フォーム */}
                    <form action={createReply} className="flex items-center gap-2 mt-4 bg-gray-50 p-2 rounded-full border border-gray-100 focus-within:border-gray-300 transition-all">
                      <input type="hidden" name="parentId" value={post.id} />
                      <input name="content" placeholder="返信する..." className="flex-1 bg-transparent px-4 py-2 text-sm outline-none" required />
                      <button type="submit" className="bg-gray-800 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925L10.79 10l-7.097 1.836-1.414 4.925a.75.75 0 00.826.95 44.82 44.82 0 0014.174-7.443.75.75 0 000-1.216 44.82 44.82 0 00-14.174-7.443z" />
                        </svg>
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