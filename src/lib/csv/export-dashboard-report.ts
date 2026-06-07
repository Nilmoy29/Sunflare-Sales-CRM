import { buildCsv, type CsvCellValue } from "@/lib/csv/build-csv";
import { buildExportFilename } from "@/lib/csv/build-export-filename";
import { downloadCsv } from "@/lib/csv/download-csv";

export function exportDashboardReport(
  slug: string,
  from: string,
  to: string,
  headers: string[],
  rows: CsvCellValue[][],
): void {
  downloadCsv(
    buildExportFilename(slug, from, to),
    buildCsv(headers, rows),
  );
}
