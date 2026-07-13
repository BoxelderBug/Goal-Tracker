import { describe, expect, it } from "vitest";
import type { Entry } from "@/types/models";
import type { CumulativePoint } from "./progress";
import { csvEscape, cumulativeSeriesToCsv, entriesToCsv } from "./csv";

const entry = (over: Partial<Entry>): Entry => ({
  id: "e", trackerId: "g1", date: "2026-07-08", amount: 5,
  notApplicable: false, goalsPlus: null, metricValues: {}, notes: "",
  createdAt: "2026-07-08T00:00:00.000Z", ...over,
});

describe("csvEscape", () => {
  it("quotes fields with commas, quotes, or newlines", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("entriesToCsv", () => {
  const names = new Map([["g1", "Run"], ["g2", "Read, daily"]]);

  it("emits a header and one row per entry, newest first", () => {
    const csv = entriesToCsv(
      [
        entry({ id: "a", trackerId: "g1", date: "2026-07-06", amount: 3 }),
        entry({ id: "b", trackerId: "g2", date: "2026-07-08", amount: 10, notes: "x" }),
      ],
      names,
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("date,goal,amount,notApplicable,notes");
    expect(lines[1]).toBe('2026-07-08,"Read, daily",10,false,x'); // newest first, name escaped
    expect(lines[2]).toBe("2026-07-06,Run,3,false,");
  });

  it("blanks the amount and marks notApplicable rows", () => {
    const csv = entriesToCsv([entry({ notApplicable: true })], names);
    expect(csv.split("\r\n")[1]).toBe("2026-07-08,Run,,true,");
  });
});

describe("cumulativeSeriesToCsv", () => {
  const point = (over: Partial<CumulativePoint>): CumulativePoint => ({
    date: "2026-07-06", cumulative: 0, projected: false, projectedCumulative: null, ...over,
  });

  it("puts actual totals in the total column and future values in projected", () => {
    const csv = cumulativeSeriesToCsv([
      point({ date: "2026-07-06", cumulative: 3 }),
      point({ date: "2026-07-07", cumulative: 8 }),
      point({ date: "2026-07-08", projected: true, projectedCumulative: 12 }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("date,total,projected");
    expect(lines[1]).toBe("2026-07-06,3,");
    expect(lines[2]).toBe("2026-07-07,8,");
    expect(lines[3]).toBe("2026-07-08,,12");
  });
});
