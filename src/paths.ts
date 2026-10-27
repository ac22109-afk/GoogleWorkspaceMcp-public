import os from "node:os";
import path from "node:path";

export const DATA_DIR = path.resolve(process.env.GWMCP_DATA_DIR || path.join(os.homedir(), ".google-workspace-mcp-public"));
export const CREDENTIALS_PATH = path.join(DATA_DIR, "credentials.json");
export const ACCOUNTS_PATH = path.join(DATA_DIR, "accounts.json");
export const TOKENS_DIR = path.join(DATA_DIR, "tokens");

export function tokenPathForAlias(account: string): string {
  const normalized = normalizeAlias(account);
  return path.join(TOKENS_DIR, `${normalized}.json`);
}

export function normalizeAlias(account: string): string {
  const normalized = account.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalized)) {
    throw new Error("Account alias must start with a letter or number and contain only a-z, 0-9, _ or -.");
  }
  return normalized;
}
