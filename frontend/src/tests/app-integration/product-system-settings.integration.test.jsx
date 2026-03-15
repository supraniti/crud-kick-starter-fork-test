import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ProductSystemSettingsView } from "../../app/product-shell/ProductSystemSettingsView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createConnectionItem,
  createTargetItem
} from "./remote-ops-test-helpers.js";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    fetchReferenceCollectionItems: vi.fn(),
    readReferenceModuleSettings: vi.fn()
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockSystemSettingsModules() {
  referenceApi.readReferenceModuleSettings.mockImplementation(async ({ moduleId }) => ({
    ok: true,
    settings: {
      schema: { fields: [] },
      values:
        moduleId === "test-modules-taxonomy"
          ? {
              remoteCategoriesProjectionTargetProfileId: "",
              remoteTagsProjectionTargetProfileId: ""
            }
          : {
              appMountTagName: "app-root",
              remoteProjectionTargetProfileId: "",
              remoteDeploymentTargetProfileId: "",
              remoteBrowserDeliveryTargetProfileId: "",
              remoteMediaTargetProfileId: ""
            }
    }
  }));
}

function createValidatedTargets() {
  return [
    createTargetItem({
      id: "target-posts-001",
      title: "Posts Projection",
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
      targetKind: "deployment-storage",
      connectionProfileId: "conn-001"
    }),
    createTargetItem({
      id: "target-browser-001",
      title: "Primary Domain",
      targetKind: "browser-delivery",
      connectionProfileId: "conn-001"
    }),
    createTargetItem({
      id: "target-media-001",
      title: "Media Library",
      targetKind: "media-storage",
      connectionProfileId: "conn-001"
    })
  ];
}

test("product system settings locks remote selectors until a validated remote exists", async () => {
  mockSystemSettingsModules();
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "remote-connection-profiles") {
      return {
        items: [
          createConnectionItem({
            connectionStatus: "draft",
            validationSummary: {
              state: "warning",
              message: "Connect and validate first.",
              checkedItems: [],
              warnings: ["Service account not validated."],
              canProceed: false
            }
          })
        ]
      };
    }
    if (collectionId === "remote-target-profiles") {
      return {
        items: [
          createTargetItem({
            id: "target-deployment-001",
            targetKind: "deployment-storage",
            connectionProfileId: "conn-001"
          })
        ]
      };
    }
    if (collectionId === "remote-operation-runs") {
      return { items: [] };
    }
    return { items: [] };
  });

  render(<ProductSystemSettingsView />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Global Control Surface" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Validate at least one remote connection in Remotes to unlock remote-dependent product settings."
      )
    ).toBeInTheDocument();
  });

  expect(screen.getByRole("combobox", { name: "Remote Deployment Target" })).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("combobox", { name: "Remote Browser Delivery Target" })).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("combobox", { name: "Remote Projection Target" })).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("combobox", { name: "Remote Categories Projection Target" })).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("combobox", { name: "Remote Tags Projection Target" })).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("combobox", { name: "Remote Media Target" })).toHaveAttribute("aria-disabled", "true");
});

test("product system settings unlocks remote selectors when validated product targets exist", async () => {
  mockSystemSettingsModules();
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "remote-connection-profiles") {
      return {
        items: [
          createConnectionItem({
            connectionStatus: "validated",
            lastValidatedOn: "2026-03-14T08:00:00.000Z",
            validationSummary: {
              state: "validated",
              message: "Connection validated.",
              checkedItems: ["service account", "project access"],
              warnings: [],
              canProceed: true
            }
          })
        ]
      };
    }
    if (collectionId === "remote-target-profiles") {
      return {
        items: createValidatedTargets()
      };
    }
    if (collectionId === "remote-operation-runs") {
      return { items: [] };
    }
    return { items: [] };
  });

  render(<ProductSystemSettingsView />);

  await waitFor(() => {
    expect(screen.getByText("Validated remote connections and standard product services are ready.")).toBeInTheDocument();
  });

  expect(screen.getByRole("combobox", { name: "Remote Deployment Target" })).not.toHaveAttribute("aria-disabled");
  expect(screen.getByRole("combobox", { name: "Remote Browser Delivery Target" })).not.toHaveAttribute("aria-disabled");
  expect(screen.getByRole("combobox", { name: "Remote Projection Target" })).not.toHaveAttribute("aria-disabled");
  expect(screen.getByRole("combobox", { name: "Remote Categories Projection Target" })).not.toHaveAttribute("aria-disabled");
  expect(screen.getByRole("combobox", { name: "Remote Tags Projection Target" })).not.toHaveAttribute("aria-disabled");
  expect(screen.getByRole("combobox", { name: "Remote Media Target" })).not.toHaveAttribute("aria-disabled");
});
