/**
 * ask_user_question — Structured clarifying questions for the model
 *
 * Single question:    simple options list, no tab bar
 * Multiple questions: tabbed interface + submit/review tab
 *
 * Features
 * ─────────
 * • Multi-select     Space / Enter to toggle checkboxes; "Next →" sentinel to advance
 * • Preview pane     Optional per-option preview text (side-by-side ≥90 col, stacked below on narrow)
 * • Per-option notes Press n on any highlighted option to attach a free-text note
 * • Free-form        "Type something." fallback on single-select questions
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	Editor,
	type EditorTheme,
	Key,
	matchesKey,
	Text,
	truncateToWidth,
	visibleWidth,
} from "@earendil-works/pi-tui";
import { Type } from "typebox";

// ─── Domain types ─────────────────────────────────────────────────────────────

interface QuestionOption {
	label: string;
	description?: string;
	preview?: string;
}

interface Question {
	question: string;
	header: string;
	options: QuestionOption[];
	multiSelect?: boolean;
}

type DisplayOpt = QuestionOption & { isOther?: true; isNext?: true };

interface AnswerResult {
	questionIndex: number;
	question: string;
	kind: "option" | "custom" | "multi";
	answer: string | null;
	selected?: string[];
	notes?: string;
	preview?: string;
}

interface ToolResult {
	answers: AnswerResult[];
	cancelled: boolean;
	error?: "no_ui" | "no_questions" | "too_many_questions";
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const OptionSchema = Type.Object({
	label: Type.String({ description: "Short label for the option (1-5 words, max 60 chars)" }),
	description: Type.String({ description: "Explains the choice and its trade-off" }),
	preview: Type.Optional(
		Type.String({ description: "Optional text shown beside options as a preview (plain text or code snippet)" }),
	),
});

const QuestionSchema = Type.Object({
	question: Type.String({ description: "Full question text, should end with '?'" }),
	header: Type.String({ description: "Short tab label, max 16 chars, e.g. 'Scope', 'Priority'" }),
	options: Type.Array(OptionSchema, { description: "2-4 options for the user", minItems: 2, maxItems: 4 }),
	multiSelect: Type.Optional(
		Type.Boolean({ description: "Allow selecting multiple options. Default: false." }),
	),
});

const Params = Type.Object({
	questions: Type.Array(QuestionSchema, {
		description: "One or more structured questions to ask the user",
		minItems: 1,
		maxItems: 4,
	}),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errResult(
	message: string,
	error?: ToolResult["error"],
): { content: { type: "text"; text: string }[]; details: ToolResult; isError: boolean } {
	return {
		content: [{ type: "text", text: message }],
		details: { answers: [], cancelled: true, error },
		isError: true,
	};
}

/** Pad a string (may contain ANSI codes) to exactly `width` visible characters. */
function padToWidth(s: string, width: number): string {
	const pad = width - visibleWidth(s);
	return pad > 0 ? s + " ".repeat(pad) : s;
}

/** Wrap plain text to `width` columns; returns one string per wrapped line. */
function wrapPlain(text: string, width: number): string[] {
	const out: string[] = [];
	for (const raw of text.split("\n")) {
		if (!raw) {
			out.push("");
			continue;
		}
		let remaining = raw;
		while (remaining.length > width) {
			const bp = remaining.lastIndexOf(" ", width);
			if (bp > 0) {
				out.push(remaining.slice(0, bp));
				remaining = remaining.slice(bp + 1);
			} else {
				out.push(remaining.slice(0, width));
				remaining = remaining.slice(width);
			}
		}
		if (remaining) out.push(remaining);
	}
	return out;
}

