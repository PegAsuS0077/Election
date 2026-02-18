type Props = {
  declared: number;
  total: number;
};

export default function ProgressBar({ declared, total }: Props) {
  const pct = Math.round((declared / total) * 100);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Declared seats</span>
        <span className="font-semibold text-slate-900 tabular-nums">
          {declared} / {total}
        </span>
      </div>

      <div className="mt-2 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-3 rounded-full bg-slate-900"
          style={{ width: `${(declared / total) * 100}%` }}
        />
      </div>

      <div className="mt-2 text-xs text-slate-500">{pct}% declared</div>
    </div>
  );
}
