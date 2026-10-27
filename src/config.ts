import fs from "node:fs";
import path from "node:path";

export interface PublicConfig { mode: "demo" | "google"; enableWrites: boolean }

export function parseConfig(value: unknown): PublicConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Configuration must be an object.");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !["mode", "enableWrites"].includes(key))) throw new Error("Unknown configuration key.");
  const mode = v.mode ?? "demo";
  if (mode !== "demo" && mode !== "google") throw new Error("Mode must be demo or google.");
  if (v.enableWrites !== undefined && typeof v.enableWrites !== "boolean") throw new Error("enableWrites must be boolean.");
  return { mode, enableWrites: v.enableWrites === true };
}

const file = process.env.GWMCP_CONFIG;
if (file && !path.isAbsolute(file)) throw new Error("GWMCP_CONFIG must be an absolute path to a local JSON file.");
export const config = parseConfig(file ? JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")) : {});
