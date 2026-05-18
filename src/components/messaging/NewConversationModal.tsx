import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { searchUsers, getOrCreateConversation } from "@/data/conversations";
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

export function NewConversationModal({
  open,
  onClose,
  onConversationReady,
}: NewConversationModalProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !user) return;

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

    return () => {
      clearTimeout(timer);
      setResults([]);
    };
  }, [query, user]);

  const handleSelect = async (recipient: UserResult) => {
    if (!user || starting) return;
    setStarting(recipient.id);
    setError(null);
    try {
      const conversationId = await getOrCreateConversation(
        user.id,
        recipient.id,
      );
      onConversationReady(conversationId);
      onClose();
    } catch {
      setError("Couldn't start conversation. Please try again.");
      setStarting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-card border-border overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="text-sm font-semibold">
            New message
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search by name or username…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 placeholder:text-muted-foreground"
            />
            {searching && (
              <Loader2
                size={14}
                className="text-muted-foreground animate-spin shrink-0"
              />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {error && (
            <p className="px-5 py-3 text-sm text-destructive">{error}</p>
          )}

          {!searching && query.trim() && results.length === 0 && !error && (
            <p className="px-5 py-6 text-sm text-center text-muted-foreground">
              No users found for "{query}"
            </p>
          )}

          {!query.trim() && (
            <p className="px-5 py-6 text-sm text-center text-muted-foreground">
              Search for someone to message
            </p>
          )}

          {results.map((result) => {
            const initials = result.display_name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelect(result)}
                disabled={!!starting}
                className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-accent disabled:opacity-50 text-left"
              >
                <Avatar className="size-9 shrink-0">
                  {result.avatar_url && (
                    <AvatarImage
                      src={result.avatar_url}
                      alt={result.display_name}
                    />
                  )}
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                    {initials}
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
                {starting === result.id && (
                  <Loader2
                    size={14}
                    className="animate-spin text-muted-foreground shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
