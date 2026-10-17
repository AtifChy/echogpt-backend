import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import {
  ApiBadGatewayDocs,
  ApiBadRequestDocs,
  ApiTooManyRequestsDocs,
  ApiUnauthorizedDocs,
} from "../common/swagger-errors";
import { SearchContextDto } from "./dto/search-context.dto";
import {
  SearchHistoryResponseDto,
  SearchResponseDto,
  SuggestionsResponseDto,
} from "./dto/search-response.dto";
import { SuggestionQueryDto } from "./dto/suggestions-query.dto";
import { SearchService } from "./search.service";

@ApiTags("search")
@ApiBearerAuth()
@ApiUnauthorizedDocs()
@UseGuards(JwtAuthGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: "Search the web and retrieve context for a query" })
  @ZodResponse({
    status: 200,
    type: SearchResponseDto,
    description: "Search context and citations retrieved",
  })
  @ApiBadRequestDocs()
  @ApiTooManyRequestsDocs()
  @ApiBadGatewayDocs("Brave LLM Context is unavailable")
  search(@CurrentUser() user: AuthUser, @Body() dto: SearchContextDto) {
    return this.searchService.search(user.userId, dto);
  }

  @Get("history")
  @ApiOperation({ summary: "Retrieve the user's search history" })
  @ZodResponse({
    status: 200,
    type: SearchHistoryResponseDto,
    description: "Up to 50 searches in reverse chronological order",
  })
  async history(@CurrentUser() user: AuthUser) {
    return this.searchService.history(user.userId);
  }

  @Get("recent")
  @ApiOperation({ summary: "Retrieve the user's recent searches" })
  @ZodResponse({
    status: 200,
    type: SearchHistoryResponseDto,
    description: "Up to 10 recent searches",
  })
  async recent(@CurrentUser() user: AuthUser) {
    return this.searchService.recent(user.userId);
  }

  @Get("suggestions")
  @ApiOperation({ summary: "Retrieve search suggestions based on a query prefix" })
  @ZodResponse({
    status: 200,
    type: SuggestionsResponseDto,
    description: "Up to eight unique suggestions from the user's own history",
  })
  @ApiBadRequestDocs()
  suggestions(@CurrentUser() user: AuthUser, @Query() query: SuggestionQueryDto) {
    return this.searchService.suggestions(user.userId, query.q);
  }

  @Delete("history")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Clear the current user's search history" })
  @ApiNoContentResponse({ description: "Search history cleared" })
  async clear(@CurrentUser() user: AuthUser) {
    await this.searchService.clearHistory(user.userId);
  }
}
