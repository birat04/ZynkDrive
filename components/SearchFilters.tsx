"use client";

import { useState } from "react";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdvancedSearchOptions } from "@/lib/actions/search.actions";

export type SearchFilterValues = Pick<
  AdvancedSearchOptions,
  "fileType" | "minSize" | "maxSize" | "dateFrom" | "dateTo" | "starred"
>;

type SearchFiltersProps = {
  values: SearchFilterValues;
  onChange: (values: SearchFilterValues) => void;
};

const SearchFilters = ({ values, onChange }: SearchFiltersProps) => {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<SearchFilterValues>) => {
    onChange({ ...values, ...patch });
  };

  const clearFilters = () => {
    onChange({});
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((current) => !current)}>
        <Filter className="mr-2 h-4 w-4" />
        Filters
      </Button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-light-200 bg-white p-4 shadow-drop-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>File type</Label>
              <Select
                value={values.fileType || "all"}
                onValueChange={(value) =>
                  update({ fileType: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger className="shad-input">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="min-size-mb">Min size (MB)</Label>
                <Input
                  id="min-size-mb"
                  type="number"
                  min={0}
                  value={values.minSize ? Math.round(values.minSize / (1024 * 1024)) : ""}
                  onChange={(event) =>
                    update({
                      minSize: event.target.value
                        ? Number(event.target.value) * 1024 * 1024
                        : undefined,
                    })
                  }
                  className="shad-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-size-mb">Max size (MB)</Label>
                <Input
                  id="max-size-mb"
                  type="number"
                  min={0}
                  value={values.maxSize ? Math.round(values.maxSize / (1024 * 1024)) : ""}
                  onChange={(event) =>
                    update({
                      maxSize: event.target.value
                        ? Number(event.target.value) * 1024 * 1024
                        : undefined,
                    })
                  }
                  className="shad-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="date-from">From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={values.dateFrom ? values.dateFrom.toISOString().slice(0, 10) : ""}
                  onChange={(event) =>
                    update({
                      dateFrom: event.target.value ? new Date(event.target.value) : undefined,
                    })
                  }
                  className="shad-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={values.dateTo ? values.dateTo.toISOString().slice(0, 10) : ""}
                  onChange={(event) =>
                    update({
                      dateTo: event.target.value ? new Date(event.target.value) : undefined,
                    })
                  }
                  className="shad-input"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-light-100">
              <input
                type="checkbox"
                checked={Boolean(values.starred)}
                onChange={(event) => update({ starred: event.target.checked || undefined })}
                className="h-4 w-4 rounded border-light-200"
              />
              Starred only
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                Clear
              </Button>
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SearchFilters;
