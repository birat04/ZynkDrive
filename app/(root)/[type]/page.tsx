import { Suspense } from "react";
import { getFiles } from "@/lib/actions/file.actions";
import { getFileTypesParams } from "@/lib/utils";
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

  return (
    <div className="page-container">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="h4 text-light-100">{title}</h1>
        <Suspense fallback={null}>
          <Sort />
        </Suspense>
      </div>

      {fileList.length === 0 ? (
        <p className="body-2 mt-8 text-center text-light-200">
          No files yet. Upload your first file to get started.
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
