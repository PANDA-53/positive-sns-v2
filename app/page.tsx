import { createClient } from '../utils/supabase/server'
import { createPost, createReply, logout } from './actions'
import { Suspense } from 'react'

export default async function Index() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  const user = userData?.user

  let mainPosts: any[] = []
  let replies: any[] = []
  
  if (user) {
    const { data: posts } = await supabase
      .from('posts')
      .select(`*, profiles (full_name, avatar_url)`)
      .order('created_at', { ascending: false })

    if (posts) {
      mainPosts = posts.filter(p => !p.parent_id)
      replies = posts.filter(p => p.parent_id)
    }
  }
  
  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-black pb-12 font-sans text-black">
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 mb-6">
        <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
          <h1 className="text-lg md:text-xl font-bold text-black tracking-tight italic">Timeline.</h1>
          {user ? (
            <div className="flex items-center gap-4 text-black">
              <a href="/profile" className="text-[10px] md:text-xs text-gray-500 hover:text-black font-bold">設定</a>
              <form action={logout}><button className="text-[10px] md:text-xs bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-full font-bold">ログアウト</button></form>
            </div>
          ) : (
            <a href="/login" className="text-[10px] md:text-xs bg-black text-white px-5 py-2 rounded-full font-bold">ログイン</a>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4">
        {user && (
          <div className="space-y-8">
            <form action={createPost} className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100">
              <textarea name="content" placeholder="最近あった、いいことは？" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-black border-none" rows={3} required />
              <button type="submit" className="mt-4 w-full bg-black text-white font-bold py-4 rounded-2xl">投稿をシェア</button>
            </form>

            <Suspense fallback={<div className="text-center py-10">読み込み中...</div>}>
              <div className="space-y-6 text-black">
                {mainPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-7">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                        <img src={post.profiles?.avatar_url || defaultAvatar} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col text-black">
                        <span className="text-sm font-bold">{post.profiles?.full_name || '匿名'}</span>
                        <span className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-base text-gray-800 mb-6">{post.content}</p>
                    {/* 返信・フォーム省略（前回のまま） */}
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