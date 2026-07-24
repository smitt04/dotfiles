# omp-guard

Pi extension that fences filesystem-touching tool calls to the current
session's working directory (plus a small fixed allowlist), and hard-blocks
any read of `.env`-style secret files regardless of location.

## Why

Tools like `read`, `write`, `edit`, `glob`, `grep`, `ast_grep`, `ast_edit`,
and `bash` can reference arbitrary paths. Without a guard, an agent could
wander outside the project it was launched in (e.g. `cat ~/.ssh/id_rsa`,
`bash cd /etc && cat passwd`) or read a `.env` file containing secrets.
`omp-guard` intercepts these calls before execution and either allows,
prompts for approval, or blocks them.

## What it does

### 1. Path confinement

On `session_start`, the guard records:

- `root` — the realpath'd session `cwd`.
- `allow` — a fixed allowlist, sourced from the top-level `ALLOWLIST`
  constant: `~/.omp`, `/tmp`, `/var/folders`.
- `approved` — an empty set of directories approved for this session.

On every `tool_call` for a path-capable tool (`PATH_TOOLS`: `read`, `write`,
`edit`, `glob`, `grep`, `ast_grep`, `ast_edit`, `bash`), it:

1. Extracts candidate path strings from the tool's input
   (`extractCandidatePaths`) — field-specific per tool:
    - `read`/`write`: `path`
    - `glob`/`grep`/`ast_grep`: `path` (`;`-separated, multiple allowed)
    - `ast_edit`: `paths` array
    - `edit`: `[FILENAME#TAG]` headers and `MV <dest>` lines pulled out of the
      patch body
    - `bash`: the `cwd` input, any `cd <dir>` targets, and any bare absolute /
      `~/...` paths found in the command string
2. Drops non-local candidates (`scheme://...` URIs).
3. Resolves each remaining candidate to a realpath (`resolveCandidate`),
   walking up to existing ancestors for not-yet-created write targets, with
   `~` expansion and inline read-selector stripping (`:50-100`, `:raw`, etc).
4. Checks each resolved path against `root`, `allow`, and `approved`
   (`isAllowed`) — a match anywhere in the chain passes.

If every candidate resolves inside an allowed directory, the call proceeds
untouched. Otherwise:

- **With a UI** (`ctx.hasUI`): prompts the user to allow or deny access to
  the offending path(s). Approving adds their containing directory to
  `approved` for the rest of the session (so repeated access to the same
  tree doesn't re-prompt); denying blocks the call.
- **Without a UI**: blocks unconditionally, with a reason telling the agent
  to ask the user or relaunch with that directory as the session root.

Tools/paths not covered by `PATH_TOOLS` (custom/MCP tools, `browser`, `task`,
etc.) pass through unguarded.

### 2. `.env` content blocking

Regardless of path confinement, `.env` and `.env.<suffix>` files are treated
as always-secret and never readable — even inside the session root — except
for common non-secret template suffixes: `example`, `sample`, `template`,
`dist`, `vault`.

- For `read`, `grep`, and `ast_grep` (`ENV_CONTENT_TOOLS`), any extracted
  candidate path matching a blocked `.env` name blocks the call outright
  before it runs.
- For `bash`, `bashExposesEnvContent` splits the command on `&&`, `||`,
  `|`, `;`, newlines, and subshell markers, and flags a segment only when it
  both names a blocked `.env` file (via `ENV_TOKEN_RE`, which also catches
  the filename embedded in quoted interpreter one-liners like
  `node -e "require('.env')"`) **and** starts with a content-revealing verb
  (`BASH_CONTENT_VERBS`: `cat`, `less`, `head`, `sed`, `awk`, `python`,
  `node`, `grep`, `eval`, shell invocations, etc.) rather than a metadata-only
  op like `ls`/`stat`/`test` or a write-only op like `cp`/`touch`.
- As a backstop, `tool_result` post-filters successful `grep`/`ast_grep`
  output: `redactEnvSections` blanks out any hashline section (bracketed
  header, or a `#`-depth fold) whose file name is a blocked `.env` file, in
  case a directory/glob scope incidentally matched inside one.

This is a best-effort textual scan, not a shell parser — heavily obfuscated
commands or indirect subshell tricks can still evade it, same caveat as the
path-confinement scan above.

## Configuration

- **Bypass**: set `OMP_GUARD_BYPASS=1` in the environment to disable the
  extension entirely (checked once at load time).
- **Allowlist**: edit the `ALLOWLIST` constant at the top of `index.ts`
  (currently `~/.omp`, `~/go`, `/tmp`, `/var/folders`) to add always-trusted
  directories.
- **`.env` exemptions**: edit `ENV_ALLOWED_SUFFIXES` in `index.ts` to change
  which `.env.<suffix>` files are treated as non-secret templates.

## Non-goals

- Not a sandbox — it inspects tool-call arguments and known output shapes,
  it does not intercept syscalls. A sufficiently obfuscated `bash` command
  can still escape detection.
- Does not guard tools outside `PATH_TOOLS` (MCP tools, `browser`, `task`,
  etc.) even if they can touch the filesystem indirectly.
