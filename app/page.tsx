import path from "node:path";
import { execSync } from "node:child_process";
import { loadTodos, sortActive, type Todo } from "./lib/todo";
import { loadBriefs, type Brief } from "./lib/briefs";
import { cachedFileParse } from "./lib/cache";
import { detectEnv, type Capability } from "./lib/env";
import { loadArchitecture, type ModuleRow } from "./lib/architecture";

type EntryState = "done" | "in-flight";

type ChangelogEntry = {
  date: string;
  goal: string;
  ai: string;
  machine: string;
  state: EntryState;
  commits: string;
  whatChanged: string[];
  why: string;
  next: string;
  openQuestions: string[];
};

function getGitStatus() {
  try {
    // Check if we are in a git repo
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    
    // Get short status -sb
    const status = execSync("git status -sb", { encoding: "utf-8" }).trim();
    const isDirty = execSync("git status --porcelain", { encoding: "utf-8" }).trim().length > 0;
    
    const branchLine = status.split("\n")[0]; // e.g. "## main...origin/main [behind 1]"
    const isBehind = branchLine.includes("behind");
    const isAhead = branchLine.includes("ahead");
    
    return {
      branch: branchLine.replace("## ", "").split("...")[0],
      isDirty,
      isBehind,
      isAhead,
      raw: branchLine
    };
  } catch (e) {
    return null;
  }
}

