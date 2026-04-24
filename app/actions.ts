'use server'

import { createClient } from '../utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * 認証関連
 */
export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=auth-failed')
  }

  // キャッシュをクリアしてトップへ強制移動
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * 投稿関連
 */
export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const content = formData.get('content') as string
  if (!content || content.trim() === '') return

  await supabase.from('posts').insert({ 
    content,
    user_name: 'Gimax' 
  })
  revalidatePath('/')
}

/**
 * コメント関連
 */
export async function createComment(formData: FormData) {
  const supabase = await createClient()
  const content = formData.get('content') as string
  const postId = formData.get('postId') as string

  if (!content || content.trim() === '') return

  const { error } = await supabase.from('comments').insert({ 
    content, 
    post_id: Number(postId), 
    user_name: 'Gimax' 
  })

  if (error) console.error('Comment Error:', error.message)
  revalidatePath('/')
}