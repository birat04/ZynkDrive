"use client";

import { calculatePercentage, convertFileSize } from "@/lib/utils";

export const Chart = ({ used = 0 }: { used: number }) => {
  const percentage = Math.min(calculatePercentage(used), 100);

  return (
    <div className="chart">
      <div className="relative mx-auto h-[200px] w-[200px]">
        <div
          className="h-[200px] w-[200px] rounded-full"
          style={{
            background: `conic-gradient(#FA7275 ${percentage * 3.6}deg, #F2F5F9 0deg)`,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="chart-used">{percentage}%</span>
          <span className="chart-caption">Space used</span>
        </div>
      </div>
      <p className="mt-4 text-center text-[14px] text-light-200">
        {convertFileSize(used)} / 2 GB
      </p>
    </div>
  );
};
