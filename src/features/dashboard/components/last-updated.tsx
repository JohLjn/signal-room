"use client";

interface LastUpdatedProps {
  value: string;
}

export function LastUpdated({ value }: LastUpdatedProps) {
  const instant = new Date(value);
  const label = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(instant);

  return (
    <time dateTime={value} suppressHydrationWarning>
      {label}
    </time>
  );
}
