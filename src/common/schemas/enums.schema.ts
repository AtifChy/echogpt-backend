import { z } from "zod";

import type { Models } from "../../prisma/contract";
import contractJson from "../../prisma/contract.json" with { type: "json" };

const enums = contractJson.domain.namespaces.public.enum;

function contractEnum<T extends string>(name: keyof typeof enums) {
  const values = enums[name].members.map((member) => member.value);
  if (values.length === 0) throw new Error(`Empty contract enum: ${name}`);
  return z.enum(values as [T, ...T[]]);
}

export const RoleSchema = contractEnum<Models.public_Role["name"]>("RoleName");
export const UserStatusSchema = contractEnum<Models.public_User["status"]>("UserStatus");
export const ProviderTypeSchema = contractEnum<Models.public_AiProvider["type"]>("ProviderType");
export const SubscriptionPlanSchema =
  contractEnum<Models.public_Subscription["plan"]>("SubscriptionPlan");
export const SubscriptionStatusSchema =
  contractEnum<Models.public_Subscription["status"]>("SubscriptionStatus");
export const MessageRoleSchema = contractEnum<Models.public_Message["role"]>("MessageRole");
export const UsageOperationSchema =
  contractEnum<Models.public_ApiUsageLog["operation"]>("ApiUsageOperation");
export const UsageStatusSchema =
  contractEnum<Models.public_ApiUsageLog["status"]>("ApiUsageStatus");
