import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BlogDistributionView } from "../../../../modules/test-modules-pages/frontend/BlogDistributionView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createCollectionsDomain,
  createJsonResponse,
  installReferenceMocks
} from "./blog-distribution.integration-support.jsx";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    createReferenceCollectionItem: vi.fn(),
    fetchReferenceCollectionItems: vi.fn(),
    updateReferenceCollectionItem: vi.fn()
  };
});

test("pages desk embeds remote deployment and browser validation procedures from the selected targets", async () => {
  installReferenceMocks(referenceApi);
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return {
        items: [
          {
            id: "page-001",
            title: "Launch Story",
            pageKind: "content-detail",
            deploymentMode: "single-page",
            primarySourceType: "blog-post",
            sourceSelectionMode: "specific-record",
            path: "/stories/launch-window-update",
            layoutId: "layout-001",
            layoutKey: "story-shell",
            primarySource: {
              sourceType: "blog-post",
              itemId: "post-001",
              bindAs: "primary"
            },
            dataSources: [],
            status: "published",
            seoTitle: "Launch Story",
            seoDescription: "Launch story description",
            ogTitle: "Launch Story",
            ogDescription: "Launch story description",
            ogImageMediaId: "media-001",
            deploymentStatus: "clean",
            deploymentSyncedCount: 1,
            deploymentTargetCount: 1,
            deploymentStaleCount: 0,
            deploymentMissingCount: 0,
            createdOn: "2026-03-08T08:00:00.000Z",
            updatedOn: "2026-03-08T08:00:00.000Z"
          }
        ]
      };
    }

    if (collectionId === "blog-redirect-rules") {
      return { items: [] };
    }

    if (collectionId === "page-layouts") {
      return { items: [] };
    }

    if (collectionId === "blog-posts") {
      return {
        items: [
          {
            id: "post-001",
            title: "Launch Window Update",
            slug: "launch-window-update",
            status: "published",
            primaryAuthorId: "author-001",
            excerpt: "Launch story description",
            featuredMediaId: "media-001"
          }
        ]
      };
    }

    if (collectionId === "blog-authors") {
      return {
        items: [
          {
            id: "author-001",
            displayName: "Distribution Editor",
            role: "editor",
            status: "active"
          }
        ]
      };
    }

    if (collectionId === "media-items") {
      return {
        items: [
          {
            id: "media-001",
            displayName: "Launch Hero"
          }
        ]
      };
    }

    if (collectionId === "remote-target-profiles") {
      return {
        items: [
          {
            id: "target-deploy",
            title: "Deployment Bucket",
            connectionProfileId: "conn-001",
            targetKind: "deployment-storage",
            adapterMode: "live-gcp",
            targetStatus: "validated",
            compareSummary: {
              createCount: 1,
              updateCount: 0,
              deleteCount: 0,
              localOnlyCount: 1,
              remoteOnlyCount: 0
            }
          },
          {
            id: "target-browser",
            title: "Delivery Domain",
            connectionProfileId: "conn-001",
            targetKind: "browser-delivery",
            adapterMode: "live-gcp",
            targetStatus: "validated",
            compareSummary: {
              createCount: 0,
              updateCount: 0,
              deleteCount: 0,
              localOnlyCount: 0,
              remoteOnlyCount: 0
            }
          }
        ]
      };
    }

    if (collectionId === "remote-operation-runs") {
      return {
        items: [
          {
            id: "run-001",
            targetProfileId: "target-deploy",
            procedureType: "compare",
            status: "succeeded",
            finishedOn: "2026-03-12T12:00:00.000Z"
          }
        ]
      };
    }

    if (collectionId === "remote-connection-profiles") {
      return {
        items: [
          {
            id: "conn-001",
            profileName: "Merchant Guild"
          }
        ]
      };
    }

    return { items: [] };
  });

  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/pages/page-001/preview-sources")) {
      return createJsonResponse(200, { ok: true, items: [] });
    }

    if (String(url).includes("/pages/page-001/delivery")) {
      return createJsonResponse(200, {
        ok: true,
        payload: {
          contractVersion: 1,
          page: { id: "page-001" }
        }
      });
    }

    if (String(url).includes("/targets/target-deploy/compare")) {
      return createJsonResponse(200, {
        ok: true,
        message: "Compared deployment target"
      });
    }

    if (String(url).includes("/targets/target-deploy/execute")) {
      return createJsonResponse(200, {
        ok: true,
        message: "Synced deployment target"
      });
    }

    if (String(url).includes("/targets/target-browser/validate")) {
      return createJsonResponse(200, {
        ok: true,
        message: "Validated browser delivery"
      });
    }

    return createJsonResponse(404, {
      ok: false,
      error: { message: "not found" }
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  const navigate = vi.fn();
  const moduleSettingsDomain = {
    moduleSettingsState: {
      loading: false,
      saving: false,
      errorMessage: null,
      successMessage: null,
      moduleId: "test-modules-pages",
      schema: { fields: [] },
      draftValues: {
        appMountTagName: "app-root",
        remoteDeploymentTargetProfileId: "target-deploy",
        remoteBrowserDeliveryTargetProfileId: "target-browser"
      }
    },
    activeModuleSettingsMeta: {
      moduleId: "test-modules-pages",
      state: "enabled"
    },
    activeModuleSettingsPersistencePolicy: null,
    isActiveModuleSettingsAvailable: true,
    handleSettingsFieldChange: vi.fn(),
    handleSaveModuleSettings: vi.fn(async () => {})
  };

  render(
    <BlogDistributionView
      activeModuleLabel="Pages"
      collectionsDomain={createCollectionsDomain()}
      moduleSettingsDomain={moduleSettingsDomain}
      navigate={navigate}
      route={{
        moduleId: "test-modules-pages",
        pageId: "page-001"
      }}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Compare Remote" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validate Browser Delivery" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Compare Remote" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-deploy/compare",
      expect.objectContaining({ method: "POST" })
    );
  });

  fireEvent.click(screen.getByRole("button", { name: "Sync Remote Deployment" }));
  fireEvent.click(screen.getByRole("button", { name: "Validate Browser Delivery" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-deploy/execute",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-browser/validate",
      expect.objectContaining({ method: "POST" })
    );
  });
}, 15000);
