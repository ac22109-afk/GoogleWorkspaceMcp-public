import fs from "node:fs/promises";
import path from "node:path";
import { ACCOUNTS_PATH, CREDENTIALS_PATH, DATA_DIR, TOKENS_DIR, normalizeAlias } from "./paths.js";

export interface AccountEntry {
  alias: string;
  email: string;
  displayName?: string;
}

export interface AccountsFile {
  accounts: AccountEntry[];
}

export async function ensureDataDirs(): Promise<void> {
  await fs.mkdir(TOKENS_DIR, { recursive: true });
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as T;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function loadAccounts(): Promise<AccountEntry[]> {
  await ensureDataDirs();
  if (!(await pathExists(ACCOUNTS_PATH))) {
    const initial: AccountsFile = {
      accounts: [{ alias: "school", email: "your.school@example.com", displayName: "School" }]
    };
    await writeJson(ACCOUNTS_PATH, initial);
    return initial.accounts;
  }

  const data = await readJson<AccountsFile>(ACCOUNTS_PATH);
  return (data.accounts ?? []).map((entry) => ({
    ...entry,
    alias: normalizeAlias(entry.alias)
  }));
}

export async function resolveAccount(alias: string): Promise<AccountEntry> {
  const normalized = normalizeAlias(alias);
  const accounts = await loadAccounts();
  const account = accounts.find((entry) => entry.alias === normalized);
  if (!account) {
    throw new Error(`Unknown account alias: ${normalized}. Add it to ${ACCOUNTS_PATH}.`);
  }
  return account;
}

export async function credentialsAvailable(): Promise<boolean> {
  return pathExists(CREDENTIALS_PATH);
}

export function dataPaths() {
  return {
    dataDir: DATA_DIR,
    credentials: CREDENTIALS_PATH,
    accounts: ACCOUNTS_PATH,
    tokensDir: TOKENS_DIR
  };
}
