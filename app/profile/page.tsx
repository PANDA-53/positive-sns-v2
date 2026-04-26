import { createClient } from '../../utils/supabase/server'
import { updateProfile } from '../actions'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8 italic">Profile Setting</h1>
        <form action={updateProfile} className="space-y-6" encType="multipart/form-data">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-inner bg-gray-50">
              <img src={profile?.avatar_url || defaultAvatar} className="w-full h-full object-cover" alt="avatar" />
            </div>
            <input name="avatar" type="file" accept="image/*" className="text-xs text-gray-500 cursor-pointer" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">Display Name</label>
            <input name="fullName" type="text" defaultValue={profile?.full_name || ''} className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all" required />
          </div>
          <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-gray-800 transition-all">保存する</button>
          <a href="/" className="block text-center text-xs text-gray-400 hover:text-black font-bold py-2">キャンセル</a>
        </form>
      </div>
    </div>
  )
}