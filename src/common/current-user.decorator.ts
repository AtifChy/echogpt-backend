import { createParamDecorator } from "@nestjs/common";

import type { AuthUser } from "./auth-user";

export const CurrentUser = createParamDecorator((_data, context) => {
  const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
  return request.user;
});
