import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import type { LlmContextOptions, LlmContextResult } from "./brave-llm-context.client";
import { BraveLlmContextClient } from "./brave-llm-context.client";
import type { SearchContextDto } from "./dto/search-context.dto";

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
    private readonly brave: BraveLlmContextClient,
  ) {}

  async search(userId: number, dto: SearchContextDto) {
    await this.subscriptions.assertAvailable(userId);
    return this.retrieveForUser(userId, dto);
  }

  retrieveForChat(userId: number, query: string) {
    return this.retrieveForUser(userId, { query });
  }

  history(userId: number) {
    return this.prisma.db.orm.public.WebSearch.where({ userId })
      .select("id", "query", "createdAt")
      .orderBy((search) => search.createdAt.desc())
      .limit(50)
      .all();
  }

  recent(userId: number) {
    return this.prisma.db.orm.public.WebSearch.where({ userId })
      .select("id", "query", "createdAt")
      .orderBy((search) => search.createdAt.desc())
      .limit(10)
      .all();
  }

  async suggestions(userId: number, rawPrefix: string) {
    const prefix = rawPrefix.trim().toLowerCase();
    const rows = await this.prisma.db.orm.public.WebSearch.where({ userId })
      .select("query", "normalizedQuery")
      .orderBy((search) => search.createdAt.desc())
      .limit(100)
      .all();

    return [
      ...new Set(
        rows.filter((row) => row.normalizedQuery.startsWith(prefix)).map((row) => row.query),
      ),
    ].slice(0, 8);
  }

  async clearHistory(userId: number) {
    await this.prisma.db.orm.public.WebSearch.where({ userId }).delete();
  }

  private async retrieveForUser(
    userId: number,
    options: LlmContextOptions,
  ): Promise<LlmContextResult & { searchId: number }> {
    const startedAt = Date.now();

    try {
      const context = await this.brave.retrieve(options);
      const search = await this.prisma.db.transaction(async (tx) => {
        const created = await tx.orm.public.WebSearch.create({
          userId,
          query: options.query,
          normalizedQuery: options.query.toLowerCase().replace(/\s+/g, " ").trim(),
        });

        await tx.orm.public.ApiUsageLog.create({
          userId,
          providerId: null,
          operation: "SEARCH",
          status: "SUCCESS",
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - startedAt,
        });

        return created;
      });

      return { ...context, searchId: search.id };
    } catch (error) {
      await this.recordFailure(userId, Date.now() - startedAt);
      throw error;
    }
  }

  private async recordFailure(userId: number, latencyMs: number) {
    try {
      await this.prisma.db.orm.public.ApiUsageLog.create({
        userId,
        providerId: null,
        operation: "SEARCH",
        status: "FAILED",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
      });
    } catch (error) {
      this.logger.error(
        "Failed to record search failure",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
