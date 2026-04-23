import fs from "node:fs";
import path from "node:path";

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
  const parts = text.split(/(`[^`]+`)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
          return (
            <code
              key={i}
              className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function Home() {
  const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
  const md = fs.readFileSync(changelogPath, "utf-8");
  const entries = parseChangelog(md);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-3xl font-semibold tracking-tight">Shared Brain</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Session log — {entries.length}{" "}
          {entries.length === 1 ? "entry" : "entries"}
        </p>
      </header>

      {entries.length === 0 && (
        <p className="text-sm text-zinc-500">
          No entries yet. Add one to{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono dark:bg-zinc-800">
            CHANGELOG.md
          </code>
          .
        </p>
      )}

      <ol className="space-y-8">
        {entries.map((e, i) => (
          <li
            key={i}
            className="relative border-l-2 border-zinc-200 pl-6 dark:border-zinc-800"
          >
            <article>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                    e.state === "in-flight"
                      ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                      : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
                  }`}
                >
                  {e.state}
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  {e.date}
                </span>
              </div>
              <h2 className="text-lg font-semibold">{e.goal}</h2>
              <p className="mt-1 text-xs text-zinc-500">
                <span className="font-mono">{e.ai}</span> on{" "}
                <span className="font-mono">{e.machine}</span>
                {e.commits && (
                  <>
                    {" · "}
                    <span className="font-mono">{e.commits}</span>
                  </>
                )}
              </p>

              {e.whatChanged.length > 0 && (
                <section className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    What changed
                  </h3>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                    {e.whatChanged.map((c, j) => (
                      <li key={j}>
                        <InlineMarkdown text={c} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {e.why && (
                <section className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Why
                  </h3>
                  <p className="mt-1 text-sm">{e.why}</p>
                </section>
              )}

              {e.next && (
                <section className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Next
                  </h3>
                  <p
                    className={`mt-1 text-sm ${
                      e.state === "in-flight"
                        ? "rounded border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20"
                        : ""
                    }`}
                  >
                    {e.next}
                  </p>
                </section>
              )}

              {e.openQuestions.length > 0 && (
                <section className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Open questions
                  </h3>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                    {e.openQuestions.map((q, j) => (
                      <li key={j}>{q}</li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
          </li>
        ))}
      </ol>
    </main>
  );
}
