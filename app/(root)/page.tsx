import Link from "next/link";
import Image from "next/image";

import { getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { getUsageSummary, convertFileSize } from "@/lib/utils";
import { Chart } from "@/components/Chart";
import Card from "@/components/Card";
import { FormattedDateTime } from "@/components/FormattedDateTime";

export default async function DashboardPage() {
  const totalSpace = await getTotalSpaceUsed();

  if (!totalSpace || typeof totalSpace !== "object") {
    return (
      <div className="page-container">
        <p className="body-2 text-light-200">Unable to load storage data.</p>
      </div>
    );
  }

  const usageSummary = getUsageSummary(totalSpace);
  const recentFiles = (totalSpace.all ?? []) as Array<{
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
          <div className="chart">
            <Chart used={used} />
          </div>

          <div className="dashboard-recent-files">
            <h2 className="h5 mb-4 text-light-100">Recent files</h2>
            {recentFiles.length === 0 ? (
              <p className="body-2 text-light-200">No files yet.</p>
            ) : (
              <div className="file-list">
                {recentFiles.map((file) => (
                  <Card key={file.$id} file={file} />
                ))}
              </div>
            )}
          </div>
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
                date={item.latestDate}
                className="caption shrink-0 text-light-200"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
