import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  getMyConversations,
  type ConversationSummary,
} from "@/data/conversations";

function buildChannel(userId: string, onUpdate: () => void) {
  return supabase
    .channel(`conversations:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversations" },
      onUpdate,
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversation_participants",
        filter: `user_id=eq.${userId}`,
      },
      onUpdate,
    )
    .subscribe();
}

/**
 * Keeps the conversation list in sync via an initial fetch and
 * Supabase Realtime listeners on conversations and participants.
 *
 * @returns Conversations array, loading/error state, and a refetch helper.
 */
export function useConversations() {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasFetched = useRef(false);

  const loadConversations = useCallback(async (userId: string) => {
    // Only show loading skeleton on the very first fetch.
    // Subsequent refetches (from realtime events) update silently.
    if (!hasFetched.current) setIsLoading(true);
    setError(null);
    try {
      setConversations(await getMyConversations(userId));
      hasFetched.current = true;
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    void (async () => {
      await loadConversations(user.id);
    })();

    const channel = buildChannel(user.id, () => {
      void loadConversations(user.id);
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authLoading, user, loadConversations]);

  return {
    conversations,
    isLoading,
    error,
    refetch: () => {
      if (user) loadConversations(user.id);
    },
  };
}
