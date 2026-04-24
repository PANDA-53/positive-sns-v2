import { createClient } from '../utils/supabase/server'
import { createPost, createReply, logout } from './actions'

export default async function Index() {
  const supabase = await createClient()
  const { data: posts } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
  const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  const user = userData?.user
  
  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"
  const mainPosts = posts?.filter(p => !p.parent_id)
  const replies = posts?.filter(p => p.parent_id)

  return (
    <main className="min-h-screen bg-gray-50 text-black pb-12">
      {/* ヘッダー：横幅を制限しつつ、スマホでは左右に余白 */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 mb-6">
        <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
          <h1 className="text-lg md:text-xl font-bold text-green-700 tracking-tight">POSITIVE SNS</h1>
          {user ? (
            <form action={logout}>
              <button className="text-[10px] md:text-xs bg-red-50 text-red-500 px-4 py-2 rounded-full font-bold hover:bg-red-100 transition-colors">ログアウト</button>
            </form>
          ) : (
            <a href="/login" className="text-[10px] md:text-xs bg-green-500 text-white px-5 py-2 rounded-full font-bold shadow-sm hover:bg-green-600 transition-all">ログイン</a>
          )}
        </div>
      </nav>

      {/* コンテンツエリア */}
      <div className="max-w-2xl mx-auto px-4 space-y-8">
        {/* 投稿フォーム */}
        {user && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-500">
            <form action={createPost} className="bg-white p-4 md:p-6 rounded-[2rem] shadow-xl shadow-green-900/5 border border-green-50">
              <textarea 
                name="content" 
                placeholder="最近あった、いいことは？" 
                className="w-full p-4 bg-gray-50 rounded-2xl text-base md:text-lg text-black resize-none outline-none border-none focus:ring-2 focus:ring-green-100 transition-all" 
                rows={3} 
                required 
              />
              <button type="submit" className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 transition-all active:scale-[0.98]">
                ポジティブをシェア
              </button>
            </form>
          </section>
        )}

        {/* タイムライン */}
        <div className="space-y-6">
          {mainPosts?.map((post) => (
            <div key={post.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5 md:p-7 hover:border-green-100 transition-colors">
              {/* 投稿者情報 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-50 bg-gray-100 shrink-0">
                  <img src={defaultAvatar} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm md:text-base font-bold text-green-700 leading-none">{post.user_name || '匿名'}</span>
                  <span className="text-[10px] text-gray-400 mt-1">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              {/* 投稿内容 */}
              <p className="text-base md:text-lg text-gray-800 leading-relaxed font-medium mb-6 px-1">
                {post.content}
              </p>

              {/* 返信一覧 */}
              {replies?.some(r => r.parent_id === post.id) && (
                <div className="ml-4 md:ml-8 space-y-4 border-l-2 border-green-50 pl-4 md:pl-6 mb-6">
                  {replies?.filter(r => r.parent_id === post.id).map(reply => (
                    <div key={reply.id} className="text-sm md:text-base bg-gray-50/50 p-3 rounded-2xl">
                      <span className="font-bold text-green-600 block mb-1 text-xs">{reply.user_name || '匿名'}</span>
                      <span className="text-gray-700">{reply.content}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 返信フォーム */}
              {user && (
                <form action={createReply} className="flex items-center gap-2 mt-4 bg-gray-50 p-2 rounded-full border border-gray-100 focus-within:border-green-200 focus-within:bg-white transition-all">
                  <input type="hidden" name="parentId" value={post.id} />
                  <input 
                    name="content" 
                    placeholder="返信する..." 
                    className="flex-1 bg-transparent px-4 py-2 text-sm outline-none" 
                    required 
                  />
                  <button type="submit" className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925L10.79 10l-7.097 1.836-1.414 4.925a.75.75 0 00.826.95 44.82 44.82 0 0014.174-7.443.75.75 0 000-1.216 44.82 44.82 0 00-14.174-7.443z" />
                    </svg>
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}