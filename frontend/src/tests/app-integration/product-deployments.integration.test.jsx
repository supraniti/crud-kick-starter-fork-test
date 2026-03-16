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
    analyzeConnectionCompatibility: vi.fn(),
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
    fetchDeskPages: vi.fn(),
    fetchDeliveryPayload: vi.fn(),
    fetchPagePreviewSources: vi.fn(),
    syncSelectedPageDeployment: vi.fn(),
    runDeploymentBundleRelease: vi.fn()
  };
});

function createValidatedProjectionTarget(id, title, projectionScope, firestoreCollectionPath, extras = {}) {
  return createValidatedTarget({
    id,
    title,
    targetKind: "firestore-projection",
    config: {
      projectionScope,
      firestoreCollectionPath
    },
    ...extras
  });
}

function createValidatedStorageTarget(id, title, targetKind, bucketName, prefix, extras = {}) {
  return createValidatedTarget({
    id,
    title,
    targetKind,
    config: {
      bucketName,
      prefix,
      localRootHint: targetKind === "media-storage" ? "media" : "deployment"
    },
    ...extras
  });
}

function createValidatedBrowserTarget(id, title, config = {}, extras = {}) {
  return createValidatedTarget({
    id,
    title,
    targetKind: "browser-delivery",
    config,
    ...extras
  });
}

function setupCreateBundleFixture(targetItems) {
  mockDeploymentCollections({
    pages: [createPublishedPage()],
    bundles: [],
    bundleRuns: [],
    connections: [createValidatedConnection()],
    targets: targetItems,
    remoteRuns: []
  });
  mockModuleSettings();
}

async function fillBundleEditor() {
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
}

function createStandardTargetSet(overrides = {}) {
  return {
    posts: createValidatedProjectionTarget(
      "target-posts-001",
      "Posts Projection",
      "published-blog-posts",
      "publishedPosts",
      overrides.posts
    ),
    categories: createValidatedProjectionTarget(
      "target-categories-001",
      "Categories Projection",
      "public-blog-categories",
      "publicCategories",
      overrides.categories
    ),
    tags: createValidatedProjectionTarget(
      "target-tags-001",
      "Tags Projection",
      "public-blog-tags",
      "publicTags",
      overrides.tags
    ),
    media: createValidatedStorageTarget(
      "target-media-001",
      "Media Library",
      "media-storage",
      "demo-media-bucket",
      "library",
      overrides.media
    ),
    deployment: createValidatedStorageTarget(
      "target-deployment-001",
      "HTML Deployment",
      "deployment-storage",
      "demo-deployment-bucket",
      "site",
      overrides.deployment
    ),
    browser: createValidatedBrowserTarget(
      "target-browser-001",
      "Primary Domain",
      {
        accessMode: "gcp-temporary",
        stackMode: "direct-storage",
        dnsMode: "external",
        deploymentTargetProfileId: "target-deployment-001",
        mediaTargetProfileId: "target-media-001"
      },
      overrides.browser
    )
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function createRuntimePreviewPayload() {
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
        assetUrl: "/assets/client-runtime.global.js",
        remote: {
          baseUrl: "https://stories.example.com"
        },
        bootstrapDatasets: ["page-payload", "page-media", "post-comments", "page-slot-primary"],
        queries: [
          { resource: "page", query: "current" },
          { resource: "page", query: "currentRemote" },
          { resource: "media", query: "byId" },
          { resource: "comments", query: "byPost" }
        ],
        actions: [
          { action: "page.refresh" },
          { action: "media.refresh" },
          { action: "comments.refresh" },
          { action: "comments.submit" }
        ],
        datasets: [
          { dataset: "page-payload" },
          { dataset: "page-media" },
          { dataset: "post-comments" },
          { dataset: "page-slot-primary" }
        ],
        slots: [
          { bindAs: "primary", sourceType: "blog-post", recordMode: "single-item" }
        ]
      }
    },
    media: {
      items: [
        {
          id: "media-001",
          preferredUrl: "https://stories.example.com/library/originals/hero.png"
        }
      ]
    }
  };
}

