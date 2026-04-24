import path from "node:path";
import { cachedFileParse } from "./cache";

export type Brief = {
  text: string;
  isPinned?: boolean;
};

export function parseBriefs(md: string): Brief[] {
  const activeSection = md.match(/## Active Briefs\n\n([\s\S]+?)\n\n##/);
  if (!activeSection?.[1]) return [];
  return activeSection[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => ({
      text: line.replace(/^- /, "").trim(),
      isPinned: true,
    }));
}

export function loadBriefs(): Brief[] {
  return cachedFileParse(path.join(process.cwd(), "docs/BRIEFS.md"), parseBriefs);
}
