"use server";

import { Models } from "node-appwrite";

import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";

type FileDoc = Models.Document & {
  accountId?: string;
  owner?: string;
  users?: string[];
  bucketFileId?: string;
  name?: string;
  type?: string;
  extension?: string;
  size?: number | string;
  thumbnailId?: string;
  thumbnailIdLg?: string;
};

export const getAccessibleFile = async (fileId: string) => {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) throw new Error("Unauthenticated");

  const file = (await databases.getDocument(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
    process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
    fileId
  )) as FileDoc;

  const userId = currentUser.$id as string;
  const accountId = currentUser.accountId as string | undefined;
  const userEmail = currentUser.email as string;
  const users = file.users ?? [];
  const hasSharedEmail = users.includes(userEmail);
  const hasLegacyOwner = file.owner === userId;
  const hasAccountOwner = !!accountId && file.accountId === accountId;
  const hasEditorTag = users.includes(`role:${userEmail}:editor`);
  const hasAccess =
    hasLegacyOwner ||
    hasAccountOwner ||
    hasSharedEmail ||
    hasEditorTag;

  if (!hasAccess) throw new Error("Forbidden");

  return { file, currentUser };
};

export type AccessibleFile = FileDoc;
