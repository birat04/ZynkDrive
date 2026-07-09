"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

import { Thumbnail } from "@/components/Thumbnail";
import { convertFileSize, getFileType } from "@/lib/utils";
import { CHUNK_SIZE, MAX_FILE_SIZE } from "@/lib/constants";
import {
  clearUploadResumeState,
  loadUploadResumeStates,
  uploadFilesInParallel,
  uploadWithProgress,
  type UploadResumeState,
} from "@/lib/utils/upload-client";
import { cn } from "@/lib/utils";

type UploadStatus = "queued" | "uploading" | "success" | "error";

type UploadQueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  progress: number;
  resumeState?: UploadResumeState;
};

const FileUploader = ({ ownerId, accountId, className }: FileUploaderProps) => {
  const path = usePathname();
  const [files, setFiles] = useState<UploadQueueItem[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const filesRef = useRef<UploadQueueItem[]>([]);

  const uploadOne = useCallback(
    async (item: UploadQueueItem) => {
      setFiles((prev) =>
        prev.map((fileItem) =>
          fileItem.id === item.id
            ? { ...fileItem, status: "uploading", progress: Math.max(fileItem.progress, 5) }
            : fileItem
        )
      );

      try {
        await uploadWithProgress({
          file: item.file,
          ownerId,
          accountId,
          path,
          resumeState: item.resumeState,
          onProgress: (progress) => {
            setFiles((prev) =>
              prev.map((fileItem) =>
                fileItem.id === item.id ? { ...fileItem, progress } : fileItem
              )
            );
          },
        });

        if (item.resumeState?.uploadId) {
          clearUploadResumeState(item.resumeState.uploadId);
        }

        setFiles((prev) =>
          prev.map((fileItem) =>
            fileItem.id === item.id
              ? { ...fileItem, status: "success", progress: 100 }
              : fileItem
          )
        );
        toast.success(`${item.file.name} uploaded successfully`);
      } catch (error) {
        setFiles((prev) =>
          prev.map((fileItem) =>
            fileItem.id === item.id
              ? { ...fileItem, status: "error", progress: fileItem.progress }
              : fileItem
          )
        );
        const message = error instanceof Error ? error.message : "Upload failed";
        toast.error(`Failed to upload ${item.file.name}: ${message}`);
      }
    },
    [ownerId, accountId, path]
  );

  const queueFiles = useCallback(
    async (acceptedFiles: File[]) => {
      const queuedFiles: UploadQueueItem[] = [];

      for (const file of acceptedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is too large. Max file size is ${convertFileSize(MAX_FILE_SIZE)}.`);
          continue;
        }

        queuedFiles.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "queued",
          progress: 0,
        });
      }

      if (!queuedFiles.length) return;

      setFiles((prev) => [...prev, ...queuedFiles]);

      await uploadFilesInParallel(queuedFiles, async (item) => {
        await uploadOne(item);
      });
    },
    [uploadOne]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      await queueFiles(acceptedFiles);
    },
    [queueFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
    noKeyboard: false,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const handleRemoveFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();

    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove) URL.revokeObjectURL(fileToRemove.previewUrl);
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const handleRetry = async (e: React.MouseEvent, item: UploadQueueItem) => {
    e.stopPropagation();
    await uploadOne(item);
  };

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const item of files) {
      if (item.status !== "success") continue;
      if (processedIdsRef.current.has(item.id)) continue;

      processedIdsRef.current.add(item.id);

      const timeout = setTimeout(() => {
        setFiles((prev) => {
          const matched = prev.find((f) => f.id === item.id);
          if (matched) URL.revokeObjectURL(matched.previewUrl);
          return prev.filter((f) => f.id !== item.id);
        });
      }, 1200);

      timers.push(timeout);
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((file) => URL.revokeObjectURL(file.previewUrl));
    };
  }, []);

  useEffect(() => {
    const pending = loadUploadResumeStates();
    if (!pending.length) return;

    toast.message("Incomplete uploads detected", {
      description: `${pending.length} upload(s) can be resumed by selecting the same file again.`,
    });
  }, []);

  return (
    <>
      <div
        {...getRootProps()}
        className={cn(
          "uploader-dropzone",
          isDragActive && "border-brand bg-brand/5",
          className
        )}
      >
        <input {...getInputProps()} />
        <Image src="/assets/icons/upload.svg" alt="" width={20} height={20} />
        <span>{isDragActive ? "Drop files here" : "Upload"}</span>
      </div>

      {files.length > 0 && (
        <div className="uploader-preview-list">
          <p className="caption font-medium text-light-100">
            Uploading {files.filter((item) => item.status === "uploading").length > 1 ? `${files.length} files` : ""}
          </p>
          {files.map((item) => {
            const { type, extension } = getFileType(item.file.name);

            const statusLabel =
              item.status === "uploading"
                ? item.file.size > CHUNK_SIZE
                  ? "Uploading (chunked)"
                  : "Uploading"
                : item.status === "queued"
                ? "Queued"
                : item.status === "error"
                ? "Failed"
                : "Uploaded";

            const statusClassName =
              item.status === "error"
                ? "text-red"
                : item.status === "success"
                ? "text-green"
                : "text-light-200";

            return (
              <div key={item.id} className="uploader-preview-item">
                <Thumbnail
                  type={type}
                  extension={extension}
                  url={item.previewUrl}
                />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="truncate text-[14px] font-medium text-light-100">
                    {item.file.name}
                  </span>
                  <span className={cn("caption", statusClassName)}>
                    {convertFileSize(item.file.size)} • {statusLabel} • {item.progress}%
                  </span>

                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-light-400">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.status === "error" ? "bg-red" : "bg-brand"
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
                {item.status === "error" && (
                  <button
                    type="button"
                    onClick={(e) => handleRetry(e, item)}
                    className="caption rounded-md border border-light-400/30 px-2 py-1 text-light-100 transition hover:bg-dark-300"
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemoveFile(e, item.id)}
                  className="shrink-0 p-1 transition hover:opacity-70"
                  aria-label="Remove"
                >
                  <Image
                    src="/assets/icons/close.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default FileUploader;
