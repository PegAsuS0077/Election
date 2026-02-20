import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NepalMap from "../NepalMap";
import { constituencyResults } from "../mockData";

describe("NepalMap", () => {
  it("renders all 7 province labels", () => {
    render(
      <NepalMap
        results={constituencyResults}
        selectedProvince="All"
        onSelect={vi.fn()}
      />
    );
    const provinces = ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"];
    for (const p of provinces) {
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
