import { supabase } from "@/lib/supabase";

export async function blockUser(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc("block_user", { target_id: targetUserId });
  if (error) throw error;
}

export async function unblockUser(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc("unblock_user", { target_id: targetUserId });
  if (error) throw error;
}

export async function getDmBlockStatus(
  conversationId: string,
): Promise<{ iBlockedThem: boolean; theyBlockedMe: boolean }> {
  const { data, error } = await supabase.rpc("get_dm_block_status", {
    conv_id: conversationId,
  });
  if (error) throw error;
  const row = (data as { i_blocked_them: boolean; they_blocked_me: boolean }[] | null)?.[0];
  return {
    iBlockedThem: row?.i_blocked_them ?? false,
    theyBlockedMe: row?.they_blocked_me ?? false,
  };
}
