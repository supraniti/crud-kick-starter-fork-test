import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductDomainsView } from "../../app/product-shell/ProductDomainsView.jsx";
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
    fetchReferenceCollectionItems: vi.fn()
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("domains desk shows a public-address summary and drawer-based editing", async () => {
  const connectionItems = [
    createConnectionItem({
      projectId: "demo-project",
      projectDisplayName: "Demo Project",
      serviceAccountEmail: "crud-control@demo-project.iam.gserviceaccount.com",
      connectionStatus: "validated",
      lastConnectedOn: "2026-03-11T10:00:00.000Z",
      lastValidatedOn: "2026-03-11T10:01:00.000Z"
    })
  ];
  const targetItems = [
    createTargetItem({
      id: "target-deployment-001",
      title: "HTML Deployment",
      productBindingKey: "deployment-storage",
      targetKind: "deployment-storage",
      adapterMode: "live-gcp",
      config: {
        ...createTargetItem().config,
        bucketName: "content.example.com",
        prefix: "",
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
        bucketName: null,
        accessMode: "custom-domain",
        stackMode: "https-load-balancer",
        dnsMode: "external",
        hostname: "content.example.com",
        deploymentTargetProfileId: "target-deployment-001",
        mediaTargetProfileId: "target-media-001"
      }
    })
  ];

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

  render(<ProductDomainsView />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Public Address Desk" })).toBeInTheDocument();
    expect(screen.getByText("Public Addresses")).toBeInTheDocument();
    expect(screen.getByText("What Readers Can Open Today")).toBeInTheDocument();
    expect(screen.getAllByText("Live domain").length).toBeGreaterThan(0);
    expect(screen.getByText("Post page")).toBeInTheDocument();
    expect(screen.getByText("Category page")).toBeInTheDocument();
    expect(screen.getByText("Media file")).toBeInTheDocument();
    expect(screen.getByText("Current public root: https://content.example.com")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Edit Address" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Primary Domain" })).toBeInTheDocument();
    expect(screen.getByLabelText("Address Name")).toBeInTheDocument();
    expect(screen.getByLabelText("How Readers Reach The Site")).toBeInTheDocument();
    expect(screen.getByLabelText("Public HTML Target")).toBeInTheDocument();
    expect(screen.getByLabelText("Media Library Target")).toBeInTheDocument();
  });
}, 15000);

