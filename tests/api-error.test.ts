import { describe, expect, it, vi } from "vitest";

import { ApiHttpError, catchToJsonError } from "@/lib/api-error";

describe("api error formatter", () => {
  it("hides internal error text in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = catchToJsonError(new Error("sensitive stack detail"), "Safe fallback");
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toBe("Safe fallback");
    vi.unstubAllEnvs();
  });

  it("maps ApiHttpError to status in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = catchToJsonError(new ApiHttpError("gone", 410), "fallback");
    expect(response.status).toBe(410);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toBe("gone");
    vi.unstubAllEnvs();
  });

  it("maps not-found and invalid messages to 4xx in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const notFound = catchToJsonError(new Error("Opportunity opp-1 not found."), "fallback");
    expect(notFound.status).toBe(404);

    const invalid = catchToJsonError(new Error("Invalid status transition: open → done"), "fallback");
    expect(invalid.status).toBe(400);
    vi.unstubAllEnvs();
  });
});
