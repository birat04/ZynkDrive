"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { notifySecurityEvent } from "@/lib/actions/notification.actions";

interface DeviceDoc {
  userId: string;
  userAgent: string;
  lastIp: string;
  lastActiveAt: string;
  trusted: boolean;
  $id?: string;
}

/**
 * Get or create device record
 * Used for tracking user sessions and security
 */
export const getOrCreateDevice = async (
  userAgent: string,
  ipAddress: string
): Promise<DeviceDoc> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Try to find existing device
    const devices = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.equal("userAgent", [userAgent]),
      ]
    );

    if (devices.documents.length > 0) {
      // Update last active
      const device = devices.documents[0] as DeviceDoc;
      const updated = await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
        device.$id!,
        {
          lastIp: ipAddress,
          lastActiveAt: new Date().toISOString(),
        }
      );
      return updated as DeviceDoc;
    }

    // Create new device
    const newDevice = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
      ID.unique(),
      {
        userId: currentUser.$id,
        userAgent,
        lastIp: ipAddress,
        lastActiveAt: new Date().toISOString(),
        trusted: false,
      }
    );

    // Notify user about new device
    await notifySecurityEvent(currentUser.$id, "new_device", {
      userAgent,
      ipAddress,
      timestamp: new Date().toISOString(),
    });

    return newDevice as DeviceDoc;
  } catch (error) {
    console.error("Error in getOrCreateDevice:", error);
    throw error;
  }
};

/**
 * Get all devices for current user
 */
export const getUserDevices = async () => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const devices = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.orderDesc("lastActiveAt"),
      ]
    );

    return devices.documents;
  } catch (error) {
    console.error("Error getting user devices:", error);
    throw error;
  }
};

/**
 * Get device by ID
 */
export const getDeviceById = async (deviceId: string): Promise<DeviceDoc> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const device = (await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
      deviceId
    )) as DeviceDoc;

    if (device.userId !== currentUser.$id) {
      throw new Error("Unauthorized");
    }

    return device;
  } catch (error) {
    console.error("Error getting device:", error);
    throw error;
  }
};

/**
 * Trust a device (mark as trusted)
 * Trusted devices skip additional security checks
 */
export const trustDevice = async (deviceId: string) => {
  try {
    const device = await getDeviceById(deviceId);

    const { databases } = await createAdminClient();

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
      deviceId,
      {
        trusted: true,
      }
    );

    return updated;
  } catch (error) {
    console.error("Error trusting device:", error);
    throw error;
  }
};

/**
 * Revoke trust from a device
 */
export const revokeDeviceTrust = async (deviceId: string) => {
  try {
    const device = await getDeviceById(deviceId);

    const { databases } = await createAdminClient();

    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
      deviceId,
      {
        trusted: false,
      }
    );

    return updated;
  } catch (error) {
    console.error("Error revoking device trust:", error);
    throw error;
  }
};

/**
 * Delete a device (revoke access)
 * This effectively logs out the device
 */
export const deleteDevice = async (deviceId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const device = await getDeviceById(deviceId);

    const { databases } = await createAdminClient();

    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
      deviceId
    );

    return { success: true, message: "Device removed" };
  } catch (error) {
    console.error("Error deleting device:", error);
    throw error;
  }
};

/**
 * Delete all other devices (logout all other sessions)
 */
export const deleteAllOtherDevices = async (currentDeviceId?: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const devices = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
      [Query.equal("userId", [currentUser.$id])]
    );

    let deletedCount = 0;
    for (const device of devices.documents) {
      // Skip current device if provided
      if (currentDeviceId && device.$id === currentDeviceId) {
        continue;
      }

      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
        device.$id
      );
      deletedCount++;
    }

    return {
      success: true,
      message: `Logged out from ${deletedCount} other device(s)`,
      deletedCount,
    };
  } catch (error) {
    console.error("Error deleting all other devices:", error);
    throw error;
  }
};

/**
 * Get device info for display (user-friendly format)
 */
export const getDeviceInfo = async (deviceId: string) => {
  try {
    const device = await getDeviceById(deviceId);

    const userAgent = device.userAgent || "Unknown Device";
    const lastActive = new Date(device.lastActiveAt);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let lastActiveText = "Just now";
    if (diffMinutes > 0 && diffMinutes < 60) {
      lastActiveText = `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    } else if (diffHours > 0 && diffHours < 24) {
      lastActiveText = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffDays > 0) {
      lastActiveText = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    }

    // Parse user agent to get browser and OS info
    const getBrowserInfo = (ua: string) => {
      // Simplified browser detection
      if (ua.includes("Chrome")) return "Chrome";
      if (ua.includes("Firefox")) return "Firefox";
      if (ua.includes("Safari")) return "Safari";
      if (ua.includes("Edge")) return "Edge";
      return "Unknown Browser";
    };

    const getOSInfo = (ua: string) => {
      if (ua.includes("Windows")) return "Windows";
      if (ua.includes("Mac")) return "macOS";
      if (ua.includes("Linux")) return "Linux";
      if (ua.includes("Android")) return "Android";
      if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
      return "Unknown OS";
    };

    return {
      id: device.$id,
      browser: getBrowserInfo(userAgent),
      os: getOSInfo(userAgent),
      lastIp: device.lastIp,
      lastActive: lastActiveText,
      trusted: device.trusted,
      userAgent,
    };
  } catch (error) {
    console.error("Error getting device info:", error);
    throw error;
  }
};

/**
 * Detect suspicious activity (new device from new location)
 */
export const isSuspiciousActivity = async (
  userAgent: string,
  ipAddress: string
): Promise<boolean> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;

    const { databases } = await createAdminClient();

    // Get all devices
    const devices = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
      [Query.equal("userId", [currentUser.$id])]
    );

    if (devices.documents.length === 0) {
      // First login, not suspicious
      return false;
    }

    // Check if device is known
    const isKnownDevice = devices.documents.some(
      (d: any) => d.userAgent === userAgent
    );

    // Check if IP is known
    const isKnownIp = devices.documents.some((d: any) => d.lastIp === ipAddress);

    // Suspicious if both device and IP are new
    return !isKnownDevice && !isKnownIp;
  } catch (error) {
    console.error("Error checking suspicious activity:", error);
    return false;
  }
};

/**
 * Get recently active devices (for security dashboard)
 */
export const getRecentlyActiveDevices = async (hoursBack = 7 * 24) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

    const allDevices = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION!,
      [
        Query.equal("userId", [currentUser.$id]),
        Query.orderDesc("lastActiveAt"),
      ]
    );

    const recentDevices = allDevices.documents.filter(
      (d: any) => new Date(d.lastActiveAt) > cutoffTime
    );

    return recentDevices;
  } catch (error) {
    console.error("Error getting recently active devices:", error);
    throw error;
  }
};
