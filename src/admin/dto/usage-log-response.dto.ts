import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { UsageOperationSchema, UsageStatusSchema } from "../../common/schemas/enums.schema";
import { CountSchema, IdSchema, TimestampSchema } from "../../common/schemas/primitives.schema";

export const UsageLogResponseSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  providerId: IdSchema.nullable(),
  operation: UsageOperationSchema,
  status: UsageStatusSchema,
  inputTokens: CountSchema,
  outputTokens: CountSchema,
  latencyMs: CountSchema,
  createdAt: TimestampSchema,
});

export const RequestLogResponseSchema = UsageLogResponseSchema.omit({
  id: true,
  inputTokens: true,
  outputTokens: true,
}).extend({
  requestId: IdSchema,
});

export class UsageLogResponseDto extends createZodDto(UsageLogResponseSchema) {}

export class RequestLogResponseDto extends createZodDto(RequestLogResponseSchema) {}
export class RequestLogsResponseDto extends createZodDto(z.array(RequestLogResponseSchema)) {}
