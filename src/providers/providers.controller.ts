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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { CreateProviderDto } from "./dto/create-provider.dto";
import { SetEnabledProviderDto } from "./dto/set-enabled-provider.dto";
import { UpdateProviderDto } from "./dto/update-provider.dto";
import { ProvidersService } from "./providers.service";

@ApiTags("admin")
@ApiBearerAuth()
@Roles("ADMIN")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin/providers")
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Post()
  create(@Body() dto: CreateProviderDto) {
    return this.providers.create(dto);
  }

  @Get()
  list() {
    return this.providers.list();
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateProviderDto) {
    return this.providers.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.providers.remove(id);
  }

  @Patch(":id/enabled")
  setEnabled(@Param("id", ParseIntPipe) id: number, @Body() dto: SetEnabledProviderDto) {
    return this.providers.setEnabled(id, dto);
  }

  @Put(":id/default")
  setDefault(@Param("id", ParseIntPipe) id: number) {
    return this.providers.setDefault(id);
  }

  @Post(":id/health")
  @HttpCode(HttpStatus.OK)
  health(@Param("id", ParseIntPipe) id: number) {
    return this.providers.health(id);
  }
}
