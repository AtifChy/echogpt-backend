import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateConversationDto {
  @ApiPropertyOptional({ description: "Uses default provider if not specified" })
  @IsOptional()
  @IsInt()
  @Min(1)
  providerId?: number;

  @ApiPropertyOptional({
    description: "Conversation title derived from the first prompt",
    minLength: 1,
    maxLength: 60,
    example: "Explain the theory of relativity in simple terms",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value))
  @IsOptional()
  @IsString()
  @Length(1, 60)
  title?: string;
}
