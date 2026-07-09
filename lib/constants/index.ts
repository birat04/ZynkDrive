
// ============= FILE OPERATIONS =============
export const TRASH_RETENTION_DAYS = 30;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const DEFAULT_FILE_PREVIEW_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

// ============= SHARING =============
export const DEFAULT_SHARE_EXPIRY_DAYS = 7;
export const SHARE_TOKEN_LENGTH = 32;
export const MAX_SHARE_DOWNLOADS = 100;

// ============= STORAGE PLANS =============
export const FREE_TIER_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB
export const PRO_TIER_STORAGE = 2 * 1024 * 1024 * 1024 * 1024; // 2TB
export const TEAM_TIER_STORAGE = 5 * 1024 * 1024 * 1024 * 1024; // 5TB

export const STORAGE_PLANS = {
  free: {
    name: "Free",
    storage: FREE_TIER_STORAGE,
    price: 0,
    features: [
      "5GB storage",
      "Basic file sharing",
      "30-day trash retention",
      "File preview",
      "Up to 5GB file size",
    ],
  },
  pro: {
    name: "Pro",
    storage: PRO_TIER_STORAGE,
    price: 9.99,
    features: [
      "2TB storage",
      "All Free features",
      "Version history (unlimited)",
      "Advanced sharing (password, expiry)",
      "Priority support",
      "Up to 5GB file size",
    ],
  },
  team: {
    name: "Team",
    storage: TEAM_TIER_STORAGE,
    price: 24.99,
    features: [
      "5TB storage",
      "All Pro features",
      "Team collaboration",
      "Admin controls",
      "Audit logs",
      "Custom permissions",
      "Dedicated support",
    ],
  },
};

// ============= RATE LIMITING =============
export const RATE_LIMITS = {
  upload: { requests: 100, windowMs: 3600000 }, // 100 per hour
  download: { requests: 1000, windowMs: 3600000 }, // 1000 per hour
  share: { requests: 50, windowMs: 3600000 }, // 50 per hour
  login: { requests: 5, windowMs: 900000 }, // 5 attempts per 15 min
  passwordReset: { requests: 3, windowMs: 3600000 }, // 3 per hour
};

// ============= VALIDATION =============
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_FILE_NAME_LENGTH = 1;
export const MAX_FILE_NAME_LENGTH = 255;
export const MIN_FOLDER_NAME_LENGTH = 1;
export const MAX_FOLDER_NAME_LENGTH = 255;

// ============= FILE TYPES =============
export const PREVIEW_SUPPORTED_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",

  // PDF
  "application/pdf",

  // Video
  "video/mp4",
  "video/webm",
  "video/quicktime",

  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",

  // Code
  "text/plain",
  "text/html",
  "application/json",
  "application/xml",
];

export const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "text/markdown",
];

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

export const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac"];

// ============= PAGINATION =============
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_LIMIT = 50;

// ============= SEARCH =============
export const MIN_SEARCH_QUERY_LENGTH = 2;
export const MAX_SEARCH_QUERY_LENGTH = 100;
export const SEARCH_DEBOUNCE_MS = 300;

// ============= 2FA =============
export const TOTP_WINDOW = 1; // Number of 30-second windows to check
export const TOTP_DIGITS = 6;
export const RECOVERY_CODES_COUNT = 10;

// ============= ENCRYPTION =============
export const ENCRYPTION_ALGORITHM = "AES-256-GCM";
export const KEY_DERIVATION_ALGORITHM = "argon2id";
export const KEY_SIZE = 256; // bits

// ============= UI DEFAULTS =============
export const TOAST_DURATION = 3000; // ms
export const MODAL_ANIMATION_DURATION = 300; // ms
export const DEBOUNCE_DELAY = 300; // ms

// ============= ACTIVITY =============
export const ACTIVITY_RETENTION_DAYS = 365; // Keep activity for 1 year
export const AUDIT_LOG_RETENTION_DAYS = 2555; // Keep audit logs for 7 years

