import { useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import {
  PartyVoteSeatChart,
  ProvinceTurnoutChart,
  RaceMarginChart,
  SeatCompositionChart,
} from "../components/analysis/AnalysisCharts";
import { useElectionStore } from "../store/electionStore";
import { buildAnalysisOverview } from "../lib/analysis";

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function fmtPct(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export default function AnalysisPage() {
  const lang = useElectionStore((state) => state.lang);
  const results = useElectionStore((state) => state.results);
  const seatTally = useElectionStore((state) => state.seatTally);
  const prVoteByParty = useElectionStore((state) => state.prVoteByParty);

  useEffect(() => {
    document.title = "Election Analysis – NepalVotes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Post-election analysis hub for Nepal's 2082 House of Representatives result: closest races, turnout, province summaries, and party performance.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/analysis");
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/"); };
  }, []);

  const overview = useMemo(
    () => buildAnalysisOverview(results, seatTally, prVoteByParty),
    [results, seatTally, prVoteByParty],
  );

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-300">
      {lang === "np" ? "डेटा विश्लेषण" : "Data Analysis"}
    </span>
  );

  return (
    <Layout
      title="Election Analysis"
      titleNp="निर्वाचन विश्लेषण"
      subtitle="Final-result visuals, margins, turnout, and party performance from the saved archive"
      subtitleNp="सेभ गरिएको अन्तिम डेटाबाट दृश्य विश्लेषण, अन्तर, टर्नआउट र दल प्रदर्शन"
      badge={heroBadge}
    >
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: lang === "np" ? "कुल अभिलेखित मत" : "Recorded Votes",
              value: fmt(overview.totalVotes),
              tone: "from-blue-500/15 to-transparent border-blue-200/70 dark:border-blue-900/40",
            },
            {
              label: lang === "np" ? "घोषित निर्वाचन क्षेत्र" : "Declared Seats",
              value: `${overview.declaredConstituencies} / 165`,
              tone: "from-emerald-500/15 to-transparent border-emerald-200/70 dark:border-emerald-900/40",
            },
            {
              label: lang === "np" ? "अनुमानित टर्नआउट" : "Estimated Turnout",
              value: fmtPct(overview.totalTurnoutPct),
              tone: "from-amber-500/15 to-transparent border-amber-200/70 dark:border-amber-900/40",
            },
            {
              label: lang === "np" ? "सिट जित्ने दल" : "Parties With Seats",
              value: String(overview.partiesWithSeats),
              tone: "from-fuchsia-500/15 to-transparent border-fuchsia-200/70 dark:border-fuchsia-900/40",
            },
          ].map((card) => (
            <article
              key={card.label}
              className={`rounded-2xl border bg-gradient-to-br ${card.tone} bg-white p-5 shadow-sm dark:bg-[#0c1525]`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'DM Mono', monospace" }}>
                {card.value}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SeatCompositionChart rows={overview.partyRows} lang={lang} />
          <ProvinceTurnoutChart rows={overview.provinceRows} lang={lang} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <PartyVoteSeatChart rows={overview.partyRows} lang={lang} />
          <RaceMarginChart
            rows={overview.closestRaces}
            lang={lang}
            title={lang === "np" ? "सबैभन्दा कडा प्रतिस्पर्धा" : "Closest Races"}
            description={
              lang === "np"
                ? "अन्तिम परिणाममा सबैभन्दा साँघुरा मत अन्तर भएका निर्वाचन क्षेत्र।"
                : "The tightest final margins in the saved constituency archive."
            }
            tone="rose"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <RaceMarginChart
            rows={overview.biggestWins}
            lang={lang}
            title={lang === "np" ? "सबैभन्दा ठूला जित" : "Biggest Wins"}
            description={
              lang === "np"
                ? "उच्च मतान्तरमा टुंगिएका सिटहरू, जहाँ म्यान्डेट स्पष्ट थियो।"
                : "Seats decided by the widest final margins, where the mandate was clear."
            }
            tone="emerald"
          />

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#0c1525]">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {lang === "np" ? "पढ्ने तरिका" : "How To Read The Archive"}
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              <p>
                {lang === "np"
                  ? "यो पृष्ठले लाइभ काउन्टडाउनको सट्टा अन्तिम परिणामलाई तुलना गर्न मिल्ने डेटा उत्पादनमा रूपान्तरण गर्छ। सिट संरचना, प्रदेश टर्नआउट, मत-सिट अन्तर, र कडा प्रतिस्पर्धाले एउटै चुनावलाई फरक-फरक कोणबाट देखाउँछन्।"
                  : "This page turns the saved final result into a comparative data product instead of a live dashboard. Seat composition, provincial turnout, vote-to-seat conversion, and close races each show a different side of the same election."}
              </p>
              <p>
                {lang === "np"
                  ? "यदि तपाईं राष्ट्रिय तस्विरबाट सुरु गर्न चाहनुहुन्छ भने सिट संरचना र मत बनाम सिट चार्ट हेर्नुहोस्। स्थानीय कथा बुझ्न नजिकको प्रतिस्पर्धा र सबैभन्दा ठूला जिततर्फ जानुहोस्।"
                  : "Start with seat composition and votes-vs-seats if you want the national picture. Move to closest races and biggest wins when you want the local stories that shaped the final map."}
              </p>
              <p>
                {lang === "np"
                  ? "अझ गहिरो अध्ययनका लागि पार्टी, उम्मेदवार, र निर्वाचन क्षेत्र पृष्ठहरू प्रयोग गर्नुहोस्, र समाचार सेक्सनमा यही अभिलेखमा आधारित व्याख्यात्मक लेखहरू पढ्नुहोस्।"
                  : "For deeper reporting, use the party, candidate, and constituency pages, then follow the News section for explainers built on the same archived dataset."}
              </p>
            </div>
          </article>
        </section>
      </main>
    </Layout>
  );
}
