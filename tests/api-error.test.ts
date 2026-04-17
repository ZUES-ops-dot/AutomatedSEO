import { describe, expect, it, vi } from "vitest";

import { catchToJsonError } from "@/lib/api-error";

describe("api error formatter", () => {
  it("hides internal error text in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = catchToJsonError(new Error("sensitive stack detail"), "Safe fallback");
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toBe("Safe fallback");
    vi.unstubAllEnvs();
  });
});
