#!/usr/bin/env node
/**
 * Guard: forbid new handwritten coordinator paths outside
 * `src/lib/coordinator/`. The contract package
 * (@vibly/coordinator-http-contract) is the single source of truth for HTTP
 * paths; consumers must call those typed methods, not assemble URLs by hand.
 *
 * Heuristic: matches `/projects/...`, `/events`, `/health`, etc. used as
 * string literals or template prefixes in fetch / axios / EventSource calls
 * in `src/` outside of `src/lib/coordinator/`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../src", import.meta.url).pathname;
// Only the contract-client adapter is allowed to know about coordinator
// transport details (proxy base URL, query params). Everything else, including
// `client.ts`, must go through `this.contract.METHOD("/typed/path", ...)`.
const ALLOWED = ["/lib/coordinator/contractClient.ts"];
const PATTERNS = [
  /\bfetch\(\s*['"`]\/(projects|events|health|negotiations|reviews|incentives|governance|traces|agents|principals|objectives|knowledge|state|context|memberships|reputation|risk|guardian|streams|assignments|scenarios|phase-[a-z])\b/,
  /\bnew\s+EventSource\(\s*['"`]\/(projects|streams)\b/,
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) yield full;
  }
}

const violations = [];
for (const file of walk(ROOT)) {
  if (ALLOWED.some((allowed) => file.includes(allowed))) continue;
  const content = readFileSync(file, "utf8");
  for (const pattern of PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      violations.push({ file: file.replace(`${ROOT}/`, ""), match: match[0] });
      break;
    }
  }
}

if (violations.length > 0) {
  console.error(
    `[contract guard] Handwritten coordinator paths detected outside src/lib/coordinator. ` +
      `Use @vibly/coordinator-http-contract instead.`,
  );
  for (const v of violations) console.error(` - ${v.file}: ${v.match}`);
  process.exit(1);
}

console.log("[contract guard] OK");
