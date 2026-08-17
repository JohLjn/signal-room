import { LocalDateTime } from "@/features/incidents/components/local-date-time";

interface LastUpdatedProps {
  value: string;
}

export function LastUpdated({ value }: LastUpdatedProps) {
  return <LocalDateTime value={value} />;
}