// ============= SESSION =============
export const SESSION_EXPIRY_DAYS = 30;
export const SESSION_ABSOLUTE_TIMEOUT_HOURS = 24;

// ============= DATABASE LIMITS =============
export const LARGE_COLLECTION_THRESHOLD = 10000; // Warn if collection exceeds this
export const QUERY_TIMEOUT_MS = 30000; // 30 seconds

// ============= API =============
export const API_TIMEOUT_MS = 30000;
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;

// ============= PERMISSIONS =============
export const PERMISSION_LEVELS = {
  view: 0,
  comment: 1,
  edit: 2,
  owner: 3,
};

export const PERMISSION_LABELS: Record<string, string> = {
  view: "Viewer",
  comment: "Commenter",
  edit: "Editor",
  owner: "Owner",
};

// ============= STATUS CODES =============
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// ============= FEATURE FLAGS =============
export const FEATURES = {
  ENCRYPTION_ENABLED: process.env.NEXT_PUBLIC_ENCRYPTION_ENABLED === "true",
  AI_FEATURES_ENABLED: process.env.NEXT_PUBLIC_AI_FEATURES_ENABLED === "true",
  COLLABORATION_ENABLED: process.env.NEXT_PUBLIC_COLLABORATION_ENABLED === "true",
  VERSION_HISTORY_ENABLED: process.env.NEXT_PUBLIC_VERSION_HISTORY_ENABLED === "true",
  TWO_FACTOR_AUTH_ENABLED: process.env.NEXT_PUBLIC_2FA_ENABLED === "true",
};

// ============= DEFAULT SORTING =============
export const DEFAULT_SORT_BY = "updatedAt";
export const DEFAULT_SORT_ORDER = "desc";

export const SORT_OPTIONS = [
  { label: "Name (A-Z)", value: "name-asc" },
  { label: "Name (Z-A)", value: "name-desc" },
  { label: "Date (Newest)", value: "updatedAt-desc" },
  { label: "Date (Oldest)", value: "updatedAt-asc" },
  { label: "Size (Largest)", value: "size-desc" },
  { label: "Size (Smallest)", value: "size-asc" },
];

// ============= UI PATHS =============
export const PATHS = {
  AUTH: {
    SIGN_IN: "/auth/sign-in",
    SIGN_UP: "/auth/sign-up",
    VERIFY: "/auth/verify",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },
  DASHBOARD: {
    HOME: "/",
    FILES: "/files",
    TRASH: "/trash",
    STARRED: "/starred",
    SHARED: "/shared",
    RECENT: "/recent",
  },
  SETTINGS: {
    PROFILE: "/settings/profile",
    SECURITY: "/settings/security",
    DEVICES: "/settings/devices",
    BILLING: "/settings/billing",
    PRIVACY: "/settings/privacy",
  },
  PUBLIC: {
    SHARE: (token: string) => `/shared/${token}`,
    LANDING: "/",
  },
};

// ============= ERROR MESSAGES =============
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "You are not authorized to perform this action",
  NOT_FOUND: "The requested resource was not found",
  INVALID_EMAIL: "Please enter a valid email address",
  WEAK_PASSWORD: "Password does not meet security requirements",
  FILE_TOO_LARGE: "File size exceeds maximum allowed size",
  QUOTA_EXCEEDED: "Storage quota exceeded",
  INVALID_FILE_TYPE: "File type is not allowed",
  UPLOAD_FAILED: "File upload failed",
  DOWNLOAD_FAILED: "File download failed",
  SHARE_EXPIRED: "This share link has expired",
  INVALID_PASSWORD: "Incorrect password",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later",
  SERVER_ERROR: "Server error. Please try again later",
};

// ============= SUCCESS MESSAGES =============
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: "File uploaded successfully",
  FILE_DELETED: "File deleted successfully",
  FILE_RESTORED: "File restored successfully",
  SHARE_CREATED: "Share link created successfully",
  SHARE_DELETED: "Share link deleted successfully",
  PASSWORD_CHANGED: "Password changed successfully",
  PROFILE_UPDATED: "Profile updated successfully",
};
