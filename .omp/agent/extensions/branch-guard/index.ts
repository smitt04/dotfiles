import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

// Tools that mutate files on disk.
const FILE_MUTATION_TOOLS = new Set([
  "edit",
  "write",
  "ast_edit",
  "apply_patch",
]);

// Branches where direct commits are forbidden.
const PROTECTED_BRANCHES = new Set(["development", "master", "main"]);

// Ticket prefix pattern: uppercase letters followed by digits and a dash.
// e.g. VPN-1234, INFRA-99, JIRA-4200
const TICKET_RE = /^[A-Z]+-\d+/;

interface BranchState {
  branch: string;
  hasTicket: boolean;
  checked: boolean;
}

/** Run `git branch --show-current` in cwd. Returns empty string on failure. */
function currentBranch(cwd: string): string {
  try {
    const proc = Bun.spawnSync(["git", "branch", "--show-current"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (proc.exitCode !== 0) return "";
    return new TextDecoder().decode(proc.stdout).trim();
  } catch {
    return "";
  }
}

export default function branchGuard(pi: ExtensionAPI): void {
  pi.setLabel("Branch Guard");

  const state: BranchState = { branch: "", hasTicket: true, checked: false };

  function refresh(cwd: string): void {
    const branch = currentBranch(cwd);
    if (!branch) {
      // Not a git repo or git unavailable — don't block.
      state.branch = "";
      state.hasTicket = true;
      state.checked = true;
      return;
    }
    state.branch = branch;
    state.hasTicket = TICKET_RE.test(branch);
    state.checked = true;
  }

  pi.on("session_start", async (_event, ctx) => {
    refresh(ctx.cwd);

    if (!state.checked) return;

    if (PROTECTED_BRANCHES.has(state.branch)) {
      ctx.ui.notify(
        `⚠️  On protected branch "${state.branch}" — create a feature branch before editing files.`,
        "warning",
      );
    } else if (state.branch && !state.hasTicket) {
      ctx.ui.notify(
        `⚠️  Branch "${state.branch}" has no ticket prefix — ensure a ticket exists before editing files.`,
        "warning",
      );
    }
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!FILE_MUTATION_TOOLS.has(event.toolName)) return;

    // Re-check on every call in case the user switched branches mid-session.
    refresh(ctx.cwd);

    if (!state.checked) return;

    if (PROTECTED_BRANCHES.has(state.branch)) {
      return {
        block: true,
        reason:
          `Blocked: currently on protected branch "${state.branch}". ` +
          `Create a feature branch (e.g. VPN-XXXX-<desc>) and switch to it before editing files.`,
      };
    }

    if (state.branch && !state.hasTicket) {
      return {
        block: true,
        reason:
          `Blocked: branch "${state.branch}" has no ticket prefix. ` +
          `Create a Jira ticket, then branch as VPN-XXXX-<desc> before editing files.`,
      };
    }
  });
}
