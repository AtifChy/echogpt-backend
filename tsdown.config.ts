import { isBuiltin } from "node:module";

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
  minify: true,
  sourcemap: false,
  clean: true,
  hash: false,
  outputOptions: { codeSplitting: false },
  deps: {
    onlyBundle: false,
    alwaysBundle: (id) =>
      !isBuiltin(id) && !optionalNestDependencies.some((pattern) => pattern.test(id)),
    neverBundle: optionalNestDependencies,
  },
});
