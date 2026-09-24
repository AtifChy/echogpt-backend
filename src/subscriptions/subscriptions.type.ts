export const PLAN_LIMITS = {
  FREE: 100,
  PREMIUM: 5_000,
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export interface SubscriptionUsageResponse {
  plan: Plan;
  status: "ACTIVE" | "CANCELED";
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
}
