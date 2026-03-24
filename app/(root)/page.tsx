import Link from "next/link";
import Image from "next/image";

import { getFiles, getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { getUsageSummary, convertFileSize } from "@/lib/utils";
import { Chart } from "@/components/Chart";
import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Thumbnail } from "@/components/Thumbnail";

export default async function DashboardPage() {
  const [totalSpace, recentFilesResponse] = await Promise.all([
    getTotalSpaceUsed(),
    getFiles({ types: ["document", "image", "video", "audio", "other"], limit: 10 }),
  ]);

  if (!totalSpace || typeof totalSpace !== "object") {
    return (
      <div className="page-container">
        <p className="body-2 text-light-200">Unable to load storage data.</p>
      </div>
    );
  }

  const usageSummary = getUsageSummary(totalSpace);
  const recentFiles = (Array.isArray(recentFilesResponse) ? recentFilesResponse : []) as Array<{
    $id: string;
    name: string;
    type?: string;
    extension?: string;
    url?: string;
    size?: number | string;
    $updatedAt?: string;
    bucketFileId?: string;
    users?: string[];
    [key: string]: unknown;
  }>;
  const used = totalSpace.used ?? 0;

  return (
    <div className="page-container">
      <h1 className="h4 text-light-100">Dashboard</h1>

      <div className="dashboard-container mt-6">
        <div className="dashboard-left">
          <Chart used={used} />
        </div>

        <div className="dashboard-right">
          {usageSummary.map((item) => (
            <Link
              key={item.url}
              href={item.url}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-drop-1 transition hover:shadow-drop-2"
            >
              <Image
                src={item.icon}
                alt=""
                width={40}
                height={40}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-light-100">{item.title}</p>
                <p className="caption text-light-200">
                  {convertFileSize(item.size ?? 0)}
                </p>
              </div>
              <FormattedDateTime
                isoString={item.latestDate}
                className="caption shrink-0 text-light-200"
              />
            </Link>
          ))}

          <div className="dashboard-recent-files">
            <h2 className="h5 mb-4 text-light-100">Recent files</h2>
            {recentFiles.length === 0 ? (
              <p className="body-2 text-light-200">No files yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentFiles.map((file) => (
                  <Link
                    key={file.$id}
                    href={file.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="search-result-item"
                  >
                    <Thumbnail
                      type={file.type || "other"}
                      extension={file.extension || ""}
                      url={file.url || ""}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-sm font-medium text-light-100">{file.name}</p>
                      <FormattedDateTime
                        isoString={(file.$updatedAt || file.$createdAt) as string | undefined}
                        className="caption text-light-200"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
