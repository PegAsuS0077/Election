import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useElectionStore } from "./store/electionStore";
import { provinceName, t } from "./i18n";
import { getParty } from "./lib/partyRegistry";
import { PROVINCE_COLORS } from "./lib/constants";
import { buildAnalysisOverview } from "./lib/analysis";
import { getAllPosts } from "./content/posts";

import SummaryCards from "./SummaryCards";
import PrVotesBars from "./PrVotesBars";
import SeatShareBars from "./SeatShareBars";
import HotSeats from "./HotSeats";
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
const CANDIDATE_RANK_LIMIT = 20;
const CANDIDATE_RANK_PAGE_SIZE = 5;

function seatsToMajority(n: number) { return Math.floor(n / 2) + 1; }
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatConstituencyLabel(name: string) {
  return name.replace(/-(\d+)$/, " - $1");
}
function numberFmt(n: number) { return n.toLocaleString("en-IN"); }
function candidateSlug(candidateId: number, name: string) {
  return `${candidateId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export default function App() {
  const { isLoading, setIsLoading, lang } = useElectionStore();
  const [candidateRankMode, setCandidateRankMode] = useState<"percentage" | "votes">("percentage");
  const [showAllRankedCandidates, setShowAllRankedCandidates] = useState(false);
  const [candidateRankPage, setCandidateRankPage] = useState(1);

  // Give archive data load a short window before assuming empty
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 8000);
    return () => clearTimeout(timer);
  }, [setIsLoading]);

  useEffect(() => {
    setShowAllRankedCandidates(false);
    setCandidateRankPage(1);
  }, [candidateRankMode]);

  const results       = useElectionStore((s) => s.results);
  const seatTally     = useElectionStore((s) => s.seatTally);
  const prVoteByParty = useElectionStore((s) => s.prVoteByParty);
  const declaredSeats = useElectionStore((s) => s.declaredSeats);
  const featuredFavorites = useElectionStore((s) => s.featuredFavorites);
  const toggleFeaturedFavorite = useElectionStore((s) => s.toggleFeaturedFavorite);
  const partyCount = new Set(
    results.flatMap((r) => r.candidates.map((c) => c.partyId)).filter((id) => id !== "IND"),
  ).size;


  const totalSeats = 275;
  const majority   = seatsToMajority(totalSeats);

  const tallyRows = Object.entries(seatTally)
    .map(([partyId, v]) => ({ partyId, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);
  const lead      = tallyRows[0];
  const projected = lead && lead.total >= majority ? lead : null;

  const hasArchivedResults = results.some((r) => r.votesCast > 0);
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
  const jamanatJafatCount = useMemo(() => {
    let count = 0;
    for (const r of results) {
      const totalVotes = r.votesCast > 0
        ? r.votesCast
        : r.candidates.reduce((sum, c) => sum + c.votes, 0);
      if (totalVotes <= 0) continue;
      for (const c of r.candidates) {
        if ((c.votes / totalVotes) * 100 < 10) count += 1;
      }
    }
    return count;
  }, [results]);
  const rankedCandidates = useMemo(() => {
    const rows: {
      candidateId: number;
      name: string;
      nameNp: string;
      partyId: string;
      partyName: string;
      votes: number;
      votePct: number;
      constituencyCode: string;
      constituencyName: string;
      constituencyNameNp: string;
    }[] = [];

    for (const r of results) {
      const constituencyTotalVotes = r.votesCast > 0
        ? r.votesCast
        : r.candidates.reduce((sum, c) => sum + c.votes, 0);

      for (const c of r.candidates) {
        if (c.votes <= 0) continue;
        rows.push({
          candidateId: c.candidateId,
          name: c.name,
          nameNp: c.nameNp,
          partyId: c.partyId,
          partyName: c.partyName,
          votes: c.votes,
          votePct: constituencyTotalVotes > 0 ? (c.votes / constituencyTotalVotes) * 100 : 0,
          constituencyCode: r.code,
          constituencyName: r.name,
          constituencyNameNp: r.nameNp,
        });
      }
    }

    rows.sort((a, b) => {
      if (candidateRankMode === "percentage") {
        return (b.votePct - a.votePct) || (b.votes - a.votes) || (a.name.localeCompare(b.name));
      }
      return (b.votes - a.votes) || (b.votePct - a.votePct) || (a.name.localeCompare(b.name));
    });

    return rows.slice(0, CANDIDATE_RANK_LIMIT).map((row, idx) => ({ ...row, rank: idx + 1 }));
  }, [results, candidateRankMode]);
  const rankedPageCount = Math.max(1, Math.ceil(rankedCandidates.length / CANDIDATE_RANK_PAGE_SIZE));
  const safeRankedPage = Math.min(candidateRankPage, rankedPageCount);
  const pagedRankedCandidates = rankedCandidates.slice(
    (safeRankedPage - 1) * CANDIDATE_RANK_PAGE_SIZE,
    safeRankedPage * CANDIDATE_RANK_PAGE_SIZE,
  );
  const visibleRankedCandidates = showAllRankedCandidates
    ? pagedRankedCandidates
    : rankedCandidates.slice(0, 2);
  const topRankedVotes = rankedCandidates[0]?.votes ?? 0;
  const analysisOverview = useMemo(
    () => buildAnalysisOverview(results, seatTally, prVoteByParty),
    [results, seatTally, prVoteByParty],
  );
  const featuredPosts = useMemo(() => getAllPosts().slice(0, 2), []);

  useEffect(() => {
    setCandidateRankPage((prev) => Math.min(prev, rankedPageCount));
  }, [rankedPageCount]);

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
      {hasArchivedResults ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1 text-xs font-semibold text-cyan-300 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          {lang === "np" ? "अन्तिम परिणाम अभिलेख" : "Final Results Archive"}
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-400 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {lang === "np" ? "डेटासेट तयार हुँदैछ" : "Dataset Loading"}
        </span>
      )}
      <span className="text-[11px] text-white/30 tabular-nums">{t("lastUpdated", lang)} {lastUpdatedStr}</span>
    </div>
  );

  return (
    <Layout
      title="Nepal House of Representatives"
      titleNp="प्रतिनिधि सभा निर्वाचन"
      subtitle={"Final Results Archive · " + t("electionDate", lang)}
      subtitleNp={"अन्तिम परिणाम अभिलेख · " + t("electionDate", lang)}
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

        <section className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {lang === "np" ? "⚖️ जमानत जफत ट्र्याकर" : "⚖️ Jamanat Jafat Tracker"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {lang === "np"
                  ? "१०% भन्दा कम मत पाएका उम्मेदवार हेर्नुहोस्।"
                  : "Track candidates who are below the 10% vote-share threshold."}
              </p>
            </div>
            <Link
              to="/jamanat-jafat"
              className="inline-flex items-center rounded-lg border border-amber-400/60 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100/60 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-900/30"
            >
              {lang === "np" ? "सूची खोल्नुहोस् →" : "Open list →"} ({jamanatJafatCount})
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-200/70 bg-blue-50/70 px-4 py-3 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {lang === "np"
                ? "दलहरूको क्षेत्रगत कवरेज हेर्न नक्सा खण्डमा जानुहोस्।"
                : "See party-wise area coverage in the Map section."}
            </p>
            <Link
              to="/map"
              className="inline-flex items-center rounded-lg border border-[#2563eb]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition hover:bg-[#2563eb]/5 dark:bg-slate-900 dark:text-blue-300"
            >
              {lang === "np" ? "नक्सा खोल्नुहोस् →" : "Open Map →"}
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Link
            to="/analysis"
            className="rounded-2xl border border-cyan-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-cyan-900/40 dark:bg-[#0c1525]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                  {lang === "np" ? "विश्लेषण" : "Analysis"}
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                  {lang === "np" ? "अन्तिम परिणामबाट अन्तर्दृष्टि" : "Insights from the final archive"}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {lang === "np"
                    ? "नजिकका प्रतिस्पर्धा, टर्नआउट, प्रदेशगत प्रदर्शन र दलगत रूपान्तरण हेर्नुहोस्।"
                    : "Explore close races, turnout, province trends, and party performance from the saved results."}
                </p>
              </div>
              <div className="rounded-xl bg-cyan-50 px-3 py-2 text-right dark:bg-cyan-950/30">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {lang === "np" ? "कुल मत" : "Votes"}
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {numberFmt(analysisOverview.totalVotes)}
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/news"
            className="rounded-2xl border border-rose-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-rose-900/40 dark:bg-[#0c1525]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
                  {lang === "np" ? "न्युज" : "News"}
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                  {lang === "np" ? "डेटामा आधारित लेख र व्याख्या" : "Archive-based stories and explainers"}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {lang === "np"
                    ? "अन्तिम परिणामलाई सन्दर्भ, ट्रेन्ड र रिपोर्टमा रूपान्तरण गर्ने लेखहरू पढ्नुहोस्।"
                    : "Read reporting and explainers that turn the saved dataset into useful context."}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-right dark:bg-rose-950/30">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {lang === "np" ? "नयाँ" : "Latest"}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {lang === "np" ? featuredPosts[0]?.titleNp : featuredPosts[0]?.title}
                </div>
              </div>
            </div>
          </Link>
        </section>

        {isLoading ? <SummaryCardsSkeleton /> : <SummaryCards lang={lang} />}

        {isLoading ? <PrVotesBarsSkeleton /> : <PrVotesBars lang={lang} />}

        {isLoading ? <SeatShareBarsSkeleton /> : <SeatShareBars lang={lang} />}

        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm dark:bg-[#0c1525] dark:border-slate-800/80">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                🏅 {lang === "np" ? "शीर्ष उम्मेदवार र्याङ्किङ" : "Top Candidate Rankings"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {lang === "np"
                  ? "मत प्रतिशत वा कुल मत अनुसार शीर्ष २० उम्मेदवार।"
                  : "Top 20 candidates ranked by vote percentage or total votes."}
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/70">
              <button
                type="button"
                onClick={() => setCandidateRankMode("percentage")}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                  (candidateRankMode === "percentage"
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#2563eb] dark:text-slate-300 dark:hover:text-[#3b82f6]")
                }
              >
                {lang === "np" ? "मत %" : "Vote %"}
              </button>
              <button
                type="button"
                onClick={() => setCandidateRankMode("votes")}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                  (candidateRankMode === "votes"
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#2563eb] dark:text-slate-300 dark:hover:text-[#3b82f6]")
                }
              >
                {lang === "np" ? "कुल मत" : "Total Votes"}
              </button>
            </div>
          </div>

          {rankedCandidates.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/60">
              {lang === "np" ? "र्याङ्किङका लागि डेटा उपलब्ध छैन।" : "No candidate ranking data available yet."}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleRankedCandidates.map((cand) => {
                  const primaryValue = candidateRankMode === "percentage"
                    ? `${cand.votePct.toFixed(2)}%`
                    : numberFmt(cand.votes);
                  const secondaryLabel = candidateRankMode === "percentage"
                    ? `${numberFmt(cand.votes)} ${lang === "np" ? "मत" : "votes"}`
                    : `${cand.votePct.toFixed(2)}% ${lang === "np" ? "मत प्रतिशत" : "vote share"}`;
                  const progressWidth = candidateRankMode === "percentage"
                    ? Math.min(100, Math.max(0, cand.votePct))
                    : (topRankedVotes > 0 ? (cand.votes / topRankedVotes) * 100 : 0);
                  return (
                    <div
                      key={`${cand.candidateId}-${cand.constituencyCode}`}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              #{cand.rank}
                            </span>
                            <PartySymbol partyId={cand.partyId} size="sm" />
                            <Link
                              to={`/candidate/${candidateSlug(cand.candidateId, cand.name)}`}
                              className="truncate text-sm font-semibold text-slate-900 transition-colors hover:text-[#2563eb] dark:text-slate-100 dark:hover:text-[#3b82f6]"
                            >
                              {lang === "np" ? cand.nameNp : cand.name}
                            </Link>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="truncate">
                              {(lang === "np" ? cand.partyName : getParty(cand.partyId).nameEn).split(" (")[0]}
                            </span>
                            <span>·</span>
                            <Link
                              to={`/constituency/${encodeURIComponent(cand.constituencyCode)}`}
                              className="truncate hover:text-[#2563eb] dark:hover:text-[#3b82f6]"
                            >
                              {lang === "np" ? cand.constituencyNameNp : cand.constituencyName}
                            </Link>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className="text-base font-bold tabular-nums text-slate-800 dark:text-slate-100"
                            style={{ fontFamily: "'DM Mono', monospace" }}
                          >
                            {primaryValue}
                          </div>
                          <div className="text-[11px] text-slate-400">{secondaryLabel}</div>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-[#2563eb]"
                          style={{ width: `${Math.max(0, Math.min(100, progressWidth))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {rankedCandidates.length > 2 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllRankedCandidates((prev) => {
                        const next = !prev;
                        if (next) setCandidateRankPage(1);
                        return next;
                      });
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#2563eb]/50 hover:text-[#2563eb] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[#3b82f6]/50 dark:hover:text-[#3b82f6]"
                  >
                    {showAllRankedCandidates
                      ? (lang === "np" ? "शीर्ष २ मात्र देखाउनुहोस्" : "Show Top 2 Only")
                      : (lang === "np" ? "शीर्ष २० सबै देखाउनुहोस्" : "Show Full Top 20")}
                  </button>
                </div>
              )}

              {showAllRankedCandidates && rankedCandidates.length > CANDIDATE_RANK_PAGE_SIZE && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCandidateRankPage((p) => Math.max(1, p - 1))}
                    disabled={safeRankedPage === 1}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition disabled:cursor-default disabled:opacity-40 hover:border-[#2563eb]/50 hover:text-[#2563eb] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[#3b82f6]/50 dark:hover:text-[#3b82f6]"
                  >
                    ←
                  </button>
                  {Array.from({ length: rankedPageCount }, (_, idx) => idx + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCandidateRankPage(page)}
                      className={
                        "h-8 min-w-[2rem] rounded-lg border px-2 text-xs font-semibold transition " +
                        (page === safeRankedPage
                          ? "border-[#2563eb] bg-[#2563eb] text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#2563eb]/50 hover:text-[#2563eb] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[#3b82f6]/50 dark:hover:text-[#3b82f6]")
                      }
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCandidateRankPage((p) => Math.min(rankedPageCount, p + 1))}
                    disabled={safeRankedPage === rankedPageCount}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition disabled:cursor-default disabled:opacity-40 hover:border-[#2563eb]/50 hover:text-[#2563eb] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[#3b82f6]/50 dark:hover:text-[#3b82f6]"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
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

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Link to="/explore?status=DECLARED" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#0c1525]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-medium group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                {lang === "np" ? "अन्तिम सिट घोषणा" : "Declared Constituencies"}
              </span>
              <span className="text-[11px] text-[#2563eb] dark:text-[#3b82f6] tabular-nums font-semibold underline-offset-2 group-hover:underline" style={{ fontFamily: "'DM Mono', monospace" }}>
                {declaredSeats} / 165 →
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-[#2563eb] transition-all duration-700" style={{ width: declaredPct + "%" }} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {lang === "np" ? "घोषणा प्रगति" : "Completion"}
                </div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{declaredPct}%</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {lang === "np" ? "कुल मत" : "Recorded votes"}
                </div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{numberFmt(analysisOverview.totalVotes)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {lang === "np" ? "टर्नआउट" : "Turnout"}
                </div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {analysisOverview.totalTurnoutPct !== null ? `${analysisOverview.totalTurnoutPct.toFixed(1)}%` : "—"}
                </div>
              </div>
            </div>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#0c1525]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {lang === "np" ? "समाचारबाट सुरु गर्नुहोस्" : "Start With Stories"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {lang === "np"
                    ? "अन्तिम परिणामबाट तयार गरिएका व्याख्यात्मक लेखहरू।"
                    : "Explanatory posts built from the final election archive."}
                </p>
              </div>
              <Link to="/news" className="text-xs font-semibold text-[#2563eb] hover:underline">
                {lang === "np" ? "सबै लेख" : "All stories"}
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {featuredPosts.map((post) => (
                <Link
                  key={post.slug}
                  to={`/news/${post.slug}`}
                  className="block rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-[#2563eb]/40 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-[#3b82f6]/40"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {post.category}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {lang === "np" ? post.titleNp : post.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {lang === "np" ? post.excerptNp : post.excerpt}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div aria-live="polite" aria-atomic="false" className="sr-only">
          {declaredSeats} {lang === "np" ? "निर्वाचन क्षेत्र घोषणा भइसके" : "constituencies declared in the archive"}
        </div>
      </main>

      {/* ── Informational content block (AdSense / SEO) ─────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-8 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {lang === "np"
              ? "नेपाल निर्वाचन परिणाम २०८२ (२०२६) — अन्तिम अभिलेख, विश्लेषण र समाचार"
              : "Nepal Election Results 2082 (2026) — Final Archive, Analysis, and News"}
          </h2>

          <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-4">
            <p>
              {lang === "np"
                ? "नेपालभोट्स (NepalVotes) अब निर्वाचन रातिको लाइभ काउन्टर मात्र होइन। यो नेपालको प्रतिनिधि सभा सामान्य निर्वाचन २०८२ (मार्च ५, २०२६) को अन्तिम परिणाम, डेटा दृश्यांकन, र विश्लेषणात्मक सामग्रीका लागि बनाइएको अभिलेख-आधारित प्लेटफर्म हो।"
                : "NepalVotes is no longer just an election-night dashboard. It is now an archive-driven platform for final results, data visualisation, and explanatory reporting on Nepal's House of Representatives General Election 2082, held on March 5, 2026."}
            </p>

            <p>
              {lang === "np"
                ? "यस साइटले सातै प्रदेशका १६५ प्रत्यक्ष निर्वाचन क्षेत्र, ३,४०६ उम्मेदवार, दलगत सिट गणना, र उपलब्ध हुँदा समानुपातिक मत सारांश समेट्छ। अब उद्देश्य चलिरहेको मतगणना देखाउनु होइन, बरु अन्तिम परिणामलाई सहज, खोजयोग्य र विश्लेषण गर्न मिल्ने रूपमा प्रस्तुत गर्नु हो।"
                : "The site covers all 165 FPTP constituencies across Nepal's seven provinces, 3,406 candidates, party seat totals, and proportional-vote summaries where available. The goal is no longer to show a moving count, but to make the final result searchable, explorable, and useful for deeper analysis."}
            </p>

            <p>
              {lang === "np"
                ? "विश्लेषण खण्डले सबैभन्दा कडा प्रतिस्पर्धा, सबैभन्दा ठूलो जित, प्रदेशगत नक्सा, टर्नआउट, र दलहरूको मत-सिट रूपान्तरणजस्ता प्रश्नहरूको उत्तर दिन्छ। समाचार खण्डले यही saved dataset लाई आधार बनाएर व्याख्यात्मक लेख, ट्रेन्ड रिपोर्ट, र परिणामको सन्दर्भ प्रस्तुत गर्छ।"
                : "The Analysis section answers questions that matter after election day: which seats were closest, where the biggest mandates emerged, how provinces behaved, and how parties converted votes into seats. The News section uses the same saved dataset for explainers, trend notes, and archive-based reporting."}
            </p>

            <p>
              {lang === "np"
                ? "ड्यासबोर्डका प्रमुख सुविधाहरू:"
                : "Key features of this dashboard:"}
            </p>

            <ul className="list-disc list-inside space-y-1 pl-2">
              {lang === "np" ? (
                <>
                  <li>१६५ FPTP निर्वाचन क्षेत्रहरूको विस्तृत परिणाम</li>
                  <li>जीवनी जानकारीसहित व्यक्तिगत उम्मेदवार प्रोफाइल पृष्ठहरू</li>
                  <li>प्रदेश, जिल्ला, दल वा लैंगिकताअनुसार फिल्टर गर्ने सुविधा</li>
                  <li>अन्तिम परिणामका आधारमा नजिकका प्रतिस्पर्धा, ठूलो जित र टर्नआउट विश्लेषण</li>
                  <li>दल सिट तथ्याङ्क, मत हिस्सा र प्रदेशगत तुलना</li>
                  <li>क्षेत्रअनुसार अग्रणी दलहरू देखाउने अन्तरक्रियात्मक प्रदेश नक्सा</li>
                  <li>डेटामा आधारित समाचार, व्याख्या र पोस्ट-इलेक्शन ब्लग लेखहरू</li>
                  <li>नेपाली (देवनागरी) र अंग्रेजी भाषामा पूर्ण द्विभाषिक समर्थन</li>
                </>
              ) : (
                <>
                  <li>Detailed results for all 165 FPTP constituencies</li>
                  <li>Individual candidate profile pages with biographical information</li>
                  <li>Filter results by province, district, party, or gender</li>
                  <li>Close-race, landslide, turnout, and province analysis from the final archive</li>
                  <li>Party seat tallies, vote share views, and province comparisons</li>
                  <li>Interactive province map showing leading parties by region</li>
                  <li>Data-based stories, explainers, and post-election blog coverage</li>
                  <li>Full bilingual support in Nepali (Devanagari) and English</li>
                </>
              )}
            </ul>

            <p>
              {lang === "np"
                ? "प्रदेश सारांश, दल पृष्ठ, उम्मेद्वार प्रोफाइल, निर्वाचन क्षेत्र विवरण, र विश्लेषण हबले एउटै संग्रहित डेटाबाट विभिन्न कोण उपलब्ध गराउँछन्। यसले प्लेटफर्मलाई केवल नतिजा हेर्ने ठाउँबाट अध्ययन, रिपोर्टिङ, र सार्वजनिक सन्दर्भका लागि उपयोगी स्रोत बनाउँछ।"
                : <>
                    The{" "}
                    <Link to="/map" className="text-blue-600 dark:text-blue-400 hover:underline">interactive map</Link>
                    {", "}
                    <Link to="/analysis" className="text-blue-600 dark:text-blue-400 hover:underline">analysis hub</Link>
                    {", "}
                    <Link to="/news" className="text-blue-600 dark:text-blue-400 hover:underline">news section</Link>
                    {" "}, and the{" "}
                    <Link to="/parties" className="text-blue-600 dark:text-blue-400 hover:underline">parties page</Link>
                    {" "}all read from the same saved results archive. The{" "}
                    <Link to="/candidates" className="text-blue-600 dark:text-blue-400 hover:underline">candidates search page</Link>
                    {" "}helps readers look up a specific individual, while{" "}
                    <Link to="/explore" className="text-blue-600 dark:text-blue-400 hover:underline">explore all 165 constituencies</Link>
                    {" "}keeps the full final dataset browsable by province or district.
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
