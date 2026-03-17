import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductDeploymentsView } from "../../app/product-shell/ProductDeploymentsView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createPublishedPage,
  createValidatedConnection,
  createValidatedTarget,
  mockDeploymentCollections,
  mockModuleSettings
} from "./product-deployments-test-helpers.js";
import * as blogDistributionSupport from "../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js";
import * as remoteOpsWorkspaceSupport from "../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    fetchReferenceCollectionItems: vi.fn(),
    readReferenceModuleSettings: vi.fn()
  };
});

vi.mock("../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js", async () => {
  const actual = await vi.importActual(
    "../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js"
  );
  return {
    ...actual,
    fetchDeskPages: vi.fn(),
    fetchDeliveryPayload: vi.fn(),
    fetchPagePreviewSources: vi.fn(),
    runDeploymentBundleRelease: vi.fn()
  };
});

vi.mock("../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js", async () => {
  const actual = await vi.importActual(
    "../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js"
  );
  return {
    ...actual,
    importConnectionCredentialFile: vi.fn(),
    validateConnection: vi.fn()
  };
});

function createProjectionTarget(id, title, projectionScope, firestoreCollectionPath) {
  return createValidatedTarget({
    id,
    title,
    targetKind: "firestore-projection",
    config: {
      projectionScope,
      firestoreCollectionPath
    }
  });
}

function createStorageTarget(id, title, targetKind, bucketName, prefix) {
  return createValidatedTarget({
    id,
    title,
    targetKind,
    config: {
      bucketName,
      prefix,
      localRootHint: targetKind === "media-storage" ? "media" : "deployment"
    }
  });
}

function createBrowserTarget() {
  return createValidatedTarget({
    id: "target-browser-001",
    title: "Primary Domain",
    targetKind: "browser-delivery",
    config: {
      accessMode: "gcp-temporary",
      stackMode: "direct-storage",
      dnsMode: "external",
      deploymentTargetProfileId: "target-deployment-001",
      mediaTargetProfileId: "target-media-001"
    }
  });
}

function createBundle() {
  return {
    id: "bundle-001",
    title: "Posts Release Bundle",
    pageId: "page-001",
    postsProjectionTargetProfileId: "target-posts-001",
    categoriesProjectionTargetProfileId: "target-categories-001",
    tagsProjectionTargetProfileId: "target-tags-001",
    mediaTargetProfileId: "target-media-001",
    deploymentTargetProfileId: "target-deployment-001",
    browserDeliveryTargetProfileId: "target-browser-001"
  };
}

function createTargets() {
  return [
    createProjectionTarget("target-posts-001", "Posts Projection", "published-blog-posts", "publishedPosts"),
    createProjectionTarget("target-categories-001", "Categories Projection", "public-blog-categories", "publicCategories"),
    createProjectionTarget("target-tags-001", "Tags Projection", "public-blog-tags", "publicTags"),
    createStorageTarget("target-media-001", "Media Library", "media-storage", "demo-media-bucket", "library"),
    createStorageTarget("target-deployment-001", "HTML Deployment", "deployment-storage", "demo-deployment-bucket", "site"),
    createBrowserTarget()
  ];
}

function createRuntimePreviewPayload(overrides = {}) {
  return {
    page: {
      id: "page-001",
      path: "/posts/launch-story",
      deploymentArtifactPath: "posts/launch-story/index.html"
    },
    delivery: {
      accessMode: "gcp-temporary",
      temporaryDeploymentBaseUrl: "https://storage.googleapis.com/demo-page-deployment-bucket/page-site",
      temporaryMediaBaseUrl: "https://storage.googleapis.com/demo-media-bucket/library",
      publicUrl: "https://storage.googleapis.com/demo-page-deployment-bucket/page-site/posts/launch-story/index.html",
      publicMediaBaseUrl: "https://storage.googleapis.com/demo-media-bucket/library",
      temporaryAccess: {
        pageUrlAvailable: true,
        pageUrlMessage: null,
        unsignedPageUrl: "https://storage.googleapis.com/demo-page-deployment-bucket/page-site/posts/launch-story/index.html"
      }
    },
    runtime: {
      clientRuntime: {
        assetUrl: "../../assets/client-runtime.global.js",
        remote: {
          baseUrl: "https://stories.example.com"
        }
      }
    },
    media: {
      items: []
    },
    ...overrides
  };
}

