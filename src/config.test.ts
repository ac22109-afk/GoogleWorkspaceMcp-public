import { describe, it, expect } from "vitest";
import { parseConfig } from "./config.js";

describe("public configuration", () => {
  it("defaults to a read-only demo", () => expect(parseConfig({})).toEqual({ mode: "demo", enableWrites: false }));
  it("does not treat a string as permission to write", () => expect(() => parseConfig({ enableWrites: "false" })).toThrow());
  it("rejects a misspelled mode instead of selecting Google", () => expect(() => parseConfig({ mode: "production" })).toThrow());
  it("rejects unknown keys", () => expect(() => parseConfig({ token: "not-a-token" })).toThrow());
});
