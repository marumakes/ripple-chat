import { useState, useEffect, useRef } from "react";
import { Loader2, X, Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  searchUsers,
  getOrCreateConversation,
  createGroupConversation,
} from "@/data/conversations";
import { useAuth } from "@/hooks/useAuth";

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
  onConversationReady: (conversationId: string) => void;
}

type UserResult = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  username: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function NewConversationModal({
  open,
  onClose,
  onConversationReady,
}: NewConversationModalProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserResult[]>([]);
  const [groupName, setGroupName] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isGroup = selected.length >= 2;

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected([]);
      setGroupName("");
      setError(null);
      setStarting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const data = await searchUsers(query.trim(), user.id);
        setResults(data);
      } catch {
        setError("Search failed. Please try again.");
      } finally {
        setSearching(false);
      }
    }, 300);

    // Only cancel the timer on cleanup — don't clear stale results so they
    // stay visible between keystrokes instead of flashing to empty.
    return () => clearTimeout(timer);
  }, [query, user]);

  const toggleUser = (u: UserResult) => {
    setSelected((prev) =>
      prev.some((s) => s.id === u.id)
        ? prev.filter((s) => s.id !== u.id)
        : [...prev, u],
    );
  };

  const handleStart = async () => {
    if (!user || selected.length === 0 || starting) return;
    setStarting(true);
    setError(null);
    try {
      let conversationId: string;
      if (selected.length === 1) {
        conversationId = await getOrCreateConversation(user.id, selected[0].id);
      } else {
        conversationId = await createGroupConversation(
          user.id,
          selected.map((u) => u.id),
          groupName.trim() || undefined,
        );
      }
      onConversationReady(conversationId);
      onClose();
    } catch {
      setError("Couldn't start conversation. Please try again.");
      setStarting(false);
    }
  };

  const buttonLabel = () => {
    if (starting) return null;
    if (selected.length === 0) return "Select someone to message";
    if (isGroup) return "Create group";
    return `Message ${selected[0].display_name}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-card border-border overflow-hidden flex flex-col max-h-[560px]">
        <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">
            New message
          </DialogTitle>
        </DialogHeader>

        {/* Search — always in the same place, never moves */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2.5 shrink-0">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
          {searching && (
            <Loader2 size={14} className="text-muted-foreground animate-spin shrink-0" />
          )}
        </div>

        {/* Selected chips — only shown when at least one person is picked */}
        {selected.length > 0 && (
          <div className="px-4 py-2.5 border-b border-border flex flex-wrap gap-1.5 shrink-0">
            {selected.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium rounded-full pl-2.5 pr-1.5 py-1"
              >
                {u.display_name}
                <button
                  onClick={() => toggleUser(u)}
                  className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                  aria-label={`Remove ${u.display_name}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Results — scrollable, with a stable min-height so the modal doesn't collapse */}
        <div className="flex-1 overflow-y-auto min-h-[160px]">
          {error && (
            <p className="px-5 py-3 text-sm text-destructive">{error}</p>
          )}

          {!searching && query.trim() && results.length === 0 && !error && (
            <p className="px-5 py-8 text-sm text-center text-muted-foreground">
              No users found for "{query}"
            </p>
          )}

          {!query.trim() && (
            <p className="px-5 py-8 text-sm text-center text-muted-foreground">
              {selected.length === 0
                ? "Search for someone to message"
                : "Add more people or continue below"}
            </p>
          )}

          {results.map((result) => {
            const isSelected = selected.some((s) => s.id === result.id);
            return (
              <button
                key={result.id}
                type="button"
                onClick={() => toggleUser(result)}
                className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted text-left"
              >
                <Avatar className="size-9 shrink-0">
                  {result.avatar_url && (
                    <AvatarImage
                      src={result.avatar_url}
                      alt={result.display_name}
                    />
                  )}
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {getInitials(result.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {result.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{result.username}
                  </p>
                </div>
                {isSelected && (
                  <Check size={15} className="text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer — always visible so selecting someone doesn't shift the layout.
            The button is just disabled until a selection is made. */}
        <div className="px-4 pt-3 pb-4 border-t border-border space-y-2.5 shrink-0">
          {isGroup && (
            <Input
              placeholder="Group name (optional)…"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              className="h-9 text-sm"
            />
          )}
          <Button
            className="w-full"
            onClick={handleStart}
            disabled={selected.length === 0 || starting}
          >
            {starting && <Loader2 size={14} className="animate-spin" />}
            {buttonLabel()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
