---
name: praxis
description: Use the praxis memory tools to persist and recall knowledge across sessions.
---

# Praxis — persistent memory across sessions

You have access to three MCP tools: `praxis_recall`, `praxis_save`, and `praxis_save_session`.

---

## Session start (REQUIRED)

At the start of every non-trivial session, call `praxis_resume` with the project name before doing any work:

```
praxis_resume(project="<project>")
```

This loads recent session summaries and architecture decisions for the project in one call. If there are no prior sessions it returns empty — proceed normally.

---

## Session end (REQUIRED)

At the end of every meaningful session, call `praxis_save_session`:

```
praxis_save_session(
  project="<project>",
  summary="<2-4 sentences: what changed, what was decided, what to watch out for next time>"
)
```

A good summary answers: what was the goal, what was done, what is the state now, any gotchas.

---

## Saving during a session

Save at natural checkpoints — after a decision, after diagnosing a bug, after a key finding. Do not save every message.

| Shard         | Save when                                                              | ID pattern                          |
|---------------|------------------------------------------------------------------------|-------------------------------------|
| `decisions`   | An architectural, API, or approach decision is made                    | `<project>-<YYYYMMDD>-<slug>`       |
| `errors`      | A non-obvious bug is diagnosed and fixed — save problem + solution     | `<project>-<error-slug>`            |
| `code_chunks` | A reusable pattern, non-obvious implementation, or key interface lands | `<file-path>:<symbol>`              |
| `docs`        | External API behaviour or constraint is discovered                     | `<project>-<YYYYMMDD>-<slug>`       |
| `messages`    | A key constraint, requirement, or user preference stated mid-session   | `<project>-<YYYYMMDD>-<slug>`       |

Use `praxis_save` for all of the above:

```
praxis_save(
  shard="decisions",
  id="praxis-20260517-go-not-rust",
  text="Chose Go over Rust. Rationale: team Go familiarity, faster iteration, gRPC ecosystem maturity.",
  payload="{\"project\":\"praxis\",\"date\":\"2026-05-17\"}"
)
```

Always include `{"project": "<name>"}` in the payload — it enables project-scoped filtering later.

---

## Recall during a session

Before designing anything, before making a decision, before debugging a class of error:

```
praxis_recall(query="<specific question>", top_k=5)
```

Narrow the search with `shards` when you know where to look:

```
praxis_recall(query="storage layer errors", shards=["errors", "decisions"], top_k=5)
```
