/**
 * mcp-bridge.ts — Pi extension that acts as a full MCP client.
 *
 * Reads ~/.pi/agent/mcp.json, spawns each configured server as a stdio
 * subprocess, negotiates the MCP JSON-RPC handshake, discovers all tools,
 * and registers them with Pi via pi.registerTool(). Any MCP server in the
 * ecosystem just works with Pi once this extension is loaded.
 *
 * MCP spec: https://spec.modelcontextprotocol.io/
 * Transport: newline-delimited JSON-RPC 2.0 over stdio
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type TSchema, type TObject, type TProperties } from "typebox";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

// ── Config types ───────────────────────────────────────────────────────────────

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>;
}

// ── MCP protocol types ─────────────────────────────────────────────────────────

interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
    description?: string;
  };
}

interface McpTextContent {
  type: "text";
  text: string;
}

interface McpImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

interface McpResourceContent {
  type: "resource";
  resource: { uri: string; text?: string; blob?: string; mimeType?: string };
}

type McpContent = McpTextContent | McpImageContent | McpResourceContent;

interface McpCallResult {
  content?: McpContent[];
  isError?: boolean;
}

// ── JSON-RPC client ────────────────────────────────────────────────────────────

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

class McpClient {
  readonly name: string;
  private proc: ChildProcess;
  private buffer = "";
  private pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private dead = false;

  constructor(name: string, config: McpServerConfig) {
    this.name = name;
    this.proc = spawn(config.command, config.args ?? [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...(config.env ?? {}) },
      shell: false,
    });

    this.proc.stdout!.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString("utf8");
      this.drain();
    });

    // Swallow stderr — MCP servers write diagnostic logs there.
    this.proc.stderr!.on("data", () => {});

    this.proc.on("exit", () => {
      this.dead = true;
      for (const [, req] of this.pending) {
        clearTimeout(req.timer);
        req.reject(new Error(`MCP server "${name}" exited unexpectedly`));
      }
      this.pending.clear();
    });

    this.proc.on("error", (err) => {
      this.dead = true;
      for (const [, req] of this.pending) {
        clearTimeout(req.timer);
        req.reject(err);
      }
      this.pending.clear();
    });
  }

  private drain() {
    const lines = this.buffer.split("\n");
    // Keep the incomplete last chunk in the buffer.
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      let msg: {
        id?: number | string;
        result?: unknown;
        error?: { message?: string; code?: number };
      };
      try {
        msg = JSON.parse(line) as typeof msg;
      } catch {
        continue; // Malformed — skip.
      }

      if (msg.id === undefined) continue; // Notification — ignore.

      const id = Number(msg.id);
      const req = this.pending.get(id);
      if (!req) continue;

      clearTimeout(req.timer);
      this.pending.delete(id);

      if (msg.error) {
        req.reject(
          new Error(msg.error.message ?? `RPC error ${msg.error.code ?? "unknown"}`),
        );
      } else {
        req.resolve(msg.result);
      }
    }
  }

  private rpc(method: string, params?: unknown, timeoutMs = 30_000): Promise<unknown> {
    if (this.dead) {
      return Promise.reject(new Error(`MCP server "${this.name}" is not running`));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP timeout on ${this.name}: ${method} (${timeoutMs}ms)`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      this.proc.stdin!.write(msg);
    });
  }

  private notify(method: string, params?: unknown) {
    if (this.dead) return;
    const msg = JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n";
    this.proc.stdin!.write(msg);
  }

  async initialize(): Promise<void> {
    await this.rpc(
      "initialize",
      {
        protocolVersion: "2025-03-26",
        clientInfo: { name: "pi-mcp-bridge", version: "0.1.0" },
        capabilities: { tools: {} },
      },
      10_000,
    );
    this.notify("notifications/initialized");
  }

  async listTools(): Promise<McpTool[]> {
    const result = (await this.rpc("tools/list", {}, 10_000)) as {
      tools?: McpTool[];
    };
    return result?.tools ?? [];
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<McpCallResult> {
    const result = (await this.rpc("tools/call", {
      name: toolName,
      arguments: args,
    })) as McpCallResult | undefined;
    return { content: result?.content ?? [], isError: result?.isError ?? false };
  }

  close() {
    if (this.dead) return;
    this.dead = true;
    try {
      this.proc.stdin!.end();
    } catch {}
    // Give the server a moment to flush, then terminate.
    setTimeout(() => {
      try {
        this.proc.kill("SIGTERM");
      } catch {}
    }, 500);
  }
}

// ── Schema conversion: MCP JSON Schema → TypeBox ───────────────────────────────

/**
 * Convert a MCP JSON Schema object to a TypeBox TSchema.
 * Handles the common property types well enough for the LLM to understand
 * tool parameters. Falls back to Type.Any() for unrecognised constructs.
 */
