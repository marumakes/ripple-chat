import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProfile, updateProfile } from "@/data/profile";
import { useAuth } from "@/hooks/useAuth";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (updated: { display_name: string; username: string }) => void;
}

function sanitizeUsername(val: string) {
  return val.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileModal({ open, onClose, onSaved }: ProfileModalProps) {
  const { user } = useAuth();
  const [fetched, setFetched] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive loading from whether data has arrived yet — avoids a synchronous
  // setState in the effect body which the linter flags as a cascading-render risk.
  const loading = open && !fetched;

  useEffect(() => {
    if (!open || !user) return;

    getProfile(user.id)
      .then((p) => {
        if (p) {
          setDisplayName(p.display_name);
          setUsername(p.username);
        }
        setFetched(true);
      })
      .catch(() => {
        setError("Failed to load profile.");
        setFetched(true);
      });

    // Reset everything when the modal closes so it starts fresh next time.
    return () => {
      setFetched(false);
      setDisplayName("");
      setUsername("");
      setError(null);
    };
  }, [open, user]);

  const isValid =
    displayName.trim().length > 0 &&
    username.length >= 3 &&
    username.length <= 20;

  const handleSave = async () => {
    if (!user || !isValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, {
        display_name: displayName.trim(),
        username,
      });
      onSaved({ display_name: displayName.trim(), username });
      onClose();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      setError(
        code === "23505"
          ? "That username is already taken."
          : "Couldn't save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const initials = displayName ? getInitials(displayName) : "?";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xs p-0 gap-0 bg-card border-border overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="text-sm font-semibold">
            Edit profile
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="px-5 pt-6 pb-5 space-y-5">
              {/* Avatar preview */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="text-xl font-semibold text-primary">
                    {initials}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Display name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    placeholder="Your name"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      @
                    </span>
                    <Input
                      value={username}
                      onChange={(e) =>
                        setUsername(sanitizeUsername(e.target.value))
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      placeholder="username"
                      className="h-10 text-sm pl-7"
                      maxLength={20}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Letters, numbers, and underscores · 3–20 chars
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            <div className="px-5 pb-5">
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saving || !isValid}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save changes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
