"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import Card from "@/components/Card";
import ActionDropdown from "@/components/ActionDropdown";
import FilePreviewModal from "@/components/FilePreviewModal";
import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Thumbnail } from "@/components/Thumbnail";
import {
  bulkMoveFilesToTrash,
  bulkPermanentlyDeleteFiles,
  bulkRenewPublicLinks,
  bulkRevokePublicLinks,
  bulkRestoreFilesFromTrash,
  bulkToggleFilesStarred,
} from "@/lib/actions/file.actions";
import { cn, constructFileUrl, convertFileSize } from "@/lib/utils";

type FileDoc = {
  $id: string;
  name: string;
  type?: string;
  extension?: string;
  url?: string;
  size?: number | string;
  $updatedAt?: string;
  bucketFileId?: string;
  shareToken?: string | null;
  users?: string[];
  owner?: { fullName?: string } | string;
  [key: string]: unknown;
};

type ViewMode = "grid" | "list";

const VIEW_KEY = "zynkdrive:file-view-mode";

const FileBrowser = ({ files }: { files: FileDoc[] }) => {
  const path = usePathname();
  const isTrashRoute = path === "/trash";
  const isSharedLinksRoute = path === "/shared-links";
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === "grid" || saved === "list") {
      setViewMode(saved);
    }
  }, []);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    window.localStorage.setItem(VIEW_KEY, mode);
    setSelectedIds([]);
  };

  const toggleSelection = (fileId: string) => {
    setSelectedIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === parsedFiles.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(parsedFiles.map((file) => file.$id));
  };

  const runBulkAction = async (
    action: "trash" | "star" | "unstar" | "restore" | "delete_permanently" | "revoke_links" | "renew_links"
  ) => {
    if (selectedIds.length === 0) return;

    setIsBulkProcessing(true);

    try {
      let success = false;

      if (action === "trash") {
        const result = await bulkMoveFilesToTrash({ fileIds: selectedIds, path });
        success = !!result;
      } else if (action === "restore") {
        const result = await bulkRestoreFilesFromTrash({ fileIds: selectedIds, path });
        success = !!result;
      } else if (action === "delete_permanently") {
        const result = await bulkPermanentlyDeleteFiles({ fileIds: selectedIds, path });
        success = !!result;
      } else if (action === "revoke_links") {
        const result = await bulkRevokePublicLinks({ fileIds: selectedIds, path });
        success = !!result;
      } else if (action === "renew_links") {
        const result = await bulkRenewPublicLinks({ fileIds: selectedIds, expiresInDays: 7, path });
        success = !!result;
      } else {
        const result = await bulkToggleFilesStarred({
          fileIds: selectedIds,
          isStarred: action === "star",
          path,
        });
        success = !!result;
      }

      if (!success) {
        toast.error("Bulk action failed. Please try again.");
        return;
      }

      setSelectedIds([]);
      if (action === "trash") toast.success("Selected files moved to trash");
      if (action === "star") toast.success("Selected files added to starred");
      if (action === "unstar") toast.success("Selected files removed from starred");
      if (action === "restore") toast.success("Selected files restored");
      if (action === "delete_permanently") toast.success("Selected files deleted permanently");
      if (action === "revoke_links") toast.success("Selected public links revoked");
      if (action === "renew_links") toast.success("Selected public links renewed (7d)");
    } catch {
      toast.error("Bulk action failed. Please try again.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const parsedFiles = useMemo(
    () =>
      files.map((file) => ({
        ...file,
        fileUrl: file.bucketFileId
          ? constructFileUrl(file.bucketFileId)
          : (file.url as string) || "#",
        fileSize:
          typeof file.size === "number" ? file.size : Number(file.size || 0),
        fileType: file.type || "other",
      })),
    [files]
  );

  const copySelectedLinks = async () => {
    const links = parsedFiles
      .filter((file) => selectedIds.includes(file.$id))
      .map((file) => file.shareToken)
      .filter((token): token is string => typeof token === "string" && token.length > 0)
      .map((token) => `${window.location.origin}/shared/${token}`);

    if (links.length === 0) {
      toast.error("No active public links found in selection");
      return;
    }

    await navigator.clipboard.writeText(links.join("\n"));
    toast.success(`Copied ${links.length} link${links.length === 1 ? "" : "s"}`);
  };

  const getShareExpiryLabel = (token: string | null | undefined) => {
    if (!token) return { label: "No expiry", isExpired: false };

    const parts = token.split(".");
    const maybeTimestamp = Number(parts.at(-1));

    if (!Number.isFinite(maybeTimestamp)) {
      return { label: "No expiry", isExpired: false };
    }

    const isExpired = Date.now() >= maybeTimestamp;
    return {
      label: `${isExpired ? "Expired" : "Expires"} ${new Date(maybeTimestamp).toLocaleString()}`,
      isExpired,
    };
  };

  return (
    <section className="mt-6">
      <div className="mb-4 flex items-center justify-end">
        <div className="inline-flex items-center gap-1 rounded-full border border-light-200 bg-white p-1 shadow-drop-1">
          <button
            type="button"
            onClick={() => handleViewChange("grid")}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition",
              viewMode === "grid"
                ? "bg-brand text-white"
                : "text-light-100 hover:bg-light-300"
            )}
            aria-label="Show files in grid view"
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("list")}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition",
              viewMode === "list"
                ? "bg-brand text-white"
                : "text-light-100 hover:bg-light-300"
            )}
            aria-label="Show files in list view"
            aria-pressed={viewMode === "list"}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
      </div>

      {viewMode === "list" && selectedIds.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-drop-1">
          <p className="body-2 mr-2 text-light-100">{selectedIds.length} selected</p>
          {isTrashRoute ? (
            <>
              <button
                type="button"
                onClick={() => runBulkAction("restore")}
                disabled={isBulkProcessing}
                className="rounded-full border border-light-200 px-3 py-1.5 text-sm text-light-100 transition hover:bg-light-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={() => runBulkAction("delete_permanently")}
                disabled={isBulkProcessing}
                className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete Permanently
              </button>
            </>
          ) : isSharedLinksRoute ? (
            <>
              <button
                type="button"
                onClick={() => void copySelectedLinks()}
                disabled={isBulkProcessing}
                className="rounded-full border border-light-200 px-3 py-1.5 text-sm text-light-100 transition hover:bg-light-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Copy Links
              </button>
              <button
                type="button"
                onClick={() => runBulkAction("renew_links")}
                disabled={isBulkProcessing}
                className="rounded-full border border-light-200 px-3 py-1.5 text-sm text-light-100 transition hover:bg-light-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Renew Links (7d)
              </button>
              <button
                type="button"
                onClick={() => runBulkAction("revoke_links")}
                disabled={isBulkProcessing}
                className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Revoke Links
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => runBulkAction("trash")}
                disabled={isBulkProcessing}
                className="rounded-full border border-light-200 px-3 py-1.5 text-sm text-light-100 transition hover:bg-light-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Move to Trash
              </button>
              <button
                type="button"
                onClick={() => runBulkAction("star")}
                disabled={isBulkProcessing}
                className="rounded-full border border-light-200 px-3 py-1.5 text-sm text-light-100 transition hover:bg-light-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Star
              </button>
              <button
                type="button"
                onClick={() => runBulkAction("unstar")}
                disabled={isBulkProcessing}
                className="rounded-full border border-light-200 px-3 py-1.5 text-sm text-light-100 transition hover:bg-light-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Unstar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="rounded-full px-3 py-1.5 text-sm text-light-200 transition hover:bg-light-300"
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="transition-all duration-300">
        {viewMode === "grid" ? (
          <div className="file-list animate-in fade-in-0 duration-300">
            {parsedFiles.map((file, index) => (
              <Card key={file.$id} file={file} onOpenPreview={() => setSelectedIndex(index)} />
            ))}
          </div>
        ) : (
          <div className="animate-in fade-in-0 overflow-hidden rounded-2xl bg-white shadow-drop-1 duration-300">
            <div className="grid grid-cols-[32px_1fr_120px_130px_70px] border-b border-light-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-light-200 sm:grid-cols-[40px_1fr_140px_160px_90px]">
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  aria-label="Select all files"
                  checked={selectedIds.length === parsedFiles.length && parsedFiles.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-light-200"
                />
              </div>
              <p>Name</p>
              <p>Size</p>
              <p>Modified</p>
              <p className="text-right">Action</p>
            </div>

            <div className="divide-y divide-light-200">
              {parsedFiles.map((file, index) => (
                (() => {
                  const shareExpiry = getShareExpiryLabel(file.shareToken);
                  return (
                    <div
                      key={file.$id}
                      className="grid grid-cols-[32px_1fr_120px_130px_70px] items-center px-4 py-3 transition hover:bg-light-300 sm:grid-cols-[40px_1fr_140px_160px_90px]"
                    >
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${file.name}`}
                      checked={selectedIds.includes(file.$id)}
                      onChange={() => toggleSelection(file.$id)}
                      className="h-4 w-4 rounded border-light-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className="mr-4 flex min-w-0 items-center gap-3"
                  >
                    <Thumbnail
                      type={file.fileType}
                      extension={file.extension ?? ""}
                      url={file.url ?? ""}
                      className="h-10 w-10 rounded-lg"
                      imageClassName="h-10 w-10 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-light-100">{file.name}</p>
                      {isSharedLinksRoute ? (
                        <p className={`caption mt-0.5 ${shareExpiry.isExpired ? "text-red-500" : "text-light-200"}`}>
                          {shareExpiry.label}
                        </p>
                      ) : null}
                    </div>
                  </button>

                  <p className="pr-2 text-sm text-light-200">{convertFileSize(file.fileSize)}</p>

                  <FormattedDateTime
                    isoString={file.$updatedAt}
                    className="text-sm text-light-200"
                  />

                  <div className="relative ml-auto flex w-fit items-center justify-end" onClick={(e) => e.preventDefault()}>
                    <ActionDropdown file={file} />
                  </div>
                    </div>
                  );
                })()
              ))}
            </div>
          </div>
        )}
      </div>

      <FilePreviewModal
        files={parsedFiles}
        selectedIndex={selectedIndex}
        onSelectedIndexChange={setSelectedIndex}
      />
    </section>
  );
};

export default FileBrowser;
