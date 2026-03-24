import { Thumbnail } from "@/components/Thumbnail";
import { FormattedDateTime } from "@/components/FormattedDateTime";
import { convertFileSize } from "@/lib/utils";

type FileDoc = {
  $id: string;
  name: string;
  type?: string;
  extension?: string;
  url?: string;
  size?: number;
  $createdAt?: string;
  $updatedAt?: string;
  users?: string[];
  owner?: string | { fullName?: string };
  [key: string]: unknown;
};

export const FileDetails = ({ file }: { file: FileDoc }) => {
  const size = typeof file.size === "number" ? file.size : Number(file.size || 0);
  const ownerName =
    typeof file.owner === "string"
      ? file.owner
      : file.owner?.fullName || "Unknown";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Thumbnail
          type={file.type || "other"}
          extension={file.extension || ""}
          url={file.url ?? ""}
        />
        <span className="font-medium text-light-100">{file.name}</span>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-light-200">Format</span>
          <span className="text-light-100 uppercase">{file.extension || "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-light-200">Size</span>
          <span className="text-light-100">{convertFileSize(size)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-light-200">Owner</span>
          <span className="text-light-100">{ownerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-light-200">Last edit</span>
          <FormattedDateTime isoString={file.$updatedAt || file.$createdAt} />
        </div>
      </div>
    </div>
  );
};

interface ShareInputProps {
  file: FileDoc & { users?: string[] };
  onEmailsChange: (emails: string[]) => void;
  onRemove: (email: string) => void;
}

export const ShareInput = ({ file, onEmailsChange, onRemove }: ShareInputProps) => {
  const users = file.users ?? [];

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-light-100">
        Share file with other users
      </label>
      <input
        type="text"
        value={users.join(", ")}
        placeholder="Enter emails separated by comma"
        onChange={(e) => {
          const parsed = e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          onEmailsChange(parsed);
        }}
        className="shad-input w-full"
      />
      {users.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-light-200">Shared with {users.length} user(s)</span>
          {users.map((email) => (
            <div
              key={email}
              className="flex items-center justify-between rounded-lg bg-light-300 px-3 py-2"
            >
              <span className="text-sm text-light-100">{email}</span>
              <button
                type="button"
                onClick={() => onRemove(email)}
                className="text-sm font-medium text-brand hover:text-brand-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
