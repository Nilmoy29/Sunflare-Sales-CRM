"use client";

type OfflinePendingIndicatorProps = {
  count: number;
};

export function OfflinePendingIndicator({ count }: OfflinePendingIndicatorProps) {
  if (count <= 0) {
    return null;
  }

  const label =
    count === 1
      ? "1 knock waiting to sync"
      : `${count} knocks waiting to sync`;

  return (
    <p
      className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm"
      aria-live="polite"
    >
      {label}
    </p>
  );
}
