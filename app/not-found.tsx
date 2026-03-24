import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-light-400 px-6">
      <div className="rounded-2xl bg-white p-8 text-center shadow-drop-1">
        <h1 className="h2 text-light-100">Page not found</h1>
        <p className="body-2 mt-2 text-light-200">
          The page you are looking for does not exist.
        </p>
        <Link href="/" className="primary-btn mt-6 inline-flex">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
