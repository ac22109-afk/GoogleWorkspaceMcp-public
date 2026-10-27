import { describe, expect, it } from "vitest";
import { missingRequiredScopes, parseTokenScopes, REQUIRED_SCOPES } from "./scopes.js";
import { normalizeAlias, tokenPathForAlias } from "./paths.js";
import { readJson } from "./storage.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { encodeRawMessage } from "./gmail.js";

describe("account aliases", () => {
  it("normalizes and validates aliases", () => {
    expect(normalizeAlias(" School_1 ")).toBe("school_1");
    expect(() => normalizeAlias("../bad")).toThrow(/Account alias/);
  });

  it("generates per-account token paths", () => {
    expect(tokenPathForAlias("school")).toMatch(/tokens[\\/]school\.json$/);
  });
});

describe("scope detection", () => {
  it("detects missing scopes", () => {
    expect(missingRequiredScopes([])).toEqual([...REQUIRED_SCOPES]);
    expect(missingRequiredScopes([...REQUIRED_SCOPES])).toEqual([]);
  });

  it("parses token scope strings", () => {
    expect(parseTokenScopes("a b  c")).toEqual(["a", "b", "c"]);
    expect(parseTokenScopes(undefined)).toEqual([]);
  });
});

describe("json storage", () => {
  it("accepts UTF-8 BOM files created by Windows tools", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "google-workspace-mcp-"));
    const file = path.join(dir, "accounts.json");
    await fs.writeFile(file, "\uFEFF{\"ok\":true}", "utf8");
    await expect(readJson<{ ok: boolean }>(file)).resolves.toEqual({ ok: true });
  });
});

describe("Gmail draft encoding", () => {
  it("encodes non-ASCII subjects as RFC 2047 encoded words", () => {
    const raw = encodeRawMessage({
      to: ["to@example.com"],
      subject: "確認",
      body: "body"
    });
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    expect(decoded).toContain("Subject: =?UTF-8?B?");
  });

  it("prevents header injection through subject values", () => {
    const raw = encodeRawMessage({
      to: ["to@example.com"],
      subject: "hello\r\nBcc: injected@example.com",
      body: "body"
    });
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    expect(decoded).toContain("Subject: hello Bcc: injected@example.com");
    expect(decoded).not.toContain("\r\nBcc: injected@example.com");
  });
});
