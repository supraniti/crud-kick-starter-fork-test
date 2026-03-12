import { createDefinitionRegistry } from "./create-definition-registry.mjs";

function buildQueryKey(definition) {
  return `${definition.resource}.${definition.query}`;
}

function buildActionKey(definition) {
  return definition.action;
}

function buildDatasetKey(definition) {
  return definition.dataset;
}

export function createQueryRegistry(definitions = []) {
  return createDefinitionRegistry(definitions, buildQueryKey);
}

export function createActionRegistry(definitions = []) {
  return createDefinitionRegistry(definitions, buildActionKey);
}

export function createDatasetRegistry(definitions = []) {
  return createDefinitionRegistry(definitions, buildDatasetKey);
}
