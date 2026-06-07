import { z } from "zod";
import { sydneyDateStringSchema } from "@/lib/validators/dashboard-date-range";

export const leaderboardMetricSchema = z.enum([
  "doors",
  "calls",
  "leads_added",
  "appointments_set",
]);

export type LeaderboardMetric = z.infer<typeof leaderboardMetricSchema>;

export const LEADERBOARD_METRIC_OPTIONS: {
  id: LeaderboardMetric;
  label: string;
}[] = [
  { id: "doors", label: "Doors" },
  { id: "calls", label: "Calls" },
  { id: "leads_added", label: "Leads" },
  { id: "appointments_set", label: "Appts" },
];

export const LEADERBOARD_METRIC_LABELS: Record<LeaderboardMetric, string> = {
  doors: "Doors",
  calls: "Calls",
  leads_added: "Leads",
  appointments_set: "Appts",
};

export const leaderboardRowSchema = z.object({
  rank: z.number().int().positive(),
  rep_id: z.string().uuid(),
  rep_name: z.string(),
  value: z.coerce.number().int().nonnegative(),
});

export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>;

export const leaderboardViewSchema = z.object({
  from: sydneyDateStringSchema,
  to: sydneyDateStringSchema,
  metric: leaderboardMetricSchema,
  rows: z.array(leaderboardRowSchema),
});

export type LeaderboardView = z.infer<typeof leaderboardViewSchema>;
