import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { getPartyBySlug, partyHex } from "../lib/partyRegistry";
import { provinceName } from "../i18n";
import Layout from "../components/Layout";
import PartySymbol from "../components/PartySymbol";

const PAGE_SIZE = 10;

type PartyConstituencyRow = {
  code: string;
  name: string;
  nameNp: string;
  district: string;
  districtNp: string;
  province: string;
  candidateName: string;
  candidateNameNp: string;
  partyId: string;
  votes: number;
  margin: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (next: number) => void;
}) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;

  const pages: (number | "…")[] = [];
  const include = new Set<number>();
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || (p >= page - 1 && p <= page + 1)) include.add(p);
  }
  let prev = 0;
  for (const p of Array.from(include).sort((a, b) => a - b)) {
    if (prev !== 0 && p - prev > 1) pages.push("…");
    pages.push(p);
    prev = p;
  }

  const buttonClass = (active: boolean, disabled: boolean) =>
    "h-8 min-w-[2rem] rounded-lg border px-2 text-xs font-semibold transition " +
    (active
      ? "border-[#2563eb] bg-[#2563eb] text-white"
      : disabled
      ? "cursor-default border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-[#0c1525] dark:text-slate-600"
      : "border-slate-200 bg-white text-slate-600 hover:border-[#2563eb]/50 hover:text-[#2563eb] dark:border-slate-700 dark:bg-[#0c1525] dark:text-slate-400");

  return (
    <div className="flex items-center justify-center gap-1 border-t border-slate-100 px-4 py-3 dark:border-slate-800/80">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className={buttonClass(false, page === 1)}
      >
        ←
      </button>
      {pages.map((item, idx) =>
        item === "…" ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={buttonClass(item === page, false)}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        className={buttonClass(false, page === pageCount)}
      >
        →
      </button>
    </div>
  );
}

function ConstituencyRow({
  row,
  lang,
  seatType,
}: {
  row: PartyConstituencyRow;
  lang: "en" | "np";
  seatType: "declared" | "leading";
}) {
  const voteLabel = lang === "np" ? "मत" : "votes";
  const marginLabel = lang === "np" ? "अन्तर" : "Margin";
  const seatTag = seatType === "declared"
    ? (lang === "np" ? "घोषित सिट" : "Declared Seat")
    : (lang === "np" ? "अग्रणी सिट" : "Leading Seat");

  return (
    <Link
      to={`/constituency/${encodeURIComponent(row.code)}`}
      className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {lang === "np" ? row.nameNp : row.name}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {lang === "np" ? row.districtNp : row.district} · {provinceName(row.province, lang)}
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {seatTag}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <PartySymbol partyId={row.partyId} size="sm" />
          <span className="truncate text-xs text-slate-700 dark:text-slate-300">
            {lang === "np" ? row.candidateNameNp : row.candidateName}
          </span>
        </div>
        <div className="text-right">
          <div
            className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {fmt(row.votes)} {voteLabel}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {marginLabel}: {row.margin > 0 ? fmt(row.margin) : "—"}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function PartyConstituenciesPage() {
  const { partySlug: slugParam } = useParams<{ partySlug: string }>();
  const results = useElectionStore((s) => s.results);
  const lang = useElectionStore((s) => s.lang);
  const navigate = useNavigate();

  const [declaredPage, setDeclaredPage] = useState(1);
  const [leadingPage, setLeadingPage] = useState(1);

  const slug = slugParam ?? "";
  const found = useMemo(() => getPartyBySlug(slug), [slug, results]);

  useEffect(() => {
    if (results.length > 0 && !found) navigate("/parties", { replace: true });
  }, [results, found, navigate]);

  useEffect(() => {
    setDeclaredPage(1);
    setLeadingPage(1);
  }, [slug]);

  useEffect(() => {
    if (!found) return;
    document.title = `${found.nameEn} Constituencies – Nepal Election 2082 | NepalVotes`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute(
      "content",
      `${found.nameEn} declared and leading constituencies in Nepal House of Representatives Election 2082.`,
    );
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `https://nepalvotes.live/party/${slug}/constituencies`);
    return () => {
      document.title = "Nepal Election Results 2082 Live | Real-Time Vote Count – NepalVotes";
      if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/");
    };
  }, [found, slug]);

  if (!found) {
    return (
      <Layout
        title="Party Constituencies"
        titleNp="दल निर्वाचन क्षेत्र"
        subtitle="Loading…"
        subtitleNp="लोड हुँदैछ…"
      >
        <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-slate-400">
          {results.length === 0 ? "Loading data…" : "Party not found."}
        </div>
      </Layout>
    );
  }

  const partyId = found.partyId;
  const hex = partyHex(partyId);

  const declaredRows = useMemo<PartyConstituencyRow[]>(() => {
    const rows: PartyConstituencyRow[] = [];
    for (const r of results) {
      if (r.status !== "DECLARED" || r.candidates.length === 0) continue;
      const sorted = [...r.candidates].sort((a, b) => b.votes - a.votes);
      const winner = r.candidates.find((c) => c.isWinner) ?? sorted[0];
      if (!winner) continue;
      if (winner.partyId !== partyId) continue;
      const runnerUpVotes = Math.max(
        0,
        ...r.candidates
          .filter((c) => c.candidateId !== winner.candidateId)
          .map((c) => c.votes),
      );
      rows.push({
        code: r.code,
        name: r.name,
        nameNp: r.nameNp,
        district: r.district,
        districtNp: r.districtNp,
        province: r.province,
        candidateName: winner.name,
        candidateNameNp: winner.nameNp,
        partyId: winner.partyId,
        votes: winner.votes,
        margin: winner.votes - runnerUpVotes,
      });
    }
    return rows.sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
  }, [results, partyId]);

  const leadingRows = useMemo<PartyConstituencyRow[]>(() => {
    const rows: PartyConstituencyRow[] = [];
    for (const r of results) {
      if (r.status !== "COUNTING" || r.candidates.length === 0) continue;
      const maxVotes = Math.max(...r.candidates.map((c) => c.votes));
      if (maxVotes <= 0) continue;
      const leadCandidate = r.candidates.find((c) => c.partyId === partyId && c.votes === maxVotes);
      if (!leadCandidate) continue;
      const runnerUpVotes = Math.max(
        0,
        ...r.candidates
          .filter((c) => c.candidateId !== leadCandidate.candidateId)
          .map((c) => c.votes),
      );
      rows.push({
        code: r.code,
        name: r.name,
        nameNp: r.nameNp,
        district: r.district,
        districtNp: r.districtNp,
        province: r.province,
        candidateName: leadCandidate.name,
        candidateNameNp: leadCandidate.nameNp,
        partyId: leadCandidate.partyId,
        votes: leadCandidate.votes,
        margin: leadCandidate.votes - runnerUpVotes,
      });
    }
    return rows.sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
  }, [results, partyId]);

  const declaredPageCount = Math.max(1, Math.ceil(declaredRows.length / PAGE_SIZE));
  const leadingPageCount = Math.max(1, Math.ceil(leadingRows.length / PAGE_SIZE));
  const safeDeclaredPage = Math.min(declaredPage, declaredPageCount);
  const safeLeadingPage = Math.min(leadingPage, leadingPageCount);

  const declaredSlice = declaredRows.slice((safeDeclaredPage - 1) * PAGE_SIZE, safeDeclaredPage * PAGE_SIZE);
  const leadingSlice = leadingRows.slice((safeLeadingPage - 1) * PAGE_SIZE, safeLeadingPage * PAGE_SIZE);

  const heroBadge = (
    <div className="inline-flex items-center gap-2">
      <Link
        to="/"
        className="text-xs text-white/50 transition-colors hover:text-white/80"
      >
        ← {lang === "np" ? "होम" : "Home"}
      </Link>
      <span className="text-white/20">·</span>
      <span className="text-xs text-white/60">
        {lang === "np" ? "दल निर्वाचन क्षेत्र ट्र्याकर" : "Party constituency tracker"}
      </span>
    </div>
  );

  return (
    <Layout
      title={`${found.nameEn} Constituencies`}
      titleNp={`${found.partyName} निर्वाचन क्षेत्र`}
      subtitle={`${declaredRows.length} ${lang === "np" ? "घोषित" : "declared"} · ${leadingRows.length} ${lang === "np" ? "अग्रणी" : "leading"}`}
      subtitleNp={`${declaredRows.length} घोषित · ${leadingRows.length} अग्रणी`}
      badge={heroBadge}
    >
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800/80 dark:bg-[#0c1525]">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {lang === "np" ? "घोषित सिट" : "Declared Seats"}
            </div>
            <div
              className="mt-1 text-3xl font-bold tabular-nums"
              style={{ color: hex, fontFamily: "'DM Mono', monospace" }}
            >
              {declaredRows.length}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800/80 dark:bg-[#0c1525]">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {lang === "np" ? "अग्रणी सिट" : "Leading Constituencies"}
            </div>
            <div
              className="mt-1 text-3xl font-bold tabular-nums"
              style={{ color: hex, fontFamily: "'DM Mono', monospace" }}
            >
              {leadingRows.length}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800/80 dark:bg-[#0c1525]">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {lang === "np" ? "ट्र्याक गरिएका सिट" : "Tracked Constituencies"}
            </div>
            <div
              className="mt-1 text-3xl font-bold tabular-nums"
              style={{ color: hex, fontFamily: "'DM Mono', monospace" }}
            >
              {declaredRows.length + leadingRows.length}
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#0c1525]">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800/80">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {lang === "np" ? "घोषित निर्वाचन क्षेत्र" : "Declared Constituencies"}
              <span className="ml-2 text-xs font-normal text-slate-400">({declaredRows.length})</span>
            </h2>
          </div>
          {declaredRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              {lang === "np" ? "अहिलेसम्म घोषित सिट छैन।" : "No declared constituencies yet."}
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {declaredSlice.map((row) => (
                  <ConstituencyRow key={row.code} row={row} lang={lang} seatType="declared" />
                ))}
              </div>
              <Pagination
                page={safeDeclaredPage}
                total={declaredRows.length}
                pageSize={PAGE_SIZE}
                onChange={(next) => {
                  setDeclaredPage(next);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#0c1525]">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800/80">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {lang === "np" ? "अग्रणी निर्वाचन क्षेत्र" : "Leading Constituencies"}
              <span className="ml-2 text-xs font-normal text-slate-400">({leadingRows.length})</span>
            </h2>
          </div>
          {leadingRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              {lang === "np" ? "अहिलेसम्म अग्रणी सिट छैन।" : "No leading constituencies right now."}
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {leadingSlice.map((row) => (
                  <ConstituencyRow key={row.code} row={row} lang={lang} seatType="leading" />
                ))}
              </div>
              <Pagination
                page={safeLeadingPage}
                total={leadingRows.length}
                pageSize={PAGE_SIZE}
                onChange={(next) => {
                  setLeadingPage(next);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}
