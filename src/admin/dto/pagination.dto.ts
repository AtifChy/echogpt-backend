import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const PositiveQueryInteger = z
  .union([
    z.string().regex(/^[1-9]\d*$/, { error: "Expected a positive integer" }),
    z.int().positive(),
  ])
  .pipe(z.coerce.number<string | number>().pipe(z.int().positive()));

export const PaginationSchema = z.strictObject({
  page: PositiveQueryInteger.default(1),
  limit: PositiveQueryInteger.pipe(z.number().max(100)).default(25),
});

export class PaginationDto extends createZodDto(PaginationSchema) {}
