import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, MinLength } from "class-validator";

export class UpdateProviderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  model?: string;

  @ApiPropertyOptional({ writeOnly: true })
  @IsOptional()
  @IsString()
  @MinLength(10)
  apiKey?: string;
}
