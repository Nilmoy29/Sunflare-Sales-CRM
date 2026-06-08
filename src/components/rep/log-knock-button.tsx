"use client";

type LogKnockButtonProps = {
  disabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
};

const disabledHintId = "log-knock-disabled-hint";

export function LogKnockButton({
  disabled,
  disabledReason,
  onClick,
}: LogKnockButtonProps) {
  const hint =
    disabledReason ?? (disabled ? "Location unavailable" : null);

  return (
    <div className="absolute bottom-[5.25rem] left-4 z-10 flex max-w-[min(11rem,45vw)] flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-describedby={disabled && hint ? disabledHintId : undefined}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Log knock at my location"
      >
        Log knock
      </button>
      {disabled && hint ? (
        <p
          id={disabledHintId}
          className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900 shadow-sm ring-1 ring-amber-200"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
