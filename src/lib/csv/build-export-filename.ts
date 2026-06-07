export function buildExportFilename(
  slug: string,
  from: string,
  to: string,
): string {
  return `sunflare-${slug}-${from}-${to}.csv`;
}
