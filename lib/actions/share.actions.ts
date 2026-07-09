"use server";

import { ID, Query, Models } from "node-appwrite";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { CreateShareSchema, VerifySharePasswordSchema } from "@/lib/validators";

interface ShareDoc extends Models.Document {
  token?: string;
  fileId?: string;
  folderId?: string;
  type: "public" | "private" | "password";
  permission: "view" | "comment" | "edit";
  passwordHash?: string;
  expiresAt?: string;
  downloadLimit?: number;
  downloadCount: number;
  createdBy: string;
  createdAt?: string;
}

interface FileDoc extends Models.Document {
  ownerId: string;
  name: string;
}

/**
 * Generate a unique share token
 */
const generateShareToken = (): string => {
  return crypto.randomBytes(16).toString("hex");
};

/**
 * Hash a password for storage (using Argon2-like approach, but falling back to bcrypt-compatible hash)
 */
const hashPassword = (password: string): string => {
  // For now, use a simple approach with crypto
  // In production, use argon2 or bcrypt
  return crypto
    .pbkdf2Sync(password, process.env.NEXT_PUBLIC_APPWRITE_PROJECT!, 100000, 64, "sha512")
    .toString("hex");
};

/**
 * Verify password hash
 */
const verifyPasswordHash = (password: string, hash: string): boolean => {
  const computed = crypto
    .pbkdf2Sync(password, process.env.NEXT_PUBLIC_APPWRITE_PROJECT!, 100000, 64, "sha512")
    .toString("hex");
  return computed === hash;
};

/**
 * Create a new share link
 */
export const createShare = async (params: {
  fileId?: string;
  folderId?: string;
  type: "public" | "private" | "password";
  permission: "view" | "comment" | "edit";
  password?: string;
  expiresAt?: Date;
  downloadLimit?: number;
}) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const validated = CreateShareSchema.parse(params);

    if (!validated.fileId && !validated.folderId) {
      throw new Error("Either fileId or folderId must be provided");
    }

    const { databases } = await createAdminClient();

    // Verify ownership
    if (validated.fileId) {
      const file = (await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        validated.fileId
      )) as FileDoc;

      if (file.ownerId !== currentUser.$id) {
        throw new Error("Unauthorized to share this file");
      }
    }

    if (validated.folderId) {
      const folder = (await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
        validated.folderId
      )) as any;

      if (folder.ownerId !== currentUser.$id) {
        throw new Error("Unauthorized to share this folder");
      }
    }

    const token = generateShareToken();
    let passwordHash: string | undefined;

    if (validated.type === "password" && validated.password) {
      passwordHash = hashPassword(validated.password);
    }

    const share = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      ID.unique(),
      {
        token,
        fileId: validated.fileId || null,
        folderId: validated.folderId || null,
        type: validated.type,
        permission: validated.permission,
        passwordHash: passwordHash || null,
        expiresAt: validated.expiresAt?.toISOString() || null,
        downloadLimit: validated.downloadLimit || null,
        downloadCount: 0,
        createdBy: currentUser.$id,
        createdAt: new Date().toISOString(),
      }
    );

    revalidatePath("/");
    return {
      success: true,
      share: {
        shareId: share.$id,
        token,
        url: `/s/${token}`,
        expiresAt: validated.expiresAt,
      },
    };
  } catch (error) {
    console.error("Error creating share:", error);
    throw error;
  }
};

/**
 * Get share by token (public endpoint-safe)
 */
export const getShareByToken = async (token: string) => {
  try {
    const { databases } = await createAdminClient();

    const shares = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      [Query.equal("token", [token]), Query.limit(1)]
    );

    if (shares.documents.length === 0) {
      return null;
    }

    const share = shares.documents[0] as ShareDoc;

    // Check expiration
    if (share.expiresAt) {
      const expiresAt = new Date(share.expiresAt);
      if (new Date() > expiresAt) {
        return null;
      }
    }

    // Check download limit
    if (
      share.downloadLimit &&
      share.downloadCount >= share.downloadLimit
    ) {
      return null;
    }

    // If password protected, don't return file details yet
    if (share.type === "password") {
      return {
        shareId: share.$id,
        token,
        type: share.type,
        permission: share.permission,
        requiresPassword: true,
      };
    }

    // Get the file/folder details
    let resource = null;
    if (share.fileId) {
      resource = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        share.fileId
      );
    } else if (share.folderId) {
      resource = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
        share.folderId
      );
    }

    return {
      shareId: share.$id,
      token,
      type: share.type,
      permission: share.permission,
      resource,
      expiresAt: share.expiresAt,
    };
  } catch (error) {
    console.error("Error getting share:", error);
    return null;
  }
};

