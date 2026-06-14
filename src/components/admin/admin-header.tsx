"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

  return (
    <header className="relative shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] lg:px-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Admin
          </p>
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
        </div>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Admin navigation"
        >
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-secondary font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                href={link.href}
              >
                {link.label}
              </Link>
            );
          })}
          <SignOutButton />
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <SignOutButton className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted" />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-secondary text-sm font-semibold text-foreground touch-manipulation"
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
          className="border-t border-border bg-card px-4 py-2 lg:hidden"
          aria-label="Admin navigation"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex min-h-11 items-center rounded-lg px-2 text-sm font-medium touch-manipulation ${
                      active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground"
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
