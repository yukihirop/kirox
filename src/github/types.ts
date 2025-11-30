export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
}
