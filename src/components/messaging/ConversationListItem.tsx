import clsx from "clsx";
import type { ConversationSummary } from "@/data/conversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ConversationListItemProps {
  conversation: ConversationSummary;
  isSelected: boolean;
  onClick: () => void;
}

function formatTimeAgo(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (isNaN(seconds)) return "";

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ] as const;

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        -count,
        interval.label,
      );
    }
  }
  return "just now";
}

export function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: ConversationListItemProps) {
  const { title, lastMessage, lastMessageAt, avatarUrl, unreadCount } =
    conversation;

  const initials = title
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full text-left rounded-xl px-3 py-3 flex items-center gap-3 transition-colors duration-150",
        isSelected ? "bg-primary/8" : "hover:bg-muted/70",
      )}
    >
      <Avatar className="size-11 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={title} />}
        <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={clsx(
              "text-sm truncate text-foreground",
              isSelected || unreadCount > 0 ? "font-semibold" : "font-medium",
            )}
          >
            {title}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(lastMessageAt)}
            </span>
          </div>
        </div>
        <p
          className={clsx(
            "text-sm truncate",
            unreadCount > 0
              ? "text-foreground/70 font-medium"
              : "text-muted-foreground",
          )}
        >
          {lastMessage ?? "No messages yet"}
        </p>
      </div>
    </button>
  );
}
