import { describe, test, expect } from "bun:test";
import { calculateMood } from "./mood.ts";

describe("calculateMood", () => {
  test("no events = idle", () => {
    const result = calculateMood([]);
    expect(result.mood).toBe("idle");
    expect(result.color).toBe("gray");
    expect(result.xpMultiplier).toBe(1);
  });

  test("commits with no errors = celebrating", () => {
    const events = [
      { event: "commit", ts: Date.now() },
      { event: "tests-pass", ts: Date.now() },
    ];
    const result = calculateMood(events);
    expect(result.mood).toBe("celebrating");
    expect(result.color).toBe("gold");
    expect(result.xpMultiplier).toBe(1.1);
  });

  test("3+ errors = stressed", () => {
    const events = [
      { event: "error", ts: Date.now() },
      { event: "error", ts: Date.now() },
      { event: "error", ts: Date.now() },
    ];
    const result = calculateMood(events);
    expect(result.mood).toBe("stressed");
    expect(result.color).toBe("red");
  });

  test("3+ successes with no errors = happy", () => {
    const events = [
      { event: "tests-pass", ts: Date.now() },
      { event: "build-success", ts: Date.now() },
      { event: "lint-pass", ts: Date.now() },
    ];
    const result = calculateMood(events);
    expect(result.mood).toBe("happy");
    expect(result.color).toBe("green");
  });

  test("mixed events = focused", () => {
    const events = [
      { event: "tests-pass", ts: Date.now() },
      { event: "error", ts: Date.now() },
    ];
    const result = calculateMood(events);
    expect(result.mood).toBe("focused");
    expect(result.color).toBe("blue");
  });

  test("only uses last 5 events", () => {
    const events = [
      { event: "error", ts: 1 },
      { event: "error", ts: 2 },
      { event: "error", ts: 3 },
      { event: "error", ts: 4 },
      { event: "error", ts: 5 },
      // These 5 are the "last 5":
      { event: "commit", ts: 6 },
      { event: "tests-pass", ts: 7 },
      { event: "tests-pass", ts: 8 },
      { event: "tests-pass", ts: 9 },
      { event: "tests-pass", ts: 10 },
    ];
    const result = calculateMood(events);
    // Last 5 have commit + successes = celebrating
    expect(result.mood).toBe("celebrating");
  });
});
