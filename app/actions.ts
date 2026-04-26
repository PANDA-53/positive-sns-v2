"use server";

import { createClient } from '../utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * ログイン
 */
export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) return redirect('/login?error=auth-failed');
  
  revalidatePath('/', 'layout');
  redirect('/');
}

/**
 * 新規登録
 */
export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signUp({ email, password });
  
  if (error) return redirect('/login?error=signup-failed');
  
  // プロフィールはSQLのトリガーで自動作成される設定
  redirect('/');
}

/**
 * ログアウト
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * 新規投稿作成
 */
export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  // 投稿を挿入 (user_idをセットすることでRLSをパスします)
  const { error } = await supabase.from('posts').insert({
    content,
    user_id: user.id,
  });

  if (error) {
    console.error("投稿エラー:", error.message);
    return;
  }

  revalidatePath('/');
}

/**
 * 返信作成
 */
export async function createReply(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const parentId = formData.get('parentId') as string;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  // 返信もpostsテーブルに保存（parent_idを入れることで返信扱いにする）
  const { error } = await supabase.from('posts').insert({
    content,
    parent_id: parentId,
    user_id: user.id,
  });

  if (error) {
    console.error("返信エラー:", error.message);
    return;
  }

  revalidatePath('/');
}

/**
 * プロフィール更新
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const fullName = formData.get('fullName') as string;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    full_name: fullName,
  });

  if (error) return redirect('/profile?error=update-failed');
  
  revalidatePath('/');
  redirect('/');
}