import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConversationSummary } from "@/data/conversations";
import type { Message } from "@/data/messages";
import { MessagingSidebar } from "./MessagingSidebar";
import { MessagingHeader } from "./MessagingHeader";
import { MessageThread } from "./MessageThread";
import { NewConversationModal } from "./NewConversationModal";

interface MessagingLayoutProps {
  conversations: ConversationSummary[];
  isConversationLoading: boolean;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  messages: Message[];
  isMessageLoading: boolean;
  loadingError: Error | null;
  sendError: string | null;
  send: (content: string) => Promise<void>;
  removeMessage: (id: string) => Promise<void>;
  currentUserId: string;
}

export function MessagingLayout({
  conversations,
  isConversationLoading,
  selectedConversationId,
  onSelectConversation,
  messages,
  isMessageLoading,
  loadingError,
  sendError,
  send,
  removeMessage,
  currentUserId,
}: MessagingLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  );
  const isRecipientDeleted = selectedConversation?.title === "Deleted User";

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <MessagingSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        conversations={conversations}
        isLoading={isConversationLoading}
        selectedConversationId={selectedConversationId}
        onSelectConversation={onSelectConversation}
        onNewConversation={onSelectConversation}
      />

      <main
        className="flex flex-col flex-1 min-w-0 min-h-0 transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: sidebarOpen ? "18rem" : "0" }}
      >
        {selectedConversationId && selectedConversation ? (
          <>
            <MessagingHeader
              conversation={selectedConversation}
              sidebarOpen={sidebarOpen}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <MessageThread
                messages={messages}
                isLoading={isMessageLoading}
                loadingError={loadingError}
                sendError={sendError}
                send={send}
                handleDelete={removeMessage}
                currentUserId={currentUserId}
                isRecipientDeleted={isRecipientDeleted}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 items-center justify-center px-8 gap-5">
            <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center">
              <MessageCircle
                size={36}
                strokeWidth={1.5}
                className="text-muted-foreground"
              />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Your messages
              </h2>
              <p className="text-base text-muted-foreground max-w-xs">
                Select a conversation from the sidebar or start a new one.
              </p>
            </div>
            <Button onClick={() => setShowModal(true)} className="mt-2">
              New message
            </Button>
          </div>
        )}
      </main>

      <NewConversationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConversationReady={(id) => {
          onSelectConversation(id);
          setShowModal(false);
        }}
      />
    </div>
  );
}
