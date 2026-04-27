"use client"

import { useEffect, useRef } from 'react'
import { createReply } from '@/app/actions'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useFormStatus } from 'react-dom'
import Image from 'next/image' // 追加

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
        toastIdRef.current = toast.custom((t) => (
          <div className="bg-white/90 backdrop-blur-md border border-gray-100 shadow-xl rounded-full p-2 pr-6 flex items-center gap-3 w-fit min-w-[300px] max-w-[420px]">
            {/* ケアロボット：スケール調整で余白を埋める */}
            <div className="relative w-14 h-14 flex-shrink-0">
              <Image 
                src="/care-robot.png" 
                alt="Care Robot"
                fill
                className="object-contain scale-150" 
              />
            </div>
            
            {/* テキスト：リプライ用の文言に調整 */}
            <div className="flex flex-col justify-center min-w-0">
              <p className="text-[13px] font-bold text-gray-800 leading-[1.2] mb-0.5 whitespace-nowrap">
                その言葉を伝えたら、貴方は笑顔になれますか？
              </p>
              <p className="text-[11px] text-gray-500 leading-tight">
                誰かが傷つく内容は、お伝えできません。
              </p>
            </div>

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