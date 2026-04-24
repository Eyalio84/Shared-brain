import fs from "node:fs";
import path from "node:path";

export type Brief = {
  text: string;
  isPinned?: boolean;
};

export function loadBriefs(): Brief[] {
  const briefsPath = path.join(process.cwd(), "docs/BRIEFS.md");
  if (!fs.existsSync(briefsPath)) return [];

  const md = fs.readFileSync(briefsPath, "utf-8");
  const activeSection = md.match(/## Active Briefs\n\n([\s\S]+?)\n\n##/);
  if (!activeSection?.[1]) return [];

  return activeSection[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => ({
      text: line.replace(/^- /, "").trim(),
      isPinned: true, // For now, all in Active Briefs are "pinned"
    }));
}
