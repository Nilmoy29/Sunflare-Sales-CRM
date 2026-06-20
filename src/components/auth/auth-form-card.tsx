import type { ReactNode } from "react";

export function AuthFormCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-2xl shadow-black/25">
      {children}
    </div>
  );
}
