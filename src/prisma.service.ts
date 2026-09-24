import { Injectable } from "@nestjs/common";

import { seed } from "./prisma/seed";
import { db } from "./prisma/users";

@Injectable()
export class PrismaService {
  readonly db = db;

  async onModuleInit() {
    await seed();
  }

  async onModuleDestroy() {
    await this.db.close();
  }
}
