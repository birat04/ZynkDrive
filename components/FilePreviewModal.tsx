"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { CodePreview } from "@/components/CodePreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getFileIcon } from "@/lib/utils";
import { isCodePreviewable } from "@/lib/utils/thumbnails";

type PreviewFile = {
  $id: string;
  name: string;
  fileType: string;
  extension?: string;
  fileUrl: string;
  bucketFileId?: string;
};

type FilePreviewModalProps = {
  files: PreviewFile[];
  selectedIndex: number | null;
  onSelectedIndexChange: (index: number | null) => void;
};

const imageFiles = (files: PreviewFile[]) =>
  files.filter((file) => file.fileType === "image");

const FilePreviewModal = ({
  files,
  selectedIndex,
  onSelectedIndexChange,
}: FilePreviewModalProps) => {
  const isOpen = selectedIndex !== null;
  const currentIndex = selectedIndex ?? 0;
  const currentFile = files[currentIndex];

  if (!currentFile) return null;

  const gallery = imageFiles(files);
  const galleryIndex = gallery.findIndex((file) => file.$id === currentFile.$id);

  const showPrevious = () => {
    const prev = (currentIndex - 1 + files.length) % files.length;
    onSelectedIndexChange(prev);
  };

  const showNext = () => {
    const next = (currentIndex + 1) % files.length;
    onSelectedIndexChange(next);
  };

  const renderPreview = () => {
    if (currentFile.fileType === "image") {
      return (
        <div className="flex w-full flex-col items-center gap-4">
          <Image
            src={currentFile.fileUrl}
            alt={currentFile.name}
            width={1200}
            height={700}
            className="max-h-[60vh] w-auto max-w-full rounded-xl object-contain"
          />
          {gallery.length > 1 ? (
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {gallery.map((file, index) => (
                <button
                  key={file.$id}
                  type="button"
                  onClick={() => onSelectedIndexChange(files.findIndex((item) => item.$id === file.$id))}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 ${
                    index === galleryIndex ? "border-brand" : "border-transparent"
                  }`}
                >
                  <Image
                    src={file.fileUrl}
                    alt={file.name}
                    width={72}
                    height={72}
                    className="h-16 w-16 object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    if (currentFile.fileType === "video") {
      return (
        <video
          src={currentFile.fileUrl}
          controls
          className="max-h-[70vh] w-full rounded-xl bg-black"
        />
      );
    }

    if (currentFile.fileType === "audio") {
      return (
        <div className="flex h-40 w-full max-w-lg items-center justify-center rounded-xl bg-light-300 px-6">
          <audio src={currentFile.fileUrl} controls className="w-full" />
        </div>
      );
    }

    if (isCodePreviewable(currentFile.extension)) {
      return <CodePreview fileId={currentFile.$id} extension={currentFile.extension} />;
    }

    if (currentFile.fileType === "document") {
      return (
        <iframe
          src={currentFile.fileUrl}
          title={currentFile.name}
          className="h-[70vh] w-full rounded-xl border border-light-200"
        />
      );
    }

    return (
      <div className="flex h-56 w-full max-w-lg flex-col items-center justify-center gap-3 rounded-xl bg-light-300 text-center">
        <Image
          src={getFileIcon(currentFile.extension, currentFile.fileType)}
          alt=""
          width={48}
          height={48}
        />
        <p className="text-sm text-light-100">Preview is not available for this file type.</p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onSelectedIndexChange(null)}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
        <DialogHeader className="flex-row items-center justify-between border-b border-light-200 px-6 py-4">
          <DialogTitle className="line-clamp-1 pr-3 text-base font-semibold text-light-100">
            {currentFile.name}
          </DialogTitle>
          <p className="caption shrink-0 text-light-200">
            {currentIndex + 1} / {files.length}
          </p>
        </DialogHeader>

        <div className="relative flex min-h-[360px] items-center justify-center bg-light-400 px-6 py-5">
          {files.length > 1 ? (
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-drop-1 transition hover:bg-light-300"
              aria-label="Show previous file"
            >
              <ChevronLeft className="h-5 w-5 text-light-100" />
            </button>
          ) : null}

          <div className="flex w-full items-center justify-center">{renderPreview()}</div>

          {files.length > 1 ? (
            <button
              type="button"
              onClick={showNext}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-drop-1 transition hover:bg-light-300"
              aria-label="Show next file"
            >
              <ChevronRight className="h-5 w-5 text-light-100" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-light-200 px-6 py-4">
          <Button asChild variant="outline">
            <a href={currentFile.fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in new tab
            </a>
          </Button>
          {currentFile.$id ? (
            <Button asChild>
              <a href={`/api/files/${currentFile.$id}/download`}>Download</a>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;
