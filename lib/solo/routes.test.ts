import { describe, it, expect, vi, beforeEach } from "vitest";
const context = vi.hoisted(() => vi.fn());
vi.mock("@/lib/friends/http", () => ({
  friendContext: context,
  friendError: (error: Error & { status?: number }) =>
    Response.json({ error: error.message }, { status: error.status || 503 }),
}));
import { POST as start } from "@/app/api/solo/challenge/route";
import { POST as submit } from "@/app/api/solo/runs/route";
describe("solo HTTP boundaries", () => {
  beforeEach(() => {
    context.mockResolvedValue({ db: {}, actor: "fixture" });
  });
  it.each([start, submit])(
    "rejects malformed JSON with 400",
    async (handler) => {
      const response = await handler(
        new Request("http://localhost/api/solo", { method: "POST", body: "{" })
      );
      expect(response.status).toBe(400);
    }
  );
  it.each([start, submit])(
    "requires authentication before processing a run",
    async (handler) => {
      context.mockRejectedValue(
        Object.assign(new Error("Sign in"), { status: 401 })
      );
      const response = await handler(
        new Request("http://localhost/api/solo", { method: "POST", body: "{}" })
      );
      expect(response.status).toBe(401);
    }
  );
});
