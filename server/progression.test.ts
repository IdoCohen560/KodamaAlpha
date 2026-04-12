import { describe, test, expect } from "bun:test";
import { xpForLevel, levelFromXp, xpToNextLevel, evolutionFromLevel, MAX_XP_PER_EVENT, XP_AMOUNTS } from "./progression.ts";

describe("xpForLevel", () => {
  test("level 1 requires 200 XP", () => {
    expect(xpForLevel(1)).toBe(200);
  });

  test("level 10 requires 20,000 XP", () => {
    expect(xpForLevel(10)).toBe(20000);
  });

  test("level 50 requires 500,000 XP", () => {
    expect(xpForLevel(50)).toBe(500000);
  });

  test("level 100 requires 2,000,000 XP", () => {
    expect(xpForLevel(100)).toBe(2000000);
  });
});

describe("levelFromXp", () => {
  test("0 XP = level 1", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  test("200 XP = level 1", () => {
    expect(levelFromXp(200)).toBe(1);
  });

  test("800 XP = level 2", () => {
    expect(levelFromXp(800)).toBe(2);
  });

  test("20000 XP = level 10", () => {
    expect(levelFromXp(20000)).toBe(10);
  });

  test("round-trip consistency", () => {
    for (let level = 1; level <= 100; level++) {
      const xp = xpForLevel(level);
      expect(levelFromXp(xp)).toBe(level);
    }
  });
});

describe("xpToNextLevel", () => {
  test("returns progress within current level", () => {
    const result = xpToNextLevel(300); // level 1, between 200 and 800
    expect(result.current).toBeGreaterThan(0);
    expect(result.needed).toBeGreaterThan(0);
    expect(result.progress).toBeGreaterThan(0);
    expect(result.progress).toBeLessThan(1);
  });
});

describe("evolutionFromLevel", () => {
  test("level 1-4 = stage 1 (egg)", () => {
    expect(evolutionFromLevel(1)).toBe(1);
    expect(evolutionFromLevel(4)).toBe(1);
  });

  test("level 5-14 = stage 2 (hatchling)", () => {
    expect(evolutionFromLevel(5)).toBe(2);
    expect(evolutionFromLevel(14)).toBe(2);
  });

  test("level 15-24 = stage 3 (juvenile)", () => {
    expect(evolutionFromLevel(15)).toBe(3);
    expect(evolutionFromLevel(24)).toBe(3);
  });

  test("level 25-39 = stage 4 (adult)", () => {
    expect(evolutionFromLevel(25)).toBe(4);
  });

  test("level 40-49 = stage 5 (elder)", () => {
    expect(evolutionFromLevel(40)).toBe(5);
  });

  test("level 50-79 = stage 6 (mythic)", () => {
    expect(evolutionFromLevel(50)).toBe(6);
  });

  test("level 80+ = stage 7 (cosmic)", () => {
    expect(evolutionFromLevel(80)).toBe(7);
    expect(evolutionFromLevel(100)).toBe(7);
  });
});

describe("XP_AMOUNTS", () => {
  test("all amounts are <= MAX_XP_PER_EVENT", () => {
    for (const [reason, amount] of Object.entries(XP_AMOUNTS)) {
      expect(amount).toBeLessThanOrEqual(MAX_XP_PER_EVENT);
    }
  });

  test("has all expected XP sources", () => {
    const expected = ["commit", "tests-pass", "bug-fix", "build-success", "lint-pass", "first-action-day"];
    for (const key of expected) {
      expect(XP_AMOUNTS[key]).toBeDefined();
    }
  });
});