function setupRuntimePreviewMocks() {
  blogDistributionSupport.fetchDeskPages.mockResolvedValue([createPublishedPage()]);
  blogDistributionSupport.fetchPagePreviewSources.mockResolvedValue([
    {
      id: "post-001",
      title: "Launch Story",
      path: "/posts/launch-story"
    }
  ]);
  blogDistributionSupport.fetchDeliveryPayload.mockResolvedValue(createRuntimePreviewPayload());
}

test("deployment bundles can be created with typed target selectors", async () => {
  const targets = createStandardTargetSet();
  setupCreateBundleFixture(Object.values(targets));
  setupRuntimePreviewMocks();
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

  fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
  fireEvent.click(screen.getByRole("button", { name: "Show Bundle Setup" }));
  await fillBundleEditor();
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
}, 15000);

test("deployment bundle validation blocks mismatched browser-delivery bindings before save", async () => {
  const targets = createStandardTargetSet({
    deployment: {
      id: "target-deployment-001",
      title: "HTML Deployment"
    },
    browser: {
      config: {
        accessMode: "gcp-temporary",
        stackMode: "direct-storage",
        dnsMode: "external",
        deploymentTargetProfileId: "target-other-deployment-001",
        mediaTargetProfileId: "target-media-001"
      }
    }
  });
  const otherDeployment = createValidatedStorageTarget(
    "target-other-deployment-001",
    "Other HTML Deployment",
    "deployment-storage",
    "other-deployment-bucket",
    "other-site"
  );

  setupCreateBundleFixture([...Object.values(targets), otherDeployment]);
  setupRuntimePreviewMocks();

  render(<ProductDeploymentsView />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Release Pipeline Desk" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
  fireEvent.click(screen.getByRole("button", { name: "Show Bundle Setup" }));
  await fillBundleEditor();

  await waitFor(() => {
    expect(
      screen.getByText(
        "Browser delivery target points at a different HTML deployment target than the selected bundle."
      )
    ).toBeInTheDocument();
  });
  expect(screen.getByRole("button", { name: "Create Bundle" })).toBeDisabled();
  expect(referenceApi.createReferenceCollectionItem).not.toHaveBeenCalled();
}, 15000);

test("product deployments desk runs the release pipeline across local HTML, projection, media, deployment, and browser delivery", async () => {
  const baseTargets = createStandardTargetSet({
    posts: { productBindingKey: "posts-projection" },
    categories: { productBindingKey: "categories-projection" },
    tags: { productBindingKey: "tags-projection" },
    media: { productBindingKey: "media-storage" },
    deployment: { productBindingKey: "deployment-storage" },
    browser: { productBindingKey: "browser-delivery" }
  });
  const pageDeployment = createValidatedStorageTarget(
    "target-page-deployment-001",
    "Page HTML Deployment",
    "deployment-storage",
    "demo-page-deployment-bucket",
    "page-site"
  );
  const pageBrowser = createValidatedBrowserTarget("target-page-browser-001", "Page Domain", {
    accessMode: "custom-domain",
    stackMode: "https-load-balancer",
    dnsMode: "external",
    hostname: "stories.example.com",
    deploymentTargetProfileId: "target-page-deployment-001",
    mediaTargetProfileId: "target-media-001"
  });
  const page = createPublishedPage({
    deploymentStatus: "stale",
    deploymentSyncedCount: 0,
    deploymentStaleCount: 10
  });
  const bundle = {
    id: "bundle-001",
    title: "Posts Release Bundle",
    pageId: "page-001",
    postsProjectionTargetProfileId: "target-posts-001",
    categoriesProjectionTargetProfileId: "target-categories-001",
    tagsProjectionTargetProfileId: "target-tags-001",
    mediaTargetProfileId: "target-media-001",
    deploymentTargetProfileId: "target-page-deployment-001",
    browserDeliveryTargetProfileId: "target-page-browser-001"
  };

  mockDeploymentCollections({
    pages: [page],
    bundles: [bundle],
    bundleRuns: [],
    connections: [createValidatedConnection()],
    targets: [...Object.values(baseTargets), pageDeployment, pageBrowser],
    remoteRuns: []
  });
  mockModuleSettings({
    "test-modules-content": {
      remoteProjectionTargetProfileId: "target-posts-001"
    },
    "test-modules-taxonomy": {
      remoteCategoriesProjectionTargetProfileId: "target-categories-001",
      remoteTagsProjectionTargetProfileId: "target-tags-001"
    },
    "test-modules-pages": {
      remoteDeploymentTargetProfileId: "target-deployment-001",
      remoteBrowserDeliveryTargetProfileId: "target-browser-001"
    },
    "test-modules-media-manager": {
      remoteMediaTargetProfileId: "target-media-001"
    }
  });
  setupRuntimePreviewMocks();
  blogDistributionSupport.runDeploymentBundleRelease.mockResolvedValue({
    ok: true,
    message: "Release pipeline completed for 'Posts Release Bundle'",
    run: {
      id: "run-001",
      steps: [
        { key: "sync-local-html", label: "Sync local HTML", status: "success", message: "Local deployment synced" },
        { key: "compare-posts-projection", label: "Compare posts projection", status: "success", message: "Compared target-posts-001" },
        { key: "sync-posts-projection", label: "Sync posts projection", status: "success", message: "Executed target-posts-001" },
        { key: "compare-categories-projection", label: "Compare categories projection", status: "success", message: "Compared target-categories-001" },
        { key: "sync-categories-projection", label: "Sync categories projection", status: "success", message: "Executed target-categories-001" },
        { key: "compare-tags-projection", label: "Compare tags projection", status: "success", message: "Compared target-tags-001" },
        { key: "sync-tags-projection", label: "Sync tags projection", status: "success", message: "Executed target-tags-001" },
        { key: "compare-media", label: "Compare media sync", status: "success", message: "Compared target-media-001" },
        { key: "sync-media", label: "Sync media", status: "success", message: "Executed target-media-001" },
        { key: "compare-html-deployment", label: "Compare HTML deployment", status: "success", message: "Compared target-page-deployment-001" },
        { key: "sync-html-deployment", label: "Sync HTML deployment", status: "success", message: "Executed target-page-deployment-001" },
        { key: "validate-browser-delivery", label: "Validate browser delivery", status: "success", message: "Validated target-page-browser-001" }
      ]
    }
  });

  render(<ProductDeploymentsView />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Release Pipeline Desk" })).toBeInTheDocument();
    expect(screen.getByText("Release Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Page: page-001")).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole("button", { name: /Posts Release Bundle\s+Page: page-001/i }));
  fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
  fireEvent.click(screen.getByRole("button", { name: "Show Bundle Setup" }));

  await waitFor(() => {
    expect(screen.getByText("Bundle bindings are coherent.")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Release" }));

  await waitFor(() => {
    expect(screen.getByText("Public Output Forecast")).toBeInTheDocument();
    expect(screen.getByText("Browse Links")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Example public URL: https://storage.googleapis.com/demo-page-deployment-bucket/page-site/posts/launch-story/index.html"
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Release Pipeline" })).toBeEnabled();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Inspect Output" }));

  await waitFor(() => {
    expect(screen.getByText("Client Runtime Release Preview")).toBeInTheDocument();
    expect(screen.getByText("page.refresh")).toBeInTheDocument();
    expect(screen.getByText("comments.refresh")).toBeInTheDocument();
    expect(screen.getByText("https://stories.example.com/library/originals/hero.png")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Release" }));
  fireEvent.click(screen.getByRole("button", { name: "Run Release Pipeline" }));

  await waitFor(() => {
    expect(blogDistributionSupport.runDeploymentBundleRelease).toHaveBeenCalledWith({
      bundleId: "bundle-001"
    });
    expect(screen.getByText("Release pipeline completed for 'Posts Release Bundle'")).toBeInTheDocument();
    expect(screen.getByText("Sync local HTML")).toBeInTheDocument();
    expect(screen.getByText("Validate browser delivery")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
  fireEvent.click(screen.getByRole("button", { name: "Show Detailed Target Operations" }));

  await waitFor(() => {
    expect(screen.getAllByText("Binding source: Deployment bundle").length).toBeGreaterThan(0);
    expect(screen.getByText("Local HTML Deployment")).toBeInTheDocument();
  });
}, 20000);

test("product deployments desk surfaces release footprint and remote cost warnings from compatibility analysis", async () => {
  const baseTargets = createStandardTargetSet({
    posts: {
      compareSummary: {
        state: "drift",
        createCount: 12,
        updateCount: 3,
        deleteCount: 0,
        localOnlyCount: 1,
        remoteOnlyCount: 0
      }
    },
    deployment: {
      compareSummary: {
        state: "drift",
        createCount: 10,
        updateCount: 0,
        deleteCount: 0,
        localOnlyCount: 0,
        remoteOnlyCount: 0
      }
    }
  });
  const bundle = {
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

  mockDeploymentCollections({
    pages: [createPublishedPage()],
    bundles: [bundle],
    bundleRuns: [],
    connections: [createValidatedConnection()],
    targets: Object.values(baseTargets),
    remoteRuns: []
  });
  mockModuleSettings();
  setupRuntimePreviewMocks();
  remoteOpsSupportApi.analyzeConnectionCompatibility.mockResolvedValue({
    bundles: [
      {
        id: "firestore-projection",
        label: "Firestore projection",
        state: "action-required",
        costWarnings: [
          {
            id: "firestore-storage",
            message: "Creating a Firestore database is a project-level decision and starts ongoing storage/read/write costs."
          }
        ],
        missingResources: [{ kind: "firestore-database", label: "Default Firestore database" }],
        provisionableActions: [{ id: "create-firestore-default-database" }]
      },
      {
        id: "deployment-storage",
        label: "Deployment storage",
        state: "compatible",
        costWarnings: [
          {
            id: "deployment-bucket",
            message: "Creating a new bucket introduces storage, network egress, and possible CDN-related costs."
          }
        ],
        missingResources: [],
        provisionableActions: []
      },
      {
        id: "media-storage",
        label: "Media storage",
        state: "compatible",
        costWarnings: [],
        missingResources: [],
        provisionableActions: []
      },
      {
        id: "browser-delivery",
        label: "Browser delivery",
        state: "compatible",
        costWarnings: [],
        missingResources: [],
        provisionableActions: []
      }
    ],
    safeguardRules: [{ id: "cost-confirmation" }]
  });

  render(<ProductDeploymentsView />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Release Pipeline Desk" })).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole("button", { name: /Posts Release Bundle\s+Page: page-001/i }));
  fireEvent.click(screen.getByRole("tab", { name: "Inspect Output" }));

  await waitFor(() => {
    expect(screen.getByText("Release Footprint")).toBeInTheDocument();
    expect(screen.getByText("HTML outputs: 10")).toBeInTheDocument();
    expect(screen.getByText(/Creates 12/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Analyze Remote Costs" }));

  await waitFor(() => {
    expect(remoteOpsSupportApi.analyzeConnectionCompatibility).toHaveBeenCalledWith("conn-001");
    expect(
      screen.getByText(
        "Firestore projection: Creating a Firestore database is a project-level decision and starts ongoing storage/read/write costs."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Deployment storage: Creating a new bucket introduces storage, network egress, and possible CDN-related costs."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("1 remote bundle areas still need provisioning actions.")).toBeInTheDocument();
  });
}, 15000);
