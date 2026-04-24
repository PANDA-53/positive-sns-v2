import { createClient } from '../utils/supabase/server'
import { createPost, logout } from './actions'

export default async function Index() {
  const supabase = await createClient()

  // 1. 投稿データを取得
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  // 2. ユーザー情報を徹底ガードして取得
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"

  return (
    <main className="max-w-xl mx-auto p-4 min-h-screen bg-gray-50 text-black">
      <header className="flex justify-between items-center mb-8 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-green-700">ポジティブSNS 🌿</h1>
        {user ? (
          <form action={logout}><button className="text-[10px] bg-red-50 text-red-500 px-4 py-2 rounded-full font-bold">ログアウト</button></form>
        ) : (
          <a href="/login" className="text-[10px] bg-green-500 text-white px-5 py-2 rounded-full font-bold shadow-md">ログイン</a>
        )}
      </header>

      {user && (
        <section className="mb-10">
          <form action={createPost} className="bg-white p-6 rounded-3xl shadow-lg border border-green-50">
            <textarea name="content" placeholder="最近あった、いいことは？" className="w-full p-4 bg-gray-50 rounded-2xl text-black resize-none outline-none border-none" rows={3} required />
            <button type="submit" className="mt-3 w-full bg-green-500 text-white font-bold py-4 rounded-2xl shadow-lg">投稿する</button>
          </form>
        </section>
      )}

      <div className="space-y-6">
        {posts?.map((post: any) => (
          <div key={post.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full overflow-hidden border bg-gray-100">
                <img src={post.avatar_url || defaultAvatar} className="w-full h-full object-cover" />
              </div>
              <span className="text-sm font-bold text-green-700">{post.user_name || '匿名'}</span>
            </div>
            <p className="text-base text-gray-800 font-medium">{post.content}</p>
          </div>
        ))}
      </div>
    </main>
  )
}