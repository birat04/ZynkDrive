"use server";

import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

import { createAdminClient } from "@/lib/appwrite";
import {
  constructPreviewUrl,
  isImageType,
  THUMBNAIL_SIZES,
} from "@/lib/utils/thumbnails";

const getThumbsBucket = () =>
  process.env.NEXT_PUBLIC_APPWRITE_THUMBS_BUCKET ||
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET!;

const fetchPreviewBuffer = async (
  bucketFileId: string,
  width: number,
  height: number
) => {
  const previewUrl = constructPreviewUrl(bucketFileId, width, height);
  const response = await fetch(previewUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Preview fetch failed: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

const uploadThumbnail = async (buffer: Buffer, fileName: string) => {
  const { storage } = await createAdminClient();
  const inputFile = InputFile.fromBuffer(buffer, fileName);

  return storage.createFile(getThumbsBucket(), ID.unique(), inputFile);
};

export const generateFileThumbnails = async (
  bucketFileId: string,
  type: string,
  extension?: string
) => {
  if (!isImageType(type, extension)) {
    return { thumbnailId: null, thumbnailIdLg: null };
  }

  try {
    const [smallBuffer, largeBuffer] = await Promise.all([
      fetchPreviewBuffer(bucketFileId, THUMBNAIL_SIZES.sm, THUMBNAIL_SIZES.sm),
      fetchPreviewBuffer(bucketFileId, THUMBNAIL_SIZES.lg, THUMBNAIL_SIZES.lg),
    ]);

    const [smallThumb, largeThumb] = await Promise.all([
      uploadThumbnail(smallBuffer, `${bucketFileId}-200.webp`),
      uploadThumbnail(largeBuffer, `${bucketFileId}-400.webp`),
    ]);

    return {
      thumbnailId: smallThumb.$id,
      thumbnailIdLg: largeThumb.$id,
    };
  } catch (error) {
    console.error("Thumbnail generation failed:", error);
    return { thumbnailId: null, thumbnailIdLg: null };
  }
};

export const regenerateThumbnail = async (
  fileId: string,
  bucketFileId: string,
  type: string,
  extension?: string
) => {
  const thumbnails = await generateFileThumbnails(bucketFileId, type, extension);
  const { databases } = await createAdminClient();

  await databases.updateDocument(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
    process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
    fileId,
    {
      thumbnailId: thumbnails.thumbnailId,
      thumbnailIdLg: thumbnails.thumbnailIdLg,
    }
  );

  return thumbnails;
};

export const getThumbnailUrlForFile = (file: {
  type?: string;
  extension?: string;
  bucketFileId?: string;
  thumbnailId?: string | null;
  thumbnailIdLg?: string | null;
  url?: string;
}) => {
  if (file.thumbnailId) {
    return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${getThumbsBucket()}/files/${file.thumbnailId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
  }

  if (file.bucketFileId && isImageType(file.type || "", file.extension)) {
    return constructPreviewUrl(file.bucketFileId, THUMBNAIL_SIZES.sm, THUMBNAIL_SIZES.sm);
  }

  return file.url || "";
};
