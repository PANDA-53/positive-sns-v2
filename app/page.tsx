import { createClient } from '../utils/supabase/server'
import { createPost, createComment } from './actions'

export default async function Index() {
  const supabase = await createClient()

  // 投稿とコメントをセットで取得
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      id, content, created_at, user_name,
      comments ( id, content, user_name, created_at )
    `)
    .order('created_at', { ascending: false })

  if (error) console.error("データ取得エラー:", error.message)

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="max-w-xl mx-auto p-4 md:p-6 min-h-screen bg-gray-50 text-black">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-green-700">POSITIVE SNS</h1>
        {user && <div className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">{user.email}</div>}
      </header>

      {/* 投稿フォーム */}
      {user ? (
        <form action={createPost} className="mb-10 bg-white p-5 rounded-2xl shadow-md border border-green-50">
          <textarea name="content" placeholder="最近あった、ちょっといいことは？" className="w-full p-4 border border-gray-100 rounded-xl text-base bg-gray-50 focus:ring-2 focus:ring-green-400 outline-none resize-none" rows={3} required />
          <button type="submit" className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95">ポジティブをシェアする</button>
        </form>
      ) : (
        <div className="mb-10 p-6 bg-orange-50 rounded-2xl text-center border border-orange-100">
          <p className="text-orange-700 font-medium text-sm">投稿するにはログインが必要です</p>
        </div>
      )}

      {/* 投稿一覧 */}
      <div className="space-y-8">
        {posts?.map((post: any) => (
          <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5">
              <p className="text-lg text-gray-800 mb-4 leading-relaxed">{post.content}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">👤 {post.user_name || 'Gimax'}</span>
                <span className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>

            {/* コメントセクション */}
            <div className="bg-gray-50 p-4 border-t border-gray-100">
              <div className="space-y-3 mb-4">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((c: any) => (
                    <div key={c.id} className="text-sm bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                      <p className="text-gray-700"><span className="font-bold text-green-700 mr-2">{c.user_name}</span>{c.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400 italic px-1">コメントはまだありません</p>
                )}
              </div>

              {/* コメント入力欄 */}
              {user && (
                <form action={createComment} className="flex gap-2">
                  <input type="hidden" name="postId" value={post.id} />
                  <input name="content" placeholder="返信する..." className="flex-1 text-sm p-2 px-4 border border-gray-200 rounded-full focus:ring-2 focus:ring-green-400 outline-none bg-white" required />
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