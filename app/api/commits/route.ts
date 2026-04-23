import { NextResponse } from "next/server";
import { execFileSync } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Commit = { hash: string; subject: string };

export async function GET() {
  try {
    const raw = execFileSync("git", ["log", "--oneline", "-20"], {
      cwd: process.cwd(),
      encoding: "utf-8",
    });
    const commits: Commit[] = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const spaceIdx = line.indexOf(" ");
        return spaceIdx === -1
          ? { hash: line, subject: "" }
          : {
              hash: line.slice(0, spaceIdx),
              subject: line.slice(spaceIdx + 1),
            };
      });
    return NextResponse.json({ commits });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "git log failed" },
      { status: 500 },
    );
  }
}
