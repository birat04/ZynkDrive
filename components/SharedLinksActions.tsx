"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { renewAllPublicLinks, revokeAllPublicLinks } from "@/lib/actions/file.actions";
import { Button } from "@/components/ui/button";

type SharedLinksActionsProps = {
  tokens: string[];
  totalCount: number;
  expiredCount: number;
};

const SharedLinksActions = ({ tokens, totalCount, expiredCount }: SharedLinksActionsProps) => {
  const [isPending, startTransition] = useTransition();
  const path = usePathname();
  const router = useRouter();

  const handleCopyAll = async () => {
    if (tokens.length === 0) {
      toast.error("No share links available to copy");
      return;
    }

    const urls = tokens.map((token) => `${window.location.origin}/shared/${token}`);
    await navigator.clipboard.writeText(urls.join("\n"));
    toast.success(`Copied ${urls.length} public link${urls.length === 1 ? "" : "s"}`);
  };

  const handleRenewAll = () => {
    startTransition(async () => {
      const result = await renewAllPublicLinks({ expiresInDays: 7, path });

      if (!result) {
        toast.error("Failed to renew public links");
        return;
      }

      toast.success(`Renewed ${result.count ?? 0} public link${(result.count ?? 0) === 1 ? "" : "s"}`);
      router.refresh();
    });
  };

  const handleRevokeAll = () => {
    startTransition(async () => {
      const result = await revokeAllPublicLinks({ path });

      if (!result) {
        toast.error("Failed to revoke public links");
        return;
      }

      toast.success(`Revoked ${result.count ?? 0} public link${(result.count ?? 0) === 1 ? "" : "s"}`);
      router.refresh();
    });
  };

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-drop-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-light-100">Shared links overview</p>
          <p className="caption mt-1 text-light-200">
            {totalCount} total links, {expiredCount} expired.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleCopyAll} disabled={isPending || tokens.length === 0}>
            Copy All
          </Button>
          <Button type="button" variant="outline" onClick={handleRenewAll} disabled={isPending || totalCount === 0}>
            Renew All (7d)
          </Button>
          <Button type="button" variant="destructive" onClick={handleRevokeAll} disabled={isPending || totalCount === 0}>
            Revoke All
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedLinksActions;
