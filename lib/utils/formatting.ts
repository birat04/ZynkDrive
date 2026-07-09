/**
 * Enhanced Utility Functions for ZynkDrive
 * Following the blueprint specifications for formatting, validation, and helpers
 */

import { format, formatDistance, formatRelative, subDays } from "date-fns";

/**
 * Format bytes to human readable format with multiple options
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

/**
 * Format storage quota for display
 */
export const formatStorageQuota = (
  used: number,
  total: number
): string => {
  return `${formatBytes(used)} of ${formatBytes(total)}`;
};

/**
 * Calculate storage percentage used
 */
export const calculateStoragePercentage = (used: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
};

/**
 * Format date for UI display
 */
export const formatDate = (date: Date | string, formatStr = "MMM d, yyyy"): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, formatStr);
};

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
export const formatDateRelative = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
};

/**
 * Format date and time together
 */
export const formatDateTime = (date: Date | string, formatStr = "MMM d, yyyy HH:mm"): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, formatStr);
};

/**
 * Check if a date is within N days
 */
export const isRecentDate = (date: Date | string, days = 7): boolean => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const cutoff = subDays(new Date(), days);
  return dateObj > cutoff;
};

/**
 * Get MIME type from file extension
 */
export const getMimeType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    rtf: "application/rtf",
    md: "text/markdown",
    html: "text/html",
    xml: "application/xml",
    json: "application/json",

    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    mpeg: "video/mpeg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    flv: "video/x-flv",
    m4v: "video/x-m4v",
    wmv: "video/x-ms-wmv",
    "3gp": "video/3gpp",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wma: "audio/x-ms-wma",
    aiff: "audio/aiff",
    alac: "audio/alac",

    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
  };

  return mimeTypes[ext] || "application/octet-stream";
};

/**
 * Validate file MIME type
 */
export const isValidMimeType = (fileName: string, allowedTypes: string[]): boolean => {
  const mimeType = getMimeType(fileName);
  return allowedTypes.some(
    (type) => type === mimeType || type.endsWith("*") && mimeType.startsWith(type.replace("*", ""))
  );
};

/**
 * Get file category from extension
 */
export const getFileCategory = (
  fileName: string
): "image" | "video" | "audio" | "document" | "other" => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
  const videoExts = ["mp4", "webm", "mpeg", "mov", "avi", "mkv", "flv", "m4v", "wmv", "3gp"];
  const audioExts = ["mp3", "wav", "ogg", "flac", "m4a", "aac", "wma", "aiff", "alac"];
  const docExts = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "csv",
    "rtf",
    "md",
    "html",
  ];

  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  if (docExts.includes(ext)) return "document";
  return "other";
};

/**
 * Check if file is previewable
 */
export const isPreviewable = (fileName: string): boolean => {
  const category = getFileCategory(fileName);
  return ["image", "video", "audio", "document"].includes(category);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export interface PasswordStrength {
  score: number; // 0-5
  feedback: string;
  isStrong: boolean;
}

export const validatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score++;
  else feedback.push("At least 8 characters");

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password)) score++;
  else feedback.push("Lowercase letters");

  if (/[A-Z]/.test(password)) score++;
  else feedback.push("Uppercase letters");

  if (/\d/.test(password)) score++;
  else feedback.push("Numbers");

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else feedback.push("Special characters");

  return {
    score: Math.min(score, 5),
    feedback: feedback.length > 0 ? `Add: ${feedback.join(", ")}` : "Strong password",
    isStrong: score >= 4,
  };
};

/**
 * Generate a secure random token
 */
export const generateToken = (length = 32): string => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return token;
};

/**
 * Check if URL is valid
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number, suffix = "..."): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + suffix;
};

/**
 * Get file name without extension
 */
export const getFileNameWithoutExt = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) return fileName;
  return fileName.substring(0, lastDotIndex);
};

/**
 * Get file extension
 */
export const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) return "";
  return fileName.substring(lastDotIndex + 1);
};

/**
 * Generate unique file name (add suffix if duplicate)
 */
export const generateUniqueFileName = (
  fileName: string,
  existingNames: string[]
): string => {
  if (!existingNames.includes(fileName)) return fileName;

  const nameWithoutExt = getFileNameWithoutExt(fileName);
  const ext = getFileExtension(fileName);
  let counter = 1;

  while (true) {
    const newName = ext
      ? `${nameWithoutExt} (${counter}).${ext}`
      : `${nameWithoutExt} (${counter})`;

    if (!existingNames.includes(newName)) return newName;
    counter++;
  }
};

/**
 * Check if user has permission to perform action
 */
export const hasPermission = (
  userPermission: "view" | "comment" | "edit",
  requiredPermission: "view" | "comment" | "edit"
): boolean => {
  const permissionHierarchy = { view: 0, comment: 1, edit: 2 };
  return permissionHierarchy[userPermission] >= permissionHierarchy[requiredPermission];
};

/**
 * Format share expiration time
 */
export const formatShareExpiration = (expiresAt: Date | null): string => {
  if (!expiresAt) return "Never expires";
  return `Expires ${formatDateRelative(expiresAt)}`;
};

/**
 * Check if share is expired
 */
export const isShareExpired = (expiresAt: Date | null): boolean => {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
};

/**
 * Format download count
 */
export const formatDownloadCount = (current: number, limit?: number): string => {
  if (!limit) return `${current} downloads`;
  return `${current} of ${limit} downloads`;
};

/**
 * Convert storage limit (in bytes) to human readable with pricing
 */
export const formatStorageWithPrice = (
  bytes: number,
  pricePerGB?: number
): {
  formatted: string;
  estimatedMonthlyPrice: number;
} => {
  const gb = bytes / (1024 * 1024 * 1024);
  const price = pricePerGB ? gb * pricePerGB : 0;

  return {
    formatted: gb >= 1 ? `${gb.toFixed(1)}GB` : formatBytes(bytes),
    estimatedMonthlyPrice: Math.round(price * 100) / 100,
  };
};

/**
 * Get activity action display text
 */
export const getActivityDisplayText = (
  action: string,
  resourceType: string,
  resourceName?: string
): string => {
  const texts: Record<string, Record<string, string>> = {
    upload: {
      file: "uploaded a file",
      folder: "created a folder",
    },
    download: {
      file: "downloaded a file",
    },
    delete: {
      file: "deleted a file",
      folder: "deleted a folder",
    },
    restore: {
      file: "restored a file",
      folder: "restored a folder",
    },
    share: {
      file: "shared a file",
      folder: "shared a folder",
    },
    rename: {
      file: "renamed a file",
      folder: "renamed a folder",
    },
    comment: {
      file: "commented on a file",
    },
    view: {
      file: "viewed a file",
    },
    copy: {
      file: "copied a file",
    },
    move: {
      file: "moved a file",
    },
  };

  const text = texts[action]?.[resourceType] || `${action} ${resourceType}`;
  return resourceName ? `${text}: ${resourceName}` : text;
};

/**
 * Estimate upload time based on file size and connection speed
 */
export const estimateUploadTime = (
  fileSizeBytes: number,
  connectionSpeedKbps = 1000
): {
  seconds: number;
  formatted: string;
} => {
  const fileSizeBits = fileSizeBytes * 8;
  const seconds = fileSizeBits / (connectionSpeedKbps * 1000);

  let formatted = "";
  if (seconds < 60) {
    formatted = `${Math.ceil(seconds)}s`;
  } else if (seconds < 3600) {
    formatted = `${Math.ceil(seconds / 60)}m`;
  } else {
    formatted = `${Math.ceil(seconds / 3600)}h`;
  }

  return { seconds, formatted };
};
