/**
 * Calendar export for schedule blocks. Pure: no Firebase/React imports.
 *
 * Times are emitted as floating local date-times (no timezone suffix) so the
 * event lands at the same wall-clock time in the user's calendar regardless
 * of their timezone — matching how the blocks were entered.
 */
import type { ScheduleBlock } from "@/types/models";

/** "2026-07-14" + "09:30" → "20260714T093000" */
function stamp(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(/:/g, "")}00`;
}

/** Prefilled Google Calendar "create event" URL for one block. */
export function googleCalendarUrl(block: ScheduleBlock, goalName: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: goalName,
    dates: `${stamp(block.date, block.startTime)}/${stamp(block.date, block.endTime)}`,
  });
  if (block.notes) params.set("details", block.notes);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** RFC 5545 text escaping: backslash, semicolon, comma, newline. */
function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * Serialize blocks to an .ics file Google Calendar (and others) can import.
 * One VEVENT per block; UID reuses the block id so re-imports update rather
 * than duplicate.
 */
export function scheduleToIcs(blocks: ScheduleBlock[], goalNameById: (id: string) => string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Goal Tracker//Schedule//EN",
  ];
  for (const b of blocks) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@goal-tracker`,
      `DTSTART:${stamp(b.date, b.startTime)}`,
      `DTEND:${stamp(b.date, b.endTime)}`,
      `SUMMARY:${icsEscape(goalNameById(b.trackerId))}`,
      ...(b.notes ? [`DESCRIPTION:${icsEscape(b.notes)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
