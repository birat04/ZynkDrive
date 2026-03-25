"use server";

import { ID, Models, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { createAdminClient } from "@/lib/appwrite";
import { getFileType, parseStringify, constructFileUrl } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/user.actions";

const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const DEFAULT_PUBLIC_SHARE_EXPIRY_DAYS = 7;
const PUBLIC_SHARE_DAY_MS = 24 * 60 * 60 * 1000;

type FileDoc = Models.Document & {
  type?: FileType;
  size?: number | string;
  email?: string;
  accountId?: string;
  owner?: string;
  users?: string[];
  bucketFileId?: string;
  deletedAt?: string | null;
};

type ShareRole = "viewer" | "editor";

type CurrentUserDoc = Models.Document & {
  accountId?: string;
  email?: string;
};

const getAccessibleFile = async (fileId: string) => {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) throw new Error("Unauthenticated");

  const file = (await databases.getDocument(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
    process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
    fileId
  )) as FileDoc;

  const userId = currentUser.$id as string;
  const accountId = currentUser.accountId as string | undefined;
  const userEmail = currentUser.email as string;
  const users = file.users ?? [];
  const hasSharedEmail = users.includes(userEmail);
  const hasLegacyOwner = file.owner === userId;
  const hasAccountOwner = !!accountId && file.accountId === accountId;
  const hasEditorTag = users.includes(`role:${userEmail}:editor`);
  const hasAccess =
    hasLegacyOwner ||
    hasAccountOwner ||
    hasSharedEmail ||
    hasEditorTag;

  if (!hasAccess) throw new Error("Forbidden");

  return { file, currentUser };
};

const canEditFile = (file: FileDoc, currentUser: CurrentUserDoc) => {
  const users = file.users ?? [];
  const userId = currentUser.$id as string;
  const accountId = currentUser.accountId as string | undefined;
  const email = currentUser.email as string | undefined;

  const isOwner =
    file.owner === userId ||
    (!!accountId && file.accountId === accountId);

  if (isOwner) return true;
  if (!email) return false;

  return users.includes(`role:${email}:editor`);
};

const buildUsersArrayWithRoles = (
  sharedUsers: Array<{ email: string; role: ShareRole }>
) => {
  const normalized = sharedUsers
    .map((entry) => ({
      email: entry.email.trim().toLowerCase(),
      role: entry.role,
    }))
    .filter((entry) => entry.email.length > 0);

  const unique = new Map<string, ShareRole>();
  for (const entry of normalized) {
    unique.set(entry.email, entry.role);
  }

  const users: string[] = [];

  for (const [email, role] of unique) {
    users.push(email);
    if (role === "editor") {
      users.push(`role:${email}:editor`);
    }
  }

  return users;
};

const assertOwner = (file: FileDoc, currentUserId: string, currentAccountId?: string) => {
  const isOwner =
    file.owner === currentUserId ||
    (!!currentAccountId && file.accountId === currentAccountId);

  if (!isOwner) {
    throw new Error("Owner permission required");
  }
};

const buildAccessFilter = (currentUser: CurrentUserDoc) => {
  const ownerId = currentUser.$id as string | undefined;
  const email = currentUser.email;

  const filters: string[] = [];
  if (ownerId) filters.push(Query.equal("owner", [ownerId]));
  if (email) filters.push(Query.contains("users", [email]));

  if (filters.length === 0) {
    throw new Error("Current user is missing owner id and email");
  }

  return filters.length === 1 ? filters[0] : Query.or(filters);
};

const isExpiredTrashDate = (deletedAt: string | null | undefined) => {
  if (!deletedAt) return false;
  const deletedTimestamp = new Date(deletedAt).getTime();
  if (Number.isNaN(deletedTimestamp)) return false;

  return Date.now() - deletedTimestamp >= TRASH_RETENTION_MS;
};

const createExpiringShareToken = (expiresInDays = DEFAULT_PUBLIC_SHARE_EXPIRY_DAYS) => {
  const token = randomUUID().replace(/-/g, "");
  const expiresAt = Date.now() + Math.max(1, expiresInDays) * PUBLIC_SHARE_DAY_MS;
  return `${token}.${expiresAt}`;
};

const parseShareTokenExpiry = (token: string) => {
  const parts = token.split(".");
  const maybeTimestamp = Number(parts.at(-1));

  if (!Number.isFinite(maybeTimestamp)) {
    return null;
  }

  return maybeTimestamp;
};

