import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const FormattedDateTime = ({
  isoString,
  className,
}: {
  isoString: string | null | undefined;
  className?: string;
}) => {
  return <p className={cn(className)}>{formatDateTime(isoString)}</p>;
};
