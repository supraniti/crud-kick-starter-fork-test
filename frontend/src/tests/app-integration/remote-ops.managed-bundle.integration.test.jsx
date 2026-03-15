import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RemoteOpsView } from "../../../../modules/test-modules-remote-ops/frontend/RemoteOpsView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createConnectionItem,
  createJsonResponse,
  createTargetItem
} from "./remote-ops-test-helpers.js";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    createReferenceCollectionItem: vi.fn(),
    fetchReferenceCollectionItems: vi.fn(),
    updateReferenceCollectionItem: vi.fn()
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("remote ops desk shows the auto-prepared managed product targets after connection validation", async () => {
  const connectionItems = [
    createConnectionItem({
      credentialPathHint:
        "C:/repo/remote-runtime/remote-ops-live/credentials/conn-001/demo-service-account.json",
      credentialLabel: "demo-service-account.json",
      serviceAccountEmail: "crud-control@demo-project.iam.gserviceaccount.com",
      serviceAccountKeyId: "key-001",
      projectId: "demo-project",
      connectionStatus: "connected",
      lastConnectedOn: "2026-03-11T12:00:00.000Z",
      validationSummary: {
        state: "unknown",
        message: "Ready to validate",
        checkedItems: ["service account credential"],
        warnings: [],
        canProceed: false
      }
    })
  ];
  const targetItems = [];

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
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

  referenceApi.createReferenceCollectionItem.mockResolvedValue({ ok: true, item: {} });
  referenceApi.updateReferenceCollectionItem.mockImplementation(async ({ itemId, item }) => {
    connectionItems[0] = {
      ...connectionItems[0],
      ...item,
      id: itemId
    };
    return { ok: true, item: connectionItems[0] };
  });

  const fetchMock = vi.fn(async (url, options = {}) => {
    const normalized = String(url);
    if (normalized.endsWith("/connections/conn-001/validate")) {
      connectionItems[0] = {
        ...connectionItems[0],
        projectNumber: "1234567890",
        projectDisplayName: "Demo Project",
        connectionStatus: "validated",
        lastValidatedOn: "2026-03-11T12:02:00.000Z",
        validationSummary: {
          state: "validated",
          message: "Connected as 'crud-control@demo-project.iam.gserviceaccount.com' to 'Demo Project'.",
          checkedItems: ["service account credential", "access token", "project access"],
          warnings: [],
          canProceed: true
        }
      };
      targetItems.splice(
        0,
        targetItems.length,
        createTargetItem({
          id: "target-posts-001",
          title: "Posts Projection",
          productBindingKey: "posts-projection",
          adapterMode: "live-gcp",
          config: {
            ...createTargetItem().config,
            firestoreCollectionPath: "publishedPosts"
          }
        }),
        createTargetItem({
          id: "target-categories-001",
          title: "Categories Projection",
          productBindingKey: "categories-projection",
          adapterMode: "live-gcp",
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
          adapterMode: "live-gcp",
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
          adapterMode: "live-gcp",
          config: {
            ...createTargetItem().config,
            firestoreCollectionPath: null,
            bucketName: "demo-project-dev-deployment-1234567890",
            prefix: "site",
            localRootHint: "deployment"
          }
        }),
        createTargetItem({
          id: "target-media-001",
          title: "Media Library",
          productBindingKey: "media-storage",
          targetKind: "media-storage",
          adapterMode: "live-gcp",
          config: {
            ...createTargetItem().config,
            firestoreCollectionPath: null,
            bucketName: "demo-project-dev-media-1234567890",
            prefix: "library",
            localRootHint: "media"
          }
        }),
        createTargetItem({
          id: "target-browser-001",
          title: "Primary Domain",
          productBindingKey: "browser-delivery",
          targetKind: "browser-delivery",
          adapterMode: "live-gcp",
          config: {
            ...createTargetItem().config,
            firestoreCollectionPath: null,
            bucketName: null,
            accessMode: "gcp-temporary",
            stackMode: "direct-storage",
            dnsMode: "external",
            deploymentTargetProfileId: "target-deployment-001",
            mediaTargetProfileId: "target-media-001"
          }
        })
      );

      return createJsonResponse(200, {
        ok: true,
        message: "Connected as 'crud-control@demo-project.iam.gserviceaccount.com' to 'Demo Project'.",
        item: connectionItems[0],
        productBundle: {
          targetsByBindingKey: {
            "posts-projection": targetItems[0],
            "categories-projection": targetItems[1],
            "tags-projection": targetItems[2],
            "deployment-storage": targetItems[3],
            "media-storage": targetItems[4],
            "browser-delivery": targetItems[5]
          },
          settingBindings: [
            { moduleId: "test-modules-content", fieldId: "remoteProjectionTargetProfileId", updated: true },
            { moduleId: "test-modules-taxonomy", fieldId: "remoteCategoriesProjectionTargetProfileId", updated: true },
            { moduleId: "test-modules-taxonomy", fieldId: "remoteTagsProjectionTargetProfileId", updated: true },
            { moduleId: "test-modules-pages", fieldId: "remoteDeploymentTargetProfileId", updated: true },
            { moduleId: "test-modules-pages", fieldId: "remoteBrowserDeliveryTargetProfileId", updated: true },
            { moduleId: "test-modules-media-manager", fieldId: "remoteMediaTargetProfileId", updated: true }
          ]
        }
      });
    }
    throw new Error(`Unexpected request: ${normalized} ${options?.method ?? "GET"}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<RemoteOpsView activeModuleLabel="Remote Ops" />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Remotes Desk" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Primary GCP Dev"));
  fireEvent.click(screen.getByRole("button", { name: "Validate Connection" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/connections/conn-001/validate",
      expect.objectContaining({ method: "POST" })
    );
    expect(
      screen.getByText(
        "Connected as 'crud-control@demo-project.iam.gserviceaccount.com' to 'Demo Project'. Prepared 6 standard targets and bound 6 module settings."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Managed Product Targets")).toBeInTheDocument();
    expect(screen.getByText("6/6 prepared")).toBeInTheDocument();
    expect(screen.getByText("Bucket: demo-project-dev-deployment-1234567890")).toBeInTheDocument();
  });
}, 15000);