const getShareTokenExpiryInfo = (token: string) => {
  const expiresAt = parseShareTokenExpiry(token);
  if (!expiresAt) return { expiresAt: null, isExpired: false };

  return {
    expiresAt,
    isExpired: Date.now() >= expiresAt,
  };
};

export const uploadFile = async ({ file, ownerId, accountId, path }: UploadFileProps) => {
  const { storage, databases } = await createAdminClient();

  try {
    void accountId;
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const buffer = Buffer.from(await file.arrayBuffer());
    const inputFile = InputFile.fromBuffer(buffer, file.name);

    const uploaded = await storage.createFile(
      process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
      ID.unique(),
      inputFile
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
        owner: (currentUser.$id as string) ?? ownerId,
        extension,
        size: file.size,
        users: [],
        isDeleted: false,
        deletedAt: null,
        isStarred: false,
        isPublic: false,
        shareToken: null,
      }
    );

    revalidatePath(path);
    return parseStringify(fileDocument);
  } catch (error) {
    console.error(error);
  }
};

export const getFiles = async ({
  types,
  searchText,
  sort = "$createdAt-desc",
  limit,
  includeDeletedOnly = false,
  includeStarredOnly = false,
  includePublicOnly = false,
  includeSharedWithMeOnly = false,
  includeRecentOnly = false,
  recentDays = 30,
}: GetFilesProps) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return parseStringify([]);

    const queries: string[] = [buildAccessFilter(currentUser as CurrentUserDoc)];

    if (types?.length) queries.push(Query.equal("type", types));
    if (searchText) queries.push(Query.contains("name", searchText));
    if (includeDeletedOnly) queries.push(Query.equal("isDeleted", [true]));
    if (includeStarredOnly) queries.push(Query.equal("isStarred", [true]));
    if (includePublicOnly) queries.push(Query.equal("isPublic", [true]));

    const [sortBy, orderBy] = sort.split("-");
    queries.push(orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy));

    if (limit) queries.push(Query.limit(limit));

    const files = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      queries
    );

    let filteredFiles = includeDeletedOnly
      ? files.documents
      : files.documents.filter((file) => (file as Models.Document & { isDeleted?: boolean }).isDeleted !== true);

    if (includeSharedWithMeOnly) {
      const currentOwnerId = currentUser.$id as string | undefined;
      const currentEmail = (currentUser.email as string | undefined)?.toLowerCase();

      filteredFiles = filteredFiles.filter((file) => {
        const doc = file as FileDoc;
        const ownerMatches = !!currentOwnerId && doc.owner === currentOwnerId;
        const users = (doc.users ?? []).map((u) => u.toLowerCase());
        const sharedDirectly = !!currentEmail && users.includes(currentEmail);
        const sharedAsEditor = !!currentEmail && users.includes(`role:${currentEmail}:editor`);
        return !ownerMatches && (sharedDirectly || sharedAsEditor);
      });
    }

    if (includeRecentOnly) {
      const recentWindowMs = Math.max(1, recentDays) * 24 * 60 * 60 * 1000;
      const now = Date.now();

      filteredFiles = filteredFiles.filter((file) => {
        const updatedAt =
          (file as Models.Document).$updatedAt ||
          (file as Models.Document).$createdAt ||
          "";
        const timestamp = new Date(updatedAt).getTime();
        if (Number.isNaN(timestamp)) return false;
        return now - timestamp <= recentWindowMs;
      });
    }

    return parseStringify(filteredFiles);
  } catch (error) {
    console.error(error);
  }
};

export const renameFile = async ({ fileId, name, extension, path }: RenameFileProps) => {
  const { databases } = await createAdminClient();

  try {
    const { file, currentUser } = await getAccessibleFile(fileId);
    if (!canEditFile(file, currentUser)) {
      throw new Error("Edit permission required");
    }

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

export const updateFileUsers = async ({ fileId, emails, sharedUsers, path }: UpdateFileUsersProps) => {
  const { databases } = await createAdminClient();

  try {
    const { file, currentUser } = await getAccessibleFile(fileId);
    assertOwner(file, currentUser.$id as string, currentUser.accountId as string | undefined);

    const normalizedSharedUsers = Array.isArray(sharedUsers)
      ? sharedUsers
      : emails.map((email) => ({ email, role: "viewer" as const }));

    const users = buildUsersArrayWithRoles(normalizedSharedUsers);

    const updatedFile = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      { users }
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    console.error(error);
  }
};

export const deleteFile = async ({ fileId, bucketFileId: _bucketFileId, path }: DeleteFileProps) => {
  const { databases } = await createAdminClient();

  try {
    void _bucketFileId;
    const { file, currentUser } = await getAccessibleFile(fileId);
    assertOwner(file, currentUser.$id as string, currentUser.accountId as string | undefined);

    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      }
    );

    revalidatePath(path);
    revalidatePath("/trash");
    return parseStringify({ status: "ok" });
  } catch (error) {
    console.error(error);
  }
};

