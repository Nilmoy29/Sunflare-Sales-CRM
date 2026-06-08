import Link from "next/link";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

const DESKTOP_LINKS = [
  { href: "/rep/map", label: "Map" },
  { href: "/rep/calls", label: "Calls" },
  { href: "/rep/pipeline", label: "Pipeline" },
  { href: "/rep/history", label: "Knock history" },
  { href: "/rep/profile", label: "My profile" },
] as const;

type RepHeaderProps = {
  name: string;
};

export function RepHeader({ name }: RepHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-zinc-300 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
          Rep
        </p>
        <p className="truncate text-sm font-semibold text-zinc-950">{name}</p>
      </div>
      <div className="hidden items-center gap-4 md:flex">
        {DESKTOP_LINKS.map((link) => (
          <Link
            key={link.href}
            className="text-sm font-medium text-zinc-800 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-950"
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
        <SignOutButton />
      </div>
      <div className="md:hidden">
        <SignOutButton />
      </div>
    </header>
  );
}
