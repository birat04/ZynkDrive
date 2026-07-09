export const THUMBNAIL_SIZES = {
  sm: 200,
  lg: 400,
} as const;

export type ThumbnailSize = keyof typeof THUMBNAIL_SIZES;

export const constructPreviewUrl = (
  bucketFileId: string,
  width: number,
  height: number,
  bucketId?: string
) => {
  const bucket =
    bucketId || process.env.NEXT_PUBLIC_APPWRITE_BUCKET!;
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${bucket}/files/${bucketFileId}/preview?width=${width}&height=${height}&project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
};

export const constructThumbnailUrl = (
  bucketFileId: string,
  size: ThumbnailSize = "sm",
  bucketId?: string
) => {
  const dimension = THUMBNAIL_SIZES[size];
  return constructPreviewUrl(bucketFileId, dimension, dimension, bucketId);
};

export const constructCachedThumbnailUrl = (
  thumbnailFileId: string,
  bucketId?: string
) => {
  const bucket =
    bucketId || process.env.NEXT_PUBLIC_APPWRITE_THUMBS_BUCKET || process.env.NEXT_PUBLIC_APPWRITE_BUCKET!;
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${bucket}/files/${thumbnailFileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
};

export const isImageType = (type: string, extension?: string) => {
  if (type === "image") return true;
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
  return extension ? imageExtensions.includes(extension.toLowerCase()) : false;
};

export const isCodePreviewable = (extension?: string) => {
  if (!extension) return false;
  const codeExtensions = [
    "js",
    "jsx",
    "ts",
    "tsx",
    "json",
    "md",
    "html",
    "htm",
    "css",
    "scss",
    "py",
    "rb",
    "go",
    "rs",
    "java",
    "c",
    "cpp",
    "h",
    "sh",
    "yml",
    "yaml",
    "xml",
    "sql",
    "txt",
  ];
  return codeExtensions.includes(extension.toLowerCase());
};

export const resolveThumbnailUrl = (file: {
  type?: string;
  extension?: string;
  bucketFileId?: string;
  thumbnailId?: string | null;
  url?: string;
}) => {
  const thumbsBucket =
    process.env.NEXT_PUBLIC_APPWRITE_THUMBS_BUCKET ||
    process.env.NEXT_PUBLIC_APPWRITE_BUCKET;

  if (file.thumbnailId && thumbsBucket) {
    return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${thumbsBucket}/files/${file.thumbnailId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
  }

  if (file.bucketFileId && isImageType(file.type || "", file.extension)) {
    return constructThumbnailUrl(file.bucketFileId, "sm");
  }

  return file.url || "";
};
