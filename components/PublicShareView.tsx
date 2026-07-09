"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ShareCodePreview } from "@/components/ShareCodePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifySharePassword } from "@/lib/actions/share.actions";
import { constructFileUrl, convertFileSize, getFileIcon } from "@/lib/utils";
import { isCodePreviewable } from "@/lib/utils/thumbnails";

type ShareResource = {
  $id?: string;
  name?: string;
  type?: string;
  extension?: string;
  size?: number | string;
  bucketFileId?: string;
  url?: string;
  $createdAt?: string;
  $updatedAt?: string;
};

type PublicShareViewProps = {
  token: string;
  type: "public" | "private" | "password";
  permission: "view" | "comment" | "edit";
  requiresPassword?: boolean;
  resource?: ShareResource | null;
  expiresAt?: string | null;
  downloadCount?: number;
  downloadLimit?: number | null;
};

const PublicShareView = ({
  token,
  type,
  permission,
  requiresPassword = false,
  resource: initialResource,
  expiresAt,
  downloadCount = 0,
  downloadLimit,
}: PublicShareViewProps) => {
  const [password, setPassword] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState("");
  const [resource, setResource] = useState<ShareResource | null>(initialResource ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyPassword = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifySharePassword(token, password);
      if (!result.success || !result.resource) {
        throw new Error(result.error || "Invalid password");
      }

      setResource(result.resource as ShareResource);
      setVerifiedPassword(password);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  if (requiresPassword && !resource) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <section className="rounded-2xl bg-white p-6 shadow-drop-1">
          <p className="caption text-light-200">Password protected</p>
          <h1 className="mt-2 text-xl font-semibold text-light-100">Enter password to view</h1>
          <div className="mt-6 space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Share password"
              className="shad-input"
            />
            {error ? <p className="caption text-red">{error}</p> : null}
            <Button type="button" className="w-full" onClick={handleVerifyPassword} disabled={isVerifying}>
              {isVerifying ? "Verifying..." : "Continue"}
            </Button>
          </div>
        </section>
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10">
        <section className="rounded-2xl bg-white p-6 text-center shadow-drop-1">
          <h1 className="text-xl font-semibold text-light-100">Share unavailable</h1>
          <p className="body-2 mt-2 text-light-200">This shared resource could not be loaded.</p>
        </section>
      </main>
    );
  }

  const fileType = resource.type || "other";
  const fileUrl = resource.bucketFileId
    ? constructFileUrl(resource.bucketFileId)
    : resource.url || "";
  const fileSize = typeof resource.size === "number" ? resource.size : Number(resource.size || 0);
  const downloadHref =
    type === "password" && verifiedPassword
      ? `/api/shares/${token}/download?password=${encodeURIComponent(verifiedPassword)}`
      : `/api/shares/${token}/download`;

  const renderPreview = () => {
    if (fileType === "image") {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl} alt={resource.name || "Shared file"} className="max-h-[70vh] w-full rounded-xl object-contain" />
      );
    }

    if (fileType === "video") {
      return <video src={fileUrl} controls className="max-h-[70vh] w-full rounded-xl bg-black" />;
    }

    if (fileType === "audio") {
      return (
        <div className="flex h-40 items-center justify-center rounded-xl bg-light-300 px-4">
          <audio src={fileUrl} controls className="w-full" />
        </div>
      );
    }

    if (isCodePreviewable(resource.extension)) {
      return (
        <ShareCodePreview
          token={token}
          password={verifiedPassword || undefined}
          extension={resource.extension}
        />
      );
    }

    if (fileType === "document") {
      return (
        <iframe
          src={fileUrl}
          title={resource.name || "Shared file"}
          className="h-[70vh] w-full rounded-xl border border-light-200"
        />
      );
    }

    return (
      <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl bg-light-300 text-center">
        <Image src={getFileIcon(resource.extension, fileType)} alt="" width={48} height={48} />
        <p className="text-sm text-light-200">Preview unavailable for this file type.</p>
      </div>
    );
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
      <header className="rounded-2xl bg-white p-5 shadow-drop-1">
        <p className="caption text-light-200">Shared {fileType === "other" ? "file" : fileType}</p>
        <h1 className="mt-1 text-xl font-semibold text-light-100">{resource.name}</h1>
        <div className="caption mt-3 flex flex-wrap gap-x-4 gap-y-1 text-light-200">
          <span>{convertFileSize(fileSize)}</span>
          <span>{permission} access</span>
          <span>{type} link</span>
          {expiresAt ? <span>Expires {new Date(expiresAt).toLocaleString()}</span> : <span>No expiry</span>}
          {downloadLimit ? (
            <span>
              {downloadCount} / {downloadLimit} downloads
            </span>
          ) : (
            <span>{downloadCount} downloads</span>
          )}
        </div>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-drop-1 sm:p-6">{renderPreview()}</section>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={fileUrl} target="_blank" rel="noopener noreferrer" className="primary-btn">
          Open in new tab
        </Link>
        <a
          href={downloadHref}
          className="inline-flex h-11 items-center justify-center rounded-full border border-light-200 px-5 text-sm font-medium text-light-100 transition hover:bg-light-300"
        >
          Download
        </a>
      </div>
    </main>
  );
};

export default PublicShareView;
