"use server";

import { Query } from "node-appwrite";
import { cookies } from "next/headers";
import { Models } from "node-appwrite";

import { createAdminClient } from "@/lib/appwrite";
import { FEATURES, SESSION_ABSOLUTE_TIMEOUT_HOURS } from "@/lib/constants";
import { hashValue, generateSecureToken } from "@/lib/utils/crypto";
import { sendVerificationEmail } from "@/lib/utils/email";
import { parseStringify } from "@/lib/utils";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_2FA_COOKIE = "zynk-pending-2fa";
const PENDING_SESSION_COOKIE = "zynk-pending-session";

type UserDoc = Models.Document & {
  email?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  twoFactorSecret?: string;
  recoveryCodeHashes?: string[];
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

export const markEmailVerified = async (userId: string) => {
  await updateUserDocument(userId, {
    emailVerified: true,
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,
  });
};

export const sendEmailVerification = async (email: string) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("User not found");
  if (user.emailVerified) {
    return parseStringify({ alreadyVerified: true });
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

  await updateUserDocument(user.$id, {
    emailVerificationTokenHash: hashValue(token),
    emailVerificationExpiresAt: expiresAt,
  });

  await sendVerificationEmail(email, token);

  return parseStringify({ sent: true });
};

export const userRequires2FA = async (userId: string): Promise<boolean> => {
  if (!FEATURES.TWO_FACTOR_AUTH_ENABLED) return false;
  const user = await findUserById(userId);
  return user?.mfaEnabled === true;
};

export const setPending2FASession = async (accountId: string, sessionSecret: string) => {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_2FA_COOKIE, accountId, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
  });
  cookieStore.set(PENDING_SESSION_COOKIE, sessionSecret, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
  });
};

export const completePending2FASession = async () => {
  const cookieStore = await cookies();
  const pendingSession = cookieStore.get(PENDING_SESSION_COOKIE)?.value;
  if (!pendingSession) return false;

  cookieStore.set("appwrite-session", pendingSession, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60,
  });
  cookieStore.delete(PENDING_2FA_COOKIE);
  cookieStore.delete(PENDING_SESSION_COOKIE);
  return true;
};

export const getPending2FAAccountId = async (): Promise<string | null> => {
  return (await cookies()).get(PENDING_2FA_COOKIE)?.value ?? null;
};

export const findUserByAccountId = async (accountId: string): Promise<UserDoc | null> => {
  const { databases } = await createAdminClient();
  const users = await databases.listDocuments(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
    getUsersCollection(),
    [Query.equal("accountId", [accountId])]
  );

  return (users.documents[0] as UserDoc | undefined) ?? null;
};
