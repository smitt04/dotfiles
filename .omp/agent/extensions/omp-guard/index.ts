import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { homedir } from "node:os";
import * as path from "node:path";
import { promises as fs } from "node:fs";

// Tools whose inputs can name filesystem paths. Anything not in this record
// passes through unguarded (custom/MCP tools, browser, task, etc.).
const PATH_TOOLS: Record<string, true> = {
  read: true,
  write: true,
  edit: true,
  glob: true,
  grep: true,
  ast_grep: true,
  ast_edit: true,
  bash: true,
};

// Tools whose content-facing output can expose file contents. `read`/`grep`/
// `ast_grep` are checked for explicit .env targets pre-execution; `grep`/
// `ast_grep` are also post-filtered in case a directory/glob scope
// incidentally matched inside a .env file.
const ENV_CONTENT_TOOLS: Record<string, true> = { read: true, grep: true, ast_grep: true };

// `.env` / `.env.<name>` are blocked; common non-secret templates are exempt.
const ENV_ALLOWED_SUFFIXES = new Set(["example", "sample", "template", "dist", "vault"]);

function isBlockedEnvFile(name: string): boolean {
  const base = path.basename(name);
  if (base === ".env") return true;
  const m = base.match(/^\.env\.(.+)$/);
  return m ? !ENV_ALLOWED_SUFFIXES.has(m[1]) : false;
}

// Bash verbs that print/consume a file's contents (vs. metadata-only ops like
// `ls`/`test`/`stat`, or write-only ops like `cp DEST`/`touch`).
const BASH_CONTENT_VERBS: Record<string, true> = {
  cat: true, less: true, more: true, head: true, tail: true, bat: true,
  vim: true, vi: true, nvim: true, nano: true, emacs: true, source: true,
  ".": true, xxd: true, od: true, hexdump: true, strings: true, awk: true,
  sed: true, jq: true, base64: true, tr: true, dd: true, python: true,
  python3: true, node: true, bun: true, ruby: true, perl: true, tee: true,
  grep: true, rg: true, eval: true, bash: true, sh: true, zsh: true,
};

function stripQuotes(token: string): string {
  if (token.length >= 2) {
    const first = token[0];
    const last = token[token.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) return token.slice(1, -1);
  }
  return token.replace(/^[<>]+/, "");
}

