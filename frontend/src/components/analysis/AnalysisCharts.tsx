import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Lang } from "../../i18n";
import { provinceName } from "../../i18n";
import type { PartyAnalysisRow, ProvinceAnalysisRow, RaceRow } from "../../lib/analysis";
import { getParty } from "../../lib/partyRegistry";
import PartySymbol from "../PartySymbol";

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function fmtPct(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function ChartShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#0c1525]">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {children}
    </article>
  );
}

export function SeatCompositionChart({ rows, lang }: { rows: PartyAnalysisRow[]; lang: Lang }) {
  type Segment = {
    partyId: string;
    partyName: string;
    totalSeats: number;
    hex: string;
  };

  const rowsWithSeats = rows.filter((row) => row.totalSeats > 0);
  const totalSeats = rowsWithSeats.reduce((sum, row) => sum + row.totalSeats, 0);
  const visibleRows = rowsWithSeats.slice(0, 7);
  const othersSeats = rowsWithSeats.slice(7).reduce((sum, row) => sum + row.totalSeats, 0);

  const segments: Segment[] = othersSeats > 0
    ? [
        ...visibleRows.map((row) => ({
          partyId: row.partyId,
          partyName: row.partyName,
          totalSeats: row.totalSeats,
          hex: getParty(row.partyId).hex,
        })),
        {
          partyId: "OTHERS",
          partyName: lang === "np" ? "अन्य" : "Others",
          totalSeats: othersSeats,
          hex: "#94a3b8",
        },
      ]
    : visibleRows.map((row) => ({
        partyId: row.partyId,
        partyName: row.partyName,
        totalSeats: row.totalSeats,
        hex: getParty(row.partyId).hex,
      }));

  return (
    <ChartShell
      title={lang === "np" ? "सिट संरचना" : "Seat Composition"}
      description={
        lang === "np"
          ? "अन्तिम २७५ सिटमा कुन दलको कति हिस्सा छ भन्ने एकै नजरमा।"
          : "How the 275 final seats are distributed across the main parties."
      }
    >
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex h-6 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {segments.map((segment) => (
            <div
              key={segment.partyId}
              title={`${segment.partyName}: ${segment.totalSeats}`}
              className="h-full transition-[width] duration-500"
              style={{
                width: `${totalSeats > 0 ? (segment.totalSeats / totalSeats) * 100 : 0}%`,
                backgroundColor: segment.hex,
              }}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {segments.map((segment) => (
            <div key={segment.partyId} className="flex items-center gap-3 rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-slate-900/50">
              {segment.partyId === "OTHERS" ? (
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: segment.hex }} />
              ) : (
                <PartySymbol partyId={segment.partyId} size="sm" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {segment.partyName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {totalSeats > 0 ? ((segment.totalSeats / totalSeats) * 100).toFixed(1) : "0.0"}%
                </div>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{segment.totalSeats}</div>
            </div>
          ))}
        </div>
      </div>
    </ChartShell>
  );
}

export function PartyVoteSeatChart({ rows, lang }: { rows: PartyAnalysisRow[]; lang: Lang }) {
  const topRows = rows
    .filter((row) => row.totalSeats > 0 || row.constituencyVoteShare > 1 || row.prVoteShare > 1)
    .slice(0, 8);
  const totalSeats = rows.reduce((sum, row) => sum + row.totalSeats, 0);

  return (
    <ChartShell
      title={lang === "np" ? "मत बनाम सिट" : "Votes vs Seats"}
      description={
        lang === "np"
          ? "क्षेत्रीय मत, PR मत, र अन्तिम सिट हिस्सा एउटै फ्रेममा।"
          : "Compare constituency votes, PR votes, and final seat share side by side."
      }
    >
      <div className="space-y-4">
        {topRows.map((row) => {
          const seatShare = totalSeats > 0 ? (row.totalSeats / totalSeats) * 100 : 0;
          return (
            <div key={row.partyId} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <PartySymbol partyId={row.partyId} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{row.partyName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {row.fptpSeats} FPTP + {row.prSeats} PR
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm font-bold text-slate-900 dark:text-slate-100">
                  {row.totalSeats}
                </div>
              </div>

              {[
                {
                  label: lang === "np" ? "क्षेत्रीय मत हिस्सा" : "Constituency share",
                  value: row.constituencyVoteShare,
                  color: "#2563eb",
                },
                {
                  label: lang === "np" ? "PR मत हिस्सा" : "PR share",
                  value: row.prVoteShare,
                  color: "#10b981",
                },
                {
                  label: lang === "np" ? "सिट हिस्सा" : "Seat share",
                  value: seatShare,
                  color: "#f59e0b",
                },
              ].map((metric) => (
                <div key={metric.label} className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{metric.label}</span>
                    <span>{fmtPct(metric.value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, metric.value)}%`, backgroundColor: metric.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}

export function ProvinceTurnoutChart({ rows, lang }: { rows: ProvinceAnalysisRow[]; lang: Lang }) {
  const sortedRows = [...rows].sort((a, b) => (b.turnoutPct ?? -1) - (a.turnoutPct ?? -1));

  return (
    <ChartShell
      title={lang === "np" ? "प्रदेशअनुसार टर्नआउट" : "Turnout by Province"}
      description={
        lang === "np"
          ? "प्रदेशस्तरमा मतदाता सहभागिता र घोषणा प्रगति।"
          : "Provincial participation levels with declaration progress for context."
      }
    >
      <div className="space-y-4">
        {sortedRows.map((row) => {
          const declarationShare = row.totalConstituencies > 0
            ? (row.declaredConstituencies / row.totalConstituencies) * 100
            : 0;
          const leader = row.leadingPartyId ? getParty(row.leadingPartyId) : null;

          return (
            <div key={row.province} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{provinceName(row.province, lang)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {leader ? `${leader.nameEn} · ${row.leadingSeats} ${lang === "np" ? "सिट" : "seats"}` : (lang === "np" ? "अग्रणी छैन" : "No seat leader")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{fmtPct(row.turnoutPct)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {row.declaredConstituencies}/{row.totalConstituencies} {lang === "np" ? "घोषित" : "declared"}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{lang === "np" ? "टर्नआउट" : "Turnout"}</span>
                  <span>{fmtPct(row.turnoutPct)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, row.turnoutPct ?? 0)}%` }} />
                </div>
              </div>

              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{lang === "np" ? "घोषणा प्रगति" : "Declaration progress"}</span>
                  <span>{declarationShare.toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${declarationShare}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}

export function RaceMarginChart({
  rows,
  lang,
  title,
  description,
  tone,
}: {
  rows: RaceRow[];
  lang: Lang;
  title: string;
  description: string;
  tone: "rose" | "emerald";
}) {
  const barClass = tone === "rose" ? "bg-rose-500" : "bg-emerald-500";
  const maxMarginPct = Math.max(...rows.map((row) => row.marginPct), 1);

  return (
    <ChartShell title={title} description={description}>
      <div className="space-y-3">
        {rows.map((row) => (
          <Link
            key={row.code}
            to={`/constituency/${encodeURIComponent(row.code)}`}
            className="block rounded-2xl border border-slate-200 p-4 transition hover:border-[#2563eb]/40 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:border-[#3b82f6]/40 dark:hover:bg-slate-900/70"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{row.name}</div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {provinceName(row.province, lang)} · {row.leaderName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmtPct(row.marginPct)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{fmt(row.marginVotes)} {lang === "np" ? "मत" : "votes"}</div>
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${barClass}`}
                style={{ width: `${Math.max(8, (row.marginPct / maxMarginPct) * 100)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </ChartShell>
  );
}
