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
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Search the web and retrieve context for a query" })
  @ApiOkResponse({
    description: "Search context and citations retrieved",
    schema: {
      example: {
        searchId: 1,
        query: "NestJS documentation",
        sources: [
          {
            citation: 1,
            title: "NestJS Documentation",
            url: "https://docs.nestjs.com/",
            snippets: ["A progressive Node.js framework."],
            hostname: "docs.nestjs.com",
            siteName: "NestJS",
            publishedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    },
  })
  @ApiBadRequestDocs()
  @ApiTooManyRequestsDocs()
  @ApiBadGatewayDocs("Brave LLM Context is unavailable")
  search(@CurrentUser() user: AuthUser, @Body() dto: SearchContextDto) {
    return this.searchService.search(user.userId, dto);
  }

  @Get("history")
  @ApiOperation({ summary: "Retrieve the user's search history" })
  @ApiOkResponse({
    description: "Up to 50 searches in reverse chronological order",
    schema: {
      example: [{ id: 1, query: "NestJS documentation", createdAt: "2026-01-01T00:00:00.000Z" }],
    },
  })
  history(@CurrentUser() user: AuthUser) {
    return this.searchService.history(user.userId);
  }

  @Get("recent")
  @ApiOperation({ summary: "Retrieve the user's recent searches" })
  @ApiOkResponse({
    description: "Up to 10 recent searches",
    schema: {
      example: [{ id: 1, query: "NestJS documentation", createdAt: "2026-01-01T00:00:00.000Z" }],
    },
  })
  recent(@CurrentUser() user: AuthUser) {
    return this.searchService.recent(user.userId);
  }

  @Get("suggestions")
  @ApiOperation({ summary: "Retrieve search suggestions based on a query prefix" })
  @ApiOkResponse({
    description: "Up to eight unique suggestions from the user's own history",
    schema: { example: ["NestJS documentation", "NestJS authentication"] },
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
