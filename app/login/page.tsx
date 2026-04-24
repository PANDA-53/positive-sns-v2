import { login } from '../actions'

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <h1 className="text-2xl font-bold text-green-700 mb-2 text-center">Welcome Back 🌿</h1>
        <p className="text-gray-400 text-xs text-center mb-8">ポジティブな世界へログインしましょう</p>
        
        <form action={login} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Email</label>
            <input
              name="email"
              type="email"
              className="w-full p-4 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-400 text-black bg-gray-50 transition-all"
              placeholder="example@mail.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Password</label>
            <input
              name="password"
              type="password"
              className="w-full p-4 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-400 text-black bg-gray-50 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl hover:bg-green-600 transition-all active:scale-95 shadow-lg shadow-green-200"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  )
}