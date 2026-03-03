/**
 * CandidateDetailPage — /candidate/:candidateId
 *
 * Layout structure (inspired by competitor page sections/structure — no text copied):
 *   1. Gradient hero banner — photo (left) · name + party + meta (centre) · vote stat (right)
 *   2. Breadcrumb — Home › Candidates › Party › Name
 *   3. Two-column body (lg+):
 *      Left sidebar (sticky): Election info card + Symbol + stat boxes
 *      Right main area: Overview · Personal Info · Education · About · Constituency race
 *   4. Other candidates from same party (table)
 *
 * All data: official Election Commission JSON only.
 * All prose: original, auto-generated from field values — no competitor text reused.
 */

import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { candidatePhotoUrl } from "../lib/parseUpstreamData";
import { partyHex, getParty } from "../lib/partyRegistry";
import { provinceName } from "../i18n";
import type { Lang } from "../i18n";
import Layout from "../components/Layout";
import { PROVINCE_COLORS } from "../components/Layout";
import type { Province } from "../types";

// ── Local value dictionaries ──────────────────────────────────────────────────

const GENDER_EN: Record<string, string> = {
  "पुरुष": "Male",
  "महिला": "Female",
  "अन्य":  "Other",
};

const QUALIFICATION_EN: Record<string, string> = {
  "स्नातक":        "Bachelor's",
  "स्नातकोत्तर":   "Master's",
  "प्रमाणपत्र":    "Certificate",
  "एसएलसी":       "SLC",
  "पिएचडी":       "PhD",
  "प्राविधिक":    "Technical",
  "अक्षरांकन":    "Literate",
  "साक्षर":       "Literate",
  "उच्च शिक्षा":  "Higher Education",
};

function qualEn(np: string): string {
  return QUALIFICATION_EN[np] ?? np;
}

// ── Photo with initials fallback ──────────────────────────────────────────────

