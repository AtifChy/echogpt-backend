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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import { ChatService } from "./chat.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { SendPromptDto } from "./dto/send-prompt.dto";

@ApiTags("chat")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post("conversations")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.chat.createConversation(user.userId, dto);
  }

  @Get("conversations")
  list(@CurrentUser() user: AuthUser) {
    return this.chat.listConversations(user.userId);
  }

  @Get("conversations/:id/messages")
  messages(@CurrentUser() user: AuthUser, @Param("id", ParseIntPipe) id: number) {
    return this.chat.listMessages(user.userId, id);
  }

  @Delete("conversations/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseIntPipe) id: number) {
    await this.chat.removeConversation(user.userId, id);
  }

  @Post("chat/messages")
  send(@CurrentUser() user: AuthUser, @Body() dto: SendPromptDto) {
    return this.chat.send(user.userId, dto);
  }
}
