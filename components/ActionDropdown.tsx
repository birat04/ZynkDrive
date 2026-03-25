"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { actionsDropdownItems } from "@/constants";
import {
  createPublicShareLink,
  deleteFile,
  permanentlyDeleteFile,
  renameFile,
  revokePublicShareLink,
  restoreFile,
  toggleFileStarred,
  updateFileUsers,
} from "@/lib/actions/file.actions";
import { constructDownloadUrl } from "@/lib/utils";
import { FileDetails, ShareInput } from "@/components/ActionsModalContent";

type FileDoc = {
  $id: string;
  name: string;
  extension?: string;
  bucketFileId?: string;
  users?: string[];
  isStarred?: boolean;
  isPublic?: boolean;
  shareToken?: string | null;
  [key: string]: unknown;
};

type SharedUser = { email: string; role: "viewer" | "editor" };

const parseSharedUsers = (users: string[]) => {
  const roles = new Map<string, "viewer" | "editor">();

  for (const value of users) {
    const editorMatch = value.match(/^role:(.+):editor$/);
    if (editorMatch?.[1]) {
      roles.set(editorMatch[1].toLowerCase(), "editor");
      continue;
    }

    if (!value.includes("@")) continue;

    const email = value.toLowerCase();
    if (!roles.has(email)) {
      roles.set(email, "viewer");
    }
  }

  return Array.from(roles.entries()).map(([email, role]) => ({ email, role }));
};

const toUsersStorage = (entries: SharedUser[]) => {
  const users: string[] = [];
  for (const entry of entries) {
    users.push(entry.email);
    if (entry.role === "editor") {
      users.push(`role:${entry.email}:editor`);
    }
  }
  return users;
};

