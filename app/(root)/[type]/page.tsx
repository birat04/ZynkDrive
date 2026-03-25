import { Suspense } from "react";
import { getFiles, purgeExpiredTrash } from "@/lib/actions/file.actions";
import { convertFileSize, getFileTypesParams } from "@/lib/utils";
import FileBrowser from "@/components/FileBrowser";
import Sort from "@/components/Sort";
import TrashActions from "@/components/TrashActions";
import SharedLinksActions from "@/components/SharedLinksActions";

type PageProps = {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ searchText?: string; sort?: string }>;
};

export default async function TypePage({ params, searchParams }: PageProps) {
  const { type } = await params;
  const { searchText, sort = "$createdAt-desc" } = await searchParams;
  const isTrashPage = type === "trash";
  const isStarredPage = type === "starred";
  const isRecentPage = type === "recent";
  const isSharedWithMePage = type === "shared-with-me";
  const isSharedLinksPage = type === "shared-links";

  if (isTrashPage) {
    await purgeExpiredTrash();
  }

  const types = isTrashPage || isStarredPage || isSharedLinksPage || isRecentPage || isSharedWithMePage
    ? (["document", "image", "video", "audio", "other"] as FileType[])
    : getFileTypesParams(type);

  const files = await getFiles({
    types: types as FileType[],
    searchText: searchText ?? undefined,
    sort,
    includeDeletedOnly: isTrashPage,
    includeStarredOnly: isStarredPage,
    includePublicOnly: isSharedLinksPage,
    includeSharedWithMeOnly: isSharedWithMePage,
    includeRecentOnly: isRecentPage,
    recentDays: 30,
  });

  const fileList = Array.isArray(files) ? files : [];
  const title = type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const emptyMessage = isTrashPage
    ? "Trash is empty"
    : isStarredPage
      ? "No starred files yet"
      : isRecentPage
        ? "No recent files in the last 30 days"
        : isSharedWithMePage
          ? "No files have been shared with you yet"
      : isSharedLinksPage
        ? "No active public links yet"
        : "No files uploaded";
  const totalSize = fileList.reduce((acc, file) => {
    const value = typeof file.size === "number" ? file.size : Number(file.size || 0);
    return acc + value;
  }, 0);
  const now = Date.now();
  const retentionMs = 30 * 24 * 60 * 60 * 1000;
  const parseTokenExpiry = (token: string) => {
    const parts = token.split(".");
    const maybeTimestamp = Number(parts.at(-1));
    return Number.isFinite(maybeTimestamp) ? maybeTimestamp : null;
  };
  const expiredCount = isTrashPage
    ? fileList.filter((file) => {
        const deletedAt = typeof file.deletedAt === "string" ? file.deletedAt : "";
        if (!deletedAt) return false;
        const deletedTime = new Date(deletedAt).getTime();
        if (Number.isNaN(deletedTime)) return false;
        return now - deletedTime >= retentionMs;
      }).length
    : 0;
  const sharedTokens = isSharedLinksPage
    ? fileList
        .map((file) => (typeof file.shareToken === "string" ? file.shareToken : ""))
        .filter(Boolean)
    : [];
  const expiredSharedLinksCount = isSharedLinksPage
    ? sharedTokens.filter((token) => {
        const expiresAt = parseTokenExpiry(token);
        return typeof expiresAt === "number" && now >= expiresAt;
      }).length
    : 0;

  return (
    <div className="page-container">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h4 text-light-100">{title}</h1>
          <p className="body-2 mt-1 text-light-200">
            {fileList.length} file{fileList.length === 1 ? "" : "s"} • {convertFileSize(totalSize)}
          </p>
        </div>

        <Suspense fallback={null}>
          <Sort />
        </Suspense>
      </div>

      {isTrashPage ? (
        <TrashActions fileCount={fileList.length} expiredCount={expiredCount} />
      ) : null}

      {isSharedLinksPage ? (
        <SharedLinksActions
          tokens={sharedTokens}
          totalCount={fileList.length}
          expiredCount={expiredSharedLinksCount}
        />
      ) : null}

      {fileList.length === 0 ? (
        <p className="body-2 mt-8 text-center text-light-200">
          {emptyMessage}
        </p>
      ) : (
        <FileBrowser files={fileList} />
      )}
    </div>
  );
}
