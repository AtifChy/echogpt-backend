import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";

import { db } from "./prisma/db";
import { seed } from "./prisma/seed";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db = db;

  async onModuleInit() {
    await seed();
  }

  async onModuleDestroy() {
    await this.db.close();
  }
}
