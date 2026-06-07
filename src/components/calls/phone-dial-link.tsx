import type { MouseEvent, ReactNode } from "react";
import { toTelHref } from "@/lib/phone/to-tel-href";

type PhoneDialLinkProps = {
  phone: string | null | undefined;
  children: ReactNode;
  className?: string;
};

export function PhoneDialLink({
  phone,
  children,
  className = "",
}: PhoneDialLinkProps) {
  const href = toTelHref(phone);

  if (!href) {
    return <>{children}</>;
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`inline-flex min-h-11 items-center text-blue-700 underline hover:text-blue-900 ${className}`.trim()}
    >
      {children}
    </a>
  );
}
