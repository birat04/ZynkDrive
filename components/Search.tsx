"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getFiles } from "@/lib/actions/file.actions";
import { Thumbnail } from "@/components/Thumbnail";
import { FormattedDateTime } from "@/components/FormattedDateTime";
import { useDebounce } from "@/hooks/useDebounce";

type FileDoc = {
  $id: string;
  name: string;
  type?: string;
  extension?: string;
  url?: string;
  [key: string]: unknown;
};

const Search = () => {
  const [query, setQuery] = useState("");
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("searchText") || "";
  const [results, setResults] = useState<FileDoc[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const fetchFiles = async () => {
      if (debouncedQuery.length === 0) {
        setResults([]);
        setOpen(false);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("searchText");
        const newSearch = params.toString();
        router.push(newSearch ? `${path}?${newSearch}` : path);
        return;
      }

      const files = await getFiles({
        types: [],
        searchText: debouncedQuery,
      });
      setResults(Array.isArray(files) ? files : []);
      setOpen(true);
    };

    fetchFiles();
  }, [debouncedQuery, path, router, searchParams]);

  useEffect(() => {
    if (!searchQuery) setQuery("");
  }, [searchQuery]);

  const handleClickItem = (file: FileDoc) => {
    setOpen(false);
    setResults([]);

    const type = file.type || "other";
    const segment =
      type === "video" || type === "audio" ? "media" : `${type}s`;
    router.push(`/${segment}?searchText=${encodeURIComponent(query)}`);
  };

  return (
    <div className="search-container">
      <Image
        src="/assets/icons/search.svg"
        alt=""
        width={20}
        height={20}
        className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
      />
      <Input
        type="text"
        placeholder="Search files..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input pl-11"
      />

      {open && (
        <div className="search-result">
          {results.length > 0 ? (
            results.map((file) => (
              <button
                key={file.$id}
                type="button"
                className="search-result-item w-full cursor-pointer text-left"
                onClick={() => handleClickItem(file)}
              >
                <Thumbnail
                  type={file.type || "other"}
                  extension={file.extension || ""}
                  url={file.url ?? ""}
                />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="truncate text-[14px] font-medium text-light-100">
                    {file.name}
                  </span>
                  <FormattedDateTime
                    date={file.$updatedAt as string}
                    className="caption text-light-200"
                  />
                </div>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-sm text-light-200">
              No files found
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
