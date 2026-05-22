import { supabase } from "@/lib/supabase";

// ============================================================
// Types
// ============================================================

export type Message = {
  id: string;
  conversation_id: string;
  sender: {
    id: string | null;
    display_name: string;
    avatar_url: string | null;
  };
  content: string;
  created_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
};

// ---- Internal Supabase row types ----

type SenderRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  sender_id: SenderRow | SenderRow[] | null;
};

// ============================================================
// Mapping helpers
// ============================================================

function normaliseSender(
  raw: SenderRow | SenderRow[] | null,
): Message["sender"] {
  // Supabase occasionally returns a joined row as an array — normalise either case.
  const s = Array.isArray(raw) ? raw[0] : raw;
  return {
    id: s?.id ?? null,
    display_name: s?.display_name ?? "Deleted User",
    avatar_url: s?.avatar_url ?? null,
  };
}

function mapMessageRow(m: MessageRow): Message {
  return {
    id: m.id,
    conversation_id: m.conversation_id,
    content: m.content,
    created_at: m.created_at,
    deleted_at: m.deleted_at,
    is_deleted: m.is_deleted,
    sender: normaliseSender(m.sender_id),
  };
}

// ============================================================
// Queries
// ============================================================

const MESSAGE_SELECT =
  "id, conversation_id, content, created_at, deleted_at, is_deleted, sender_id ( id, display_name, avatar_url )";

const PAGE_SIZE = 50;

export type FetchMessagesResult = {
  messages: Message[];
  hasMore: boolean;
};

/**
 * Loads the PAGE_SIZE most recent messages for a conversation, returned
 * oldest-first. Pass a `before` ISO timestamp to fetch the page prior to
 * the oldest currently loaded message (for "load earlier" pagination).
 */
export async function fetchMessages(
  conversationId: string,
  before?: string,
): Promise<FetchMessagesResult> {
  let query = supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as MessageRow[];
  return {
    messages: rows.map(mapMessageRow).reverse(),
    hasMore: rows.length === PAGE_SIZE,
  };
}

/**
 * Fetches a single message by id with sender fields joined.
 * Used by sendMessage and the realtime handler to avoid re-fetching
 * the whole thread just to hydrate one row.
 */
async function fetchMessageById(messageId: string): Promise<Message | null> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("id", messageId)
    .single();

  if (error || !data) return null;
  return mapMessageRow(data as MessageRow);
}

// ============================================================
// Mutations
// ============================================================

/**
 * Inserts a new message into the conversation.
 * Note: last_message and unread_count updates are handled by DB
 * triggers — no client-side conversation update needed here.
 *
 * @param conversationId - Target thread id.
 * @param senderId       - Authenticated user inserting the row.
 * @param content        - Plain-text message body.
 * @returns The newly created Message, re-fetched with sender fields joined.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<Message> {
  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select()
    .single();

  if (error || !inserted) throw error ?? new Error("Insert returned no data");

  const message = await fetchMessageById(inserted.id);
  if (!message) throw new Error("Inserted message not found after fetch");
  return message;
}

/**
 * Soft-deletes a message by setting is_deleted and deleted_at.
 * The DB trigger sync_last_message_on_delete keeps the conversation
 * preview in sync automatically.
 *
 * @param messageId - Primary key of the message to delete.
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_message", {
    message_id: messageId,
  });

  if (error) throw error;
}

// ============================================================
// Realtime
// ============================================================

/**
 * Subscribes to INSERT and UPDATE events on the messages table for
 * one conversation. On each event the message is re-fetched with full
 * sender fields before being passed to the callback.
 *
 * @param conversationId - Thread to subscribe to.
 * @param onChange       - Called with the event type and hydrated Message.
 * @returns Unsubscribe function — call on component unmount.
 */
export function subscribeToMessages(
  conversationId: string,
  onChange: (event: "INSERT" | "UPDATE", message: Message) => void,
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        if (payload.eventType !== "INSERT" && payload.eventType !== "UPDATE")
          return;

        const message = await fetchMessageById(payload.new.id);
        if (message) onChange(payload.eventType, message);
      },
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
