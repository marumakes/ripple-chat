import { supabase } from "@/lib/supabase";

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export type Profile = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: { display_name: string; username: string },
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) throw error;
}

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type))
    return "Please upload a JPEG, PNG, WebP, or GIF.";
  if (file.size > MAX_AVATAR_BYTES)
    return "Image must be under 2 MB.";
  return null;
}

/**
 * Uploads a new avatar to storage and writes the public URL back to
 * the user's profile row. Always writes to the same path (userId/avatar)
 * so re-uploads replace the old file rather than orphaning it.
 * A cache-busting query param is appended so browsers fetch the new image.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(`${userId}/avatar`, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(`${userId}/avatar`);

  const url = `${publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", userId);

  if (updateError) throw updateError;

  return url;
}
