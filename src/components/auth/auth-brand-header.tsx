import Link from "next/link";

type AuthBrandHeaderProps = {
  subtitle?: string;
};

export function AuthBrandHeader({ subtitle }: AuthBrandHeaderProps) {
  return (
    <div className="mb-8 text-center">
      <Link href="/" className="inline-block">
        <img
          src="/logo_branding.png"
          alt="Sunflare Solar"
          width={240}
          height={72}
          className="mx-auto h-auto w-full max-w-[200px]"
        />
      </Link>
      {subtitle ? (
        <p className="mt-4 text-sm text-white/55">{subtitle}</p>
      ) : null}
    </div>
  );
}
