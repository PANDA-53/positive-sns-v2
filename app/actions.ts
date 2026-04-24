"use server";

import { createClient } from '../utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// ログイン処理（画像 のエラーを解消）
export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return redirect('/login?error=Could not authenticate user');

  revalidatePath('/', 'layout');
  redirect('/');
}

// 投稿処理（ログイン情報の紐付けを徹底）
export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  await supabase.from('posts').insert({
    content,
    user_id: user.id,
    user_name: 'Gimax', 
  });

  revalidatePath('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}