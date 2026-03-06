import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useElectionStore } from "./store/electionStore";
import { provinceName, t } from "./i18n";
import { getParty } from "./lib/partyRegistry";
import { PROVINCE_COLORS } from "./lib/constants";
import { shouldTriggerSponsoredRedirect, SPONSORED_LINK_URL, openSponsoredLinkInNewTab } from "./lib/sponsoredGate";
import { ADSENSE_REVIEW_MODE } from "./lib/adsenseReviewMode";
import { RESULTS_MODE } from "./types";

import SummaryCards from "./SummaryCards";
import PrVotesBars from "./PrVotesBars";
import SeatShareBars from "./SeatShareBars";
import HotSeats from "./HotSeats";
import LatestUpdates from "./LatestUpdates";
import { PrVotesBarsSkeleton, SummaryCardsSkeleton, SeatShareBarsSkeleton } from "./Skeleton";
import Layout from "./components/Layout";
import InstallPrompt from "./components/InstallPrompt";
import PartySymbol from "./components/PartySymbol";

const FEATURED_CONSTITUENCY_CODES = ["Jhapa-5", "Sarlahi-4", "Sunsari-1"] as const;
const TRENDING_CONSTITUENCY_CODES = [
  "Jhapa-5",
  "Kathmandu-1",
  "Kathmandu-3",
  "Sarlahi-4",
  "Bhaktapur-2",
  "Sunsari-1",
  "Kathmandu-5",
  "Chitwan-3",
  "Chitwan-2",
  "Kathmandu-9",
] as const;
const SPONSORED_VARIANT_KEY = "sponsored_link_variant_v1";

function seatsToMajority(n: number) { return Math.floor(n / 2) + 1; }
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatConstituencyLabel(name: string) {
  return name.replace(/-(\d+)$/, " - $1");
}
function numberFmt(n: number) { return n.toLocaleString("en-IN"); }
function useCountdownTimer(targetDate: string) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(targetDate).getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(targetDate).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return remaining;
}

