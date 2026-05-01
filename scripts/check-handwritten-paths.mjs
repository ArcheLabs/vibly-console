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

// Hard ban: never put Coordinator credentials in a URL. The Console proxy
// resolves them server-side from the Auth.js session; allowing them in
// query strings would re-introduce token leakage via Referer / history /
// access logs. The proxy route handler itself only deletes them, it
// never reads them, so even there these literals must not appear as
// transport sources.
const FORBIDDEN_QUERY_LITERALS = ["__apiToken", "__coordinatorUrl"];
// Files that may legitimately mention these literals (deletion lists,
// security tests asserting absence, this guard itself).
const QUERY_GUARD_ALLOWED = [
  "/app/api/coordinator/[...path]/route.ts",
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
  const content = readFileSync(file, "utf8");
  if (!ALLOWED.some((allowed) => file.includes(allowed))) {
    for (const pattern of PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        violations.push({ file: file.replace(`${ROOT}/`, ""), match: match[0] });
        break;
      }
    }
  }
  if (!QUERY_GUARD_ALLOWED.some((allowed) => file.includes(allowed))) {
    for (const literal of FORBIDDEN_QUERY_LITERALS) {
      if (content.includes(literal)) {
        violations.push({ file: file.replace(`${ROOT}/`, ""), match: literal });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    `[contract guard] Handwritten coordinator paths or URL credentials detected. ` +
      `Use @vibly/coordinator-http-contract for paths, and the Auth.js session + server-side credential resolver for transport credentials.`,
  );
  for (const v of violations) console.error(` - ${v.file}: ${v.match}`);
  process.exit(1);
}

console.log("[contract guard] OK");