// ─── Extension ────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user_question",
		label: "Ask User Question",
		description:
			"Present one or more structured questions to the user with typed options. " +
			"Use this whenever you would otherwise guess — for clarifying requirements, preferences, " +
			"architecture decisions, or confirming a course of action. " +
			"Works equally well for simple yes/no choices and complex multi-question dialogs.",
		promptSnippet: "Ask the user structured clarifying questions instead of guessing",
		promptGuidelines: [
			"Use ask_user_question whenever you are about to make a significant assumption. Ask instead of guessing.",
			"Use ask_user_question for simple single questions too — don't guess when you can ask.",
			"Keep option labels short (1-5 words). Put trade-off detail in description.",
			"Set multiSelect only when genuinely multiple values are valid together (e.g. which features to enable).",
			"Keep header short — it is displayed as a tab chip, max 16 chars.",
		],
		parameters: Params,

		async execute(_id, params, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI) return errResult("Error: UI not available (non-interactive mode)", "no_ui");
			if (!params.questions.length) return errResult("Error: No questions provided", "no_questions");
			if (params.questions.length > 4)
				return errResult("Error: Maximum 4 questions per call", "too_many_questions");

			const questions = params.questions as Question[];
			const isMulti = questions.length > 1;
			const totalTabs = questions.length + 1; // N question tabs + Submit tab

			const toolResult = await ctx.ui.custom<ToolResult>((tui, theme, _kb, done) => {
				// ── UI State ──────────────────────────────────────────────────────

				let currentTab = 0;
				type Mode = "options" | "input" | "note";
				let mode: Mode = "options";
				let cachedLines: string[] | undefined;

				// Per-question cursor positions
				const cursors = new Map<number, number>();
				// Per-question selected option indices
				const selected = new Map<number, Set<number>>();
				// Per-question free-form (custom) answers
				const customs = new Map<number, string>();
				// Per-question, per-option notes  notesMap[qi][optionIndex] = note string
				const notesMap = new Map<number, Map<number, string>>();

				// Shared inline editor for "Type something." and note input
				const edTheme: EditorTheme = {
					borderColor: (s) => theme.fg("accent", s),
					selectList: {
						selectedPrefix: (t) => theme.fg("accent", t),
						selectedText: (t) => theme.fg("accent", t),
						description: (t) => theme.fg("muted", t),
						scrollInfo: (t) => theme.fg("dim", t),
						noMatch: (t) => theme.fg("warning", t),
					},
				};
				const editor = new Editor(tui, edTheme);

				// ── Accessors ─────────────────────────────────────────────────────

				function cursor(): number {
					return cursors.get(currentTab) ?? 0;
				}
				function setCursor(n: number) {
					cursors.set(currentTab, n);
				}

				function getSelected(qi: number): Set<number> {
					if (!selected.has(qi)) selected.set(qi, new Set());
					return selected.get(qi)!;
				}

				function getNotes(qi: number): Map<number, string> {
					if (!notesMap.has(qi)) notesMap.set(qi, new Map());
					return notesMap.get(qi)!;
				}

				function isAnswered(qi: number): boolean {
					if (customs.has(qi)) return true;
					const sel = selected.get(qi);
					return !!sel && sel.size > 0;
				}

				function allAnswered(): boolean {
					return questions.every((_, i) => isAnswered(i));
				}

				function currentQ(): Question | undefined {
					return questions[currentTab];
				}

				/** Build the display option list for a question. */
				function displayOpts(q: Question): DisplayOpt[] {
					if (q.multiSelect) {
						// Multi-select: options + "Next →" sentinel to advance
						return [...q.options, { label: "Next →", description: "Confirm selection and continue", isNext: true }];
					}
					// Single-select: options + free-form fallback
					return [...q.options, { label: "Type something.", isOther: true }];
				}

				// ── Logic ─────────────────────────────────────────────────────────

				function refresh() {
					cachedLines = undefined;
					tui.requestRender();
				}

				function buildResult(): ToolResult {
					const answers: AnswerResult[] = questions.map((q, qi) => {
						const custom = customs.get(qi);
						if (custom !== undefined) {
							return { questionIndex: qi, question: q.question, kind: "custom", answer: custom };
						}
						const sel = getSelected(qi);
						const qNotes = getNotes(qi);

						if (q.multiSelect) {
							const indices = Array.from(sel).sort((a, b) => a - b);
							const labels = indices.map((i) => q.options[i]?.label ?? "");
							const collectedNotes = indices
								.map((i) => qNotes.get(i))
								.filter((n): n is string => !!n)
								.join("; ");
							return {
								questionIndex: qi,
								question: q.question,
								kind: "multi",
								answer: labels.join(", "),
								selected: labels,
								notes: collectedNotes || undefined,
							};
						}

						const idx = Array.from(sel)[0] ?? 0;
						const opt = q.options[idx];
						return {
							questionIndex: qi,
							question: q.question,
							kind: "option",
							answer: opt?.label ?? null,
							notes: qNotes.get(idx),
							preview: opt?.preview,
						};
					});
					return { answers, cancelled: false };
				}

				function advanceAfterAnswer() {
					if (!isMulti) {
						done(buildResult());
						return;
					}
					const next = currentTab + 1;
					currentTab = next <= questions.length ? next : questions.length;
					setCursor(0);
					refresh();
				}

				editor.onSubmit = (value) => {
					const trimmed = value.trim() || "(no response)";
					if (mode === "input") {
						customs.set(currentTab, trimmed);
						mode = "options";
						editor.setText("");
						advanceAfterAnswer();
					} else if (mode === "note") {
						getNotes(currentTab).set(cursor(), trimmed);
						mode = "options";
						editor.setText("");
						refresh();
					}
				};

				// ── Input Handling ────────────────────────────────────────────────

				function handleInput(data: string) {
					// Route to editor in input / note mode
					if (mode === "input" || mode === "note") {
						if (matchesKey(data, Key.escape)) {
							mode = "options";
							editor.setText("");
							refresh();
							return;
						}
						editor.handleInput(data);
						refresh();
						return;
					}

					const q = currentQ();
					const opts = q ? displayOpts(q) : [];

					// Tab / arrow navigation between tabs (multi-question only)
					if (isMulti) {
						if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
							currentTab = (currentTab + 1) % totalTabs;
							refresh();
							return;
						}
						if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
							currentTab = (currentTab - 1 + totalTabs) % totalTabs;
							refresh();
							return;
						}
					}

					// Submit tab controls
					if (currentTab === questions.length) {
						if (matchesKey(data, Key.enter) && allAnswered()) {
							done(buildResult());
						} else if (matchesKey(data, Key.escape)) {
							done({ answers: [], cancelled: true });
						}
						return;
					}

					if (!q) return;

					// Option cursor navigation
					if (matchesKey(data, Key.up)) {
						setCursor(Math.max(0, cursor() - 1));
						refresh();
						return;
					}
					if (matchesKey(data, Key.down)) {
						setCursor(Math.min(opts.length - 1, cursor() + 1));
						refresh();
						return;
					}

					const cur = cursor();
					const opt = opts[cur];
					if (!opt) return;

					// Enter
					if (matchesKey(data, Key.enter)) {
						if (opt.isOther) {
							mode = "input";
							editor.setText("");
							refresh();
							return;
						}
						if (opt.isNext) {
							if (getSelected(currentTab).size > 0) advanceAfterAnswer();
							return;
						}
						if (q.multiSelect) {
							const sel = getSelected(currentTab);
							if (sel.has(cur)) sel.delete(cur);
							else sel.add(cur);
							refresh();
							return;
						}
						// Single-select: pick and advance
						getSelected(currentTab).clear();
						getSelected(currentTab).add(cur);
						customs.delete(currentTab);
						advanceAfterAnswer();
						return;
					}

					// Space — toggle in multi-select, or trigger Other/Next in single
					if (matchesKey(data, Key.space)) {
						if (opt.isOther) {
							mode = "input";
							editor.setText("");
							refresh();
							return;
						}
						if (opt.isNext) {
							if (getSelected(currentTab).size > 0) advanceAfterAnswer();
							return;
						}
						if (q.multiSelect) {
							const sel = getSelected(currentTab);
							if (sel.has(cur)) sel.delete(cur);
							else sel.add(cur);
							refresh();
							return;
						}
					}

					// n — open note editor for the highlighted option
					if (data === "n" && !opt.isOther && !opt.isNext) {
						const existing = getNotes(currentTab).get(cur) ?? "";
						mode = "note";
						editor.setText(existing);
						refresh();
						return;
					}

					if (matchesKey(data, Key.escape)) {
						done({ answers: [], cancelled: true });
					}
				}

				// ── Render ────────────────────────────────────────────────────────

				/**
				 * Render the option rows for question `qi` into `width` columns.
				 * Used both for the live options view and as a reference while in input/note mode.
				 */
				function renderOptionRows(qi: number, q: Question, opts: DisplayOpt[], cur: number, width: number): string[] {
					const lines: string[] = [];
					const sel = getSelected(qi);
					const qNotes = getNotes(qi);

					for (let i = 0; i < opts.length; i++) {
						const opt = opts[i];
						const isCur = i === cur;
						const isSel = sel.has(i);
						const isOther = opt.isOther === true;
						const isNext = opt.isNext === true;
						const hasNote = qNotes.has(i) && !isOther && !isNext;

						let prefix: string;
						if (q.multiSelect && !isOther && !isNext) {
							const box = isSel ? theme.fg("success", "[✓]") : theme.fg("dim", "[ ]");
							const arrow = isCur ? theme.fg("accent", ">") : " ";
							prefix = `${arrow} ${box} `;
						} else {
							prefix = isCur ? theme.fg("accent", "> ") : "  ";
						}

						const labelColor: Parameters<typeof theme.fg>[0] = isCur
							? "accent"
							: isSel
								? "success"
								: isNext
									? "muted"
									: "text";

						const noteIcon = hasNote ? theme.fg("dim", " ✎") : "";
						const inputActive = mode === "input" && isOther && isCur;
						const label = inputActive
							? theme.fg("accent", "Type something. ✎")
							: theme.fg(labelColor, opt.label) + noteIcon;

						lines.push(truncateToWidth(`${prefix}${label}`, width));

						if (opt.description && !isNext) {
							const indent = q.multiSelect ? "        " : "     ";
							lines.push(truncateToWidth(`${indent}${theme.fg("muted", opt.description)}`, width));
						}

						if (hasNote) {
							const indent = q.multiSelect ? "        " : "     ";
							lines.push(truncateToWidth(`${indent}${theme.fg("dim", `✎ ${qNotes.get(i)}`)}`, width));
						}
					}
					return lines;
				}

				function render(width: number): string[] {
					if (cachedLines) return cachedLines;

					const lines: string[] = [];
					const add = (s: string) => lines.push(truncateToWidth(s, width));

					add(theme.fg("accent", "─".repeat(width)));

					const q = currentQ();
					const isSubmitTab = currentTab === questions.length;

					// ── Tab bar (multi-question only) ───────────────────────────
					if (isMulti) {
						const parts: string[] = ["← "];
						for (let i = 0; i < questions.length; i++) {
							const active = i === currentTab;
							const answered = isAnswered(i);
							const check = answered ? "■" : "□";
							const color: Parameters<typeof theme.fg>[0] = answered ? "success" : "muted";
							const label = ` ${check} ${questions[i].header} `;
							parts.push(
								active ? theme.bg("selectedBg", theme.fg("text", label)) : theme.fg(color, label),
							);
							parts.push(" ");
						}
						const submitLabel = " ✓ Submit ";
						parts.push(
							isSubmitTab
								? theme.bg("selectedBg", theme.fg("text", submitLabel))
								: theme.fg(allAnswered() ? "success" : "dim", submitLabel),
						);
						parts.push(" →");
						add(` ${parts.join("")}`);
						lines.push("");
					}

					// ── Submit tab ───────────────────────────────────────────────
					if (isSubmitTab) {
						add(theme.fg("accent", theme.bold(" Review your answers")));
						lines.push("");
						for (let i = 0; i < questions.length; i++) {
							const qr = questions[i];
							const custom = customs.get(i);
							const sel = selected.get(i);
							if (custom !== undefined) {
								add(`  ${theme.fg("muted", qr.header + ":")} ${theme.fg("text", `(wrote) ${custom}`)}`);
							} else if (sel && sel.size > 0) {
								const labels = Array.from(sel)
									.sort((a, b) => a - b)
									.map((idx) => qr.options[idx]?.label ?? "")
									.join(", ");
								add(`  ${theme.fg("muted", qr.header + ":")} ${theme.fg("text", labels)}`);
							} else {
								add(`  ${theme.fg("muted", qr.header + ":")} ${theme.fg("warning", "(unanswered)")}`);
							}
						}
						lines.push("");
						if (allAnswered()) {
							add(theme.fg("success", " Press Enter to submit"));
						} else {
							const missing = questions
								.filter((_, i) => !isAnswered(i))
								.map((qr) => qr.header)
								.join(", ");
							add(theme.fg("warning", ` Still unanswered: ${missing}`));
						}
						lines.push("");
						add(theme.fg("dim", " Enter to submit  •  Tab / ←→ go back  •  Esc cancel"));
						add(theme.fg("accent", "─".repeat(width)));
						cachedLines = lines;
						return lines;
					}

					if (!q) {
						cachedLines = lines;
						return lines;
					}

					// ── Question prompt ──────────────────────────────────────────
					add(theme.fg("text", ` ${q.question}`));
					lines.push("");

					const opts = displayOpts(q);
					const cur = cursor();
					const hovered = opts[cur];
					const hasPreview = !hovered?.isOther && !hovered?.isNext && !!hovered?.preview;

					// ── Input / note mode ────────────────────────────────────────
					if (mode === "input" || mode === "note") {
						const edLabel = mode === "note" ? " Add a note:" : " Your answer:";
						for (const l of renderOptionRows(currentTab, q, opts, cur, width)) lines.push(l);
						lines.push("");
						add(theme.fg("muted", edLabel));
						for (const line of editor.render(width - 2)) add(` ${line}`);
						lines.push("");
						add(theme.fg("dim", " Enter to submit  •  Esc to go back"));
						add(theme.fg("accent", "─".repeat(width)));
						cachedLines = lines;
						return lines;
					}

					// ── Options (with optional preview pane) ─────────────────────
					const SIDE_BY_SIDE_MIN = 90;
					const sideBySide = hasPreview && width >= SIDE_BY_SIDE_MIN;

					if (sideBySide && hovered?.preview) {
						const leftWidth = Math.floor(width * 0.48);
						const rightWidth = width - leftWidth - 3; // 3 = " │ "
						const optLines = renderOptionRows(currentTab, q, opts, cur, leftWidth);
						const previewLines = wrapPlain(hovered.preview, rightWidth);
						const maxH = Math.max(optLines.length, previewLines.length);
						const div = theme.fg("borderMuted", "│");

						for (let i = 0; i < maxH; i++) {
							const left = padToWidth(optLines[i] ?? "", leftWidth);
							const right = previewLines[i] ? theme.fg("muted", previewLines[i]) : "";
							lines.push(truncateToWidth(`${left} ${div} ${right}`, width));
						}
					} else {
						for (const l of renderOptionRows(currentTab, q, opts, cur, width)) lines.push(l);

						if (hasPreview && hovered?.preview) {
							lines.push("");
							add(theme.fg("borderMuted", "─".repeat(Math.min(40, width))));
							for (const l of wrapPlain(hovered.preview, width - 2)) {
								add(theme.fg("muted", `  ${l}`));
							}
						}
					}

					// ── Help line ────────────────────────────────────────────────
					lines.push("");
					const nHint = !hovered?.isOther && !hovered?.isNext ? "  •  n note" : "";
					if (q.multiSelect) {
						add(
							theme.fg(
								"dim",
								isMulti
									? ` Space/Enter toggle  •  Tab/←→ switch tab  •  ↑↓ navigate${nHint}  •  Esc cancel`
									: ` Space/Enter toggle  •  ↑↓ navigate${nHint}  •  Esc cancel`,
							),
						);
					} else {
						add(
							theme.fg(
								"dim",
								isMulti
									? ` ↑↓ navigate  •  Enter select  •  Tab/←→ switch tab${nHint}  •  Esc cancel`
									: ` ↑↓ navigate  •  Enter select${nHint}  •  Esc cancel`,
							),
						);
					}

					add(theme.fg("accent", "─".repeat(width)));
					cachedLines = lines;
					return lines;
				}

				return {
					render,
					invalidate: () => {
						cachedLines = undefined;
					},
					handleInput,
				};
			});

			if (toolResult.cancelled) {
				return {
					content: [{ type: "text", text: "User cancelled" }],
					details: toolResult,
				};
			}

			const summary = toolResult.answers
				.map((a) => {
					const hdr = questions[a.questionIndex]?.header ?? `Q${a.questionIndex + 1}`;
					const prefix = a.kind === "custom" ? "(wrote)" : a.kind === "multi" ? "(multi)" : "selected";
					const note = a.notes ? ` [note: ${a.notes}]` : "";
					return `${hdr}: ${prefix}: ${a.answer ?? "–"}${note}`;
				})
				.join("\n");

			return {
				content: [{ type: "text", text: summary }],
				details: toolResult,
			};
		},

		renderCall(args, theme) {
			const qs = (args.questions as Question[]) ?? [];
			const count = qs.length;
			const headers = qs
				.map((q) => q.header)
				.filter(Boolean)
				.join(", ");
			const text =
				theme.fg("toolTitle", theme.bold("ask_user_question ")) +
				theme.fg("muted", `${count} question${count !== 1 ? "s" : ""}`) +
				(headers ? theme.fg("dim", ` (${truncateToWidth(headers, 50)})`) : "");
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as ToolResult | undefined;
			if (!details || details.cancelled) {
				return new Text(theme.fg("warning", "Cancelled"), 0, 0);
			}
			if (details.error) {
				return new Text(theme.fg("error", details.error), 0, 0);
			}
			const lines = details.answers.map((a) => {
				const icon = theme.fg("success", "✓ ");
				const hdr = theme.fg("accent", `Q${a.questionIndex + 1}`);
				const val =
					a.kind === "custom" ? theme.fg("muted", "(wrote) ") + (a.answer ?? "") : a.answer ?? "–";
				const note = a.notes ? theme.fg("dim", ` ✎ ${a.notes}`) : "";
				return `${icon}${hdr}: ${val}${note}`;
			});
			return new Text(lines.join("\n"), 0, 0);
		},
	});
}
