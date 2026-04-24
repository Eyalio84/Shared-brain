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
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    const status = execSync("git status -sb", { encoding: "utf-8" }).trim();
    const isDirty = execSync("git status --porcelain", { encoding: "utf-8" }).trim().length > 0;
    const branchLine = status.split("\n")[0];
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
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200">
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
              <a key={i} href={match[2]} className="text-blue-600 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-400 dark:text-blue-400 dark:decoration-blue-800" target="_blank" rel="noopener noreferrer">
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
  if (!priority) return <span className="inline-flex items-center rounded bg-zinc-100 px-1 font-mono text-[9px] font-bold text-zinc-400 dark:bg-zinc-800/50">--</span>;
  const cls =
    priority === "P1"
      ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
      : priority === "P2"
        ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <span className={`inline-flex items-center rounded px-1 font-mono text-[9px] font-bold ${cls}`}>
      {priority}
    </span>
  );
}

function TaskRow({ todo }: { todo: Todo }) {
  return (
    <li className="group flex items-start gap-3 py-2 border-b border-zinc-100 last:border-0 dark:border-zinc-900/50">
      <div className={`mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${todo.done ? "border-emerald-500 bg-emerald-500" : "border-zinc-200 dark:border-zinc-800"}`}>
        {todo.done && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={todo.priority} />
          {todo.owner && <span className="font-mono text-[10px] font-medium text-zinc-400 uppercase tracking-tight">{todo.owner}</span>}
        </div>
        <p className={`mt-1 text-sm leading-tight transition-colors ${todo.done ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-200"}`}>
          {todo.title}
        </p>
        {todo.ref && <code className="mt-1 block truncate font-mono text-[10px] text-zinc-400 opacity-70 group-hover:opacity-100 transition-opacity">{todo.ref}</code>}
      </div>
    </li>
  );
}

function BriefRow({ brief }: { brief: Brief }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50/30 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="absolute top-0 left-0 h-full w-1 bg-blue-500/50" />
      <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        <InlineMarkdown text={brief.text} />
      </p>
    </div>
  );
}

