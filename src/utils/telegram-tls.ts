import dns from "node:dns";
import tls from "node:tls";
import { Telegraf } from "telegraf";

let patched = false;

async function resolveTelegramIp(): Promise<string | undefined> {
  return new Promise((resolve) => {
    dns.resolve4("api.telegram.org", (err, addresses) => {
      if (err || !addresses.length) {
        resolve(undefined);
        return;
      }
      resolve(addresses[0]);
    });
  });
}

function patchTls(ip: string): void {
  if (patched) return;
  patched = true;

  const origConnect = tls.connect;
  tls.connect = function (options: any, ...args: any[]) {
    if (
      typeof options === "object" &&
      typeof options.host === "string" &&
      options.host.endsWith("telegram.org")
    ) {
      options = {
        ...options,
        host: ip,
        servername: "",
        rejectUnauthorized: false,
      };
    }
    return origConnect.call(tls, options, ...args);
  } as typeof tls.connect;
}

/**
 * Tests direct connection to Telegram API.
 * If SNI is blocked, patches TLS to connect via IP.
 * Returns true if patch was applied.
 */
export async function ensureTelegramConnection(token: string): Promise<boolean> {
  try {
    const test = new Telegraf(token);
    await test.telegram.getMe();
    return false;
  } catch {
    const ip = await resolveTelegramIp();
    if (ip) {
      patchTls(ip);
      return true;
    }
    throw new Error("Cannot connect to Telegram API and failed to resolve IP");
  }
}
