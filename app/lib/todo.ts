import fs from "node:fs";
import path from "node:path";

export type TodoPriority = "P1" | "P2" | "P3";

export type Todo = {
  done: boolean;
  priority: TodoPriority | null;
  owner: string | null;
  completedDate: string | null;
  title: string;
  ref: string | null;
  raw: string;
};

const TASK_LINE = /^- \[([ x])\]\s*(?:\(([^)]*)\)\s*)?(.+?)(?:\s+[—-]\s+ref:\s*(.+))?$/;
const PRIORITY = /^P[123]$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseLine(line: string): Todo | null {
  const match = line.match(TASK_LINE);
  if (!match) return null;
  const [, check, metaRaw, titleRaw, refRaw] = match;

  let priority: TodoPriority | null = null;
  let owner: string | null = null;
  let completedDate: string | null = null;

  if (metaRaw) {
    for (const rawToken of metaRaw.split(",")) {
      const token = rawToken.trim();
      if (!token) continue;
      if (PRIORITY.test(token)) priority = token as TodoPriority;
      else if (token.startsWith("@")) owner = token;
      else if (DATE.test(token)) completedDate = token;
    }
  }

  return {
    done: check === "x",
    priority,
    owner,
    completedDate,
    title: titleRaw.trim(),
    ref: refRaw?.trim() ?? null,
    raw: line,
  };
}

export function parseTodos(md: string): Todo[] {
  const lines = md.split("\n");
  const out: Todo[] = [];
  for (const line of lines) {
    const t = parseLine(line);
    if (t) out.push(t);
  }
  return out;
}

const PRIORITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2 };

export function sortActive(todos: Todo[]): Todo[] {
  return todos
    .filter((t) => !t.done)
    .sort((a, b) => {
      const ap = a.priority ? PRIORITY_ORDER[a.priority] : 99;
      const bp = b.priority ? PRIORITY_ORDER[b.priority] : 99;
      return ap - bp;
    });
}

export function loadTodos(): Todo[] {
  const todoPath = path.join(process.cwd(), "TODO.md");
  if (!fs.existsSync(todoPath)) return [];
  return parseTodos(fs.readFileSync(todoPath, "utf-8"));
}
