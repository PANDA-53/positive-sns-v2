import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
import ProfileEditForm from './edit-form'
import { Suspense } from 'react'

// --- データ取得専用のコンポーネント ---
async function ProfileContent({ userId }: { userId: string }) {
  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, bio')
    .eq('id', userId)
    .single()

  return <ProfileEditForm initialProfile={profile} />
}

// --- メインのページコンポーネント（枠組み担当） ---
export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-[#F2F2F2]">
      {/* ここでのポイントは、重いデータ取得（ProfileContent）を Suspense で囲むことです。
        これにより、Next.js は「user の確認」だけ終われば即座にページ遷移を開始し、
        データが届くまでは profile フォルダ内（または app 直下）の loading.tsx を表示します。
      */}
      <Suspense fallback={
        /* メインページと同じスケルトン、あるいはプロフィール用の簡易表示 */
        <div className="animate-pulse p-4 max-w-md mx-auto mt-20">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-8 bg-gray-200 rounded-xl w-3/4 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded-xl w-1/2 mx-auto"></div>
        </div>
      }>
        <ProfileContent userId={user.id} />
      </Suspense>
    </main>
  )
}