import { describe, it, expect } from "vitest";

// Inline the helpers here to test them independently
function votePct(votes: number, totalVotes: number): string {
  if (totalVotes === 0) return "";
  return `${((votes / totalVotes) * 100).toFixed(1)}%`;
}

function seatsToMajority(totalSeats: number): number {
  return Math.floor(totalSeats / 2) + 1;
}

function computeTurnout(votesCast: number, totalVoters: number): string {
  if (totalVoters === 0) return "—";
  return `${((votesCast / totalVoters) * 100).toFixed(1)}%`;
}

describe("votePct", () => {
  it("returns percentage string", () => {
    expect(votePct(5000, 10000)).toBe("50.0%");
  });

  it("handles zero total", () => {
    expect(votePct(500, 0)).toBe("");
  });

  it("rounds to 1 decimal", () => {
    expect(votePct(1, 3)).toBe("33.3%");
  });
});

describe("seatsToMajority", () => {
  it("returns floor(n/2)+1", () => {
    expect(seatsToMajority(275)).toBe(138);
    expect(seatsToMajority(10)).toBe(6);
    expect(seatsToMajority(1)).toBe(1);
  });
});

describe("computeTurnout", () => {
  it("returns turnout percentage", () => {
    expect(computeTurnout(52000, 65000)).toBe("80.0%");
  });

  it("handles zero totalVoters", () => {
    expect(computeTurnout(0, 0)).toBe("—");
  });
});
