"use server";

import { createClient } from '../utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// ログイン処理 (image_982d4f.png のエラーを解消)
export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return redirect('/login?error=auth-failed');

  revalidatePath('/', 'layout');
  redirect('/');
}

// 新規登録処理 (新規追加)
export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 登録後のリダイレクト先（環境変数 image_a2a9f7.jpg を参照）
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
    },
  });

  if (error) return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  
  // 登録成功メッセージを表示するためにリダイレクト
  redirect('/login?message=check-email');
}

// 投稿作成
export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('posts').insert({
    content,
    user_id: user.id,
    user_name: 'Gimax',
  });
  revalidatePath('/');
}

// 返信作成 (parent_id を利用)
export async function createReply(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const parentId = formData.get('parentId') as string;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('posts').insert({
    content,
    user_id: user.id,
    user_name: 'Gimax',
    parent_id: parentId,
  });
  revalidatePath('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}