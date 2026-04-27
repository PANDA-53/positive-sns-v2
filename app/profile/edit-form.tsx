"use client"

import { useState, useRef } from 'react'
import { updateProfile } from '../actions'
import Link from 'next/link'
// ライブラリをインポート
import imageCompression from 'browser-image-compression'

export default function ProfileEditForm({ initialProfile }: { initialProfile: any }) {
  const [previewUrl, setPreviewUrl] = useState(initialProfile?.avatar_url)
  const [isCompressing, setIsCompressing] = useState(false) // 圧縮中の状態管理
  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  // 送信ボタンが押された時の処理
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault() // デフォルトの送信を一旦止める
    setIsCompressing(true)

    try {
      const formData = new FormData(e.currentTarget)
      const imageFile = formData.get('avatar') as File

      // 画像が選択されており、かつサイズが1MBを超えている場合に圧縮
      if (imageFile && imageFile.size > 1024 * 1024) {
        const options = {
          maxSizeMB: 0.9,           // 1MB以下に抑える
          maxWidthOrHeight: 1200,  // 解像度を最大1200pxにする（これだけでかなり軽くなる）
          useWebWorker: true,
        }
        
        console.log('圧縮開始:', imageFile.size / 1024 / 1024, 'MB')
        const compressedFile = await imageCompression(imageFile, options)
        console.log('圧縮完了:', compressedFile.size / 1024 / 1024, 'MB')

        // 圧縮したファイルをFormDataにセットし直す
        formData.set('avatar', compressedFile, compressedFile.name)
      }

      // サーバーアクションを実行
      await updateProfile(formData)
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存中にエラーが発生しました。')
    } finally {
      setIsCompressing(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-black pb-12 font-sans">
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 mb-6">
        <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span>キャンセル</span>
          </Link>
          <h1 className="text-sm font-bold italic">Profile Settings</h1>
          <div className="w-16"></div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4">
        <section className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
          {/* actionではなくonSubmitを使用 */}
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-50 shadow-md bg-gray-100">
                <img 
                  src={previewUrl || defaultAvatar} 
                  className="w-full h-full object-cover" 
                  alt="Avatar" 
                />
              </div>
              <label className="cursor-pointer bg-gray-50 text-gray-600 px-6 py-2 rounded-full text-[10px] font-black border border-gray-200 hover:bg-gray-100 transition-all uppercase tracking-widest">
                {isCompressing ? "最適化中..." : "写真を変更"}
                <input 
                  name="avatar" 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg, image/gif" 
                  className="hidden" 
                  onChange={handleImageChange}
                  disabled={isCompressing}
                />
              </label>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">User Name</label>
                <input 
                  name="fullName" 
                  type="text" 
                  defaultValue={initialProfile?.full_name || ''} 
                  placeholder="お名前"
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-black border-none focus:ring-2 focus:ring-black/5 transition-all text-sm" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Bio</label>
                <textarea 
                  name="bio" 
                  defaultValue={initialProfile?.bio || ''} 
                  placeholder="自己紹介を書いてみましょう"
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-black border-none focus:ring-2 focus:ring-black/5 transition-all min-h-[120px] resize-none text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isCompressing}
                className="w-full bg-black text-white font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-sm tracking-wide disabled:bg-gray-400 disabled:scale-100"
              >
                {isCompressing ? "送信中..." : "設定を保存する"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}