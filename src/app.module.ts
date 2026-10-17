import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ZodSerializerInterceptor } from "nestjs-zod";

import { AdminModule } from "./admin/admin.module";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { validateEnv } from "./config/env.validation";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma.module";
import { PrismaService } from "./prisma.service";
import { ProvidersModule } from "./providers/providers.module";
import { SearchModule } from "./search/search.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { UserModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    ProvidersModule,
    SubscriptionsModule,
    ChatModule,
    SearchModule,
    AdminModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    PrismaService,
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
