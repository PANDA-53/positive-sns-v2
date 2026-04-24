import { createClient } from '../utils/supabase/server'
import { createPost, logout, uploadAvatar } from './actions'

export default async function Index() {
  const supabase = await createClient()

  // 1. 投稿データの取得
  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, user_name, avatar_url, created_at')
    .order('created_at', { ascending: false })

  // 2. ユーザー情報の取得
  const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  const user = userData?.user
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""

  return (
    <main className="max-w-xl mx-auto p-4 md:p-6 min-h-screen bg-gray-50 text-black font-sans">
      <header className="flex justify-between items-center mb-8 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-green-700">ポジティブSNS 🌿</h1>
        {user ? (
          <form action={logout}>
            <button className="text-[10px] bg-red-50 text-red-500 px-4 py-2 rounded-full font-bold">ログアウト</button>
          </form>
        ) : (
          <a href="/login" className="text-[12px] bg-green-500 text-white px-5 py-2 rounded-full font-bold">ログイン</a>
        )}
      </header>

      {user ? (
        <section className="mb-10 space-y-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-100 bg-gray-100 shrink-0">
              <img 
                // 拡張子に関わらず、エラーが出たらデフォルト画像に切り替えるガードを徹底
                src={`${supabaseUrl}/storage/v1/object/public/avatars/${user.id}.png?t=${Date.now()}`} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  const target = e.currentTarget;
                  // pngでダメならjpgを試す、それもダメならデフォルト
                  if (!target.src.includes('.jpg')) {
                    target.src = `${supabaseUrl}/storage/v1/object/public/avatars/${user.id}.jpg`;
                  } else {
                    target.src = "https://www.gravatar.com/avatar/?d=mp";
                  }
                }}
              />
            </div>
            <form action={uploadAvatar} className="flex-1">
              <div className="flex items-center gap-2">
                <input type="file" name="file" accept="image/*" className="text-[10px] text-gray-400 w-32" required />
                <button type="submit" className="bg-green-600 text-white text-[10px] px-3 py-1.5 rounded-full font-bold">画像更新</button>
              </div>
            </form>
          </div>

          <form action={createPost} className="bg-white p-6 rounded-3xl shadow-lg border border-green-50">
            <textarea name="content" placeholder="最近あった、いいことは？" className="w-full p-4 bg-gray-50 rounded-2xl text-black resize-none outline-none border-none" rows={3} required />
            <button type="submit" className="mt-3 w-full bg-green-500 text-white font-bold py-4 rounded-2xl shadow-lg">投稿する</button>
          </form>
        </section>
      ) : (
        <div className="mb-10 p-10 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 mb-6 font-medium">参加するにはログインが必要です</p>
          <a href="/login" className="inline-block bg-green-500 text-white px-10 py-3 rounded-full font-bold shadow-lg">ログイン画面へ</a>
        </div>
      )}

      <div className="space-y-6">
        {posts?.map((post: any) => (
          <div key={post.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full overflow-hidden border bg-gray-100">
                  <img 
                    src={post.avatar_url?.startsWith('http') ? post.avatar_url : "https://www.gravatar.com/avatar/?d=mp"} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <span className="text-sm font-bold text-green-700">{post.user_name}</span>
                <span className="text-[10px] text-gray-300 ml-auto">{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
              <p className="text-base text-gray-800 leading-relaxed font-medium">{post.content}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}