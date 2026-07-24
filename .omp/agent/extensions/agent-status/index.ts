import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { mkdirSync, renameSync, unlinkSync } from "node:fs";

/**
 * Emits precise agent status to a per-pane JSON file under the
 * agent-orchestrator state dir, so the `aorch` daemon can report exact
 * state transitions for OMP sessions instead of falling back to a
 * capture-pane heuristic.
 *
 * No-op entirely when not running inside a tmux pane (TMUX_PANE unset) —
 * the orchestrator only manages tmux panes.
 */

// Tools whose execution requires the user's interactive input right now.
// Kept as a small extensible Set rather than a single literal check.
const INTERACTIVE_TOOLS = new Set(["ask"]);

const HEARTBEAT_INTERVAL_MS = 5000;

interface StatusPayload {
  v: 1;
  pane: string;
  session?: string;
  state: string;
  detail?: string;
  ts: number;
  pid: number;
}

export default function agentStatus(pi: ExtensionAPI): void {
  pi.setLabel("Agent Status");

  const pane = Bun.env.TMUX_PANE;
  if (!pane) {
    // Not inside a tmux pane — the orchestrator has nothing to track here.
    return;
  }

  const stateDir =
    Bun.env.AORCH_STATE_DIR ??
    (Bun.env.XDG_STATE_HOME
      ? `${Bun.env.XDG_STATE_HOME}/agent-orchestrator`
      : `${Bun.env.HOME}/.local/state/agent-orchestrator`);

  const statusDir = `${stateDir}/status`;
  const filePath = `${statusDir}/${pane.replace(/^%/, "")}.json`;

  let statusDirReady = false;
  let heartbeat: unknown;
  let lastState = "idle";
  let lastDetail: string | undefined;

  function logError(message: string, error: unknown): void {
    const text = `${message}: ${error instanceof Error ? error.message : String(error)}`;
    if (pi.logger) {
      pi.logger.error(text);
    } else {
      console.error(text);
    }
  }

  /** Atomically persist the given state/detail. Never throws. */
  function write(state: string, detail?: string): void {
    lastState = state;
    lastDetail = detail;
    try {
      if (!statusDirReady) {
        mkdirSync(statusDir, { recursive: true });
        statusDirReady = true;
      }

      let session: string | undefined;
      try {
        session = pi.getSessionName?.() ?? undefined;
      } catch {
        session = undefined;
      }

      const payload: StatusPayload = {
        v: 1,
        pane,
        ...(session ? { session } : {}),
        state,
        ...(detail ? { detail } : {}),
        ts: Date.now(),
        pid: process.pid,
      };

      const tmpPath = `${filePath}.tmp`;
      Bun.write(tmpPath, JSON.stringify(payload)).then(
        () => {
          try {
            renameSync(tmpPath, filePath);
          } catch (error) {
            logError("agent-status: rename failed", error);
          }
        },
        (error: unknown) => {
          logError("agent-status: write failed", error);
        },
      );
    } catch (error) {
      logError("agent-status: write failed", error);
    }
  }

  /** Best-effort cheap model name for a "working" detail; never throws. */
  function currentModelName(ctx: {
    model?: unknown;
    models?: { current?: () => unknown };
  }): string | undefined {
    try {
      const model = ctx.model ?? ctx.models?.current?.();
      if (!model || typeof model !== "object") {
        return typeof model === "string" ? model : undefined;
      }
      if ("id" in model && typeof model.id === "string") return model.id;
      if ("name" in model && typeof model.name === "string") return model.name;
      return undefined;
    } catch {
      return undefined;
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    write("idle");
    heartbeat = ctx.setInterval(() => {
      write(lastState, lastDetail);
    }, HEARTBEAT_INTERVAL_MS);
  });

  pi.on("turn_start", async (_event, ctx) => {
    write("working", currentModelName(ctx));
  });

  pi.on("agent_start", async (_event, ctx) => {
    write("working", currentModelName(ctx));
  });

  pi.on("before_provider_request", async (_event, ctx) => {
    write("working", currentModelName(ctx));
  });

  pi.on("tool_execution_start", async (event: { toolName?: string }) => {
    const toolName = event.toolName ?? "";
    if (INTERACTIVE_TOOLS.has(toolName)) {
      write("waiting_input", "awaiting your input");
    } else {
      write("working", `tool: ${toolName}`);
    }
  });

  pi.on("tool_approval_requested", async (event: { toolName?: string }) => {
    const toolName = event.toolName ?? "";
    write("waiting_input", `approve ${toolName}`);
  });

  pi.on("tool_approval_resolved", async () => {
    write("working");
  });

  pi.on("tool_execution_end", async () => {
    write("working");
  });

  pi.on("turn_end", async (_event, ctx) => {
    write(ctx.hasPendingMessages() ? "working" : "idle");
  });

  pi.on("agent_end", async (_event, ctx) => {
    write(ctx.hasPendingMessages() ? "working" : "idle");
  });

  pi.on("session_stop", (_event, ctx) => {
    // Notification-only: must not block or return a continuation decision.
    write("idle");
  });

  pi.on("credential_disabled", async () => {
    write("error", "credential disabled");
  });

  pi.on("auto_retry_start", async () => {
    write("working", "retrying");
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    write("exited");
    if (heartbeat !== undefined) {
      ctx.clearTimer(heartbeat);
      heartbeat = undefined;
    }
    try {
      unlinkSync(filePath);
    } catch {
      // ENOENT or similar — nothing to clean up.
    }
  });
}
