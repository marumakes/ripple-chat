import { useRef, useEffect, useLayoutEffect, useState, useCallback, type ReactNode } from "react";
import { Send, Trash2, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Message } from "@/data/messages";
import { useTypingPresence } from "@/hooks/messaging/useTypingPresence";
import clsx from "clsx";

interface MessageThreadProps {
  conversationId: string;
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadingError: Error | null;
  sendError: string | null;
  send: (content: string) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  currentUserId: string | null;
  isRecipientDeleted: boolean;
  isGroup: boolean;
}

function formatTypingText(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return "Several people are typing…";
}

function formatDateLabel(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Bubble({
  message,
  isOwn,
  onDelete,
}: {
  message: Message;
  isOwn: boolean;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  if (message.is_deleted) {
    return (
      <span className="text-sm italic px-4 py-2.5 rounded-2xl inline-block text-muted-foreground bg-muted">
        Message deleted
      </span>
    );
  }

  return (
    <div
      className={clsx(
        "group relative inline-flex items-end gap-2 max-w-full",
        isOwn ? "flex-row-reverse" : "flex-row",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isOwn && hovered && (
        <button
          onClick={onDelete}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="Delete message"
        >
          <Trash2 size={13} className="text-muted-foreground" />
        </button>
      )}

      <div>
        <div
          className={clsx(
            "px-4 py-2.5 text-sm leading-relaxed break-words",
            isOwn
              ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-2xl rounded-bl-sm bg-muted text-foreground",
          )}
        >
          {message.content}
        </div>
        <p
          className={clsx(
            "text-xs mt-1.5 px-1 text-muted-foreground",
            isOwn ? "text-right" : "text-left",
          )}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

export function MessageThread({
  conversationId,
  messages,
  isLoading,
  hasMore,
  loadMore,
  loadingError,
  sendError,
  send,
  handleDelete,
  currentUserId,
  isRecipientDeleted,
  isGroup,
}: MessageThreadProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollAnchorRef = useRef<number | null>(null);
  const preventScrollToBottomRef = useRef(false);
  const atBottomRef = useRef(true);

  const { typingNames, setTyping } = useTypingPresence(conversationId, currentUserId);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setTyping(false);
  }, [setTyping]);

  // Clean up on unmount or conversation change.
  useEffect(() => () => stopTyping(), [stopTyping]);

  // Reset scroll state when switching conversations.
  useEffect(() => {
    atBottomRef.current = true;
    setAtBottom(true);
    setUnreadCount(0);
  }, [conversationId]);

  // Track whether the viewport is near the bottom.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const nearBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      atBottomRef.current = nearBottom;
      setAtBottom(nearBottom);
      if (nearBottom) setUnreadCount(0);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [currentUserId]);

  // After prepending older messages, restore the scroll position so the
  // viewport stays anchored to the same message rather than jumping to top.
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const savedHeight = scrollAnchorRef.current;
    if (!container || savedHeight === null) return;
    container.scrollTop += container.scrollHeight - savedHeight;
    scrollAnchorRef.current = null;
  }, [messages]);

  useEffect(() => {
    if (preventScrollToBottomRef.current) {
      preventScrollToBottomRef.current = false;
      return;
    }
    if (!atBottomRef.current) {
      setUnreadCount((c) => c + 1);
      return;
    }
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      setTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
    } else {
      stopTyping();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadCount(0);
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    const container = scrollContainerRef.current;
    if (container) scrollAnchorRef.current = container.scrollHeight;
    preventScrollToBottomRef.current = true;
    setLoadingMore(true);
    try {
      await loadMore();
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    stopTyping();
    setSending(true);
    try {
      await send(trimmed);
      setInput("");
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  function buildMessageList(): ReactNode[] {
    let lastDateLabel: string | null = null;

    return messages.map((msg, index) => {
      const prevMsg = messages[index - 1];
      const dateLabel = formatDateLabel(msg.created_at);
      const showSeparator = dateLabel !== lastDateLabel;
      lastDateLabel = dateLabel;

      const isOwn = msg.sender.id === currentUserId;
      const isSameSenderAsPrev = prevMsg?.sender.id === msg.sender.id;
      const showAvatar = !isOwn && !isSameSenderAsPrev;
      const initials = (msg.sender.display_name?.[0] ?? "?").toUpperCase();

      return (
        <div key={msg.id}>
          {showSeparator && (
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-1">
                {dateLabel}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          <div
            className={clsx(
              "flex items-end gap-3 min-w-0 mb-1",
              isOwn ? "justify-end" : "justify-start",
            )}
          >
            {!isOwn &&
              (showAvatar ? (
                <Avatar className="size-8 shrink-0">
                  {msg.sender.avatar_url && (
                    <AvatarImage
                      src={msg.sender.avatar_url}
                      alt={msg.sender.display_name}
                    />
                  )}
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-8 shrink-0" />
              ))}
            <div className="max-w-[65%] min-w-0">
              {isGroup && !isOwn && showAvatar && (
                <p className="text-xs text-muted-foreground mb-1 px-1">
                  {msg.sender.display_name}
                </p>
              )}
              <Bubble
                message={msg}
                isOwn={isOwn}
                onDelete={() => handleDelete(msg.id)}
              />
            </div>
          </div>
        </div>
      );
    });
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Messages */}
      <div className="flex-1 relative min-h-0">
      <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto px-8 py-6">
        {isLoading && (
          <div className="flex flex-col gap-4 mt-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={clsx(
                  "h-10 rounded-2xl animate-pulse bg-muted",
                  i % 2 === 0 ? "w-56" : "w-44 ml-auto",
                )}
              />
            ))}
          </div>
        )}

        {loadingError && (
          <p className="text-sm text-destructive text-center mt-12">
            Failed to load messages: {loadingError.message}
          </p>
        )}

        {!isLoading && !loadingError && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-base text-muted-foreground">
              No messages yet. Say hi!
            </p>
          </div>
        )}

        {!isLoading && !loadingError && messages.length > 0 && (
          <div className="flex flex-col">
            {hasMore && (
              <div className="flex justify-center py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-8 px-4 rounded-full"
                  onClick={() => void handleLoadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Load earlier messages
                </Button>
              </div>
            )}
            {buildMessageList()}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {!atBottom && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center z-10 pointer-events-none">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full shadow-md gap-1.5 h-8 px-4 pointer-events-auto"
            onClick={scrollToBottom}
          >
            {unreadCount > 0 && <span className="text-xs">{unreadCount} new</span>}
            <ChevronDown size={14} />
          </Button>
        </div>
      )}
      </div>

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="px-6 pb-1 flex items-center gap-2 shrink-0">
          <div className="flex items-end gap-0.5 pb-px">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatTypingText(typingNames)}
          </p>
        </div>
      )}

      {/* Composer */}
      <div className="px-6 pb-6 pt-3 border-t border-border shrink-0">
        {isRecipientDeleted ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            This account no longer exists.
          </p>
        ) : (
          <>
            {sendError && (
              <p className="text-xs text-destructive mb-2 text-center">
                {sendError}
              </p>
            )}
            <div className="flex items-end gap-3 rounded-2xl px-4 py-3 bg-muted/60 border border-border/50">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message…"
                rows={1}
                className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed text-foreground placeholder:text-muted-foreground"
                style={{ minHeight: "24px", maxHeight: "160px" }}
              />
              <Button
                size="icon"
                className="size-8 rounded-xl shrink-0"
                onClick={() => void handleSend()}
                disabled={!input.trim() || sending}
                aria-label="Send message"
              >
                <Send size={14} />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
