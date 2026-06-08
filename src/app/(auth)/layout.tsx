export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 p-4 pb-safe pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:p-6">
      {children}
    </div>
  );
}
