"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, QrCode } from "lucide-react";

import { ShareQRCode } from "@/components/ShareQRCode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createShare } from "@/lib/actions/share.actions";

type ShareDialogProps = {
  fileId: string;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CreatedShare = {
  shareId: string;
  token: string;
  url: string;
  absoluteUrl: string;
};

const ShareDialog = ({ fileId, fileName, open, onOpenChange }: ShareDialogProps) => {
  const [shareType, setShareType] = useState<"public" | "private" | "password">("public");
  const [permission, setPermission] = useState<"view" | "comment" | "edit">("view");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [downloadLimit, setDownloadLimit] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [createdShare, setCreatedShare] = useState<CreatedShare | null>(null);
  const [showQr, setShowQr] = useState(false);

  const resetForm = () => {
    setShareType("public");
    setPermission("view");
    setPassword("");
    setExpiresAt("");
    setDownloadLimit("");
    setCreatedShare(null);
    setShowQr(false);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleCreate = async () => {
    if (shareType === "password" && password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createShare({
        fileId,
        type: shareType,
        permission,
        password: shareType === "password" ? password : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        downloadLimit: downloadLimit ? Number(downloadLimit) : undefined,
      });

      if (!result?.success || !result.share) {
        throw new Error("Failed to create share link");
      }

      const absoluteUrl = `${window.location.origin}${result.share.url}`;
      setCreatedShare({
        shareId: result.share.shareId,
        token: result.share.token,
        url: result.share.url,
        absoluteUrl,
      });
      toast.success("Share link created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create share");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdShare) return;
    await navigator.clipboard.writeText(createdShare.absoluteUrl);
    toast.success("Link copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{fileName}&rdquo;</DialogTitle>
        </DialogHeader>

        {createdShare ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-light-200 bg-light-400 p-3">
              <p className="caption text-light-200">Share link</p>
              <p className="mt-1 break-all text-sm text-light-100">{createdShare.absoluteUrl}</p>
            </div>

            {showQr ? <ShareQRCode url={createdShare.absoluteUrl} /> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowQr((current) => !current)}>
                <QrCode className="mr-2 h-4 w-4" />
                {showQr ? "Hide QR" : "Show QR"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Link type</Label>
              <Select value={shareType} onValueChange={(value) => setShareType(value as typeof shareType)}>
                <SelectTrigger className="shad-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — anyone with the link</SelectItem>
                  <SelectItem value="private">Private — link only</SelectItem>
                  <SelectItem value="password">Password protected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Permission</Label>
              <Select value={permission} onValueChange={(value) => setPermission(value as typeof permission)}>
                <SelectTrigger className="shad-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View only</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shareType === "password" ? (
              <div className="space-y-2">
                <Label htmlFor="share-password">Password</Label>
                <Input
                  id="share-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  className="shad-input"
                />
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="share-expires">Expires (optional)</Label>
                <Input
                  id="share-expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="shad-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-limit">Download limit (optional)</Label>
                <Input
                  id="share-limit"
                  type="number"
                  min={1}
                  value={downloadLimit}
                  onChange={(event) => setDownloadLimit(event.target.value)}
                  placeholder="Unlimited"
                  className="shad-input"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {createdShare ? (
            <Button type="button" onClick={() => handleClose(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate} disabled={isLoading}>
                {isLoading ? "Creating..." : "Create link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
