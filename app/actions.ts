"use server";

import { createClient } from '../utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * SNS「POSITIVES」モデレーター判定ロジック
 */
async function checkAndSuggestContent(content: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたはSNS「POSITIVES」のモデレーターです。以下の厳格な基準に従って投稿を判定し、不適切な場合はユーザーを導いてください。

【TOXIC（投稿禁止）】
・他者への誹謗中傷、攻撃的発言、差別、偏見、尊厳を傷つける内容
・コミュニティの和を乱す攻撃的な言葉、他者を不快にする自己中心的な主張
・他者の投稿を否定するコメント
・「sine(死ね)」「uzai(うざい)」等の隠語や、否定的感情を表す絵文字

【SAFE（許可）】
・ポジティブな内容、笑顔にする内容
・自責や後悔（自分はダメだ、死にたい等）は、他者を攻撃していないため「SAFE」と判定してください。

【出力ルール】
1. SAFEの場合： "SAFE" とのみ出力。
2. TOXICの場合： 以下の形式で出力してください。
    NG | 理由 | 言い換え案1 | 言い換え案2 | 言い換え案3

※重要：
・ベイマックスのように、丁寧で、温かみがあり、少し機械的なケアロボットの口調で提案してください。
・言い換え案には "" や 「」 や言い換え案１、２、３を含めないでください。
・否定的な意見には言い換え案を表示させないでください。
・「好きじゃない」「ダサい」などの主観的な否定的意見もTOXICと判定してください。
・NGの際に理由が分からないときは理由の部分には何も書かないでください。
・コメント内容がアドバイスであっても攻撃的な口調は言い換えを提案させてください。
・一人称は「私」、二人称は「あなた」としてください。`
        },
        { 
          role: "user", 
          content: `判定対象：\n\n"${content}"` 
        }
      ],
      temperature: 0.5,
    });

    const result = response.choices[0].message.content || "";
    
    if (result.startsWith("SAFE")) {
      return { isToxic: false, reason: "", suggestions: [] };
    } else {
      // 前後の不要な引用符を削除する正規表現を維持
      const parts = result.split("|").map(s => 
        s.trim().replace(/^["「']|["」']$/g, '') 
      );
      return { 
        isToxic: true, 
        reason: parts[1] || "規約に抵触する可能性があります", 
        suggestions: parts.slice(2) 
      };
    }
  } catch (error) {
    console.error("AI判定エラー:", error);
    return { isToxic: false, reason: "", suggestions: [] }; 
  }
}

// --- 返信作成 (ReplyForm連携用) ---
export async function createReply(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;
  const parentId = formData.get('parentId') as string;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isToxic: false };

  const result = await checkAndSuggestContent(content);
  
  // redirectせず、結果をオブジェクトで返すことでトップ戻りを防止
  if (result.isToxic) {
    return { 
      isToxic: true, 
      reason: result.reason, 
      suggestions: result.suggestions 
    };
  }

  await supabase.from('posts').insert({ content, parent_id: parentId, user_id: user.id });
  revalidatePath('/');
  return { isToxic: false };
}

// --- フレンド・削除・エラー解消用アクション ---

// 引数を string に変更
export async function deleteFriendship(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // friendId ではなく引数の targetUserId を直接使用
  await supabase.from('friendships').delete().eq('user_id', user.id).eq('friend_id', targetUserId);
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

// --- 認証・投稿・その他 ---
export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: formData.get('email') as string, password: formData.get('password') as string });
  if (error) return redirect('/login?error=auth-failed');
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email: formData.get('email') as string, password: formData.get('password') as string });
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
  const imageFile = formData.get('image') as File;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const result = await checkAndSuggestContent(content);
  if (result.isToxic) return { ...result, errorType: 'toxic-content' };

  let imageUrl = null;
  if (imageFile && imageFile.size > 0 && imageFile.name !== 'undefined') {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('post_images').upload(fileName, imageFile);
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('post_images').getPublicUrl(fileName);
      imageUrl = publicUrl;
    }
  }

  await supabase.from('posts').insert({ content, user_id: user.id, image_url: imageUrl });
  revalidatePath('/');
  return { isToxic: false };
}

export async function handleReaction(postId: number, reactionType: 'awesome' | 'hug') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: existing } = await supabase.from('reactions').select('id').eq('post_id', postId).eq('user_id', user.id).eq('type', reactionType).single();
  if (existing) { await supabase.from('reactions').delete().eq('id', existing.id); }
  else { await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, type: reactionType }); }
  revalidatePath('/');
}

export async function deletePost(formData: FormData) {
  const postId = formData.get('postId') as string;
  const supabase = await createClient();
  await supabase.from('posts').delete().eq('id', postId);
  revalidatePath('/');
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const fullName = formData.get('fullName') as string;
  const bio = formData.get('bio') as string;
  const avatarFile = formData.get('avatar') as File;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: current } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
  let avatarUrl = current?.avatar_url || null;

  if (avatarFile && avatarFile.size > 0 && avatarFile.name !== 'undefined') {
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    avatarUrl = publicUrl;
  }

  await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, bio: bio, avatar_url: avatarUrl, updated_at: new Date().toISOString() });
  revalidatePath('/', 'layout');
  redirect(`/users/${user.id}`);
}