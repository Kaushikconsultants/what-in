import { NextResponse } from "next/server";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// In-memory sliding window rate limiter
const rateLimitMap = new Map<string, RateLimitBucket>();

// Periodic garbage collection every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateLimitMap.entries()) {
      if (bucket.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;       // Unix timestamp in seconds
  retryAfter: number;  // Seconds until window reset
}

/**
 * Checks rate limit for a given identifier (e.g. apiKeyId, clientId, or client IP).
 * Default: 120 requests per 60-second window.
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 120,
  windowSeconds: number = 60
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  let bucket = rateLimitMap.get(identifier);

  if (!bucket || bucket.resetAt <= now) {
    bucket = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitMap.set(identifier, bucket);

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      reset: Math.ceil(bucket.resetAt / 1000),
      retryAfter: 0,
    };
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const resetSeconds = Math.ceil(bucket.resetAt / 1000);
  const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    reset: resetSeconds,
    retryAfter,
  };
}

/**
 * Attaches standard RFC rate limit headers to a NextResponse
 */
export function withRateLimitHeaders(
  response: NextResponse,
  rateInfo: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", rateInfo.limit.toString());
  response.headers.set("X-RateLimit-Remaining", rateInfo.remaining.toString());
  response.headers.set("X-RateLimit-Reset", rateInfo.reset.toString());

  if (!rateInfo.allowed) {
    response.headers.set("Retry-After", rateInfo.retryAfter.toString());
  }

  return response;
}
