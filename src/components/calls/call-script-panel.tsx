type CallScriptPanelProps = {
  body: string;
};

export function CallScriptPanel({ body }: CallScriptPanelProps) {
  if (!body.trim()) {
    return null;
  }

  return (
    <details className="mt-4 rounded-lg border border-zinc-200 bg-white">
      <summary className="min-h-11 cursor-pointer list-none px-3 py-2 text-sm font-medium text-zinc-900 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex min-h-11 items-center">Call script</span>
      </summary>
      <div className="border-t border-zinc-200 px-3 py-3 text-sm text-zinc-700 whitespace-pre-wrap">
        {body}
      </div>
    </details>
  );
}
