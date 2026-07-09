"use server";

import { Query } from "node-appwrite";
import { cookies } from "next/headers";
import { Models } from "node-appwrite";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { notifySecurityEvent } from "@/lib/actions/notification.actions";
import {
  findUserByAccountId,
  markEmailVerified,
  sendEmailVerification,
  setPending2FASession,
  userRequires2FA,
} from "@/lib/auth/helpers";
import {
  FEATURES,
  MIN_PASSWORD_LENGTH,
  RECOVERY_CODES_COUNT,
  SESSION_ABSOLUTE_TIMEOUT_HOURS,
  TOTP_WINDOW,
} from "@/lib/constants";
import {
  ChangePasswordSchema,
  EnableTOTPSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  ResendVerificationSchema,
  RevokeSessionSchema,
  ValidateRecoveryCodeSchema,
  VerifyEmailSchema,
  VerifyTOTPSchema,
} from "@/lib/validators";
import {
  buildTOTPUri,
  decryptField,
  encryptField,
  generateRecoveryCodes,
  generateSecureToken,
  generateTOTPSecret,
  hashValue,
  verifyHash,
  verifyTOTPCode,
} from "@/lib/utils/crypto";
import { sendPasswordResetEmail } from "@/lib/utils/email";
import { validatePasswordStrength } from "@/lib/utils/formatting";
import { parseStringify } from "@/lib/utils";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_HISTORY_LIMIT = 5;

export { markEmailVerified, sendEmailVerification, setPending2FASession, userRequires2FA };

type UserDoc = Models.Document & {
  email?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  twoFactorSecret?: string;
  recoveryCodeHashes?: string[];
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: string;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: string;
  passwordHash?: string;
  passwordHistory?: string[];
  accountId?: string;
};

const getUsersCollection = () => process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!;

const findUserByEmail = async (email: string): Promise<UserDoc | null> => {
  const { databases } = await createAdminClient();
  const users = await databases.listDocuments(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
    getUsersCollection(),
    [Query.equal("email", [email])]
  );

  return (users.documents[0] as UserDoc | undefined) ?? null;
};

const findUserById = async (userId: string): Promise<UserDoc | null> => {
  const { databases } = await createAdminClient();
  try {
    const user = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      getUsersCollection(),
      userId
    );
    return user as UserDoc;
  } catch {
    return null;
  }
};

const updateUserDocument = async (
  userId: string,
  data: Record<string, unknown>
) => {
  const { databases } = await createAdminClient();
  return databases.updateDocument(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
    getUsersCollection(),
    userId,
    data
  );
};

const getDecryptedTOTPSecret = (user: UserDoc): string | null => {
  if (!user.twoFactorSecret) return null;
  try {
    return decryptField(user.twoFactorSecret);
  } catch {
    return null;
  }
};

const assertPasswordNotReused = (
  newPassword: string,
  passwordHistory: string[] = []
) => {
  const isReused = passwordHistory.some((hash) => verifyHash(newPassword, hash));
  if (isReused) {
    throw new Error("You cannot reuse a recent password");
  }
};

const validateNewPassword = (password: string) => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const strength = validatePasswordStrength(password);
  if (!strength.isStrong) {
    throw new Error(strength.feedback);
  }
};

// ============= EMAIL VERIFICATION =============

export const isEmailVerified = async (userId?: string): Promise<boolean> => {
  const currentUser = userId ? await findUserById(userId) : await getCurrentUser();
  if (!currentUser) return false;
  return currentUser.emailVerified === true;
};

export const requireEmailVerified = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  if (!(await isEmailVerified(currentUser.$id))) {
    throw new Error("Please verify your email before uploading files");
  }

  return currentUser;
};

export const verifyEmail = async (params: { email: string; token: string }) => {
  const validated = VerifyEmailSchema.parse(params);
  const user = await findUserByEmail(validated.email);

  if (!user) throw new Error("Invalid verification link");
  if (user.emailVerified) {
    return parseStringify({ verified: true });
  }

  if (!user.emailVerificationTokenHash || !user.emailVerificationExpiresAt) {
    throw new Error("Verification link has expired");
  }

  if (new Date(user.emailVerificationExpiresAt).getTime() < Date.now()) {
    throw new Error("Verification link has expired");
  }

  if (!verifyHash(validated.token, user.emailVerificationTokenHash)) {
    throw new Error("Invalid verification link");
  }

  await updateUserDocument(user.$id, {
    emailVerified: true,
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,
  });

  return parseStringify({ verified: true });
};

export const resendVerificationEmail = async (params: { email: string }) => {
  const validated = ResendVerificationSchema.parse(params);
  return sendEmailVerification(validated.email);
};

// ============= TWO-FACTOR AUTHENTICATION =============