function parseChangelog(md: string): ChangelogEntry[] {
  const blocks = md.split(/\n##\s+/).slice(1);
  return blocks
    .map(parseEntry)
    .filter((e): e is ChangelogEntry => e !== null);
}

function parseEntry(block: string): ChangelogEntry | null {
  const lines = block.split("\n");
  const heading = lines[0]?.trim() ?? "";
  if (!heading) return null;

  const headingMatch = heading.match(/^(.+?)\s+—\s+(.+)$/);
  const date = headingMatch?.[1]?.trim() ?? heading;
  const goal = headingMatch?.[2]?.trim() ?? "";

  const field = (name: string) => {
    const m = block.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`));
    return m?.[1]?.trim() ?? "";
  };

  const listSection = (name: string) => {
    const re = new RegExp(`\\*\\*${name}:\\*\\*\\s*\\n((?:- .+\\n?)+)`);
    const m = block.match(re);
    if (!m?.[1]) return [];
    return m[1]
      .split("\n")
      .map((l) => l.replace(/^- /, "").trim())
      .filter(Boolean);
  };

  const stateRaw = field("State");
  const state: EntryState = stateRaw.startsWith("in-flight")
    ? "in-flight"
    : "done";

  return {
    date,
    goal,
    ai: field("AI"),
    machine: field("Machine"),
    state,
    commits: field("Commits"),
    whatChanged: listSection("What changed"),
    why: field("Why"),
    next: field("Next"),
    openQuestions: listSection("Open questions"),
  };
}

function InlineMarkdown({ text }: { text: string }) {
  // Simple regex-based markdown parser for:
  // `code`, **bold**, [text](url)
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/);
  
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("[") && part.includes("](")) {
          const match = part.match(/\[(.*?)\]\((.*?)\)/);
          if (match) {
            return (
              <a
                key={i}
                href={match[2]}
                className="text-blue-600 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-400 dark:text-blue-400 dark:decoration-blue-800"
                target="_blank"
                rel="noopener noreferrer"
              >
                {match[1]}
              </a>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function PriorityBadge({ priority }: { priority: Todo["priority"] }) {
  if (!priority) {
    return (
      <span className="inline-flex items-center rounded bg-zinc-100 px-1 font-mono text-[9px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
        --
      </span>
    );
  }
  const cls =
    priority === "P1"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : priority === "P2"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <span className={`inline-flex items-center rounded px-1 font-mono text-[9px] font-bold ${cls}`}>
      {priority}
    </span>
  );
}

function TaskRow({ todo }: { todo: Todo }) {
  return (
    <li className="flex items-start gap-2 py-1.5 border-b border-zinc-100 last:border-0 dark:border-zinc-900">
      <span
        className={`mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border ${todo.done ? "border-emerald-400 bg-emerald-400" : "border-zinc-300 dark:border-zinc-700"}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={todo.priority} />
          {todo.owner && (
            <span className="font-mono text-[10px] text-zinc-500">{todo.owner}</span>
          )}
        </div>
        <p className={`mt-0.5 text-xs leading-snug ${todo.done ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200"}`}>
          {todo.title}
        </p>
        {todo.ref && (
          <code className="mt-0.5 block truncate font-mono text-[10px] text-zinc-400">
            {todo.ref}
          </code>
        )}
      </div>
    </li>
  );
}

function BriefRow({ brief }: { brief: Brief }) {
  return (
    <div className="relative border-l-2 border-blue-500 bg-blue-50/30 p-3 dark:bg-blue-900/10">
      <p className="text-sm leading-relaxed">
        <InlineMarkdown text={brief.text} />
      </p>
    </div>
  );
}

function CapabilityRow({ cap }: { cap: Capability }) {
  const dot =
    cap.status === "yes"
      ? "bg-emerald-500"
      : cap.status === "no"
        ? "bg-red-500"
        : "bg-amber-500";
  const label =
    cap.status === "yes" ? "yes" : cap.status === "no" ? "no" : "conditional";
  return (
    <li className="flex items-start gap-2 py-1 text-xs">
      <span className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-zinc-800 dark:text-zinc-200">{cap.name}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            {label}
          </span>
        </div>
        {cap.note && (
          <p className="mt-0.5 font-mono text-[10px] leading-snug text-zinc-400">{cap.note}</p>
        )}
      </div>
    </li>
  );
}

function ModuleTableRow({ row }: { row: ModuleRow }) {
  return (
    <li className="border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <code className="truncate font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
          {row.path}
        </code>
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
        <InlineMarkdown text={row.role} />
      </p>
      {row.notable && (
        <p className="mt-0.5 text-[10px] leading-snug italic text-zinc-400">
          <InlineMarkdown text={row.notable} />
        </p>
      )}
    </li>
  );
}

const TASK_BOARD_LIMIT = 6;

function StatusCard({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        // {title}
      </h3>
      {children}
    </section>
  );
}

export default function Home() {
  const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
  const entries = cachedFileParse(changelogPath, parseChangelog);
  const latest = entries[0];
  const gitStatus = getGitStatus();

  const todos = loadTodos();
  const activeTasks = sortActive(todos);
  const doneCount = todos.filter((t) => t.done).length;
  const taskOverflow = Math.max(0, activeTasks.length - TASK_BOARD_LIMIT);

  const briefs = loadBriefs();
  const env = detectEnv();
  const modules = loadArchitecture();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <header className="mb-8 flex items-end justify-between border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Shared Brain</h1>
          <p className="text-xs font-mono text-zinc-500">v0.1.0-alpha // command center</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${latest?.state === "in-flight" ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              {latest?.state === "in-flight" ? "System Locked" : "System Ready"}
            </span>
          </div>
        </div>
      </header>

      {/* Bento Grid Shell */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        
        {/* Pulse / Latest Status */}
        <StatusCard title="Pulse" className="lg:col-span-8">
          {latest ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{latest.ai}</span>
                  <span className="text-zinc-400">@</span>
                  <span className="font-mono text-zinc-600 dark:text-zinc-400">{latest.machine}</span>
                </div>
                <h2 className="mt-1 text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{latest.goal}</h2>
                <p className="mt-2 text-xs text-zinc-500 font-mono">{latest.date}</p>
              </div>
              {latest.state === "in-flight" && latest.next && (
                <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10 md:max-w-xs">
                  <span className="text-[9px] font-bold uppercase tracking-tighter text-amber-600 dark:text-amber-400">Handoff Note</span>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900 dark:text-amber-200 line-clamp-3 italic">
                    {latest.next}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No active sessions.</p>
          )}
        </StatusCard>

        {/* Git Monitor */}
        <StatusCard title="Git Monitor" className="lg:col-span-4">
          {gitStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-zinc-500 text-xs">Branch</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{gitStatus.branch}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Sync Status</span>
                {gitStatus.isBehind ? (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    BEHIND ORIGIN
                  </span>
                ) : gitStatus.isAhead ? (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    AHEAD OF ORIGIN
                  </span>
                ) : (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    SYNCED
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Local State</span>
                {gitStatus.isDirty ? (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">MODIFIED</span>
                ) : (
                  <span className="text-xs font-bold text-zinc-400">CLEAN</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Not a git repository.</p>
          )}
        </StatusCard>

        {/* Task Board — parses TODO.md */}
        <StatusCard title="Tasks" className="lg:col-span-4">
          {todos.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No tasks found.</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>{activeTasks.length} active</span>
                <span>{doneCount} done</span>
              </div>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {activeTasks.slice(0, TASK_BOARD_LIMIT).map((t, i) => (
                  <TaskRow key={i} todo={t} />
                ))}
              </ul>
              {taskOverflow > 0 && (
                <p className="mt-2 font-mono text-[10px] italic text-zinc-400">
                  + {taskOverflow} more in TODO.md
                </p>
              )}
            </>
          )}
        </StatusCard>

        {/* Session Log Timeline */}
        <StatusCard title="Session Log" className="lg:col-span-8">
          <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            <ol className="space-y-6">
              {entries.map((e, i) => (
                <li key={i} className="relative border-l border-zinc-200 pl-4 dark:border-zinc-800">
                  <div className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full border border-white bg-zinc-300 dark:border-zinc-950 dark:bg-zinc-700" />
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-zinc-400">{e.date}</span>
                    <span className={`text-[9px] font-bold uppercase px-1 rounded ${e.state === 'in-flight' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}>
                      {e.state}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{e.goal}</h4>
                  <div className="mt-2 space-y-2">
                    {e.whatChanged.length > 0 && (
                      <ul className="list-disc pl-4 text-[11px] text-zinc-500 space-y-0.5">
                        {e.whatChanged.slice(0, 3).map((c, j) => (
                          <li key={j}><InlineMarkdown text={c} /></li>
                        ))}
                        {e.whatChanged.length > 3 && <li className="list-none italic text-[10px]">...and {e.whatChanged.length - 3} more</li>}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </StatusCard>

        {/* Briefing Board — parses docs/BRIEFS.md */}
        <StatusCard title="Briefing Board" className="lg:col-span-12">
          {briefs.length === 0 ? (
            <div className="flex h-16 items-center justify-center border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-lg text-zinc-300">
              <span className="text-[10px] font-bold uppercase tracking-widest">No active briefs</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {briefs.map((b, i) => (
                <BriefRow key={i} brief={b} />
              ))}
            </div>
          )}
        </StatusCard>

        {/* Environment Health — detects current machine + capabilities */}
        <StatusCard title="Environment" className="lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {env.label}
            </span>
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {env.machine}
            </span>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {env.capabilities.map((cap, i) => (
              <CapabilityRow key={i} cap={cap} />
            ))}
          </ul>
        </StatusCard>

        {/* Architecture Snapshot — rendered module table */}
        <StatusCard title="Architecture" className="lg:col-span-8">
          {modules.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No module table found in docs/ARCHITECTURE.md.</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              <ul>
                {modules.map((row, i) => (
                  <ModuleTableRow key={i} row={row} />
                ))}
              </ul>
            </div>
          )}
        </StatusCard>

      </div>
    </main>
  );
}
