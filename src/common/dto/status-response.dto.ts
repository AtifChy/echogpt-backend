import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { TimestampSchema } from "../schemas/primitives.schema";

export class HealthResponseDto extends createZodDto(
  z.object({ status: z.literal("ok"), timestamp: TimestampSchema }),
) {}