function toTypebox(schema: unknown): TSchema {
  if (!schema || typeof schema !== "object") return Type.Any();

  const s = schema as Record<string, unknown>;
  const desc = typeof s.description === "string" ? s.description : undefined;
  const opts = desc ? { description: desc } : {};

  // Handle anyOf / oneOf as a loose union — just use Any so the agent isn't blocked.
  if (Array.isArray(s.anyOf) || Array.isArray(s.oneOf)) {
    return Type.Any(opts);
  }

  switch (s.type) {
    case "string":
      return Type.String(opts);
    case "number":
    case "integer":
      return Type.Number(opts);
    case "boolean":
      return Type.Boolean(opts);
    case "null":
      return Type.Null(opts);
    case "array": {
      const items = toTypebox(s.items ?? {});
      return Type.Array(items, opts);
    }
    case "object": {
      const rawProps = s.properties as Record<string, unknown> | undefined;
      const required = Array.isArray(s.required) ? (s.required as string[]) : [];

      if (!rawProps) {
        // No properties declared — open object.
        return Type.Object({} as TProperties, {
          ...opts,
          additionalProperties: true,
        });
      }

      const props: TProperties = {};
      for (const [key, val] of Object.entries(rawProps)) {
        const fieldSchema = toTypebox(val);
        // Wrap non-required fields as Optional.
        props[key] = required.includes(key) ? fieldSchema : Type.Optional(fieldSchema);
      }
      return Type.Object(props, opts);
    }
    default:
      // Unknown type or missing type — use Any.
      return Type.Any(opts);
  }
}

/**
 * Ensure the root schema is always a TObject, as Pi's registerTool expects.
 * MCP inputSchema is always type:object at the root, so this is a safety net.
 */
function toRootObject(schema: unknown): TObject {
  const converted = toTypebox(schema);
  // If conversion produced a TObject, use it directly.
  if (
    converted &&
    typeof converted === "object" &&
    "type" in converted &&
    (converted as Record<string, unknown>).type === "object"
  ) {
    return converted as TObject;
  }
  // Fallback: wrap in a permissive object.
  return Type.Object({} as TProperties, { additionalProperties: true });
}

// ── MCP content → Pi tool result content ──────────────────────────────────────

function mcpContentToText(
  items: McpContent[],
): Array<{ type: "text"; text: string }> {
  if (items.length === 0) return [{ type: "text", text: "(no output)" }];

  return items.map((item) => {
    if (item.type === "text") {
      return { type: "text" as const, text: item.text };
    }
    if (item.type === "image") {
      return {
        type: "text" as const,
        text: `[image/${item.mimeType ?? "unknown"} — ${item.data.length} base64 chars]`,
      };
    }
    // resource
    const res = item.resource;
    return {
      type: "text" as const,
      text: res.text ?? `[resource: ${res.uri}]`,
    };
  });
}

// ── Config loading ─────────────────────────────────────────────────────────────

function loadConfig(): McpConfig {
  const configPath = path.join(os.homedir(), ".pi", "agent", "mcp.json");
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as McpConfig;
  } catch {
    return {};
  }
}

