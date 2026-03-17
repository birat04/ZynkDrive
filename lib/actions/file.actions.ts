"use server";

import { ID, Models, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/appwrite";
import { getFileType, parseStringify, constructFileUrl } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/user.actions";

type FileDoc = Models.Document & {
  type?: FileType;
  size?: number | string;
  email?: string;
};

export const uploadFile = async ({ file, ownerId, accountId, path }: UploadFileProps) => {
  const { storage, databases } = await createAdminClient();

  try {
    const uploaded = await storage.createFile(
      process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
      ID.unique(),
      file
    );

    const { type, extension } = getFileType(file.name);

    const fileDocument = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      ID.unique(),
      {
        name: file.name,
        url: constructFileUrl(uploaded.$id),
        type,
        bucketFileId: uploaded.$id,
        accountId,
        owner: ownerId,
        extension,
        size: file.size,
        users: [],
      }
    );

    revalidatePath(path);
    return parseStringify(fileDocument);
  } catch (error) {
    console.error(error);
  }
};

export const getFiles = async ({ types, searchText, sort = "$createdAt-desc", limit }: GetFilesProps) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return parseStringify([]);

    const queries: string[] = [
      Query.or([
        Query.equal("owner", [currentUser.$id]),
        Query.contains("users", [currentUser.email]),
      ]),
    ];

    if (types?.length) queries.push(Query.equal("type", types));
    if (searchText) queries.push(Query.contains("name", searchText));

    const [sortBy, orderBy] = sort.split("-");
    queries.push(orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy));

    if (limit) queries.push(Query.limit(limit));

    const files = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      queries
    );

    return parseStringify(files.documents);
  } catch (error) {
    console.error(error);
  }
};

export const renameFile = async ({ fileId, name, extension, path }: RenameFileProps) => {
  const { databases } = await createAdminClient();

  try {
    const updatedFile = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      { name: `${name}.${extension}` }
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    console.error(error);
  }
};

export const updateFileUsers = async ({ fileId, emails, path }: UpdateFileUsersProps) => {
  const { databases } = await createAdminClient();

  try {
    const updatedFile = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      { users: emails }
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    console.error(error);
  }
};

export const deleteFile = async ({ fileId, bucketFileId, path }: DeleteFileProps) => {
  const { databases, storage } = await createAdminClient();

  try {
    await storage.deleteFile(process.env.NEXT_PUBLIC_APPWRITE_BUCKET!, bucketFileId);
    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    );

    revalidatePath(path);
    return parseStringify({ status: "ok" });
  } catch (error) {
    console.error(error);
  }
};

type SpaceEntry = { size: number; latestDate: string };

const emptySpaceEntry = (): SpaceEntry => ({ size: 0, latestDate: "" });

export const getTotalSpaceUsed = async () => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return parseStringify({
        document: emptySpaceEntry(),
        image: emptySpaceEntry(),
        video: emptySpaceEntry(),
        audio: emptySpaceEntry(),
        other: emptySpaceEntry(),
        used: 0,
        all: [] as FileDoc[],
      });
    }

    const baseQueries = [
      Query.or([
        Query.equal("owner", [currentUser.$id]),
        Query.contains("users", [currentUser.email]),
      ]),
    ];

    const allDocs: FileDoc[] = [];
    const pageSize = 100;
    let offset = 0;

    while (true) {
      const page = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        [...baseQueries, Query.limit(pageSize), Query.offset(offset)]
      );

      allDocs.push(...(page.documents as FileDoc[]));

      if (page.documents.length < pageSize) break;
      offset += pageSize;
    }

    const totalSpace = {
      document: emptySpaceEntry(),
      image: emptySpaceEntry(),
      video: emptySpaceEntry(),
      audio: emptySpaceEntry(),
      other: emptySpaceEntry(),
      used: 0,
      all: [] as FileDoc[],
    };

    for (const doc of allDocs) {
      const fileType = doc.type || "other";
      const size = typeof doc.size === "number" ? doc.size : Number(doc.size || 0);
      const date = (doc.$updatedAt || doc.$createdAt || "") as string;

      if (fileType in totalSpace) {
        const entry = totalSpace[fileType as keyof typeof totalSpace] as SpaceEntry;
        entry.size += size;
        entry.latestDate = !entry.latestDate || date > entry.latestDate ? date : entry.latestDate;
      } else {
        totalSpace.other.size += size;
        totalSpace.other.latestDate =
          !totalSpace.other.latestDate || date > totalSpace.other.latestDate
            ? date
            : totalSpace.other.latestDate;
      }

      totalSpace.used += size;
    }

    const recent = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [...baseQueries, Query.orderDesc("$createdAt"), Query.limit(10)]
    );

    totalSpace.all = recent.documents as FileDoc[];

    return parseStringify(totalSpace);
  } catch (error) {
    console.error(error);
  }
};

