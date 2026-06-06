import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Sunflare</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Solar CRM — field sales platform (v1 scaffold)
        </p>
      </div>
      <nav className="flex flex-wrap justify-center gap-4 text-sm">
        <Link
          className="rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800"
          href="/login"
        >
          Sign in
        </Link>
        <Link className="underline" href="/api/v1/health">
          API health
        </Link>
      </nav>
      <p className="max-w-md text-center text-xs text-zinc-500">
        Planning docs:{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          _bmad-output/planning-artifacts/
        </code>
      </p>
    </div>
  );
}
