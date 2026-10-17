import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { UserStatusSchema } from "../../common/schemas/enums.schema";

export const UpdateUserStatusSchema = z.strictObject({
  status: UserStatusSchema.meta({ description: "The new status of the user" }),
});

export class UpdateUserStatusDto extends createZodDto(UpdateUserStatusSchema) {}
