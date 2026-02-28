import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { AuroraBackground } from "./ui/aurora-background";
import Footer from "../Footer";
import { t } from "../i18n";
export { PROVINCE_COLORS, PARTY_HEX } from "../lib/constants";

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// ── Nav links ─────────────────────────────────────────────────────────────────
interface NavLink { path: string; labelEn: string; labelNp: string; icon: string }
const NAV_LINKS: NavLink[] = [
  { path: "/",           labelEn: "Home",        labelNp: "गृहपृष्ठ",        icon: "🏠" },
  { path: "/explore",    labelEn: "Explore",     labelNp: "अन्वेषण",          icon: "◈" },
  { path: "/map",        labelEn: "Map",         labelNp: "नक्सा",            icon: "🗺️" },
  { path: "/parties",    labelEn: "Parties",     labelNp: "दलहरू",            icon: "◉" },
  { path: "/candidates", labelEn: "Candidates",  labelNp: "उम्मेद्वारहरू",   icon: "👤" },
];

// ── Layout props ──────────────────────────────────────────────────────────────
interface LayoutProps {
  children: ReactNode;
  title: string;
  titleNp: string;
  subtitle?: string;
  subtitleNp?: string;
  badge?: ReactNode;
  showStats?: boolean;
  statsContent?: ReactNode;
}

export default function Layout({
  children,
  title,
  titleNp,
  subtitle,
  subtitleNp,
  badge,
  showStats = false,
  statsContent,
}: LayoutProps) {
  const { dark, toggleDark, lang, toggleLang } = useElectionStore();
  const results = useElectionStore((s) => s.results);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Keep dark class in sync
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const hasLiveData = results.some((r) => r.status !== "PENDING" && r.votesCast > 0);
  const displayTitle = lang === "np" ? titleNp : title;
  const displaySub   = lang === "np" ? subtitleNp : subtitle;

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-[#080e1a]"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* ── Top shimmer bar ─────────────────────────────────────────────── */}
      <div className="h-0.5 w-full progress-shimmer" />

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300
          ${scrolled
            ? "bg-white/90 dark:bg-[#080e1a]/90 backdrop-blur-xl shadow-sm shadow-black/5 border-b border-slate-200/80 dark:border-slate-800/80"
            : "bg-white/70 dark:bg-[#080e1a]/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 min-w-0 shrink-0">
            <img
              src="https://flagcdn.com/w40/np.png"
              srcSet="https://flagcdn.com/w80/np.png 2x"
              width="28"
              height="auto"
              alt="Nepal flag"
              className="rounded-sm shrink-0"
            />
            <span
              className="font-bold text-[13px] sm:text-[14px] tracking-tight text-slate-900 dark:text-slate-100 leading-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Nepal Election Results 2082{" "}
              <span className="text-[#2563eb]">(2026)</span>
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-normal">
                {" "}– Live Vote Count
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              const label = lang === "np" ? link.labelNp : link.labelEn;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all
                    ${isActive
                      ? "text-[#2563eb] bg-blue-50 dark:bg-blue-950/40 dark:text-[#3b82f6]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger (sm:hidden) */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="sm:hidden h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/80
                       bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400
                       hover:border-[#2563eb]/50 hover:text-[#2563eb] transition-all active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Right controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasLiveData && (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:text-red-400 tracking-wide uppercase mr-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" style={{ animation: "live-pulse 1.4s ease-in-out infinite" }} />
                {t("live", lang)}
              </span>
            )}
            <button
              type="button"
              onClick={toggleLang}
              title={lang === "en" ? "Switch to Nepali" : "अंग्रेजीमा जानुस्"}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80
                         bg-white dark:bg-slate-800/60 text-[12px] font-medium
                         text-slate-700 dark:text-slate-300
                         hover:border-[#2563eb]/50 hover:text-[#2563eb] dark:hover:border-[#3b82f6]/50 dark:hover:text-[#3b82f6]
                         transition-all active:scale-95"
            >
              {lang === "en" ? "🇳🇵 NP" : "🇬🇧 EN"}
            </button>
            <button
              type="button"
              onClick={toggleDark}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/80
                         bg-white dark:bg-slate-800/60
                         text-slate-500 dark:text-slate-400
                         hover:border-[#2563eb]/50 hover:text-[#2563eb] dark:hover:border-[#3b82f6]/50 dark:hover:text-[#3b82f6]
                         transition-all active:scale-95"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Aurora hero ───────────────────────────────────────────────────── */}
      <AuroraBackground
        className="h-auto bg-[#060d1f] dark:bg-[#030810] text-white items-start justify-start"
        showRadialGradient
      >
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          {badge && <div className="mb-4">{badge}</div>}
          <h1
            className="text-2xl sm:text-4xl font-bold leading-tight tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            <span className="text-white/85">{displayTitle.split(" ").slice(0, -1).join(" ")} </span>
            <span className="text-[#3b82f6]">{displayTitle.split(" ").slice(-1)[0]}</span>
          </h1>
          {displaySub && (
            <p className="mt-2 text-sm text-white/50 font-light tracking-wide">{displaySub}</p>
          )}
        </div>
      </AuroraBackground>

      {/* ── Optional stats strip ──────────────────────────────────────────── */}
      {showStats && statsContent && (
        <div className="bg-white dark:bg-[#0c1525] border-b border-slate-200 dark:border-slate-800/80">
          {statsContent}
        </div>
      )}

      {/* ── Page content ──────────────────────────────────────────────────── */}
      {children}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <Footer lang={lang} />

      {/* ── Mobile side drawer ────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`sm:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300
          ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <div
        className={`sm:hidden fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col
          bg-white dark:bg-[#0c1525] border-r border-slate-200 dark:border-slate-800/80
          shadow-2xl transition-transform duration-300 ease-in-out
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Navigation drawer"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <img
              src="https://flagcdn.com/w40/np.png"
              width="22"
              height="auto"
              alt="Nepal flag"
              className="rounded-sm"
            />
            <span className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Sora', sans-serif" }}>
              Nepal 2082
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500
                       hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            const label = lang === "np" ? link.labelNp : link.labelEn;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all
                  ${isActive
                    ? "bg-blue-50 dark:bg-blue-950/40 text-[#2563eb] dark:text-[#3b82f6]"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
              >
                <span className="text-xl w-7 text-center leading-none">{link.icon}</span>
                <span className="text-[14px] font-medium">{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2563eb] dark:bg-[#3b82f6]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer controls */}
        <div className="shrink-0 px-4 py-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLang}
            className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700/80
                       bg-slate-50 dark:bg-slate-800/60 text-[12px] font-medium
                       text-slate-700 dark:text-slate-300 hover:border-[#2563eb]/50 hover:text-[#2563eb] transition-all"
          >
            {lang === "en" ? "🇳🇵 नेपाली" : "🇬🇧 English"}
          </button>
          <button
            type="button"
            onClick={toggleDark}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/80
                       bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400
                       hover:border-[#2563eb]/50 hover:text-[#2563eb] transition-all"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
