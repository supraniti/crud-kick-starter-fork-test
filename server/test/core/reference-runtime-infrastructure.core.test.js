import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";

const { defaultsMock } = vi.hoisted(() => ({
  defaultsMock: vi.fn()
}));

vi.mock(
  "../../src/domains/reference/runtime/services/reference-runtime-defaults-domain-service.js",
  () => ({
    resolveReferenceRuntimeDefaults: defaultsMock
  })
);

beforeEach(() => {
  vi.resetModules();
  defaultsMock.mockReset();
});

test("explicit null module runtime state override disables persistence", async () => {
  defaultsMock.mockReturnValue({
    modulesRootDir: path.resolve("modules"),
    moduleIdTranslationMapFile: path.resolve(
      "docs",
      "contracts",
      "artifacts",
      "module-id-alias-map-v1.json"
    ),
    moduleIdTranslationModeDefault: "off",
    moduleRuntimeStateFileDefault: path.resolve(
      "server",
      "runtime",
      "module-runtime",
      "reference-runtime.json"
    )
  });

  const { createRuntimeInfrastructure } = await import(
    "../../src/domains/reference/runtime/services/reference-runtime-infrastructure-domain-service.js"
  );

  const infrastructure = createRuntimeInfrastructure({
    moduleRuntimeStateFile: null
  });

  expect(infrastructure.moduleRuntimeStateStore.enabled).toBe(false);
  expect(infrastructure.moduleRuntimeStateStore.stateFilePath).toBeNull();
});

test("omitted module runtime state override still uses the default file", async () => {
  const defaultStateFilePath = path.resolve(
    "server",
    "runtime",
    "module-runtime",
    "reference-runtime.json"
  );

  defaultsMock.mockReturnValue({
    modulesRootDir: path.resolve("modules"),
    moduleIdTranslationMapFile: path.resolve(
      "docs",
      "contracts",
      "artifacts",
      "module-id-alias-map-v1.json"
    ),
    moduleIdTranslationModeDefault: "off",
    moduleRuntimeStateFileDefault: defaultStateFilePath
  });

  const { createRuntimeInfrastructure } = await import(
    "../../src/domains/reference/runtime/services/reference-runtime-infrastructure-domain-service.js"
  );

  const infrastructure = createRuntimeInfrastructure();

  expect(infrastructure.moduleRuntimeStateStore.enabled).toBe(true);
  expect(infrastructure.moduleRuntimeStateStore.stateFilePath).toBe(defaultStateFilePath);
});
