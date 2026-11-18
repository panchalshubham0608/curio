/**
 * Sliding-window in-memory rate limiter for client-side AI & provider cost controls.
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly buckets = new Map<string, number[]>();

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public tryConsume(key: string, nowMs = Date.now()): { allowed: boolean; retryAfterMs: number } {
    const cutoff = nowMs - this.windowMs;
    const timestamps = (this.buckets.get(key) ?? []).filter((ts) => ts > cutoff);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0] ?? nowMs;
      const retryAfterMs = Math.max(0, oldest + this.windowMs - nowMs);
      this.buckets.set(key, timestamps);
      return { allowed: false, retryAfterMs };
    }

    timestamps.push(nowMs);
    this.buckets.set(key, timestamps);
    return { allowed: true, retryAfterMs: 0 };
  }

  public reset(key?: string): void {
    if (key) {
      this.buckets.delete(key);
    } else {
      this.buckets.clear();
    }
  }
}
