"use server";

import { ID, Query, Models } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { CreateFolderSchema } from "@/lib/validators";

interface FolderDoc extends Models.Document {
  name: string;
  ownerId: string;
  parentId?: string;
  path?: string;
  trashed?: boolean;
}

/**
 * Create a new folder
 */
export const createFolder = async (folderName: string, parentId?: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Validate input
    const validated = CreateFolderSchema.parse({
      name: folderName,
      parentId: parentId || null,
    });

    // Get parent folder if parentId provided (for path construction)
    let parentPath = "/";
    if (parentId) {
      const parentFolder = (await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
        parentId
      )) as FolderDoc;

      parentPath = parentFolder.path || "/";
    }

    const newPath = `${parentPath}${validated.name}/`;

    const folder = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
      ID.unique(),
      {
        name: validated.name,
        ownerId: currentUser.$id,
        parentId: parentId || null,
        path: newPath,
        trashed: false,
        createdAt: new Date().toISOString(),
      }
    );

    revalidatePath("/");
    return { success: true, folder };
  } catch (error) {
    console.error("Error creating folder:", error);
    throw error;
  }
};

/**
 * Get folder contents (files and subfolders)
 */
export const getFolderContents = async (folderId?: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const queries = [
      Query.equal("ownerId", [currentUser.$id]),
      Query.equal("trashed", [false]),
    ];

    if (folderId) {
      queries.push(Query.equal("parentId", [folderId]));
    } else {
      // Root level - folders with no parentId
      queries.push(Query.isNull("parentId"));
    }

    const folders = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
      queries
    );

    // Get files in this folder
    const fileQueries = [
      Query.equal("ownerId", [currentUser.$id]),
      Query.equal("trashed", [false]),
    ];

    if (folderId) {
      fileQueries.push(Query.equal("folderId", [folderId]));
    } else {
      fileQueries.push(Query.isNull("folderId"));
    }

    const files = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileQueries
    );

    return {
      folders: folders.documents,
      files: files.documents,
    };
  } catch (error) {
    console.error("Error getting folder contents:", error);
    throw error;
  }
};

/**
 * Get folder path (breadcrumb navigation)
 */
export const getFolderPath = async (folderId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();
    const path: FolderDoc[] = [];

    let currentId: string | undefined = folderId;

    while (currentId) {
      const folder = (await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
        currentId
      )) as FolderDoc;

      if (folder.ownerId !== currentUser.$id) {
        throw new Error("Unauthorized");
      }

      path.unshift(folder);
      currentId = folder.parentId;
    }

    return path;
  } catch (error) {
    console.error("Error getting folder path:", error);
    throw error;
  }
};

/**
 * Rename folder
 */
export const renameFolder = async (folderId: string, newName: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const folder = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
      folderId
    )) as FolderDoc;

    if (folder.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    // Update path if it's the root level folder
    let newPath = folder.path;
    if (!folder.parentId) {
      newPath = `/${newName}/`;
    }

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
      folderId,
      {
        name: newName,
        path: newPath,
      }
    );

    revalidatePath("/");
    return { success: true, folder: updated };
  } catch (error) {
    console.error("Error renaming folder:", error);
    throw error;
  }
};

/**
 * Delete folder (soft delete)
 */
export const deleteFolder = async (folderId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const folder = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
      folderId
    )) as FolderDoc;

    if (folder.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    // Soft delete the folder
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
      folderId,
      {
        trashed: true,
      }
    );

    // Soft delete all files in this folder (recursive)
    const files = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [Query.equal("folderId", [folderId])]
    );

    for (const file of files.documents) {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        file.$id,
        {
          trashed: true,
          trashedAt: new Date().toISOString(),
        }
      );
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting folder:", error);
    throw error;
  }
};

/**
 * Move folder to another location
 */
export const moveFolder = async (
  folderId: string,
  targetParentId?: string
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const folder = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
      folderId
    )) as FolderDoc;

    if (folder.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    let newPath = folder.path;
    if (targetParentId) {
      const targetFolder = (await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
        targetParentId
      )) as FolderDoc;

      newPath = `${targetFolder.path}${folder.name}/`;
    }

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
      folderId,
      {
        parentId: targetParentId || null,
        path: newPath,
      }
    );

    revalidatePath("/");
    return { success: true, folder: updated };
  } catch (error) {
    console.error("Error moving folder:", error);
    throw error;
  }
};
