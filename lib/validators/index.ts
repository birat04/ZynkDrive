import { z } from "zod";

// ============= USER SCHEMA =============
export const UserSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email(),
  displayName: z.string().min(2).max(100),
  avatarUrl: z.string().url().nullable().optional(),
  publicKey: z.string().optional(),
  encryptedPrivateKey: z.string().optional(),
  plan: z.enum(["free", "pro", "team"]).default("free"),
  storageUsed: z.number().default(0),
  storageLimit: z.number().default(5 * 1024 * 1024 * 1024), // 5GB default
  mfaEnabled: z.boolean().default(false),
  twoFactorSecret: z.string().optional(),
  emailVerified: z.boolean().default(false),
  createdAt: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

// ============= FILE SCHEMA =============
export const FileSchema = z.object({
  fileId: z.string(),
  ownerId: z.string(),
  folderId: z.string().nullable().optional(),
  name: z.string().min(1).max(255),
  encryptedName: z.string().optional(),
  mimeType: z.string(),
  size: z.number().int().positive(),
  encryptionMeta: z.object({
    iv: z.string().optional(),
    algorithm: z.string().optional(),
    wrappedDEK: z.string().optional(),
  }).optional(),
  currentVersion: z.number().default(1),
  trashed: z.boolean().default(false),
  trashedAt: z.date().nullable().optional(),
  starred: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  downloadCount: z.number().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type File = z.infer<typeof FileSchema>;

// ============= FOLDER SCHEMA =============
export const FolderSchema = z.object({
  folderId: z.string(),
  ownerId: z.string(),
  parentId: z.string().nullable().optional(),
  name: z.string().min(1).max(255),
  path: z.string().optional(), // materialized path e.g., "/root/projects/"
  trashed: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Folder = z.infer<typeof FolderSchema>;

// ============= VERSION SCHEMA =============
export const VersionSchema = z.object({
  versionId: z.string(),
  fileId: z.string(),
  storageObjectId: z.string(),
  versionNumber: z.number().int().positive(),
  size: z.number().int().positive(),
  createdAt: z.date().optional(),
  createdBy: z.string(),
});

export type Version = z.infer<typeof VersionSchema>;

// ============= SHARE SCHEMA =============
export const ShareSchema = z.object({
  shareId: z.string(),
  fileId: z.string().optional(),
  folderId: z.string().optional(),
  token: z.string().unique().optional(),
  type: z.enum(["public", "private", "password"]),
  permission: z.enum(["view", "comment", "edit"]),
  passwordHash: z.string().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
  downloadLimit: z.number().int().nullable().optional(),
  downloadCount: z.number().int().default(0),
  wrappedKey: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date().optional(),
});

export type Share = z.infer<typeof ShareSchema>;

// ============= ACTIVITY SCHEMA =============
export const ActivitySchema = z.object({
  activityId: z.string(),
  userId: z.string(),
  resourceType: z.enum(["file", "folder", "share", "comment"]),
  resourceId: z.string(),
  action: z.enum(["upload", "download", "rename", "delete", "restore", "share", "comment", "view"]),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date().optional(),
});

export type Activity = z.infer<typeof ActivitySchema>;

// ============= NOTIFICATION SCHEMA =============
export const NotificationSchema = z.object({
  notificationId: z.string(),
  userId: z.string(),
  type: z.enum(["share", "comment", "mention", "quota", "security"]),
  read: z.boolean().default(false),
  payload: z.record(z.any()),
  createdAt: z.date().optional(),
});

export type Notification = z.infer<typeof NotificationSchema>;

// ============= COMMENT SCHEMA =============
export const CommentSchema = z.object({
  commentId: z.string(),
  fileId: z.string(),
  authorId: z.string(),
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
});

export type Comment = z.infer<typeof CommentSchema>;

// ============= DEVICE SCHEMA =============
export const DeviceSchema = z.object({
  deviceId: z.string(),
  userId: z.string(),
  userAgent: z.string(),
  lastIp: z.string().ip().optional(),
  lastActiveAt: z.date().optional(),
  trusted: z.boolean().default(false),
});

export type Device = z.infer<typeof DeviceSchema>;

// ============= REQUEST/RESPONSE SCHEMAS =============
export const UploadInitSchema = z.object({
  name: z.string(),
  size: z.number().positive(),
  mimeType: z.string(),
  folderId: z.string().nullable().optional(),
});

export const RenameFileSchema = z.object({
  fileId: z.string(),
  name: z.string().min(1).max(255),
});

export const CreateFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().nullable().optional(),
});

export const DeleteFileSchema = z.object({
  fileId: z.string(),
});

export const RestoreFileSchema = z.object({
  fileId: z.string(),
});

export const CreateShareSchema = z.object({
  fileId: z.string().optional(),
  folderId: z.string().optional(),
  type: z.enum(["public", "private", "password"]),
  permission: z.enum(["view", "comment", "edit"]),
  password: z.string().min(8).optional(),
  expiresAt: z.date().nullable().optional(),
  downloadLimit: z.number().int().nullable().optional(),
});

export const VerifySharePasswordSchema = z.object({
  token: z.string(),
  password: z.string(),
});

export const MoveFileSchema = z.object({
  fileId: z.string(),
  targetFolderId: z.string().nullable().optional(),
});

export const CreateCommentSchema = z.object({
  fileId: z.string(),
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional(),
});

// ============= STORAGE PLANS =============
export const StoragePlanSchema = z.object({
  name: z.enum(["free", "pro", "team"]),
  storageLimit: z.number().int().positive(),
  monthlyPrice: z.number().nonnegative(),
  features: z.array(z.string()),
});

export type StoragePlan = z.infer<typeof StoragePlanSchema>;

export const STORAGE_PLANS: Record<string, StoragePlan> = {
  free: {
    name: "free",
    storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
    monthlyPrice: 0,
    features: ["Basic file sharing", "30-day trash", "File preview"],
  },
  pro: {
    name: "pro",
    storageLimit: 2 * 1024 * 1024 * 1024 * 1024, // 2TB
    monthlyPrice: 9.99,
    features: ["All Free features", "Version history", "Priority support", "Advanced sharing"],
  },
  team: {
    name: "team",
    storageLimit: 5 * 1024 * 1024 * 1024 * 1024, // 5TB
    monthlyPrice: 24.99,
    features: ["All Pro features", "Team collaboration", "Admin controls", "Audit logs"],
  },
};
