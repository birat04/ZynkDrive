import Link from "next/link";
import type { Metadata } from "next";

import { getPublicFileByToken } from "@/lib/actions/file.actions";
import { constructDownloadUrl } from "@/lib/utils";

type PageProps = {
  params: Promise<{ token: string }>;
};

const getShareTokenExpiryInfo = (token: string) => {
  const parts = token.split(".");
  const maybeTimestamp = Number(parts.at(-1));

  if (!Number.isFinite(maybeTimestamp)) {
    return { expiresAt: null, isExpired: false };
  }

  return {
    expiresAt: maybeTimestamp,
    isExpired: Date.now() >= maybeTimestamp,
  };
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Shared File | ZynkDrive",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function SharedFilePage({ params }: PageProps) {
  const { token } = await params;
  const tokenInfo = getShareTokenExpiryInfo(token);

  if (tokenInfo.isExpired) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
        <section className="rounded-2xl bg-white p-6 text-center shadow-drop-1">
          <p className="caption text-light-200">Shared Link</p>
          <h1 className="mt-2 text-2xl font-semibold text-light-100">This link has expired</h1>
          <p className="body-2 mt-3 text-light-200">
            Ask the file owner to generate a new share link.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/sign-in" className="primary-btn">
              Go to Sign In
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const file = await getPublicFileByToken(token);

  if (!file) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
        <section className="rounded-2xl bg-white p-6 text-center shadow-drop-1">
          <p className="caption text-light-200">Shared Link</p>
          <h1 className="mt-2 text-2xl font-semibold text-light-100">Link is invalid or revoked</h1>
          <p className="body-2 mt-3 text-light-200">
            This shared link is no longer available.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/sign-in" className="primary-btn">
              Go to Sign In
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const fileType = (file.type as string) || "other";
  const fileUrl = (file.url as string) || "";
  const bucketFileId = file.bucketFileId as string | undefined;
  const expiresAtLabel = tokenInfo.expiresAt
    ? new Date(tokenInfo.expiresAt).toLocaleString()
    : "No expiry";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
      <header className="rounded-2xl bg-white p-5 shadow-drop-1">
        <p className="caption text-light-200">Shared File</p>
        <h1 className="mt-1 text-xl font-semibold text-light-100">{file.name as string}</h1>
        <p className="caption mt-2 text-light-200">Link expires: {expiresAtLabel}</p>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-drop-1 sm:p-6">
        {fileType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={file.name as string} className="max-h-[70vh] w-full rounded-xl object-contain" />
        ) : fileType === "video" ? (
          <video src={fileUrl} controls className="max-h-[70vh] w-full rounded-xl bg-black" />
        ) : fileType === "audio" ? (
          <div className="flex h-40 items-center justify-center rounded-xl bg-light-300 px-4">
            <audio src={fileUrl} controls className="w-full" />
          </div>
        ) : fileType === "document" ? (
          <iframe
            src={fileUrl}
            title={file.name as string}
            className="h-[70vh] w-full rounded-xl border border-light-200"
          />
        ) : (
          <div className="flex h-56 items-center justify-center rounded-xl bg-light-300 text-light-200">
            Preview unavailable for this file type.
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <Link
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="primary-btn"
        >
          Open in new tab
        </Link>
        {bucketFileId ? (
          <Link
            href={constructDownloadUrl(bucketFileId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full border border-light-200 px-5 text-sm font-medium text-light-100 transition hover:bg-light-300"
          >
            Download
          </Link>
        ) : null}
      </div>
    </main>
  );
}