// ── Extension ──────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  /** Live server connections, keyed by server name. */
  const clients = new Map<string, McpClient>();

  /** Tool-name → server-name map, for routing tool calls. */
  const toolRouter = new Map<string, string>();

  /** Whether the MCP info widget has been cleared yet. */
  let widgetCleared = false;

  function clearWidget(ctx: { ui: { setWidget: (id: string, content: undefined) => void } }) {
    if (widgetCleared) return;
    widgetCleared = true;
    ctx.ui.setWidget("mcp-info", undefined);
  }

  async function connectAll(
    notify: (msg: string, level: "info" | "error") => void,
  ) {
    // Tear down any existing connections.
    for (const [, client] of clients) client.close();
    clients.clear();
    toolRouter.clear();

    const config = loadConfig();
    const servers = config.mcpServers ?? {};

    if (Object.keys(servers).length === 0) return;

    let totalTools = 0;

    for (const [serverName, serverConfig] of Object.entries(servers)) {
      try {
        const client = new McpClient(serverName, serverConfig);
        await client.initialize();
        const tools = await client.listTools();

        clients.set(serverName, client);

        for (const tool of tools) {
          if (toolRouter.has(tool.name)) {
            // Name collision: skip and warn. First server wins.
            notify(
              `mcp-bridge: tool name collision "${tool.name}" — kept from "${toolRouter.get(tool.name)}", skipping "${serverName}"`,
              "error",
            );
            continue;
          }

          toolRouter.set(tool.name, serverName);
          totalTools++;

          const parameters = toRootObject(tool.inputSchema);

          pi.registerTool({
            name: tool.name,
            label: tool.name.replace(/_/g, " "),
            description:
              tool.description ??
              `MCP tool from server "${serverName}": ${tool.name}`,
            parameters,
            async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
              const currentClient = clients.get(serverName);
              if (!currentClient) {
                return {
                  content: [
                    {
                      type: "text" as const,
                      text: `MCP server "${serverName}" is not connected`,
                    },
                  ],
                  details: { server: serverName, connected: false },
                  isError: true,
                };
              }

              const result = await currentClient.callTool(
                tool.name,
                params as Record<string, unknown>,
              );

              return {
                content: mcpContentToText(result.content ?? []),
                details: { server: serverName, isError: result.isError ?? false },
                isError: result.isError,
              };
            },
          });
        }
      } catch (err) {
        notify(
          `mcp-bridge: failed to connect to "${serverName}" — ${String(err)}`,
          "error",
        );
        // Continue with remaining servers.
      }
    }

    if (totalTools > 0) {
      // Widget shows server details; this is a fallback for non-interactive mode.
      if (!hasUI) {
        notify(
          `mcp-bridge: ${totalTools} tool(s) from ${clients.size} server(s)`,
          "info",
        );
      }
    }
  }

  /** Whether a UI is available — set by the session_start caller. */
  let hasUI = false;

  pi.on("session_start", async (_event, ctx) => {
    widgetCleared = false;
    hasUI = ctx.hasUI;
    await connectAll((msg, level) => ctx.ui.notify(msg, level));

    if (ctx.hasUI && clients.size > 0) {
      ctx.ui.setWidget("mcp-info", (_tui, theme) => ({
        render(_width: number): string[] {
          const lines: string[] = [theme.fg("accent", "[MCP]")];
          for (const [serverName] of clients) {
            const tools = [...toolRouter.entries()]
              .filter(([, srv]) => srv === serverName)
              .map(([name]) => name);
            lines.push(`  ${serverName} (${tools.join(", ")})`);
          }
          return lines;
        },
        invalidate() {},
      }));
    }
  });

  // Clear the MCP info widget once the agent starts working.
  pi.on("agent_start", (_event, ctx) => {
    clearWidget(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    clearWidget(ctx);
    for (const [, client] of clients) client.close();
    clients.clear();
    toolRouter.clear();
  });
}