export default function App() {
  const { isLoading, setIsLoading, lang } = useElectionStore();
  const [sponsoredVariant] = useState<"live_updates" | "fast_digest">(() => {
    if (ADSENSE_REVIEW_MODE || typeof window === "undefined") return "live_updates";
    const saved = window.localStorage.getItem(SPONSORED_VARIANT_KEY);
    if (saved === "live_updates" || saved === "fast_digest") return saved;
    const next = Math.random() < 0.5 ? "live_updates" : "fast_digest";
    window.localStorage.setItem(SPONSORED_VARIANT_KEY, next);
    return next;
  });

  useEffect(() => {
    if (ADSENSE_REVIEW_MODE) return;
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", "sponsored_impression", {
      event_category: "advertising",
      event_label: "home_mid_card",
      sponsored_variant: sponsoredVariant,
      non_interaction: true,
    });
  }, [sponsoredVariant]);

  const handleSponsoredClick = () => {
    if (ADSENSE_REVIEW_MODE) return;
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", "sponsored_click", {
      event_category: "advertising",
      event_label: "home_mid_card",
      sponsored_variant: sponsoredVariant,
      value: 1,
    });
  };
  const handleFeaturedSeatClick = (e: React.MouseEvent<HTMLAnchorElement>, hasResult: boolean) => {
    if (ADSENSE_REVIEW_MODE) return;
    if (!hasResult || typeof window === "undefined") return;
    const shouldRedirect = shouldTriggerSponsoredRedirect();
    if (!shouldRedirect) return;

    e.preventDefault();

    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", "featured_gate_redirect", {
      event_category: "advertising",
      event_label: "featured_section_throttled_redirect",
      value: 1,
    });

    openSponsoredLinkInNewTab(SPONSORED_LINK_URL);
  };

  // Give archive data load a short window before assuming empty
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 8000);
    return () => clearTimeout(timer);
  }, [setIsLoading]);

  const results       = useElectionStore((s) => s.results);
  const seatTally     = useElectionStore((s) => s.seatTally);
  const declaredSeats = useElectionStore((s) => s.declaredSeats);
  const featuredFavorites = useElectionStore((s) => s.featuredFavorites);
  const toggleFeaturedFavorite = useElectionStore((s) => s.toggleFeaturedFavorite);
  const partyCount = new Set(
    results.flatMap((r) => r.candidates.map((c) => c.partyId)).filter((id) => id !== "IND"),
  ).size;


  const totalSeats = 275;
  const majority   = seatsToMajority(totalSeats);
  const msRemaining = useCountdownTimer("2026-03-05T00:00:00+05:45");
  const isElectionDay = msRemaining === 0;
  const countdownStr = (() => {
    const totalSec = Math.floor(msRemaining / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${String(d).padStart(2,"0")}d ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  })();

  const tallyRows = Object.entries(seatTally)
    .map(([partyId, v]) => ({ partyId, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);
  const lead      = tallyRows[0];
  const projected = lead && lead.total >= majority ? lead : null;

  const hasLiveData    = RESULTS_MODE === "live" && results.some((r) => r.votesCast > 0);
  const latestUpdatedMs = results.length > 0
    ? Math.max(...results.map((r) => Date.parse(r.lastUpdated)).filter((n) => Number.isFinite(n)))
    : 0;
  const lastUpdatedStr = latestUpdatedMs > 0 ? formatTime(new Date(latestUpdatedMs).toISOString()) : "—";
  const declaredPct    = Math.round((declaredSeats / 165) * 100);
  const featuredCodes = Array.from(
    new Set([...FEATURED_CONSTITUENCY_CODES, ...Array.from(featuredFavorites)]),
  );
  const featuredSeats = featuredCodes.map((code) => {
    const result = results.find(
      (r) => r.code === code || r.name.toLowerCase() === code.toLowerCase(),
    );
    const sorted = result ? [...result.candidates].sort((a, b) => b.votes - a.votes) : [];
    const top1 = sorted[0];
    const top2 = sorted[1];
    const topTwoTotal = top1 && top2 ? top1.votes + top2.votes : 0;
    const top1Pct = top1 && top2 && topTwoTotal > 0 ? (top1.votes / topTwoTotal) * 100 : 50;
    const isUserFeatured = featuredFavorites.has(code);
    return { code, result, top1, top2, top1Pct, isUserFeatured };
  });
  const trendingSeats = TRENDING_CONSTITUENCY_CODES.map((code) => {
    const result = results.find(
      (r) => r.code === code || r.name.toLowerCase() === code.toLowerCase(),
    );
    const label = lang === "np"
      ? result?.nameNp ?? formatConstituencyLabel(code)
      : result?.name ?? formatConstituencyLabel(code);
    return { code, result, label };
  });
  const featuredDesc = featuredFavorites.size > 0
    ? t("featuredSectionDescCustom", lang).replace("{n}", String(featuredFavorites.size))
    : t("featuredSectionDesc", lang);

  const statsContent = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex items-stretch divide-x divide-slate-100 dark:divide-slate-800">
        {([
          { value: "165", labelKey: "statsConstituencies", icon: "⬡", to: "/explore" },
          { value: "7",   labelKey: "statsProvinces",      icon: "◈", to: "/map" },
          { value: String(partyCount), labelKey: "statsParties", icon: "◉", to: "/parties" },
          { value: "275", labelKey: "statsTotalSeats",     icon: "◆", to: null },
        ] as const).map((s) => {
          const inner = (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>{s.value}</span>
                <span className="text-[10px] text-[#2563eb] dark:text-[#3b82f6] font-medium hidden sm:block">{s.icon}</span>
              </div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{t(s.labelKey, lang)}</span>
            </>
          );
          return s.to ? (
            <Link key={s.labelKey} to={s.to} className="flex-1 flex flex-col items-center justify-center py-3.5 gap-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              {inner}
            </Link>
          ) : (
            <div key={s.labelKey} className="flex-1 flex flex-col items-center justify-center py-3.5 gap-0.5">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );

  const heroBadge = (
    <div className="flex items-center gap-3 flex-wrap">
      {hasLiveData ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3.5 py-1 text-xs font-semibold text-green-400 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" style={{ animation: "live-pulse 1.4s ease-in-out infinite" }} />
          {t("live", lang)}
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-400 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {t("preElection", lang)}
        </span>
      )}
      <span className="text-[11px] text-white/30 tabular-nums">{t("lastUpdated", lang)} {lastUpdatedStr}</span>
    </div>
  );

  const sponsoredTitle = lang === "np"
    ? (sponsoredVariant === "live_updates" ? "त्वरित चुनाव अपडेट लिंक" : "छोटो चुनाव सारांश लिंक")
    : (sponsoredVariant === "live_updates" ? "Quick Election Update Link" : "Short Election Digest Link");
  const sponsoredDesc = lang === "np"
    ? (sponsoredVariant === "live_updates"
      ? "यो प्रायोजित लिंकले नयाँ ट्याबमा बाह्य अपडेट पृष्ठ खोल्छ।"
      : "यो प्रायोजित लिंकले नयाँ ट्याबमा छोटो बाह्य सामग्री खोल्छ।")
    : (sponsoredVariant === "live_updates"
      ? "This sponsored link opens an external updates page in a new tab."
      : "This sponsored link opens a short external digest page in a new tab.");
  const sponsoredCta = lang === "np"
    ? (sponsoredVariant === "live_updates" ? "अपडेट हेर्नुहोस्" : "डाइजेस्ट खोल्नुहोस्")
    : (sponsoredVariant === "live_updates" ? "Open Updates" : "Open Digest");

  return (
    <Layout
      title="Nepal House of Representatives"
      titleNp="प्रतिनिधि सभा निर्वाचन ⃦⃨⃨⃨"
      subtitle={"General Election · " + t("electionDate", lang)}
      subtitleNp={"सामान्य निर्वाचन · " + t("electionDate", lang)}
      badge={heroBadge}
      showStats
      statsContent={statsContent}
    >
      {projected && (
        <div className="bg-emerald-600 dark:bg-emerald-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2.5 text-white text-xs font-medium">
            <span className="shrink-0">🏆</span>
            <span>
              <span className="font-bold">{getParty(projected.partyId).nameEn}</span>
              {" "}{t("projectedGovt", lang).replace("{n}", String(majority))}
            </span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="overflow-x-auto border-y border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#0c1525]">
          <div className="flex min-w-max items-center text-sm">
            <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-100">
              {t("trendingConstituencies", lang)}
            </span>
            {trendingSeats.map(({ code, result, label }) => (
              <div key={code} className="flex items-center">
                <span className="mx-3 text-slate-300 dark:text-slate-700">|</span>
                <Link
                  to={`/constituency/${encodeURIComponent(result?.code ?? code)}`}
                  className="whitespace-nowrap text-slate-700 transition-colors hover:text-[#2563eb] dark:text-slate-300 dark:hover:text-[#3b82f6]"
                >
                  {label}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm dark:bg-[#0c1525] dark:border-slate-800/80">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              ⭐ {t("featuredSection", lang)}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{featuredDesc}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {featuredSeats.map(({ code, result, top1, top2, top1Pct, isUserFeatured }) => (
              <Link
                key={code}
                to={result ? `/constituency/${encodeURIComponent(result.code)}` : "/explore"}
                onClick={(e) => handleFeaturedSeatClick(e, Boolean(result))}
                className="block w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#2563eb]/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#3b82f6]/40"
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100 truncate">
                      {lang === "np" ? result?.nameNp ?? code : result?.name ?? code}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {result ? (
                        <>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PROVINCE_COLORS[result.province] ?? "bg-slate-100 text-slate-700"}`}>
                            {provinceName(result.province, lang)}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            result.status === "DECLARED"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}>
                            {result.status === "DECLARED"
                              ? (lang === "np" ? "घोषित" : "Declared")
                              : (lang === "np" ? "मतगणना" : "Counting")}
                          </span>
                        </>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {lang === "np" ? "डेटा पर्खिँदै" : "Waiting for data"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="self-start flex items-center gap-1.5">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {lang === "np" ? "विशेष" : "Featured"}
                    </span>
                    {isUserFeatured && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFeaturedFavorite(code);
                        }}
                        aria-label={t("removeFromFeatured", lang)}
                        title={t("removeFromFeatured", lang)}
                        className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-colors hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-500/50 dark:hover:text-red-300"
                      >
                        {lang === "np" ? "हटाउनुहोस्" : "Remove"}
                      </button>
                    )}
                  </div>
                </div>

                {result && top1 && top2 ? (
                  <>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <PartySymbol partyId={top1.partyId} size="md" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{lang === "np" ? top1.nameNp : top1.name}</div>
                          <div className="truncate text-[10px] text-slate-400 dark:text-slate-500">{(lang === "np" ? top1.partyName : getParty(top1.partyId).nameEn).split(" (")[0]}</div>
                        </div>
                      </div>
                      <span className="shrink-0 tabular-nums text-sm font-bold text-slate-800 dark:text-slate-100">{numberFmt(top1.votes)}</span>
                    </div>

                    <div className="relative mb-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className="absolute left-0 top-0 h-full rounded-l-full" style={{ width: `${top1Pct}%`, backgroundColor: getParty(top1.partyId).hex }} />
                      <div className="absolute right-0 top-0 h-full rounded-r-full" style={{ left: `${top1Pct}%`, backgroundColor: getParty(top2.partyId).hex }} />
                    </div>

                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <PartySymbol partyId={top2.partyId} size="md" />
                        <div className="min-w-0">
                          <div className="truncate text-sm text-slate-600 dark:text-slate-300">{lang === "np" ? top2.nameNp : top2.name}</div>
                          <div className="truncate text-[10px] text-slate-400 dark:text-slate-500">{(lang === "np" ? top2.partyName : getParty(top2.partyId).nameEn).split(" (")[0]}</div>
                        </div>
                      </div>
                      <span className="shrink-0 tabular-nums text-sm text-slate-600 dark:text-slate-300">{numberFmt(top2.votes)}</span>
                    </div>

                    <div className="border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400 flex items-center justify-between">
                      <span>{t("votesCast", lang)}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{numberFmt(result.votesCast)}</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {lang === "np" ? "निर्वाचन क्षेत्र हेर्न क्लिक गर्नुहोस्" : "Click to open constituency"}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm dark:bg-[#0c1525] dark:border-slate-800/80">
          <HotSeats results={results} lang={lang} />
        </section>

        {isLoading ? <SummaryCardsSkeleton /> : <SummaryCards lang={lang} />}

        {isLoading ? <PrVotesBarsSkeleton /> : <PrVotesBars lang={lang} />}

        <LatestUpdates results={results} lang={lang} />

        {!ADSENSE_REVIEW_MODE && (
          <section className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 sm:p-5 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {lang === "np" ? "प्रायोजित" : "Sponsored"}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {sponsoredTitle}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {sponsoredDesc}
                </p>
              </div>
              <a
                href={SPONSORED_LINK_URL}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                onClick={handleSponsoredClick}
                className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 active:scale-[0.99]"
              >
                {sponsoredCta} ↗
              </a>
            </div>
          </section>
        )}

        {isLoading ? <SeatShareBarsSkeleton /> : <SeatShareBars lang={lang} />}

        {/* ── Declared Constituencies + Countdown ─────────────────────────── */}
        <div className="flex flex-col items-center gap-5 py-2">
          <Link to="/explore?status=DECLARED" className="w-full max-w-md group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-medium group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                {lang === "np" ? "घोषित निर्वाचन क्षेत्र" : "Declared Constituencies"}
              </span>
              <span className="text-[11px] text-[#2563eb] dark:text-[#3b82f6] tabular-nums font-semibold underline-offset-2 group-hover:underline" style={{ fontFamily: "'DM Mono', monospace" }}>
                {declaredSeats} / 165 →
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-[#2563eb] transition-all duration-700" style={{ width: declaredPct + "%" }} />
            </div>
            <div className="mt-1 text-center text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
              {declaredPct}% {lang === "np" ? "घोषित" : "declared"}
            </div>
          </Link>

          <div className="rounded-xl px-6 py-4 text-center bg-slate-50 dark:bg-[#060d1f]/80 border border-slate-200 dark:border-slate-700/60">
            {isElectionDay ? (
              <>
                <div className="text-2xl">🗳️</div>
                <div className="mt-1 text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-[0.15em]">
                  {lang === "np" ? "आज निर्वाचन!" : "Election Day!"}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold leading-none tabular-nums text-slate-800 dark:text-white" style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "-0.04em" }}>
                  {countdownStr}
                </div>
                <div className="mt-1 text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                  {t("daysUntilElection", lang)}
                </div>
              </>
            )}
          </div>
        </div>

        <div aria-live="polite" aria-atomic="false" className="sr-only">
          {results.filter((r) => r.status === "COUNTING").length} {t("stillCounting", lang)}
        </div>
      </main>

      {/* ── Informational content block (AdSense / SEO) ─────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-8 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {lang === "np"
              ? "नेपाल निर्वाचन परिणाम २०८२ (२०२६) — लाइभ मत गणना"
              : "Nepal Election Results 2082 (2026) — Live Vote Count"}
          </h2>

          <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-4">
            <p>
              {lang === "np"
                ? "नेपालभोट्स (NepalVotes) एउटा स्वतन्त्र डिजिटल ड्यासबोर्ड हो जसले नेपालको प्रतिनिधि सभा सामान्य निर्वाचन २०८२ (मार्च ५, २०२६) को मतगणना परिणाम वास्तविक समयमा प्रदर्शन गर्दछ। यो मञ्च निर्वाचन आयोग नेपालको आधिकारिक परिणाम वेबसाइटबाट स्वचालित रूपमा डेटा प्राप्त गर्छ र हरेक ३० सेकेन्डमा अपडेट गर्दछ — निर्वाचनको रात देशभरबाट मत गणना कसरी अगाडि बढ्दैछ भन्ने लगभग वास्तविक समयको दृश्य प्रदान गर्दछ।"
                : "NepalVotes is an independent informational dashboard tracking the vote count for Nepal's House of Representatives (Pratinidhi Sabha) General Election 2082, held on March 5, 2026. The site fetches data automatically from the official results website of the Election Commission of Nepal and refreshes every 30 seconds, giving you a near-real-time view of how counting is progressing across the country on election night."}
            </p>

            <p>
              {lang === "np"
                ? "यस साइटले नेपालका सातै प्रदेशका १६५ प्रत्यक्ष (FPTP) निर्वाचन क्षेत्रहरूको परिणाम समेट्दछ — कोशी, मधेश, बागमती, गण्डकी, लुम्बिनी, कर्णाली र सुदूरपश्चिम। यी क्षेत्रहरूमा ३,४०६ उम्मेदवारहरू ६६ भन्दा बढी दर्ता राजनीतिक दलहरू र स्वतन्त्र उम्मेदवारको रूपमा प्रतिस्पर्धा गर्दैछन्। प्रतिनिधि सभामा कुल २७५ सिट छन् — १६५ प्रत्यक्ष निर्वाचन क्षेत्रका विजेताहरूले भर्ने र ११० समानुपातिक प्रतिनिधित्वमार्फत विभाजित।"
                : "This site covers all 165 First-Past-The-Post (FPTP) constituencies spread across Nepal's 7 provinces — Koshi, Madhesh, Bagmati, Gandaki, Lumbini, Karnali, and Sudurpashchim. Across these constituencies, 3,406 candidates are contesting under more than 66 registered political parties and as independents. The House of Representatives has 275 total seats: 165 filled by direct constituency winners and 110 allocated through proportional representation."}
            </p>

            <p>
              {lang === "np"
                ? "निर्वाचन प्रक्रियाले नेपालभर मतगणना अगाडि बढाउँदा, यो ड्यासबोर्डले घोषित र घोषणा हुन बाँकी निर्वाचन क्षेत्रहरूको सङ्ख्या, दलअनुसार चालू सिट तथ्याङ्क, र बहुमत प्राप्त गर्न कुन दललाई कतिवटा थप सिट चाहिन्छ भन्ने देखाउँछ। प्रत्येक निर्वाचन क्षेत्रको क्लिक गर्न मिल्ने विवरण पृष्ठले उम्मेदवारको नाम, दल, प्राप्त मत, र घोषित भएमा विजेताको स्थिति प्रदर्शन गर्दछ।"
                : "As counting progresses across Nepal, the dashboard shows how many constituencies have been declared versus still counting, the running seat tally by party, and how many more seats each party needs to reach a majority. Each constituency's clickable detail view shows candidate names, parties, votes received, and winner status where declared."}
            </p>

            <p>
              {lang === "np"
                ? "ड्यासबोर्डका प्रमुख सुविधाहरू:"
                : "Key features of this dashboard:"}
            </p>

            <ul className="list-disc list-inside space-y-1 pl-2">
              {lang === "np" ? (
                <>
                  <li>हरेक ३० सेकेन्डमा निर्वाचन आयोगबाट स्वचालित डेटा अपडेट</li>
                  <li>१६५ FPTP निर्वाचन क्षेत्रहरूको विस्तृत परिणाम</li>
                  <li>जीवनी जानकारीसहित व्यक्तिगत उम्मेदवार प्रोफाइल पृष्ठहरू</li>
                  <li>प्रदेश, जिल्ला, दल वा लैंगिकताअनुसार फिल्टर गर्ने सुविधा</li>
                  <li>FPTP जित र समानुपातिक प्रतिनिधित्व अनुमान जोडेर दल सिट तथ्याङ्क</li>
                  <li>क्षेत्रअनुसार अग्रणी दलहरू देखाउने अन्तरक्रियात्मक प्रदेश नक्सा</li>
                  <li>नेपाली (देवनागरी) र अंग्रेजी भाषामा पूर्ण द्विभाषिक समर्थन</li>
                </>
              ) : (
                <>
                  <li>Automatic data refresh every 30 seconds from the Election Commission</li>
                  <li>Detailed results for all 165 FPTP constituencies</li>
                  <li>Individual candidate profile pages with biographical information</li>
                  <li>Filter results by province, district, party, or gender</li>
                  <li>Party seat tallies combining FPTP wins and proportional representation estimates</li>
                  <li>Interactive province map showing leading parties by region</li>
                  <li>Full bilingual support in Nepali (Devanagari) and English</li>
                </>
              )}
            </ul>

            <p>
              {lang === "np"
                ? "यस ड्यासबोर्डले प्रदेश सारांश दृश्य पनि प्रदान गर्दछ जसले सातवटा प्रदेशका प्रत्येकमा दलको प्रदर्शनलाई छुट्टाछुट्टै देखाउँछ। दल पृष्ठले ठूला र साना दुवै दलको सिट तथ्याङ्क एकत्र गर्दछ, जसमा मत प्रतिशत र प्रत्येक प्रतिस्पर्धी दलको FPTP उम्मेदवारहरू समावेश छन्। उम्मेदवार खोज पृष्ठले नागरिकहरूलाई कुनै विशेष व्यक्ति खोज्न र उनीहरूको वर्तमान मत स्थिति हेर्न सक्षम बनाउँछ।"
                : <>
                    The dashboard also provides a province summary view via the{" "}
                    <Link to="/map" className="text-blue-600 dark:text-blue-400 hover:underline">interactive map</Link>
                    {" "}that breaks down party performance across each of the seven provinces separately. The{" "}
                    <Link to="/parties" className="text-blue-600 dark:text-blue-400 hover:underline">parties page</Link>
                    {" "}aggregates seat tallies for both major and minor parties, including vote percentages and FPTP candidates for each contesting party. The{" "}
                    <Link to="/candidates" className="text-blue-600 dark:text-blue-400 hover:underline">candidates search page</Link>
                    {" "}enables citizens to look up a specific individual and see their current vote standing. You can also{" "}
                    <Link to="/explore" className="text-blue-600 dark:text-blue-400 hover:underline">explore all 165 constituencies</Link>
                    {" "}filtered by province or district.
                  </>
              }
            </p>

            <p>
              {lang === "np"
                ? "सबै डेटा निर्वाचन आयोग नेपालको आधिकारिक परिणाम वेबसाइट (result.election.gov.np) बाट मात्र प्राप्त गरिन्छ। NepalVotes एउटा स्वतन्त्र सूचनात्मक सेवा हो र निर्वाचन आयोग, कुनै पनि राजनीतिक दल, वा कुनै सरकारी निकायसँग आबद्ध छैन। यहाँ प्रदर्शित जानकारी केवल सूचनात्मक उद्देश्यका लागि प्रदान गरिएको छ। डेटा सिधै तेस्रो-पक्षको स्रोतबाट आउँछ र हामी सम्पादकीय परिवर्तन गर्दैनौं। आधिकारिक र अन्तिम निर्वाचन परिणामका लागि कृपया सिधै निर्वाचन आयोग नेपालको वेबसाइट हेर्नुहोस्।"
                : "All data is sourced exclusively from the official results portal of the Election Commission of Nepal at result.election.gov.np. NepalVotes is an independent informational service and is not affiliated with the Election Commission, any political party, or any government body. Information displayed here is provided for informational purposes only. Data comes directly from a third-party source and we make no editorial changes to it. For the official and final election results, please refer directly to the Election Commission of Nepal's website."}
            </p>
          </div>
        </div>
      </section>

      <InstallPrompt />
    </Layout>
  );
}
