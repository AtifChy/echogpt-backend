import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import {
  ApiBadRequestDocs,
  ApiConflictDocs,
  ApiNotFoundDocs,
  ApiTooManyRequestsDocs,
  ApiUnauthorizedDocs,
} from "../common/swagger-errors";
import { ChatService } from "./chat.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { SendPromptDto } from "./dto/send-prompt.dto";

const conversationExample = {
  id: 1,
  userId: 1,
  providerId: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const messageExample = {
  id: 2,
  role: "ASSISTANT",
  content: "NestJS is a progressive Node.js framework.",
  inputTokens: 12,
  outputTokens: 18,
  createdAt: "2026-01-01T00:00:01.000Z",
};

@ApiTags("chat")
@ApiBearerAuth()
@ApiUnauthorizedDocs()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post("conversations")
  @ApiOperation({ summary: "Create a conversation" })
  @ApiCreatedResponse({
    description: "Conversation created using the selected or default provider",
    schema: { example: conversationExample },
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("No default provider configured")
  @ApiConflictDocs("Provider is disabled")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.chat.createConversation(user.userId, dto);
  }

  @Get("conversations")
  @ApiOperation({ summary: "List the current user's conversations" })
  @ApiOkResponse({
    description: "Up to 50 most recently updated conversations",
    schema: {
      example: [
        {
          id: conversationExample.id,
          providerId: conversationExample.providerId,
          createdAt: conversationExample.createdAt,
          updatedAt: conversationExample.updatedAt,
        },
      ],
    },
  })
  list(@CurrentUser() user: AuthUser) {
    return this.chat.listConversations(user.userId);
  }

  @Get("conversations/:id/messages")
  @ApiOperation({ summary: "List messages in a conversation" })
  @ApiParam({ name: "id", type: Number, description: "Conversation ID" })
  @ApiOkResponse({
    description: "Conversation messages in chronological order",
    schema: { example: [messageExample] },
  })
  @ApiBadRequestDocs("Conversation ID must be an integer")
  @ApiNotFoundDocs("Conversation not found")
  messages(@CurrentUser() user: AuthUser, @Param("id", ParseIntPipe) id: number) {
    return this.chat.listMessages(user.userId, id);
  }

  @Delete("conversations/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a conversation" })
  @ApiParam({ name: "id", type: Number, description: "Conversation ID" })
  @ApiNoContentResponse({ description: "Conversation and its messages deleted" })
  @ApiBadRequestDocs("Conversation ID must be an integer")
  @ApiNotFoundDocs("Conversation not found")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseIntPipe) id: number) {
    await this.chat.removeConversation(user.userId, id);
  }

  @Post("chat/messages")
  @ApiOperation({ summary: "Send a prompt and persist the AI response" })
  @ApiCreatedResponse({
    description: "Assistant response and optional web citations",
    schema: {
      example: {
        message: messageExample,
        sources: [
          {
            citation: 1,
            title: "NestJS Documentation",
            url: "https://docs.nestjs.com/",
            hostname: "docs.nestjs.com",
            publishedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    },
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("Conversation not found")
  @ApiConflictDocs("Provider is disabled")
  @ApiTooManyRequestsDocs()
  send(@CurrentUser() user: AuthUser, @Body() dto: SendPromptDto) {
    return this.chat.send(user.userId, dto);
  }
}