export const restoreFile = async ({ fileId, path }: { fileId: string; path: string }) => {
  const { databases } = await createAdminClient();

  try {
    const { file, currentUser } = await getAccessibleFile(fileId);
    assertOwner(file, currentUser.$id as string, currentUser.accountId as string | undefined);

    const restored = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        isDeleted: false,
        deletedAt: null,
      }
    );

    revalidatePath(path);
    revalidatePath("/trash");
    return parseStringify(restored);
  } catch (error) {
    console.error(error);
  }
};

export const permanentlyDeleteFile = async ({ fileId, bucketFileId, path }: DeleteFileProps) => {
  const { databases, storage } = await createAdminClient();

  try {
    const { file, currentUser } = await getAccessibleFile(fileId);
    assertOwner(file, currentUser.$id as string, currentUser.accountId as string | undefined);

    await storage.deleteFile(process.env.NEXT_PUBLIC_APPWRITE_BUCKET!, bucketFileId);
    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    );

    revalidatePath(path);
    revalidatePath("/trash");
    return parseStringify({ status: "ok" });
  } catch (error) {
    console.error(error);
  }
};

export const toggleFileStarred = async ({
  fileId,
  isStarred,
  path,
}: {
  fileId: string;
  isStarred: boolean;
  path: string;
}) => {
  const { databases } = await createAdminClient();

  try {
    const { file, currentUser } = await getAccessibleFile(fileId);
    assertOwner(file, currentUser.$id as string, currentUser.accountId as string | undefined);

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        isStarred,
      }
    );

    revalidatePath(path);
    revalidatePath("/starred");
    return parseStringify(updated);
  } catch (error) {
    console.error(error);
  }
};

export const createPublicShareLink = async ({
  fileId,
  expiresInDays,
  forceNewToken,
  path,
}: {
  fileId: string;
  expiresInDays?: number;
  forceNewToken?: boolean;
  path: string;
}) => {
  const { databases } = await createAdminClient();

  try {
    const { file, currentUser } = await getAccessibleFile(fileId);
    assertOwner(file, currentUser.$id as string, currentUser.accountId as string | undefined);

    const existingToken = (file as Models.Document & { shareToken?: string }).shareToken;
    const existingInfo = existingToken ? getShareTokenExpiryInfo(existingToken) : null;
    const normalizedDays =
      typeof expiresInDays === "number" && Number.isFinite(expiresInDays)
        ? Math.max(1, Math.floor(expiresInDays))
        : DEFAULT_PUBLIC_SHARE_EXPIRY_DAYS;
    const token =
      !forceNewToken && typeof expiresInDays !== "number" && existingToken && existingInfo && !existingInfo.isExpired
        ? existingToken
        : createExpiringShareToken(normalizedDays);

    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        isPublic: true,
        shareToken: token,
      }
    );

    revalidatePath(path);

    const shareUrl = `/shared/${token}`;
    return parseStringify({
      token,
      shareUrl,
      expiresAt: getShareTokenExpiryInfo(token).expiresAt,
    });
  } catch (error) {
    console.error(error);
  }
};

export const revokePublicShareLink = async ({
  fileId,
  path,
}: {
  fileId: string;
  path: string;
}) => {
  const { databases } = await createAdminClient();

  try {
    const { file, currentUser } = await getAccessibleFile(fileId);
    assertOwner(file, currentUser.$id as string, currentUser.accountId as string | undefined);

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        isPublic: false,
        shareToken: null,
      }
    );

    revalidatePath(path);
    return parseStringify(updated);
  } catch (error) {
    console.error(error);
  }
};

