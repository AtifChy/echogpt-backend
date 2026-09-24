import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaService } from "./prisma.service";

import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { ConfigModule } from "@nestjs/config";
import { envValidationSchmea } from "./config/env.validation";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { HealthModule } from "./health/health.module";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envValidationSchmea,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: 100 }],
    }),
    HealthModule,
  ],
  controllers: [AppController, UsersController],
  providers: [PrismaService, UsersService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