/**
 * Verify share password
 */
export const verifySharePassword = async (
  token: string,
  password: string
) => {
  try {
    const validated = VerifySharePasswordSchema.parse({ token, password });

    const { databases } = await createAdminClient();

    const shares = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      [Query.equal("token", [validated.token]), Query.limit(1)]
    );

    if (shares.documents.length === 0) {
      return { success: false, error: "Share not found" };
    }

    const share = shares.documents[0] as ShareDoc;

    // Check expiration
    if (share.expiresAt) {
      const expiresAt = new Date(share.expiresAt);
      if (new Date() > expiresAt) {
        return { success: false, error: "Share expired" };
      }
    }

    if (!share.passwordHash) {
      return { success: false, error: "Password not required" };
    }

    if (!verifyPasswordHash(validated.password, share.passwordHash)) {
      return { success: false, error: "Invalid password" };
    }

    // Get the file/folder details
    let resource = null;
    if (share.fileId) {
      resource = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        share.fileId
      );
    } else if (share.folderId) {
      resource = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
        share.folderId
      );
    }

    return {
      success: true,
      resource,
      permission: share.permission,
    };
  } catch (error) {
    console.error("Error verifying password:", error);
    return { success: false, error: "Verification failed" };
  }
};

/**
 * Get all shares created by current user
 */
export const getUserShares = async () => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const shares = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      [
        Query.equal("createdBy", [currentUser.$id]),
        Query.orderDesc("createdAt"),
      ]
    );

    return shares.documents;
  } catch (error) {
    console.error("Error getting user shares:", error);
    throw error;
  }
};

/**
 * Get shares for a specific file
 */
export const getFileShares = async (fileId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Verify file ownership
    const file = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    )) as FileDoc;

    if (file.ownerId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    const shares = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      [
        Query.equal("fileId", [fileId]),
        Query.orderDesc("createdAt"),
      ]
    );

    return shares.documents;
  } catch (error) {
    console.error("Error getting file shares:", error);
    throw error;
  }
};

/**
 * Update share settings
 */
export const updateShare = async (
  shareId: string,
  updates: {
    permission?: "view" | "comment" | "edit";
    downloadLimit?: number;
    expiresAt?: Date | null;
  }
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const share = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      shareId
    )) as ShareDoc;

    if (share.createdBy !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    const updateData: Record<string, any> = {};

    if (updates.permission !== undefined) {
      updateData.permission = updates.permission;
    }

    if (updates.downloadLimit !== undefined) {
      updateData.downloadLimit = updates.downloadLimit;
    }

    if (updates.expiresAt !== undefined) {
      updateData.expiresAt = updates.expiresAt?.toISOString() || null;
    }

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      shareId,
      updateData
    );

    revalidatePath("/");
    return { success: true, share: updated };
  } catch (error) {
    console.error("Error updating share:", error);
    throw error;
  }
};

/**
 * Revoke/delete a share
 */
export const revokeShare = async (shareId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const share = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      shareId
    )) as ShareDoc;

    if (share.createdBy !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      shareId
    );

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error revoking share:", error);
    throw error;
  }
};

/**
 * Increment download count for a share
 */
export const incrementShareDownloadCount = async (shareId: string) => {
  try {
    const { databases } = await createAdminClient();

    const share = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      shareId
    )) as ShareDoc;

    // Check if download limit exceeded
    if (
      share.downloadLimit &&
      share.downloadCount >= share.downloadLimit
    ) {
      throw new Error("Download limit exceeded");
    }

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION!,
      shareId,
      {
        downloadCount: share.downloadCount + 1,
      }
    );

    return { success: true, downloadCount: updated.downloadCount };
  } catch (error) {
    console.error("Error incrementing download count:", error);
    throw error;
  }
};

/**
 * Create a QR code for a share (just generate the data, client-side rendering)
 */
export const generateShareQRData = async (token: string): Promise<string> => {
  try {
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/s/${token}`;
    return shareUrl;
  } catch (error) {
    console.error("Error generating QR data:", error);
    throw error;
  }
};
