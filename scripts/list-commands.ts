import fs from "node:fs";
import path from "node:path";

type PackageJson = {
  scripts?: Record<string, string>;
  scriptDescriptions?: Record<string, string>;
  // Back-compat if you ever rename the field
  scriptDescriptionsMap?: Record<string, string>;
};

function padRight(str: string, width: number): string {
  if (str.length >= width) return str;
  return str + " ".repeat(width - str.length);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function toDescription(descMap: Record<string, string> | undefined, key: string): string {
  const raw = descMap?.[key];
  if (typeof raw !== "string") return "";
  return raw.trim();
}

function shouldIncludeScript(name: string, value: unknown): value is string {
  if (!name || typeof value !== "string") return false;
  // Avoid listing internal npm lifecycle scripts if present
  if (name === "preinstall" || name === "install" || name === "postinstall") return false;
  return true;
}

function isScriptsFolderInvoker(scriptValue: string): boolean {
  const normalized = scriptValue.replaceAll("\\", "/");
  // Most common patterns in this repo: "tsx scripts/foo.ts", but keep it generic.
  return normalized.includes(" scripts/") || normalized.startsWith("scripts/");
}

function main() {
  const packageJsonPath = path.resolve(process.cwd(), "package.json");
  const pkg = readJson<PackageJson>(packageJsonPath);

  const scripts = pkg.scripts ?? {};
  const descriptions = pkg.scriptDescriptions ?? pkg.scriptDescriptionsMap ?? {};

  const query = process.argv.slice(2).join(" ").trim().toLowerCase();

  const rows = Object.entries(scripts)
    .filter(([name, value]) => shouldIncludeScript(name, value))
    .map(([name, value]) => ({
      name,
      cmd: `npm run ${name}`,
      desc: toDescription(descriptions, name),
      fromScriptsFolder: isScriptsFolderInvoker(value),
    }))
    .filter((r) => {
      if (!query) return true;
      return (
        r.name.toLowerCase().includes(query) ||
        r.cmd.toLowerCase().includes(query) ||
        r.desc.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (rows.length === 0) {
    process.stdout.write("No matching scripts found.\n");
    process.exit(0);
  }

  const width = Math.max(...rows.map((r) => r.cmd.length), "Command".length);

  const scriptsFolderRows = rows.filter((r) => r.fromScriptsFolder);
  const otherRows = rows.filter((r) => !r.fromScriptsFolder);

  const printTable = (title: string, list: typeof rows) => {
    if (list.length === 0) return;
    process.stdout.write(`${title}\n`);
    process.stdout.write(`${padRight("Command", width)}  Description\n`);
    process.stdout.write(`${"-".repeat(width)}  -----------\n`);
    for (const r of list) {
      const desc = r.desc || "(no description yet)";
      process.stdout.write(`${padRight(r.cmd, width)}  ${desc}\n`);
    }
    process.stdout.write("\n");
  };

  printTable("Scripts (run files from ./scripts/)", scriptsFolderRows);
  printTable("Other scripts", otherRows);

  process.stdout.write('\nTip: add/edit descriptions in package.json under "scriptDescriptions".\n');
}

main();
