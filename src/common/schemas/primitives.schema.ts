import { z } from "zod";

export const IdSchema = z.int().positive();
export const CountSchema = z.int().nonnegative();

const IsoTimestampSchema = z.iso.datetime({ offset: true });

// The timestamp-string Prisma contract returns PostgreSQL text, not necessarily ISO.
// Validate both forms without changing the existing wire value or its precision.
export const TimestampSchema = z.union([
  IsoTimestampSchema,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?[+-]\d{2}(?::\d{2})?$/)
    .refine(
      (value) =>
        IsoTimestampSchema.safeParse(value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"))
          .success,
      { error: "Invalid PostgreSQL timestamp" },
    ),
]);
