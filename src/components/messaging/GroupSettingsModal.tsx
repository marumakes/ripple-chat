import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Search, Shield, UserMinus, ChevronUp, UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ConversationSummary, ConversationMember } from "@/data/conversations";
import {
  getConversationMembers,
  renameGroup,
  kickMember,
  addGroupMembers,
  promoteToAdmin,
  leaveGroup,
  deleteGroup,
  searchUsers,
} from "@/data/conversations";

interface GroupSettingsModalProps {
  open: boolean;
  onClose: () => void;
  conversation: ConversationSummary;
  currentUserId: string;
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

export function GroupSettingsModal({
  open,
  onClose,
  conversation,
  currentUserId,
}: GroupSettingsModalProps) {
  const isAdmin = conversation.currentUserRole === "admin";

  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [nameValue, setNameValue] = useState(conversation.title);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<UserResult[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addSelected, setAddSelected] = useState<UserResult[]>([]);
  const [addSaving, setAddSaving] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      setMembers(await getConversationMembers(conversation.id));
    } catch {
      setMembersError("Couldn't load members.");
    } finally {
      setMembersLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    if (!open) return;
    setNameValue(conversation.title);
    setNameError(null);
    setActionError(null);
    setShowAddPanel(false);
    setAddQuery("");
    setAddSelected([]);
    void fetchMembers();
  }, [open, conversation.id, conversation.title, fetchMembers]);

  useEffect(() => {
    if (!showAddPanel) return;
    const id = setTimeout(() => addInputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [showAddPanel]);

  // Debounced search for add-members panel.
  useEffect(() => {
    if (!addQuery.trim()) {
      setAddResults([]);
      return;
    }
    const existingIds = new Set(members.map((m) => m.userId));
    const timer = setTimeout(async () => {
      setAddSearching(true);
      try {
        const results = await searchUsers(addQuery.trim(), currentUserId);
        setAddResults(results.filter((r) => !existingIds.has(r.id)));
      } catch {
        setAddResults([]);
      } finally {
        setAddSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [addQuery, currentUserId, members]);

  const handleSaveName = async () => {
    if (nameSaving || !nameValue.trim()) return;
    setNameSaving(true);
    setNameError(null);
    try {
      await renameGroup(conversation.id, nameValue.trim());
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to rename group.");
    } finally {
      setNameSaving(false);
    }
  };

  const handleKick = async (memberId: string) => {
    setBusyMemberId(memberId);
    setActionError(null);
    try {
      await kickMember(conversation.id, memberId);
      setMembers((prev) => prev.filter((m) => m.userId !== memberId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setBusyMemberId(null);
    }
  };

  const handlePromote = async (memberId: string) => {
    setBusyMemberId(memberId);
    setActionError(null);
    try {
      await promoteToAdmin(conversation.id, memberId);
      setMembers((prev) =>
        prev.map((m) => (m.userId === memberId ? { ...m, role: "admin" } : m)),
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to promote member.");
    } finally {
      setBusyMemberId(null);
    }
  };

  const toggleAddSelected = (u: UserResult) => {
    setAddSelected((prev) =>
      prev.some((s) => s.id === u.id)
        ? prev.filter((s) => s.id !== u.id)
        : [...prev, u],
    );
  };

  const handleAddMembers = async () => {
    if (addSaving || addSelected.length === 0) return;
    setAddSaving(true);
    setActionError(null);
    try {
      await addGroupMembers(
        conversation.id,
        addSelected.map((u) => u.id),
      );
      await fetchMembers();
      setShowAddPanel(false);
      setAddQuery("");
      setAddSelected([]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to add members.");
    } finally {
      setAddSaving(false);
    }
  };

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    setActionError(null);
    try {
      await leaveGroup(conversation.id);
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to leave group.");
      setLeaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteGroup(conversation.id);
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete group.");
      setDeleting(false);
    }
  };

  const nameChanged = nameValue.trim() !== conversation.title;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-card border-border overflow-hidden flex flex-col max-h-[620px]">
        <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">Group settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Group name */}
          {isAdmin && (
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Group name
              </p>
              <div className="flex gap-2">
                <Input
                  value={nameValue}
                  onChange={(e) => {
                    setNameValue(e.target.value);
                    setNameError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  className="h-9 text-sm flex-1"
                  placeholder="Group name…"
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={!nameChanged || nameSaving || !nameValue.trim()}
                  className="shrink-0"
                >
                  {nameSaving ? <Loader2 size={13} className="animate-spin" /> : "Save"}
                </Button>
              </div>
              {nameError && (
                <p className="text-xs text-destructive mt-1.5">{nameError}</p>
              )}
            </div>
          )}

          {/* Members list */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Members {members.length > 0 && `(${members.length})`}
              </p>
              {isAdmin && (
                <button
                  onClick={() => setShowAddPanel((v) => !v)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <UserPlus size={12} />
                  Add members
                </button>
              )}
            </div>

            {membersLoading && (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              </div>
            )}

            {membersError && (
              <p className="text-sm text-destructive py-2">{membersError}</p>
            )}

            {!membersLoading && !membersError && (
              <div className="flex flex-col gap-0.5">
                {members.map((member) => {
                  const isSelf = member.userId === currentUserId;
                  const isBusy = busyMemberId === member.userId;
                  const canAct = isAdmin && !isSelf && member.role !== "admin";

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 py-2 rounded-md"
                    >
                      <Avatar className="size-8 shrink-0">
                        {member.avatarUrl && (
                          <AvatarImage src={member.avatarUrl} alt={member.displayName} />
                        )}
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                          {getInitials(member.displayName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.displayName}
                          {isSelf && (
                            <span className="text-muted-foreground font-normal"> (you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{member.username}
                        </p>
                      </div>

                      {member.role === "admin" && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0">
                          <Shield size={11} />
                          Admin
                        </span>
                      )}

                      {canAct && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => void handlePromote(member.userId)}
                            disabled={isBusy}
                            title="Make admin"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <ChevronUp size={13} />
                            )}
                          </button>
                          <button
                            onClick={() => void handleKick(member.userId)}
                            disabled={isBusy}
                            title="Remove from group"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          >
                            <UserMinus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add members panel */}
          {isAdmin && showAddPanel && (
            <div className="border-t border-border px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Add members
              </p>

              <div className="flex items-center gap-2 mb-2">
                <Search size={13} className="text-muted-foreground shrink-0" />
                <input
                  ref={addInputRef}
                  type="text"
                  placeholder="Search people…"
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                />
                {addSearching && (
                  <Loader2 size={13} className="text-muted-foreground animate-spin shrink-0" />
                )}
              </div>

              {addSelected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {addSelected.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium rounded-full pl-2.5 pr-1.5 py-1"
                    >
                      {u.display_name}
                      <button
                        onClick={() => toggleAddSelected(u)}
                        className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {addQuery.trim() && !addSearching && addResults.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  No users found for "{addQuery}"
                </p>
              )}

              <div className="max-h-40 overflow-y-auto -mx-1">
                {addResults.map((result) => {
                  const isSelected = addSelected.some((s) => s.id === result.id);
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => toggleAddSelected(result)}
                      className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <Avatar className="size-7 shrink-0">
                        {result.avatar_url && (
                          <AvatarImage src={result.avatar_url} alt={result.display_name} />
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
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <X size={9} className="text-primary-foreground rotate-45" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {addSelected.length > 0 && (
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={handleAddMembers}
                  disabled={addSaving}
                >
                  {addSaving && <Loader2 size={13} className="animate-spin" />}
                  Add {addSelected.length} {addSelected.length === 1 ? "member" : "members"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 space-y-2">
          {actionError && (
            <p className="text-xs text-destructive">{actionError}</p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleLeave}
              disabled={leaving}
            >
              {leaving ? <Loader2 size={14} className="animate-spin" /> : "Leave group"}
            </Button>
            {isAdmin && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : "Delete group"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
