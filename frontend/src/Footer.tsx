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

          {/* Right: Facebook + data source */}
          <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
            <div className="mb-3">
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === "np" ? "हामीलाई फलो गर्नुहोस्" : "Follow Us"}
              </div>
              <a
                href="https://www.facebook.com/nepalvoteslive"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
                {lang === "np" ? "फेसबुकमा फलो गर्नुहोस्" : "Follow us on Facebook"}
              </a>
            </div>
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
