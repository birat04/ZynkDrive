import { NextRequest } from "next/server";
import { Query } from "node-appwrite";
import crypto from "crypto";

import { createAdminClient } from "@/lib/appwrite";
import { incrementShareDownloadCount } from "@/lib/actions/share.actions";

const verifyPasswordHash = (password: string, hash: string): boolean => {
  const computed = crypto
    .pbkdf2Sync(password, process.env.NEXT_PUBLIC_APPWRITE_PROJECT!, 100000, 64, "sha512")
    .toString("hex");
  return computed === hash;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const password = request.nextUrl.searchParams.get("password") || "";
    const { databases, storage } = await createAdminClient();

    const shares = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      [Query.equal("token", [token]), Query.limit(1)]
    );

    const share = shares.documents[0] as {
      $id: string;
      fileId?: string;
      type: string;
      passwordHash?: string;
      expiresAt?: string;
      downloadLimit?: number;
      downloadCount: number;
    } | undefined;

    if (!share?.fileId) {
      return new Response("Share not found", { status: 404 });
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return new Response("Share expired", { status: 410 });
    }

    if (share.downloadLimit && share.downloadCount >= share.downloadLimit) {
      return new Response("Download limit exceeded", { status: 403 });
    }

    if (share.type === "password") {
      if (!password || !share.passwordHash || !verifyPasswordHash(password, share.passwordHash)) {
        return new Response("Password required", { status: 401 });
      }
    }

    const file = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      share.fileId
    )) as { name?: string; bucketFileId?: string };

    if (!file.bucketFileId) {
      return new Response("File not found", { status: 404 });
    }

    const buffer = await storage.getFileDownload(
      process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
      file.bucketFileId
    );

    await incrementShareDownloadCount(share.$id);

    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name || "download")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed";
    return new Response(message, { status: 500 });
  }
}
