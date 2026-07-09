import { NextRequest } from "next/server";
import { Query } from "node-appwrite";
import crypto from "crypto";

import { createAdminClient } from "@/lib/appwrite";
import { DEFAULT_FILE_PREVIEW_SIZE } from "@/lib/constants";
import { isCodePreviewable } from "@/lib/utils/thumbnails";

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
      return new Response("Share unavailable", { status: 403 });
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
    )) as { name?: string; extension?: string; size?: number | string; bucketFileId?: string };

    if (!isCodePreviewable(file.extension)) {
      return new Response("Preview not supported", { status: 400 });
    }

    const size = Number(file.size || 0);
    if (size > DEFAULT_FILE_PREVIEW_SIZE) {
      return new Response("File too large to preview", { status: 413 });
    }

    if (!file.bucketFileId) {
      return new Response("File not found", { status: 404 });
    }

    const buffer = await storage.getFileDownload(
      process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
      file.bucketFileId
    );

    return Response.json({
      content: Buffer.from(buffer).toString("utf-8"),
      extension: file.extension || "txt",
      name: file.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    return new Response(message, { status: 500 });
  }
}
