"use client";

import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

import { calculatePercentage, convertFileSize } from "@/lib/utils";

export const Chart = ({ used = 0 }: { used: number }) => {
  const total = 2 * 1024 * 1024 * 1024;
  const percentage = Math.min(calculatePercentage(used), 100);
  const data = [{ name: "Storage", used: Math.max(used, 0), total }];

  return (
    <div className="chart">
      <div className="relative mx-auto h-[220px] w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            startAngle={90}
            endAngle={-270}
            innerRadius="70%"
            outerRadius="95%"
            barSize={14}
            cx="50%"
            cy="50%"
          >
            <RadialBar
              dataKey="used"
              cornerRadius={10}
              fill="#FA7275"
              background={{ fill: "#F2F5F9" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
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
