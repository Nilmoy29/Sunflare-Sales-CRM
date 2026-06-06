"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
        <span className="text-3xl" aria-hidden>
          ☀️
        </span>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-600">
          Sunflare needs a connection for live map data. Any knocks you logged
          offline will sync automatically when you&apos;re back online.
        </p>
      </div>
      <button
        type="button"
        className="min-h-11 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600"
        onClick={() => window.location.reload()}
      >
        Try again
      </button>
    </div>
  );
}
