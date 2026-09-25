import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class SearchContextDto {
  @ApiProperty({ example: "NestJS Docs", maxLength: 400 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(400)
  @Matches(/^(?:\S+(?:\s+|$)){1,50}$/, { message: "Query must contain between 1 and 50 words" })
  query!: string;

  @ApiPropertyOptional({ example: "US", default: "ALL" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  @IsOptional()
  @Matches(/^(?:ALL|[A-Z]{2})$/, {
    message: "Country must be a valid 2 character country code or 'ALL'",
  })
  country?: string;

  @ApiPropertyOptional({ example: "en", default: "en" })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2,}$/, { message: "Language must be a valid 2 or more character language code" })
  searchLang?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number;

  @ApiPropertyOptional({ minimum: 1024, maximum: 8192, default: 4096 })
  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(8192)
  maximumTokens?: number;

  @ApiPropertyOptional({ enum: ["off", "moderate", "strict"], default: "off" })
  @IsOptional()
  @IsIn(["off", "moderate", "strict"])
  safesearch?: "off" | "moderate" | "strict";

  @ApiPropertyOptional({
    example: "pd",
    description:
      "Freshness filter for search results. Options: 'pd' (past day), 'pw' (past week), 'pm' (past month), 'py' (past year), or a custom date range in the format 'YYYY-MM-DDtoYYYY-MM-DD'.",
  })
  @IsOptional()
  @Matches(/^(pd|pw|pm|py|\d{4}-\d{2}-\d{2}to\d{4}-\d{2}-\d{2})$/)
  freshness?: string;
}
