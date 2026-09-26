import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = app.get(ConfigService).get<number>("PORT", 3000);
  await app.listen(port);
  console.log(`API: http://localhost:${port}/api/v1`);
  console.log(`Swagger: http://localhost:${port}/docs`);
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
