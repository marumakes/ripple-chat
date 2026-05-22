import { useState } from "react";
import { MessagingLayout } from "@/components/messaging/MessagingLayout";
import { useConversations } from "@/hooks/messaging/useConversations";
import { useMessages } from "@/hooks/messaging/useMessages";
import { useAuth } from "@/hooks/useAuth";

/**
 * Top-level messaging page. Manages selected conversation via local state
 * (no router dependency) so it can be dropped into any React app.
 */
export function MessagingPage() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const { conversations, isLoading: isConversationLoading } =
    useConversations();

  // If the selected conversation was removed (kicked, group deleted), treat as deselected.
  const activeConversationId =
    selectedConversationId !== null &&
    conversations.some((c) => c.id === selectedConversationId)
      ? selectedConversationId
      : null;

  const {
    messages,
    isLoading: isMessageLoading,
    hasMore,
    error: loadingError,
    sendError,
    send,
    removeMessage,
    loadMore,
  } = useMessages(activeConversationId);

  if (!user) return null;

  return (
    <MessagingLayout
      conversations={conversations}
      isConversationLoading={isConversationLoading}
      selectedConversationId={activeConversationId}
      onSelectConversation={setSelectedConversationId}
      messages={messages}
      isMessageLoading={isMessageLoading}
      hasMore={hasMore}
      loadMore={loadMore}
      loadingError={loadingError}
      sendError={sendError}
      send={send}
      removeMessage={removeMessage}
      currentUserId={user.id}
    />
  );
}
