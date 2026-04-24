import path from "node:path";
import { cachedFileParse } from "./cache";

export type ModuleRow = {
  path: string;
  role: string;
  notable: string;
};

/**
 * Parse the "## Module table" section of docs/ARCHITECTURE.md.
 * Returns rows with path/role/notable trimmed of surrounding backticks and whitespace.
 */
export function parseModuleTable(md: string): ModuleRow[] {
  const sections = md.split(/\n##\s+/);
  const section = sections.find((s) => s.startsWith("Module table"));
  if (!section) return [];

  const rows: ModuleRow[] = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    const [pathCell, role, notable] = cells;
    if (!pathCell) continue;
    if (pathCell === "Path") continue; // header
    if (/^-+$/.test(pathCell)) continue; // separator
    rows.push({
      path: pathCell.replace(/^`|`$/g, ""),
      role: role ?? "",
      notable: notable ?? "",
    });
  }
  return rows;
}

export function loadArchitecture(): ModuleRow[] {
  const p = path.join(process.cwd(), "docs/ARCHITECTURE.md");
  return cachedFileParse(p, parseModuleTable);
}
