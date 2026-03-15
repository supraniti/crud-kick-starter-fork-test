import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductDeploymentsView } from "../../app/product-shell/ProductDeploymentsView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createConnectionItem,
  createTargetItem
} from "./remote-ops-test-helpers.js";
import * as remoteOpsSupportApi from "../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js";
import * as blogDistributionSupport from "../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    fetchReferenceCollectionItems: vi.fn(),
    readReferenceModuleSettings: vi.fn()
  };
});

vi.mock("../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js", async () => {
  const actual = await vi.importActual(
    "../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js"
  );
  return {
    ...actual,
    compareTarget: vi.fn(),
    executeTarget: vi.fn(),
    validateTarget: vi.fn()
  };
});

vi.mock("../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js", async () => {
  const actual = await vi.importActual(
    "../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js"
  );
  return {
    ...actual,
    syncSelectedPageDeployment: vi.fn()
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("product deployments desk runs the release pipeline across local HTML, projection, media, deployment, and browser delivery", async () => {
  const connectionItems = [
    createConnectionItem({
      id: "conn-001",
      profileName: "Primary GCP Dev",
      projectId: "demo-project",
      connectionStatus: "validated"
    })
  ];
  const targetItems = [
    createTargetItem({
      id: "target-posts-001",
      title: "Posts Projection",
      productBindingKey: "posts-projection",
      targetKind: "firestore-projection",
      connectionProfileId: "conn-001",
      config: {
        ...createTargetItem().config,
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "publishedPosts"
      }
    }),
    createTargetItem({
      id: "target-categories-001",
      title: "Categories Projection",
      productBindingKey: "categories-projection",
      targetKind: "firestore-projection",
      connectionProfileId: "conn-001",
      config: {
        ...createTargetItem().config,
        projectionScope: "public-blog-categories",
        firestoreCollectionPath: "publicCategories"
      }
    }),
    createTargetItem({
      id: "target-tags-001",
      title: "Tags Projection",
      productBindingKey: "tags-projection",
      targetKind: "firestore-projection",
      connectionProfileId: "conn-001",
      config: {
        ...createTargetItem().config,
        projectionScope: "public-blog-tags",
        firestoreCollectionPath: "publicTags"
      }
    }),
    createTargetItem({
      id: "target-deployment-001",
      title: "HTML Deployment",
      productBindingKey: "deployment-storage",
      targetKind: "deployment-storage",
      connectionProfileId: "conn-001",
      config: {
        ...createTargetItem().config,
        bucketName: "demo-deployment-bucket",
        prefix: "site",
        localRootHint: "deployment"
      }
    }),
    createTargetItem({
      id: "target-media-001",
      title: "Media Library",
      productBindingKey: "media-storage",
      targetKind: "media-storage",
      connectionProfileId: "conn-001",
      config: {
        ...createTargetItem().config,
        bucketName: "demo-media-bucket",
        prefix: "library",
        localRootHint: "media"
      }
    }),
    createTargetItem({
      id: "target-browser-001",
      title: "Primary Domain",
      productBindingKey: "browser-delivery",
      targetKind: "browser-delivery",
      connectionProfileId: "conn-001",
      config: {
        ...createTargetItem().config,
        accessMode: "gcp-temporary",
        stackMode: "direct-storage",
        dnsMode: "external",
        deploymentTargetProfileId: "target-deployment-001",
        mediaTargetProfileId: "target-media-001"
      }
    })
  ];
  const pages = [
    {
      id: "page-001",
      title: "Posts Page",
      status: "published",
      deploymentStatus: "stale",
      deploymentSyncedCount: 0,
      deploymentStaleCount: 10,
      deploymentMissingCount: 0,
      deploymentTargetCount: 10
    }
  ];

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return { items: pages.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-connection-profiles") {
      return { items: connectionItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-target-profiles") {
      return { items: targetItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-operation-runs") {
      return { items: [] };
    }
    return { items: [] };
  });

  referenceApi.readReferenceModuleSettings.mockImplementation(async ({ moduleId }) => {
    if (moduleId === "test-modules-content") {
      return {
        ok: true,
        settings: {
          values: {
            remoteProjectionTargetProfileId: "target-posts-001"
          }
        }
      };
    }
    if (moduleId === "test-modules-taxonomy") {
      return {
        ok: true,
        settings: {
          values: {
            remoteCategoriesProjectionTargetProfileId: "target-categories-001",
            remoteTagsProjectionTargetProfileId: "target-tags-001"
          }
        }
      };
    }
    if (moduleId === "test-modules-pages") {
      return {
        ok: true,
        settings: {
          values: {
            remoteDeploymentTargetProfileId: "target-deployment-001",
            remoteBrowserDeliveryTargetProfileId: "target-browser-001"
          }
        }
      };
    }
    if (moduleId === "test-modules-media-manager") {
      return {
        ok: true,
        settings: {
          values: {
            remoteMediaTargetProfileId: "target-media-001"
          }
        }
      };
    }
    return {
      ok: true,
      settings: {
        values: {}
      }
    };
  });

  blogDistributionSupport.syncSelectedPageDeployment.mockResolvedValue({
    ok: true,
    message: "Local deployment synced"
  });
  remoteOpsSupportApi.compareTarget.mockImplementation(async (targetId) => ({
    ok: true,
    message: `Compared ${targetId}`
  }));
  remoteOpsSupportApi.executeTarget.mockImplementation(async (targetId) => ({
    ok: true,
    message: `Executed ${targetId}`
  }));
  remoteOpsSupportApi.validateTarget.mockImplementation(async (targetId) => ({
    ok: true,
    message: `Validated ${targetId}`
  }));

  render(<ProductDeploymentsView />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Release Pipeline Desk" })).toBeInTheDocument();
    expect(screen.getByText("Release Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Published page: ready")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Run Release Pipeline" }));

  await waitFor(() => {
    expect(blogDistributionSupport.syncSelectedPageDeployment).toHaveBeenCalledWith({
      pageId: "page-001"
    });
    expect(remoteOpsSupportApi.compareTarget).toHaveBeenCalledWith("target-posts-001");
    expect(remoteOpsSupportApi.executeTarget).toHaveBeenCalledWith("target-posts-001");
    expect(remoteOpsSupportApi.compareTarget).toHaveBeenCalledWith("target-categories-001");
    expect(remoteOpsSupportApi.executeTarget).toHaveBeenCalledWith("target-categories-001");
    expect(remoteOpsSupportApi.compareTarget).toHaveBeenCalledWith("target-tags-001");
    expect(remoteOpsSupportApi.executeTarget).toHaveBeenCalledWith("target-tags-001");
    expect(remoteOpsSupportApi.compareTarget).toHaveBeenCalledWith("target-media-001");
    expect(remoteOpsSupportApi.executeTarget).toHaveBeenCalledWith("target-media-001");
    expect(remoteOpsSupportApi.compareTarget).toHaveBeenCalledWith("target-deployment-001");
    expect(remoteOpsSupportApi.executeTarget).toHaveBeenCalledWith("target-deployment-001");
    expect(remoteOpsSupportApi.validateTarget).toHaveBeenCalledWith("target-browser-001");
    expect(screen.getByText("Release pipeline completed")).toBeInTheDocument();
    expect(screen.getByText("Sync local HTML")).toBeInTheDocument();
    expect(screen.getByText("Validate browser delivery")).toBeInTheDocument();
  });

  expect(blogDistributionSupport.syncSelectedPageDeployment.mock.invocationCallOrder[0]).toBeLessThan(
    remoteOpsSupportApi.compareTarget.mock.invocationCallOrder[0]
  );
  expect(remoteOpsSupportApi.compareTarget.mock.calls.map(([targetId]) => targetId)).toEqual([
    "target-posts-001",
    "target-categories-001",
    "target-tags-001",
    "target-media-001",
    "target-deployment-001"
  ]);
  expect(remoteOpsSupportApi.executeTarget.mock.calls.map(([targetId]) => targetId)).toEqual([
    "target-posts-001",
    "target-categories-001",
    "target-tags-001",
    "target-media-001",
    "target-deployment-001"
  ]);
}, 15000);
