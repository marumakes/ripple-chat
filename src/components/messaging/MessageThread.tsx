import { useRef, useEffect, useState, type ReactNode } from "react";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Message } from "@/data/messages";
import clsx from "clsx";

interface MessageThreadProps {
  messages: Message[];
  isLoading: boolean;
  loadingError: Error | null;
  sendError: string | null;
  send: (content: string) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  currentUserId: string | null;
  isRecipientDeleted: boolean;
  isGroup: boolean;
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
  messages,
  isLoading,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [currentUserId]);

  useEffect(() => {
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

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
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
      <div className="flex-1 overflow-y-auto px-8 py-6">
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
            {buildMessageList()}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

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
                onChange={(e) => setInput(e.target.value)}
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
