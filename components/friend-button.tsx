'use client';

import { useState } from 'react';
import { sendFriendRequest, deleteFriendship } from '../app/actions';

type Props = {
  targetUserId: string;
  initialStatus: 'none' | 'pending' | 'accepted' | 'me';
};

export function FriendButton({ targetUserId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);

  if (status === 'me') return null; // 自分にはボタンを出さない

  const handleRequest = async () => {
    if (status === 'none') {
      setStatus('pending');
      // 直接 string 型の ID を渡します
      await sendFriendRequest(targetUserId);
    } else if (status === 'pending' || status === 'accepted') {
      if (confirm('友達（または申請）を解除しますか？')) {
        setStatus('none');
        // 直接 string 型の ID を渡します
        await deleteFriendship(targetUserId);
      }
    }
  };

  return (
    <button
      onClick={handleRequest}
      className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all ${
        status === 'accepted' ? 'bg-green-100 text-green-600' :
        status === 'pending' ? 'bg-amber-100 text-amber-600' :
        'bg-blue-500 text-white shadow-sm'
      }`}
    >
      {status === 'accepted' ? '友達' :
       status === 'pending' ? '申請中' :
       '＋ 友達になる'}
    </button>
  );
}