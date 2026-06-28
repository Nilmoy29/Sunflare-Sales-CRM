"use client";

export type PipelineListView = "bookings" | "overdue_follow_ups";

type PipelineViewToggleProps = {
  view: PipelineListView;
  overdueCount: number;
  onChange: (view: PipelineListView) => void;
};

export function PipelineViewToggle({
  view,
  overdueCount,
  onChange,
}: PipelineViewToggleProps) {
  return (
    <section
      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pipeline list view"
    >
      <p className="text-sm font-medium text-foreground">List view</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("bookings")}
          className={`min-h-10 rounded-lg px-4 py-1.5 text-sm font-semibold ring-2 ${
            view === "bookings"
              ? "bg-accent text-accent-foreground ring-accent"
              : "bg-card text-muted-foreground ring-border"
          }`}
        >
          All bookings
        </button>
        <button
          type="button"
          onClick={() => onChange("overdue_follow_ups")}
          className={`min-h-10 rounded-lg px-4 py-1.5 text-sm font-semibold ring-2 ${
            view === "overdue_follow_ups"
              ? "bg-red-500/20 text-red-400 ring-red-500/50"
              : "bg-card text-muted-foreground ring-border"
          }`}
        >
          Overdue follow-ups
          {overdueCount > 0 ? (
            <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-red-500/25 px-1.5 text-xs">
              {overdueCount}
            </span>
          ) : null}
        </button>
      </div>
    </section>
  );
}
