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
    readReferenceModuleSettings: vi.fn(),
    createReferenceCollectionItem: vi.fn(),
    updateReferenceCollectionItem: vi.fn()
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

test("deployment bundles can be created with typed target selectors", async () => {
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
      targetKind: "firestore-projection",
      connectionProfileId: "conn-001",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true, checkedItems: [], warnings: [], message: null },
      config: {
        ...createTargetItem().config,
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "publishedPosts"
      }
    }),
    createTargetItem({
      id: "target-categories-001",
      title: "Categories Projection",
      targetKind: "firestore-projection",
      connectionProfileId: "conn-001",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true, checkedItems: [], warnings: [], message: null },
      config: {
        ...createTargetItem().config,
        projectionScope: "public-blog-categories",
        firestoreCollectionPath: "publicCategories"
      }
    }),
    createTargetItem({
      id: "target-tags-001",
      title: "Tags Projection",
      targetKind: "firestore-projection",
      connectionProfileId: "conn-001",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true, checkedItems: [], warnings: [], message: null },
      config: {
        ...createTargetItem().config,
        projectionScope: "public-blog-tags",
        firestoreCollectionPath: "publicTags"
      }
    }),
    createTargetItem({
      id: "target-media-001",
      title: "Media Library",
      targetKind: "media-storage",
      connectionProfileId: "conn-001",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true, checkedItems: [], warnings: [], message: null },
      config: {
        ...createTargetItem().config,
        bucketName: "demo-media-bucket",
        prefix: "library",
        localRootHint: "media"
      }
    }),
    createTargetItem({
      id: "target-deployment-001",
      title: "HTML Deployment",
      targetKind: "deployment-storage",
      connectionProfileId: "conn-001",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true, checkedItems: [], warnings: [], message: null },
      config: {
        ...createTargetItem().config,
        bucketName: "demo-deployment-bucket",
        prefix: "site",
        localRootHint: "deployment"
      }
    }),
    createTargetItem({
      id: "target-browser-001",
      title: "Primary Domain",
      targetKind: "browser-delivery",
      connectionProfileId: "conn-001",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true, checkedItems: [], warnings: [], message: null },
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
      deploymentStatus: "clean",
      deploymentSyncedCount: 10,
      deploymentStaleCount: 0,
      deploymentMissingCount: 0,
      deploymentTargetCount: 10
    }
  ];

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return { items: pages.map((item) => ({ ...item })) };
    }
    if (collectionId === "page-deployment-bundles") {
      return { items: [] };
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
  referenceApi.readReferenceModuleSettings.mockResolvedValue({
    ok: true,
    settings: {
      values: {}
    }
  });
  referenceApi.createReferenceCollectionItem.mockResolvedValue({
    ok: true,
    item: {
      id: "bundle-001",
      title: "Posts Release Bundle",
      pageId: "page-001",
      postsProjectionTargetProfileId: "target-posts-001",
      categoriesProjectionTargetProfileId: "target-categories-001",
      tagsProjectionTargetProfileId: "target-tags-001",
      mediaTargetProfileId: "target-media-001",
      deploymentTargetProfileId: "target-deployment-001",
      browserDeliveryTargetProfileId: "target-browser-001"
    }
  });

  render(<ProductDeploymentsView />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Release Pipeline Desk" })).toBeInTheDocument();
    expect(screen.getByText("No deployment bundles yet.")).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText("Bundle Title"), {
    target: { value: "Posts Release Bundle" }
  });
  fireEvent.mouseDown(screen.getByLabelText("Published Page"));
  fireEvent.click(await screen.findByRole("option", { name: "Posts Page" }));
  fireEvent.mouseDown(screen.getByLabelText("Posts Projection Target"));
  fireEvent.click(await screen.findByRole("option", { name: "Posts Projection" }));
  fireEvent.mouseDown(screen.getByLabelText("Categories Projection Target"));
  fireEvent.click(await screen.findByRole("option", { name: "Categories Projection" }));
  fireEvent.mouseDown(screen.getByLabelText("Tags Projection Target"));
  fireEvent.click(await screen.findByRole("option", { name: "Tags Projection" }));
  fireEvent.mouseDown(screen.getByLabelText("Media Target"));
  fireEvent.click(await screen.findByRole("option", { name: "Media Library" }));
  fireEvent.mouseDown(screen.getByLabelText("HTML Deployment Target"));
  fireEvent.click(await screen.findByRole("option", { name: "HTML Deployment" }));
  fireEvent.mouseDown(screen.getByLabelText("Browser Delivery Target"));
  fireEvent.click(await screen.findByRole("option", { name: "Primary Domain" }));

  fireEvent.click(screen.getByRole("button", { name: "Create Bundle" }));

  await waitFor(() => {
    expect(referenceApi.createReferenceCollectionItem).toHaveBeenCalledWith({
      collectionId: "page-deployment-bundles",
      item: {
        title: "Posts Release Bundle",
        pageId: "page-001",
        postsProjectionTargetProfileId: "target-posts-001",
        categoriesProjectionTargetProfileId: "target-categories-001",
        tagsProjectionTargetProfileId: "target-tags-001",
        mediaTargetProfileId: "target-media-001",
        deploymentTargetProfileId: "target-deployment-001",
        browserDeliveryTargetProfileId: "target-browser-001"
      }
    });
    expect(screen.getByText("Deployment bundle created")).toBeInTheDocument();
  });
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
      id: "target-page-deployment-001",
      title: "Page HTML Deployment",
      targetKind: "deployment-storage",
      connectionProfileId: "conn-001",
      config: {
        ...createTargetItem().config,
        bucketName: "demo-page-deployment-bucket",
        prefix: "page-site",
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
    }),
    createTargetItem({
      id: "target-page-browser-001",
      title: "Page Domain",
      targetKind: "browser-delivery",
      connectionProfileId: "conn-001",
      config: {
        ...createTargetItem().config,
        accessMode: "custom-domain",
        stackMode: "https-load-balancer",
        dnsMode: "external",
        hostname: "stories.example.com",
        deploymentTargetProfileId: "target-page-deployment-001",
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
  const bundles = [
    {
      id: "bundle-001",
      title: "Posts Release Bundle",
      pageId: "page-001",
      postsProjectionTargetProfileId: "target-posts-001",
      categoriesProjectionTargetProfileId: "target-categories-001",
      tagsProjectionTargetProfileId: "target-tags-001",
      mediaTargetProfileId: "target-media-001",
      deploymentTargetProfileId: "target-page-deployment-001",
      browserDeliveryTargetProfileId: "target-page-browser-001"
    }
  ];

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return { items: pages.map((item) => ({ ...item })) };
    }
    if (collectionId === "page-deployment-bundles") {
      return { items: bundles.map((item) => ({ ...item })) };
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
  referenceApi.createReferenceCollectionItem.mockResolvedValue({ ok: true, item: { id: "bundle-002" } });
  referenceApi.updateReferenceCollectionItem.mockResolvedValue({ ok: true, item: { id: "bundle-001" } });

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
    expect(screen.getByText("Deployment bundle: ready")).toBeInTheDocument();
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
    expect(remoteOpsSupportApi.compareTarget).toHaveBeenCalledWith("target-page-deployment-001");
    expect(remoteOpsSupportApi.executeTarget).toHaveBeenCalledWith("target-page-deployment-001");
    expect(remoteOpsSupportApi.validateTarget).toHaveBeenCalledWith("target-page-browser-001");
    expect(screen.getByText("Release pipeline completed for 'Posts Release Bundle'")).toBeInTheDocument();
    expect(screen.getByText("Sync local HTML")).toBeInTheDocument();
    expect(screen.getByText("Validate browser delivery")).toBeInTheDocument();
    expect(screen.getAllByText("Binding source: Deployment bundle").length).toBeGreaterThan(0);
  });

  expect(blogDistributionSupport.syncSelectedPageDeployment.mock.invocationCallOrder[0]).toBeLessThan(
    remoteOpsSupportApi.compareTarget.mock.invocationCallOrder[0]
  );
  expect(remoteOpsSupportApi.compareTarget.mock.calls.map(([targetId]) => targetId)).toEqual([
    "target-posts-001",
    "target-categories-001",
    "target-tags-001",
    "target-media-001",
    "target-page-deployment-001"
  ]);
  expect(remoteOpsSupportApi.executeTarget.mock.calls.map(([targetId]) => targetId)).toEqual([
    "target-posts-001",
    "target-categories-001",
    "target-tags-001",
    "target-media-001",
    "target-page-deployment-001"
  ]);
}, 15000);
