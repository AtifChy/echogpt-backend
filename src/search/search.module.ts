import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { BraveLlmContextClient } from "./brave-llm-context.client";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [AuthModule, SubscriptionsModule],
  controllers: [SearchController],
  providers: [SearchService, BraveLlmContextClient],
  exports: [SearchService],
})
export class SearchModule {}
