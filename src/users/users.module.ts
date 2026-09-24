import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { UsersController } from "./users.controller";
import { UserService } from "./users.service";

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UserService],
})
export class UserModule {}
