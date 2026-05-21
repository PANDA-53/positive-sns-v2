'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '../utils/supabase/client'; 
import { Home, Search, PlusCircle, Bell, Send, X } from 'lucide-react';
import PostForm from './post-form'; 

const GOLD_COLOR = "#B8860B";

interface BottomNavProps {
  currentUserId: string; 
  onPostSuccess?: (newPostData: any) => void; // 💡 柔軟にanyで受け取る
}

export function BottomNav({ currentUserId, onPostSuccess }: BottomNavProps) {
  const pathname = usePathname();
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); 
  const supabase = createClient();

  useEffect(() => {
    if (!currentUserId) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    fetchUnreadCount();

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setUnreadCount((prev) => prev + 1);
          if (payload.eventType === 'UPDATE') {
            const newDoc = payload.new as any;
            const oldDoc = payload.old as any;
            if (oldDoc.is_read === false && newDoc.is_read === true) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const navItems = [
    { label: '', href: '/', icon: Home },              
    { label: '', href: '/search', icon: Search },      
    { label: '', href: '#', icon: PlusCircle, isTrigger: true }, 
    { label: '', href: '/notifications', icon: Bell },  
    { label: '', href: '/messages', icon: Send },       
  ];

  return (
    <>
      <div className="fixed bottom-5 left-0 right-0 z-50 px-5">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 bg-[#F9F6E5]/95 dark:bg-zinc-900/95 backdrop-blur-md border border-[#B8860B]/10 dark:border-zinc-800/80 shadow-[0_8px_32px_rgba(184,134,11,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-[2rem]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isTrigger ? isPostOpen : (pathname === item.href || pathname.startsWith(item.href + '/'));

            if (item.isTrigger) {
              return (
                <button key={item.href} onClick={() => setIsPostOpen(!isPostOpen)} className="flex flex-col items-center justify-center w-full h-full transition-all active:scale-95">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? GOLD_COLOR : '#9CA3AF' }} />
                </button>
              );
            }

            return (
              <Link key={item.href} href={item.href} onClick={() => { if (pathname === item.href) window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex flex-col items-center justify-center w-full h-full relative active:scale-95">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? GOLD_COLOR : '#9CA3AF' }} fill={isActive ? GOLD_COLOR : 'none'} />
                {item.href === '/notifications' && unreadCount > 0 && (
                  <span className="absolute top-2.5 right-6 bg-rose-500 text-white text-[9px] font-black h-4 min-w-4 px-1 flex items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-900 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {isPostOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsPostOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-[2rem] p-6 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 dark:border-zinc-800/50 pb-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Create New Post</span>
              <button onClick={() => setIsPostOpen(false)} className="p-1 rounded-full bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500"><X size={18} /></button>
            </div>

            {/* 💡 修正：受け取ったオブジェクトをそのまま上に流すだけのシンプルな構造に */}
            <PostForm 
              onSuccess={(newPostData) => {
                setIsPostOpen(false); 
                if (onPostSuccess) {
                  onPostSuccess(newPostData);
                }
              }} 
            />
          </div>
        </div>
      )}
    </>
  );
}