function CandidatePhoto({
  id,
  name,
  size = "hero",
}: {
  id: number;
  name: string;
  size?: "hero" | "sm";
}) {
  const [err, setErr] = useState(false);
  const dim =
    size === "hero"
      ? "h-32 w-32 sm:h-40 sm:w-40 text-3xl"
      : "h-10 w-10 text-xs";
  const ring =
    size === "hero"
      ? "ring-4 ring-white/20 shadow-2xl"
      : "ring-2 ring-slate-100 dark:ring-slate-700";
  const rounded = size === "hero" ? "rounded-2xl" : "rounded-full";

  const initials = name
    .split(" ")
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!err) {
    return (
      <img
        src={candidatePhotoUrl(id)}
        alt={name}
        onError={() => setErr(true)}
        className={`${dim} ${rounded} object-cover ${ring}`}
      />
    );
  }
  return (
    <div
      className={`${dim} ${rounded} bg-slate-600/40 flex items-center justify-center font-bold text-white/70 ${ring} shrink-0`}
    >
      {initials}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({
  isWinner,
  status,
  lang,
}: {
  isWinner: boolean;
  status: string;
  lang: Lang;
}) {
  if (isWinner && status === "DECLARED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        🏆 {lang === "np" ? "विजेता" : "Winner"}
      </span>
    );
  }
  const label =
    status === "COUNTING"
      ? lang === "np" ? "मतगणना जारी" : "Counting"
      : status === "DECLARED"
        ? lang === "np" ? "घोषित" : "Declared"
        : lang === "np" ? "बांकी" : "Pending";
  const cls =
    status === "COUNTING"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

// ── Sidebar info row ──────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span
        className={`text-sm font-medium break-words leading-snug ${
          accent
            ? "text-[#2563eb] dark:text-[#3b82f6]"
            : "text-slate-800 dark:text-slate-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  titleNp,
  lang,
  children,
}: {
  title: string;
  titleNp: string;
  lang: Lang;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#060d1f]">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {lang === "np" ? titleNp : title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Stat box ─────────────────────────────────────────────────────────────────

function StatBox({
  value,
  label,
  highlight = false,
}: {
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 px-4 py-3 text-center">
      <div
        className={`text-2xl font-bold tabular-nums leading-none ${
          highlight
            ? "text-[#2563eb] dark:text-[#3b82f6]"
            : "text-slate-900 dark:text-slate-100"
        }`}
        style={{ fontFamily: "'DM Mono', monospace" }}
      >
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-1.5">
        {label}
      </div>
    </div>
  );
}

// ── About text generators ─────────────────────────────────────────────────────

function generateAboutNp(fields: {
  nameNp: string;
  partyNameNp: string;
  districtNp: string;
  constNum: string;
  genderNp: string;
  age?: number;
  qualification?: string;
  address?: string;
}): string {
  const parts: string[] = [];
  parts.push(
    `${fields.nameNp} ${fields.partyNameNp}का तर्फबाट ${fields.districtNp} क्षेत्र नं. ${fields.constNum} बाट प्रतिनिधि सभा सामान्य निर्वाचन २०८२ मा प्रतिस्पर्धा गरिरहनु भएका उम्मेदवार हुन्।`
  );
  if (fields.age && fields.qualification) {
    parts.push(`उहाँको उमेर ${fields.age} वर्ष छ र शैक्षिक योग्यता ${fields.qualification} रहेको छ।`);
  } else if (fields.age) {
    parts.push(`उहाँको उमेर ${fields.age} वर्ष छ।`);
  } else if (fields.qualification) {
    parts.push(`उहाँको शैक्षिक योग्यता ${fields.qualification} रहेको छ।`);
  }
  if (fields.address) {
    parts.push(`उहाँको स्थायी ठेगाना ${fields.address} हो।`);
  }
  return parts.join(" ");
}

function generateAboutEn(fields: {
  name: string;
  partyNameEn: string;
  district: string;
  constNum: string;
  gender: string;
  age?: number;
  qualificationEn?: string;
  address?: string;
}): string {
  const parts: string[] = [];
  const pronoun =
    fields.gender === "Female" ? "She" : fields.gender === "Male" ? "He" : "They";
  parts.push(
    `${fields.name} is contesting the Nepal House of Representatives General Election 2082 (2026) as a candidate for ${fields.partyNameEn} from ${fields.district} Constituency No. ${fields.constNum}.`
  );
  if (fields.age && fields.qualificationEn) {
    parts.push(
      `${pronoun} is ${fields.age} years old and holds a ${fields.qualificationEn} qualification.`
    );
  } else if (fields.age) {
    parts.push(`${pronoun} is ${fields.age} years old.`);
  } else if (fields.qualificationEn) {
    parts.push(`${pronoun} holds a ${fields.qualificationEn} qualification.`);
  }
  if (fields.address) {
    const poss = pronoun === "They" ? "Their" : `${pronoun}'s`;
    parts.push(`${poss} registered address is ${fields.address}.`);
  }
  return parts.join(" ");
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CandidateDetailPage() {
  const { candidateId: paramId } = useParams<{ candidateId: string }>();
  const results  = useElectionStore((s) => s.results);
  const lang     = useElectionStore((s) => s.lang);
  const targetId = paramId ? parseInt(paramId, 10) : NaN;

  useEffect(() => { window.scrollTo(0, 0); }, [targetId]);

  const found = useMemo(() => {
    if (isNaN(targetId)) return null;
    for (const r of results) {
      const cand = r.candidates.find((c) => c.candidateId === targetId);
      if (cand) return { cand, constituency: r };
    }
    return null;
  }, [results, targetId]);

  useEffect(() => {
    if (!found) return;
    const { cand, constituency } = found;
    document.title = `${cand.name} – ${constituency.name} | Nepal Election 2082`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content",
      `${cand.name} (${cand.partyName}) — ${constituency.name}, ${constituency.district}. Nepal House of Representatives Election 2082 vote count and results.`
    );
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `https://nepalvotes.live/candidate/${cand.candidateId}`);
    return () => {
      document.title = "Nepal Election Results 2082 Live | Real-Time Vote Count – NepalVotes";
      if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/");
    };
  }, [found]);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (results.length === 0) {
    return (
      <Layout
        title="Candidate Profile"
        titleNp="उम्मेदवार विवरण"
        subtitle="Loading…"
        subtitleNp="लोड हुँदैछ…"
      >
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-64" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-40" />
          </div>
        </div>
      </Layout>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────────────
  if (!found) {
    return (
      <Layout
        title="Candidate Not Found"
        titleNp="उम्मेदवार फेला परेन"
        subtitle="This candidate ID does not exist in the dataset"
        subtitleNp="यो उम्मेदवार ID डेटासेटमा छैन"
      >
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {lang === "np"
              ? `उम्मेदवार ID ${paramId} फेला परेन।`
              : `Candidate with ID ${paramId} was not found.`}
          </p>
          <Link
            to="/candidates"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] transition"
          >
            ← {lang === "np" ? "उम्मेदवारहरूमा फर्कनुस्" : "Back to Candidates"}
          </Link>
        </div>
      </Layout>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const { cand, constituency } = found;
  const hex       = partyHex(cand.partyId);
  const provCls   = PROVINCE_COLORS[constituency.province as Province] ?? "bg-slate-100 text-slate-700";
  const partyInfo = getParty(cand.partyId);

  const genderNpRaw  = cand.gender === "F" ? "महिला" : "पुरुष";
  const genderEnRaw  = GENDER_EN[genderNpRaw] ?? (cand.gender === "F" ? "Female" : "Male");
  const qualEn_      = cand.qualification ? qualEn(cand.qualification) : undefined;
  const partyNameNp  = cand.partyName;
  const partyNameEn  = partyInfo.nameEn;
  const isWinner     = cand.isWinner && constituency.status === "DECLARED";
  const constNum     = constituency.code.split("-").pop() ?? "";
  const voteShare    = constituency.votesCast > 0
    ? `${((cand.votes / constituency.votesCast) * 100).toFixed(1)}%`
    : "—";

  // Sorted candidates in this constituency
  const sortedCands = useMemo(
    () => [...constituency.candidates].sort((a, b) => b.votes - a.votes),
    [constituency.candidates]
  );
  const candRank = sortedCands.findIndex((c) => c.candidateId === cand.candidateId) + 1;

  // About text
  const aboutNp = generateAboutNp({
    nameNp:        cand.nameNp,
    partyNameNp,
    districtNp:    constituency.districtNp,
    constNum,
    genderNp:      genderNpRaw,
    age:           cand.age,
    qualification: cand.qualification,
    address:       cand.address,
  });
  const aboutEn = generateAboutEn({
    name:            cand.name,
    partyNameEn,
    district:        constituency.district,
    constNum,
    gender:          genderEnRaw,
    age:             cand.age,
    qualificationEn: qualEn_,
    address:         cand.address,
  });

  return (
    <Layout
      title={`${cand.name} – Nepal Election 2082`}
      titleNp={`${cand.nameNp} – निर्वाचन २०८२`}
      subtitle={`${partyNameEn} · ${constituency.name}`}
      subtitleNp={`${partyNameNp} · ${constituency.nameNp}`}
    >
      {/* ── Gradient hero banner ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${hex}22 0%, #0c1525 60%, #060d1f 100%)`,
          borderBottom: `2px solid ${hex}30`,
        }}
      >
        {/* Winner strip */}
        {isWinner && (
          <div className="bg-emerald-500 text-white text-[11px] font-bold px-4 py-1.5 text-center tracking-wide">
            🏆 {lang === "np" ? "प्रतिनिधि सभा सदस्य — विजेता घोषित" : "Declared Winner — Member of House of Representatives"}
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

            {/* Photo */}
            <div className="shrink-0">
              <CandidatePhoto id={cand.candidateId} name={lang === "np" ? cand.nameNp : cand.name} size="hero" />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 space-y-2">
              <h1
                className="text-2xl sm:text-3xl font-bold text-white leading-tight"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {lang === "np" ? cand.nameNp : cand.name}
              </h1>

              {/* Party */}
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-sm font-semibold text-white/80">
                  {lang === "np" ? partyNameNp : partyNameEn}
                </span>
              </div>

              {/* Location badges */}
              <div className="flex flex-wrap gap-2">
                <span className={"text-[11px] font-semibold px-2.5 py-0.5 rounded-full " + provCls}>
                  {provinceName(constituency.province, lang)}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-white/70">
                  {lang === "np" ? constituency.districtNp : constituency.district}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-white/70">
                  {lang === "np" ? constituency.nameNp : constituency.name}
                </span>
              </div>

              {/* Status + gender */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge isWinner={cand.isWinner} status={constituency.status} lang={lang} />
                <span className="text-xs text-white/40">
                  {cand.gender === "M"
                    ? lang === "np" ? "♂ पुरुष" : "♂ Male"
                    : lang === "np" ? "♀ महिला" : "♀ Female"}
                </span>
                <span className="text-xs text-white/30">
                  ID: {cand.candidateId}
                </span>
              </div>
            </div>

            {/* Vote stat (right) */}
            <div className="shrink-0 rounded-2xl bg-white/5 border border-white/10 px-6 py-4 text-center min-w-[120px]">
              <div
                className="text-3xl font-bold tabular-nums text-white leading-none"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {cand.votes > 0 ? cand.votes.toLocaleString("en-IN") : "—"}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mt-2">
                {lang === "np" ? "प्राप्त मत" : "Votes"}
              </div>
              {cand.votes > 0 && (
                <div className="text-xs text-white/50 mt-1">{voteShare}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0c1525] border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
          <Link to="/" className="hover:text-[#2563eb] transition">
            {lang === "np" ? "गृहपृष्ठ" : "Home"}
          </Link>
          <span>›</span>
          <Link to="/candidates" className="hover:text-[#2563eb] transition">
            {lang === "np" ? "उम्मेदवार" : "Candidates"}
          </Link>
          <span>›</span>
          <span className="font-medium" style={{ color: hex }}>
            {lang === "np" ? partyNameNp : partyNameEn}
          </span>
          <span>›</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[180px]">
            {lang === "np" ? cand.nameNp : cand.name}
          </span>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT SIDEBAR (sticky) ──────────────────────────────────────── */}
          <div className="w-full lg:w-72 shrink-0 space-y-4 lg:sticky lg:top-20">

            {/* Election info card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#060d1f]">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {lang === "np" ? "निर्वाचन जानकारी" : "Election Information"}
                </h2>
              </div>
              <div className="px-4 py-1 divide-y divide-slate-50 dark:divide-slate-800/60">
                <InfoRow
                  label={lang === "np" ? "स्थिति" : "Status"}
                  value={
                    isWinner
                      ? lang === "np" ? "विजेता 🏆" : "Winner 🏆"
                      : constituency.status === "COUNTING"
                        ? lang === "np" ? "मतगणना जारी" : "Counting"
                        : constituency.status === "DECLARED"
                          ? lang === "np" ? "घोषित" : "Declared"
                          : lang === "np" ? "बांकी" : "Pending"
                  }
                  accent={isWinner}
                />
                <InfoRow
                  label={lang === "np" ? "निर्वाचन क्षेत्र" : "Constituency"}
                  value={lang === "np" ? constituency.nameNp : constituency.name}
                />
                <InfoRow
                  label={lang === "np" ? "जिल्ला" : "District"}
                  value={lang === "np" ? constituency.districtNp : constituency.district}
                />
                <InfoRow
                  label={lang === "np" ? "प्रदेश" : "Province"}
                  value={provinceName(constituency.province, lang)}
                />
                <InfoRow
                  label={lang === "np" ? "राजनीतिक दल" : "Political Party"}
                  value={lang === "np" ? partyNameNp : partyNameEn}
                />
                <InfoRow
                  label={lang === "np" ? "उम्मेदवार ID" : "Candidate ID"}
                  value={String(cand.candidateId)}
                />
              </div>
            </div>

            {/* Party symbol */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#060d1f]">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {lang === "np" ? "दलको चिन्ह" : "Party Symbol"}
                </h2>
              </div>
              <div className="px-4 py-4 flex flex-col items-center gap-3">
                {partyInfo.symbolUrl ? (
                  <img
                    src={partyInfo.symbolUrl}
                    alt={partyNameEn}
                    className="h-16 w-16 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="text-4xl">{partyInfo.symbol}</div>
                )}
                <div className="text-center">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {lang === "np" ? partyNameNp : partyNameEn}
                  </div>
                </div>
              </div>
            </div>

            {/* Stat boxes */}
            {cand.votes > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <StatBox
                  value={cand.votes.toLocaleString("en-IN")}
                  label={lang === "np" ? "मत" : "Votes"}
                  highlight
                />
                <StatBox
                  value={candRank > 0 ? `#${candRank}` : "—"}
                  label={lang === "np" ? "क्रम" : "Rank"}
                />
                <StatBox
                  value={voteShare}
                  label={lang === "np" ? "मत %" : "Vote %"}
                />
                <StatBox
                  value={String(constituency.candidates.length)}
                  label={lang === "np" ? "प्रतिस्पर्धी" : "Rivals"}
                />
              </div>
            )}
          </div>

          {/* ── RIGHT MAIN CONTENT ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* 1. Overview */}
            <SectionCard title="Overview" titleNp="सारांश" lang={lang}>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === "np" ? aboutNp : aboutEn}
              </p>
              <p className="text-[10px] text-slate-300 dark:text-slate-700 mt-3">
                {lang === "np"
                  ? "निर्वाचन आयोग नेपालको आधिकारिक डेटाबाट स्वचालित रूपमा तयार।"
                  : "Auto-generated from official Election Commission of Nepal data."}
              </p>
            </SectionCard>

            {/* 2. Personal Information */}
            <SectionCard title="Personal Information" titleNp="व्यक्तिगत जानकारी" lang={lang}>
              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                <InfoRow
                  label={lang === "np" ? "लिङ्ग" : "Gender"}
                  value={lang === "np" ? genderNpRaw : genderEnRaw}
                />
                {cand.age && (
                  <InfoRow
                    label={lang === "np" ? "उमेर" : "Age"}
                    value={lang === "np" ? `${cand.age} वर्ष` : `${cand.age} years`}
                  />
                )}
                {cand.fatherName && (
                  <InfoRow
                    label={lang === "np" ? "बाबाको नाम" : "Father's Name"}
                    value={cand.fatherName}
                  />
                )}
                {cand.spouseName && (
                  <InfoRow
                    label={lang === "np" ? "पतिपत्नीको नाम" : "Spouse's Name"}
                    value={cand.spouseName}
                  />
                )}
                {cand.address && (
                  <InfoRow
                    label={lang === "np" ? "ठेगाना" : "Address"}
                    value={cand.address}
                  />
                )}
                {!cand.age && !cand.fatherName && !cand.spouseName && !cand.address && (
                  <p className="text-xs text-center text-slate-400 dark:text-slate-600 py-4">
                    {lang === "np"
                      ? "विस्तृत व्यक्तिगत जानकारी उपलब्ध छैन।"
                      : "Detailed personal information not available in the dataset."}
                  </p>
                )}
              </div>
            </SectionCard>

            {/* 3. Education & Experience */}
            {(cand.qualification || cand.institution || cand.experience) && (
              <SectionCard title="Education & Experience" titleNp="शिक्षा र अनुभव" lang={lang}>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {cand.qualification && (
                    <InfoRow
                      label={lang === "np" ? "शैक्षिक योग्यता" : "Education"}
                      value={lang === "np" ? cand.qualification : (qualEn_ ?? cand.qualification)}
                    />
                  )}
                  {cand.institution && (
                    <InfoRow
                      label={lang === "np" ? "संस्था" : "Institution"}
                      value={cand.institution}
                    />
                  )}
                  {cand.experience && (
                    <InfoRow
                      label={lang === "np" ? "अनुभव" : "Experience"}
                      value={cand.experience}
                    />
                  )}
                </div>
              </SectionCard>
            )}

            {/* 4. Data source */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-[#060d1f] px-5 py-3 flex items-start gap-3">
              <span className="text-base shrink-0 mt-0.5">📋</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === "np"
                  ? "यो पृष्ठमा प्रदर्शित सबै जानकारी "
                  : "All information on this page is sourced from "}
                <a
                  href="https://result.election.gov.np"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  result.election.gov.np
                </a>
                {lang === "np"
                  ? " बाट प्राप्त गरिएको हो। यो साइट निर्वाचन आयोगसँग आबद्ध छैन।"
                  : " (Election Commission of Nepal). This site is not affiliated with the Election Commission."}
              </p>
            </div>
          </div>
        </div>

        {/* ── Constituency race (full-width) ───────────────────────────────── */}
        <div className="mt-6">
          <SectionCard title="Constituency Race" titleNp="निर्वाचन क्षेत्रको प्रतिस्पर्धा" lang={lang}>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <StatBox
                value={String(constituency.candidates.length)}
                label={lang === "np" ? "कुल उम्मेदवार" : "Total Candidates"}
              />
              <StatBox
                value={constituency.votesCast > 0 ? constituency.votesCast.toLocaleString("en-IN") : "—"}
                label={lang === "np" ? "कुल मत" : "Total Votes Cast"}
              />
              <StatBox
                value={candRank > 0 && cand.votes > 0 ? `#${candRank}` : "—"}
                label={lang === "np" ? "यो उम्मेदवारको क्रम" : "This Candidate's Rank"}
                highlight
              />
            </div>

            {/* Full candidate list */}
            <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#060d1f] border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 w-8">#</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">
                      {lang === "np" ? "उम्मेदवार" : "Candidate"}
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                      {lang === "np" ? "दल" : "Party"}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">
                      {lang === "np" ? "मत" : "Votes"}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCands.map((c, i) => {
                    const isThis   = c.candidateId === cand.candidateId;
                    const ph       = partyHex(c.partyId);
                    const pInfo    = getParty(c.partyId);
                    const pName    = lang === "np" ? c.partyName : pInfo.nameEn;
                    const pct      = constituency.votesCast > 0
                      ? ((c.votes / constituency.votesCast) * 100).toFixed(1)
                      : "—";
                    return (
                      <tr
                        key={c.candidateId}
                        className={`border-b border-slate-50 dark:border-slate-800/60 transition-colors last:border-0 ${
                          isThis
                            ? "bg-blue-50 dark:bg-blue-950/20"
                            : ""
                        }`}
                      >
                        <td className="px-3 py-2.5 font-bold text-slate-400 dark:text-slate-600">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <span className={`font-medium leading-snug ${isThis ? "text-[#2563eb] dark:text-[#3b82f6]" : "text-slate-700 dark:text-slate-300"}`}>
                            {lang === "np" ? c.nameNp : c.name}
                            {c.isWinner && <span className="ml-1 text-emerald-500">🏆</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ph }} />
                            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[160px]">{pName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-400" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {c.votes > 0 ? c.votes.toLocaleString("en-IN") : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-400 dark:text-slate-600 hidden sm:table-cell" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {pct !== "—" ? `${pct}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* ── Bottom nav ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 mt-6 pt-2">
          <Link
            to="/candidates"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] text-xs font-semibold text-slate-600 dark:text-slate-400 hover:border-[#2563eb]/50 hover:text-[#2563eb] transition"
          >
            ← {lang === "np" ? "सबै उम्मेदवार" : "All Candidates"}
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] text-xs font-semibold text-slate-600 dark:text-slate-400 hover:border-[#2563eb]/50 hover:text-[#2563eb] transition"
          >
            {lang === "np" ? "निर्वाचन क्षेत्र →" : "Explore Constituencies →"}
          </Link>
        </div>
      </div>
    </Layout>
  );
}
