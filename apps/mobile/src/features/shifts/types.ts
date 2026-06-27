export const GPS_PING_INTERVAL_MS = 120_000;

export const GPS_BACKGROUND_TASK = "SUNFLARE_GPS_PINGS";

export type ShiftSummary = {
  id: string;
  started_at: string;
  ended_at: string | null;
};

export type RepShiftSummary = {
  date: string;
  doors: number;
  door_outcomes: { outcome: string; count: number }[];
  calls: number;
  leads_added: number;
  appointments_set: number;
};

export type ShiftEndResponse = {
  id: string;
  started_at: string;
  ended_at: string;
  shift_summary: RepShiftSummary;
};
