"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";

interface NotificationDoc {
  userId: string;
  type: "share" | "comment" | "mention" | "quota" | "security";
  read: boolean;
  payload: Record<string, any>;
  createdAt: string;
}

/**
 * Create a notification
 */
export const createNotification = async (
  userId: string,
  type: NotificationDoc["type"],
  payload: Record<string, any>
) => {
  try {
    const { databases } = await createAdminClient();

    const notification = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
      ID.unique(),
      {
        userId,
        type,
        read: false,
        payload,
        createdAt: new Date().toISOString(),
      }
    );

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw - notifications are non-critical
  }
};

/**
 * Get user's notifications
 */
export const getUserNotifications = async (
  unreadOnly = false,
  limit = 20,
  offset = 0
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const queries = [Query.equal("userId", [currentUser.$id])];

    if (unreadOnly) {
      queries.push(Query.equal("read", [false]));
    }

    queries.push(Query.orderDesc("createdAt"));
    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));

    const notifications = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
      queries
    );

    return {
      notifications: notifications.documents,
      total: notifications.total,
      unreadCount: unreadOnly
        ? notifications.total
        : await getUnreadNotificationCount(),
    };
  } catch (error) {
    console.error("Error getting notifications:", error);
    throw error;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return 0;

    const { databases } = await createAdminClient();

    const notifications = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.equal("read", [false]),
        Query.limit(1), // Just need count, so limit to 1
      ]
    );

    return notifications.total;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const notification = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
      notificationId
    )) as NotificationDoc;

    if (notification.userId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
      notificationId,
      {
        read: true,
      }
    );

    return updated;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const unreadNotifications = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.equal("read", [false]),
      ]
    );

    let updatedCount = 0;
    for (const notification of unreadNotifications.documents) {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
        notification.$id,
        {
          read: true,
        }
      );
      updatedCount++;
    }

    return { success: true, updatedCount };
  } catch (error) {
    console.error("Error marking all as read:", error);
    throw error;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const notification = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
      notificationId
    )) as NotificationDoc;

    if (notification.userId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
      notificationId
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

/**
 * Delete all notifications
 */
export const deleteAllNotifications = async () => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const notifications = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
      [Query.equal("userId", [currentUser.$id])]
    );

    let deletedCount = 0;
    for (const notification of notifications.documents) {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
        notification.$id
      );
      deletedCount++;
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    throw error;
  }
};

/**
 * Get notifications by type
 */
export const getNotificationsByType = async (
  type: NotificationDoc["type"],
  limit = 20
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const notifications = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.equal("type", [type]),
        Query.orderDesc("createdAt"),
        Query.limit(limit),
      ]
    );

    return notifications.documents;
  } catch (error) {
    console.error("Error getting notifications by type:", error);
    throw error;
  }
};

// ============= HELPER FUNCTIONS FOR CREATING SPECIFIC NOTIFICATION TYPES =============

/**
 * Notify user about a share
 */
export const notifyFileShared = async (
  userId: string,
  fileName: string,
  sharedBy: string,
  permission: string,
  shareToken?: string
) => {
  return createNotification(userId, "share", {
    type: "file_shared",
    fileName,
    sharedBy,
    permission,
    shareToken,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Notify user about a comment
 */
export const notifyFileCommented = async (
  userId: string,
  fileName: string,
  commentedBy: string,
  comment: string,
  fileId: string
) => {
  return createNotification(userId, "comment", {
    type: "file_commented",
    fileName,
    commentedBy,
    comment,
    fileId,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Notify user about a mention
 */
export const notifyUserMentioned = async (
  userId: string,
  fileName: string,
  mentionedBy: string,
  context: string
) => {
  return createNotification(userId, "mention", {
    type: "user_mentioned",
    fileName,
    mentionedBy,
    context,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Notify user about quota warning
 */
export const notifyQuotaWarning = async (
  userId: string,
  usedPercentage: number,
  limitGB: number
) => {
  return createNotification(userId, "quota", {
    type: "quota_warning",
    usedPercentage,
    limitGB,
    message: `You have used ${usedPercentage}% of your ${limitGB}GB storage`,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Notify user about security event
 */
export const notifySecurityEvent = async (
  userId: string,
  eventType: "new_device" | "password_changed" | "2fa_disabled",
  details?: Record<string, any>
) => {
  const messages: Record<string, string> = {
    new_device: "Your account was accessed from a new device",
    password_changed: "Your password was changed",
    2fa_disabled: "Two-factor authentication was disabled",
  };

  return createNotification(userId, "security", {
    type: "security_event",
    eventType,
    message: messages[eventType],
    details,
    timestamp: new Date().toISOString(),
    action_required: eventType !== "password_changed",
  });
};

/**
 * Notify user about storage quota exceeded
 */
export const notifyQuotaExceeded = async (userId: string, limitGB: number) => {
  return createNotification(userId, "quota", {
    type: "quota_exceeded",
    limitGB,
    message: `Your storage is full. Upgrade your plan to continue storing files`,
    action_url: "/settings/billing",
    timestamp: new Date().toISOString(),
  });
};