export const getPublicFileByToken = async (token: string) => {
  const { databases } = await createAdminClient();

  try {
    const tokenInfo = getShareTokenExpiryInfo(token);
    if (tokenInfo.isExpired) {
      return null;
    }

    const result = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [
        Query.equal("shareToken", [token]),
        Query.equal("isPublic", [true]),
        Query.equal("isDeleted", [false]),
        Query.limit(1),
      ]
    );

    const file = result.documents[0];
    if (!file) return null;
    return parseStringify(file);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const bulkMoveFilesToTrash = async ({ fileIds, path }: { fileIds: string[]; path: string }) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const currentUserId = currentUser.$id as string;
    const currentAccountId = currentUser.accountId as string | undefined;

    for (const fileId of fileIds) {
      const { file } = await getAccessibleFile(fileId);
      assertOwner(file, currentUserId, currentAccountId);

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        fileId,
        {
          isDeleted: true,
          deletedAt: new Date().toISOString(),
        }
      );
    }

    revalidatePath(path);
    revalidatePath("/trash");
    return parseStringify({ status: "ok" });
  } catch (error) {
    console.error(error);
  }
};

export const bulkToggleFilesStarred = async ({
  fileIds,
  isStarred,
  path,
}: {
  fileIds: string[];
  isStarred: boolean;
  path: string;
}) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const currentUserId = currentUser.$id as string;
    const currentAccountId = currentUser.accountId as string | undefined;

    for (const fileId of fileIds) {
      const { file } = await getAccessibleFile(fileId);
      assertOwner(file, currentUserId, currentAccountId);

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        fileId,
        { isStarred }
      );
    }

    revalidatePath(path);
    revalidatePath("/starred");
    return parseStringify({ status: "ok" });
  } catch (error) {
    console.error(error);
  }
};

export const bulkRevokePublicLinks = async ({ fileIds, path }: { fileIds: string[]; path: string }) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const currentUserId = currentUser.$id as string;
    const currentAccountId = currentUser.accountId as string | undefined;

    for (const fileId of fileIds) {
      const { file } = await getAccessibleFile(fileId);
      assertOwner(file, currentUserId, currentAccountId);

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        fileId,
        {
          isPublic: false,
          shareToken: null,
        }
      );
    }

    revalidatePath(path);
    revalidatePath("/shared-links");
    return parseStringify({ status: "ok" });
  } catch (error) {
    console.error(error);
  }
};

export const bulkRenewPublicLinks = async ({
  fileIds,
  expiresInDays = DEFAULT_PUBLIC_SHARE_EXPIRY_DAYS,
  path,
}: {
  fileIds: string[];
  expiresInDays?: number;
  path: string;
}) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const currentUserId = currentUser.$id as string;
    const currentAccountId = currentUser.accountId as string | undefined;
    const normalizedDays =
      typeof expiresInDays === "number" && Number.isFinite(expiresInDays)
        ? Math.max(1, Math.floor(expiresInDays))
        : DEFAULT_PUBLIC_SHARE_EXPIRY_DAYS;

    for (const fileId of fileIds) {
      const { file } = await getAccessibleFile(fileId);
      assertOwner(file, currentUserId, currentAccountId);

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        fileId,
        {
          isPublic: true,
          shareToken: createExpiringShareToken(normalizedDays),
        }
      );
    }

    revalidatePath(path);
    revalidatePath("/shared-links");
    return parseStringify({ status: "ok" });
  } catch (error) {
    console.error(error);
  }
};

export const bulkRestoreFilesFromTrash = async ({ fileIds, path }: { fileIds: string[]; path: string }) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const currentUserId = currentUser.$id as string;
    const currentAccountId = currentUser.accountId as string | undefined;

    for (const fileId of fileIds) {
      const { file } = await getAccessibleFile(fileId);
      assertOwner(file, currentUserId, currentAccountId);

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        fileId,
        {
          isDeleted: false,
          deletedAt: null,
        }
      );
    }

    revalidatePath(path);
    revalidatePath("/trash");
    return parseStringify({ status: "ok" });
  } catch (error) {
    console.error(error);
  }
};

export const bulkPermanentlyDeleteFiles = async ({ fileIds, path }: { fileIds: string[]; path: string }) => {
  const { databases, storage } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const currentUserId = currentUser.$id as string;
    const currentAccountId = currentUser.accountId as string | undefined;

    for (const fileId of fileIds) {
      const { file } = await getAccessibleFile(fileId);
      assertOwner(file, currentUserId, currentAccountId);

      const bucketFileId = file.bucketFileId as string | undefined;
      if (bucketFileId) {
        await storage.deleteFile(process.env.NEXT_PUBLIC_APPWRITE_BUCKET!, bucketFileId);
      }

      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        fileId
      );
    }

    revalidatePath(path);
    revalidatePath("/trash");
    return parseStringify({ status: "ok" });
  } catch (error) {
    console.error(error);
  }
};

