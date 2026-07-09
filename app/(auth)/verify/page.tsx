import Link from "next/link";

import { verifyEmail } from "@/lib/actions/auth.actions";

interface VerifyPageProps {
  searchParams: Promise<{
    token?: string;
    email?: string;
  }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const token = params.token;
  const email = params.email;

  let message = "This verification link is invalid or has expired.";
  let verified = false;

  if (token && email) {
    try {
      const result = await verifyEmail({ token, email });
      verified = Boolean(result?.verified);
      message = verified
        ? "Your email has been verified. You can now upload files and use all features."
        : message;
    } catch (error) {
      message = error instanceof Error ? error.message : message;
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-drop-1 sm:p-8">
      <h1 className="h2 text-center text-light-100">
        {verified ? "Email verified" : "Verification failed"}
      </h1>
      <p className="body-2 mt-4 text-center text-light-200">{message}</p>
      <div className="mt-8 flex justify-center">
        <Link href="/sign-in" className="primary-btn">
          Continue to sign in
        </Link>
      </div>
    </div>
  );
}
