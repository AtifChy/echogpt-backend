import "dotenv/config";
import { connectDatabase, db } from "./db";

const packageManager = process.env.npm_config_user_agent?.split("/")[0] ?? "npm";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  throw new Error(`Usage: ${packageManager} run admin:promote --- <email>`);
}

try {
  await connectDatabase();

  const [user, adminRole] = await Promise.all([
    db.orm.public.User.where({ email }).first(),
    db.orm.public.Role.where({ name: "ADMIN" }).first(),
  ]);

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  if (!adminRole) {
    throw new Error(`ADMIN role has not been seeded`);
  }

  if (user.roleId !== adminRole.id) {
    await db.orm.public.User.where({ id: user.id }).update({
      roleId: adminRole.id,
    });

    console.log(`${email} is now an ADMIN`);
  }
} finally {
  await db.close();
}
