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
      className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
