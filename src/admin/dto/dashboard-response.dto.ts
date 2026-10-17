import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { CountSchema } from "../../common/schemas/primitives.schema";

export const DashboardResponseSchema = z.object({
  users: CountSchema,
  conversations: CountSchema,
  searches: CountSchema,
  requests: CountSchema,
});

export class DashboardResponseDto extends createZodDto(DashboardResponseSchema) {}
