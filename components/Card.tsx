import Link from "next/link";
import { Thumbnail } from "@/components/Thumbnail";
import { FormattedDateTime } from "@/components/FormattedDateTime";
import ActionDropdown from "@/components/ActionDropdown";
import { constructFileUrl, convertFileSize } from "@/lib/utils";

type FileDoc = {
  $id: string;
  name: string;
  type?: string;
  extension?: string;
  url?: string;
  size?: number | string;
  $updatedAt?: string;
  bucketFileId?: string;
  users?: string[];
  owner?: { fullName?: string } | string;
  accountId?: string;
  [key: string]: unknown;
};

type CardProps = {
  file: FileDoc;
  onOpenPreview?: () => void;
};

const Card = ({ file, onOpenPreview }: CardProps) => {
  const size = typeof file.size === "number" ? file.size : Number(file.size || 0);
  const type = file.type || "other";
  const fileUrl = file.bucketFileId ? constructFileUrl(file.bucketFileId) : (file.url as string) || "#";

  const content = (
    <>
      <div className="relative">
        <Thumbnail
          type={type}
          extension={file.extension ?? ""}
          url={file.url ?? ""}
          className="h-24 w-full"
          imageClassName="h-24 w-full object-cover"
        />
      </div>
      <p className="file-card-title">{file.name}</p>
      <div className="file-card-meta">
        <FormattedDateTime isoString={file.$updatedAt} />
        <span>{convertFileSize(size)}</span>
      </div>
    </>
  );

  return (
    <div className="file-card relative">
      {onOpenPreview ? (
        <button type="button" onClick={onOpenPreview} className="block w-full text-left">
          {content}
        </button>
      ) : (
        <Link href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
          {content}
        </Link>
      )}
      <div
        className="absolute right-2 top-2"
        onClick={(e) => e.preventDefault()}
      >
        <ActionDropdown file={file} />
      </div>
    </div>
  );
};

export default Card;
