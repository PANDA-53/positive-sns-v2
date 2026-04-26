// components/reaction-buttons.tsx (新規作成)
'use client';

import { AwesomeIcon, HugIcon } from './icons';
import { handleReaction } from '../app/actions';
import { useState } from 'react';

type Props = {
  postId: number;
  awesomeCount: number;
  hugCount: number;
  initialMyReaction: 'awesome' | 'hug' | null;
};

export function ReactionButtons({ postId, awesomeCount, hugCount, initialMyReaction }: Props) {
  const [myReaction, setMyReaction] = useState<'awesome' | 'hug' | null>(initialMyReaction);
  const [counts, setCounts] = useState({ awesome: awesomeCount, hug: hugCount });

  const onClickReaction = async (type: 'awesome' | 'hug') => {
    // 楽観的アップデート（サーバーの返答を待たずに見た目を変える）
    let newCounts = { ...counts };
    let newMyReaction = null;

    if (myReaction === type) {
      // 同じリアクションを押した場合はキャンセル
      newCounts[type]--;
      newMyReaction = null;
    } else {
      // 新しいリアクションを押した場合
      if (myReaction) {
        newCounts[myReaction]--; // 前のリアクションを減らす
      }
      newCounts[type]++;
      newMyReaction = type;
    }

    setMyReaction(newMyReaction);
    setCounts(newCounts);

    // サーバー側の処理を呼び出す
    await handleReaction(postId, type);
  };

  return (
    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
      {/* Awesome Button */}
      <button
        onClick={() => onClickReaction('awesome')}
        className={`flex items-center gap-2 group transition-colors ${
          myReaction === 'awesome' ? 'text-blue-600' : 'text-gray-400'
        }`}
      >
        <AwesomeIcon className={`w-5 h-5 transition-transform group-hover:scale-110 ${
          myReaction === 'awesome' ? 'fill-blue-100' : 'fill-none'
        }`} />
        <span className="text-xs font-bold">{counts.awesome} Awesome</span>
      </button>

      {/* Hug Button */}
      <button
        onClick={() => onClickReaction('hug')}
        className={`flex items-center gap-2 group transition-colors ${
          myReaction === 'hug' ? 'text-pink-600' : 'text-gray-400'
        }`}
      >
        <HugIcon className={`w-5 h-5 transition-transform group-hover:scale-110 ${
          myReaction === 'hug' ? 'fill-pink-100' : 'fill-none'
        }`} />
        <span className="text-xs font-bold">{counts.hug} Hug</span>
      </button>
    </div>
  );
}