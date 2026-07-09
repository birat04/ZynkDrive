"use server";

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { MIN_SEARCH_QUERY_LENGTH } from "@/lib/constants";

interface SearchResult {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  mimeType?: string;
  lastModified: string;
  path?: string;
}

/**
 * Search files by name
 */
export const searchFiles = async (
  query: string,
  limit = 50,
  offset = 0
): Promise<SearchResult[]> => {
  try {
    if (!query || query.length < MIN_SEARCH_QUERY_LENGTH) {
      return [];
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Get all files for user (Appwrite doesn't support contains queries)
    const allFiles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [
        Query.equal("ownerId", [currentUser.$id]),
        Query.equal("trashed", [false]),
        Query.limit(1000), // High limit for client-side filtering
      ]
    );

    const searchLower = query.toLowerCase();

    // Filter files by name (client-side)
    const matchedFiles = allFiles.documents
      .filter((file: any) =>
        file.name.toLowerCase().includes(searchLower)
      )
      .map((file: any) => ({
        id: file.$id,
        name: file.name,
        type: "file" as const,
        size: file.size,
        mimeType: file.mimeType,
        lastModified: file.updatedAt || file.createdAt,
      }))
      .sort((a, b) => {
        // Sort by relevance (name match position) then by date
        const aIndex = a.name.toLowerCase().indexOf(searchLower);
        const bIndex = b.name.toLowerCase().indexOf(searchLower);

        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }

        return (
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime()
        );
      })
      .slice(offset, offset + limit);

    return matchedFiles;
  } catch (error) {
    console.error("Error searching files:", error);
    return [];
  }
};

/**
 * Search folders by name
 */
export const searchFolders = async (
  query: string,
  limit = 50,
  offset = 0
): Promise<SearchResult[]> => {
  try {
    if (!query || query.length < MIN_SEARCH_QUERY_LENGTH) {
      return [];
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Get all folders for user
    const allFolders = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
      [
        Query.equal("ownerId", [currentUser.$id]),
        Query.equal("trashed", [false]),
        Query.limit(1000),
      ]
    );

    const searchLower = query.toLowerCase();

    // Filter folders by name
    const matchedFolders = allFolders.documents
      .filter((folder: any) =>
        folder.name.toLowerCase().includes(searchLower)
      )
      .map((folder: any) => ({
        id: folder.$id,
        name: folder.name,
        type: "folder" as const,
        lastModified: folder.updatedAt || folder.createdAt,
        path: folder.path,
      }))
      .sort((a, b) => {
        // Sort by relevance then by date
        const aIndex = a.name.toLowerCase().indexOf(searchLower);
        const bIndex = b.name.toLowerCase().indexOf(searchLower);

        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }

        return (
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime()
        );
      })
      .slice(offset, offset + limit);

    return matchedFolders;
  } catch (error) {
    console.error("Error searching folders:", error);
    return [];
  }
};

/**
 * Search both files and folders
 */
export const search = async (
  query: string,
  limit = 50,
  offset = 0
): Promise<SearchResult[]> => {
  try {
    if (!query || query.length < MIN_SEARCH_QUERY_LENGTH) {
      return [];
    }

    const [files, folders] = await Promise.all([
      searchFiles(query, limit, 0),
      searchFolders(query, limit, 0),
    ]);

    // Combine and sort by relevance
    const combined = [...files, ...folders]
      .sort((a, b) => {
        // Sort by relevance (search query position in name)
        const searchLower = query.toLowerCase();
        const aIndex = a.name.toLowerCase().indexOf(searchLower);
        const bIndex = b.name.toLowerCase().indexOf(searchLower);

        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }

        // Then by type (folders first)
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }

        // Then by date
        return (
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime()
        );
      })
      .slice(offset, offset + limit);

    return combined;
  } catch (error) {
    console.error("Error in search:", error);
    return [];
  }
};

/**
 * Advanced search with filters
 */
export interface AdvancedSearchOptions {
  query: string;
  fileType?: string; // "image", "video", "document", "audio", "other"
  mimeType?: string; // e.g., "image/png"
  minSize?: number; // bytes
  maxSize?: number; // bytes
  dateFrom?: Date;
  dateTo?: Date;
  starred?: boolean;
  shared?: boolean;
  limit?: number;
  offset?: number;
}

