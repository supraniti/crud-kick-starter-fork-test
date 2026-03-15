import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RemoteOpsView } from "../../../../modules/test-modules-remote-ops/frontend/RemoteOpsView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createConnectionItem,
  createJsonResponse
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

test("remote ops desk can load a service-account key and validate the selected project", async () => {
  const connectionItems = [createConnectionItem()];
  const serviceAccountPayload = {
    type: "service_account",
    project_id: "demo-project",
    private_key_id: "key-001",
    private_key: "-----BEGIN PRIVATE KEY-----\\nMIIB\\n-----END PRIVATE KEY-----\\n",
    client_email: "crud-control@demo-project.iam.gserviceaccount.com",
    client_id: "1234567890",
    token_uri: "https://oauth2.googleapis.com/token"
  };

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "remote-connection-profiles") {
      return { items: connectionItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-target-profiles" || collectionId === "remote-operation-runs") {
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
    if (normalized.endsWith("/connections/conn-001/import-key-file")) {
      expect(JSON.parse(options.body)).toEqual({
        fileName: "demo-service-account.json",
        fileContent: JSON.stringify(serviceAccountPayload)
      });
      connectionItems[0] = createConnectionItem({
        credentialPathHint: "C:/repo/remote-runtime/remote-ops-live/credentials/conn-001/demo-service-account.json",
        credentialLabel: "demo-service-account.json",
        serviceAccountEmail: "crud-control@demo-project.iam.gserviceaccount.com",
        serviceAccountKeyId: "key-001",
        projectId: "demo-project",
        connectionStatus: "connected",
        lastConnectedOn: "2026-03-11T12:00:00.000Z",
        validationSummary: {
          state: "unknown",
          message: "Service account key loaded. Validate the connection to confirm project access.",
          checkedItems: ["service account credential"],
          warnings: [],
          canProceed: false
        }
      });
      return createJsonResponse(200, {
        ok: true,
        message: "Loaded service account 'crud-control@demo-project.iam.gserviceaccount.com'.",
        item: connectionItems[0]
      });
    }
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
      return createJsonResponse(200, {
        ok: true,
        message: "Connected as 'crud-control@demo-project.iam.gserviceaccount.com' to 'Demo Project'.",
        item: connectionItems[0]
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
  const file = new File([JSON.stringify(serviceAccountPayload)], "demo-service-account.json", {
    type: "application/json"
  });
  fireEvent.change(screen.getByTestId("service-account-key-input"), {
    target: { files: [file] }
  });

  await waitFor(() => {
    expect(referenceApi.updateReferenceCollectionItem).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/connections/conn-001/import-key-file",
      expect.objectContaining({ method: "POST" })
    );
  });

  await waitFor(() => {
    expect(screen.getByLabelText("Service Account Email")).toHaveValue(
      "crud-control@demo-project.iam.gserviceaccount.com"
    );
    expect(screen.getByLabelText("Project ID")).toHaveValue("demo-project");
  });

  fireEvent.click(screen.getByRole("button", { name: "Validate Connection" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/connections/conn-001/validate",
      expect.objectContaining({ method: "POST" })
    );
    expect(
      screen.getAllByText("Connected as 'crud-control@demo-project.iam.gserviceaccount.com' to 'Demo Project'.").length
    ).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("1234567890")).toBeInTheDocument();
  });
}, 15000);

test("remote ops desk can analyze GCP compatibility for the selected connection", async () => {
  const connectionItems = [
    createConnectionItem({
      credentialPathHint:
        "C:/repo/remote-runtime/remote-ops-live/credentials/conn-001/demo-service-account.json",
      credentialLabel: "demo-service-account.json",
      serviceAccountEmail: "crud-control@demo-project.iam.gserviceaccount.com",
      serviceAccountKeyId: "key-001",
      projectId: "demo-project",
      projectNumber: "1234567890",
      projectDisplayName: "Demo Project",
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

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "remote-connection-profiles") {
      return { items: connectionItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-target-profiles" || collectionId === "remote-operation-runs") {
      return { items: [] };
    }
    return { items: [] };
  });

  referenceApi.createReferenceCollectionItem.mockResolvedValue({ ok: true, item: {} });
  referenceApi.updateReferenceCollectionItem.mockResolvedValue({ ok: true, item: {} });

  const fetchMock = vi.fn(async (url) => {
    const normalized = String(url);
    if (normalized.endsWith("/connections/conn-001/analyze-compatibility")) {
      return createJsonResponse(200, {
        ok: true,
        message: "Loaded remote compatibility analysis.",
        report: {
          provider: "gcp",
          analyzedOn: "2026-03-12T12:00:00.000Z",
          connectionId: "conn-001",
          project: {
            projectId: "demo-project",
            displayName: "Demo Project"
          },
          overallState: "action-required",
          counts: {
            blockedBundles: 0,
            actionRequiredBundles: 2,
            compatibleBundles: 2
          },
          missingResources: [
            {
              bundleId: "media-storage",
              bundleLabel: "Media Storage",
              label: "Live Media Bucket"
            }
          ],
          provisionableActions: [
            {
              id: "create-bucket-target-001",
              bundleId: "media-storage",
              bundleLabel: "Media Storage",
              label: "Create bucket 'media-live-bucket'"
            }
          ],
          safeguardRules: [],
          bundles: [
            {
              id: "firestore-projection",
              label: "Firestore Projection",
              state: "compatible",
              targetCount: 0,
              requiredApis: [
                {
                  serviceName: "firestore.googleapis.com",
                  state: "enabled"
                }
              ],
              resourceChecks: [],
              permissionDiagnostics: [],
              provisionableActions: [],
              missingResources: [],
              configurationWarnings: [],
              costWarnings: []
            },
            {
              id: "media-storage",
              label: "Media Storage",
              state: "action-required",
              targetCount: 1,
              requiredApis: [
                {
                  serviceName: "storage.googleapis.com",
                  state: "enabled"
                }
              ],
              resourceChecks: [],
              permissionDiagnostics: [],
              provisionableActions: [
                {
                  id: "create-bucket-target-001",
                  label: "Create bucket 'media-live-bucket'",
                  availableNow: true,
                  missingPermissions: [],
                  notes: ["Configured prefix: library"]
                }
              ],
              missingResources: [
                {
                  label: "Live Media Bucket",
                  bucketName: "media-live-bucket"
                }
              ],
              configurationWarnings: [],
              costWarnings: [
                {
                  id: "media-storage-growth",
                  message: "Large media libraries can create sustained storage costs and bandwidth costs."
                }
              ]
            }
          ]
        }
      });
    }
    throw new Error(`Unexpected request: ${normalized}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<RemoteOpsView activeModuleLabel="Remote Ops" />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Remotes Desk" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Primary GCP Dev"));
  fireEvent.click(screen.getByRole("button", { name: "Analyze Compatibility" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/connections/conn-001/analyze-compatibility",
      expect.objectContaining({ method: "POST" })
    );
    expect(screen.getByText("Compatibility Report")).toBeInTheDocument();
    expect(screen.getByText("Demo Project • analyzed 2026-03-12T12:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("Media Storage: Live Media Bucket")).toBeInTheDocument();
    expect(screen.getByText("Create bucket 'media-live-bucket'")).toBeInTheDocument();
  });
}, 15000);

test("remote ops desk can confirm safeguards and provision missing resources from the compatibility report", async () => {
  const connectionItems = [
    createConnectionItem({
      credentialPathHint:
        "C:/repo/remote-runtime/remote-ops-live/credentials/conn-001/demo-service-account.json",
      credentialLabel: "demo-service-account.json",
      serviceAccountEmail: "crud-control@demo-project.iam.gserviceaccount.com",
      serviceAccountKeyId: "key-001",
      projectId: "demo-project",
      projectNumber: "1234567890",
      projectDisplayName: "Demo Project",
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

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "remote-connection-profiles") {
      return { items: connectionItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-target-profiles" || collectionId === "remote-operation-runs") {
      return { items: [] };
    }
    return { items: [] };
  });

  referenceApi.createReferenceCollectionItem.mockResolvedValue({ ok: true, item: {} });
  referenceApi.updateReferenceCollectionItem.mockResolvedValue({ ok: true, item: {} });

  const fetchMock = vi.fn(async (url, options = {}) => {
    const normalized = String(url);
    if (normalized.endsWith("/connections/conn-001/analyze-compatibility")) {
      return createJsonResponse(200, {
        ok: true,
        message: "Loaded remote compatibility analysis.",
        report: {
          provider: "gcp",
          analyzedOn: "2026-03-12T12:00:00.000Z",
          connectionId: "conn-001",
          project: {
            projectId: "demo-project",
            displayName: "Demo Project"
          },
          overallState: "action-required",
          counts: {
            blockedBundles: 0,
            actionRequiredBundles: 1,
            compatibleBundles: 3
          },
          missingResources: [
            {
              bundleId: "media-storage",
              bundleLabel: "Media Storage",
              label: "Live Media Bucket"
            }
          ],
          provisionableActions: [
            {
              id: "create-bucket-target-001",
              bundleId: "media-storage",
              bundleLabel: "Media Storage",
              label: "Create bucket 'media-live-bucket'",
              resourceKind: "bucket",
              createSupported: true,
              availableNow: true,
              phaseStatus: "execution-started",
              missingPermissions: [],
              notes: ["Configured prefix: library"]
            }
          ],
          safeguardRules: [
            {
              id: "cost-confirmation",
              label: "Cost Confirmation",
              description: "Provisioning can introduce ongoing costs."
            },
            {
              id: "singleton-hygiene",
              label: "Singleton Hygiene",
              description: "Singleton resources must not be double-created."
            },
            {
              id: "minimum-footprint",
              label: "Minimum Footprint",
              description: "Provision only what is required."
            }
          ],
          bundles: [
            {
              id: "media-storage",
              label: "Media Storage",
              state: "action-required",
              targetCount: 1,
              requiredApis: [
                {
                  serviceName: "storage.googleapis.com",
                  state: "enabled"
                }
              ],
              resourceChecks: [],
              permissionDiagnostics: [],
              provisionableActions: [
                {
                  id: "create-bucket-target-001",
                  label: "Create bucket 'media-live-bucket'",
                  resourceKind: "bucket",
                  createSupported: true,
                  availableNow: true,
                  phaseStatus: "execution-started",
                  missingPermissions: [],
                  notes: ["Configured prefix: library"]
                }
              ],
              missingResources: [
                {
                  label: "Live Media Bucket",
                  bucketName: "media-live-bucket"
                }
              ],
              configurationWarnings: [],
              costWarnings: []
            }
          ]
        }
      });
    }
    if (normalized.endsWith("/connections/conn-001/provision-missing")) {
      expect(JSON.parse(options.body)).toEqual({
        confirmedSafeguardIds: ["cost-confirmation", "singleton-hygiene", "minimum-footprint"],
        actionIds: null
      });
      return createJsonResponse(200, {
        ok: true,
        message: "Provisioned 1 missing remote requirement.",
        executedActions: [
          {
            id: "create-bucket-target-001",
            label: "Create bucket 'media-live-bucket'",
            resourceKind: "bucket"
          }
        ],
        report: {
          provider: "gcp",
          analyzedOn: "2026-03-12T12:10:00.000Z",
          connectionId: "conn-001",
          project: {
            projectId: "demo-project",
            displayName: "Demo Project"
          },
          overallState: "compatible",
          counts: {
            blockedBundles: 0,
            actionRequiredBundles: 0,
            compatibleBundles: 4
          },
          missingResources: [],
          provisionableActions: [],
          safeguardRules: [
            {
              id: "cost-confirmation",
              label: "Cost Confirmation",
              description: "Provisioning can introduce ongoing costs."
            },
            {
              id: "singleton-hygiene",
              label: "Singleton Hygiene",
              description: "Singleton resources must not be double-created."
            },
            {
              id: "minimum-footprint",
              label: "Minimum Footprint",
              description: "Provision only what is required."
            }
          ],
          bundles: [
            {
              id: "media-storage",
              label: "Media Storage",
              state: "compatible",
              targetCount: 1,
              requiredApis: [
                {
                  serviceName: "storage.googleapis.com",
                  state: "enabled"
                }
              ],
              resourceChecks: [],
              permissionDiagnostics: [],
              provisionableActions: [],
              missingResources: [],
              configurationWarnings: [],
              costWarnings: []
            }
          ]
        }
      });
    }
    throw new Error(`Unexpected request: ${normalized}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<RemoteOpsView activeModuleLabel="Remote Ops" />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Remotes Desk" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Primary GCP Dev"));
  fireEvent.click(screen.getByRole("button", { name: "Analyze Compatibility" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Provision Missing Resources" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("checkbox", { name: /Cost Confirmation/i }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Singleton Hygiene/i }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Minimum Footprint/i }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Provision Missing Resources" })).toBeEnabled();
  });

  fireEvent.click(screen.getByRole("button", { name: "Provision Missing Resources" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/connections/conn-001/provision-missing",
      expect.objectContaining({ method: "POST" })
    );
    expect(screen.getByText("Provisioned 1 missing remote requirement.")).toBeInTheDocument();
  });
}, 15000);
