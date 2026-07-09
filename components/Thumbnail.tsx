import Image from "next/image";
import { cn, getFileIcon } from "@/lib/utils";
import { isImageType } from "@/lib/utils/thumbnails";

export const Thumbnail = ({
  type,
  extension,
  url = "",
  imageClassName,
  className,
  thumbnailUrl,
}: ThumbnailProps) => {
  const displayUrl = thumbnailUrl || url;
  const isImage = isImageType(type, extension) || Boolean(thumbnailUrl);

  return (
    <div className={cn("thumbnail", className)}>
      {isImage && displayUrl ? (
        <Image
          src={displayUrl}
          alt="File preview"
          width={48}
          height={48}
          className={cn("thumbnail-image", imageClassName)}
          unoptimized={displayUrl.startsWith("blob:")}
        />
      ) : (
        <Image
          src={getFileIcon(extension, type)}
          alt=""
          width={24}
          height={24}
        />
      )}
    </div>
  );
};
