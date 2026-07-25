import { describe, expect, it } from "vitest";
import type { Entry } from "@/types/models";
import { effectiveStartKey, midYearStartKey } from "./goalStart";

const entry = (trackerId: string, date: string): Entry => ({
  id: `${trackerId}-${date}`,
  trackerId,
  date,
  amount: 1,
  notApplicable: false,
  goalsPlus: null,
  metricValues: {},
  notes: "",
  createdAt: `${date}T12:00:00.000Z`,
});

describe("effectiveStartKey", () => {
  it("uses createdAt when no entries exist", () => {
    expect(effectiveStartKey({ id: "g1", createdAt: "2026-03-14T09:00:00.000Z" }, [])).toBe("2026-03-14");
  });

  it("prefers an earlier first entry over a migration-day createdAt", () => {
    const entries = [entry("g1", "2024-02-02"), entry("g1", "2026-07-20"), entry("g2", "2019-01-01")];
    expect(effectiveStartKey({ id: "g1", createdAt: "2026-07-11T00:00:00.000Z" }, entries)).toBe("2024-02-02");
  });

  it("falls back to the first entry when createdAt is missing", () => {
    expect(effectiveStartKey({ id: "g1" }, [entry("g1", "2026-05-05")])).toBe("2026-05-05");
  });

  it("is null when nothing is known", () => {
    expect(effectiveStartKey({ id: "g1" }, [entry("g2", "2026-05-05")])).toBeNull();
  });
});

describe("midYearStartKey", () => {
  it("flags a goal that started partway through the year", () => {
    expect(midYearStartKey({ id: "g1", createdAt: "2026-03-14T09:00:00.000Z" }, [], 2026)).toBe("2026-03-14");
  });

  it("does not flag a goal that was already running", () => {
    expect(midYearStartKey({ id: "g1", createdAt: "2025-11-02T09:00:00.000Z" }, [], 2026)).toBeNull();
  });

  it("treats the first week of January as the start of the year", () => {
    expect(midYearStartKey({ id: "g1", createdAt: "2026-01-05T09:00:00.000Z" }, [], 2026)).toBeNull();
    expect(midYearStartKey({ id: "g1", createdAt: "2026-01-08T09:00:00.000Z" }, [], 2026)).toBe("2026-01-08");
  });

  it("does not flag migrated goals whose entries predate the year", () => {
    const entries = [entry("g1", "2024-02-02")];
    expect(midYearStartKey({ id: "g1", createdAt: "2026-07-11T00:00:00.000Z" }, entries, 2026)).toBeNull();
  });

  it("is null when the start is unknown", () => {
    expect(midYearStartKey({ id: "g1" }, [], 2026)).toBeNull();
  });
});
