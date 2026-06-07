import { escapeCsvCell } from "@/lib/csv/escape-csv-cell";

export type CsvCellValue = string | number | null | undefined;

export function buildCsv(
  headers: string[],
  rows: CsvCellValue[][],
): string {
  const lines = [
    headers.map((header) => escapeCsvCell(header)).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}
