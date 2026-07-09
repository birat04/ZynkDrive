"use server";

import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { readFile } from "fs/promises";
import { join } from "path";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/appwrite";
import { requireEmailVerified } from "@/lib/actions/auth.actions";
import { generateFileThumbnails } from "@/lib/actions/thumbnail.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { CHUNK_SIZE } from "@/lib/constants";
import {
  createUploadSession,
  deleteUploadSession,
  getUploadSession,
  saveUploadChunk,
} from "@/lib/upload/session-store";
import { getFileType, parseStringify, constructFileUrl } from "@/lib/utils";
import { UploadChunkSchema, UploadInitSchema } from "@/lib/validators";

export const initChunkedUpload = async (params: {
  name: string;
  size: number;
  mimeType: string;
}) => {
  const currentUser = await requireEmailVerified();
  const validated = UploadInitSchema.parse(params);

  const totalChunks = Math.max(1, Math.ceil(validated.size / CHUNK_SIZE));
  const session = await createUploadSession({
    userId: currentUser.$id,
    fileName: validated.name,
    mimeType: validated.mimeType,
    totalSize: validated.size,
    totalChunks,
  });

  return parseStringify({
    uploadId: session.uploadId,
    chunkSize: CHUNK_SIZE,
    totalChunks,
  });
};

export const uploadChunk = async (formData: FormData) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const uploadId = String(formData.get("uploadId") || "");
  const chunkIndex = Number(formData.get("chunkIndex"));
  const totalChunks = Number(formData.get("totalChunks"));
  const chunk = formData.get("chunk");

  const validated = UploadChunkSchema.parse({
    uploadId,
    chunkIndex,
    totalChunks,
  });

  if (!(chunk instanceof Blob)) {
    throw new Error("Invalid chunk payload");
  }

  const session = getUploadSession(validated.uploadId, currentUser.$id);
  if (!session) throw new Error("Upload session not found or expired");

  if (validated.totalChunks !== session.totalChunks) {
    throw new Error("Chunk count mismatch");
  }

  const buffer = Buffer.from(await chunk.arrayBuffer());
  await saveUploadChunk(session, validated.chunkIndex, buffer);

  return parseStringify({
    received: session.receivedChunks.size,
    totalChunks: session.totalChunks,
    progress: Math.round((session.receivedChunks.size / session.totalChunks) * 100),
  });
};

const mergeChunks = async (sessionDir: string, totalChunks: number) => {
  const chunks: Buffer[] = [];

  for (let index = 0; index < totalChunks; index += 1) {
    const chunkPath = join(sessionDir, `chunk-${index}`);
    chunks.push(await readFile(chunkPath));
  }

  return Buffer.concat(chunks);
};

export const completeChunkedUpload = async (params: {
  uploadId: string;
  path: string;
}) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const session = getUploadSession(params.uploadId, currentUser.$id);
  if (!session) throw new Error("Upload session not found or expired");

  if (session.receivedChunks.size !== session.totalChunks) {
    throw new Error("Upload is incomplete");
  }

  const { storage, databases } = await createAdminClient();

  try {
    const merged = await mergeChunks(session.tempDir, session.totalChunks);
    const inputFile = InputFile.fromBuffer(merged, session.fileName);

    const uploaded = await storage.createFile(
      process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
      ID.unique(),
      inputFile
    );

    const { type, extension } = getFileType(session.fileName);
    const thumbnails = await generateFileThumbnails(uploaded.$id, type, extension);

    const fileDocument = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      ID.unique(),
      {
        name: session.fileName,
        url: constructFileUrl(uploaded.$id),
        type,
        bucketFileId: uploaded.$id,
        extension,
        size: session.totalSize,
        isDeleted: false,
        deletedAt: null,
        isStarred: false,
        isPublic: false,
        shareToken: null,
        thumbnailId: thumbnails.thumbnailId,
        thumbnailIdLg: thumbnails.thumbnailIdLg,
      }
    );

    revalidatePath(params.path);
    return parseStringify(fileDocument);
  } finally {
    await deleteUploadSession(params.uploadId);
  }
};

export const cancelChunkedUpload = async (uploadId: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const session = getUploadSession(uploadId, currentUser.$id);
  if (!session) return parseStringify({ cancelled: true });

  await deleteUploadSession(uploadId);
  return parseStringify({ cancelled: true });
};

export const getChunkedUploadStatus = async (uploadId: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const session = getUploadSession(uploadId, currentUser.$id);
  if (!session) return null;

  return parseStringify({
    uploadId: session.uploadId,
    fileName: session.fileName,
    receivedChunks: Array.from(session.receivedChunks).sort((a, b) => a - b),
    totalChunks: session.totalChunks,
    progress: Math.round((session.receivedChunks.size / session.totalChunks) * 100),
  });
};
