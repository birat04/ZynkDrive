"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

import { Thumbnail } from "@/components/Thumbnail";
import { uploadFile } from "@/lib/actions/file.actions";
import { convertFileSize, getFileType } from "@/lib/utils";
import { MAX_FILE_SIZE } from "@/constants";
import { cn } from "@/lib/utils";

const FileUploader = ({ ownerId, accountId, className }: FileUploaderProps) => {
  const path = usePathname();
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setFiles((prev) => [...prev, ...acceptedFiles]);

      for (const file of acceptedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          setFiles((prev) => prev.filter((f) => f.name !== file.name));
          toast.error(`${file.name} is too large. Max file size is 50MB.`);
          continue;
        }

        try {
          await uploadFile({ file, ownerId, accountId, path });
          setFiles((prev) => prev.filter((f) => f.name !== file.name));
          toast.success(`${file.name} uploaded successfully`);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    },
    [ownerId, accountId, path]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    noClick: false,
    noKeyboard: false,
    maxSize: MAX_FILE_SIZE,
  });

  const handleRemoveFile = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  return (
    <>
      <div
        {...getRootProps()}
        className={cn("uploader-dropzone", className)}
      >
        <input {...getInputProps()} />
        <Image src="/assets/icons/upload.svg" alt="" width={20} height={20} />
        <span>Upload</span>
      </div>

      {files.length > 0 && (
        <div className="uploader-preview-list">
          <p className="caption font-medium text-light-100">Uploading</p>
          {files.map((file) => {
            const { type, extension } = getFileType(file.name);
            return (
              <div key={file.name} className="uploader-preview-item">
                <Thumbnail
                  type={type}
                  extension={extension}
                  url={URL.createObjectURL(file)}
                />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="truncate text-[14px] font-medium text-light-100">
                    {file.name}
                  </span>
                  <span className="caption text-light-200">
                    {convertFileSize(file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleRemoveFile(e, file.name)}
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
