import { NextRequest } from "next/server";

import { recordFileDownload } from "@/lib/actions/file-extended.actions";
import { getAccessibleFile } from "@/lib/files/access";
import { createAdminClient } from "@/lib/appwrite";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params;
    const { file } = await getAccessibleFile(fileId);

    if (!file.bucketFileId) {
      return new Response("File not found", { status: 404 });
    }

    const { storage } = await createAdminClient();
    const buffer = await storage.getFileDownload(
      process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
      file.bucketFileId
    );

    void recordFileDownload(fileId);

    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name || "download")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed";
    const status = message === "Forbidden" ? 403 : message === "Unauthenticated" ? 401 : 500;
    return new Response(message, { status });
  }
}
