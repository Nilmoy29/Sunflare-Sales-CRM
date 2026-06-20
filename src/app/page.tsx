import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-brand-navy px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full bg-amber-500/10 blur-3xl"
          />
          <img
            src="/logo_branding.png"
            alt="Sunflare Solar"
            width={320}
            height={96}
            className="h-auto w-full max-w-[280px]"
          />
        </div>

        <p className="mt-8 text-pretty text-sm leading-relaxed text-white/55 sm:text-base">
          Field sales platform for solar canvassing and cold calling
        </p>

        <nav className="mt-10 flex flex-col items-center gap-5">
          <Link
            className="rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-orange-400"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="text-xs text-white/35 transition hover:text-white/55"
            href="/api/v1/health"
          >
            API health
          </Link>
        </nav>
      </div>
    </div>
  );
}
