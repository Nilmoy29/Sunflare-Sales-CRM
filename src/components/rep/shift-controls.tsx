"use client";

type ShiftControlsProps = {
  isActive: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  geoWarning: string | null;
  pingWarning: string | null;
  onStart: () => void;
  onEnd: () => void;
};

export function ShiftControls({
  isActive,
  loading,
  busy,
  error,
  geoWarning,
  pingWarning,
  onStart,
  onEnd,
}: ShiftControlsProps) {
  const warnings = [error, geoWarning, pingWarning].filter(
    (message): message is string => Boolean(message),
  );

  return (
    <div
      className="flex max-w-[min(18rem,55vw)] flex-col items-end gap-2"
      aria-live="polite"
    >
      {warnings.map((message) => (
        <p
          key={message}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 shadow-sm"
        >
          {message}
        </p>
      ))}

      <div className="rounded-xl border border-zinc-300 bg-white p-3 shadow-lg">
        {loading ? (
          <p className="min-h-11 min-w-11 px-3 py-2 text-sm font-medium text-zinc-800">
            Loading shift…
          </p>
        ) : isActive ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
                aria-hidden
              />
              On shift
            </p>
            <button
              type="button"
              onClick={onEnd}
              disabled={busy}
              className="min-h-11 min-w-11 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {busy ? "Ending…" : "End Shift"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="min-h-11 min-w-11 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {busy ? "Starting…" : "Start Shift"}
          </button>
        )}
      </div>
    </div>
  );
}
