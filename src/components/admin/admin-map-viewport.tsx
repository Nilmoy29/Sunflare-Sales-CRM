"use client";

import type { ReactNode } from "react";

type AdminMapViewportProps = {
  children: ReactNode;
};

/**
 * Fixed-height map slot on mobile (dvh), flex-fill on desktop.
 * Map children should use `absolute inset-0` to fill this frame.
 */
export function AdminMapViewport({ children }: AdminMapViewportProps) {
  return (
    <div
      className="relative w-full shrink-0 overflow-hidden
        h-[50dvh] min-h-[300px] max-h-[480px]
        lg:h-auto lg:max-h-none lg:min-h-0 lg:flex-1 lg:basis-0"
    >
      {children}
    </div>
  );
}
