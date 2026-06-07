"use client";

import { useRouter } from "next/navigation";
import type { RepListItem } from "@/features/admin/get-rep-profile";

type RepSelectorProps = {
  reps: RepListItem[];
  value: string;
};

export function RepSelector({ reps, value }: RepSelectorProps) {
  const router = useRouter();

  return (
    <label className="block text-sm">
      <span className="sr-only">Select rep</span>
      <select
        value={value}
        onChange={(event) => {
          router.push(`/admin/reps/${event.target.value}`);
        }}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
      >
        {reps.map((rep) => (
          <option key={rep.id} value={rep.id}>
            {rep.name}
          </option>
        ))}
      </select>
    </label>
  );
}
