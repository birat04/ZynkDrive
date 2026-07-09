"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import SearchFilters, { type SearchFilterValues } from "@/components/SearchFilters";
import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Thumbnail } from "@/components/Thumbnail";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { advancedSearch, getSearchSuggestions } from "@/lib/actions/search.actions";
import { convertFileSize } from "@/lib/utils";

type SearchResult = {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  mimeType?: string;
  lastModified: string;
};

const RECENT_SEARCHES_KEY = "zynkdrive:recent-searches";

const Search = () => {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("searchText") || "";
  const [query, setQuery] = useState(searchQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilterValues>({});
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const saveRecentSearch = (value: string) => {
    if (!value.trim()) return;
    const existing = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]") as string[];
    const next = [value, ...existing.filter((item) => item !== value)].slice(0, 8);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    const runSearch = async () => {
      if (debouncedQuery.length === 0) {
        setResults([]);
        setSuggestions([]);
        setOpen(false);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("searchText");
        const newSearch = params.toString();
        router.push(newSearch ? `${path}?${newSearch}` : path);
        return;
      }

      const [searchResults, searchSuggestions] = await Promise.all([
        advancedSearch({
          query: debouncedQuery,
          ...filters,
          limit: 12,
        }),
        getSearchSuggestions(debouncedQuery, 5),
      ]);

      setResults(searchResults);
      setSuggestions(searchSuggestions);
      setOpen(true);
      saveRecentSearch(debouncedQuery);
    };

    void runSearch();
  }, [debouncedQuery, filters, path, router, searchParams]);

  useEffect(() => {
    if (!searchQuery) setQuery("");
  }, [searchQuery]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleClickItem = (result: SearchResult) => {
    setOpen(false);
    setResults([]);

    if (result.type === "folder") {
      router.push(`/search?q=${encodeURIComponent(query)}&folder=${result.id}`);
      return;
    }

    const segment =
      result.mimeType?.startsWith("video/") || result.mimeType?.startsWith("audio/")
        ? "media"
        : `${result.mimeType?.split("/")[0] || "other"}s`;
    router.push(`/${segment}?searchText=${encodeURIComponent(query)}`);
  };

  return (
    <div ref={containerRef} className="search-container">
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
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => query.length > 0 && setOpen(true)}
        className="search-input pl-11 pr-24"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <SearchFilters values={filters} onChange={setFilters} />
      </div>

      {open ? (
        <div className="search-result">
          {suggestions.length > 0 ? (
            <div className="border-b border-light-200 px-3 py-2">
              <p className="caption text-light-200">Suggestions</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="caption rounded-full bg-light-400 px-2 py-1 text-light-100"
                    onClick={() => setQuery(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {results.length > 0 ? (
            <>
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  className="search-result-item w-full cursor-pointer text-left"
                  onClick={() => handleClickItem(result)}
                >
                  <Thumbnail
                    type={result.mimeType?.split("/")[0] || result.type}
                    extension=""
                    url=""
                  />
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-[14px] font-medium text-light-100">
                      {result.name}
                    </span>
                    <span className="caption text-light-200">
                      {result.type}
                      {result.size ? ` • ${convertFileSize(result.size)}` : ""}
                    </span>
                    <FormattedDateTime isoString={result.lastModified} className="caption text-light-200" />
                  </div>
                </button>
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                className="block px-3 py-2 text-center text-sm text-brand hover:underline"
                onClick={() => setOpen(false)}
              >
                View all results
              </Link>
            </>
          ) : (
            <p className="px-3 py-4 text-center text-sm text-light-200">No files found</p>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Search;
