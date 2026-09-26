import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

function errorExample(statusCode: number, message: string, error: string) {
  return { statusCode, message, error };
}

export function ApiBadRequestDocs(message = "Request validation failed") {
  return ApiBadRequestResponse({
    description: message,
    schema: { example: errorExample(400, message, "Bad Request") },
  });
}

export function ApiUnauthorizedDocs(message = "A valid access token is required") {
  return ApiUnauthorizedResponse({
    description: message,
    schema: { example: errorExample(401, message, "Unauthorized") },
  });
}

export function ApiForbiddenDocs(message = "Administrator access is required") {
  return ApiForbiddenResponse({
    description: message,
    schema: { example: errorExample(403, message, "Forbidden") },
  });
}

export function ApiNotFoundDocs(message: string) {
  return ApiNotFoundResponse({
    description: message,
    schema: { example: errorExample(404, message, "Not Found") },
  });
}

export function ApiConflictDocs(message: string) {
  return ApiConflictResponse({
    description: message,
    schema: { example: errorExample(409, message, "Conflict") },
  });
}

export function ApiTooManyRequestsDocs(message = "Request limit reached") {
  return ApiTooManyRequestsResponse({
    description: message,
    schema: { example: errorExample(429, message, "Too Many Requests") },
  });
}

export function ApiBadGatewayDocs(message: string) {
  return ApiBadGatewayResponse({
    description: message,
    schema: { example: errorExample(502, message, "Bad Gateway") },
  });
}