function setupBaseWorkspace(bundleRuns = []) {
  mockDeploymentCollections({
    pages: [createPublishedPage()],
    bundles: [createBundle()],
    bundleRuns,
    connections: [createValidatedConnection()],
    targets: createTargets(),
    remoteRuns: []
  });
  mockModuleSettings();
  blogDistributionSupport.fetchDeskPages.mockResolvedValue([createPublishedPage()]);
  blogDistributionSupport.fetchPagePreviewSources.mockResolvedValue([
    {
      id: "post-001",
      title: "Launch Story",
      path: "/posts/launch-story"
    }
  ]);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

test("deployment desk ignores stale historical missing-key runs when current state is healthy", async () => {
  const missingKeyMessage =
    "Stored service-account key file is missing. Choose the JSON key file again to re-import it.";

  setupBaseWorkspace([
    {
      id: "bundle-run-001",
      bundleId: "bundle-001",
      title: "Failed release",
      status: "failed",
      summaryMessage: missingKeyMessage
    }
  ]);
  blogDistributionSupport.fetchDeliveryPayload.mockResolvedValue(createRuntimePreviewPayload());

  render(<ProductDeploymentsView />);

  await waitFor(() => {
    expect(screen.getByText("Browse Links")).toBeInTheDocument();
  });

  expect(screen.queryByText(/Stored service-account key file is missing for/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Choose JSON Key File" })).not.toBeInTheDocument();
}, 15000);

test("deployment desk shows inline key recovery when the release pipeline reports a missing stored key", async () => {
  setupBaseWorkspace();
  remoteOpsWorkspaceSupport.importConnectionCredentialFile.mockResolvedValue({
    ok: true,
    item: {
      id: "conn-001"
    }
  });
  remoteOpsWorkspaceSupport.validateConnection.mockResolvedValue({
    ok: true,
    item: {
      id: "conn-001"
    }
  });
  blogDistributionSupport.fetchDeliveryPayload.mockResolvedValue(createRuntimePreviewPayload());
  blogDistributionSupport.runDeploymentBundleRelease.mockRejectedValue(
    new Error("Stored service-account key file is missing. Choose the JSON key file again to re-import it.")
  );

  render(<ProductDeploymentsView />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Posts Release Bundle Page: page-001/i })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: /Posts Release Bundle Page: page-001/i }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Run Release Pipeline" })).toBeEnabled();
  });

  fireEvent.click(screen.getByRole("button", { name: "Run Release Pipeline" }));

  await waitFor(() => {
    expect(screen.getByText(/Stored service-account key file is missing for/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose JSON Key File" })).toBeInTheDocument();
  });

  const fileInput = document.querySelector('input[type="file"]');
  const file = new File(
    [
      JSON.stringify({
        type: "service_account",
        project_id: "demo-project",
        private_key_id: "demo-key",
        private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
        client_email: "demo-service-account@example.com",
        token_uri: "https://oauth2.googleapis.com/token"
      })
    ],
    "demo-service-account.json",
    { type: "application/json" }
  );
  fireEvent.change(fileInput, { target: { files: [file] } });

  await waitFor(() => {
    expect(remoteOpsWorkspaceSupport.importConnectionCredentialFile).toHaveBeenCalledWith(
      "conn-001",
      "demo-service-account.json",
      expect.stringContaining("\"service_account\"")
    );
    expect(remoteOpsWorkspaceSupport.validateConnection).toHaveBeenCalledWith("conn-001");
  });
}, 15000);
