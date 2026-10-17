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
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

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
import {
  ConversationListResponseDto,
  CreateConversationResponseDto,
} from "./dto/conversation-response.dto";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { ChatResponseDto, MessageListResponseDto } from "./dto/message-response.dto";
import { SendPromptDto } from "./dto/send-prompt.dto";

@ApiTags("chat")
@ApiBearerAuth()
@ApiUnauthorizedDocs()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post("conversations")
  @ApiOperation({ summary: "Create a conversation" })
  @ZodResponse({
    status: 201,
    type: CreateConversationResponseDto,
    description: "Conversation created using the selected or default provider",
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("No default provider configured")
  @ApiConflictDocs("Provider is disabled")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.chat.createConversation(user.userId, dto);
  }

  @Get("conversations")
  @ApiOperation({ summary: "List the current user's conversations" })
  @ZodResponse({
    status: 200,
    type: ConversationListResponseDto,
    description: "Up to 50 most recently updated conversations",
  })
  list(@CurrentUser() user: AuthUser) {
    return this.chat.listConversations(user.userId);
  }

  @Get("conversations/:id/messages")
  @ApiOperation({ summary: "List messages in a conversation" })
  @ApiParam({ name: "id", type: Number, description: "Conversation ID" })
  @ZodResponse({
    status: 200,
    type: MessageListResponseDto,
    description: "Conversation messages in chronological order",
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
  @ZodResponse({
    status: 201,
    type: ChatResponseDto,
    description: "Assistant response and optional web citations",
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("Conversation not found")
  @ApiConflictDocs("Provider is disabled")
  @ApiTooManyRequestsDocs()
  send(@CurrentUser() user: AuthUser, @Body() dto: SendPromptDto) {
    return this.chat.send(user.userId, dto);
  }
}
