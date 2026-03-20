"use server";

import { ID, Query } from "node-appwrite";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { parseStringify, constructInitialsAvatarUrl } from "@/lib/utils";

interface CreateAccountParams {
  fullName: string;
  email: string;
}

interface SignInUserParams {
  email: string;
}

interface SendEmailOTPParams {
  accountId: string;
  email: string;
}

interface VerifySecretParams {
  accountId: string;
  password: string;
}
export const createAccount = async ({ fullName, email }: CreateAccountParams) => {
  const { account, databases } = await createAdminClient();

  try {
    const existingUsers = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!,
      [Query.equal("email", [email])]
    );

    const existingUser = existingUsers.documents?.[0];

    const accountId: string =
      typeof existingUser?.accountId === "string"
        ? existingUser.accountId
        : (await account.createEmailToken(ID.unique(), email)).userId;

    if (!existingUser) {
      const avatar = constructInitialsAvatarUrl(fullName);

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!,
        ID.unique(),
        {
          fullName,
          email,
          avatar,
          accountId
          
        }
      );
    } else {
      await account.createEmailToken(accountId, email);
    }

    return parseStringify({ accountId });
  } catch (error) {
    console.error(error);
  }
};

export const signInUser = async ({ email }: SignInUserParams) => {
  const { account, databases } = await createAdminClient();

  try {
    const users = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!,
      [Query.equal("email", [email])]
    );

    const user = users.documents?.[0];
    const accountId = user?.accountId as string | undefined;
    if (!accountId) return;

    await account.createEmailToken(accountId, email);
    return parseStringify({ accountId });
  } catch (error) {
    console.error(error);
  }
};

export const sendEmailOTP = async ({ accountId, email }: SendEmailOTPParams) => {
  const { account } = await createAdminClient();

  try {
    await account.createEmailToken(accountId, email);
    return parseStringify({ accountId });
  } catch (error) {
    console.error(error);
  }
};

export const verifySecret = async ({ accountId, password }: VerifySecretParams) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createSession(accountId, password);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    redirect("/");
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const { account, databases } = await createSessionClient();
    const currentAccount = await account.get();

    const users = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!,
      [Query.equal("accountId", [currentAccount.$id])]
    );

    const user = users.documents?.[0];
    if (!user) return null;

    // Avatar fallback: use Appwrite initials URL if collection doesn't store avatar
    const fullName = (user.fullName as string) ?? "User";
    const avatar =
      (user.avatar as string) ?? constructInitialsAvatarUrl(fullName);

    return parseStringify({ ...user, avatar });
  } catch {
    return null;
  }
};

export const signOutUser = async () => {
  try {
    const { account } = await createSessionClient();
    await account.deleteSession("current");
  } catch (error) {
    console.error(error);
  } finally {
    (await cookies()).delete("appwrite-session");
    redirect("/sign-in");
  }
};

