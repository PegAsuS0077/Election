import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NepalMap from "../NepalMap";
import type { ConstituencyResult } from "../types";

const PROVINCES = [
  "Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim",
] as const;

// One dummy constituency per province so the map has something to render
const constituencyResults: ConstituencyResult[] = PROVINCES.map((p, i) => ({
  province: p,
  district: p,
  districtNp: p,
  code: `${i + 1}-${p}-1`,
  name: `${p}-1`,
  nameNp: `${p}-1`,
  status: "PENDING",
  lastUpdated: new Date().toISOString(),
  candidates: [],
  votesCast: 0,
}));

describe("NepalMap", () => {
  it("renders all 7 province labels", () => {
    render(
      <NepalMap
        results={constituencyResults}
        selectedProvince="All"
        onSelect={vi.fn()}
      />
    );
    for (const p of PROVINCES) {
      expect(screen.getByText(p)).toBeDefined();
    }
  });

  it("calls onSelect when a province is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <NepalMap
        results={constituencyResults}
        selectedProvince="All"
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Bagmati/i }));
    expect(onSelect).toHaveBeenCalledWith("Bagmati");
  });
});
