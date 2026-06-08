export const REP_NAV_ITEMS = [
  { href: "/rep/map", label: "Map" },
  { href: "/rep/calls", label: "Calls" },
  { href: "/rep/pipeline", label: "Pipeline" },
  { href: "/rep/history", label: "Knock history" },
  { href: "/rep/profile", label: "My profile" },
] as const;

export function isRepNavActive(pathname: string, href: string): boolean {
  if (href === "/rep/map") {
    return pathname === "/rep/map";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
