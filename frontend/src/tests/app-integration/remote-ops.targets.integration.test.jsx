import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RemoteOpsView } from "../../../../modules/test-modules-remote-ops/frontend/RemoteOpsView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createConnectionItem,
  createJsonResponse,
  createRunItem,
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

test("remote ops desk supports target compare and execute procedures with run history updates", async () => {
  const connectionItems = [
    createConnectionItem({
      serviceAccountEmail: "crud-control@demo-project.iam.gserviceaccount.com",
      serviceAccountKeyId: "key-001",
      projectId: "demo-project",
      projectNumber: "1234567890",
      projectDisplayName: "Demo Project",
      credentialLabel: "demo-service-account.json",
      connectionStatus: "validated",
      lastConnectedOn: "2026-03-11T10:00:00.000Z",
      lastValidatedOn: "2026-03-11T10:01:00.000Z",
      validationSummary: {
        state: "validated",
        message: "Connection validated",
        checkedItems: ["service account credential", "access token", "project access"],
        warnings: [],
        canProceed: true
      }
    })
  ];
  const targetItems = [createTargetItem()];
  const runItems = [createRunItem()];

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "remote-connection-profiles") {
      return { items: connectionItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-target-profiles") {
      return { items: targetItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-operation-runs") {
      return { items: runItems.map((item) => ({ ...item })) };
    }
    return { items: [] };
  });

  referenceApi.createReferenceCollectionItem.mockResolvedValue({ ok: true, item: {} });
  referenceApi.updateReferenceCollectionItem.mockImplementation(async ({ collectionId, item }) => {
    if (collectionId === "remote-target-profiles") {
      targetItems[0] = {
        ...targetItems[0],
        ...item
      };
      return { ok: true, item: targetItems[0] };
    }
    return { ok: true, item };
  });

  const fetchMock = vi.fn(async (url) => {
    const normalized = String(url);
    if (normalized.endsWith("/targets/target-001/compare")) {
      targetItems[0] = createTargetItem();
      runItems.unshift(createRunItem({ id: "run-compare-002" }));
      return createJsonResponse(200, {
        ok: true,
        message: "Compared local and remote state.",
        item: targetItems[0],
        run: runItems[0]
      });
    }
    if (normalized.endsWith("/targets/target-001/execute")) {
      targetItems[0] = createTargetItem({
        compareSummary: {
          state: "clean",
          message: "0 create, 0 update, 0 delete",
          createCount: 0,
          updateCount: 0,
          deleteCount: 0,
          localOnlyCount: 0,
          remoteOnlyCount: 0,
          sampleKeys: []
        }
      });
      runItems.unshift(
        createRunItem({
          id: "run-execute-001",
          title: "Execute Posts Projection",
          procedureType: "execute",
          direction: "push",
          dryRun: false,
          status: "succeeded",
          message: "Synced 1 item to the simulated remote target.",
          summary: {
            createCount: 1,
            updateCount: 0,
            deleteCount: 0,
            restoredCount: 0,
            sampleKeys: ["content/posts/launch-story.json"],
            warnings: []
          }
        })
      );
      return createJsonResponse(200, {
        ok: true,
        message: "Synced 1 item to the simulated remote target.",
        item: targetItems[0],
        run: runItems[0]
      });
    }
    throw new Error(`Unexpected request: ${normalized}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<RemoteOpsView activeModuleLabel="Remote Ops" />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Remotes Desk" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Targets" }));
  fireEvent.click(screen.getAllByText("Posts Projection")[0]);
  fireEvent.click(screen.getByRole("button", { name: "Compare" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-001/compare",
      expect.objectContaining({ method: "POST" })
    );
    expect(screen.getByText("Compared local and remote state.")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Execute Smoke Sync" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-001/execute",
      expect.objectContaining({ method: "POST" })
    );
    expect(screen.getByText("Synced 1 item to the simulated remote target.")).toBeInTheDocument();
  });
}, 15000);

test("remote ops desk enables live storage procedures and records restore history", async () => {
  const connectionItems = [
    createConnectionItem({
      serviceAccountEmail: "crud-control@demo-project.iam.gserviceaccount.com",
      serviceAccountKeyId: "key-001",
      projectId: "demo-project",
      projectNumber: "1234567890",
      projectDisplayName: "Demo Project",
      credentialLabel: "demo-service-account.json",
      connectionStatus: "validated",
      lastConnectedOn: "2026-03-11T10:00:00.000Z",
      lastValidatedOn: "2026-03-11T10:01:00.000Z",
      validationSummary: {
        state: "validated",
        message: "Connection validated",
        checkedItems: ["service account credential", "access token", "project access"],
        warnings: [],
        canProceed: true
      }
    })
  ];
  const targetItems = [
    createTargetItem({
      id: "target-live-001",
      title: "Media Live Bucket",
      targetKind: "media-storage",
      adapterMode: "live-gcp",
      config: {
        projectionScope: null,
        firestoreCollectionPath: null,
        bucketName: "merchant-guild-media",
        prefix: "library",
        localRootHint: "media",
        hostname: null,
        dnsZone: null,
        certificateName: null,
        urlMapHint: null
      },
      compareSummary: {
        state: "drift",
        message: "1 create, 1 update, 1 delete",
        createCount: 1,
        updateCount: 1,
        deleteCount: 1,
        localOnlyCount: 2,
        remoteOnlyCount: 1,
        sampleKeys: ["library/cover.png", "library/orphan.png"]
      }
    })
  ];
  const runItems = [];

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "remote-connection-profiles") {
      return { items: connectionItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-target-profiles") {
      return { items: targetItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-operation-runs") {
      return { items: runItems.map((item) => ({ ...item })) };
    }
    return { items: [] };
  });

  referenceApi.createReferenceCollectionItem.mockResolvedValue({ ok: true, item: {} });
  referenceApi.updateReferenceCollectionItem.mockResolvedValue({ ok: true, item: {} });

  const fetchMock = vi.fn(async (url) => {
    const normalized = String(url);
    if (normalized.endsWith("/targets/target-live-001/compare")) {
      runItems.unshift(
        createRunItem({
          id: "run-live-compare-001",
          title: "Compare Media Live Bucket",
          targetProfileId: "target-live-001",
          scopeKind: "media",
          message: "Media target has drift.",
          summary: {
            createCount: 1,
            updateCount: 1,
            deleteCount: 1,
            restoredCount: 0,
            sampleKeys: ["library/cover.png", "library/orphan.png"],
            warnings: []
          }
        })
      );
      return createJsonResponse(200, {
        ok: true,
        message: "Media target has drift.",
        item: targetItems[0],
        run: runItems[0]
      });
    }
    if (normalized.endsWith("/targets/target-live-001/execute")) {
      targetItems[0] = {
        ...targetItems[0],
        compareSummary: {
          state: "clean",
          message: "0 create, 0 update, 0 delete",
          createCount: 0,
          updateCount: 0,
          deleteCount: 0,
          localOnlyCount: 0,
          remoteOnlyCount: 0,
          sampleKeys: []
        }
      };
      runItems.unshift(
        createRunItem({
          id: "run-live-execute-001",
          title: "Execute Media Live Bucket",
          targetProfileId: "target-live-001",
          scopeKind: "media",
          direction: "push",
          dryRun: false,
          status: "succeeded",
          message: "Media target synced.",
          summary: {
            createCount: 1,
            updateCount: 1,
            deleteCount: 1,
            restoredCount: 0,
            sampleKeys: ["library/cover.png", "library/orphan.png"],
            warnings: []
          }
        })
      );
      return createJsonResponse(200, {
        ok: true,
        message: "Media target synced.",
        item: targetItems[0],
        run: runItems[0]
      });
    }
    if (normalized.endsWith("/targets/target-live-001/restore")) {
      runItems.unshift(
        createRunItem({
          id: "run-live-restore-001",
          title: "Restore Media Live Bucket",
          targetProfileId: "target-live-001",
          scopeKind: "media",
          procedureType: "restore",
          direction: "restore",
          dryRun: false,
          status: "succeeded",
          message: "Restored 'library/orphan.png' from remote storage",
          summary: {
            createCount: 0,
            updateCount: 0,
            deleteCount: 0,
            restoredCount: 1,
            sampleKeys: ["library/orphan.png"],
            warnings: []
          }
        })
      );
      return createJsonResponse(200, {
        ok: true,
        message: "Restored 'library/orphan.png' from remote storage",
        item: targetItems[0],
        run: runItems[0]
      });
    }
    throw new Error(`Unexpected request: ${normalized}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<RemoteOpsView activeModuleLabel="Remote Ops" />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Remotes Desk" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Targets" }));
  fireEvent.click(screen.getAllByText("Media Live Bucket")[0]);

  expect(screen.getByRole("button", { name: "Compare" })).not.toBeDisabled();
  expect(screen.getByRole("button", { name: "Execute Sync" })).not.toBeDisabled();
  expect(screen.getByRole("button", { name: "Restore From Remote" })).not.toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Compare" }));
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-live-001/compare",
      expect.objectContaining({ method: "POST" })
    );
    expect(screen.getByText("Media target has drift.")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Execute Sync" }));
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-live-001/execute",
      expect.objectContaining({ method: "POST" })
    );
    expect(screen.getByText("Media target synced.")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Restore From Remote" }));
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-live-001/restore",
      expect.objectContaining({ method: "POST" })
    );
    expect(screen.getByText("Restored 'library/orphan.png' from remote storage")).toBeInTheDocument();
  });
}, 15000);
