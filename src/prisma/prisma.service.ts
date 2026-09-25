import { Injectable } from "@nestjs/common";

import { db } from "./db";
import { seed } from "./seed";

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
