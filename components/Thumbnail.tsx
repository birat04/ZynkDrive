import Image from "next/image";
import { cn, getFileIcon } from "@/lib/utils";

export const Thumbnail = ({
  type,
  extension,
  url = "",
  imageClassName,
  className,
}: ThumbnailProps) => {
  const isImage = type === "image";

  return (
    <div className={cn("thumbnail", className)}>
      {isImage && url ? (
        <Image
          src={url}
          alt="File preview"
          width={48}
          height={48}
          className={cn("thumbnail-image", imageClassName)}
          unoptimized={url.startsWith("blob:")}
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
