import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Atif" })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  displayName?: string;
}
