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

test("product domains desk shows access modes and linked service surfaces", async () => {
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
      id: "target-posts-001",
      title: "Posts Projection",
      productBindingKey: "posts-projection",
      targetKind: "firestore-projection",
      adapterMode: "live-gcp",
      config: {
        ...createTargetItem().config,
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "content/posts"
      }
    }),
    createTargetItem({
      id: "target-categories-001",
      title: "Categories Projection",
      productBindingKey: "categories-projection",
      targetKind: "firestore-projection",
      adapterMode: "live-gcp",
      config: {
        ...createTargetItem().config,
        projectionScope: "public-blog-categories",
        firestoreCollectionPath: "content/categories"
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
    expect(screen.getByRole("heading", { name: "Domain Delivery Desk" })).toBeInTheDocument();
    expect(screen.getByText("Current Delivery View")).toBeInTheDocument();
    expect(screen.getByText("Owned custom domain")).toBeInTheDocument();
    expect(screen.getByText("Temporary GCP access")).toBeInTheDocument();
    expect(screen.getAllByText("Public origin: https://content.example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Example page URL: https://content.example.com/posts/example-post").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Public media base: https://content.example.com/library").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Temporary media base: https://storage.googleapis.com/demo-project-dev-media-1234567890/library").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Remote Data Surfaces")).toBeInTheDocument();
    expect(screen.getByText("Posts Projection: content/posts (published-blog-posts)")).toBeInTheDocument();
    expect(screen.getByText("Categories Projection: content/categories (public-blog-categories)")).toBeInTheDocument();
  });
}, 15000);

test("product domains desk renders DNS provider instructions and stack readiness after analysis", async () => {
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
        firestoreCollectionPath: null,
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
        firestoreCollectionPath: null,
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
        firestoreCollectionPath: null,
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
              requiredApis: [
                {
                  serviceName: "compute.googleapis.com",
                  state: "enabled"
                }
              ],
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
                  publicUrl: "https://content.example.com/posts/example-post",
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
                    },
                    {
                      label: "Zone delegation",
                      recordType: "NS",
                      recordName: "content.example.com",
                      recordValue: "ns-cloud-a1.googledomains.com., ns-cloud-a2.googledomains.com.",
                      notes: ["Delegate the hostname or matching parent zone to these Cloud DNS name servers."]
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
    expect(screen.getByRole("heading", { name: "Domain Delivery Desk" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "DNS And Setup" }));
  fireEvent.click(screen.getByRole("button", { name: "Analyze Domain Setup" }));

  await waitFor(() => {
    expect(screen.getByText("DNS And Provider Steps")).toBeInTheDocument();
    expect(screen.getByText("GCP-managed DNS mode keeps the zone and traffic records inside Cloud DNS when provisioning is allowed.")).toBeInTheDocument();
    expect(screen.getByText("Traffic record")).toBeInTheDocument();
    expect(screen.getByText("A content.example.com -> 203.0.113.10")).toBeInTheDocument();
    expect(screen.getByText("Certificate DNS authorization")).toBeInTheDocument();
    expect(screen.getByText("CNAME _acme-challenge.content.example.com. -> auth.example.gcp.")).toBeInTheDocument();
    expect(screen.getByText("Managed zone delegation")).toBeInTheDocument();
    expect(
      screen.getAllByText("Name servers: ns-cloud-a1.googledomains.com., ns-cloud-a2.googledomains.com.").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("HTTPS Stack Readiness")).toBeInTheDocument();
    expect(screen.getByText("Missing: Primary Domain traffic A record")).toBeInTheDocument();
    expect(screen.getByText("Primary Domain: managed certificate state is 'PROVISIONING'. HTTPS may not be ready yet.")).toBeInTheDocument();
  });
}, 15000);
