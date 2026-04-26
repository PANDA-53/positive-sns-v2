"use server";

import { createClient } from '../utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return redirect('/login?error=auth-failed');
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return redirect('/login?error=signup-failed');
  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('posts').insert({ content, user_id: user.id });
  if (error) console.error(error.message);
  revalidatePath('/');
}

export async function createReply(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const parentId = formData.get('parentId') as string;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('posts').insert({ content, parent_id: parentId, user_id: user.id });
  if (error) console.error(error.message);
  revalidatePath('/');
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const fullName = formData.get('fullName') as string;
  const avatarFile = formData.get('avatar') as File;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  let avatarUrl = null;

  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      avatarUrl = publicUrl;
    }
  }

  const updateData: any = { id: user.id, full_name: fullName };
  if (avatarUrl) updateData.avatar_url = avatarUrl;

  await supabase.from('profiles').upsert(updateData);
  
  revalidatePath('/', 'layout');
  redirect('/');
}