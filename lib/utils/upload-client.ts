import { CHUNK_SIZE } from "@/lib/constants";
import {
  completeChunkedUpload,
  initChunkedUpload,
  uploadChunk,
} from "@/lib/actions/upload.actions";
import { uploadFile } from "@/lib/actions/file.actions";

const UPLOAD_RESUME_KEY = "zynkdrive:upload-resume";

export type UploadResumeState = {
  uploadId: string;
  fileName: string;
  totalChunks: number;
  uploadedChunks: number[];
  ownerId: string;
  accountId: string;
  path: string;
};

export const saveUploadResumeState = (state: UploadResumeState) => {
  if (typeof window === "undefined") return;
  const existing = loadUploadResumeStates();
  const next = existing.filter((item) => item.uploadId !== state.uploadId);
  next.push(state);
  window.localStorage.setItem(UPLOAD_RESUME_KEY, JSON.stringify(next));
};

export const loadUploadResumeStates = (): UploadResumeState[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(UPLOAD_RESUME_KEY);
    return raw ? (JSON.parse(raw) as UploadResumeState[]) : [];
  } catch {
    return [];
  }
};

export const clearUploadResumeState = (uploadId: string) => {
  if (typeof window === "undefined") return;
  const next = loadUploadResumeStates().filter((item) => item.uploadId !== uploadId);
  window.localStorage.setItem(UPLOAD_RESUME_KEY, JSON.stringify(next));
};

export const uploadWithProgress = async ({
  file,
  ownerId,
  accountId,
  path,
  onProgress,
  resumeState,
}: {
  file: File;
  ownerId: string;
  accountId: string;
  path: string;
  onProgress: (progress: number) => void;
  resumeState?: UploadResumeState;
}) => {
  if (file.size <= CHUNK_SIZE) {
    onProgress(15);
    const result = await uploadFile({ file, ownerId, accountId, path });
    onProgress(100);
    return result;
  }

  const init = resumeState
    ? { uploadId: resumeState.uploadId, totalChunks: resumeState.totalChunks, chunkSize: CHUNK_SIZE }
    : await initChunkedUpload({
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
      });

  const uploadId = resumeState?.uploadId || (init as { uploadId: string }).uploadId;
  const totalChunks = resumeState?.totalChunks || (init as { totalChunks: number }).totalChunks;
  const chunkSize = (init as { chunkSize?: number }).chunkSize || CHUNK_SIZE;
  const uploaded = new Set(resumeState?.uploadedChunks || []);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    if (uploaded.has(chunkIndex)) {
      onProgress(Math.round((uploaded.size / totalChunks) * 90));
      continue;
    }

    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);

    const formData = new FormData();
    formData.set("uploadId", uploadId);
    formData.set("chunkIndex", String(chunkIndex));
    formData.set("totalChunks", String(totalChunks));
    formData.set("chunk", blob, `${file.name}.part${chunkIndex}`);

    const status = await uploadChunk(formData);
    uploaded.add(chunkIndex);

    saveUploadResumeState({
      uploadId,
      fileName: file.name,
      totalChunks,
      uploadedChunks: Array.from(uploaded),
      ownerId,
      accountId,
      path,
    });

    onProgress(Math.min(90, Math.round((uploaded.size / totalChunks) * 90)));
    void status;
  }

  const completed = await completeChunkedUpload({ uploadId, path });
  clearUploadResumeState(uploadId);
  onProgress(100);
  return completed;
};

export const uploadFilesInParallel = async <T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = 3
) => {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
    }
  });

  await Promise.all(runners);
};
