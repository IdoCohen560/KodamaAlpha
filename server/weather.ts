/**
 * KodamaAlpha Weather System — ambient weather in aquarium based on repo health
 *
 * Unlocks at Level 60. Weather changes weekly based on code quality signals,
 * test pass rate, and error frequency.
 */

import { loadAchievements } from "./achievements.ts";
import { loadReview } from "./review.ts";
import { readRecentEvents } from "./progression.ts";

export type Weather = "sunny" | "cloudy" | "rainy" | "stormy" | "aurora";

export interface WeatherState {
  weather: Weather;
  icon: string;
  desc: string;
  xpEffect: string;
}

const WEATHER_DATA: Record<Weather, { icon: string; desc: string; xpEffect: string; art: string[] }> = {
  sunny: {
    icon: "\u2600\uFE0F",
    desc: "Tests passing, coverage up, no critical issues",
    xpEffect: "1.1x XP bonus",
    art: ["  \\  |  /  ", "   .----.  ", "  ( \u2600\uFE0F  )  ", "   `----'  ", "  /  |  \\  "],
  },
  cloudy: {
    icon: "\u2601\uFE0F",
    desc: "Some warnings, coverage plateaued",
    xpEffect: "Normal XP",
    art: ["           ", "   .---.   ", "  ( \u2601\uFE0F  )  ", " (       ) ", "  `-----'  "],
  },
  rainy: {
    icon: "\uD83C\uDF27\uFE0F",
    desc: "Failing tests, declining coverage",
    xpEffect: "Bug fix XP +50%",
    art: ["   .---.   ", "  (     )  ", " (  \uD83C\uDF27\uFE0F  ) ", "  ' ' ' '  ", " ' ' ' '   "],
  },
  stormy: {
    icon: "\u26A1",
    desc: "Critical vulnerabilities, broken build",
    xpEffect: "Bug fix XP 2x, other XP 0.9x",
    art: ["  .-===-.  ", " (  \u26A1   ) ", "(  \u26A1  \u26A1  )", " ' / ' / ' ", "  / ' / '  "],
  },
  aurora: {
    icon: "\uD83C\uDF0C",
    desc: "Perfect week — all tests pass, zero bugs, streak intact",
    xpEffect: "1.2x XP bonus",
    art: ["  ~ \u2728 ~    ", " \u2728  ~  \u2728  ", "  ~  \u2728  ~  ", " \u2728 \uD83C\uDF0C \u2728  ", "  ~ \u2728 ~    "],
  },
};

export function calculateWeather(): WeatherState {
  const events = readRecentEvents(50);
  const review = loadReview();

  const errors = events.filter(e => ["error", "test-fail", "build-fail"].includes(e.event)).length;
  const successes = events.filter(e => ["tests-pass", "build-success", "commit"].includes(e.event)).length;
  const signals = review.signals.length;

  // Perfect conditions: aurora
  if (errors === 0 && successes >= 10 && signals === 0) {
    const w = WEATHER_DATA.aurora;
    return { weather: "aurora", icon: w.icon, desc: w.desc, xpEffect: w.xpEffect };
  }

  // Stormy: lots of errors, quality signals
  if (errors >= 10 || signals >= 5) {
    const w = WEATHER_DATA.stormy;
    return { weather: "stormy", icon: w.icon, desc: w.desc, xpEffect: w.xpEffect };
  }

  // Rainy: moderate errors
  if (errors >= 5 || signals >= 3) {
    const w = WEATHER_DATA.rainy;
    return { weather: "rainy", icon: w.icon, desc: w.desc, xpEffect: w.xpEffect };
  }

  // Cloudy: some warnings
  if (errors >= 2 || signals >= 1) {
    const w = WEATHER_DATA.cloudy;
    return { weather: "cloudy", icon: w.icon, desc: w.desc, xpEffect: w.xpEffect };
  }

  // Sunny: all good
  const w = WEATHER_DATA.sunny;
  return { weather: "sunny", icon: w.icon, desc: w.desc, xpEffect: w.xpEffect };
}

export function renderWeather(): string {
  const state = calculateWeather();
  const data = WEATHER_DATA[state.weather];
  const lines = [
    `### ${state.icon} Weather: ${state.weather.charAt(0).toUpperCase() + state.weather.slice(1)}`,
    "",
    "```",
    ...data.art,
    "```",
    "",
    state.desc,
    `**XP Effect:** ${state.xpEffect}`,
  ];
  return lines.join("\n");
}
