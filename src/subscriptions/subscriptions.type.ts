import type { Models } from "../prisma/contract";

type SubscriptionPlan = Models.public_Subscription["plan"];
type SubscriptionStatus = Models.public_Subscription["status"];

export const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  FREE: 100,
  PREMIUM: 5_000,
} as const;

export interface SubscriptionUsageResponse {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
}
