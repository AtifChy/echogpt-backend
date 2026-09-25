import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class SetEnabledProviderDto {
  @ApiProperty({ example: true, description: "Whether the provider can be used for chat requests" })
  @IsBoolean()
  enabled!: boolean;
}
