import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseStringify = (value: unknown) =>
  JSON.parse(JSON.stringify(value));

export const convertFileToUrl = (file: File) => URL.createObjectURL(file);

export const convertFileSize = (sizeInBytes: number, digits?: number) => {
  if (sizeInBytes < 1024) return sizeInBytes + " Bytes";
  if (sizeInBytes < 1024 * 1024)
    return (sizeInBytes / 1024).toFixed(digits || 1) + " KB";
  if (sizeInBytes < 1024 * 1024 * 1024)
    return (sizeInBytes / (1024 * 1024)).toFixed(digits || 1) + " MB";
  return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(digits || 2) + " GB";
};

export const calculateAngle = (sizeInBytes: number) => {
  const total = 2 * 1024 * 1024 * 1024;
  return Number(((sizeInBytes / total) * 360).toFixed(2));
};

export const calculatePercentage = (sizeInBytes: number) => {
  const total = 2 * 1024 * 1024 * 1024;
  return Number(((sizeInBytes / total) * 100).toFixed(1));
};

export const getFileType = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) return { type: "other", extension: "" };

  const documentExtensions = [
    "pdf",
    "doc",
    "docx",
    "txt",
    "xls",
    "xlsx",
    "csv",
    "rtf",
    "ods",
    "ppt",
    "odp",
    "md",
    "html",
    "htm",
    "epub",
    "pages",
    "fig",
    "psd",
    "ai",
    "indd",
    "xd",
    "sketch",
    "afdesign",
    "afphoto",
  ];

  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
  const videoExtensions = ["mp4", "avi", "mov", "mkv", "webm"];
  const audioExtensions = ["mp3", "wav", "ogg", "flac"];

  if (documentExtensions.includes(extension)) return { type: "document", extension };
  if (imageExtensions.includes(extension)) return { type: "image", extension };
  if (videoExtensions.includes(extension)) return { type: "video", extension };
  if (audioExtensions.includes(extension)) return { type: "audio", extension };
  return { type: "other", extension };
};

export const formatDateTime = (isoString: string | null | undefined) => {
  if (!isoString) return "—";

  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;

  const time = `${hours}:${minutes.toString().padStart(2, "0")}${period}`;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${time}, ${date.getDate()} ${monthNames[date.getMonth()]}`;
};

export const getFileIcon = (extension: string | undefined, type: FileType | string) => {
  switch (extension) {
    case "pdf":
      return "/assets/icons/file-pdf.svg";
    case "doc":
      return "/assets/icons/file-doc.svg";
    case "docx":
      return "/assets/icons/file-docx.svg";
    case "csv":
      return "/assets/icons/file-csv.svg";
    case "txt":
      return "/assets/icons/file-txt.svg";
    case "xls":
    case "xlsx":
      return "/assets/icons/file-document.svg";
    case "svg":
      return "/assets/icons/file-image.svg";
    case "mkv":
    case "mov":
    case "avi":
    case "wmv":
    case "mp4":
    case "flv":
    case "webm":
    case "m4v":
    case "3gp":
      return "/assets/icons/file-video.svg";
    case "mp3":
    case "mpeg":
    case "wav":
    case "aac":
    case "flac":
    case "ogg":
    case "wma":
    case "m4a":
    case "aiff":
    case "alac":
      return "/assets/icons/file-audio.svg";
    default:
      switch (type) {
        case "image":
          return "/assets/icons/file-image.svg";
        case "document":
          return "/assets/icons/file-document.svg";
        case "video":
          return "/assets/icons/file-video.svg";
        case "audio":
          return "/assets/icons/file-audio.svg";
        default:
          return "/assets/icons/file-other.svg";
      }
  }
};

export const constructFileUrl = (bucketFileId: string) =>
  `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_BUCKET}/files/${bucketFileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;

export const constructDownloadUrl = (bucketFileId: string) =>
  `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_BUCKET}/files/${bucketFileId}/download?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getUsageSummary = (totalSpace: any) => [
  {
    title: "Documents",
    size: totalSpace.document.size,
    latestDate: totalSpace.document.latestDate,
    icon: "/assets/icons/file-document-light.svg",
    url: "/documents",
  },
  {
    title: "Images",
    size: totalSpace.image.size,
    latestDate: totalSpace.image.latestDate,
    icon: "/assets/icons/file-image-light.svg",
    url: "/images",
  },
  {
    title: "Media",
    size: totalSpace.video.size + totalSpace.audio.size,
    latestDate:
      totalSpace.video.latestDate > totalSpace.audio.latestDate
        ? totalSpace.video.latestDate
        : totalSpace.audio.latestDate,
    icon: "/assets/icons/file-video-light.svg",
    url: "/media",
  },
  {
    title: "Others",
    size: totalSpace.other.size,
    latestDate: totalSpace.other.latestDate,
    icon: "/assets/icons/file-other-light.svg",
    url: "/others",
  },
];

export const getFileTypesParams = (type: string) => {
  switch (type) {
    case "documents":
      return ["document"];
    case "images":
      return ["image"];
    case "media":
      return ["video", "audio"];
    case "others":
      return ["other"];
    default:
      return ["document"];
  }
};
