import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

export interface UploadSession {
  uploadId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  tempDir: string;
  createdAt: number;
}

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const sessions = new Map<string, UploadSession>();

const cleanupExpiredSessions = () => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      void rm(session.tempDir, { recursive: true, force: true });
      sessions.delete(id);
    }
  }
};

export const createUploadSession = async (params: {
  userId: string;
  fileName: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
}): Promise<UploadSession> => {
  cleanupExpiredSessions();

  const uploadId = randomUUID();
  const tempDir = join(tmpdir(), `zynk-upload-${uploadId}`);
  await mkdir(tempDir, { recursive: true });

  const session: UploadSession = {
    uploadId,
    userId: params.userId,
    fileName: params.fileName,
    mimeType: params.mimeType,
    totalSize: params.totalSize,
    totalChunks: params.totalChunks,
    receivedChunks: new Set(),
    tempDir,
    createdAt: Date.now(),
  };

  sessions.set(uploadId, session);
  return session;
};

export const getUploadSession = (uploadId: string, userId: string) => {
  cleanupExpiredSessions();
  const session = sessions.get(uploadId);
  if (!session || session.userId !== userId) return null;
  return session;
};

export const saveUploadChunk = async (
  session: UploadSession,
  chunkIndex: number,
  data: Buffer
) => {
  const chunkPath = join(session.tempDir, `chunk-${chunkIndex}`);
  await writeFile(chunkPath, data);
  session.receivedChunks.add(chunkIndex);
};

export const deleteUploadSession = async (uploadId: string) => {
  const session = sessions.get(uploadId);
  if (!session) return;
  await rm(session.tempDir, { recursive: true, force: true });
  sessions.delete(uploadId);
};
