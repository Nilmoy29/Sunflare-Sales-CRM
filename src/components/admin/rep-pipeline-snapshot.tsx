"use client";

import type { RepPipelineStageRow } from "@/lib/validators/rep-deep-dive";

type RepPipelineSnapshotProps = {
  stages: RepPipelineStageRow[];
  loading: boolean;
  error: string | null;
};

export function RepPipelineSnapshot({
  stages,
  loading,
  error,
}: RepPipelineSnapshotProps) {
  const maxCount = stages.reduce((max, stage) => Math.max(max, stage.count), 0);
  const totalLeads = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">Current pipeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live lead counts by stage (not filtered by date range)
        </p>
      </div>

      <div className="p-4">
        {error ? (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground ring-1 ring-border">
            {error}
          </p>
        ) : null}

        {loading && !error ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <div
                key={key}
                className="h-9 animate-pulse rounded bg-secondary"
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && stages.length === 0 ? (
          <p className="rounded-lg bg-secondary px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            No pipeline data
          </p>
        ) : null}

        {!loading && !error && stages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="pb-2 pr-4">
                    Stage
                  </th>
                  <th scope="col" className="pb-2 pr-4 text-right">
                    Count
                  </th>
                  <th scope="col" className="pb-2">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {stages.map((stage) => {
                  const widthPercent =
                    maxCount > 0
                      ? Math.max(4, Math.round((stage.count / maxCount) * 100))
                      : 0;

                  return (
                    <tr key={stage.stage_key}>
                      <th
                        scope="row"
                        className="py-2.5 pr-4 font-medium text-foreground"
                      >
                        {stage.label}
                      </th>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">
                        {stage.count}
                      </td>
                      <td className="py-2.5">
                        <div
                          className="h-3 rounded bg-zinc-800"
                          style={{ width: `${widthPercent}%` }}
                          role="presentation"
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && stages.length > 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {totalLeads} active lead{totalLeads === 1 ? "" : "s"} total
          </p>
        ) : null}
      </div>
    </section>
  );
}
