import { describe, expect, it } from "vitest";
import type { ScheduleBlock } from "@/types/models";
import { googleCalendarUrl, scheduleToIcs } from "./calendar";

const block = (over: Partial<ScheduleBlock> = {}): ScheduleBlock => ({
  id: "b1", trackerId: "g1", date: "2026-07-14", startTime: "09:30", endTime: "10:00",
  notes: "", createdAt: "2026-07-13T00:00:00.000Z", ...over,
});

describe("googleCalendarUrl", () => {
  it("builds a prefilled template URL with floating local times", () => {
    const url = googleCalendarUrl(block({ notes: "warm up first" }), "Run");
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("text=Run");
    expect(url).toContain("dates=20260714T093000%2F20260714T100000");
    expect(url).toContain("details=warm+up+first");
  });
});

describe("scheduleToIcs", () => {
  it("emits one VEVENT per block with escaped text and CRLF endings", () => {
    const ics = scheduleToIcs(
      [block(), block({ id: "b2", notes: "bring: mat, towel" })],
      () => "Yoga; morning",
    );
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("UID:b1@goal-tracker");
    expect(ics).toContain("DTSTAMP:20260713T000000Z");
    expect(ics).toContain("DTSTART:20260714T093000");
    expect(ics).toContain("SUMMARY:Yoga\\; morning");
    expect(ics).toContain("DESCRIPTION:bring: mat\\, towel");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
