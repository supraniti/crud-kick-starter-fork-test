import * as referenceApi from "../../api/reference.js";
import {
  createConnectionItem,
  createTargetItem
} from "./remote-ops-test-helpers.js";

const VALIDATED_SUMMARY = Object.freeze({
  state: "validated",
  canProceed: true,
  checkedItems: [],
  warnings: [],
  message: null
});

export function createValidatedConnection(overrides = {}) {
  return createConnectionItem({
    id: "conn-001",
    profileName: "Primary GCP Dev",
    projectId: "demo-project",
    connectionStatus: "validated",
    ...overrides
  });
}

export function createValidatedTarget({
  config = {},
  connectionProfileId = "conn-001",
  ...overrides
} = {}) {
  return createTargetItem({
    connectionProfileId,
    targetStatus: "validated",
    validationSummary: { ...VALIDATED_SUMMARY },
    config: {
      ...createTargetItem().config,
      ...config
    },
    ...overrides
  });
}

export function createPublishedPage(overrides = {}) {
  return {
    id: "page-001",
    title: "Posts Page",
    status: "published",
    deploymentMode: "per-record",
    primarySourceType: "blog-post",
    path: "/posts",
    pathPattern: "/posts/{slug}",
    deploymentStatus: "clean",
    deploymentSyncedCount: 10,
    deploymentStaleCount: 0,
    deploymentMissingCount: 0,
    deploymentTargetCount: 10,
    ...overrides
  };
}

export function mockDeploymentCollections({
  pages = [],
  bundles = [],
  bundleRuns = [],
  connections = [],
  targets = [],
  remoteRuns = []
}) {
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return { items: pages.map((item) => ({ ...item })) };
    }
    if (collectionId === "page-deployment-bundles") {
      return { items: bundles.map((item) => ({ ...item })) };
    }
    if (collectionId === "page-deployment-bundle-runs") {
      return { items: bundleRuns.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-connection-profiles") {
      return { items: connections.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-target-profiles") {
      return { items: targets.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-operation-runs") {
      return { items: remoteRuns.map((item) => ({ ...item })) };
    }
    return { items: [] };
  });
}

export function mockModuleSettings(valuesByModule = {}) {
  referenceApi.readReferenceModuleSettings.mockImplementation(async ({ moduleId }) => ({
    ok: true,
    settings: {
      values: valuesByModule[moduleId] ?? {}
    }
  }));
}
