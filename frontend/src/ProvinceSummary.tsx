import type { ConstituencyResult, Province } from "./types";
import { t, provinceName } from "./i18n";
import type { Lang } from "./i18n";

export default function ProvinceSummary({
  results,
  selectedProvince,
  onSelect,
  lang = "en",
}: {
  results: ConstituencyResult[];
  selectedProvince: "All" | Province;
  onSelect: (p: "All" | Province) => void;
  lang?: Lang;
}) {
  const provinceKeys = Array.from(new Set(results.map((r) => r.province)));

  const cards = provinceKeys
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
            {t("provinces", lang)}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t("clickToFilter", lang)}
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
          {t("all", lang)}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {cards.map((c) => {
          const active = selectedProvince === c.p;
          const pct = c.total ? Math.round((c.declared / c.total) * 100) : 0;
          const label = provinceName(c.p, lang);
          // Show both scripts when in Nepali mode: Nepali on top, English below
          const npLabel = provinceName(c.p, "np");
          const enLabel = provinceName(c.p, "en");

          return (
            <button
              key={c.p}
              type="button"
              onClick={() => onSelect(c.p)}
              title={lang === "np" ? `${npLabel} / ${enLabel}` : `${enLabel} / ${npLabel}`}
              className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.99]
                ${
                  active
                    ? "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {label}
              </div>
              {/* Secondary script shown as hint */}
              <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 leading-tight truncate">
                {lang === "np" ? enLabel : npLabel}
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {c.declared}/{c.total} {t("declared", lang)}
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
