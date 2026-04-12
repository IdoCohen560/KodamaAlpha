/**
 * KodamaAlpha Mentor Quotes — famous programmer quotes in reactions
 *
 * Unlocks at Level 53. Buddy occasionally includes a quote in its reactions.
 */

export interface MentorQuote {
  quote: string;
  author: string;
}

export const MENTOR_QUOTES: MentorQuote[] = [
  { quote: "Simplicity is prerequisite for reliability.", author: "Edsger Dijkstra" },
  { quote: "Programs must be written for people to read.", author: "Harold Abelson" },
  { quote: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { quote: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { quote: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { quote: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
  { quote: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { quote: "Any fool can write code that a computer can understand.", author: "Martin Fowler" },
  { quote: "Premature optimization is the root of all evil.", author: "Donald Knuth" },
  { quote: "Debugging is twice as hard as writing the code.", author: "Brian Kernighan" },
  { quote: "The most important property of a program is whether it accomplishes the intention of its user.", author: "C.A.R. Hoare" },
  { quote: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
  { quote: "Walking on water and developing software from a specification are easy if both are frozen.", author: "Edward V. Berard" },
  { quote: "The function of good software is to make the complex appear simple.", author: "Grady Booch" },
  { quote: "Testing leads to failure, and failure leads to understanding.", author: "Burt Rutan" },
  { quote: "Perfection is achieved not when there is nothing more to add, but nothing left to take away.", author: "Antoine de Saint-Exupery" },
  { quote: "It's not a bug, it's a feature.", author: "Anonymous" },
  { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { quote: "A language that doesn't affect the way you think about programming is not worth knowing.", author: "Alan Perlis" },
  { quote: "Measuring programming progress by lines of code is like measuring aircraft progress by weight.", author: "Bill Gates" },
];

/** Get a random mentor quote. Deterministic per day so it doesn't change mid-session. */
export function getDailyQuote(): MentorQuote {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return MENTOR_QUOTES[dayOfYear % MENTOR_QUOTES.length];
}

/** Get a random quote (non-deterministic). */
export function getRandomQuote(): MentorQuote {
  return MENTOR_QUOTES[Math.floor(Math.random() * MENTOR_QUOTES.length)];
}

/** Format a quote for display. */
export function formatQuote(q: MentorQuote): string {
  return `\u201C${q.quote}\u201D \u2014 ${q.author}`;
}
