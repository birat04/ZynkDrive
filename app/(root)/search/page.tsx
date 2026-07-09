import Link from "next/link";

import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Thumbnail } from "@/components/Thumbnail";
import { advancedSearch } from "@/lib/actions/search.actions";
import { convertFileSize } from "@/lib/utils";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() || "";

  const results = query
    ? await advancedSearch({
        query,
        limit: 100,
      })
    : [];

  return (
    <div className="page-container">
      <div>
        <h1 className="h4 text-light-100">Search</h1>
        <p className="body-2 mt-1 text-light-200">
          {query ? `${results.length} result${results.length === 1 ? "" : "s"} for "${query}"` : "Enter a query from the header search bar"}
        </p>
      </div>

      {!query ? (
        <p className="body-2 mt-8 text-center text-light-200">
          Use the search bar above to find files and folders.
        </p>
      ) : results.length === 0 ? (
        <p className="body-2 mt-8 text-center text-light-200">No results found.</p>
      ) : (
        <div className="mt-6 space-y-2">
          {results.map((result) => (
            <div key={`${result.type}-${result.id}`} className="search-result-item">
              <Thumbnail
                type={result.mimeType?.split("/")[0] || result.type}
                extension=""
                url=""
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-light-100">{result.name}</p>
                <p className="caption text-light-200">
                  {result.type}
                  {result.size ? ` • ${convertFileSize(result.size)}` : ""}
                </p>
                <FormattedDateTime isoString={result.lastModified} className="caption text-light-200" />
              </div>
              {result.type === "file" ? (
                <Link href="/" className="caption text-brand hover:underline">
                  Open
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
