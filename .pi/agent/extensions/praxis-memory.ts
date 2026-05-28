/**
 * praxis-memory.ts — Pi extension for praxis persistent memory.
 *
 * Passive layer (runs at session start):
 *   - Calls `praxis resume <project>` and injects recalled context into the
 *     first agent turn.
 *
 * Proactive layer (hermes-inspired learning loop):
 *   - Background review: every 10 turns or 15 tool calls, spawns a child
 *     `pi -p --no-session` process that reviews the conversation and calls
 *     mcp__praxis_save for anything worth persisting.
 *   - Correction detection: when the user corrects the agent, triggers an
 *     immediate save with category="correction".
 *   - Session auto-flush: on meaningful shutdown, automatically saves a
 *     session summary via mcp__praxis_save_session.
 *
 * Commands:
 *   /praxis-recall <query>  — query memory and inject results into context
 *   /praxis-save [summary]  — manually save a session summary
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as path from "node:path";

// ── Configuration ──────────────────────────────────────────────────────────────

const NUDGE_TURNS = 10;
const NUDGE_TOOL_CALLS = 15;
const MIN_TURNS_FOR_FLUSH = 4;
const MAX_REVIEW_MESSAGES = 40;
const MAX_CORRECTION_MESSAGES = 6;

// ── Prompts ────────────────────────────────────────────────────────────────────

function reviewPrompt(project: string, date: string, conversation: string): string {
  return `You are reviewing a work session to extract valuable information for persistent memory.

The following tools are available: praxis_save, praxis_recall.

Review the conversation below. For each piece of information worth persisting:
1. Call praxis_recall to check whether it is already saved
2. If not already saved, call praxis_save with the appropriate arguments

Shard + category guide:
- decisions  → architectural, API, or approach decisions       (category: decision)
- decisions  → non-obvious learnings or insights               (category: insight)
- errors     → bugs diagnosed and fixed (include root cause)   (category: error)
- messages   → user corrections to agent behaviour             (category: correction)
- messages   → user preferences or workflow habits             (category: preference)
- messages   → project conventions discovered                  (category: convention)
- docs       → external API quirks or undocumented behaviour   (category: tool-quirk)

Payload MUST include: {"project":"${project}","date":"${date}","category":"<type>"}
ID format: ${project}-<YYYYMMDD>-<slug>

Save only what has lasting value across sessions.
Skip obvious facts, pure Q&A exchanges, and anything already in memory.
If nothing is worth saving, do not call any tools.

--- Conversation ---
${conversation}`;
}

function sessionFlushPrompt(project: string, conversation: string): string {
  return `Save a session summary to praxis memory.

Call praxis_save_session exactly once:
- project: ${project}
- summary: 2–4 sentences covering what was accomplished, what changed, and any key decisions made

If the session had no meaningful work (e.g. only greetings or trivial questions), do not call any tools.

--- Conversation ---
${conversation}`;
}

function correctionPrompt(project: string, date: string, conversation: string): string {
  return `The user just corrected the agent. Save this correction to praxis memory.

Call praxis_save exactly once:
- shard: messages
- id: ${project}-${date.replace(/-/g, "")}-correction-<slug>
- text: a specific description of what the agent did wrong and what to do instead
- payload: {"project":"${project}","date":"${date}","category":"correction"}

If the correction is trivial ("ok", "no problem", "no worries"), do not call any tools.

--- Recent Conversation ---
${conversation}`;
}

// ── Correction detection ───────────────────────────────────────────────────────

const STRONG_CORRECTION_PATTERNS: RegExp[] = [
  /^no[,\s!]/i,
  /^don'?t\s/i,
  /^stop\s/i,
  /^wrong[,\s!.]/i,
  /^that'?s\s+(wrong|not\s+(right|correct))/i,
  /^I said\s/i,
  /^I told you/i,
  /^use\s+\S+[,\s]+(not|instead)/i,
];

const NEGATIVE_CORRECTION_PATTERNS: RegExp[] = [
  /no worries/i,
  /no problem/i,
  /no rush/i,
  /no big deal/i,
  /^(ok|okay|thanks|great|perfect|looks good|sounds good|that'?s fine)/i,
  /actually\s+(great|good|perfect|fine|looks good)/i,
];

function isCorrection(text: string): boolean {
  for (const p of NEGATIVE_CORRECTION_PATTERNS) {
    if (p.test(text)) return false;
  }
  for (const p of STRONG_CORRECTION_PATTERNS) {
    if (p.test(text)) return true;
  }
  return false;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getMessageText(msg: { content: unknown }): string {
  if (typeof msg.content === "string") return msg.content;
  if (!Array.isArray(msg.content)) return "";
  return (msg.content as Array<{ type?: string; text?: string }>)
    .filter((b) => b?.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");
}

function extractConversation(entries: unknown[], maxMessages: number): string {
  const parts: string[] = [];
  for (const entry of entries as Array<{
    type?: string;
    message?: { role?: string; content?: unknown };
  }>) {
    if (entry.type !== "message") continue;
    const msg = entry.message;
    if (!msg || (msg.role !== "user" && msg.role !== "assistant")) continue;
    const text = getMessageText(msg as { content: unknown });
    if (!text.trim()) continue;
    const prefix = msg.role === "user" ? "[USER]" : "[ASSISTANT]";
    parts.push(`${prefix}: ${text.trim()}`);
  }
  return parts.slice(-maxMessages).join("\n\n");
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function projectFromCwd(cwd: string): string {
  return path.basename(cwd);
}

// ── Extension ──────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  // ── Recalled context (passive layer) ────────────────────────────────────
  let pendingContext: string | null = null;
  let contextInjected = false;

  // ── Proactive learning state ─────────────────────────────────────────────
  let turnsSinceReview = 0;
  let toolCallsSinceReview = 0;
  let reviewInProgress = false;
  let pendingCorrection = false;
  let correctionInProgress = false;
  let userTurnCount = 0;
  // Start at threshold so the first correction can fire immediately.
  let turnsSinceCorrection = 3;

  function resetProactiveState() {
    turnsSinceReview = 0;
    toolCallsSinceReview = 0;
    reviewInProgress = false;
    pendingCorrection = false;
    correctionInProgress = false;
    userTurnCount = 0;
    turnsSinceCorrection = 3;
  }

  // ── Auto-recall on session start ─────────────────────────────────────────

  pi.on("session_start", async (event, ctx) => {
    // Only recall on fresh start or explicit /new — skip reload, fork, resume.
    if (event.reason !== "startup" && event.reason !== "new") return;

    resetProactiveState();
    pendingContext = null;
    contextInjected = false;

    const project = projectFromCwd(ctx.cwd);
    ctx.ui.notify(`praxis: recalling memory for "${project}"…`, "info");

    let result: Awaited<ReturnType<typeof pi.exec>>;
    try {
      result = await pi.exec("praxis", ["resume", project], { timeout: 10_000 });
    } catch (err) {
      ctx.ui.notify(
        `praxis: exec failed — is praxisd running? (${String(err)})`,
        "error",
      );
      return;
    }

    if (result.code !== 0) {
      const msg = result.stderr.trim() || `exit ${result.code}`;
      ctx.ui.notify(`praxis: recall error — ${msg}`, "error");
      return;
    }

    const output = result.stdout.trim();
    if (!output) {
      ctx.ui.notify(`praxis: no memory found for "${project}"`, "info");
      return;
    }

    pendingContext = output;
    const lineCount = output.split("\n").filter((l) => l.trim()).length;
    ctx.ui.notify(
      `praxis: loaded ${lineCount} lines of memory for "${project}"`,
      "info",
    );
  });

  // ── Inject recalled context into the first agent turn ───────────────────

  pi.on("before_agent_start", async (event, _ctx) => {
    if (contextInjected || !pendingContext) return;
    contextInjected = true;
    return {
      systemPrompt:
        event.systemPrompt +
        "\n\n## Praxis memory (recalled at session start)\n\n" +
        pendingContext +
        "\n\n(End of recalled memory.)",
    };
  });

  // ── Correction flagging ──────────────────────────────────────────────────

  pi.on("message_end", async (event, _ctx) => {
    if (event.message.role !== "user") return;
    userTurnCount++;
    const text = getMessageText(event.message as { content: unknown });
    if (text && isCorrection(text)) {
      pendingCorrection = true;
    }
  });

  // ── Review loop + correction trigger ────────────────────────────────────

  pi.on("turn_end", async (event, ctx) => {
    turnsSinceReview++;
    turnsSinceCorrection++;

    // Count tool calls from this turn's assistant message.
    const msg = event.message as
      | { role?: string; content?: unknown }
      | undefined;
    if (msg?.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content as Array<{ type?: string }>) {
        if (block?.type === "toolCall") toolCallsSinceReview++;
      }
    }

    const project = projectFromCwd(ctx.cwd);
    const date = todayDate();

    // Correction — highest priority, fires on the very next turn.
    if (
      pendingCorrection &&
      !correctionInProgress &&
      turnsSinceCorrection >= 3
    ) {
      pendingCorrection = false;
      turnsSinceCorrection = 0;
      correctionInProgress = true;

      const entries = ctx.sessionManager.getBranch();
      const conversation = extractConversation(
        entries,
        MAX_CORRECTION_MESSAGES,
      );
      const prompt = correctionPrompt(project, date, conversation);

      // Fire-and-forget — must not block the interactive session.
      pi.exec("pi", ["-p", "--no-session", prompt], { timeout: 30_000 })
        .then((result) => {
          correctionInProgress = false;
          if (
            result.code === 0 &&
            result.stdout?.trim() &&
            !result.stdout.toLowerCase().includes("nothing to save")
          ) {
            ctx.ui.notify("🔧 Correction saved to praxis memory", "info");
          }
        })
        .catch(() => {
          correctionInProgress = false;
        });
      return;
    }

    // Background review — fires when either threshold is reached.
    const reviewDue =
      (turnsSinceReview >= NUDGE_TURNS ||
        toolCallsSinceReview >= NUDGE_TOOL_CALLS) &&
      userTurnCount >= 3 &&
      !reviewInProgress;

    if (!reviewDue) return;

    turnsSinceReview = 0;
    toolCallsSinceReview = 0;
    reviewInProgress = true;

    const entries = ctx.sessionManager.getBranch();
    const conversation = extractConversation(entries, MAX_REVIEW_MESSAGES);
    if (!conversation) {
      reviewInProgress = false;
      return;
    }

    const prompt = reviewPrompt(project, date, conversation);

    // Fire-and-forget — must not block the interactive session.
    pi.exec("pi", ["-p", "--no-session", prompt], { timeout: 120_000 })
      .then((result) => {
        reviewInProgress = false;
        if (
          result.code === 0 &&
          result.stdout?.trim() &&
          !result.stdout.toLowerCase().includes("nothing to save")
        ) {
          ctx.ui.notify(
            "💾 Background review complete — saved to praxis memory",
            "info",
          );
        }
      })
      .catch(() => {
        reviewInProgress = false;
      });
  });

  // ── Session auto-flush ───────────────────────────────────────────────────

  pi.on("session_shutdown", async (event, ctx) => {
    // Auto-flush on meaningful exit (quit) or when starting a fresh session (/new).
    // Skip reload (extension hot-reload) and fork/resume (no work finished).
    if (event.reason !== "quit" && event.reason !== "new") return;

    if (userTurnCount < MIN_TURNS_FOR_FLUSH) {
      // Not enough conversation for a useful summary.
      if (contextInjected) {
        ctx.ui.notify(
          "praxis: run /praxis-save to persist this session",
          "info",
        );
      }
      return;
    }

    ctx.ui.notify("praxis: auto-saving session summary…", "info");

    const project = projectFromCwd(ctx.cwd);
    const entries = ctx.sessionManager.getBranch();
    const conversation = extractConversation(entries, 20);
    if (!conversation) return;

    const prompt = sessionFlushPrompt(project, conversation);

    try {
      // Awaited — we need this to complete before the session tears down.
      const result = await pi.exec(
        "pi",
        ["-p", "--no-session", prompt],
        { timeout: 60_000 },
      );
      if (
        result.code === 0 &&
        result.stdout?.trim() &&
        !result.stdout.toLowerCase().includes("nothing to save")
      ) {
        ctx.ui.notify("praxis: session summary saved ✓", "info");
      }
    } catch {
      // Best-effort — do not block shutdown on failure.
    }
  });

  // ── /praxis-recall <query> ───────────────────────────────────────────────

  pi.registerCommand("praxis-recall", {
    description:
      "Query praxis memory and inject results into context (usage: /praxis-recall <query>)",
    handler: async (args, ctx) => {
      const query = args?.trim();
      if (!query) {
        ctx.ui.notify("Usage: /praxis-recall <query>", "error");
        return;
      }

      ctx.ui.notify(`praxis: querying "${query}"…`, "info");

      let result: Awaited<ReturnType<typeof pi.exec>>;
      try {
        result = await pi.exec(
          "praxis",
          ["recall", query, "--top-k", "5"],
          { timeout: 10_000 },
        );
      } catch (err) {
        ctx.ui.notify(`praxis: exec failed — ${String(err)}`, "error");
        return;
      }

      if (result.code !== 0) {
        const msg = result.stderr.trim() || `exit ${result.code}`;
        ctx.ui.notify(`praxis: recall error — ${msg}`, "error");
        return;
      }

      const output = result.stdout.trim();
      if (!output) {
        ctx.ui.notify("praxis: no results found", "info");
        return;
      }

      const lineCount = output.split("\n").filter((l) => l.trim()).length;
      ctx.ui.notify(
        `praxis: got ${lineCount} lines — injecting into context`,
        "info",
      );

      await ctx.waitForIdle();
      pi.sendMessage(
        {
          customType: "praxis-recall",
          content: `Praxis recall results for "${query}":\n\n${output}`,
          display: true,
        },
        { triggerTurn: false },
      );
    },
  });

  // ── /praxis-save [summary] ───────────────────────────────────────────────

  pi.registerCommand("praxis-save", {
    description:
      "Save a session summary to praxis (usage: /praxis-save [summary text])",
    handler: async (args, ctx) => {
      const project = projectFromCwd(ctx.cwd);
      const summary = args?.trim();

      if (summary) {
        ctx.ui.notify("praxis: saving session summary…", "info");
        let result: Awaited<ReturnType<typeof pi.exec>>;
        try {
          result = await pi.exec(
            "praxis",
            ["save-session", "--project", project, summary],
            { timeout: 10_000 },
          );
        } catch (err) {
          ctx.ui.notify(`praxis: exec failed — ${String(err)}`, "error");
          return;
        }

        if (result.code !== 0) {
          const msg = result.stderr.trim() || `exit ${result.code}`;
          ctx.ui.notify(`praxis: save error — ${msg}`, "error");
          return;
        }

        ctx.ui.notify(`praxis: session saved for "${project}"`, "info");
      } else {
        // Ask the LLM to write the summary and call the CLI.
        await ctx.waitForIdle();
        pi.sendUserMessage(
          `Write a 2–4 sentence summary of this session, then run:\n` +
            `\`\`\`\npraxis save-session --project ${project} "<your summary here>"\n\`\`\``,
          { deliverAs: "followUp" },
        );
      }
    },
  });
}
