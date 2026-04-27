"use server";

import { createClient } from '../utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI判定ロジック
 * SAFE/TOXICの基準を項目別に整理
 */
async function checkContentWithCustomRules(content: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたはSNSのモデレーターです。以下の基準に従って投稿を判定してください。

【TOXIC（投稿を禁止する基準）】
・他者に対する誹謗中傷、攻撃的な発言
・差別、偏見、または尊厳を傷つける内容
・コミュニティの和を乱すような過度に攻撃的な言葉
・他者を不快にする意図が感じられる自己中心的な主張

【SAFE（投稿を許可する基準）】
・誰かを笑顔にする、またはポジティブな日常の共有
・建設的な意見交換や、敬意を払ったコミュニケーション
・個人の感想や日記としての健全な内容
・自責や後悔を含むネガティブな表現は、他者を攻撃するものでなければ許可されるべき
例：自分はなんてダメな人間なんだろう...（これは自己表現であり、他者を攻撃していないためSAFEと判断されるべき）
例：消えたい。死にたい。（これも自己表現であり、他者を攻撃していないためSAFEと判断されるべき）

出力は "SAFE" または "TOXIC" のいずれか1単語のみとしてください。`
        },
        { 
          role: "user", 
          content: `以下の投稿内容を判定してください：\n\n"${content}"` 
        }
      ],
      temperature: 0,
    });

    const result = response.choices[0].message.content || "";
    return result.includes("TOXIC");
  } catch (error) {
    console.error("AI判定エラー:", error);
    return false; 
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
  const imageFile = formData.get('image') as File;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  // 1. AI判定（メイン投稿用）
  const isToxic = await checkContentWithCustomRules(content);
  if (isToxic) return redirect('/?error=toxic-content');

  let imageUrl = null;

  // 2. 画像のアップロード処理
  if (imageFile && imageFile.size > 0 && imageFile.name !== 'undefined') {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('post_images')
      .upload(fileName, imageFile);
    
    if (uploadError) {
      console.error("Post Image Upload Error:", uploadError.message);
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('post_images')
        .getPublicUrl(fileName);
      imageUrl = publicUrl;
    }
  }

  // 3. DBに保存
  const { error: dbError } = await supabase.from('posts').insert({ 
    content, 
    user_id: user.id,
    image_url: imageUrl
  });

  if (dbError) {
    console.error("Post DB Error:", dbError.message);
    return redirect(`/?error=db_failed`);
  }

  revalidatePath('/');
  redirect('/'); 
}

export async function createReply(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const parentId = formData.get('parentId') as string;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1. AI判定（返信用：専用のエラーコードとparentIdを付与）
  const isToxic = await checkContentWithCustomRules(content);
  if (isToxic) {
    return redirect(`/?error=toxic-content-reply&parentId=${parentId}`);
  }

  // 2. DBに保存
  await supabase.from('posts').insert({ 
    content, 
    parent_id: parentId, 
    user_id: user.id 
  });

  revalidatePath('/');
  redirect('/'); 
}

// --- プロフィール更新 ---
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const fullName = formData.get('fullName') as string;
  const bio = formData.get('bio') as string;
  const avatarFile = formData.get('avatar') as File;
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return redirect('/login');

  const { data: current } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single();
  
  let avatarUrl = current?.avatar_url || null;

  if (avatarFile && avatarFile.size > 0 && avatarFile.name !== 'undefined') {
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true });
    
    if (uploadError) {
      return redirect(`/profile?error=storage_${encodeURIComponent(uploadError.message)}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    avatarUrl = publicUrl;
  }

  const updateData = { 
    id: user.id, 
    full_name: fullName,
    bio: bio,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(), 
  };

  const { error: dbError } = await supabase.from('profiles').upsert(updateData);
  if (dbError) {
    return redirect(`/profile?error=db_${encodeURIComponent(dbError.message)}`);
  }

  revalidatePath('/', 'layout'); 
  revalidatePath('/profile');
  revalidatePath(`/users/${user.id}`);
  redirect(`/users/${user.id}`);
}

// --- リアクション・友達機能 ---
export async function handleReaction(postId: number, reactionType: 'awesome' | 'hug') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: existing } = await supabase.from('reactions').select('id').eq('post_id', postId).eq('user_id', user.id).eq('type', reactionType).single();
  if (existing) { await supabase.from('reactions').delete().eq('id', existing.id); } 
  else { await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, type: reactionType }); }
  revalidatePath('/');
}

export async function sendFriendRequest(friendId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('friendships').insert({ user_id: user.id, friend_id: friendId, status: 'pending' });
  revalidatePath('/');
}

export async function acceptFriendRequest(formData: FormData) {
  const requesterId = formData.get('requesterId') as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !requesterId) return;
  await supabase.from('friendships').update({ status: 'accepted' }).eq('user_id', requesterId).eq('friend_id', user.id);
  revalidatePath('/'); 
}

export async function deleteFriendship(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('friendships').delete().or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`);
  revalidatePath('/');
}

export async function deletePost(formData: FormData) {
  const postId = formData.get('postId') as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('削除失敗:', error);
    return;
  }

  revalidatePath('/');
}