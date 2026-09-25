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
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import { SearchContextDto } from "./dto/search-context.dto";
import { SuggestionQueryDto } from "./dto/suggestions-query.dto";
import { SearchService } from "./search.service";

@ApiTags("search")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: "Search the web and retrieve context for a query" })
  @ApiOkResponse({ description: "Search results retrieved" })
  @ApiBadGatewayResponse({ description: "Brave LLM Context is unavailable" })
  search(@CurrentUser() user: AuthUser, @Body() dto: SearchContextDto) {
    return this.searchService.search(user.userId, dto);
  }

  @Get("history")
  @ApiOperation({ summary: "Retrieve the user's search history" })
  history(@CurrentUser() user: AuthUser) {
    return this.searchService.history(user.userId);
  }

  @Get("recent")
  @ApiOperation({ summary: "Retrieve the user's recent searches" })
  recent(@CurrentUser() user: AuthUser) {
    return this.searchService.recent(user.userId);
  }

  @Get("suggestions")
  @ApiOperation({ summary: "Retrieve search suggestions based on a query prefix" })
  suggestions(@CurrentUser() user: AuthUser, @Query() query: SuggestionQueryDto) {
    return this.searchService.suggestions(user.userId, query.q);
  }

  @Delete("history")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Search history cleared" })
  async clear(@CurrentUser() user: AuthUser) {
    this.searchService.clearHistory(user.userId);
  }
}
