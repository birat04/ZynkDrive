import { Suspense } from "react";
import { getFiles } from "@/lib/actions/file.actions";
import { convertFileSize, getFileTypesParams } from "@/lib/utils";
import Card from "@/components/Card";
import Sort from "@/components/Sort";

type PageProps = {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ searchText?: string; sort?: string }>;
};

export default async function TypePage({ params, searchParams }: PageProps) {
  const { type } = await params;
  const { searchText, sort = "$createdAt-desc" } = await searchParams;
  const types = getFileTypesParams(type);

  const files = await getFiles({
    types: types as FileType[],
    searchText: searchText ?? undefined,
    sort,
  });

  const fileList = Array.isArray(files) ? files : [];
  const title = type.charAt(0).toUpperCase() + type.slice(1);
  const totalSize = fileList.reduce((acc, file) => {
    const value = typeof file.size === "number" ? file.size : Number(file.size || 0);
    return acc + value;
  }, 0);

  return (
    <div className="page-container">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h4 text-light-100">{title}</h1>
          <p className="body-2 mt-1 text-light-200">
            {fileList.length} file{fileList.length === 1 ? "" : "s"} • {convertFileSize(totalSize)}
          </p>
        </div>

        <Suspense fallback={null}>
          <Sort />
        </Suspense>
      </div>

      {fileList.length === 0 ? (
        <p className="body-2 mt-8 text-center text-light-200">
          No files uploaded
        </p>
      ) : (
        <div className="file-list mt-6">
          {fileList.map((file) => (
            <Card key={file.$id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