// Matches a .env-like filename token anywhere in text, including embedded in
// quoted interpreter one-liners (e.g. `node -e "require('.env')"`).
const ENV_TOKEN_RE = /(?:^|[\s"'`(=/])(\.env(?:\.[\w-]+)?)\b/g;

function segmentTargetsBlockedEnvFile(segment: string): boolean {
  for (const m of segment.matchAll(ENV_TOKEN_RE)) {
    if (isBlockedEnvFile(m[1])) return true;
  }
  return false;
}

/** Best-effort scan: flags a segment only when a content-revealing verb is
 * present AND a blocked env filename appears anywhere in the segment
 * (including inside nested quotes/one-liners). Not a parser — subshell
 * indirection or heavily obfuscated commands can still evade this, same
 * caveat as the root-escape bash scan below. */
function bashExposesEnvContent(command: string): boolean {
  const segments = command.split(/&&|\|\||[|;\n]|\$\(|`/);
  for (const segment of segments) {
    if (!segmentTargetsBlockedEnvFile(segment)) continue;

    if (/<\s*['"]?[^\s'"]*\.env(?:\.[\w-]+)?['"]?/.test(segment)) return true;

    const rawTokens = segment.match(/"[^"]*"|'[^']*'|\S+/g);
    if (!rawTokens) continue;
    const tokens = rawTokens.map(stripQuotes);

    let i = 0;
    while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;
    const verb = i < tokens.length ? path.basename(tokens[i]) : "";

    if (BASH_CONTENT_VERBS[verb]) return true;
  }
  return false;
}

interface GuardState {
  root: string; // session start directory, realpath'd
  allow: string[]; // fixed allowlist, realpath'd
  approved: Set<string>; // directories the user has approved this session
}

/** Strip a trailing inline selector (":50-100", ":raw", ":raw:1-2", ...) off a path string. */
function stripInlineSelector(p: string): string {
  const m = p.match(/^(.*?):(?:raw(?::[\d,+-]+)?|conflicts|[\d,+-]+(?::raw)?)$/);
  return m ? m[1] : p;
}

/** URIs (scheme://...) are not local filesystem paths — skip them entirely. */
const NON_LOCAL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

async function resolveCandidate(raw: string, cwd: string): Promise<string> {
  const stripped = stripInlineSelector(raw.trim());
  const expanded = stripped.startsWith("~")
    ? path.join(homedir(), stripped.slice(1))
    : stripped;
  const absolute = path.isAbsolute(expanded) ? expanded : path.resolve(cwd, expanded);
  try {
    return await fs.realpath(absolute);
  } catch {
    // Target doesn't exist yet (e.g. a write destination). Realpath the
    // nearest existing ancestor so symlinked parents still resolve correctly.
    let dir = path.dirname(absolute);
    const base = [path.basename(absolute)];
    for (let i = 0; i < 8; i++) {
      try {
        const realDir = await fs.realpath(dir);
        return path.join(realDir, ...base.reverse());
      } catch {
        base.push(path.basename(dir));
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }
    return absolute;
  }
}

function isInside(target: string, dir: string): boolean {
  return target === dir || target.startsWith(dir + path.sep);
}

function isAllowed(target: string, state: GuardState): boolean {
  if (isInside(target, state.root)) return true;
  for (const dir of state.allow) if (isInside(target, dir)) return true;
  for (const dir of state.approved) if (isInside(target, dir)) return true;
  return false;
}

// --- Per-tool path extraction -------------------------------------------------

function splitPathField(value: unknown, multi: boolean): string[] {
  if (typeof value !== "string" || value.length === 0) return [];
  return multi ? value.split(";").map((s) => s.trim()).filter(Boolean) : [value];
}

const EDIT_HEADER_RE = /^\[(.+?)#[0-9A-Za-z]{4}\]$/gm;
const EDIT_MV_RE = /^MV\s+(.+)$/gm;

function extractEditPaths(input: string): string[] {
  const out: string[] = [];
  for (const m of input.matchAll(EDIT_HEADER_RE)) out.push(m[1]);
  for (const m of input.matchAll(EDIT_MV_RE)) {
    const dest = m[1].trim();
    out.push(dest.startsWith('"') && dest.endsWith('"') ? dest.slice(1, -1) : dest);
  }
  return out;
}

const BASH_CD_RE = /(?:^|&&|;|\n)\s*cd\s+(~\/[^\s"'`&;|]+|\/[^\s"'`&;|]+|"[^"]+"|'[^']+')/g;
const BASH_ABS_RE = /(~\/[^\s"'`&;|)]+|\/Users\/[^\s"'`&;|)]+)/g;

function extractBashPaths(command: string, cwd: unknown): string[] {
  const out: string[] = [];
  if (typeof cwd === "string" && cwd) out.push(cwd);
  for (const m of command.matchAll(BASH_CD_RE)) {
    let target = m[1];
    if ((target.startsWith('"') && target.endsWith('"')) || (target.startsWith("'") && target.endsWith("'"))) {
      target = target.slice(1, -1);
    }
    out.push(target);
  }
  for (const m of command.matchAll(BASH_ABS_RE)) out.push(m[1]);
  return out;
}

/** Best-effort hashline-output redactor: blanks out grouped/single file
 * sections whose header names a blocked .env file, so an incidental
 * directory/glob match inside grep/ast_grep output never reaches the LLM. */
function redactEnvSections(text: string): string {
  const bracketWhole = text.match(/^\[(.+?)\]/);
  if (bracketWhole) {
    const name = bracketWhole[1].replace(/#[0-9A-Za-z]{4}$/, "");
    if (isBlockedEnvFile(name)) return `[REDACTED: blocked .env file — ${name}]`;
  }

  const lines = text.split("\n");
  const out: string[] = [];
  let skipDepth: number | null = null;
  for (const line of lines) {
    const foldMatch = line.match(/^(#+)\s+(.+)$/);
    if (!foldMatch) {
      if (skipDepth === null) out.push(line);
      continue;
    }
    const depth = foldMatch[1].length;
    if (skipDepth !== null && depth <= skipDepth) skipDepth = null;

    const label = foldMatch[2];
    const isDir = label.endsWith("/");
    const name = label.replace(/#[0-9A-Za-z]{4}$/, "");
    if (!isDir && isBlockedEnvFile(name)) {
      skipDepth = depth;
      out.push(`${foldMatch[1]} ${name} [REDACTED: blocked .env file]`);
      continue;
    }
    if (skipDepth === null) out.push(line);
  }
  return out.join("\n");
}

function extractCandidatePaths(toolName: string, input: Record<string, unknown>): string[] {
  switch (toolName) {
    case "read":
    case "write":
      return splitPathField(input.path, false);
    case "glob":
    case "grep":
    case "ast_grep":
      return splitPathField(input.path, true);
    case "ast_edit":
      return Array.isArray(input.paths) ? input.paths.filter((p): p is string => typeof p === "string") : [];
    case "edit":
      return typeof input.input === "string" ? extractEditPaths(input.input) : [];
    case "bash":
      return typeof input.command === "string" ? extractBashPaths(input.command, input.cwd) : [];
    default:
      return [];
  }
}

// --- Extension ---------------------------------------------------------------

export default function ompGuard(pi: ExtensionAPI): void {
  if (Bun.env.OMP_GUARD_BYPASS === "1") return;

  const state: GuardState = { root: "", allow: [], approved: new Set() };

  async function realpathOrRaw(p: string): Promise<string> {
    try {
      return await fs.realpath(p);
    } catch {
      return p;
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    state.root = await realpathOrRaw(ctx.cwd);
    state.allow = await Promise.all(
      [path.join(homedir(), ".omp"), "/tmp", "/var/folders"].map(realpathOrRaw),
    );
    state.approved.clear();
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!PATH_TOOLS[event.toolName]) return;
    if (!state.root) state.root = await realpathOrRaw(ctx.cwd);

    // .env content is never readable, regardless of session root/allowlist.
    if (event.toolName === "bash" && typeof event.input.command === "string") {
      if (bashExposesEnvContent(event.input.command)) {
        return { block: true, reason: "Blocked: command reads a .env file. .env contents may never be read." };
      }
    } else if (ENV_CONTENT_TOOLS[event.toolName]) {
      const targets = extractCandidatePaths(event.toolName, event.input as Record<string, unknown>);
      if (targets.some((t) => isBlockedEnvFile(t))) {
        return { block: true, reason: "Blocked: .env files may never be read." };
      }
    }

    const raw = extractCandidatePaths(event.toolName, event.input as Record<string, unknown>);
    if (raw.length === 0) return;

    const filtered = raw.filter((p) => p.length > 0 && !NON_LOCAL_RE.test(p));
    if (filtered.length === 0) return;
    const resolved = await Promise.all(filtered.map((p) => resolveCandidate(p, state.root)));
    const offenders = resolved.filter((p) => !isAllowed(p, state));
    if (offenders.length === 0) return;

    const unique = [...new Set(offenders)];
    const list = unique.join("\n  ");

    if (ctx.hasUI) {
      const allow = await ctx.ui.confirm(
        "Path outside session root",
        `${event.toolName} wants to access:\n  ${list}\n\nSession root: ${state.root}\n\nAllow?`,
      );
      if (allow) {
        for (const p of unique) {
          try {
            const st = await fs.stat(p);
            state.approved.add(st.isDirectory() ? p : path.dirname(p));
          } catch {
            state.approved.add(path.dirname(p));
          }
        }
        return;
      }
      return {
        block: true,
        reason: `Denied: ${event.toolName} target(s) outside session root (${state.root}):\n  ${list}`,
      };
    }

    return {
      block: true,
      reason:
        `Blocked: ${event.toolName} target(s) outside session root (${state.root}) and no UI to request approval:\n  ${list}\n` +
        `Ask the user to grant access or relaunch with that directory as the session root.`,
    };
  });

  pi.on("tool_result", async (event) => {
    if (event.isError) return;
    if (event.toolName !== "grep" && event.toolName !== "ast_grep") return;

    let changed = false;
    const content = event.content.map((chunk) => {
      if (chunk.type !== "text") return chunk;
      const redacted = redactEnvSections(chunk.text);
      if (redacted !== chunk.text) changed = true;
      return changed ? { ...chunk, text: redacted } : chunk;
    });
    if (changed) return { content };
  });
}
