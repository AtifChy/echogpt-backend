import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { ErrorResponseDto } from "./dto/error-response.dto";

export function ApiBadRequestDocs(message = "Request validation failed") {
  return ApiBadRequestResponse({
    description: message,
    type: ErrorResponseDto,
  });
}

export function ApiUnauthorizedDocs(message = "A valid access token is required") {
  return ApiUnauthorizedResponse({
    description: message,
    type: ErrorResponseDto,
  });
}

export function ApiForbiddenDocs(message = "Administrator access is required") {
  return ApiForbiddenResponse({
    description: message,
    type: ErrorResponseDto,
  });
}

export function ApiNotFoundDocs(message: string) {
  return ApiNotFoundResponse({
    description: message,
    type: ErrorResponseDto,
  });
}

export function ApiConflictDocs(message: string) {
  return ApiConflictResponse({
    description: message,
    type: ErrorResponseDto,
  });
}

export function ApiTooManyRequestsDocs(message = "Request limit reached") {
  return ApiTooManyRequestsResponse({
    description: message,
    type: ErrorResponseDto,
  });
}

export function ApiBadGatewayDocs(message: string) {
  return ApiBadGatewayResponse({
    description: message,
    type: ErrorResponseDto,
  });
}
