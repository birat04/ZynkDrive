import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const FormattedDateTime = ({
  date,
  className,
}: {
  date: string | null | undefined;
  className?: string;
}) => {
  return <span className={cn(className)}>{formatDateTime(date)}</span>;
};
