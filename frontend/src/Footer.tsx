import { Link } from "react-router-dom";
import { t } from "./i18n";
import type { Lang } from "./i18n";

export default function Footer({ lang = "en" }: { lang?: Lang }) {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: branding */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🇳🇵</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {lang === "np" ? "प्रतिनिधि सभा निर्वाचन २०८२" : "Nepal HoR Election 2026"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              {t("footerDisclaimer", lang)}
            </p>
          </div>

          {/* Right: data source */}
          <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("dataSource", lang)}
            </div>
            <a
              href="https://result.election.gov.np"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-blue-600 dark:text-blue-400 break-all"
            >
              result.election.gov.np
            </a>
            <div className="mt-2">
              {lang === "np" ? "हरेक ३० सेकेन्डमा अपडेट" : "Updates every 30 seconds"}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-600">
          <span>© 2026 nepalvotes.live</span>
          <nav className="flex items-center gap-3">
            <Link to="/about" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {lang === "np" ? "हाम्रोबारे" : "About"}
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacy-policy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {lang === "np" ? "गोपनीयता नीति" : "Privacy Policy"}
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/contact" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {lang === "np" ? "सम्पर्क" : "Contact"}
            </Link>
          </nav>
          <span>
            {lang === "np" ? "डेटा स्रोत: " : "Data Source: "}
            <a
              href="https://result.election.gov.np"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 dark:hover:text-slate-300 underline transition-colors"
            >
              {lang === "np" ? "निर्वाचन आयोग नेपाल" : "Election Commission of Nepal"}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
