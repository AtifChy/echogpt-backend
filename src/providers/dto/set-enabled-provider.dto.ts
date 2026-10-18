import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const SetEnabledProviderSchema = z.strictObject({
  enabled: z.boolean(),
});

export class SetEnabledProviderDto extends createZodDto(SetEnabledProviderSchema) {}
