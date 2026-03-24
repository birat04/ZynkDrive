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
import { deleteFile, renameFile, updateFileUsers } from "@/lib/actions/file.actions";
import { constructDownloadUrl } from "@/lib/utils";
import { FileDetails, ShareInput } from "@/components/ActionsModalContent";

type FileDoc = {
  $id: string;
  name: string;
  extension?: string;
  bucketFileId?: string;
  users?: string[];
  [key: string]: unknown;
};

const ActionDropdown = ({ file }: { file: FileDoc }) => {
  const path = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [action, setAction] = useState<ActionType | null>(null);
  const [name, setName] = useState(file.name.replace(/\.[^/.]+$/, "") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>(file.users ?? []);

  const extension = file.extension ?? file.name.split(".").pop() ?? "";
  const closeAll = () => {
    setDialogOpen(false);
    setDeleteAlertOpen(false);
    setDropdownOpen(false);
    setAction(null);
    setName(file.name.replace(/\.[^/.]+$/, "") || "");
    setEmails(file.users ?? []);
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
        const result = await updateFileUsers({
          fileId: file.$id,
          emails,
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
        if (success) toast.success("File deleted successfully");
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
    const updated = emails.filter((e) => e !== email);
    const result = await updateFileUsers({
      fileId: file.$id,
      emails: updated,
      path,
    });

    if (result) {
      setEmails(updated);
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
            file={{ ...file, users: emails }}
            onEmailsChange={setEmails}
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
          {actionsDropdownItems.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => {
                setAction(item);
                if (["rename", "share", "details"].includes(item.value)) {
                  setDialogOpen(true);
                } else if (item.value === "delete") {
                  setDeleteAlertOpen(true);
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
              Are you sure you want to delete {file.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ActionDropdown;
