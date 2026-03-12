import type { ConstituencyResult, SeatTally } from "../types";
import { PROVINCES, type Province } from "../types";
import { getParty } from "./partyRegistry";

export type RaceRow = {
  code: string;
  name: string;
  province: Province;
  leaderName: string;
  leaderPartyId: string;
  leaderVotes: number;
  runnerUpName: string;
  runnerUpPartyId: string;
  runnerUpVotes: number;
  marginVotes: number;
  marginPct: number;
  turnoutPct: number | null;
};

export type ProvinceAnalysisRow = {
  province: Province;
  totalConstituencies: number;
  declaredConstituencies: number;
  turnoutPct: number | null;
  leadingPartyId: string | null;
  leadingPartyName: string;
  leadingSeats: number;
};

export type PartyAnalysisRow = {
  partyId: string;
  partyName: string;
  totalSeats: number;
  fptpSeats: number;
  prSeats: number;
  constituencyVotes: number;
  constituencyVoteShare: number;
  prVotes: number;
  prVoteShare: number;
  constituenciesLed: number;
};

export type AnalysisOverview = {
  totalVotes: number;
  declaredConstituencies: number;
  totalTurnoutPct: number | null;
  partiesWithSeats: number;
  closestRaces: RaceRow[];
  biggestWins: RaceRow[];
  provinceRows: ProvinceAnalysisRow[];
  partyRows: PartyAnalysisRow[];
};

function sortCandidates(result: ConstituencyResult) {
  return [...result.candidates].sort((a, b) => b.votes - a.votes);
}

function buildRaceRow(result: ConstituencyResult): RaceRow | null {
  const sorted = sortCandidates(result);
  const leader = sorted[0];
  const runnerUp = sorted[1];
  if (!leader || !runnerUp) return null;

  const marginVotes = leader.votes - runnerUp.votes;
  const marginPct = result.votesCast > 0 ? (marginVotes / result.votesCast) * 100 : 0;
  const turnoutPct =
    result.totalVoters && result.totalVoters > 0
      ? (result.votesCast / result.totalVoters) * 100
      : null;

  return {
    code: result.code,
    name: result.name,
    province: result.province,
    leaderName: leader.name,
    leaderPartyId: leader.partyId,
    leaderVotes: leader.votes,
    runnerUpName: runnerUp.name,
    runnerUpPartyId: runnerUp.partyId,
    runnerUpVotes: runnerUp.votes,
    marginVotes,
    marginPct,
    turnoutPct,
  };
}

export function buildAnalysisOverview(
  results: ConstituencyResult[],
  seatTally: SeatTally,
  prVoteByParty: Record<string, number>,
): AnalysisOverview {
  const races = results
    .filter((result) => result.votesCast > 0 && result.candidates.length > 1)
    .map(buildRaceRow)
    .filter((row): row is RaceRow => row !== null);

  const totalVotes = results.reduce((sum, result) => sum + result.votesCast, 0);
  const totalRegisteredVoters = results.reduce((sum, result) => sum + (result.totalVoters ?? 0), 0);
  const declaredConstituencies = results.filter((result) => result.status === "DECLARED").length;
  const partiesWithSeats = Object.values(seatTally).filter((entry) => entry.fptp + entry.pr > 0).length;

  const totalPrVotes = Object.values(prVoteByParty).reduce((sum, votes) => sum + votes, 0);
  const totalConstituencyVotes = results.reduce(
    (sum, result) => sum + result.candidates.reduce((candidateSum, candidate) => candidateSum + candidate.votes, 0),
    0,
  );

  const constituenciesLed: Record<string, number> = {};
  for (const result of results) {
    const leader = sortCandidates(result)[0];
    if (!leader) continue;
    constituenciesLed[leader.partyId] = (constituenciesLed[leader.partyId] ?? 0) + 1;
  }

  const partyIds = Array.from(
    new Set([
      ...Object.keys(seatTally),
      ...Object.keys(prVoteByParty),
      ...results.flatMap((result) => result.candidates.map((candidate) => candidate.partyId)),
    ]),
  );

  const partyRows = partyIds
    .map((partyId) => {
      const tally = seatTally[partyId] ?? { fptp: 0, pr: 0 };
      const constituencyVotes = results.reduce(
        (sum, result) =>
          sum + result.candidates.reduce(
            (candidateSum, candidate) =>
              candidateSum + (candidate.partyId === partyId ? candidate.votes : 0),
            0,
          ),
        0,
      );
      const prVotes = prVoteByParty[partyId] ?? 0;
      const party = getParty(partyId);
      return {
        partyId,
        partyName: party.nameEn,
        totalSeats: tally.fptp + tally.pr,
        fptpSeats: tally.fptp,
        prSeats: tally.pr,
        constituencyVotes,
        constituencyVoteShare: totalConstituencyVotes > 0 ? (constituencyVotes / totalConstituencyVotes) * 100 : 0,
        prVotes,
        prVoteShare: totalPrVotes > 0 ? (prVotes / totalPrVotes) * 100 : 0,
        constituenciesLed: constituenciesLed[partyId] ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.totalSeats !== a.totalSeats) return b.totalSeats - a.totalSeats;
      if (b.constituencyVotes !== a.constituencyVotes) return b.constituencyVotes - a.constituencyVotes;
      return a.partyName.localeCompare(b.partyName);
    });

  const provinceRows = PROVINCES.map((province) => {
    const provinceResults = results.filter((result) => result.province === province);
    const provinceDeclared = provinceResults.filter((result) => result.status === "DECLARED");
    const seatCounts: Record<string, number> = {};
    for (const result of provinceDeclared) {
      const winner = sortCandidates(result)[0];
      if (!winner) continue;
      seatCounts[winner.partyId] = (seatCounts[winner.partyId] ?? 0) + 1;
    }

    const leadingPartyId =
      Object.entries(seatCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

    const provinceVotes = provinceResults.reduce((sum, result) => sum + result.votesCast, 0);
    const provinceRegistered = provinceResults.reduce((sum, result) => sum + (result.totalVoters ?? 0), 0);

    return {
      province,
      totalConstituencies: provinceResults.length,
      declaredConstituencies: provinceDeclared.length,
      turnoutPct: provinceRegistered > 0 ? (provinceVotes / provinceRegistered) * 100 : null,
      leadingPartyId,
      leadingPartyName: leadingPartyId ? getParty(leadingPartyId).nameEn : "No seat leader",
      leadingSeats: leadingPartyId ? seatCounts[leadingPartyId] ?? 0 : 0,
    };
  });

  return {
    totalVotes,
    declaredConstituencies,
    totalTurnoutPct: totalRegisteredVoters > 0 ? (totalVotes / totalRegisteredVoters) * 100 : null,
    partiesWithSeats,
    closestRaces: [...races].sort((a, b) => a.marginVotes - b.marginVotes).slice(0, 10),
    biggestWins: [...races].sort((a, b) => b.marginPct - a.marginPct).slice(0, 10),
    provinceRows,
    partyRows: partyRows.slice(0, 12),
  };
}
