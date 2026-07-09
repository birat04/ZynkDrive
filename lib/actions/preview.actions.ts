"use server";

import { DEFAULT_FILE_PREVIEW_SIZE } from "@/lib/constants";
import { getAccessibleFile } from "@/lib/files/access";
import { createAdminClient } from "@/lib/appwrite";
import { isCodePreviewable } from "@/lib/utils/thumbnails";
import { parseStringify } from "@/lib/utils";

export const getFileTextContent = async (fileId: string) => {
  const { file } = await getAccessibleFile(fileId);

  if (!isCodePreviewable(file.extension)) {
    throw new Error("Text preview is not supported for this file type");
  }

  const size = Number(file.size || 0);
  if (size > DEFAULT_FILE_PREVIEW_SIZE) {
    throw new Error("File is too large to preview as text");
  }

  if (!file.bucketFileId) {
    throw new Error("File storage reference is missing");
  }

  const { storage } = await createAdminClient();
  const buffer = await storage.getFileDownload(
    process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
    file.bucketFileId
  );

  const content = Buffer.from(buffer).toString("utf-8");

  return parseStringify({
    content,
    extension: file.extension || "txt",
    name: file.name,
  });
};
