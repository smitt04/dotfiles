---
name: praxis
description: Use the praxis memory tools to persist and recall knowledge across sessions.
---

# Praxis — persistent memory across sessions

You have access to praxis MCP tools: `mcp__praxis_save`, `mcp__praxis_recall`,
`mcp__praxis_save_session`, and `mcp__praxis_resume`.

The praxis extension also runs a background review loop. Between the proactive
saves and your manual saves, memory accumulates automatically — but you should
still save immediately at the triggers listed below.

## When to recall

- **Session start**: call `mcp__praxis_resume` for the project — the extension
  injects this automatically, but you can call it manually for a different project.
- **Before designing anything**: recall decisions and code_chunks for the area.
- **When hitting an error**: recall the errors shard for similar past issues.

```
mcp__praxis_resume(project="<name>")
mcp__praxis_recall(query="<project> <topic>", top_k=5)
```

## When to save immediately (don't wait for background review)

| Trigger | What to save | Shard | Category |
|---|---|---|---|
| A user correction — "no, use X", "don't do that" | What was wrong + what to do instead | `messages` | `correction` |
| Architecture or API decision made | Decision + rationale | `decisions` | `decision` |
| Non-obvious bug diagnosed and fixed | Problem + root cause + fix | `errors` | `error` |
| User states a strong preference | The preference | `messages` | `preference` |
| Project convention discovered | The convention | `messages` | `convention` |
| External API quirk found | The behaviour + workaround | `docs` | `tool-quirk` |
| End of a meaningful session | 2–4 sentence summary | `sessions` | *(use `mcp__praxis_save_session`)* |

## Shard guide

| Shard | What goes here |
|---|---|
| `decisions` | Architecture, API, and approach decisions; non-obvious insights |
| `errors` | Bugs diagnosed and fixed — problem + root cause + fix |
| `code_chunks` | Reusable patterns, key interfaces, non-obvious implementations |
| `docs` | External API behaviour, constraints, or quirks discovered |
| `sessions` | End-of-session summaries (use `mcp__praxis_save_session`) |
| `messages` | User corrections, preferences, conventions, mid-session requirements |

## Category field

Always include `"category"` in the payload. Valid values:

| Category | When to use |
|---|---|
| `decision` | Architectural, API, or approach decision |
| `error` | Bug diagnosed and fixed |
| `insight` | Non-obvious learning from experience |
| `correction` | User corrected the agent |
| `preference` | User preference (tool, style, workflow) |
| `convention` | Project-specific convention or norm |
| `tool-quirk` | External tool/API undocumented behaviour |

## Payload

Always include `{"project": "<name>", "date": "<YYYY-MM-DD>", "category": "<type>"}`.
Add `"path"` or other context when relevant.

## ID format

IDs must be stable and meaningful:
- `<project>-<YYYYMMDD>-<short-slug>` for decisions, sessions, errors
- `<file-path>:<symbol>` for code_chunks
- `<project>-<YYYYMMDD>-correction-<slug>` for corrections

Never use random UUIDs — they make recall by ID impossible.

## Example — save a decision

```
mcp__praxis_save(
  shard="decisions",
  id="praxis-20260518-payload-filter-server-side",
  text="Added server-side payload filtering to RecallRequest proto. Filter added as field 4 (repeated PayloadFilter). Qdrant NewMatch used for keyword conditions. Fixes resume returning cross-project results.",
  payload="{\"project\":\"praxis\",\"date\":\"2026-05-18\",\"category\":\"decision\"}"
)
```

## Example — save a correction

```
mcp__praxis_save(
  shard="messages",
  id="praxis-20260518-correction-use-pnpm",
  text="Use pnpm not npm for this project. Agent used npm install incorrectly.",
  payload="{\"project\":\"praxis\",\"date\":\"2026-05-18\",\"category\":\"correction\"}"
)
```

## Example — session summary

```
mcp__praxis_save_session(
  project="praxis",
  summary="Fixed cross-project contamination in praxis resume by adding server-side payload filtering to the RecallRequest proto. Added PayloadFilter message, updated storage/retrieval/server layers, and updated CLI and MCP bridge to pass project filter on resume calls."
)
```
