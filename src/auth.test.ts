import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: vi.fn(), authenticate: vi.fn(), write: vi.fn(),
  resolve: vi.fn(), read: vi.fn()
}));
vi.mock("@google-cloud/local-auth", () => ({ authenticate: mocks.authenticate }));
vi.mock("googleapis", () => ({ google: {
  gmail: () => ({ users: { getProfile: mocks.profile } }),
  auth: { OAuth2: class { setCredentials() {} } }
} }));
vi.mock("./storage.js", () => ({
  resolveAccount: mocks.resolve, credentialsAvailable: async () => true,
  ensureDataDirs: async () => {}, pathExists: async () => true,
  readJson: mocks.read, writeJson: mocks.write
}));
import { startOAuth, authorize } from "./auth.js";
import { REQUIRED_SCOPES } from "./scopes.js";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolve.mockResolvedValue({ alias: "school", email: "school@example.com" });
  mocks.authenticate.mockResolvedValue({ credentials: { scope: REQUIRED_SCOPES.join(" "), refresh_token: "synthetic" } });
  mocks.read.mockImplementation(async (p: string) => p.endsWith("credentials.json") ?
    { installed: { client_id: "synthetic", client_secret: "synthetic" } } : { scope: REQUIRED_SCOPES.join(" ") });
});

describe("account identity", () => {
  it("rejects the wrong Google account without overwriting a saved token", async () => {
    mocks.profile.mockResolvedValue({ data: { emailAddress: "other@example.com" } });
    await expect(startOAuth("school")).rejects.toThrow(/does not match/);
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("saves a token only after the returned account matches", async () => {
    mocks.profile.mockResolvedValue({ data: { emailAddress: "SCHOOL@example.com" } });
    await startOAuth("school");
    expect(mocks.write).toHaveBeenCalledOnce();
  });
  it("checks existing tokens before permitting API operations", async () => {
    mocks.profile.mockResolvedValue({ data: { emailAddress: "other@example.com" } });
    await expect(authorize("school")).rejects.toThrow(/does not match/);
  });
});
