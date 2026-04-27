"use client"

import { useState, useEffect, useRef } from 'react'
import { createPost } from '@/app/actions'
import imageCompression from 'browser-image-compression'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'

export default function PostForm() {
  const [isCompressing, setIsCompressing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const toastIdRef = useRef<string | number | null>(null)

  // メイン投稿専用のエラーチェック
  const isToxic = searchParams.get('error') === 'toxic-content'

  useEffect(() => {
  if (isToxic) {
    if (!toastIdRef.current) {
      toastIdRef.current = toast.custom((t) => (
        // 外側のコンテナをタイトに絞る
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 shadow-xl rounded-full p-2 pr-6 flex items-center gap-3 w-fit min-w-[300px] max-w-[400px]">
          
          {/* アイコン：サイズを微調整し、余白をなくす */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <Image 
              src="/care-robot.png" 
              alt="Care Robot"
              fill
              className="object-contain scale-150" // 少しだけ拡大して余白を埋める
            />
          </div>
          
          {/* テキスト：行間を極限まで詰める */}
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[13px] font-bold text-gray-800 leading-[1.2] mb-0.5 whitespace-nowrap">
              その投稿で、貴方は笑顔になりますか？
            </p>
            <p className="text-[11px] text-gray-500 leading-tight">
              誰かが傷つく内容は、お伝えできません。
            </p>
          </div>

          {/* 閉じるボタンをより控えめに */}
          <button 
            onClick={() => toast.dismiss(t)}
            className="ml-auto text-gray-300 hover:text-gray-400 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ), {
        duration: Infinity,
      })
    }
  } else {
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current)
      toastIdRef.current = null
    }
  }
}, [isToxic])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleCancel = () => {
    const form = document.getElementById('post-form') as HTMLFormElement
    form?.reset()
    setPreviewUrl(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    
    // URLのクエリをリセットしてトーストを消去
    router.push('/')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCompressing(true)

    try {
      const formData = new FormData(e.currentTarget)
      const imageFile = formData.get('image') as File

      if (imageFile && imageFile.size > 1024 * 1024) {
        const options = {
          maxSizeMB: 0.9,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        }
        const compressedFile = await imageCompression(imageFile, options)
        formData.set('image', compressedFile, compressedFile.name)
      }

      await createPost(formData)
      e.currentTarget.reset()
      setPreviewUrl(null)
      toast.success('投稿をシェアしました！')
    } catch (error) {
      console.error('投稿エラー:', error)
    } finally {
      setIsCompressing(false)
    }
  }

  return (
    <form id="post-form" onSubmit={handleSubmit} className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100">
      <textarea 
        name="content" 
        placeholder="最近あった、いいことは？" 
        className={`w-full p-4 rounded-2xl outline-none text-black border-none resize-none transition-all ${
          isToxic ? 'bg-amber-50 shadow-[0_0_0_2px_rgba(245,158,11,0.2)]' : 'bg-gray-50'
        }`} 
        rows={3} 
        required 
      />
      
      {previewUrl && (
        <div className="relative mt-4 rounded-2xl overflow-hidden border border-gray-100">
          <img src={previewUrl} alt="Preview" className="w-full h-auto" />
          <button 
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-4">
          <label className="cursor-pointer p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <input type="file" name="image" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>

          <button
            type="button"
            onClick={handleCancel}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            やり直す
          </button>
        </div>

        <button 
          type="submit" 
          disabled={isCompressing || isToxic}
          className={`font-bold py-3 px-8 rounded-2xl shadow-lg transition-all ${
            isToxic 
              ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
              : "bg-black text-white hover:bg-gray-800 active:scale-95"
          }`}
        >
          {isCompressing ? "送信中..." : isToxic ? "修正してください" : "投稿をシェア"}
        </button>
      </div>
    </form>
  )
}