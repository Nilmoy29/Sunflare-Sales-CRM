"use client";

type CsvExportButtonProps = {
  disabled?: boolean;
  label?: string;
  onExport: () => void;
};

export function CsvExportButton({
  disabled = false,
  label = "Export CSV",
  onExport,
}: CsvExportButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={onExport}
      className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