test("domains desk guides the operator through go-live readiness", async () => {
  const connectionItems = [
    createConnectionItem({
      projectId: "demo-project",
      projectNumber: "1234567890",
      projectDisplayName: "Demo Project",
      serviceAccountEmail: "crud-control@demo-project.iam.gserviceaccount.com",
      connectionStatus: "validated",
      lastConnectedOn: "2026-03-11T10:00:00.000Z",
      lastValidatedOn: "2026-03-11T10:01:00.000Z"
    })
  ];
  const targetItems = [
    createTargetItem({
      id: "target-deployment-001",
      title: "HTML Deployment",
      productBindingKey: "deployment-storage",
      targetKind: "deployment-storage",
      adapterMode: "live-gcp",
      config: {
        ...createTargetItem().config,
        bucketName: "site-origin-bucket",
        prefix: "",
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
        bucketName: "site-media-bucket",
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
        accessMode: "custom-domain",
        stackMode: "https-load-balancer",
        dnsMode: "gcp-managed",
        hostname: "content.example.com",
        dnsZone: "content-example-com-zone",
        certificateName: "content-example-com-cert",
        urlMapHint: "content-example-com-url-map",
        deploymentTargetProfileId: "target-deployment-001",
        mediaTargetProfileId: "target-media-001"
      }
    })
  ];

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

  const fetchMock = vi.fn(async (url) => {
    const normalized = String(url);
    if (normalized.endsWith("/connections/conn-001/analyze-compatibility")) {
      return createJsonResponse(200, {
        ok: true,
        message: "Loaded remote compatibility analysis.",
        report: {
          provider: "gcp",
          analyzedOn: "2026-03-15T12:00:00.000Z",
          connectionId: "conn-001",
          overallState: "action-required",
          counts: {
            blockedBundles: 0,
            actionRequiredBundles: 1,
            compatibleBundles: 3
          },
          missingResources: [],
          provisionableActions: [
            {
              id: "browser-delivery-target-browser-001-dns-a-record",
              targetId: "target-browser-001",
              createSupported: true,
              availableNow: true,
              phaseStatus: "execution-started"
            }
          ],
          safeguardRules: [
            {
              id: "confirm-cost",
              label: "I understand this may create billable delivery resources.",
              description: "Managed certificates, global IPs, and forwarding rules may incur cost."
            }
          ],
          bundles: [
            {
              id: "browser-delivery",
              label: "Browser Delivery",
              state: "action-required",
              targetCount: 1,
              requiredApis: [{ serviceName: "compute.googleapis.com", state: "enabled" }],
              resourceChecks: [],
              permissionDiagnostics: [],
              provisionableActions: [
                {
                  id: "browser-delivery-target-browser-001-dns-a-record",
                  targetId: "target-browser-001",
                  createSupported: true,
                  availableNow: true,
                  phaseStatus: "execution-started"
                }
              ],
              missingResources: [
                {
                  kind: "dns-a-record",
                  label: "Primary Domain traffic A record"
                }
              ],
              configurationWarnings: [
                "Primary Domain: managed certificate state is 'PROVISIONING'. HTTPS may not be ready yet."
              ],
              costWarnings: [],
              notes: [],
              deliveryReports: [
                {
                  targetId: "target-browser-001",
                  title: "Primary Domain",
                  accessMode: "custom-domain",
                  stackMode: "https-load-balancer",
                  publicOrigin: "https://content.example.com",
                  publicUrl: "https://content.example.com/post/example-post",
                  publicMediaBaseUrl: "https://content.example.com/library",
                  temporaryDeploymentBaseUrl: "https://storage.googleapis.com/site-origin-bucket",
                  temporaryMediaBaseUrl: "https://storage.googleapis.com/site-media-bucket/library",
                  dnsInstructions: [
                    {
                      label: "Traffic record",
                      recordType: "A",
                      recordName: "content.example.com",
                      recordValue: "203.0.113.10",
                      notes: ["The managed zone should contain this A record once provisioning completes."]
                    },
                    {
                      label: "Certificate DNS authorization",
                      recordType: "CNAME",
                      recordName: "_acme-challenge.content.example.com.",
                      recordValue: "auth.example.gcp.",
                      notes: ["The managed zone should contain this certificate authorization record once provisioning completes."]
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

  render(<ProductDomainsView />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Public Address Desk" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Go Live" }));
  fireEvent.click(screen.getByRole("button", { name: "Analyze This Address" }));

  await waitFor(() => {
    expect(screen.getByText("Go Live Checklist")).toBeInTheDocument();
    expect(screen.getByText("Records To Create")).toBeInTheDocument();
    expect(screen.getByText("Bring This Live")).toBeInTheDocument();
    expect(screen.getByText("Traffic record")).toBeInTheDocument();
    expect(screen.getByText("A content.example.com -> 203.0.113.10")).toBeInTheDocument();
    expect(screen.getByText("Certificate DNS authorization")).toBeInTheDocument();
    expect(screen.getByText("CNAME _acme-challenge.content.example.com. -> auth.example.gcp.")).toBeInTheDocument();
    expect(screen.getByText("Name servers: ns-cloud-a1.googledomains.com., ns-cloud-a2.googledomains.com.")).toBeInTheDocument();
    expect(screen.getByText("Missing: Primary Domain traffic A record")).toBeInTheDocument();
    expect(screen.getByText("Primary Domain: managed certificate state is 'PROVISIONING'. HTTPS may not be ready yet.")).toBeInTheDocument();
  });
}, 15000);
