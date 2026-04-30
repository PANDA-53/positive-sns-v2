"use client"

import { useState, useEffect, useRef } from 'react'
import { createPost } from '@/app/actions'
import imageCompression from 'browser-image-compression'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'

// 型エラー（赤線）を解消するための型定義
interface PostResult {
  isToxic?: boolean;
  reason?: string;
  suggestions?: string[];
  success?: boolean;
}

export default function PostForm() {
  const [content, setContent] = useState('')
  const [isCompressing, setIsCompressing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const toastIdRef = useRef<string | number | null>(null)

  const isToxic = searchParams.get('error') === 'toxic-content'
  const reason = searchParams.get('reason')
  const suggestionsRaw = searchParams.get('suggestions')
  
  // URLから言い換え案をパース
  const suggestions: string[] = suggestionsRaw ? JSON.parse(suggestionsRaw) : []

  // 警告トーストの表示（スマホ対応版）
  useEffect(() => {
    if (isToxic) {
      if (!toastIdRef.current) {
        toastIdRef.current = toast.custom((t) => (
          // w-[92vw] と max-w-md でスマホでもはみ出さないように調整
          <div className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-[2rem] sm:rounded-full py-4 px-6 sm:px-8 flex items-start sm:items-center gap-4 w-[92vw] max-w-md mx-auto">
            <div className="flex-shrink-0 mt-1 sm:mt-0">
              <Image src="/care-robot.png" alt="Care Robot" width={48} height={48} className="object-contain" priority />
            </div>
            <div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
              {/* whitespace-nowrap を削除してスマホでの折り返しを許可 */}
              <p className="text-[14px] sm:text-[16px] font-bold text-gray-800 leading-tight mb-1">
                それを投稿したら貴方は笑顔になりますか？
              </p>
              <p className="text-[12px] text-gray-500 leading-snug">
                {reason || "誰かが傷つく内容は、お伝えできません。"}
              </p>
            </div>
            <button onClick={() => toast.dismiss(t)} className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ), { duration: Infinity })
      }
    } else if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current)
      toastIdRef.current = null
    }
  }, [isToxic, reason])

  const handleSuggestionClick = (suggestedText: string) => {
    setContent(suggestedText)
    router.replace('/') // パラメータをクリア
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleCancel = () => {
    setContent('')
    setPreviewUrl(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    router.push('/')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCompressing(true)
    try {
      const formData = new FormData(e.currentTarget)
      const imageFile = formData.get('image') as File
      
      if (imageFile && imageFile.size > 1024 * 1024) {
        const options = { maxSizeMB: 0.9, maxWidthOrHeight: 1200, useWebWorker: true }
        const compressedFile = await imageCompression(imageFile, options)
        formData.set('image', compressedFile, compressedFile.name)
      }

      // 判定結果を受け取る
      const result = await createPost(formData) as PostResult

      // AIが不適切（Toxic）と判定した場合は、URLを更新してトーストを表示させ、処理を抜ける
      if (result && result.isToxic) {
        const params = new URLSearchParams()
        params.set('error', 'toxic-content')
        params.set('reason', result.reason || '')
        if (result.suggestions) {
          params.set('suggestions', JSON.stringify(result.suggestions))
        }
        router.replace(`/?${params.toString()}`)
        setIsCompressing(false)
        return // 成功トーストを出さないようにここで終了
      }

      // 正常時のみ実行
      setContent('')
      setPreviewUrl(null)
      toast.success('投稿をシェアしました！')
      router.replace('/') 
      
    } catch (error) {
      console.error('投稿エラー:', error)
      toast.error('投稿に失敗しました。')
    } finally {
      setIsCompressing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 言い換え提案エリア */}
      {isToxic && suggestions.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-100 p-6 rounded-[2.5rem] shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🌟</span>
            <p className="text-sm font-black text-green-800 uppercase tracking-wider">Positive Magic</p>
          </div>
          <div className="flex flex-col gap-3">
            {suggestions.map((text, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionClick(text)}
                className="text-left text-[11px] font-bold bg-white hover:bg-green-50 border border-green-100 p-4 rounded-2xl transition-all active:scale-95 text-gray-700 leading-relaxed shadow-sm hover:shadow-md"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 投稿フォーム */}
      <form id="post-form" onSubmit={handleSubmit} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100">
        <textarea 
          name="content" 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="最近あった、いいことは？" 
          className={`w-full p-6 rounded-3xl outline-none text-black border-none resize-none transition-all text-sm leading-relaxed ${
            isToxic ? 'bg-amber-50/50 shadow-[0_0_0_2px_rgba(245,158,11,0.1)]' : 'bg-gray-50'
          }`} 
          rows={3} 
          required 
        />
        
        {previewUrl && (
          <div className="relative mt-4 rounded-2xl overflow-hidden border border-gray-100">
            <img src={previewUrl} alt="Preview" className="w-full h-auto" />
            <button type="button" onClick={() => setPreviewUrl(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center">✕</button>
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <input type="file" name="image" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            <button type="button" onClick={handleCancel} className="text-[10px] font-black text-gray-300 hover:text-gray-600 transition-colors uppercase tracking-widest">RESET</button>
          </div>

          <button 
            type="submit" 
            disabled={isCompressing}
            className={`font-black text-xs py-4 px-10 rounded-full shadow-lg transition-all tracking-widest uppercase ${
              isToxic 
                ? "bg-amber-500 text-white hover:bg-amber-600" 
                : "bg-black text-white hover:bg-gray-800 active:scale-95"
            }`}
          >
            {isCompressing ? "Sending..." : isToxic ? "Rewrite" : "Share Love"}
          </button>
        </div>
      </form>
    </div>
  )
}