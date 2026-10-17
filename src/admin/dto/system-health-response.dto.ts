import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { CountSchema, TimestampSchema } from "../../common/schemas/primitives.schema";

export const SystemHealthResponseSchema = z.object({
  status: z.literal("ok"),
  database: z.literal("up"),
  databaseLatencyMs: CountSchema,
  uptimeSeconds: CountSchema,
  timestamp: TimestampSchema,
  memory: z.object({
    rss: CountSchema,
    heapTotal: CountSchema,
    heapUsed: CountSchema,
    external: CountSchema,
    arrayBuffers: CountSchema,
  }),
});

export class SystemHealthResponseDto extends createZodDto(SystemHealthResponseSchema) {}