const ActionDropdown = ({ file }: { file: FileDoc }) => {
  const path = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [action, setAction] = useState<ActionType | null>(null);
  const [name, setName] = useState(file.name.replace(/\.[^/.]+$/, "") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>(
    parseSharedUsers(file.users ?? [])
  );
  const isTrashPage = path === "/trash";

  const dropdownItems = isTrashPage
    ? [
        { label: "Restore", icon: "/assets/icons/edit.svg", value: "restore" },
        { label: "Delete Permanently", icon: "/assets/icons/delete.svg", value: "delete_permanently" },
      ]
    : [
        {
          label: file.isStarred ? "Remove from Starred" : "Add to Starred",
          icon: "/assets/icons/info.svg",
          value: "toggle_star",
        },
        {
          label: "Copy Link (24h)",
          icon: "/assets/icons/share.svg",
          value: "copy_public_link_1d",
        },
        {
          label: "Copy Link (7d)",
          icon: "/assets/icons/share.svg",
          value: "copy_public_link_7d",
        },
        {
          label: "Copy Link (30d)",
          icon: "/assets/icons/share.svg",
          value: "copy_public_link_30d",
        },
        ...(file.isPublic
          ? [
              {
                label: "Renew Link (7d)",
                icon: "/assets/icons/share.svg",
                value: "renew_public_link_7d",
              },
              {
                label: "Revoke Public Link",
                icon: "/assets/icons/close.svg",
                value: "revoke_public_link",
              },
            ]
          : []),
        ...actionsDropdownItems,
      ];

  const extension = file.extension ?? file.name.split(".").pop() ?? "";
  const closeAll = () => {
    setDialogOpen(false);
    setDeleteAlertOpen(false);
    setDropdownOpen(false);
    setAction(null);
    setName(file.name.replace(/\.[^/.]+$/, "") || "");
    setSharedUsers(parseSharedUsers(file.users ?? []));
  };

  const handleAction = async () => {
    if (!action) return;
    setIsLoading(true);
    let success = false;

    try {
      if (action.value === "rename") {
        const result = await renameFile({
          fileId: file.$id,
          name,
          extension,
          path,
        });
        success = !!result;
        if (success) toast.success("File renamed successfully");
      } else if (action.value === "share") {
        const emails = sharedUsers.map((entry) => entry.email);
        const result = await updateFileUsers({
          fileId: file.$id,
          emails,
          sharedUsers,
          path,
        });
        success = !!result;
        if (success) toast.success("Sharing updated successfully");
      } else if (action.value === "delete") {
        const result = await deleteFile({
          fileId: file.$id,
          bucketFileId: file.bucketFileId ?? "",
          path,
        });
        success = !!result;
        if (success) toast.success("File moved to trash");
      } else if (action.value === "restore") {
        const result = await restoreFile({
          fileId: file.$id,
          path,
        });
        success = !!result;
        if (success) toast.success("File restored successfully");
      } else if (action.value === "delete_permanently") {
        const result = await permanentlyDeleteFile({
          fileId: file.$id,
          bucketFileId: file.bucketFileId ?? "",
          path,
        });
        success = !!result;
        if (success) toast.success("File deleted permanently");
      } else if (action.value === "toggle_star") {
        const result = await toggleFileStarred({
          fileId: file.$id,
          isStarred: !file.isStarred,
          path,
        });
        success = !!result;
        if (success) {
          toast.success(file.isStarred ? "Removed from starred" : "Added to starred");
        }
      }

      if (success) closeAll();
      if (!success) toast.error("Action failed. Please try again.");
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async (email: string) => {
    const updated = sharedUsers.filter((entry) => entry.email !== email);
    const emails = updated.map((entry) => entry.email);
    const result = await updateFileUsers({
      fileId: file.$id,
      emails,
      sharedUsers: updated,
      path,
    });

    if (result) {
      setSharedUsers(updated);
      toast.success("User removed from shared access");
    } else {
      toast.error("Failed to update shared users");
    }
  };

  const content = action && (
    <>
      <DialogHeader>
        <DialogTitle>{action.label}</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        {action.value === "rename" && (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="File name"
            className="shad-input"
          />
        )}
        {action.value === "details" && <FileDetails file={file} />}
        {action.value === "share" && (
          <ShareInput
            file={{ ...file, users: toUsersStorage(sharedUsers) }}
            onSharedUsersChange={setSharedUsers}
            onRemove={handleRemoveUser}
          />
        )}
      </div>
      <DialogFooter>
        {action.value === "details" ? (
          <Button onClick={closeAll}>Close</Button>
        ) : ["rename", "share"].includes(action.value) ? (
          <>
            <Button variant="outline" onClick={closeAll}>
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={isLoading}>
              {isLoading ? "Saving..." : action.label}
            </Button>
          </>
        ) : null}
      </DialogFooter>
    </>
  );

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="absolute right-2 top-2 rounded p-1.5 transition hover:bg-light-300"
            aria-label="Actions"
          >
            <Image src="/assets/icons/dots.svg" alt="" width={20} height={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {dropdownItems.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => {
                setAction(item);
                if (["rename", "share", "details"].includes(item.value)) {
                  setDialogOpen(true);
                } else if (["delete", "delete_permanently"].includes(item.value)) {
                  setDeleteAlertOpen(true);
                } else if (item.value === "restore") {
                  void (async () => {
                    const result = await restoreFile({ fileId: file.$id, path });
                    if (result) {
                      toast.success("File restored successfully");
                      closeAll();
                    } else {
                      toast.error("Action failed. Please try again.");
                    }
                  })();
                } else if (item.value === "toggle_star") {
                  void (async () => {
                    const result = await toggleFileStarred({
                      fileId: file.$id,
                      isStarred: !Boolean(file.isStarred),
                      path,
                    });

                    if (result) {
                      toast.success(file.isStarred ? "Removed from starred" : "Added to starred");
                      closeAll();
                    } else {
                      toast.error("Action failed. Please try again.");
                    }
                  })();
                } else if (["copy_public_link_1d", "copy_public_link_7d", "copy_public_link_30d", "renew_public_link_7d"].includes(item.value)) {
                  void (async () => {
                    const expiresInDays =
                      item.value === "copy_public_link_1d"
                        ? 1
                        : item.value === "copy_public_link_30d"
                          ? 30
                          : 7;
                    const forceNewToken = item.value === "renew_public_link_7d";

                    const result = await createPublicShareLink({
                      fileId: file.$id,
                      expiresInDays,
                      forceNewToken,
                      path,
                    });

                    if (!result?.shareUrl) {
                      toast.error("Failed to generate link");
                      return;
                    }

                    const link = `${window.location.origin}${result.shareUrl}`;
                    await navigator.clipboard.writeText(link);
                    const expiresAt =
                      typeof result.expiresAt === "number"
                        ? new Date(result.expiresAt).toLocaleString()
                        : null;
                    toast.success(
                      expiresAt
                        ? `${forceNewToken ? "Public link renewed" : "Public link copied"} (expires ${expiresAt})`
                        : forceNewToken
                          ? "Public link renewed"
                          : "Public link copied"
                    );
                    closeAll();
                  })();
                } else if (item.value === "revoke_public_link") {
                  void (async () => {
                    const result = await revokePublicShareLink({
                      fileId: file.$id,
                      path,
                    });

                    if (!result) {
                      toast.error("Failed to revoke link");
                      return;
                    }

                    toast.success("Public link revoked");
                    closeAll();
                  })();
                } else if (item.value === "download" && file.bucketFileId) {
                  window.open(constructDownloadUrl(file.bucketFileId), "_blank");
                  setDropdownOpen(false);
                }
              }}
            >
              <Image src={item.icon} alt="" width={18} height={18} />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>{content}</DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteAlertOpen}
        onOpenChange={(open) => !open && closeAll()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file</AlertDialogTitle>
            <AlertDialogDescription>
              {action?.value === "delete_permanently"
                ? `Delete ${file.name} permanently? This cannot be undone.`
                : `Move ${file.name} to trash?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading
                ? "Processing..."
                : action?.value === "delete_permanently"
                  ? "Delete Permanently"
                  : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ActionDropdown;
