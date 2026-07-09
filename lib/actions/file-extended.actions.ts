"use server";

import { ID, Query, Models } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { MoveFileSchema, CreateCommentSchema } from "@/lib/validators";

interface FileDoc extends Models.Document {
  ownerId: string;
  name: string;
  folderId?: string;
  starred?: boolean;
  tags?: string[];
  trashed?: boolean;
  trashedAt?: string;
  downloadCount?: number;
}

/**
 * Move file to a different folder
 */
export const moveFileToFolder = async (
  fileId: string,
  targetFolderId?: string
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const validated = MoveFileSchema.parse({
      fileId,
      targetFolderId: targetFolderId || null,
    });

    const { databases } = await createAdminClient();

    const file = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    )) as FileDoc;

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    // Validate target folder exists if provided
    if (validated.targetFolderId) {
      const targetFolder = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
        validated.targetFolderId
      );

      if (targetFolder.ownerId !== currentUser.$id) {
        throw new Error("Unauthorized");
      }
    }

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        folderId: validated.targetFolderId || null,
      }
    );

    revalidatePath("/");
    return { success: true, file: updated };
  } catch (error) {
    console.error("Error moving file:", error);
    throw error;
  }
};

/**
 * Copy file to a different location
 */
export const copyFile = async (
  fileId: string,
  targetFolderId?: string
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases, storage } = await createAdminClient();

    const file = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    )) as FileDoc;

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    // Create a new document for the copy
    const copiedFile = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      ID.unique(),
      {
        ...file,
        name: `${file.name} (copy)`,
        folderId: targetFolderId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Keep reference to original for version history
        originalFileId: fileId,
      }
    );

    // Log activity
    await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      ID.unique(),
      {
        userId: currentUser.$id,
        resourceType: "file",
        resourceId: fileId,
        action: "copy",
        metadata: { copiedToFileId: copiedFile.$id },
        createdAt: new Date().toISOString(),
      }
    );

    revalidatePath("/");
    return { success: true, file: copiedFile };
  } catch (error) {
    console.error("Error copying file:", error);
    throw error;
  }
};

/**
 * Toggle file star status
 */
export const toggleFileStar = async (fileId: string, starred: boolean) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const file = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    )) as FileDoc;

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        starred,
      }
    );

    revalidatePath("/");
    return { success: true, file: updated };
  } catch (error) {
    console.error("Error toggling file star:", error);
    throw error;
  }
};

/**
 * Add tags to file
 */
export const addTagsToFile = async (fileId: string, tags: string[]) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const file = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    )) as FileDoc;

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    const currentTags = file.tags || [];
    const newTags = Array.from(new Set([...currentTags, ...tags]));

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        tags: newTags,
      }
    );

    revalidatePath("/");
    return { success: true, file: updated };
  } catch (error) {
    console.error("Error adding tags:", error);
    throw error;
  }
};

/**
 * Remove tags from file
 */
export const removeTagsFromFile = async (
  fileId: string,
  tagsToRemove: string[]
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const file = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    )) as FileDoc;

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    const currentTags = file.tags || [];
    const updatedTags = currentTags.filter((tag) => !tagsToRemove.includes(tag));

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        tags: updatedTags,
      }
    );

    revalidatePath("/");
    return { success: true, file: updated };
  } catch (error) {
    console.error("Error removing tags:", error);
    throw error;
  }
};

/**
 * Get trash contents
 */
export const getTrashContents = async (limit = 100) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const files = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [
        Query.equal("ownerId", [currentUser.$id]),
        Query.equal("trashed", [true]),
        Query.orderDesc("trashedAt"),
        Query.limit(limit),
      ]
    );

    return {
      files: files.documents,
      total: files.total,
    };
  } catch (error) {
    console.error("Error getting trash contents:", error);
    throw error;
  }
};

/**
 * Restore file from trash
 */
export const restoreFileFromTrash = async (fileId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const file = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    )) as FileDoc;

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    if (!file.trashed) {
      throw new Error("File is not in trash");
    }

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        trashed: false,
        trashedAt: null,
      }
    );

    // Log activity
    await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      ID.unique(),
      {
        userId: currentUser.$id,
        resourceType: "file",
        resourceId: fileId,
        action: "restore",
        createdAt: new Date().toISOString(),
      }
    );

    revalidatePath("/");
    return { success: true, file: updated };
  } catch (error) {
    console.error("Error restoring file:", error);
    throw error;
  }
};

/**
 * Permanently delete file from trash
 */
export const permanentlyDeleteFileFromTrash = async (
  fileId: string,
  storageFileId: string
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases, storage } = await createAdminClient();

    const file = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    )) as FileDoc;

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    // Delete from storage
    try {
      await storage.deleteFile(
        process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
        storageFileId
      );
    } catch (e) {
      console.warn("Storage file already deleted:", e);
    }

    // Delete document
    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    );

    // Log activity
    await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      ID.unique(),
      {
        userId: currentUser.$id,
        resourceType: "file",
        resourceId: fileId,
        action: "delete",
        createdAt: new Date().toISOString(),
      }
    );

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error permanently deleting file:", error);
    throw error;
  }
};

/**
 * Empty trash (delete all files in trash older than 30 days)
 */
export const emptyTrash = async (daysOld = 30) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases, storage } = await createAdminClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const files = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [
        Query.equal("ownerId", [currentUser.$id]),
        Query.equal("trashed", [true]),
        Query.lessThan("trashedAt", cutoffDate.toISOString()),
      ]
    );

    let deletedCount = 0;

    for (const file of files.documents) {
      const fileDoc = file as FileDoc & { bucketFileId?: string };
      try {
        if (fileDoc.bucketFileId) {
          await storage.deleteFile(
            process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
            fileDoc.bucketFileId
          );
        }
        await databases.deleteDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
          process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
          file.$id
        );
        deletedCount++;
      } catch (e) {
        console.warn(`Failed to delete file ${file.$id}:`, e);
      }
    }

    revalidatePath("/");
    return { success: true, deletedCount };
  } catch (error) {
    console.error("Error emptying trash:", error);
    throw error;
  }
};

/**
 * Get user's starred files
 */
export const getStarredFiles = async (limit = 100) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const files = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [
        Query.equal("ownerId", [currentUser.$id]),
        Query.equal("starred", [true]),
        Query.equal("trashed", [false]),
        Query.orderDesc("updatedAt"),
        Query.limit(limit),
      ]
    );

    return {
      files: files.documents,
      total: files.total,
    };
  } catch (error) {
    console.error("Error getting starred files:", error);
    throw error;
  }
};

/**
 * Search files by name or tag
 */
export const searchFiles = async (query: string, limit = 50) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const files = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [
        Query.equal("ownerId", [currentUser.$id]),
        Query.equal("trashed", [false]),
        Query.contains("name", query.toLowerCase()),
        Query.limit(limit),
      ]
    );

    return {
      files: files.documents,
      query,
    };
  } catch (error) {
    console.error("Error searching files:", error);
    throw error;
  }
};

/**
 * Record file download in activity log
 */
export const recordFileDownload = async (fileId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Update download count
    const file = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    )) as FileDoc;

    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        downloadCount: (file.downloadCount || 0) + 1,
      }
    );

    // Log activity
    await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      ID.unique(),
      {
        userId: currentUser.$id,
        resourceType: "file",
        resourceId: fileId,
        action: "download",
        createdAt: new Date().toISOString(),
      }
    );

    return { success: true };
  } catch (error) {
    console.error("Error recording download:", error);
    throw error;
  }
};