export const advancedSearch = async (
  options: AdvancedSearchOptions
): Promise<SearchResult[]> => {
  try {
    const {
      query,
      fileType,
      mimeType,
      minSize,
      maxSize,
      dateFrom,
      dateTo,
      starred,
      limit = 50,
      offset = 0,
    } = options;

    if (!query || query.length < MIN_SEARCH_QUERY_LENGTH) {
      return [];
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const { databases } = await createAdminClient();

    // Get all files
    const allFiles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
      process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
      [
        Query.equal("ownerId", [currentUser.$id]),
        Query.equal("trashed", [false]),
        Query.limit(10000),
      ]
    );

    const searchLower = query.toLowerCase();

    let results = allFiles.documents.filter((file: any) => {
      // Name match
      if (!file.name.toLowerCase().includes(searchLower)) {
        return false;
      }

      // File type filter
      if (fileType) {
        const typeMap: Record<string, string[]> = {
          image: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/svg+xml",
          ],
          video: [
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-msvideo",
          ],
          audio: [
            "audio/mpeg",
            "audio/wav",
            "audio/ogg",
            "audio/aac",
            "audio/flac",
          ],
          document: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
          ],
        };

        const allowedTypes = typeMap[fileType] || [];
        if (!allowedTypes.includes(file.mimeType)) {
          return false;
        }
      }

      // MIME type filter
      if (mimeType && file.mimeType !== mimeType) {
        return false;
      }

      // Size filters
      if (minSize && file.size < minSize) {
        return false;
      }
      if (maxSize && file.size > maxSize) {
        return false;
      }

      // Date filters
      const fileDate = new Date(file.updatedAt || file.createdAt);
      if (dateFrom && fileDate < dateFrom) {
        return false;
      }
      if (dateTo && fileDate > dateTo) {
        return false;
      }

      // Starred filter
      if (starred && !file.starred) {
        return false;
      }

      return true;
    });

    // Sort by relevance
    results = results
      .map((file: any) => ({
        id: file.$id,
        name: file.name,
        type: "file" as const,
        size: file.size,
        mimeType: file.mimeType,
        lastModified: file.updatedAt || file.createdAt,
      }))
      .sort((a, b) => {
        const aIndex = a.name.toLowerCase().indexOf(searchLower);
        const bIndex = b.name.toLowerCase().indexOf(searchLower);

        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }

        return (
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime()
        );
      })
      .slice(offset, offset + limit);

    return results;
  } catch (error) {
    console.error("Error in advanced search:", error);
    return [];
  }
};

/**
 * Get search suggestions
 */
export const getSearchSuggestions = async (
  query: string,
  limit = 10
): Promise<string[]> => {
  try {
    if (!query || query.length < 1) {
      return [];
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    const { databases } = await createAdminClient();

    // Get files and folders
    const [files, folders] = await Promise.all([
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
        [
          Query.equal("ownerId", [currentUser.$id]),
          Query.equal("trashed", [false]),
          Query.limit(1000),
        ]
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
        process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
        [
          Query.equal("ownerId", [currentUser.$id]),
          Query.equal("trashed", [false]),
          Query.limit(1000),
        ]
      ),
    ]);

    const queryLower = query.toLowerCase();
    const suggestions = new Set<string>();

    // Extract suggestions from files
    files.documents.forEach((file: any) => {
      if (file.name.toLowerCase().includes(queryLower)) {
        suggestions.add(file.name);
      }
    });

    // Extract suggestions from folders
    folders.documents.forEach((folder: any) => {
      if (folder.name.toLowerCase().includes(queryLower)) {
        suggestions.add(folder.name);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  } catch (error) {
    console.error("Error getting search suggestions:", error);
    return [];
  }
};

/**
 * Get recent searches (client-side stored, but here's a utility)
 */
export const getRecentSearches = (): string[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem("recentSearches");
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error getting recent searches:", error);
    return [];
  }
};

/**
 * Save a search query
 */
export const saveSearch = (query: string) => {
  if (typeof window === "undefined") return;

  try {
    const recent = getRecentSearches();
    const filtered = recent.filter((q) => q !== query);
    const updated = [query, ...filtered].slice(0, 10);

    localStorage.setItem("recentSearches", JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving search:", error);
  }
};

/**
 * Clear all recent searches
 */
export const clearRecentSearches = () => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("recentSearches");
  } catch (error) {
    console.error("Error clearing searches:", error);
  }
};
