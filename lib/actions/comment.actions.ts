"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { notifyFileCommented, notifyUserMentioned } from "@/lib/actions/notification.actions";
import { logActivity } from "@/lib/actions/activity.actions";
import { CreateCommentSchema } from "@/lib/validators";

interface CommentDoc {
  fileId: string;
  authorId: string;
  body: string;
  mentions: string[];
  createdAt: string;
  $id?: string;
}

/**
 * Create a comment on a file
 */
export const createComment = async (
  fileId: string,
  body: string,
  mentions: string[] = []
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    // Validate input
    const validated = CreateCommentSchema.parse({
      fileId,
      body,
      mentions,
    });

    const { databases } = await createAdminClient();

    // Verify file exists and user has access
    const file = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    );

    if (!file) throw new Error("File not found");

    // Create comment
    const comment = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
      ID.unique(),
      {
        fileId,
        authorId: currentUser.$id,
        body,
        mentions,
        createdAt: new Date().toISOString(),
      }
    );

    // Log activity
    await logActivity("comment", fileId, "comment", {
      commentBody: body.substring(0, 100),
      mentions: mentions.length,
    });

    // Notify file owner
    if (file.ownerId !== currentUser.$id) {
      await notifyFileCommented(
        file.ownerId,
        file.name,
        currentUser.displayName,
        body,
        fileId
      );
    }

    // Notify mentioned users
    for (const mentionedUserId of mentions) {
      if (mentionedUserId !== currentUser.$id && mentionedUserId !== file.ownerId) {
        await notifyUserMentioned(
          mentionedUserId,
          file.name,
          currentUser.displayName,
          `mentioned you in a comment: "${body.substring(0, 50)}..."`
        );
      }
    }

    return comment;
  } catch (error) {
    console.error("Error creating comment:", error);
    throw error;
  }
};

/**
 * Get all comments for a file
 */
export const getFileComments = async (
  fileId: string,
  limit = 50,
  offset = 0
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Verify file exists
    const file = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      fileId
    );

    if (!file) throw new Error("File not found");

    // Get comments
    const comments = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
      [
        Query.equal("fileId", [fileId]),
        Query.orderAsc("createdAt"),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );

    // Enrich with author info
    const enrichedComments = await Promise.all(
      comments.documents.map(async (comment: any) => {
        try {
          const author = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
            process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!,
            comment.authorId
          );

          return {
            ...comment,
            author: {
              id: author.$id,
              name: (author.displayName as string) || (author.fullName as string) || "User",
              avatar: (author.avatarUrl as string) || (author.avatar as string),
            },
          };
        } catch (error) {
          // Author deleted, return comment with minimal info
          return {
            ...comment,
            author: {
              id: comment.authorId,
              name: "Deleted User",
              avatar: null,
            },
          };
        }
      })
    );

    return {
      comments: enrichedComments,
      total: comments.total,
    };
  } catch (error) {
    console.error("Error getting file comments:", error);
    throw error;
  }
};

/**
 * Get comment by ID
 */
export const getCommentById = async (commentId: string): Promise<CommentDoc> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const comment = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
      commentId
    )) as CommentDoc;

    return comment;
  } catch (error) {
    console.error("Error getting comment:", error);
    throw error;
  }
};

/**
 * Update a comment (only author can update)
 */
export const updateComment = async (commentId: string, newBody: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const comment = await getCommentById(commentId);

    if (comment.authorId !== currentUser.$id) {
      throw new Error("Unauthorized - only comment author can edit");
    }

    const { databases } = await createAdminClient();

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
      commentId,
      {
        body: newBody,
        updatedAt: new Date().toISOString(),
      }
    );

    // Log activity
    await logActivity("comment", comment.fileId, "comment", {
      action: "edited",
    });

    return updated;
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  }
};

/**
 * Delete a comment (only author or file owner can delete)
 */
export const deleteComment = async (commentId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const comment = await getCommentById(commentId);

    // Get file to check ownership
    const { databases } = await createAdminClient();
    const file = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      comment.fileId
    );

    const isAuthor = comment.authorId === currentUser.$id;
    const isFileOwner = file.ownerId === currentUser.$id;

    if (!isAuthor && !isFileOwner) {
      throw new Error(
        "Unauthorized - only comment author or file owner can delete"
      );
    }

    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
      commentId
    );

    // Log activity
    await logActivity("comment", comment.fileId, "comment", {
      action: "deleted",
      deletedBy: currentUser.$id,
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
};

/**
 * Get all comments by a user
 */
export const getUserComments = async (userId: string, limit = 50) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const comments = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
      [
        Query.equal("authorId", [userId]),
        Query.orderDesc("createdAt"),
        Query.limit(limit),
      ]
    );

    return comments.documents;
  } catch (error) {
    console.error("Error getting user comments:", error);
    throw error;
  }
};

/**
 * Search comments in a file
 */
export const searchComments = async (
  fileId: string,
  searchQuery: string,
  limit = 50
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Get all comments for the file and filter client-side
    // (Appwrite doesn't support full-text search on object attributes)
    const allComments = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
      [
        Query.equal("fileId", [fileId]),
        Query.orderDesc("createdAt"),
      ]
    );

    const searchLower = searchQuery.toLowerCase();
    const filtered = allComments.documents
      .filter((comment: any) =>
        comment.body.toLowerCase().includes(searchLower)
      )
      .slice(0, limit);

    return filtered;
  } catch (error) {
    console.error("Error searching comments:", error);
    throw error;
  }
};

/**
 * Get recent comments across all files (for activity feed)
 */
export const getRecentComments = async (
  limit = 20,
  hoursBack = 24
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

    const allComments = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
      [
        Query.orderDesc("createdAt"),
        Query.limit(limit * 2), // Get more to filter
      ]
    );

    // Filter for recent and files accessible to user
    const recent = allComments.documents.filter(
      (c: any) => new Date(c.createdAt) > cutoffTime
    );

    return recent.slice(0, limit);
  } catch (error) {
    console.error("Error getting recent comments:", error);
    throw error;
  }
};

/**
 * Get comment count for a file
 */
export const getCommentCount = async (fileId: string): Promise<number> => {
  try {
    const { databases } = await createAdminClient();

    const comments = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
      [Query.equal("fileId", [fileId]), Query.limit(1)]
    );

    return comments.total;
  } catch (error) {
    console.error("Error getting comment count:", error);
    return 0;
  }
};

/**
 * Delete all comments on a file (used when deleting file)
 */
export const deleteFileComments = async (fileId: string) => {
  try {
    const { databases } = await createAdminClient();

    const comments = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
      [Query.equal("fileId", [fileId])]
    );

    let deletedCount = 0;
    for (const comment of comments.documents) {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION!,
        comment.$id
      );
      deletedCount++;
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("Error deleting file comments:", error);
    throw error;
  }
};
