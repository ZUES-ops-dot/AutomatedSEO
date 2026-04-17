import { describe, expect, it, vi } from "vitest";

function fakeRequest(headers: Record<string, string>) {
  return {
    headers: {
      get(key: string) {
        return headers[key.toLowerCase()] ?? null;
      }
    }
  };
}

describe("api authorization", () => {
  it("allows bearer auth when JOB_SECRET is set", async () => {
    vi.resetModules();
    vi.doMock("@/features/seo/server/env", () => ({
      appEnv: { jobSecret: "secret-token" }
    }));
    const auth = await import("@/lib/api-auth");

    const req = fakeRequest({ authorization: "Bearer secret-token" });
    expect(auth.isApiAuthorized(req as never)).toBe(true);
  });

  it("rejects requests in production when secret is missing", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.doMock("@/features/seo/server/env", () => ({
      appEnv: { jobSecret: "" }
    }));
    const auth = await import("@/lib/api-auth");

    const req = fakeRequest({});
    expect(auth.isApiAuthorized(req as never)).toBe(false);
    vi.unstubAllEnvs();
  });
});
