import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

export class UpdateSubscriptionDto {
  @ApiProperty({ enum: ["FREE", "PREMIUM"] })
  @IsIn(["FREE", "PREMIUM"])
  plan!: "FREE" | "PREMIUM";

  @ApiPropertyOptional({ enum: ["ACTIVE", "CANCELED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "CANCELED"])
  status?: "ACTIVE" | "CANCELED";
}
