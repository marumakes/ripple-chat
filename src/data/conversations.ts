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
  recipientId?: string; // used to initiate new conversations
};

// ---- Internal Supabase row types ----

type ParticipantRow = {
  user_id: string;
  unread_count: number;
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
): DisplayFields {
  if (others.length === 0) return { title: "Deleted User" };

  if (type === "direct") {
    const user = others[0];
    if (!user) return { title: "Deleted User" };
    return {
      title: user.display_name,
      avatarUrl: user.avatar_url ?? undefined,
      recipientId: user.id,
    };
  }

  return {
    title: others.map((u) => (u ? u.display_name : "Deleted User")).join(", "),
  };
}

function mapToSummary(
  row: ConversationRow,
  userId: string,
): ConversationSummary {
  const others = row.conversation_participants
    .filter((p) => p.user_id !== userId)
    .map((p) => p.profiles);

  const { title, avatarUrl, recipientId } = getDisplayFields(row.type, others);

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
      `id, type, created_at, last_message, last_message_at,
       conversation_participants (
         user_id, unread_count,
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
