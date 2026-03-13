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

test("remote ops compatibility report renders HTTPS browser-delivery details", async () => {
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
          analyzedOn: "2026-03-13T09:00:00.000Z",
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
          missingResources: [],
          provisionableActions: [],
          safeguardRules: [],
          bundles: [
            {
              id: "browser-delivery",
              label: "Browser Delivery",
              state: "action-required",
              targetCount: 1,
              requiredApis: [
                {
                  serviceName: "compute.googleapis.com",
                  state: "enabled"
                }
              ],
              resourceChecks: [],
              permissionDiagnostics: [],
              provisionableActions: [],
              missingResources: [],
              configurationWarnings: [],
              costWarnings: [],
              notes: [],
              deliveryReports: [
                {
                  targetId: "target-browser-001",
                  title: "Delivery Domain",
                  accessMode: "custom-domain",
                  stackMode: "https-load-balancer",
                  publicOrigin: "https://content.example.com",
                  publicUrl: "https://content.example.com/posts/example-post",
                  publicMediaBaseUrl: "https://content.example.com/library",
                  temporaryMediaBaseUrl: "https://storage.googleapis.com/media-bucket/library",
                  dnsInstructions: [
                    {
                      label: "Traffic record",
                      recordType: "A",
                      recordName: "content.example.com",
                      recordValue: "203.0.113.10"
                    },
                    {
                      label: "Certificate DNS authorization",
                      recordType: "CNAME",
                      recordName: "_acme-challenge.content.example.com.",
                      recordValue: "auth.example.gcp."
                    }
                  ],
                  nameServers: ["ns-cloud-a1.googledomains.com.", "ns-cloud-a2.googledomains.com."]
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
    expect(screen.getByRole("heading", { name: "Remote Ops Kitchensink" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Primary GCP Dev"));
  fireEvent.click(screen.getByRole("button", { name: "Analyze Compatibility" }));

  await waitFor(() => {
    expect(screen.getByText("Mode: custom-domain / https-load-balancer")).toBeInTheDocument();
    expect(screen.getByText("Public origin: https://content.example.com")).toBeInTheDocument();
    expect(screen.getByText("Public media base: https://content.example.com/library")).toBeInTheDocument();
    expect(screen.getByText("Traffic record: A content.example.com -> 203.0.113.10")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Name servers: ns-cloud-a1.googledomains.com., ns-cloud-a2.googledomains.com."
      )
    ).toBeInTheDocument();
  });
}, 15000);
