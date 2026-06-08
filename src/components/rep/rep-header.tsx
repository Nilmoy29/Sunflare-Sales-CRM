"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { isRepNavActive, REP_NAV_ITEMS } from "@/components/rep/rep-nav-items";

type RepHeaderProps = {
  name: string;
};

function ThreeDotsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden
    >
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

export function RepHeader({ name }: RepHeaderProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarOpen, closeSidebar]);

  return (
    <>
      <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-zinc-300 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
            Rep
          </p>
          <p className="truncate text-sm font-semibold text-zinc-950">{name}</p>
        </div>

        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-800 touch-manipulation hover:bg-zinc-50"
          aria-label="Open rep menu"
          aria-expanded={sidebarOpen}
          aria-controls="rep-sidebar"
        >
          <ThreeDotsIcon />
        </button>
      </header>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close rep menu"
            onClick={closeSidebar}
          />

          <aside
            id="rep-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="Rep navigation"
            className="relative flex h-full w-[min(18rem,85vw)] flex-col border-l border-zinc-300 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
                  Menu
                </p>
                <p className="truncate text-sm font-semibold text-zinc-950">
                  {name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sm font-semibold text-zinc-700 touch-manipulation hover:bg-zinc-100"
                aria-label="Close menu"
              >
                Close
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Rep navigation">
              <ul className="flex flex-col gap-1">
                {REP_NAV_ITEMS.map((item) => {
                  const active = isRepNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold touch-manipulation ${
                          active
                            ? "bg-emerald-50 text-emerald-800"
                            : "text-zinc-800 hover:bg-zinc-100"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border-t border-zinc-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              <SignOutButton />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
