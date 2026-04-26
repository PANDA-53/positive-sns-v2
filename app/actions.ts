"use server";

import { createClient } from '../utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * カスタムAI判定ロジック（OpenAI GPT-4o-mini使用）
 */
async function checkContentWithCustomRules(content: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
            あなたはSNSのモデレーターです。以下のルールに従い、投稿を「許可(SAFE)」か「拒否(TOXIC)」で判定してください。
            判定結果のみを返してください。判定理由は不要です。

            【拒否する基準】
            1. 他者への攻撃、悪口、馬鹿にするような表現。

            3. 政治、宗教、または特定の団体への攻撃。
            4. 宣伝、スパム行為。

            【許可する基準】
            1. ポジティブな日常の出来事。
            2. 感謝の言葉や、他者を励ます内容。
            3. 一般的な世間話。
          `
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0,
    });

    const result = response.choices[0].message.content;
    return result?.includes("TOXIC");
  } catch (error) {
    console.error("AI判定中にエラーが発生しました:", error);
    return false; // エラー時は一旦通すが、ログで確認できるようにする
  }
}

// --- 認証系 ---
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

// --- 投稿・返信系 ---
export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // カスタムAI判定を実行
  const isToxic = await checkContentWithCustomRules(content);
  if (isToxic) {
    return redirect('/?error=toxic-content');
  }

  await supabase.from('posts').insert({ content, user_id: user.id });
  revalidatePath('/');
}

export async function createReply(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const parentId = formData.get('parentId') as string;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // カスタムAI判定を実行（返信も同様にチェック！）
  const isToxic = await checkContentWithCustomRules(content);
  if (isToxic) {
    return redirect('/?error=toxic-content');
  }

  await supabase.from('posts').insert({ 
    content, 
    parent_id: parentId, 
    user_id: user.id 
  });
  revalidatePath('/');
}

// --- プロフィール更新（画像アップロード対応） ---
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
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      avatarUrl = publicUrl;
    }
  }

  const updateData: any = { id: user.id, full_name: fullName };
  if (avatarUrl) {
    updateData.avatar_url = avatarUrl;
  }

  const { error: dbError } = await supabase.from('profiles').upsert(updateData);
  if (dbError) return redirect('/profile?error=update-failed');
  
  revalidatePath('/', 'layout');
  redirect('/');
}