/**
 * OMP-style prompt extension for pi.
 *
 * Renders an Oh-My-Posh info bar as a widget ABOVE the editor, with the
 * editor styled exactly like pi-powerline-footer (github.com/nicobailon/pi-powerline-footer):
 *
 *   ◆ Sonnet 4.6 (US)  ❯  main  ──────────────────────────  $0.032  ❯  1.6%/1M  ⠋
 *    ──────────────────────────────────────────────────────────────────────────────
 *    > user input here
 *    ──────────────────────────────────────────────────────────────────────────────
 *
 * Editor render mirrors the reference implementation exactly:
 *  - super.render(width - 3)  with no paddingX change
 *  - top/bottom borders → " " + bc("─".repeat(width - 2))
 *  - first content line  → " > " prefix  (borderColor ">")
 *  - continuation lines  → "   " prefix
 *  - content lines are never truncated/sliced — avoids mangling CURSOR_MARKER
 *  - autocomplete lines after bottom border pass through unchanged
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import {
	CustomEditor,
	type ExtensionAPI,
	type ExtensionContext,
	type KeybindingsManager,
} from "@earendil-works/pi-coding-agent";
import type { Component, EditorTheme, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

// ── Nerd Font glyphs ─────────────────────────────────────────────────────────
const ICON_MODEL = "◆";
const ICON_BRANCH = "\uE0A0"; // nf-pl-branch
const ICON_CTX = "\uF080"; // nf-fa-bar_chart
const SEP = "\uE0B1"; // thin right-pointing powerline separator

// ── ANSI color constants ─────────────────────────────────────────────────────
const RESET = "\x1b[0m";
const GRAY = "\x1b[38;5;244m"; // separator
const PINK = "\x1b[38;2;215;135;175m"; // #d787af — model
const GREEN = "\x1b[38;2;95;175;95m"; // #5faf5f — git branch
const ORANGE = "\x1b[38;2;254;188;56m"; // #febc38 — cost / ctx / spinner
const DIM_WHITE = "\x1b[38;2;200;200;200m"; // session name

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatModelId(id: string): string {
	const regionMatch = id.match(/^(us|eu|ap)\./i);
	const region = regionMatch ? ` (${regionMatch[1]!.toUpperCase()})` : "";
	const bare = id.replace(/^(us|eu|ap)\./i, "").replace(/^anthropic\./, "");
	const m = bare.match(/claude-([a-z]+)-(\d+)-?(\d+)?/i);
	if (m) {
		const family = m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1).toLowerCase();
		const ver = m[3] ? `${m[2]}.${m[3]}` : m[2]!;
		return `${family} ${ver}${region}`;
	}
	return bare
		.split("-")
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join(" ")
		.concat(region);
}

function formatContext(ctx: ExtensionContext): string | null {
	const usage = ctx.getContextUsage();
	const contextWindow =
		(usage as (typeof usage & { contextWindow?: number }) | undefined)?.contextWindow ??
		ctx.model?.contextWindow;
	if (!contextWindow || !usage) return null;
	const percent =
		(usage as (typeof usage & { percent?: number | null }) | undefined)?.percent ??
		(usage.tokens / contextWindow) * 100;
	if (percent === null) return null;
	const maxStr =
		contextWindow >= 1_000_000
			? `${(contextWindow / 1_000_000).toFixed(0)}M`
			: `${(contextWindow / 1_000).toFixed(0)}k`;
	return `${percent.toFixed(1)}%/${maxStr}`;
}

const grayPipe = `${GRAY}${SEP}${RESET}`;

function joinSegments(parts: string[]): string {
	return parts.join(` ${grayPipe} `);
}

class EmptyFooter implements Component {
	render(): string[] {
		return [];
	}
	invalidate(): void {}
}

// ── Extension ────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	let activeTui: TUI | undefined;
	let isWorking = false;
	let spinnerIndex = 0;
	let spinnerTimer: ReturnType<typeof setInterval> | undefined;
	const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

	const stopSpinner = () => {
		if (spinnerTimer) {
			clearInterval(spinnerTimer);
			spinnerTimer = undefined;
		}
	};

	pi.on("agent_start", () => {
		isWorking = true;
		stopSpinner();
		spinnerTimer = setInterval(() => {
			spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
			activeTui?.requestRender();
		}, 80);
		activeTui?.requestRender();
	});

	pi.on("agent_end", () => {
		isWorking = false;
		stopSpinner();
		activeTui?.requestRender();
	});

	pi.on("session_shutdown", () => {
		stopSpinner();
		activeTui = undefined;
	});

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setWorkingVisible(false);
		ctx.ui.setFooter(() => new EmptyFooter());

		let branch: string | undefined;
		const refreshBranch = async () => {
			const result = await pi
				.exec("git", ["branch", "--show-current"], { cwd: ctx.cwd })
				.catch(() => undefined);
			const out = result?.stdout.trim();
			branch = out && out.length > 0 ? out : undefined;
			activeTui?.requestRender();
		};
		void refreshBranch();

		// ── OMP info bar — widget above the editor ───────────────────────────
		ctx.ui.setWidget(
			"omp-top",
			(tui, _theme) => {
				activeTui = tui as TUI;
				return {
					render(width: number): string[] {
						// Left: model + branch
						const modelLabel = formatModelId(ctx.model?.id ?? "");
						const leftParts: string[] = [`${PINK}${ICON_MODEL} ${modelLabel}${RESET}`];
						if (branch) leftParts.push(`${GREEN}${ICON_BRANCH} ${branch}${RESET}`);
						let leftStr = " " + joinSegments(leftParts);

						// Right: session · cost · context · spinner
						let cost = 0;
						for (const e of ctx.sessionManager.getBranch()) {
							if (e.type === "message" && e.message.role === "assistant") {
								cost += (e.message as AssistantMessage).usage.cost.total;
							}
						}
						const rightParts: string[] = [];
						const sessionName = pi.getSessionName();
						if (sessionName) rightParts.push(`${DIM_WHITE}${sessionName}${RESET}`);
						rightParts.push(`${ORANGE}$${cost.toFixed(3)}${RESET}`);
						const ctxStr = formatContext(ctx);
						if (ctxStr) rightParts.push(`${ORANGE}${ICON_CTX} ${ctxStr}${RESET}`);
						if (isWorking) rightParts.push(`${ORANGE}${spinnerFrames[spinnerIndex] ?? "⠋"}${RESET}`);
						let rightStr = joinSegments(rightParts) + " ";

						// Shrink to fit: right side first, then left
						const minGap = 3;
						while (visibleWidth(leftStr) + visibleWidth(rightStr) + minGap > width && visibleWidth(rightStr) > 0) {
							rightStr = truncateToWidth(rightStr, Math.max(0, visibleWidth(rightStr) - 1), "");
						}
						while (visibleWidth(leftStr) + visibleWidth(rightStr) + minGap > width && visibleWidth(leftStr) > 0) {
							leftStr = truncateToWidth(leftStr, Math.max(0, visibleWidth(leftStr) - 1), "");
						}

						const fillW = Math.max(0, width - visibleWidth(leftStr) - visibleWidth(rightStr));
						return [leftStr + " ".repeat(fillW) + rightStr];
					},
					invalidate() {},
				};
			},
			{ placement: "aboveEditor" },
		);

		// ── Custom editor — mirrors pi-powerline-footer render exactly ───────
		//
		// Key: call super.render(width - 3) with no paddingX change.
		// Never truncate/slice content lines — that would mangle CURSOR_MARKER
		// ("\x1b_pi:c\x07") causing "pi:c" to appear as visible text.
		// Just prepend a 3-char prefix and let the TUI handle CURSOR_MARKER.
		class OmpEditor extends CustomEditor {
			constructor(tui: TUI, theme: EditorTheme, kb: KeybindingsManager) {
				super(tui, theme, kb);
				activeTui = tui;
			}

			render(width: number): string[] {
				if (width < 10) return super.render(width);

				const bc = (s: string) => this.borderColor(s);
				// " > " prompt: borderColor ">" with spaces — 3 visible chars
				const promptPrefix = ` ${bc(">")} `;
				const contPrefix = "   ";
				const contentWidth = Math.max(1, width - 3);
				const lines = super.render(contentWidth);

				if (lines.length === 0) return lines;

				// Find bottom border: scan backwards for a line starting with ─{3,}
				// (strip only CSI color codes, same as the reference implementation)
				let bottomBorderIndex = lines.length - 1;
				for (let i = lines.length - 1; i >= 1; i--) {
					const stripped = (lines[i] ?? "").replace(/\x1b\[[0-9;]*m/g, "");
					if (stripped.length > 0 && /^─{3,}/.test(stripped)) {
						bottomBorderIndex = i;
						break;
					}
				}

				const result: string[] = [];

				// Top border: 1 space + (width-2) dashes
				result.push(" " + bc("─".repeat(width - 2)));

				// Content lines with prompt prefix — never modified, just prefixed
				for (let i = 1; i < bottomBorderIndex; i++) {
					const prefix = i === 1 ? promptPrefix : contPrefix;
					result.push(`${prefix}${lines[i] ?? ""}`);
				}

				// Edge case: empty editor where top border is immediately followed by bottom
				if (bottomBorderIndex === 1) {
					result.push(`${promptPrefix}${" ".repeat(contentWidth)}`);
				}

				// Bottom border: same as top
				result.push(" " + bc("─".repeat(width - 2)));

				// Autocomplete lines after bottom border: pass through unchanged
				for (let i = bottomBorderIndex + 1; i < lines.length; i++) {
					result.push(lines[i] ?? "");
				}

				return result;
			}
		}

		ctx.ui.setEditorComponent((tui, theme, kb) => new OmpEditor(tui, theme, kb));
	});

	pi.on("model_select", () => activeTui?.requestRender());
}
