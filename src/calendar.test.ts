import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
vi.mock("./auth.js", () => ({ authorize: async () => ({}) }));
vi.mock("googleapis", () => ({ google: { calendar: () => ({ events: mocks }) } }));
import { calendarEventUpdate } from "./calendar.js";

beforeEach(() => vi.clearAllMocks());
describe("calendar concurrency", () => {
  it("sends the retrieved version as an If-Match condition", async () => {
    mocks.get.mockResolvedValue({ data: { id: "event", etag: '"version-1"' } });
    mocks.update.mockResolvedValue({ data: { id: "event" } });
    await calendarEventUpdate({ account: "demo", eventId: "event", summary: "Revised" });
    expect(mocks.update.mock.calls[0][1]).toEqual({ headers: { "If-Match": '"version-1"' } });
  });
  it("does not fall back to an unconditional write on a conflict", async () => {
    mocks.get.mockResolvedValue({ data: { etag: '"version-1"' } });
    mocks.update.mockRejectedValue(Object.assign(new Error("conflict"), { code: 412 }));
    await expect(calendarEventUpdate({ account: "demo", eventId: "event" })).rejects.toThrow("conflict");
    expect(mocks.update).toHaveBeenCalledOnce();
  });
  it("refuses to update when the version is missing", async () => {
    mocks.get.mockResolvedValue({ data: { id: "event" } });
    await expect(calendarEventUpdate({ account: "demo", eventId: "event" })).rejects.toThrow(/Missing event version/);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