export const setupTOTP = async () => {
  if (!FEATURES.TWO_FACTOR_AUTH_ENABLED) {
    throw new Error("Two-factor authentication is disabled");
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const email = currentUser.email as string;
  const secret = generateTOTPSecret();

  await updateUserDocument(currentUser.$id, {
    twoFactorSecret: encryptField(secret),
    mfaEnabled: false,
  });

  return parseStringify({
    secret,
    otpauthUrl: buildTOTPUri(email, secret),
  });
};

export const enableTOTP = async (params: { code: string }) => {
  if (!FEATURES.TWO_FACTOR_AUTH_ENABLED) {
    throw new Error("Two-factor authentication is disabled");
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const validated = EnableTOTPSchema.parse(params);
  const user = await findUserById(currentUser.$id);
  if (!user?.twoFactorSecret) throw new Error("Set up authenticator first");

  const secret = getDecryptedTOTPSecret(user);
  if (!secret || !verifyTOTPCode(secret, validated.code, TOTP_WINDOW)) {
    throw new Error("Invalid authenticator code");
  }

  const recoveryCodes = generateRecoveryCodes(RECOVERY_CODES_COUNT);
  const recoveryCodeHashes = recoveryCodes.map((code) => hashValue(code));

  await updateUserDocument(currentUser.$id, {
    mfaEnabled: true,
    recoveryCodeHashes,
  });

  return parseStringify({ enabled: true, recoveryCodes });
};

export const verifyTOTP = async (params: { code: string }) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const validated = VerifyTOTPSchema.parse(params);
  const user = await findUserById(currentUser.$id);
  if (!user?.mfaEnabled) throw new Error("Two-factor authentication is not enabled");

  const secret = getDecryptedTOTPSecret(user);
  if (!secret || !verifyTOTPCode(secret, validated.code, TOTP_WINDOW)) {
    throw new Error("Invalid authenticator code");
  }

  return parseStringify({ valid: true });
};

export const disableTOTP = async (params: { code: string }) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  await verifyTOTP(params);

  await updateUserDocument(currentUser.$id, {
    mfaEnabled: false,
    twoFactorSecret: null,
    recoveryCodeHashes: [],
  });

  await notifySecurityEvent(currentUser.$id, "2fa_disabled", {
    timestamp: new Date().toISOString(),
  });

  return parseStringify({ disabled: true });
};

export const validateRecoveryCode = async (params: { code: string }) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const validated = ValidateRecoveryCodeSchema.parse(params);
  const user = await findUserById(currentUser.$id);
  const hashes = user?.recoveryCodeHashes ?? [];

  const matchIndex = hashes.findIndex((hash) =>
    verifyHash(validated.code.toUpperCase(), hash)
  );

  if (matchIndex === -1) {
    throw new Error("Invalid recovery code");
  }

  const remainingHashes = hashes.filter((_, index) => index !== matchIndex);
  await updateUserDocument(currentUser.$id, {
    recoveryCodeHashes: remainingHashes,
  });

  return parseStringify({
    valid: true,
    remainingCodes: remainingHashes.length,
  });
};

export const regenerateRecoveryCodes = async (params: { code: string }) => {
  await verifyTOTP(params);

  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const recoveryCodes = generateRecoveryCodes(RECOVERY_CODES_COUNT);
  const recoveryCodeHashes = recoveryCodes.map((code) => hashValue(code));

  await updateUserDocument(currentUser.$id, {
    recoveryCodeHashes,
  });

  return parseStringify({ recoveryCodes });
};

const PENDING_2FA_COOKIE = "zynk-pending-2fa";
const PENDING_SESSION_COOKIE = "zynk-pending-session";

const validateLoginSecondFactor = async (
  user: UserDoc,
  code: string,
  useRecoveryCode?: boolean
) => {
  if (useRecoveryCode) {
    const hashes = user.recoveryCodeHashes ?? [];
    const matchIndex = hashes.findIndex((hash) =>
      verifyHash(code.toUpperCase(), hash)
    );

    if (matchIndex === -1) {
      throw new Error("Invalid recovery code");
    }

    const remainingHashes = hashes.filter((_, index) => index !== matchIndex);
    await updateUserDocument(user.$id, {
      recoveryCodeHashes: remainingHashes,
    });
    return;
  }

  const secret = getDecryptedTOTPSecret(user);
  if (!secret || !verifyTOTPCode(secret, code, TOTP_WINDOW)) {
    throw new Error("Invalid authenticator code");
  }
};

