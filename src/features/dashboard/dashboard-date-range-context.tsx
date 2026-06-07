"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import {
  isTodayRange,
  resolveDashboardDateRange,
} from "@/features/dashboard/resolve-dashboard-date-range";
import type { DashboardDatePreset } from "@/lib/validators/dashboard-date-range";
import { validateCustomDashboardDateRange } from "@/lib/validators/dashboard-date-range";

type DashboardDateRangeContextValue = {
  preset: DashboardDatePreset;
  /** Applied range — drives widget fetches */
  from: string;
  to: string;
  /** Draft values shown in custom date inputs */
  customFrom: string;
  customTo: string;
  label: string;
  isToday: boolean;
  customRangeError: string | null;
  setPreset: (preset: DashboardDatePreset) => void;
  setCustomRange: (from: string, to: string) => void;
};

const DashboardDateRangeContext =
  createContext<DashboardDateRangeContextValue | null>(null);

export function DashboardDateRangeProvider({
  children,
  defaultPreset = "today",
}: {
  children: ReactNode;
  defaultPreset?: DashboardDatePreset;
}) {
  const today = formatSydneyDateString(new Date());
  const [preset, setPresetState] = useState<DashboardDatePreset>(defaultPreset);
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [appliedCustomFrom, setAppliedCustomFrom] = useState(today);
  const [appliedCustomTo, setAppliedCustomTo] = useState(today);
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);

  const resolved = useMemo(() => {
    if (preset === "custom") {
      return resolveDashboardDateRange(
        "custom",
        appliedCustomFrom,
        appliedCustomTo,
      );
    }
    return resolveDashboardDateRange(preset);
  }, [preset, appliedCustomFrom, appliedCustomTo]);

  const isToday = useMemo(
    () =>
      preset === "today" ||
      (preset === "custom" && isTodayRange(resolved.from, resolved.to)),
    [preset, resolved.from, resolved.to],
  );

  const setPreset = useCallback((next: DashboardDatePreset) => {
    setPresetState(next);
    if (next !== "custom") {
      setCustomRangeError(null);
    }
  }, []);

  const setCustomRange = useCallback((from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
    setPresetState("custom");

    const validation = validateCustomDashboardDateRange(from, to);
    if (validation.ok) {
      setAppliedCustomFrom(from);
      setAppliedCustomTo(to);
      setCustomRangeError(null);
    } else {
      setCustomRangeError(validation.message);
    }
  }, []);

  const value = useMemo(
    (): DashboardDateRangeContextValue => ({
      preset,
      from: resolved.from,
      to: resolved.to,
      customFrom,
      customTo,
      label: resolved.label,
      isToday,
      customRangeError,
      setPreset,
      setCustomRange,
    }),
    [
      preset,
      customFrom,
      customTo,
      resolved.from,
      resolved.to,
      resolved.label,
      isToday,
      customRangeError,
      setPreset,
      setCustomRange,
    ],
  );

  return (
    <DashboardDateRangeContext.Provider value={value}>
      {children}
    </DashboardDateRangeContext.Provider>
  );
}

export function useDashboardDateRange(): DashboardDateRangeContextValue {
  const context = useContext(DashboardDateRangeContext);
  if (!context) {
    throw new Error(
      "useDashboardDateRange must be used within DashboardDateRangeProvider",
    );
  }
  return context;
}
