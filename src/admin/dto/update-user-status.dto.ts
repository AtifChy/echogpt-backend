import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class UpdateUserStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "SUSPENDED"], description: "The new status of the user" })
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";
}
