"use client"

import { useEffect, useRef } from 'react'
import { createReply } from '@/app/actions'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'

function SubmitButton({ isToxic }: { isToxic: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      disabled={pending || isToxic}
      className={`text-xs font-bold px-5 py-2 rounded-full transition-all ${
        isToxic ? 'bg-gray-200 text-gray-400' : 'bg-black text-white hover:bg-gray-800 active:scale-95'
      }`}
    >
      {pending ? "送信中..." : isToxic ? "修正中" : "返信"}
    </button>
  )
}

export default function ReplyForm({ parentId }: { parentId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const toastIdRef = useRef<string | number | null>(null)

  const isThisReplyToxic = 
    searchParams.get('error') === 'toxic-content-reply' && 
    searchParams.get('parentId') === String(parentId)

  useEffect(() => {
    if (isThisReplyToxic) {
      if (!toastIdRef.current) {
        // 修正版：文字が絶対に切れない設定
toastIdRef.current = toast.custom((t) => (
  // 1. 全体のサイズ感：py-4, px-8 に広げて一回り大きく
  <div className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-full py-4 px-8 flex items-center gap-4 w-auto max-w-[95vw]">
    
    {/* 2. 画像サイズ：48px から 56px へアップ（配置バランス維持のため） */}
    <div className="flex-shrink-0">
      <Image 
        src="/care-robot.png" 
        alt="Care Robot"
        width={56} 
        height={56}
        className="object-contain"
        priority
      />
    </div>
    
    {/* 3. テキストサイズ：14px→16px / 11px→13px へ引き上げ */}
    {/* 4. 被り防止の pr-10：全体が大きくなる分、右の余白も広めに確保 */}
    <div className="flex flex-col justify-center min-w-0 pr-10">
      <p className="text-[16px] font-bold text-gray-800 leading-tight mb-1 whitespace-nowrap">
        それを伝えたら彼は本当に喜ぶでしょうか？
      </p>
      <p className="text-[13px] text-gray-500 leading-tight whitespace-nowrap">
        誰かが傷つく内容は、お伝えできません。
      </p>
    </div>

    {/* 5. 閉じるボタン：少し大きくし、押しやすく調整 */}
    <button 
      onClick={() => toast.dismiss(t)}
      className="ml-auto text-gray-400 hover:text-gray-600 p-2 flex-shrink-0 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  }, [isThisReplyToxic])

  const handleCancel = () => {
    const form = document.getElementById(`reply-form-${parentId}`) as HTMLFormElement
    form?.reset()
    router.push('/')
  }

  return (
    <div className="mt-4">
      <form 
        id={`reply-form-${parentId}`} 
        action={createReply} 
        className={`flex items-center gap-2 p-2 rounded-full border transition-all ${
          isThisReplyToxic ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-gray-50 border-gray-100'
        }`}
      >
        <input type="hidden" name="parentId" value={parentId} />
        <input 
          name="content" 
          placeholder={isThisReplyToxic ? "内容を修正してください" : "返信する..."}
          autoComplete="off"
          className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-black" 
          required 
        />
        <SubmitButton isToxic={isThisReplyToxic} />
      </form>

      {isThisReplyToxic && (
        <div className="flex justify-end mt-2 px-4">
          <button 
            type="button" 
            onClick={handleCancel}
            className="text-[10px] font-bold text-gray-400 hover:text-gray-600 underline"
          >
            内容を消して書き直す
          </button>
        </div>
      )}
    </div>
  )
}