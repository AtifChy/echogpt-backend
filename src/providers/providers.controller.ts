import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
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
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  ApiBadRequestDocs,
  ApiConflictDocs,
  ApiForbiddenDocs,
  ApiNotFoundDocs,
  ApiUnauthorizedDocs,
} from "../common/swagger-errors";
import { CreateProviderDto } from "./dto/create-provider.dto";
import {
  ProviderHealthResponseDto,
  ProvidersResponseDto,
  ProviderResponseDto,
} from "./dto/provider-response.dto";
import { SetEnabledProviderDto } from "./dto/set-enabled-provider.dto";
import { UpdateProviderDto } from "./dto/update-provider.dto";
import { ProvidersService } from "./providers.service";

@ApiTags("admin")
@ApiBearerAuth()
@ApiUnauthorizedDocs()
@ApiForbiddenDocs()
@Roles("ADMIN")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin/providers")
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Post()
  @ApiOperation({ summary: "Add an encrypted AI provider configuration" })
  @ZodResponse({
    status: 201,
    type: ProviderResponseDto,
    description: "Provider created; the API key is never returned",
  })
  @ApiBadRequestDocs()
  create(@Body() dto: CreateProviderDto) {
    return this.providers.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List AI provider configurations" })
  @ZodResponse({
    status: 200,
    type: ProvidersResponseDto,
    description: "Provider list without encrypted key fields",
  })
  list() {
    return this.providers.list();
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an AI provider configuration" })
  @ApiParam({ name: "id", type: Number, description: "Provider ID" })
  @ZodResponse({
    status: 200,
    type: ProviderResponseDto,
    description: "Updated provider without encrypted key fields",
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("Provider not found")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateProviderDto) {
    return this.providers.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an AI provider configuration" })
  @ApiParam({ name: "id", type: Number, description: "Provider ID" })
  @ApiNoContentResponse({ description: "Provider deleted" })
  @ApiNotFoundDocs("Provider not found")
  @ApiConflictDocs("Choose another default provider before deleting this one")
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.providers.remove(id);
  }

  @Patch(":id/enabled")
  @ApiOperation({ summary: "Enable or disable an AI provider" })
  @ApiParam({ name: "id", type: Number, description: "Provider ID" })
  @ZodResponse({
    status: 200,
    type: ProviderResponseDto,
    description: "Provider enabled state updated",
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("Provider not found")
  setEnabled(@Param("id", ParseIntPipe) id: number, @Body() dto: SetEnabledProviderDto) {
    return this.providers.setEnabled(id, dto);
  }

  @Put(":id/default")
  @ApiOperation({ summary: "Select the default AI provider" })
  @ApiParam({ name: "id", type: Number, description: "Provider ID" })
  @ZodResponse({
    status: 200,
    type: ProviderResponseDto,
    description: "Default provider selected",
  })
  @ApiNotFoundDocs("Provider not found")
  @ApiConflictDocs("Provider is disabled")
  setDefault(@Param("id", ParseIntPipe) id: number) {
    return this.providers.setDefault(id);
  }

  @Post(":id/health")
  @ApiOperation({ summary: "Check connectivity to an AI provider" })
  @ApiParam({ name: "id", type: Number, description: "Provider ID" })
  @ZodResponse({
    status: 200,
    type: ProviderHealthResponseDto,
    description: "Provider responded successfully",
  })
  @ApiNotFoundDocs("Provider not found")
  @ApiConflictDocs("Provider is disabled")
  health(@Param("id", ParseIntPipe) id: number) {
    return this.providers.health(id);
  }
}
