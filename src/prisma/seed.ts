import type { AuthUser } from "../common/auth-user.ts";
import { connectDatabase, db } from "./db.ts";

const roles = ["USER", "ADMIN"] as const satisfies AuthUser["role"][];
let pendingSeed: Promise<void> | undefined;

async function runSeed(): Promise<void> {
  await connectDatabase();

  for (const role of roles) {
    await db.orm.public.Role.upsert({
      create: { name: role },
      update: {},
      conflictOn: { name: role },
    });
  }
}

export function seed(): Promise<void> {
  pendingSeed ??= runSeed().catch((error: unknown) => {
    pendingSeed = undefined;
    throw error;
  });
  return pendingSeed;
}
