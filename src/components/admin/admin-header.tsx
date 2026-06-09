"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/pipeline", label: "Pipeline" },
  { href: "/admin/map", label: "Map" },
  { href: "/admin/territories", label: "Territories" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/settings", label: "Settings" },
] as const;

type AdminHeaderProps = {
  name: string;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminHeader({ name }: AdminHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="relative shrink-0 border-b border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Admin
          </p>
          <p className="truncate text-sm font-medium text-zinc-900">{name}</p>
        </div>

        <nav
          className="hidden items-center gap-3 lg:flex"
          aria-label="Admin navigation"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              className={`text-sm underline hover:text-zinc-900 ${
                isActive(pathname, link.href)
                  ? "font-semibold text-zinc-900"
                  : "text-zinc-600"
              }`}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
          <SignOutButton />
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <SignOutButton />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-800 touch-manipulation"
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-nav"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="admin-mobile-nav"
          className="border-t border-zinc-200 bg-white px-4 py-2 lg:hidden"
          aria-label="Admin navigation"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex min-h-11 items-center text-sm font-medium touch-manipulation ${
                      active ? "text-zinc-900" : "text-zinc-600"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
