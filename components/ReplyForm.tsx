"use client"

import { useState, useTransition } from 'react'
import { createReply } from '@/app/actions'
import { toast } from 'sonner'
import Image from 'next/image'

export default function ReplyForm({ parentId }: { parentId: string }) {
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const [errorData, setErrorData] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result: any = await createReply(formData)
      
      if (result && result.isToxic) {
        setErrorData(result)
        
        // 物理的に絶対的な中央配置を強制
        // handleSubmit 内の toast.custom 部分
toast.custom((t) => (
  <div 
    style={{
      position: 'fixed',
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: 'max-content',
      maxWidth: '94vw', 
      pointerEvents: 'none'
    }}
  >
    {/* py（上下）と px（左右）を md 以上で少し削ります */}
    <div className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-full py-3 px-6 md:py-4 md:px-10 flex items-center gap-4 md:gap-6 animate-in fade-in zoom-in duration-300 pointer-events-auto">
      
      {/* 画像は存在感を出しつつ、少しだけ枠を絞る */}
      <div className="flex-shrink-0 w-16 h-16 md:w-24 md:h-24 flex items-center justify-center">
        <Image 
          src="/care-robot.png" 
          alt="Robot" 
          width={120} 
          height={120} 
          className="w-full h-full object-contain" 
        />
      </div>
      
      <div className="flex flex-col justify-center min-w-0 pr-2">
        {/* 文字サイズも少し下げて余白とのバランスを調整 */}
        <p className="text-[14px] md:text-[18px] font-bold text-black leading-tight mb-0.5 md:mb-1 whitespace-nowrap">
          それを伝えたら彼は本当に喜ぶでしょうか？
        </p>
        <p className="text-[11px] md:text-[14px] text-gray-500 font-medium leading-tight">
          {result.reason || "他者を傷つける表現です"}
        </p>
      </div>

      <button 
        onClick={() => toast.dismiss(t)} 
        className="text-gray-400 hover:text-gray-600 transition-colors ml-2 md:ml-4 p-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
), { duration: Infinity });

      } else {
        setContent('')
        setErrorData(null)
        toast.success("送信完了")
      }
    })
  }

  const handleClear = () => {
    setContent('')
    setErrorData(null)
    toast.dismiss()
  }

  const handleSuggestionClick = (suggestedText: string) => {
    setContent(suggestedText)
    setErrorData(null)
    toast.dismiss()
  }

  return (
    <div className="mt-4">
      {/* 言い換え案チップ */}
      {errorData?.suggestions && errorData.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 px-2 animate-in fade-in slide-in-from-bottom-2">
          {errorData.suggestions.map((text: string, i: number) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSuggestionClick(text)}
              className="text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-full hover:bg-green-100 transition-all shadow-sm active:scale-95 flex items-center gap-1"
            >
              <span></span>
              {text}
            </button>
          ))}
        </div>
      )}

      <form 
        onSubmit={handleSubmit} 
        className={`flex items-center gap-2 p-2 rounded-full border transition-all duration-500 ${
          errorData ? 'bg-amber-50 border-amber-200 shadow-inner' : 'bg-gray-50 border-gray-100'
        }`}
      >
        <input type="hidden" name="parentId" value={parentId} />
        <input 
          name="content" 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={errorData ? "変換しましょう..." : "返信する..."}
          autoComplete="off"
          className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-black placeholder-gray-400" 
          required 
        />
        <button 
          type="submit" 
          disabled={isPending}
          className="bg-black text-white text-xs font-bold px-5 py-2 rounded-full disabled:bg-gray-300"
        >
          {isPending ? "確認中" : "返信"}
        </button>
      </form>

      {(content.length > 0 || errorData) && (
        <div className="flex justify-between items-center mt-2 px-4 animate-in fade-in">
          <p className="text-[10px] font-bold text-amber-600 italic">
            {errorData ? "あなたの好きな投稿に目を向けてはいかがですか" : ""}
          </p>
          <button 
            type="button" 
            onClick={handleClear} 
            className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
          >
            CLEAR
          </button>
        </div>
      )}
    </div>
  )
}