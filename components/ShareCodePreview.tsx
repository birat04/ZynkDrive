"use client";

import { useEffect, useState } from "react";

type ShareCodePreviewProps = {
  token: string;
  password?: string;
  extension?: string;
};

export const ShareCodePreview = ({ token, password, extension = "txt" }: ShareCodePreviewProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (password) params.set("password", password);

        const response = await fetch(`/api/shares/${token}/content?${params.toString()}`);
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as { content: string };
        if (!cancelled) setContent(data.content);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load preview");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, password]);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl bg-light-300 text-sm text-light-200">
        Loading preview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 w-full items-center justify-center rounded-xl bg-light-300 px-6 text-center text-sm text-red">
        {error}
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] w-full overflow-auto rounded-xl border border-light-200 bg-[#0f172a] p-4">
      <pre className={`text-sm leading-6 text-slate-100 language-${extension}`}>
        <code>{content}</code>
      </pre>
    </div>
  );
};
