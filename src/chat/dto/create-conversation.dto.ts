import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class CreateConversationDto {
  @ApiPropertyOptional({ description: "Uses default provider if not specified" })
  @IsOptional()
  @IsInt()
  @Min(1)
  providerId?: number;
}