export const restoreAllFromTrash = async ({ path }: { path: string }) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const trashFiles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [buildAccessFilter(currentUser as CurrentUserDoc), Query.equal("isDeleted", [true]), Query.limit(5000)]
    );

    for (const file of trashFiles.documents as FileDoc[]) {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        file.$id,
        {
          isDeleted: false,
          deletedAt: null,
        }
      );
    }

    revalidatePath(path);
    revalidatePath("/trash");
    return parseStringify({ status: "ok", count: trashFiles.documents.length });
  } catch (error) {
    console.error(error);
  }
};

export const emptyTrash = async ({ path }: { path: string }) => {
  const { databases, storage } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const trashFiles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [buildAccessFilter(currentUser as CurrentUserDoc), Query.equal("isDeleted", [true]), Query.limit(5000)]
    );

    for (const file of trashFiles.documents as FileDoc[]) {
      const bucketFileId = file.bucketFileId as string | undefined;

      if (bucketFileId) {
        try {
          await storage.deleteFile(process.env.NEXT_PUBLIC_APPWRITE_BUCKET!, bucketFileId);
        } catch (storageError) {
          console.error(storageError);
        }
      }

      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        file.$id
      );
    }

    revalidatePath(path);
    revalidatePath("/trash");
    return parseStringify({ status: "ok", count: trashFiles.documents.length });
  } catch (error) {
    console.error(error);
  }
};

export const purgeExpiredTrash = async () => {
  const { databases, storage } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return parseStringify({ status: "ok", count: 0 });

    const trashFiles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [buildAccessFilter(currentUser as CurrentUserDoc), Query.equal("isDeleted", [true]), Query.limit(5000)]
    );

    let purgedCount = 0;

    for (const file of trashFiles.documents as FileDoc[]) {
      if (!isExpiredTrashDate(file.deletedAt as string | null | undefined)) continue;

      const bucketFileId = file.bucketFileId as string | undefined;
      if (bucketFileId) {
        try {
          await storage.deleteFile(process.env.NEXT_PUBLIC_APPWRITE_BUCKET!, bucketFileId);
        } catch (storageError) {
          console.error(storageError);
        }
      }

      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        file.$id
      );
      purgedCount += 1;
    }

    if (purgedCount > 0) {
      revalidatePath("/trash");
    }

    return parseStringify({ status: "ok", count: purgedCount });
  } catch (error) {
    console.error(error);
  }
};

export const renewAllPublicLinks = async ({
  expiresInDays = DEFAULT_PUBLIC_SHARE_EXPIRY_DAYS,
  path,
}: {
  expiresInDays?: number;
  path: string;
}) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const normalizedDays =
      typeof expiresInDays === "number" && Number.isFinite(expiresInDays)
        ? Math.max(1, Math.floor(expiresInDays))
        : DEFAULT_PUBLIC_SHARE_EXPIRY_DAYS;

    const sharedFiles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [
        buildAccessFilter(currentUser as CurrentUserDoc),
        Query.equal("isPublic", [true]),
        Query.equal("isDeleted", [false]),
        Query.limit(5000),
      ]
    );

    for (const file of sharedFiles.documents as FileDoc[]) {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        file.$id,
        {
          isPublic: true,
          shareToken: createExpiringShareToken(normalizedDays),
        }
      );
    }

    revalidatePath(path);
    revalidatePath("/shared-links");
    return parseStringify({ status: "ok", count: sharedFiles.documents.length });
  } catch (error) {
    console.error(error);
  }
};

export const revokeAllPublicLinks = async ({ path }: { path: string }) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthenticated");

    const sharedFiles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [
        buildAccessFilter(currentUser as CurrentUserDoc),
        Query.equal("isPublic", [true]),
        Query.equal("isDeleted", [false]),
        Query.limit(5000),
      ]
    );

    for (const file of sharedFiles.documents as FileDoc[]) {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        file.$id,
        {
          isPublic: false,
          shareToken: null,
        }
      );
    }

    revalidatePath(path);
    revalidatePath("/shared-links");
    return parseStringify({ status: "ok", count: sharedFiles.documents.length });
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

    const baseQueries = [buildAccessFilter(currentUser as CurrentUserDoc)];

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

    const activeDocs = allDocs.filter((doc) => (doc as FileDoc & { isDeleted?: boolean }).isDeleted !== true);

    for (const doc of activeDocs) {
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

    totalSpace.all = (recent.documents as FileDoc[]).filter(
      (doc) => (doc as FileDoc & { isDeleted?: boolean }).isDeleted !== true
    );

    return parseStringify(totalSpace);
  } catch (error) {
    console.error(error);
  }
};

