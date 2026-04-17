import { HTTP_CLIENT } from "@/features/seo/server/seo-constants";

/**
 * Fetch with a bounded wait. Combines optional caller `signal` with timeout via `AbortSignal.any`.
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = HTTP_CLIENT.defaultTimeoutMs
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const userSignal = init.signal;
  const signal =
    userSignal == null ? timeoutSignal : AbortSignal.any([userSignal, timeoutSignal]);
  return fetch(input, { ...init, signal });
}
