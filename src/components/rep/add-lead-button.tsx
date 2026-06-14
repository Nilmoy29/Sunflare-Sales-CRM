"use client";

type AddLeadButtonProps = {
  disabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
};

const disabledHintId = "add-lead-disabled-hint";

export function AddLeadButton({
  disabled,
  disabledReason,
  onClick,
}: AddLeadButtonProps) {
  const hint =
    disabledReason ?? (disabled ? "Location unavailable" : null);

  return (
    <div className="flex max-w-[min(11rem,45vw)] flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-describedby={disabled && hint ? disabledHintId : undefined}
        className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-white shadow-lg ring-2 ring-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Add lead and book appointment"
      >
        <span aria-hidden className="text-2xl font-light leading-none">
          +
        </span>
      </button>
      {disabled && hint ? (
        <p
          id={disabledHintId}
          className="rounded-lg bg-amber-50 px-2 py-1 text-right text-xs text-amber-900 shadow-sm ring-1 ring-amber-200"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
