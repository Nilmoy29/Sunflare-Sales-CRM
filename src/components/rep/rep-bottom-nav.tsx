"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/rep/map", label: "Map", match: (path: string) => path === "/rep/map" },
  {
    href: "/rep/calls",
    label: "Calls",
    match: (path: string) => path.startsWith("/rep/calls"),
  },
  {
    href: "/rep/pipeline",
    label: "Pipeline",
    match: (path: string) => path.startsWith("/rep/pipeline"),
  },
  {
    href: "/rep/history",
    label: "History",
    match: (path: string) => path.startsWith("/rep/history"),
  },
  {
    href: "/rep/profile",
    label: "Profile",
    match: (path: string) => path.startsWith("/rep/profile"),
  },
] as const;

export function RepBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-300 bg-white pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label="Rep navigation"
    >
      <div className="flex h-14 items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-center text-[11px] font-semibold leading-tight touch-manipulation ${
                active
                  ? "text-emerald-700"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`h-0.5 w-6 rounded-full ${active ? "bg-emerald-600" : "bg-transparent"}`}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
