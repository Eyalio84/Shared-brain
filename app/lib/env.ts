import { execSync } from "node:child_process";

export type Machine =
  | "termux"
  | "proot"
  | "laptop-linux"
  | "laptop-mac"
  | "laptop-win"
  | "unknown";

export type CapabilityStatus = "yes" | "no" | "conditional";

export type Capability = {
  name: string;
  status: CapabilityStatus;
  note?: string;
};

export type EnvSnapshot = {
  machine: Machine;
  label: string;
  capabilities: Capability[];
};

function runtimeUname(): string {
  try {
    return execSync("uname -a", { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

const TERMUX_CAPS: Capability[] = [
  { name: "Edit code", status: "yes" },
  { name: "Typecheck", status: "yes", note: "node ./node_modules/typescript/bin/tsc --noEmit" },
  { name: "npm install", status: "conditional", note: "--no-bin-links --ignore-scripts" },
  { name: "npm run dev", status: "no", note: "dlopen wall on /storage" },
  { name: "npm run build", status: "no", note: "dlopen wall on /storage" },
];

const PROOT_CAPS: Capability[] = [
  { name: "Edit code", status: "yes" },
  { name: "Typecheck", status: "yes" },
  { name: "npm install", status: "yes" },
  { name: "npm run dev", status: "yes", note: "-H localhost baked into script" },
  { name: "npm run build", status: "yes" },
];

const LAPTOP_CAPS: Capability[] = [
  { name: "Edit code", status: "yes" },
  { name: "Typecheck", status: "yes" },
  { name: "npm install", status: "yes" },
  { name: "npm run dev", status: "yes" },
  { name: "npm run build", status: "yes" },
];

let cached: EnvSnapshot | null = null;

export function detectEnv(): EnvSnapshot {
  if (cached) return cached;

  const prefix = process.env.PREFIX ?? "";
  if (prefix.includes("com.termux")) {
    cached = {
      machine: "termux",
      label: "Termux (Android)",
      capabilities: TERMUX_CAPS,
    };
    return cached;
  }

  const uname = runtimeUname();
  if (uname.includes("PRoot-Distro")) {
    cached = {
      machine: "proot",
      label: "proot Ubuntu (Android)",
      capabilities: PROOT_CAPS,
    };
    return cached;
  }

  const platform = process.platform;
  if (platform === "darwin") {
    cached = { machine: "laptop-mac", label: "Laptop (macOS)", capabilities: LAPTOP_CAPS };
  } else if (platform === "linux") {
    cached = { machine: "laptop-linux", label: "Laptop (Linux)", capabilities: LAPTOP_CAPS };
  } else if (platform === "win32") {
    cached = { machine: "laptop-win", label: "Laptop (Windows)", capabilities: LAPTOP_CAPS };
  } else {
    cached = { machine: "unknown", label: `Unknown (${platform})`, capabilities: LAPTOP_CAPS };
  }
  return cached;
}
