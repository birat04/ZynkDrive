"use client";

import { useEffect, useState } from "react";

type CodePreviewProps = {
  fileId: string;
  extension?: string;
};

const languageClassMap: Record<string, string> = {
  js: "language-javascript",
  jsx: "language-javascript",
  ts: "language-typescript",
  tsx: "language-typescript",
  json: "language-json",
  md: "language-markdown",
  html: "language-html",
  htm: "language-html",
  css: "language-css",
  scss: "language-css",
  py: "language-python",
  sql: "language-sql",
  xml: "language-xml",
};

export const CodePreview = ({ fileId, extension = "txt" }: CodePreviewProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/files/${fileId}/content`);
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as { content: string };
        if (!cancelled) {
          setContent(data.content);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load preview");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fileId]);

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

  const languageClass = languageClassMap[extension.toLowerCase()] || "language-plaintext";

  return (
    <div className="max-h-[70vh] w-full overflow-auto rounded-xl border border-light-200 bg-[#0f172a] p-4">
      <pre className={`text-sm leading-6 text-slate-100 ${languageClass}`}>
        <code>{content}</code>
      </pre>
    </div>
  );
};
