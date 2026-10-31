// FinSight AI — Date Helpers & Date Query Search Tests
import { describe, it, expect } from "vitest";
import {
  matchesDateQuery,
  formatDateWithDay,
  isSameDay,
  toISODateString,
} from "../utils/dateHelpers";

describe("matchesDateQuery", () => {
  const sampleDate = "2026-09-12"; // Saturday, 12 September 2026

  it("matches exact ISO date string", () => {
    expect(matchesDateQuery(sampleDate, "2026-09-12")).toBe(true);
  });

  it("matches Indian slash format (DD/MM/YYYY and DD/MM)", () => {
    expect(matchesDateQuery(sampleDate, "12/09/2026")).toBe(true);
    expect(matchesDateQuery(sampleDate, "12/09")).toBe(true);
  });

  it("matches Indian dash format (DD-MM-YYYY and DD-MM)", () => {
    expect(matchesDateQuery(sampleDate, "12-09-2026")).toBe(true);
    expect(matchesDateQuery(sampleDate, "12-09")).toBe(true);
  });

  it("matches month name and day combinations", () => {
    expect(matchesDateQuery(sampleDate, "12 Sep")).toBe(true);
    expect(matchesDateQuery(sampleDate, "Sep 12")).toBe(true);
    expect(matchesDateQuery(sampleDate, "12th Sep")).toBe(true);
    expect(matchesDateQuery(sampleDate, "September 12")).toBe(true);
    expect(matchesDateQuery(sampleDate, "12 September")).toBe(true);
  });

  it("matches weekday name", () => {
    expect(matchesDateQuery(sampleDate, "Saturday")).toBe(true);
    expect(matchesDateQuery(sampleDate, "Sat")).toBe(true);
    expect(matchesDateQuery(sampleDate, "Sunday")).toBe(false);
  });

  it("matches relative keyword 'today' when date is today", () => {
    const todayISO = toISODateString(new Date());
    expect(matchesDateQuery(todayISO, "today")).toBe(true);
    expect(matchesDateQuery("2020-01-01", "today")).toBe(false);
  });

  it("matches relative keyword 'yesterday' when date is yesterday", () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterdayISO = toISODateString(y);
    expect(matchesDateQuery(yesterdayISO, "yesterday")).toBe(true);
    expect(matchesDateQuery("2020-01-01", "yesterday")).toBe(false);
  });

  it("returns false for non-matching dates", () => {
    expect(matchesDateQuery(sampleDate, "15/09/2026")).toBe(false);
    expect(matchesDateQuery(sampleDate, "2026-10-12")).toBe(false);
    expect(matchesDateQuery(sampleDate, "13 Sep")).toBe(false);
  });
});

describe("isSameDay", () => {
  it("correctly identifies identical calendar days", () => {
    expect(isSameDay("2026-09-12", "2026-09-12")).toBe(true);
    expect(isSameDay(new Date(2026, 8, 12, 10, 0), new Date(2026, 8, 12, 18, 30))).toBe(true);
  });

  it("returns false for different dates", () => {
    expect(isSameDay("2026-09-12", "2026-09-13")).toBe(false);
  });
});

describe("formatDateWithDay", () => {
  it("formats date with day of week and month name", () => {
    const formatted = formatDateWithDay("2026-09-12");
    expect(formatted).toContain("12");
    expect(formatted).toContain("September");
    expect(formatted).toContain("Saturday");
  });
});
