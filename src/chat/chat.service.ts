import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ProvidersService } from "../providers/providers.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import type { CreateConversationDto } from "./dto/create-conversation.dto";
import type { SendPromptDto } from "./dto/send-prompt.dto";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProvidersService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async createConversation(userId: number, dto: CreateConversationDto) {
    const providerId = await this.providers.resolveId(dto.providerId);
    return this.prisma.db.orm.public.Conversation.create({
      userId,
      providerId,
    });
  }

  listConversations(userId: number) {
    return this.prisma.db.orm.public.Conversation.where({ userId })
      .select("id", "providerId", "createdAt", "updatedAt")
      .orderBy((conversation) => conversation.updatedAt.desc())
      .limit(50)
      .all();
  }

  async listMessages(userId: number, conversationId: number) {
    await this.requireConversation(userId, conversationId);
    return this.prisma.db.orm.public.Message.where({ conversationId })
      .select("id", "role", "content", "inputTokens", "outputTokens", "createdAt")
      .orderBy((message) => message.createdAt.asc())
      .all();
  }

  async removeConversation(userId: number, conversationId: number) {
    await this.requireConversation(userId, conversationId);
    return this.prisma.db.orm.public.Conversation.where({ id: conversationId }).delete();
  }

  async send(userId: number, dto: SendPromptDto) {
    const conversation = await this.requireConversation(userId, dto.conversationId);
    await this.subscriptions.assertAvailable(userId);
    const prompt = dto.prompt.trim();
    await this.prisma.db.orm.public.Message.create({
      conversationId: conversation.id,
      role: "USER",
      content: prompt,
      inputTokens: 0,
      outputTokens: 0,
    });

    const startedAt = Date.now();
    try {
      const result = await this.providers.generate(conversation.providerId, prompt);
      const message = await this.prisma.db.orm.public.Message.create({
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });
      await this.prisma.db.orm.public.ApiUsageLog.create({
        userId,
        providerId: conversation.providerId,
        operation: "CHAT",
        status: "SUCCESS",
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: Date.now() - startedAt,
      });
      return message;
    } catch (error) {
      await this.prisma.db.orm.public.ApiUsageLog.create({
        userId,
        providerId: conversation.providerId,
        operation: "CHAT",
        status: "SUCCESS",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  private async requireConversation(userId: number, conversationId: number) {
    const conversation = await this.prisma.db.orm.public.Conversation.where({
      id: conversationId,
      userId,
    }).first();
    if (!conversation) throw new NotFoundException("Conversation not found");
    return conversation;
  }
}
