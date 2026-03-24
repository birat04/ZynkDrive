"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-light-400 px-6">
      <div className="rounded-2xl bg-white p-8 text-center shadow-drop-1">
        <h1 className="h2 text-light-100">Something went wrong</h1>
        <p className="body-2 mt-2 text-light-200">
          An unexpected error occurred while loading this page.
        </p>
        <button type="button" onClick={reset} className="primary-btn mt-6">
          Try again
        </button>
      </div>
    </main>
  );
}
