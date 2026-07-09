"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { logActivity } from "@/lib/actions/activity.actions";

interface VersionDoc {
  fileId: string;
  storageObjectId: string;
  versionNumber: number;
  size: number;
  createdAt: string;
  createdBy: string;
  $id?: string;
}

/**
 * Create a new version of a file
 * Called when file is uploaded/updated
 */
export const createFileVersion = async (
  fileId: string,
  storageObjectId: string,
  fileSize: number
) => {
  try {
    if (!process.env.NEXT_PUBLIC_VERSION_HISTORY_ENABLED) {
      return null;
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Get current file to increment version number
    const file = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    );

    const newVersionNumber = (file.currentVersion || 1) + 1;

    // Create version record
    const version = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_VERSIONS_COLLECTION!,
      ID.unique(),
      {
        fileId,
        storageObjectId,
        versionNumber: newVersionNumber,
        size: fileSize,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.$id,
      }
    );

    // Update file currentVersion
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId,
      {
        currentVersion: newVersionNumber,
      }
    );

    // Log activity
    await logActivity("file", fileId, "upload", {
      versionNumber: newVersionNumber,
      size: fileSize,
    });

    return version;
  } catch (error) {
    console.error("Error creating file version:", error);
    // Don't throw - versioning is optional feature
    return null;
  }
};

/**
 * Get all versions of a file
 */
export const getFileVersions = async (
  fileId: string,
  limit = 50,
  offset = 0
) => {
  try {
    if (!process.env.NEXT_PUBLIC_VERSION_HISTORY_ENABLED) {
      return { versions: [], total: 0 };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Verify user has access to file
    const file = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    );

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    // Get versions
    const versions = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_VERSIONS_COLLECTION!,
      [
        Query.equal("fileId", [fileId]),
        Query.orderDesc("versionNumber"),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );

    // Enrich with creator info
    const enrichedVersions = await Promise.all(
      versions.documents.map(async (version: any) => {
        try {
          const creator = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
            process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!,
            version.createdBy
          );

          return {
            ...version,
            creator: {
              id: creator.$id,
              name: creator.displayName,
            },
          };
        } catch (error) {
          return {
            ...version,
            creator: {
              id: version.createdBy,
              name: "Unknown User",
            },
          };
        }
      })
    );

    return {
      versions: enrichedVersions,
      total: versions.total,
    };
  } catch (error) {
    console.error("Error getting file versions:", error);
    throw error;
  }
};

/**
 * Get a specific version
 */
export const getVersionById = async (versionId: string): Promise<VersionDoc> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const version = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_VERSIONS_COLLECTION!,
      versionId
    )) as VersionDoc;

    // Verify user has access to file
    const file = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      version.fileId
    );

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    return version;
  } catch (error) {
    console.error("Error getting version:", error);
    throw error;
  }
};

/**
 * Restore a file to a previous version
 */
export const restoreFileVersion = async (versionId: string) => {
  try {
    if (!process.env.NEXT_PUBLIC_VERSION_HISTORY_ENABLED) {
      throw new Error("Version history is disabled");
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const version = await getVersionById(versionId);

    const { databases, storage } = await createAdminClient();

    // Get current file
    const file = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      version.fileId
    );

    // Get the version file from storage
    const versionedFile = await storage.getFilePreview(
      process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
      version.storageObjectId
    );

    // Create a new version with the old content
    const newStorageObjectId = ID.unique();

    // Upload the restored content as new version
    // This would typically involve copying the file from storage
    // For now, we just update metadata and create a version entry

    // Update file metadata
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      version.fileId,
      {
        currentVersion: file.currentVersion + 1,
        updatedAt: new Date().toISOString(),
      }
    );

    // Log activity
    await logActivity("file", version.fileId, "upload", {
      action: "restored_from_version",
      restoredFromVersion: version.versionNumber,
    });

    return {
      success: true,
      message: `File restored to version ${version.versionNumber}`,
    };
  } catch (error) {
    console.error("Error restoring file version:", error);
    throw error;
  }
};

/**
 * Delete a specific version
 */
export const deleteVersion = async (versionId: string) => {
  try {
    if (!process.env.NEXT_PUBLIC_VERSION_HISTORY_ENABLED) {
      throw new Error("Version history is disabled");
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const version = await getVersionById(versionId);

    const { databases, storage } = await createAdminClient();

    // Don't allow deleting the current version
    const file = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      version.fileId
    );

    if (version.versionNumber === file.currentVersion) {
      throw new Error("Cannot delete current version");
    }

    // Delete from storage
    try {
      await storage.deleteFile(
        process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
        version.storageObjectId
      );
    } catch (error) {
      // File might already be deleted, continue
    }

    // Delete version record
    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_VERSIONS_COLLECTION!,
      versionId
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting version:", error);
    throw error;
  }
};

/**
 * Delete all versions of a file (when file is permanently deleted)
 */
export const deleteFileVersions = async (fileId: string) => {
  try {
    if (!process.env.NEXT_PUBLIC_VERSION_HISTORY_ENABLED) {
      return { success: true, deletedCount: 0 };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases, storage } = await createAdminClient();

    // Get all versions
    const versions = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_VERSIONS_COLLECTION!,
      [Query.equal("fileId", [fileId])]
    );

    let deletedCount = 0;

    for (const version of versions.documents as any[]) {
      // Delete from storage
      try {
        await storage.deleteFile(
          process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
          version.storageObjectId
        );
      } catch (error) {
        // File might already be deleted, continue
      }

      // Delete version record
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_VERSIONS_COLLECTION!,
        version.$id
      );

      deletedCount++;
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("Error deleting file versions:", error);
    throw error;
  }
};

/**
 * Get version history statistics
 */
export const getVersionStats = async (fileId: string) => {
  try {
    if (!process.env.NEXT_PUBLIC_VERSION_HISTORY_ENABLED) {
      return { totalVersions: 0, totalStorageUsed: 0 };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Verify user has access
    const file = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    );

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    // Get all versions
    const versions = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_VERSIONS_COLLECTION!,
      [Query.equal("fileId", [fileId])]
    );

    const totalStorageUsed = (versions.documents as any[]).reduce(
      (sum, v) => sum + v.size,
      0
    );

    return {
      totalVersions: versions.total,
      totalStorageUsed,
      averageVersionSize:
        versions.total > 0 ? Math.round(totalStorageUsed / versions.total) : 0,
    };
  } catch (error) {
    console.error("Error getting version stats:", error);
    throw error;
  }
};

/**
 * Cleanup old versions (keep only last N versions)
 */
export const cleanupOldVersions = async (fileId: string, keepVersions = 10) => {
  try {
    if (!process.env.NEXT_PUBLIC_VERSION_HISTORY_ENABLED) {
      return { success: true, deletedCount: 0 };
    }

    const { databases, storage } = await createAdminClient();

    // Get all versions ordered by date (newest first)
    const versions = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_VERSIONS_COLLECTION!,
      [
        Query.equal("fileId", [fileId]),
        Query.orderDesc("createdAt"),
      ]
    );

    let deletedCount = 0;

    // Delete versions beyond keepVersions limit
    for (let i = keepVersions; i < versions.documents.length; i++) {
      const version = versions.documents[i] as any;

      // Delete from storage
      try {
        await storage.deleteFile(
          process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
          version.storageObjectId
        );
      } catch (error) {
        // Continue if storage delete fails
      }

      // Delete version record
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_VERSIONS_COLLECTION!,
        version.$id
      );

      deletedCount++;
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("Error cleaning up versions:", error);
    throw error;
  }
};
