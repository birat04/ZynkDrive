"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { emptyTrash, restoreAllFromTrash } from "@/lib/actions/file.actions";
import { Button } from "@/components/ui/button";

type TrashActionsProps = {
  fileCount: number;
  expiredCount: number;
};

const TrashActions = ({ fileCount, expiredCount }: TrashActionsProps) => {
  const path = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirmingEmpty, setIsConfirmingEmpty] = useState(false);

  const handleRestoreAll = () => {
    startTransition(async () => {
      const result = await restoreAllFromTrash({ path });

      if (!result) {
        toast.error("Failed to restore trash items");
        return;
      }

      toast.success("All trash items restored");
      router.refresh();
    });
  };

  const handleEmptyTrash = () => {
    if (!isConfirmingEmpty) {
      setIsConfirmingEmpty(true);
      return;
    }

    startTransition(async () => {
      const result = await emptyTrash({ path });

      if (!result) {
        toast.error("Failed to empty trash");
        setIsConfirmingEmpty(false);
        return;
      }

      toast.success("Trash emptied permanently");
      setIsConfirmingEmpty(false);
      router.refresh();
    });
  };

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-drop-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-light-100">Trash retention</p>
          <p className="caption mt-1 text-light-200">
            Items in trash are auto-removed after 30 days. {expiredCount} file
            {expiredCount === 1 ? "" : "s"} currently overdue.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleRestoreAll}
            disabled={isPending || fileCount === 0}
          >
            Restore All
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleEmptyTrash}
            disabled={isPending || fileCount === 0}
          >
            {isConfirmingEmpty ? "Confirm Empty Trash" : "Empty Trash"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrashActions;
