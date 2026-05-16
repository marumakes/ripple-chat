import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  fetchMessages,
  sendMessage,
  deleteMessage,
  subscribeToMessages,
  type Message,
} from "@/data/messages";

type SetMessages = React.Dispatch<React.SetStateAction<Message[]>>;

function handleIncomingMessage(
  event: "INSERT" | "UPDATE",
  message: Message,
  setMessages: SetMessages,
  resetUnread: () => void,
) {
  if (event === "INSERT") {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
    resetUnread();
  }
  if (event === "UPDATE") {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
  }
}

async function loadMessages(
  cid: string,
  setMessages: SetMessages,
  setError: (e: Error | null) => void,
  setIsLoading: (v: boolean) => void,
  resetUnread: () => void,
) {
  setIsLoading(true);
  setError(null);
  try {
    const msgs = await fetchMessages(cid);
    setMessages(msgs);
    await resetUnread();
  } catch (err) {
    setError(err as Error);
    setMessages([]);
  } finally {
    setIsLoading(false);
  }
}

/**
 * Loads and subscribes to messages for one conversation.
 * Exposes send and soft-delete helpers.
 *
 * @param conversationId - Active conversation id, or null when none selected.
 * @returns Messages, loading/error flags, sendError, send, and removeMessage.
 */
export function useMessages(conversationId: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !conversationId) return;

    const cid = conversationId;
    const resetUnread = () =>
      supabase.rpc("reset_unread_count", { conv_id: cid, uid: user.id });

    loadMessages(cid, setMessages, setError, setIsLoading, resetUnread);

    const unsubscribe = subscribeToMessages(cid, (event, message) =>
      handleIncomingMessage(event, message, setMessages, resetUnread),
    );

    return () => {
      void unsubscribe();
      setMessages([]);
    };
  }, [conversationId, user, authLoading]);

  /**
   * Sends a message to the active conversation.
   * Surfaces failures as sendError rather than throwing.
   */
  const send = useCallback(
    async (content: string) => {
      if (!user) throw new Error("Not authenticated");
      if (!conversationId) return;
      setSendError(null);
      try {
        await sendMessage(conversationId, user.id, content);
      } catch (err) {
        setSendError(
          err instanceof Error ? err.message : "Failed to send message.",
        );
      }
    },
    [conversationId, user],
  );

  /**
   * Optimistically marks a message as deleted locally, then
   * persists the soft-delete to Supabase.
   */
  const removeMessage = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_deleted: true } : m)),
    );
    try {
      await deleteMessage(messageId);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  return { messages, isLoading, error, sendError, send, removeMessage };
}
