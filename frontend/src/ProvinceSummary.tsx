import type { ConstituencyResult, Province } from "./mockData";

export default function ProvinceSummary({
  results,
  selectedProvince,
  onSelect,
}: {
  results: ConstituencyResult[];
  selectedProvince: "All" | Province;
  onSelect: (p: "All" | Province) => void;
}) {
  const provinces = Array.from(new Set(results.map((r) => r.province)));

  const cards = provinces
    .map((p) => {
      const rows = results.filter((r) => r.province === p);
      const declared = rows.filter((r) => r.status === "DECLARED").length;
      return { p, declared, total: rows.length };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Provinces
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Click a province to filter the table
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelect("All")}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 active:scale-95
            dark:hover:bg-slate-800
            ${
              selectedProvince === "All"
                ? "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            }`}
        >
          All
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {cards.map((c) => {
          const active = selectedProvince === c.p;
          const pct = c.total ? Math.round((c.declared / c.total) * 100) : 0;

          return (
            <button
              key={c.p}
              type="button"
              onClick={() => onSelect(c.p)}
              className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.99]
                ${
                  active
                    ? "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {c.p}
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {c.declared}/{c.total} declared
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
                <div
                  className="h-2 bg-slate-900 dark:bg-slate-100 transition-[width] duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
