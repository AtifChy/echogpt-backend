import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ProvidersModule } from "../providers/providers.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  imports: [AuthModule, ProvidersModule, SubscriptionsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
