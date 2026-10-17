import { type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { cleanupOpenApiDoc } from "nestjs-zod";

import { ZodRequestPipe } from "./common/pipes/zod-request.pipe";

export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  const origins = config
    .getOrThrow<string>("CORS_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.enableCors({ origin: origins, credentials: true });
  app.useGlobalPipes(new ZodRequestPipe());

  const swagger = new DocumentBuilder()
    .setTitle("EchoGPT API")
    .setDescription("Backend API for EchoGPT")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup("docs", app, cleanupOpenApiDoc(document), { jsonDocumentUrl: "docs-json" });
}
