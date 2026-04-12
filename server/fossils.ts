/**
 * KodamaAlpha Commit Fossils — oldest surviving code lines
 *
 * Unlocks at Level 45. Tracks the oldest unchanged lines in your codebase
 * as "fossils" — a celebration of code stability.
 */

export interface Fossil {
  file: string;
  linePreview: string;
  age: string;         // human-readable age
  ageDays: number;
  discoveredAt: number;
}

/**
 * Analyse git blame output to find the oldest surviving lines.
 * Returns top N fossils sorted by age (oldest first).
 *
 * This is called on-demand via the MCP tool, not in a hook,
 * because git blame is too slow for the hook pipeline.
 */
export function findFossils(cwd: string, limit: number = 5): Fossil[] {
  try {
    const { execSync } = require("child_process");

    // Get tracked files (exclude binary, node_modules, lock files)
    const files = execSync(
      "git ls-files -- '*.ts' '*.js' '*.tsx' '*.jsx' '*.py' '*.go' '*.rs' '*.java' '*.rb' '*.css' '*.html' | head -20",
      { cwd, encoding: "utf8", timeout: 5000 },
    ).trim().split("\n").filter(Boolean);

    const fossils: Fossil[] = [];

    for (const file of files.slice(0, 10)) {
      try {
        // Get oldest commit date for any line in the file
        const blame = execSync(
          `git log --follow --diff-filter=A --format='%ai' -- "${file}" | tail -1`,
          { cwd, encoding: "utf8", timeout: 3000 },
        ).trim();

        if (!blame) continue;

        const created = new Date(blame);
        const ageDays = Math.floor((Date.now() - created.getTime()) / 86400000);

        if (ageDays < 30) continue; // too young to be a fossil

        // Get first non-empty line as preview
        const preview = execSync(
          `head -5 "${file}" | grep -v '^$' | head -1`,
          { cwd, encoding: "utf8", timeout: 1000 },
        ).trim().slice(0, 60);

        const age = ageDays >= 365
          ? `${Math.floor(ageDays / 365)}y ${Math.floor((ageDays % 365) / 30)}m`
          : ageDays >= 30
          ? `${Math.floor(ageDays / 30)}m ${ageDays % 30}d`
          : `${ageDays}d`;

        fossils.push({
          file,
          linePreview: preview || "(empty)",
          age,
          ageDays,
          discoveredAt: Date.now(),
        });
      } catch {
        continue;
      }
    }

    return fossils.sort((a, b) => b.ageDays - a.ageDays).slice(0, limit);
  } catch {
    return [];
  }
}

export function renderFossils(cwd: string): string {
  const fossils = findFossils(cwd);

  if (fossils.length === 0) {
    return "No fossils found yet. Code needs to survive at least 30 days to fossilize.";
  }

  const lines = [
    "### \uD83E\uDDB4 Commit Fossils",
    "",
    "*The oldest surviving code in your project:*",
    "",
  ];

  for (const f of fossils) {
    const icon = f.ageDays >= 365 ? "\uD83C\uDFDB\uFE0F" : f.ageDays >= 180 ? "\uD83E\uDEB8" : "\uD83E\uDDB4";
    lines.push(`${icon} **${f.file}** \u2014 ${f.age} old`);
    lines.push(`  \`${f.linePreview}\``);
    lines.push("");
  }

  return lines.join("\n");
}
