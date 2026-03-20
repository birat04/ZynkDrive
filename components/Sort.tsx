"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sortTypes } from "@/constants";

const Sort = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = searchParams.get("sort") ?? "$createdAt-desc";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={sort} onValueChange={handleChange}>
      <SelectTrigger className="sort-select">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {sortTypes.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default Sort;
