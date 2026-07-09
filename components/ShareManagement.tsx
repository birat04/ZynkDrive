"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, QrCode, Trash2 } from "lucide-react";

import { ShareQRCode } from "@/components/ShareQRCode";
import { Button } from "@/components/ui/button";
import { revokeShare } from "@/lib/actions/share.actions";

export type ShareListItem = {
  $id: string;
  token?: string;
  type: "public" | "private" | "password";
  permission: "view" | "comment" | "edit";
  downloadCount: number;
  downloadLimit?: number | null;
  expiresAt?: string | null;
  createdAt?: string;
  resourceName: string;
  resourceType: "file" | "folder";
  shareUrl?: string | null;
  absoluteUrl?: string | null;
};

type ShareManagementProps = {
  shares: ShareListItem[];
};

const ShareManagement = ({ shares }: ShareManagementProps) => {
  const router = useRouter();
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const handleRevoke = async (shareId: string) => {
    setRevokingId(shareId);

    try {
      const result = await revokeShare(shareId);
      if (!result?.success) throw new Error("Failed to revoke share");
      toast.success("Share revoked");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke share");
    } finally {
      setRevokingId(null);
    }
  };

  if (shares.length === 0) {
    return (
      <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-drop-1">
        <p className="text-sm text-light-200">No advanced share links yet. Create one from a file&apos;s actions menu.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl bg-white p-4 shadow-drop-1">
        <p className="text-sm font-medium text-light-100">Advanced shares</p>
        <p className="caption mt-1 text-light-200">
          {shares.length} link{shares.length === 1 ? "" : "s"} with permissions, passwords, and limits.
        </p>
      </div>

      {shares.map((share) => {
        const absoluteUrl =
          share.absoluteUrl ||
          (share.shareUrl ? `${window.location.origin}${share.shareUrl}` : "");
        const isExpired = share.expiresAt ? new Date(share.expiresAt) < new Date() : false;
        const limitReached =
          typeof share.downloadLimit === "number" && share.downloadCount >= share.downloadLimit;

        return (
          <div key={share.$id} className="rounded-2xl bg-white p-4 shadow-drop-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-light-100">{share.resourceName}</p>
                <p className="caption mt-1 text-light-200">
                  {share.resourceType} • {share.type} • {share.permission}
                </p>
                <p className="caption mt-1 text-light-200">
                  {share.downloadCount}
                  {share.downloadLimit ? ` / ${share.downloadLimit}` : ""} downloads
                  {share.expiresAt ? ` • Expires ${new Date(share.expiresAt).toLocaleString()}` : " • No expiry"}
                </p>
                {(isExpired || limitReached) && (
                  <p className="caption mt-1 text-red">
                    {isExpired ? "Expired" : "Download limit reached"}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {absoluteUrl ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => handleCopy(absoluteUrl)}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy
                  </Button>
                ) : null}
                {share.token ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setQrToken(qrToken === share.token ? null : share.token || null)}
                  >
                    <QrCode className="mr-1 h-3.5 w-3.5" />
                    QR
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={revokingId === share.$id}
                  onClick={() => handleRevoke(share.$id)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  {revokingId === share.$id ? "Revoking..." : "Revoke"}
                </Button>
              </div>
            </div>

            {qrToken === share.token && absoluteUrl ? (
              <div className="mt-4 flex justify-center border-t border-light-200 pt-4">
                <ShareQRCode url={absoluteUrl} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default ShareManagement;
