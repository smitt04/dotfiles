/**
 * Web Fetch Tool - Fetch a web page and return its readable text content.
 * Strips HTML, decodes entities, and truncates to avoid blowing context window.
 * Note: Does not execute JavaScript — JS-rendered pages may return incomplete content.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

interface FetchDetails {
	url: string;
	status?: number;
	contentType?: string;
	truncated?: boolean;
	error?: string;
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "fetch_page",
		label: "Fetch Page",
		description:
			"Fetch a web page and return its readable text content. Use this to read documentation, articles, package pages, or any public URL. Also handles JSON endpoints.",
		promptSnippet: "Fetch and read a web page or JSON endpoint by URL",
		parameters: Type.Object({
			url: Type.String({ description: "The full URL to fetch (including https://)" }),
		}),

		async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
			try {
				const response = await fetch(params.url, {
					signal,
					headers: {
						"User-Agent": "Mozilla/5.0 (compatible; pi-coding-agent/1.0)",
						Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
					},
				});

				if (!response.ok) {
					return {
						content: [{ type: "text", text: `Error: HTTP ${response.status} ${response.statusText}` }],
						details: {
							url: params.url,
							status: response.status,
							error: response.statusText,
						} as FetchDetails,
						isError: true,
					};
				}

				const contentType = response.headers.get("content-type") ?? "";
				const raw = await response.text();
				let readable: string;

				if (contentType.includes("application/json")) {
					// Pretty-print JSON responses
					try {
						readable = JSON.stringify(JSON.parse(raw), null, 2);
					} catch {
						readable = raw;
					}
				} else if (contentType.includes("text/html") || raw.trimStart().startsWith("<")) {
					readable = htmlToText(raw);
				} else {
					readable = raw;
				}

				// Truncate to avoid blowing the context window
				const MAX_CHARS = 50_000;
				const truncated = readable.length > MAX_CHARS;
				if (truncated) {
					readable = readable.slice(0, MAX_CHARS) + `\n\n[... content truncated at ${MAX_CHARS} characters ...]`;
				}

				return {
					content: [{ type: "text", text: readable }],
					details: {
						url: params.url,
						status: response.status,
						contentType,
						truncated,
					} as FetchDetails,
				};
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: `Error fetching page: ${message}` }],
					details: { url: params.url, error: message } as FetchDetails,
					isError: true,
				};
			}
		},
	});
}

function htmlToText(html: string): string {
	// Remove script, style, and noscript blocks entirely
	let text = html
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
		.replace(/<!--[\s\S]*?-->/g, "");

	// Convert block-level elements to newlines for readable structure
	text = text
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(
			/<\/?(p|div|section|article|header|footer|main|nav|aside|h[1-6]|li|tr|blockquote|pre)[^>]*>/gi,
			"\n",
		);

	// Strip all remaining HTML tags
	text = text.replace(/<[^>]+>/g, "");

	// Decode common HTML entities
	text = text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
		.replace(/&[a-z]+;/gi, " ");

	// Normalise whitespace
	text = text
		.replace(/\t/g, " ")
		.replace(/ {2,}/g, " ")
		.replace(/\n[ \t]+/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	return text;
}
