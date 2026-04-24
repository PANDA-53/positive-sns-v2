import { createClient } from '../utils/supabase/server'
import { createPost, createComment, logout } from './actions'

export default async function Index() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, content, created_at, user_name,
      comments ( id, content, user_name, created_at )
    `)
    .order('created_at', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="max-w-xl mx-auto p-4 md:p-6 min-h-screen bg-gray-50 text-black">
      <header className="flex justify-between items-center mb-8 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-green-700">ポジティブSNS 🌿</h1>
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100 hidden sm:inline-block">
              {user.email}
            </span>
            <form action={logout}>
              <button className="text-[10px] bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1 rounded-full font-bold transition-colors">
                ログアウト
              </button>
            </form>
          </div>
        ) : (
          <a href="/login" className="text-xs font-bold text-white bg-green-500 px-4 py-2 rounded-full shadow-md">
            ログイン
          </a>
        )}
      </header>

      {/* 投稿フォーム */}
      {user && (
        <form action={createPost} className="mb-10 bg-white p-4 md:p-5 rounded-2xl shadow-md border border-green-50">
          <textarea name="content" placeholder="最近あった、ちょっといいことは？" className="w-full p-4 border border-gray-100 rounded-xl text-base bg-gray-50 focus:ring-2 focus:ring-green-400 outline-none resize-none text-black" rows={3} required />
          <button type="submit" className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95">
            ポジティブをシェアする
          </button>
        </form>
      )}

      {/* 投稿一覧 */}
      <div className="space-y-8">
        {posts?.map((post: any) => (
          <div key={post.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 pb-3">
              <p className="text-lg text-gray-800 mb-4 leading-relaxed font-medium">{post.content}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">👤 {post.user_name || 'Gimax'}</span>
                <span className="text-[10px] text-gray-300 font-bold">{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>

            {/* コメントセクション */}
            <div className="bg-gray-50/50 p-4 border-t border-gray-50">
              <div className="space-y-2 mb-4">
                {post.comments?.map((c: any) => (
                  <div key={c.id} className="text-sm bg-white p-3 rounded-2xl shadow-sm border border-gray-50">
                    <p className="text-gray-700 leading-snug">
                      <span className="font-bold text-green-700 mr-2">{c.user_name}</span>
                      {c.content}
                    </p>
                  </div>
                ))}
              </div>

              {user && (
                <form action={createComment} className="flex gap-2">
                  <input type="hidden" name="postId" value={post.id} />
                  <input name="content" placeholder="返信する..." className="flex-1 text-sm p-2 px-4 border border-gray-200 rounded-full focus:ring-2 focus:ring-green-400 outline-none bg-white text-black" required />
                  <button className="bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold hover:bg-green-600 shadow-sm">送信</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}