import { supabase } from "@/lib/supabase";

// ============================================================
// Types
// ============================================================

export type ConversationSummary = {
  id: string;
  type: "direct" | "group";
  title: string;
  lastMessage?: string;
  lastMessageAt: string;
  avatarUrl?: string;
  unreadCount: number;
  recipientId?: string;
  currentUserRole?: "admin" | "member";
};

export type ConversationMember = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  username: string;
  role: "admin" | "member";
};

// ---- Internal Supabase row types ----

type ParticipantRow = {
  user_id: string;
  unread_count: number;
  role: "admin" | "member";
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

type ConversationRow = {
  id: string;
  type: "direct" | "group";
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
  group_name: string | null;
  group_avatar_url: string | null;
  conversation_participants: ParticipantRow[];
};

// ============================================================
// Mapping helpers
// ============================================================

type DisplayFields = {
  title: string;
  avatarUrl?: string;
  recipientId?: string;
};

function getDisplayFields(
  type: "direct" | "group",
  others: ParticipantRow["profiles"][],
  groupName?: string | null,
): DisplayFields {
  if (type === "direct") {
    if (others.length === 0) return { title: "Deleted User" };
    const user = others[0];
    if (!user) return { title: "Deleted User" };
    return {
      title: user.display_name,
      avatarUrl: user.avatar_url ?? undefined,
      recipientId: user.id,
    };
  }

  return {
    title:
      groupName ||
      others.map((u) => (u ? u.display_name : "Deleted User")).join(", "),
  };
}

function mapToSummary(
  row: ConversationRow,
  userId: string,
): ConversationSummary {
  const others = row.conversation_participants
    .filter((p) => p.user_id !== userId)
    .map((p) => p.profiles);

  const { title, avatarUrl: directAvatarUrl, recipientId } = getDisplayFields(row.type, others, row.group_name);

  // For groups, prefer the uploaded group avatar over the generated title initials.
  const avatarUrl = row.group_avatar_url ?? directAvatarUrl;

  const me = row.conversation_participants.find((p) => p.user_id === userId);

  return {
    id: row.id,
    type: row.type,
    title,
    lastMessage: row.last_message ?? undefined,
    lastMessageAt: row.last_message_at ?? row.created_at,
    avatarUrl,
    unreadCount: me?.unread_count ?? 0,
    recipientId,
    currentUserRole: me?.role,
  };
}

// ============================================================
// Queries
// ============================================================

/**
 * Fetches all conversations the user participates in, with display
 * fields, avatars, and per-user unread counts.
 *
 * @param userId - The authenticated user's id.
 * @returns Summaries sorted by last_message_at descending.
 */
export async function getMyConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `id, type, created_at, last_message, last_message_at, group_name, group_avatar_url,
       conversation_participants (
         user_id, unread_count, role,
         profiles ( id, display_name, avatar_url )
       )`,
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  if (!data) return [];

  return (data as unknown as ConversationRow[]).map((c) =>
    mapToSummary(c, userId),
  );
}

/**
 * Searches profiles by username or display_name for the new-conversation
 * picker. Excludes the current user from results.
 *
 * @param query - Partial username or display name to search for.
 * @param currentUserId - Excluded from results.
 * @returns Matching profile rows (max 20).
 */
export async function searchUsers(
  query: string,
  currentUserId: string,
): Promise<
  {
    id: string;
    display_name: string;
    avatar_url: string | null;
    username: string;
  }[]
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, username")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq("id", currentUserId)
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Mutations
// ============================================================

async function createDirectConversation(
  currentUserId: string,
  recipientId: string,
): Promise<string> {
  // Uses a SECURITY DEFINER RPC so both participant rows can be
  // inserted atomically without RLS blocking the recipient insert.
  const { data, error } = await supabase.rpc("create_direct_conversation", {
    creator_id: currentUserId,
    recipient_id: recipientId,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Returns an existing direct conversation id for the two users via RPC,
 * or creates a new one if none exists.
 *
 * @param currentUserId - The user initiating the conversation.
 * @param recipientId   - The other participant's user id.
 * @returns The conversation id.
 */
export async function getOrCreateConversation(
  currentUserId: string,
  recipientId: string,
): Promise<string> {
  const { data: existingId, error: rpcError } = await supabase.rpc(
    "get_direct_conversation",
    { user_a: currentUserId, user_b: recipientId },
  );

  if (rpcError) throw rpcError;
  if (existingId) return existingId;
  return createDirectConversation(currentUserId, recipientId);
}

export async function createGroupConversation(
  creatorId: string,
  participantIds: string[],
  groupName?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_group_conversation", {
    creator_id: creatorId,
    participant_ids: participantIds,
    p_group_name: groupName ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function getConversationMembers(
  conversationId: string,
): Promise<ConversationMember[]> {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("user_id, role, profiles ( id, display_name, avatar_url, username )")
    .eq("conversation_id", conversationId);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    role: row.role as "admin" | "member",
    displayName: row.profiles?.display_name ?? "Deleted User",
    avatarUrl: row.profiles?.avatar_url ?? null,
    username: row.profiles?.username ?? "",
  }));
}

export async function renameGroup(
  conversationId: string,
  newName: string,
): Promise<void> {
  const { error } = await supabase.rpc("rename_group", {
    conv_id: conversationId,
    new_name: newName,
  });
  if (error) throw error;
}

export async function kickMember(
  conversationId: string,
  targetUserId: string,
): Promise<void> {
  const { error } = await supabase.rpc("kick_member", {
    conv_id: conversationId,
    target_id: targetUserId,
  });
  if (error) throw error;
}

export async function addGroupMembers(
  conversationId: string,
  userIds: string[],
): Promise<void> {
  const { error } = await supabase.rpc("add_group_members", {
    conv_id: conversationId,
    user_ids: userIds,
  });
  if (error) throw error;
}

export async function promoteToAdmin(
  conversationId: string,
  targetUserId: string,
): Promise<void> {
  const { error } = await supabase.rpc("promote_to_admin", {
    conv_id: conversationId,
    target_id: targetUserId,
  });
  if (error) throw error;
}

export async function leaveGroup(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_group", {
    conv_id: conversationId,
  });
  if (error) throw error;
}

export async function deleteGroup(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_group", {
    conv_id: conversationId,
  });
  if (error) throw error;
}

/**
 * Uploads a new group avatar and saves the URL to the conversation row.
 * Always writes to groups/{conversationId}/avatar so re-uploads replace
 * the old file. Caller must be a group admin (enforced by both the
 * storage policy and the update_group_avatar RPC).
 */
export async function uploadGroupAvatar(
  conversationId: string,
  file: File,
): Promise<string> {
  const path = `groups/${conversationId}/avatar`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);

  const url = `${publicUrl}?t=${Date.now()}`;

  const { error: rpcError } = await supabase.rpc("update_group_avatar", {
    conv_id: conversationId,
    avatar_url: url,
  });

  if (rpcError) throw rpcError;

  return url;
}
