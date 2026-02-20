import { describe, it, expect, beforeEach } from "vitest";
import { useElectionStore } from "../store/electionStore";

// Reset store before each test
beforeEach(() => {
  useElectionStore.setState({
    selectedProvince: "All",
    dark: false,
    isLoading: true,
    viewMode: "table",
    sortBy: "status",
  });
});

describe("electionStore", () => {
  it("sets selectedProvince", () => {
    useElectionStore.getState().setSelectedProvince("Bagmati");
    expect(useElectionStore.getState().selectedProvince).toBe("Bagmati");
  });

  it("sets viewMode", () => {
    useElectionStore.getState().setViewMode("map");
    expect(useElectionStore.getState().viewMode).toBe("map");
  });

  it("sets sortBy", () => {
    useElectionStore.getState().setSortBy("margin");
    expect(useElectionStore.getState().sortBy).toBe("margin");
  });

  it("setIsLoading sets loading state", () => {
    useElectionStore.getState().setIsLoading(false);
    expect(useElectionStore.getState().isLoading).toBe(false);
  });
});
