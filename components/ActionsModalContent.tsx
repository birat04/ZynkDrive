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
  onSharedUsersChange: (sharedUsers: Array<{ email: string; role: "viewer" | "editor" }>) => void;
  onRemove: (email: string) => void;
}

const parseSharedUsers = (users: string[]) => {
  const roles = new Map<string, "viewer" | "editor">();

  for (const value of users) {
    const editorMatch = value.match(/^role:(.+):editor$/);
    if (editorMatch?.[1]) {
      roles.set(editorMatch[1].toLowerCase(), "editor");
      continue;
    }

    if (!value.includes("@")) continue;

    const email = value.toLowerCase();
    if (!roles.has(email)) {
      roles.set(email, "viewer");
    }
  }

  return Array.from(roles.entries()).map(([email, role]) => ({ email, role }));
};

export const ShareInput = ({ file, onSharedUsersChange, onRemove }: ShareInputProps) => {
  const sharedUsers = parseSharedUsers(file.users ?? []);
  const rawEmails = sharedUsers.map((user) => user.email).join(", ");

  const handleEmailsChange = (value: string) => {
    const emails = value
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const updated = emails.map((email) => {
      const existing = sharedUsers.find((entry) => entry.email === email);
      return { email, role: existing?.role ?? "viewer" };
    });

    onSharedUsersChange(updated);
  };

  const handleRoleChange = (email: string, role: "viewer" | "editor") => {
    const updated = sharedUsers.map((entry) =>
      entry.email === email ? { ...entry, role } : entry
    );
    onSharedUsersChange(updated);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-light-100">
        Share file with other users
      </label>
      <input
        type="text"
        value={rawEmails}
        placeholder="Enter emails separated by comma"
        onChange={(e) => {
          handleEmailsChange(e.target.value);
        }}
        className="shad-input w-full"
      />
      {sharedUsers.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-light-200">Shared with {sharedUsers.length} user(s)</span>
          {sharedUsers.map((entry) => (
            <div
              key={entry.email}
              className="flex items-center justify-between rounded-lg bg-light-300 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-light-100">{entry.email}</span>
                <select
                  value={entry.role}
                  onChange={(e) => handleRoleChange(entry.email, e.target.value as "viewer" | "editor")}
                  className="h-8 rounded-full border border-light-200 bg-white px-3 text-xs"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => onRemove(entry.email)}
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
