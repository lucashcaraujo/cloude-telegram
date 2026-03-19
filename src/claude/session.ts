import { query } from "@anthropic-ai/claude-code";
import type { SDKMessage, SDKResultMessage, SDKAssistantMessage, Options } from "@anthropic-ai/claude-code";
import { loadSessions, saveSessions, type ClaudeConfig } from "../config/config.js";

interface ClaudeResponse {
  text: string;
  sessionId: string;
  files: string[];
  cost: number;
  error?: string;
}

const sessionMap = new Map<string, string>();

export function initSessions(): void {
  const saved = loadSessions();
  for (const [chatId, sessionId] of Object.entries(saved)) {
    sessionMap.set(chatId, sessionId);
  }
}

export function clearSession(chatId: string): void {
  sessionMap.delete(chatId);
  persistSessions();
}

function persistSessions(): void {
  const obj: Record<string, string> = {};
  for (const [k, v] of sessionMap) {
    obj[k] = v;
  }
  saveSessions(obj);
}

export async function sendMessage(
  chatId: string,
  message: string,
  config: ClaudeConfig
): Promise<ClaudeResponse> {
  const existingSession = sessionMap.get(chatId);

  const options: Options = {
    cwd: config.workingDirectory,
    allowedTools: config.allowedTools,
    permissionMode: config.permissionMode as Options["permissionMode"],
  };

  if (existingSession) {
    options.resume = existingSession;
  }

  const files: string[] = [];
  let resultText = "";
  let sessionId = existingSession ?? "";
  let cost = 0;

  try {
    const conversation = query({ prompt: message, options });

    for await (const msg of conversation) {
      if (msg.type === "system" && "session_id" in msg) {
        sessionId = msg.session_id as string;
      }

      if (msg.type === "assistant") {
        const assistant = msg as SDKAssistantMessage;
        if (assistant.message?.content) {
          for (const block of assistant.message.content) {
            if ("type" in block && block.type === "tool_use") {
              const input = block.input as Record<string, unknown>;
              if (
                ["Write", "Edit"].includes(block.name) &&
                typeof input.file_path === "string"
              ) {
                files.push(input.file_path);
              }
            }
          }
        }
      }

      if (msg.type === "result") {
        const result = msg as SDKResultMessage;
        if (result.subtype === "success") {
          resultText = (result as Extract<SDKResultMessage, { subtype: "success" }>).result;
          cost = (result as Extract<SDKResultMessage, { subtype: "success" }>).total_cost_usd;
        } else {
          resultText = `Error: ${result.subtype}`;
        }
      }
    }

    sessionMap.set(chatId, sessionId);
    persistSessions();

    return { text: resultText, sessionId, files: [...new Set(files)], cost };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      text: `Error: ${errorMsg}`,
      sessionId,
      files: [],
      cost: 0,
      error: errorMsg,
    };
  }
}