export const complete2FALogin = async (params: {
  code: string;
  useRecoveryCode?: boolean;
}) => {
  const cookieStore = await cookies();
  const pendingAccountId = cookieStore.get(PENDING_2FA_COOKIE)?.value;
  const pendingSession = cookieStore.get(PENDING_SESSION_COOKIE)?.value;

  if (!pendingAccountId || !pendingSession) {
    throw new Error("No pending login session");
  }

  const user = await findUserByAccountId(pendingAccountId);
  if (!user) throw new Error("User not found");

  await validateLoginSecondFactor(user, params.code, params.useRecoveryCode);

  cookieStore.set("appwrite-session", pendingSession, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60,
  });
  cookieStore.delete(PENDING_2FA_COOKIE);
  cookieStore.delete(PENDING_SESSION_COOKIE);

  return parseStringify({ completed: true });
};

// ============= SESSION MANAGEMENT =============

export const listUserSessions = async () => {
  const { account } = await createSessionClient();
  const sessions = await account.listSessions();
  return parseStringify(sessions.sessions);
};

export const revokeSession = async (params: { sessionId: string }) => {
  const validated = RevokeSessionSchema.parse(params);
  const { account } = await createSessionClient();
  await account.deleteSession(validated.sessionId);
  return parseStringify({ revoked: true });
};

export const revokeAllOtherSessions = async () => {
  const { account } = await createSessionClient();
  const sessions = await account.listSessions();
  const current = await account.getSession("current");

  await Promise.all(
    sessions.sessions
      .filter((session) => session.$id !== current.$id)
      .map((session) => account.deleteSession(session.$id))
  );

  return parseStringify({ revoked: sessions.sessions.length - 1 });
};

export const refreshSession = async () => {
  const { account } = await createSessionClient();
  const current = await account.getSession("current");
  const updated = await account.updateSession("current");

  (await cookies()).set("appwrite-session", updated.secret || current.secret, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60,
  });

  return parseStringify({ sessionId: updated.$id });
};

// ============= PASSWORD SECURITY =============

export const changePassword = async (params: {
  currentPassword: string;
  newPassword: string;
}) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const validated = ChangePasswordSchema.parse(params);
  validateNewPassword(validated.newPassword);

  const user = await findUserById(currentUser.$id);
  if (!user?.passwordHash) {
    throw new Error("Password authentication is not enabled for this account");
  }

  if (!verifyHash(validated.currentPassword, user.passwordHash)) {
    throw new Error("Current password is incorrect");
  }

  assertPasswordNotReused(validated.newPassword, user.passwordHistory ?? []);

  const passwordHistory = [
    user.passwordHash,
    ...(user.passwordHistory ?? []),
  ].slice(0, PASSWORD_HISTORY_LIMIT);

  await updateUserDocument(currentUser.$id, {
    passwordHash: hashValue(validated.newPassword),
    passwordHistory,
    lastPasswordChangeAt: new Date().toISOString(),
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
  });

  await notifySecurityEvent(currentUser.$id, "password_changed", {
    timestamp: new Date().toISOString(),
  });

  return parseStringify({ changed: true });
};

export const requestPasswordReset = async (params: { email: string }) => {
  const validated = RequestPasswordResetSchema.parse(params);
  const user = await findUserByEmail(validated.email);

  if (!user) {
    return parseStringify({ sent: true });
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();

  await updateUserDocument(user.$id, {
    passwordResetTokenHash: hashValue(token),
    passwordResetExpiresAt: expiresAt,
  });

  await sendPasswordResetEmail(validated.email, token);

  return parseStringify({ sent: true });
};

export const resetPassword = async (params: {
  email: string;
  token: string;
  newPassword: string;
}) => {
  const validated = ResetPasswordSchema.parse(params);
  validateNewPassword(validated.newPassword);

  const user = await findUserByEmail(validated.email);
  if (!user?.passwordResetTokenHash || !user.passwordResetExpiresAt) {
    throw new Error("Invalid or expired reset link");
  }

  if (new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
    throw new Error("Reset link has expired");
  }

  if (!verifyHash(validated.token, user.passwordResetTokenHash)) {
    throw new Error("Invalid reset link");
  }

  assertPasswordNotReused(validated.newPassword, user.passwordHistory ?? []);

  const passwordHistory = [
    user.passwordHash,
    ...(user.passwordHistory ?? []),
  ]
    .filter((hash): hash is string => typeof hash === "string")
    .slice(0, PASSWORD_HISTORY_LIMIT);

  await updateUserDocument(user.$id, {
    passwordHash: hashValue(validated.newPassword),
    passwordHistory,
    lastPasswordChangeAt: new Date().toISOString(),
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
  });

  return parseStringify({ reset: true });
};

export const setAccountPassword = async (params: { password: string }) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  validateNewPassword(params.password);

  await updateUserDocument(currentUser.$id, {
    passwordHash: hashValue(params.password),
    passwordHistory: [],
    lastPasswordChangeAt: new Date().toISOString(),
  });

  return parseStringify({ set: true });
};
