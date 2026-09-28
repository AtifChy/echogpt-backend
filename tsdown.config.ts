import { defineConfig } from "tsdown";

const optionalNestDependencies = [
  /^@nestjs\/microservices(?:\/|$)/,
  /^@nestjs\/platform-socket\.io(?:\/|$)/,
  /^@nestjs\/websockets(?:\/|$)/,
  /^class-transformer(?:\/|$)/,
  /^class-validator(?:\/|$)/,
  /^@fastify\/static(?:\/|$)/,
];

export default defineConfig({
  entry: { server: "src/main.ts" },
  platform: "node",
  target: "node22.18",
  format: "esm",
  minify: false,
  sourcemap: false,
  clean: true,
  hash: false,
  outputOptions: { codeSplitting: false },
  deps: {
    onlyBundle: false,
    neverBundle: optionalNestDependencies,
  },
});
