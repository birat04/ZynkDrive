"use client";

import Image from "next/image";

type ShareQRCodeProps = {
  url: string;
  size?: number;
};

export const ShareQRCode = ({ url, size = 180 }: ShareQRCodeProps) => {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src={qrSrc}
        alt="Share QR code"
        width={size}
        height={size}
        className="rounded-lg border border-light-200 bg-white p-2"
        unoptimized
      />
      <p className="caption max-w-[220px] truncate text-light-200">{url}</p>
    </div>
  );
};
