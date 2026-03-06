import { useEffect, useRef, useState } from "react";
import type { ConstituencyResult, ConstituencyStatus } from "./types";
import type { Lang } from "./i18n";
import { getParty } from "./lib/partyRegistry";

type Snapshot = {
  status: ConstituencyStatus;
  leaderId: number | null;
  leaderName: string;
  leaderNameNp: string;
  leaderPartyId: string;
  leaderPartyName: string;
  runnerUpId: number | null;
  runnerUpName: string;
  runnerUpNameNp: string;
  marginVotes: number;
};

type UpdateItem = {
  id: string;
  kind: "declared" | "lead_change" | "top2_change";
  at: string;
  constCode: string;
  constName: string;
  constNameNp: string;
  leaderName: string;
  leaderNameNp: string;
  leaderPartyId: string;
  leaderPartyName: string;
  runnerUpName: string;
  runnerUpNameNp: string;
  previousLeaderName?: string;
  previousLeaderNameNp?: string;
  previousRunnerUpName?: string;
  previousRunnerUpNameNp?: string;
  marginVotes: number;
};

const MAX_ITEMS = 3;

function constituencySnapshot(r: ConstituencyResult): Snapshot {
  const sorted = [...r.candidates].sort((a, b) => b.votes - a.votes);
  const leader = sorted[0];
  const runnerUp = sorted[1];
  return {
    status: r.status,
    leaderId: leader?.candidateId ?? null,
    leaderName: leader?.name ?? "",
    leaderNameNp: leader?.nameNp ?? "",
    leaderPartyId: leader?.partyId ?? "",
    leaderPartyName: leader?.partyName ?? "",
    runnerUpId: runnerUp?.candidateId ?? null,
    runnerUpName: runnerUp?.name ?? "",
    runnerUpNameNp: runnerUp?.nameNp ?? "",
    marginVotes: leader && runnerUp ? Math.max(0, leader.votes - runnerUp.votes) : 0,
  };
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function declaredItem(r: ConstituencyResult, curr: Snapshot): UpdateItem {
  return {
    id: `declared-${r.code}-${r.lastUpdated}-${curr.leaderId ?? "none"}`,
    kind: "declared",
    at: r.lastUpdated,
    constCode: r.code,
    constName: r.name,
    constNameNp: r.nameNp,
    leaderName: curr.leaderName,
    leaderNameNp: curr.leaderNameNp,
    leaderPartyId: curr.leaderPartyId,
    leaderPartyName: curr.leaderPartyName,
    runnerUpName: curr.runnerUpName,
    runnerUpNameNp: curr.runnerUpNameNp,
    marginVotes: curr.marginVotes,
  };
}

export default function LatestUpdates({ results, lang }: { results: ConstituencyResult[]; lang: Lang }) {
  const [items, setItems] = useState<UpdateItem[]>([]);
  const prevRef = useRef<Map<string, Snapshot>>(new Map());

  useEffect(() => {
    const nextMap = new Map<string, Snapshot>();
    for (const r of results) {
      nextMap.set(r.code, constituencySnapshot(r));
    }

    if (prevRef.current.size === 0) {
      // Prefill on first data load so this section is not empty until next poll.
      // Show currently declared constituencies ordered by latest update time.
      const seeded = results
        .filter((r) => r.status === "DECLARED")
        .map((r) => {
          const curr = nextMap.get(r.code);
          return curr ? declaredItem(r, curr) : null;
        })
        .filter((x): x is UpdateItem => x !== null)
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        .slice(0, MAX_ITEMS);
      if (seeded.length > 0) setItems(seeded);
      prevRef.current = nextMap;
      return;
    }

    const fresh: UpdateItem[] = [];
    for (const r of results) {
      const prev = prevRef.current.get(r.code);
      const curr = nextMap.get(r.code);
      if (!prev || !curr) continue;

      if (prev.status !== "DECLARED" && curr.status === "DECLARED") {
        fresh.push(declaredItem(r, curr));
        continue;
      }

      if (
        prev.status === "COUNTING" &&
        curr.status === "COUNTING" &&
        prev.leaderId !== null &&
        curr.leaderId !== null &&
        prev.leaderId !== curr.leaderId
      ) {
        fresh.push({
          id: `lead-${r.code}-${r.lastUpdated}-${prev.leaderId}-${curr.leaderId}`,
          kind: "lead_change",
          at: r.lastUpdated,
          constCode: r.code,
          constName: r.name,
          constNameNp: r.nameNp,
          leaderName: curr.leaderName,
          leaderNameNp: curr.leaderNameNp,
          leaderPartyId: curr.leaderPartyId,
          leaderPartyName: curr.leaderPartyName,
          runnerUpName: curr.runnerUpName,
          runnerUpNameNp: curr.runnerUpNameNp,
          previousLeaderName: prev.leaderName,
          previousLeaderNameNp: prev.leaderNameNp,
          marginVotes: curr.marginVotes,
        });
        continue;
      }

      if (
        prev.status === "COUNTING" &&
        curr.status === "COUNTING" &&
        prev.leaderId !== null &&
        curr.leaderId !== null &&
        prev.leaderId === curr.leaderId &&
        prev.runnerUpId !== null &&
        curr.runnerUpId !== null &&
        prev.runnerUpId !== curr.runnerUpId
      ) {
        fresh.push({
          id: `top2-${r.code}-${r.lastUpdated}-${prev.runnerUpId}-${curr.runnerUpId}`,
          kind: "top2_change",
          at: r.lastUpdated,
          constCode: r.code,
          constName: r.name,
          constNameNp: r.nameNp,
          leaderName: curr.leaderName,
          leaderNameNp: curr.leaderNameNp,
          leaderPartyId: curr.leaderPartyId,
          leaderPartyName: curr.leaderPartyName,
          runnerUpName: curr.runnerUpName,
          runnerUpNameNp: curr.runnerUpNameNp,
          previousRunnerUpName: prev.runnerUpName,
          previousRunnerUpNameNp: prev.runnerUpNameNp,
          marginVotes: curr.marginVotes,
        });
      }
    }

    if (fresh.length > 0) {
      fresh.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setItems((old) => [...fresh, ...old].slice(0, MAX_ITEMS));
    }

    prevRef.current = nextMap;
  }, [results]);

  const visibleItems = items.slice(0, MAX_ITEMS);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm dark:bg-[#0c1525] dark:border-slate-800/80">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {lang === "np" ? "ताजा अपडेट" : "Latest Updates"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === "np" ? "हालका घोषित परिणाम र शीर्ष-२ दौड परिवर्तन" : "Current declared seats and top-2 race changes"}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {items.length}
        </span>
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
          {lang === "np"
            ? "मतगणना सुरु भएपछि अपडेटहरू यहाँ देखिनेछन्।"
            : "Updates will appear here once counting activity starts."}
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {visibleItems.map((u) => {
              const partyLabel = lang === "np" ? u.leaderPartyName : getParty(u.leaderPartyId).nameEn;
              return (
                <div key={u.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={
                        "text-[10px] font-bold px-2 py-0.5 rounded-full " +
                        (u.kind === "declared"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : u.kind === "lead_change"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300")
                      }
                    >
                      {u.kind === "declared"
                        ? (lang === "np" ? "घोषित" : "Declared")
                        : u.kind === "lead_change"
                          ? (lang === "np" ? "लिड परिवर्तन" : "Lead Change")
                          : (lang === "np" ? "शीर्ष-२ परिवर्तन" : "Top-2 Shift")}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                      {formatClock(u.at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {u.kind === "declared" ? (
                      <>
                        <span className="font-semibold">{lang === "np" ? u.constNameNp : u.constName}</span>
                        {" · "}
                        <span className="font-medium">{lang === "np" ? u.leaderNameNp : u.leaderName}</span>
                        {" ("}
                        <span>{partyLabel}</span>
                        {") "}
                        <span className="text-slate-500 dark:text-slate-400">
                          {lang === "np" ? "विजेता घोषित" : "declared winner"}
                        </span>
                      </>
                    ) : u.kind === "lead_change" ? (
                      <>
                        <span className="font-semibold">{lang === "np" ? u.constNameNp : u.constName}</span>
                        {" · "}
                        <span className="font-medium">{lang === "np" ? u.leaderNameNp : u.leaderName}</span>
                        {" "}
                        <span className="text-slate-500 dark:text-slate-400">
                          {lang === "np" ? "ले लिड लियो" : "took the lead"}
                        </span>
                        {u.previousLeaderName && (
                          <>
                            {" "}
                            <span className="text-slate-500 dark:text-slate-400">
                              {lang === "np" ? "अघि:" : "from:"}
                            </span>
                            {" "}
                            <span className="font-medium">{lang === "np" ? u.previousLeaderNameNp : u.previousLeaderName}</span>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">{lang === "np" ? u.constNameNp : u.constName}</span>
                        {" · "}
                        <span className="font-medium">{lang === "np" ? u.runnerUpNameNp : u.runnerUpName}</span>
                        {" "}
                        <span className="text-slate-500 dark:text-slate-400">
                          {lang === "np" ? "शीर्ष-२ मा आयो" : "entered top-2 race"}
                        </span>
                        {u.previousRunnerUpName && (
                          <>
                            {" "}
                            <span className="text-slate-500 dark:text-slate-400">
                              {lang === "np" ? "अघि:" : "replacing:"}
                            </span>
                            {" "}
                            <span className="font-medium">{lang === "np" ? u.previousRunnerUpNameNp : u.previousRunnerUpName}</span>
                          </>
                        )}
                      </>
                    )}
                  </p>
                  {u.marginVotes > 0 && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {u.kind === "declared"
                        ? (lang === "np" ? "अन्तिम अन्तर: " : "Final margin: ")
                        : (lang === "np" ? "हालको अन्तर: " : "Current margin: ")}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{u.marginVotes.toLocaleString("en-IN")}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
