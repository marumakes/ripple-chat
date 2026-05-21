import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/data/profile";

type BroadcastPayload = {
  user_id: string;
  display_name: string;
  typing: boolean;
};

/**
 * Tracks who is typing in a conversation using Supabase Broadcast.
 *
 * Broadcast (not Presence) is used intentionally: Presence sends an
 * automatic "leave" event when a channel is torn down, which React's
 * StrictMode double-invoke triggers in development, causing the indicator
 * to flicker off. Broadcast has no such side effect — the only way to
 * stop appearing as typing is to explicitly send `typing: false`.
 *
 * A 3-second auto-clear guards against missed "stop" broadcasts.
 */
export function useTypingPresence(
  conversationId: string | null,
  currentUserId: string | null,
) {
  // userId -> displayName for everyone currently typing (excluding self)
  const [typingMap, setTypingMap] = useState<Map<string, string>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const displayNameRef = useRef<string>("");
  const autoClearRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    if (!currentUserId) return;
    getProfile(currentUserId).then((p) => {
      displayNameRef.current = p?.display_name ?? "";
    });
  }, [currentUserId]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`typing:${conversationId}`);

    channel
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }: { payload: BroadcastPayload }) => {
          const { user_id, display_name, typing } = payload;
          if (user_id === currentUserId) return;

          // Cancel any pending auto-clear for this user.
          const existing = autoClearRefs.current.get(user_id);
          if (existing) clearTimeout(existing);

          setTypingMap((prev) => {
            const next = new Map(prev);
            if (typing) next.set(user_id, display_name);
            else next.delete(user_id);
            return next;
          });

          if (typing) {
            // Safety net: remove from map if we never receive a "stop" broadcast.
            const timeout = setTimeout(() => {
              setTypingMap((prev) => {
                const next = new Map(prev);
                next.delete(user_id);
                return next;
              });
              autoClearRefs.current.delete(user_id);
            }, 3000);
            autoClearRefs.current.set(user_id, timeout);
          } else {
            autoClearRefs.current.delete(user_id);
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setTypingMap(new Map());
      autoClearRefs.current.forEach((t) => clearTimeout(t));
      autoClearRefs.current.clear();
    };
  }, [conversationId, currentUserId]);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      void channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: currentUserId,
          display_name: displayNameRef.current,
          typing: isTyping,
        },
      });
    },
    [currentUserId],
  );

  const typingNames = Array.from(typingMap.values());
  return { typingNames, setTyping };
}