function CapabilityRow({ cap }: { cap: Capability }) {
  const dot = cap.status === "yes" ? "bg-emerald-500" : cap.status === "no" ? "bg-red-500" : "bg-amber-500";
  const label = cap.status === "yes" ? "yes" : cap.status === "no" ? "no" : "conditional";
  return (
    <li className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot} shadow-[0_0_4px_rgba(0,0,0,0.1)]`} aria-hidden />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{cap.name}</span>
          {cap.note && <span className="ml-2 font-mono text-[10px] text-zinc-400 opacity-60">— {cap.note}</span>}
        </div>
      </div>
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</span>
    </li>
  );
}

function ModuleTableRow({ row }: { row: ModuleRow }) {
  return (
    <li className="group border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-900/50">
      <code className="inline-block font-mono text-[12px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {row.path}
      </code>
      <p className="mt-1 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
        <InlineMarkdown text={row.role} />
      </p>
      {row.notable && (
        <p className="mt-1.5 text-xs italic text-zinc-400/80 leading-relaxed border-l-2 border-zinc-100 pl-2 dark:border-zinc-800/50">
          <InlineMarkdown text={row.notable} />
        </p>
      )}
    </li>
  );
}

const TASK_BOARD_LIMIT = 6;

function StatusCard({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) {
  return (
    <section className={`rounded-2xl border border-zinc-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:border-zinc-900 dark:bg-zinc-950 dark:shadow-none ${className}`}>
      <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        {title}
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
    <div className="min-h-screen bg-zinc-50/50 selection:bg-blue-100 selection:text-blue-900 dark:bg-zinc-950">
      <main className="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Shared Brain</h1>
            <p className="mt-1 text-sm font-medium font-mono text-zinc-500 uppercase tracking-widest">v0.1.0-alpha // command center</p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-1.5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
            <span className={`h-2 w-2 rounded-full ${latest?.state === "in-flight" ? "animate-pulse bg-amber-500" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
              {latest?.state === "in-flight" ? "System Locked" : "System Ready"}
            </span>
          </div>
        </header>

        {/* Bento Grid Shell */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          
          {/* Pulse / Latest Status */}
          <StatusCard title="Pulse" className="lg:col-span-8">
            {latest ? (
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 text-xs font-mono mb-2">
                    <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">{latest.ai}</span>
                    <span className="text-zinc-400 font-bold">@</span>
                    <span className="font-bold text-zinc-600 dark:text-zinc-400">{latest.machine}</span>
                  </div>
                  <h2 className="text-xl font-bold leading-tight text-zinc-900 dark:text-zinc-50 tracking-tight">{latest.goal}</h2>
                  <p className="mt-3 text-[11px] font-bold text-zinc-400 font-mono uppercase tracking-wider">{latest.date}</p>
                </div>
                {latest.state === "in-flight" && latest.next && (
                  <div className="flex-1 rounded-2xl border border-amber-100 bg-amber-50/50 p-5 dark:border-amber-900/30 dark:bg-amber-900/10 md:max-w-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-400">Handoff Briefing</span>
                    </div>
                    <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200 line-clamp-4 italic font-medium">
                      {latest.next}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 italic">Idle — No active sessions.</p>
            )}
          </StatusCard>

          {/* Git Monitor */}
          <StatusCard title="Git Monitor" className="lg:col-span-4">
            {gitStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Branch</span>
                  <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{gitStatus.branch}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Sync State</span>
                  {gitStatus.isBehind ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 font-mono text-[10px] font-black text-red-700 dark:bg-red-900/40 dark:text-red-300">BEHIND</span>
                  ) : gitStatus.isAhead ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-black text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">AHEAD</span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">SYNCED</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-50 dark:border-zinc-900/50">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Working Tree</span>
                  {gitStatus.isDirty ? (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight">Modified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-tight">Clean</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 italic">Not a git repository.</p>
            )}
          </StatusCard>

          {/* Task Board — parses TODO.md */}
          <StatusCard title="Tasks" className="lg:col-span-4 flex flex-col">
            {todos.length === 0 ? (
              <p className="text-sm text-zinc-500 italic py-8 text-center border-2 border-dashed border-zinc-50 dark:border-zinc-900 rounded-xl">No active tasks.</p>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-widest">
                  <span>{activeTasks.length} active</span>
                  <span className="text-emerald-500 dark:text-emerald-400">{doneCount} complete</span>
                </div>
                <ul className="flex-1 divide-y divide-zinc-50 dark:divide-zinc-900/30">
                  {activeTasks.slice(0, TASK_BOARD_LIMIT).map((t, i) => (
                    <TaskRow key={i} todo={t} />
                  ))}
                </ul>
                {taskOverflow > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-900/50">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300 dark:text-zinc-600">
                      + {taskOverflow} more in TODO.md
                    </p>
                  </div>
                )}
              </>
            )}
          </StatusCard>

          {/* Session Log Timeline */}
          <StatusCard title="Session Log" className="lg:col-span-8">
            <div className="max-h-[520px] overflow-y-auto pr-3 custom-scrollbar">
              <ol className="space-y-8 relative">
                <div className="absolute top-0 left-[7px] bottom-0 w-[2px] bg-zinc-100 dark:bg-zinc-900/50" />
                {entries.map((e, i) => (
                  <li key={i} className="relative pl-7 group">
                    <div className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-white dark:border-zinc-950 shadow-sm transition-transform group-hover:scale-110 ${e.state === 'in-flight' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                    <div className="flex flex-wrap items-center gap-3 mb-1.5">
                      <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{e.date}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${e.state === 'in-flight' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                        {e.state}
                      </span>
                    </div>
                    <h4 className="text-base font-bold leading-tight text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{e.goal}</h4>
                    <div className="mt-3 space-y-3">
                      {e.whatChanged.length > 0 && (
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 list-none">
                          {e.whatChanged.slice(0, 4).map((c, j) => (
                            <li key={j} className="text-xs text-zinc-500 flex items-start gap-2 leading-relaxed">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                              <InlineMarkdown text={c} />
                            </li>
                          ))}
                          {e.whatChanged.length > 4 && <li className="text-[10px] italic text-zinc-400 font-medium">...and {e.whatChanged.length - 4} more</li>}
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
              <div className="flex h-16 items-center justify-center border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-2xl text-zinc-300">
                <span className="text-[10px] font-bold uppercase tracking-widest">No active briefs</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {briefs.map((b, i) => (
                  <BriefRow key={i} brief={b} />
                ))}
              </div>
            )}
          </StatusCard>

          {/* Environment Health — detects current machine + capabilities */}
          <StatusCard title="Environment" className="lg:col-span-4">
            <div className="mb-5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {env.label}
              </span>
              <span className="rounded-lg bg-white px-2 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-zinc-500 shadow-sm dark:bg-zinc-800 dark:text-zinc-400">
                {env.machine}
              </span>
            </div>
            <ul className="space-y-1">
              {env.capabilities.map((cap, i) => (
                <CapabilityRow key={i} cap={cap} />
              ))}
            </ul>
          </StatusCard>

          {/* Architecture Snapshot — rendered module table */}
          <StatusCard title="Architecture" className="lg:col-span-8">
            {modules.length === 0 ? (
              <p className="text-sm text-zinc-500 italic py-8 text-center">No module table found in docs/ARCHITECTURE.md.</p>
            ) : (
              <div className="max-h-[360px] overflow-y-auto pr-3 custom-scrollbar">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  {modules.map((row, i) => (
                    <ModuleTableRow key={i} row={row} />
                  ))}
                </ul>
              </div>
            )}
          </StatusCard>

        </div>
      </main>
      <footer className="mt-12 py-8 border-t border-zinc-100 dark:border-zinc-900 text-center">
        <p className="text-[10px] font-bold font-mono uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-700">
          State strictly mirrored from Git
        </p>
      </footer>
    </div>
  );
}
