/**
 * FavoritesPage — /favorites
 *
 * One-stop page showing all bookmarked constituencies, candidates, and parties.
 */

import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { getParty, partySlug } from "../lib/partyRegistry";
import PartySymbol from "../components/PartySymbol";
import FavoriteButton from "../components/FavoriteButton";
import { provinceName, t } from "../i18n";
import Layout from "../components/Layout";

function fmt(n: number) { return n.toLocaleString("en-IN"); }

function EmptySection({ label }: { label: string }) {
  return (
    <p className="text-sm text-slate-400 dark:text-slate-600 py-4">{label}</p>
  );
}

export default function FavoritesPage() {
  useEffect(() => {
    document.title = "My Favorites – NepalVotes";
  }, []);

  const results         = useElectionStore((s) => s.results);
  const seatTally       = useElectionStore((s) => s.seatTally);
  const favorites       = useElectionStore((s) => s.favorites);
  const featuredFavorites = useElectionStore((s) => s.featuredFavorites);
  const favCandidates   = useElectionStore((s) => s.favCandidates);
  const favParties      = useElectionStore((s) => s.favParties);
  const toggleFeaturedFavorite = useElectionStore((s) => s.toggleFeaturedFavorite);
  const toggleFavParty  = useElectionStore((s) => s.toggleFavParty);
  const toggleFavCand   = useElectionStore((s) => s.toggleFavCandidate);
  const lang            = useElectionStore((s) => s.lang);
  const navigate        = useNavigate();

  const favConstituencies = results.filter((r) => favorites.has(r.code));

  // Flat list of favorited candidates across all constituencies
  const favCandList = results.flatMap((r) =>
    r.candidates
      .filter((c) => favCandidates.has(c.candidateId))
      .map((c) => ({ ...c, constName: r.name, constNameNp: r.nameNp, constCode: r.code, constStatus: r.status, province: r.province }))
  );

  const favPartyList = Array.from(favParties).map((pid) => {
    const pInfo = getParty(pid);
    const tally = seatTally[pid] ?? { fptp: 0, pr: 0 };
    return { pid, pInfo, tally, total: tally.fptp + tally.pr };
  });

  const totalFavs = favorites.size + favCandidates.size + favParties.size;

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-400 uppercase tracking-widest">
      ★ {totalFavs} {lang === "np" ? "मनपर्ने" : "saved"}
    </span>
  );

  const sectionCls = "rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-5 space-y-3";
  const headingCls = "text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2";

  return (
    <Layout
      title="My Favorites"
      titleNp="मेरा मनपर्ने"
      subtitle="Your watched constituencies, candidates, and parties"
      subtitleNp="तपाईंले अनुगमन गरेका निर्वाचन क्षेत्र, उम्मेदवार र दलहरू"
      badge={heroBadge}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {totalFavs === 0 && (
          <div className="py-20 text-center space-y-3">
            <div className="text-5xl">☆</div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {lang === "np"
                ? "तपाईंले अझै केही मनपर्नेमा थप्नु भएको छैन।"
                : "You haven't saved anything yet."}
            </p>
            <p className="text-slate-400 dark:text-slate-600 text-xs">
              {lang === "np"
                ? "निर्वाचन क्षेत्र, उम्मेदवार वा दलको ☆ बटन थिच्नुहोस्।"
                : "Tap the ☆ button on any constituency, candidate, or party card."}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Link to="/explore" className="text-xs text-blue-500 hover:underline">Browse constituencies →</Link>
              <Link to="/candidates" className="text-xs text-blue-500 hover:underline">Browse candidates →</Link>
              <Link to="/parties" className="text-xs text-blue-500 hover:underline">Browse parties →</Link>
            </div>
          </div>
        )}

        {/* ── Constituencies ─────────────────────────────────────── */}
        {(favorites.size > 0 || favConstituencies.length > 0) && (
          <section className={sectionCls}>
            <h2 className={headingCls}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="currentColor" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {lang === "np" ? "निर्वाचन क्षेत्रहरू" : "Constituencies"}
              <span className="text-xs font-normal text-slate-400 ml-1">{favorites.size}</span>
            </h2>
            {favConstituencies.length === 0
              ? <EmptySection label={lang === "np" ? "कुनै निर्वाचन क्षेत्र थपिएको छैन।" : "No constituencies saved yet."} />
              : <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {favConstituencies.map((r) => {
                    const leader = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
                    const isFeatured = featuredFavorites.has(r.code);
                    const statusCls =
                      r.status === "DECLARED" ? "text-emerald-600 dark:text-emerald-400" :
                      r.status === "COUNTING"  ? "text-amber-500 dark:text-amber-400" :
                                                  "text-slate-400";
                    return (
                      <div key={r.code} className="flex items-center gap-3 py-3">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => navigate(`/constituency/${encodeURIComponent(r.name.replace(/\s+/g, "-"))}`)}
                            className="font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block text-left"
                          >
                            {lang === "np" ? r.nameNp : r.name}
                          </button>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-400">{provinceName(r.province, lang)}</span>
                            <span className={`text-[10px] font-semibold ${statusCls}`}>{r.status}</span>
                            {leader && leader.votes > 0 && (
                              <span className="text-[11px] text-slate-500 truncate">
                                {lang === "np" ? leader.nameNp : leader.name} · {fmt(leader.votes)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFeaturedFavorite(r.code)}
                            aria-label={isFeatured ? t("removeFromFeatured", lang) : t("addToFeatured", lang)}
                            title={isFeatured ? t("removeFromFeatured", lang) : t("addToFeatured", lang)}
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                              isFeatured
                                ? "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          >
                            {isFeatured
                              ? (lang === "np" ? "विशेष" : "Featured")
                              : (lang === "np" ? "विशेषमा" : "Feature")}
                          </button>
                          <FavoriteButton code={r.code} name={r.name} lang={lang} />
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </section>
        )}

        {/* ── Candidates ─────────────────────────────────────────── */}
        {(favCandidates.size > 0 || favCandList.length > 0) && (
          <section className={sectionCls}>
            <h2 className={headingCls}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="currentColor" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {lang === "np" ? "उम्मेदवारहरू" : "Candidates"}
              <span className="text-xs font-normal text-slate-400 ml-1">{favCandidates.size}</span>
            </h2>
            {favCandList.length === 0
              ? <EmptySection label={lang === "np" ? "कुनै उम्मेदवार थपिएको छैन।" : "No candidates saved yet."} />
              : <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {favCandList.map((c) => {
                    const pInfo = getParty(c.partyId);
                    const slug  = `${c.candidateId}-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                    return (
                      <div key={c.candidateId} className="flex items-center gap-3 py-3">
                        <PartySymbol partyId={c.partyId} size="md" />
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/candidate/${slug}`}
                            className="font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                          >
                            {lang === "np" ? c.nameNp : c.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-400 truncate">
                              {lang === "np" ? pInfo.partyName : pInfo.nameEn}
                            </span>
                            <span className="text-[11px] text-slate-400">·</span>
                            <Link
                              to={`/constituency/${encodeURIComponent(c.constName.replace(/\s+/g, "-"))}`}
                              className="text-[11px] text-slate-400 hover:text-blue-500 truncate"
                            >
                              {lang === "np" ? c.constNameNp : c.constName}
                            </Link>
                            {c.votes > 0 && (
                              <>
                                <span className="text-[11px] text-slate-400">·</span>
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
                                  {fmt(c.votes)}
                                </span>
                              </>
                            )}
                            {c.isWinner && <span className="text-emerald-500 text-xs">🏆</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFavCand(c.candidateId)}
                          aria-label="Unwatch candidate"
                          className="shrink-0 p-1 text-amber-400 hover:text-amber-300 transition-colors rounded-full focus:outline-none"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
            }
          </section>
        )}

        {/* ── Parties ────────────────────────────────────────────── */}
        {(favParties.size > 0 || favPartyList.length > 0) && (
          <section className={sectionCls}>
            <h2 className={headingCls}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="currentColor" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {lang === "np" ? "दलहरू" : "Parties"}
              <span className="text-xs font-normal text-slate-400 ml-1">{favParties.size}</span>
            </h2>
            {favPartyList.length === 0
              ? <EmptySection label={lang === "np" ? "कुनै दल थपिएको छैन।" : "No parties saved yet."} />
              : <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {favPartyList.map(({ pid, pInfo, tally, total }) => (
                    <div key={pid} className="flex items-center gap-3 py-3">
                      <PartySymbol partyId={pid} size="md" />
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/party/${partySlug(pInfo.nameEn)}`}
                          className="font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                        >
                          {lang === "np" ? pInfo.partyName : pInfo.nameEn}
                        </Link>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                          <span>FPTP: <span className="font-semibold text-slate-600 dark:text-slate-300">{tally.fptp}</span></span>
                          <span>PR: <span className="font-semibold text-slate-600 dark:text-slate-300">{tally.pr}</span></span>
                          <span className="font-semibold" style={{ color: pInfo.hex }}>Total: {total}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFavParty(pid)}
                        aria-label="Unwatch party"
                        className="shrink-0 p-1 text-amber-400 hover:text-amber-300 transition-colors rounded-full focus:outline-none"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
            }
          </section>
        )}

      </div>
    </Layout>
  );
}
