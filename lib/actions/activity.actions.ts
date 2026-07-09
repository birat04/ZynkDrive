"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";

interface ActivityDoc {
  userId: string;
  resourceType: "file" | "folder" | "share" | "comment";
  resourceId: string;
  action: "upload" | "download" | "rename" | "delete" | "restore" | "share" | "comment" | "view" | "copy" | "move";
  metadata?: Record<string, any>;
  createdAt: string;
}

/**
 * Log an activity
 */
export const logActivity = async (
  resourceType: ActivityDoc["resourceType"],
  resourceId: string,
  action: ActivityDoc["action"],
  metadata?: Record<string, any>
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return; // Silent fail for unauthenticated

    const { databases } = await createAdminClient();

    await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      ID.unique(),
      {
        userId: currentUser.$id,
        resourceType,
        resourceId,
        action,
        metadata: metadata || {},
        createdAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw - activities are secondary to main operations
  }
};

/**
 * Get user's activity feed
 */
export const getUserActivityFeed = async (limit = 50, offset = 0) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const activities = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.orderDesc("createdAt"),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );

    return {
      activities: activities.documents,
      total: activities.total,
    };
  } catch (error) {
    console.error("Error getting activity feed:", error);
    throw error;
  }
};

/**
 * Get activities for a specific resource
 */
export const getResourceActivities = async (
  resourceType: string,
  resourceId: string,
  limit = 50
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const activities = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      [
        Query.equal("resourceType", [resourceType]),
        Query.equal("resourceId", [resourceId]),
        Query.orderDesc("createdAt"),
        Query.limit(limit),
      ]
    );

    return activities.documents;
  } catch (error) {
    console.error("Error getting resource activities:", error);
    throw error;
  }
};

/**
 * Get recent activity of a specific type
 */
export const getRecentActivityByType = async (
  action: string,
  limit = 20,
  daysBack = 7
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const activities = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.equal("action", [action]),
        Query.greaterThan("createdAt", cutoffDate.toISOString()),
        Query.orderDesc("createdAt"),
        Query.limit(limit),
      ]
    );

    return activities.documents;
  } catch (error) {
    console.error("Error getting recent activities:", error);
    throw error;
  }
};

/**
 * Get activity statistics for dashboard
 */
export const getActivityStatistics = async (daysBack = 7) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const activities = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.greaterThan("createdAt", cutoffDate.toISOString()),
        Query.limit(10000), // Get all for the period
      ]
    );

    // Calculate statistics
    const stats = {
      uploads: 0,
      downloads: 0,
      shares: 0,
      deletions: 0,
      renames: 0,
      restorations: 0,
    };

    for (const activity of activities.documents) {
      const action = (activity as any).action;
      switch (action) {
        case "upload":
          stats.uploads++;
          break;
        case "download":
          stats.downloads++;
          break;
        case "share":
          stats.shares++;
          break;
        case "delete":
          stats.deletions++;
          break;
        case "rename":
          stats.renames++;
          break;
        case "restore":
          stats.restorations++;
          break;
      }
    }

    return {
      stats,
      totalActivities: activities.total,
      period: {
        from: cutoffDate.toISOString(),
        to: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error getting activity statistics:", error);
    throw error;
  }
};

/**
 * Get files most recently accessed by user
 */
export const getRecentlyAccessedFiles = async (limit = 10) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const activities = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.equal("resourceType", ["file"]),
        Query.orderDesc("createdAt"),
        Query.limit(limit * 2), // Get more to handle deduplication
      ]
    );

    // Deduplicate by resourceId
    const uniqueFileIds = new Set<string>();
    const recentFiles = [];

    for (const activity of activities.documents) {
      const fileId = (activity as any).resourceId;
      if (!uniqueFileIds.has(fileId)) {
        uniqueFileIds.add(fileId);
        recentFiles.push(activity);
        if (recentFiles.length >= limit) break;
      }
    }

    return recentFiles;
  } catch (error) {
    console.error("Error getting recently accessed files:", error);
    throw error;
  }
};

/**
 * Clear activity history for a resource
 */
export const clearResourceActivityHistory = async (
  resourceType: string,
  resourceId: string
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const activities = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.equal("resourceType", [resourceType]),
        Query.equal("resourceId", [resourceId]),
      ]
    );

    for (const activity of activities.documents) {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION!,
        activity.$id
      );
    }

    return { success: true, deletedCount: activities.total };
  } catch (error) {
    console.error("Error clearing activity history:", error);
    throw error;
  }
};
