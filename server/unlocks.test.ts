import { describe, test, expect } from "bun:test";
import { UNLOCKS, getUnlocksAtLevel, isUnlocked, nextUnlockLevel, maxBuddySlots, skillPointsAvailable } from "./unlocks.ts";

describe("UNLOCKS", () => {
  test("level 1 has hatch unlock", () => {
    const unlocks = getUnlocksAtLevel(1);
    expect(unlocks.length).toBe(1);
    expect(unlocks[0].id).toBe("hatch");
  });

  test("unlocks only at 3, 5, 7, 10 pattern (plus level 1)", () => {
    const validEndings = new Set([1, 3, 5, 7, 0]); // 0 = ends in 10, 20, 30, etc.
    for (const level of Object.keys(UNLOCKS).map(Number)) {
      const ending = level % 10;
      expect(validEndings.has(ending)).toBe(true);
    }
  });

  test("prestige at level 50", () => {
    expect(isUnlocked(50, "prestige")).toBe(true);
    expect(isUnlocked(49, "prestige")).toBe(false);
  });

  test("ascension at level 100", () => {
    expect(isUnlocked(100, "ascension")).toBe(true);
    expect(isUnlocked(99, "ascension")).toBe(false);
  });
});

describe("nextUnlockLevel", () => {
  test("from level 1, next is 3", () => {
    expect(nextUnlockLevel(1)).toBe(3);
  });

  test("from level 3, next is 5", () => {
    expect(nextUnlockLevel(3)).toBe(5);
  });

  test("from level 100, returns undefined", () => {
    expect(nextUnlockLevel(100)).toBeUndefined();
  });
});

describe("maxBuddySlots", () => {
  test("starts with 1 slot", () => {
    expect(maxBuddySlots(1)).toBe(1);
  });

  test("2 slots at level 10", () => {
    expect(maxBuddySlots(10)).toBe(2);
  });

  test("6 slots at level 50", () => {
    expect(maxBuddySlots(50)).toBe(6);
  });

  test("slots increase over time", () => {
    let prev = maxBuddySlots(1);
    for (let l = 2; l <= 100; l++) {
      const curr = maxBuddySlots(l);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });
});

describe("skillPointsAvailable", () => {
  test("0 points before level 23", () => {
    expect(skillPointsAvailable(22)).toBe(0);
  });

  test("1 point at level 23", () => {
    expect(skillPointsAvailable(23)).toBe(1);
  });

  test("7 points at level 50", () => {
    expect(skillPointsAvailable(50)).toBe(7);
  });
});
